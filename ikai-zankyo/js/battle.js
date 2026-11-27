/* ノンストップ速度ATBバトル・行動順キュー・DPS計測・至宝通知・低発熱スロットリングエンジン */
(function () {
  'use strict';

  const SEC = window.__IZ_SEC__;
  const WDATA = window.__IZ_WORLDS__;
  const CDATA = window.__IZ_CHARS__;
  const EDATA = window.__IZ_EQUIP__;
  const STATE = window.__IZ_STATE__;
  const AUDIO = window.__IZ_AUDIO__;

  let session = null;
  let rafId = null;
  let lastTs = 0;
  let lastRenderTs = 0;
  let onUpdateCb = null;
  let onFinishCb = null;
  let fxSeq = 0;

  /* 属性相性倍率（炎＞風＞水＞炎、光⇔闇相互有利、無は相性なし） */
  function getElementMult(atkEl, defEl) {
    if (atkEl === 'none' || defEl === 'none') return 1.0;
    if ((atkEl === 'fire' && defEl === 'wind') ||
        (atkEl === 'wind' && defEl === 'water') ||
        (atkEl === 'water' && defEl === 'fire')) {
      return 1.28;
    }
    if ((atkEl === 'wind' && defEl === 'fire') ||
        (atkEl === 'water' && defEl === 'wind') ||
        (atkEl === 'fire' && defEl === 'water')) {
      return 0.82;
    }
    if ((atkEl === 'light' && defEl === 'dark') || (atkEl === 'dark' && defEl === 'light')) {
      return 1.25;
    }
    return 1.0;
  }

  /* 味方バトルユニット生成 */
  function buildAllyUnits(partyIds) {
    const validIds = partyIds.filter(Boolean);
    const units = validIds.map((cid, idx) => {
      const comp = STATE.getCharComputed(cid, validIds);
      return {
        uid: 'a_' + idx + '_' + cid,
        charId: cid,
        side: 'ally',
        name: comp.def.name,
        el: comp.def.el,
        role: comp.def.role,
        rarity: comp.def.rarity,
        maxHp: comp.hp,
        hp: comp.hp,
        trailHp: comp.hp,
        atk: comp.atk,
        def: comp.defStat,
        spd: comp.spd,
        crit: comp.crit,
        critDmg: comp.critDmg,
        skillPct: comp.skillPct,
        healPct: comp.healPct,
        healRcvPct: comp.healRcvPct,
        dmgPct: comp.dmgPct,
        dmgCut: comp.dmgCut,
        afterGauge: comp.afterGauge,
        bossPct: comp.bossPct,
        aoePct: comp.aoePct,
        lifesteal: comp.lifesteal,
        atb: Math.min(95, 12 + comp.startGauge + idx * 5),
        skills: comp.def.skills,
        cds: [0, 0, 0],
        buffs: [],
        debuffs: [],
        dead: false,
        fxPop: null,
        fxTag: '',
        fxTagTtl: 0
      };
    });

    /* 開幕パッシブ・固有効果適用 */
    const teamStartBonus =
      (units.some((u) => u.charId === 'c_ur_3') ? 15 : 0) +
      (units.some((u) => u.charId === 'c_tw_100') ? 12 : 0);
    units.forEach((u) => {
      if (teamStartBonus > 0) u.atb = Math.min(98, u.atb + teamStartBonus);
      if (u.charId === 'c_ur_4' || u.charId === 'c_ur_10') {
        addStatus(u.buffs, 'taunt', 1, 2);
        addStatus(u.buffs, 'defUp', 0.2, 2);
      }
    });
    return units;
  }

  /* 敵バトルユニット生成 */
  function buildEnemyUnit(enemyId, powerScale, idx, isSolo) {
    const e = WDATA.ENEMIES[enemyId];
    const hp = Math.round(e.hp * powerScale);
    const atk = Math.round(e.atk * Math.pow(powerScale, 0.72));
    const def = Math.round(e.def * Math.pow(powerScale, 0.65));
    return {
      uid: 'e_' + idx + '_' + enemyId + '_' + Math.random().toString(36).slice(2, 5),
      enemyId: e.id,
      side: 'enemy',
      kind: e.kind,
      isSolo: Boolean(isSolo),
      name: e.name,
      el: e.el,
      maxHp: hp,
      hp,
      trailHp: hp,
      atk,
      def,
      spd: e.spd,
      crit: e.kind === 'normal' ? 0.08 : 0.14,
      critDmg: 1.4,
      atb: Math.min(60, 8 + idx * 7),
      skills: e.skills,
      cds: [0, 1],
      buffs: [],
      debuffs: [],
      dead: false,
      fxPop: null,
      fxTag: '',
      fxTagTtl: 0
    };
  }

  function addStatus(list, type, val, turns) {
    const ex = list.find((s) => s.type === type);
    if (ex) {
      ex.val = Math.max(ex.val, val);
      ex.turns = Math.max(ex.turns, turns);
    } else {
      list.push({ type, val, turns });
    }
  }

  function getStatusSum(list, type) {
    const f = list.find((s) => s.type === type);
    return f ? f.val : 0;
  }

  function hasStatus(list, type) {
    return list.some((s) => s.type === type);
  }

  /* 現在の実効ステータス */
  function effAtk(u, team) {
    let mult = 1 + getStatusSum(u.buffs, 'atkUp') - getStatusSum(u.debuffs, 'atkDown');
    if (u.side === 'ally') {
      team.forEach((m) => {
        if (m.dead) return;
        m.skills.forEach((sk) => {
          if (sk.scope === 'passive' && sk.passiveType === 'teamAtk') mult += sk.val;
        });
        if (m.charId === 'c_r_2' && u.el === 'fire') mult += 0.08;
        if (m.charId === 'c_tw_25' && u.el === 'fire') mult += 0.08;
      });
    }
    return Math.max(10, u.atk * Math.max(0.45, mult));
  }

  function effDef(u) {
    let mult = 1 + getStatusSum(u.buffs, 'defUp') - getStatusSum(u.debuffs, 'defDown');
    if (u.charId === 'c_ssr_1' && hasStatus(u.buffs, 'taunt')) mult += 0.2;
    return Math.max(5, u.def * Math.max(0.35, mult));
  }

  function effSpd(u, team) {
    let bonus = 0;
    if (u.side === 'ally') {
      team.forEach((m) => {
        if (m.dead) return;
        m.skills.forEach((sk) => {
          if (sk.scope === 'passive' && sk.passiveType === 'teamSpd') bonus += sk.val;
        });
        if (m.charId === 'c_ur_chrono') bonus += 10;
        if (m.charId === 'c_ur_8') bonus += 8;
      });
    }
    const mult = 1 + getStatusSum(u.buffs, 'spdUp') - getStatusSum(u.debuffs, 'spdDown');
    return Math.max(40, (u.spd + bonus) * Math.max(0.5, mult));
  }

  /* 敵味方混合・行動順キュー予測（残り到達時間が短い順に最大limit体） */
  function computeActionOrder(sess, limit) {
    const alive = sess.allies.concat(sess.enemies).filter((u) => !u.dead);
    const items = alive.map((u) => {
      const team = u.side === 'ally' ? sess.allies : sess.enemies;
      const spd = effSpd(u, team);
      const rem = Math.max(0, 100 - u.atb) / spd;
      return { u, spd, rem };
    });
    items.sort((a, b) => (a.rem - b.rem) || (b.spd - a.spd));
    return items.slice(0, limit || 5).map((x) => x.u);
  }

  /* WAVE敵編成生成（ボス・乱入は必ず単独出現） */
  function spawnWave(cfg, waveNum) {
    session.wave = waveNum;
    session.isBossWave = false;
    session.isIntruderWave = false;
    session.encounterBanner = null;
    session.activeFx = null;

    if (cfg.mode === 'main') {
      const world = WDATA.WORLDS.find((w) => w.id === cfg.worldId);
      const stage = world.stages[cfg.stageNum - 1];
      const isFinalBoss = stage.isBoss && waveNum === 5;
      if (isFinalBoss) {
        session.isBossWave = true;
        session.encounterBanner = { kind: 'boss', text: `強敵出現 — ${WDATA.ENEMIES[stage.bossId].name}`, timer: 1.15 };
        AUDIO.play('boss');
        return [buildEnemyUnit(stage.bossId, stage.power, 0, true)];
      }
      if (!session.runHadIntruder && Math.random() < 0.16) {
        session.runHadIntruder = true;
        session.isIntruderWave = true;
        const intEnemy = WDATA.ENEMIES[world.intruderId];
        session.encounterBanner = { kind: 'intruder', text: `乱入出現 — ${intEnemy.name}`, timer: 1.25 };
        AUDIO.play('intruder');
        return [buildEnemyUnit(world.intruderId, stage.power * 1.06, 0, true)];
      }
      const normals = WDATA.getWorldNormalEnemies(world.id);
      const count = waveNum === 1 ? 2 : (waveNum >= 4 ? 4 : 3);
      const arr = [];
      for (let i = 0; i < count; i++) {
        const picked = normals[(waveNum + i) % normals.length];
        const waveScale = stage.power * (0.86 + waveNum * 0.045);
        arr.push(buildEnemyUnit(picked.id, waveScale, i, false));
      }
      return arr;
    }

    if (cfg.mode === 'raid') {
      const raid = WDATA.RAIDS.find((r) => r.id === cfg.raidId);
      const diffMult = [1.0, 1.55, 2.25][cfg.diffIdx || 0];
      session.isBossWave = true;
      session.encounterBanner = { kind: 'boss', text: `討伐戦 — ${WDATA.ENEMIES[raid.bossId].name}`, timer: 1.2 };
      AUDIO.play('boss');
      return [buildEnemyUnit(raid.bossId, raid.power * diffMult, 0, true)];
    }

    if (cfg.mode === 'gauntlet') {
      const g = WDATA.GAUNTLETS.find((x) => x.id === cfg.gauntletId);
      const st = g.stages[waveNum - 1];
      session.isBossWave = true;
      session.encounterBanner = { kind: 'boss', text: `総力連戦 ${st.label} — ${WDATA.ENEMIES[st.bossId].name}`, timer: 1.15 };
      AUDIO.play('boss');
      return [buildEnemyUnit(st.bossId, g.power * st.mult, 0, true)];
    }

    if (cfg.mode === 'tower') {
      const tf = WDATA.getTowerFloor(cfg.floor);
      if (tf.isBoss && waveNum === session.maxWave) {
        session.isBossWave = true;
        session.encounterBanner = { kind: 'boss', text: `第${tf.floor}層 守護者 — ${WDATA.ENEMIES[tf.bossId].name}`, timer: 1.15 };
        AUDIO.play('boss');
        return [buildEnemyUnit(tf.bossId, tf.power, 0, true)];
      }
      const normals = WDATA.getWorldNormalEnemies(tf.world);
      const count = waveNum === 1 ? 2 : 3;
      const arr = [];
      for (let i = 0; i < count; i++) {
        const picked = normals[(tf.floor + waveNum + i) % normals.length];
        arr.push(buildEnemyUnit(picked.id, tf.power * (0.9 + waveNum * 0.05), i, false));
      }
      return arr;
    }

    if (cfg.mode === 'trial') {
      const tr = WDATA.TRIALS.find((t) => t.id === cfg.trialId);
      if (waveNum === session.maxWave) {
        session.isBossWave = true;
        session.encounterBanner = { kind: 'boss', text: `試練の主 — ${WDATA.ENEMIES[tr.bossId].name}`, timer: 1.15 };
        AUDIO.play('boss');
        return [buildEnemyUnit(tr.bossId, tr.power, 0, true)];
      }
      const normals = WDATA.getWorldNormalEnemies(tr.world);
      return [0, 1, 2].map((i) => buildEnemyUnit(normals[i % normals.length].id, tr.power * 0.85, i, false));
    }

    return [];
  }

  /* DPSレコード取得 */
  function getDpsRec(charId) {
    let r = session.dps.find((d) => d.charId === charId);
    if (!r) {
      const def = CDATA.CHAR_MAP[charId];
      r = { charId, name: def.name, el: def.el, role: def.role, dmgDealt: 0, dmgTaken: 0, healDone: 0, healRcvd: 0 };
      session.dps.push(r);
    }
    return r;
  }

  /* 範囲ターゲット選出（陣形なし・単体/範囲2体/範囲3体/全体） */
  function pickTargets(scope, pool, preferTaunt, preferLowHp) {
    const alive = pool.filter((u) => !u.dead);
    if (alive.length === 0) return [];
    if (scope === 'all') return alive;

    if (preferLowHp) {
      const sorted = alive.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
      const cnt = scope === 'area3' ? 3 : (scope === 'area2' ? 2 : 1);
      return sorted.slice(0, cnt);
    }

    let first = null;
    if (preferTaunt) {
      const taunters = alive.filter((u) => hasStatus(u.buffs, 'taunt'));
      if (taunters.length > 0) {
        first = taunters[Math.floor(Math.random() * taunters.length)];
      } else {
        const weighted = [];
        alive.forEach((u) => {
          const w = u.role === 'tank' ? 3 : 1;
          for (let i = 0; i < w; i++) weighted.push(u);
        });
        first = weighted[Math.floor(Math.random() * weighted.length)];
      }
    } else {
      first = alive[Math.floor(Math.random() * alive.length)];
    }

    const cnt = scope === 'area3' ? 3 : (scope === 'area2' ? 2 : 1);
    if (cnt === 1 || alive.length === 1) return [first];

    const others = alive.filter((u) => u.uid !== first.uid);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    return [first].concat(others.slice(0, cnt - 1));
  }

  /* 味方フルオートAI技選択（強さ 1 < 2 < 3、パッシブは除外） */
  function chooseAllySkill(u, allies) {
    const usable = u.skills.map((sk, idx) => ({ sk, idx })).filter((o) => o.sk.scope !== 'passive' && u.cds[o.idx] <= 0);
    if (usable.length === 0) return { sk: u.skills[0], idx: 0 };

    const needHeal = allies.some((a) => !a.dead && (a.hp / a.maxHp) < 0.78);
    if (u.role === 'healer') {
      const heals = usable.filter((o) => o.sk.kind === 'heal').sort((a, b) => b.idx - a.idx);
      if (needHeal && heals.length > 0) return heals[0];
      return usable.find((o) => o.sk.kind !== 'heal') || usable[0];
    }
    usable.sort((a, b) => b.idx - a.idx);
    return usable[0];
  }

  /* 敵AI技選択 */
  function chooseEnemySkill(u) {
    if (u.skills[1] && u.cds[1] <= 0) return { sk: u.skills[1], idx: 1 };
    return { sk: u.skills[0], idx: 0 };
  }

  function scopeLabel(scope) {
    if (scope === 'single') return '単体';
    if (scope === 'area2') return '範囲2体';
    if (scope === 'area3') return '範囲3体';
    if (scope === 'all') return '全体';
    return '常時';
  }

  function buildTargetSummary(targets, scope, isFriendly) {
    if (targets.length === 0) return '';
    if (scope === 'all') return isFriendly ? '味方全体' : '敵全体';
    if (targets.length === 1) return targets[0].name;
    return `${targets[0].name} ほか${targets.length - 1}体`;
  }

  /* 1アクション実行 */
  function executeTurn(actor) {
    const allies = session.allies;
    const enemies = session.enemies;
    const ownTeam = actor.side === 'ally' ? allies : enemies;
    const oppTeam = actor.side === 'ally' ? enemies : allies;

    /* ターン開始時・火傷などの継続ダメージ */
    const burnVal = getStatusSum(actor.debuffs, 'burn');
    if (burnVal > 0 && !actor.dead) {
      const bDmg = Math.max(1, Math.round(actor.maxHp * burnVal));
      actor.hp = Math.max(0, actor.hp - bDmg);
      actor.fxPop = { text: `火傷 -${bDmg}`, cls: 'dmg', ttl: 0.65, seq: ++fxSeq };
      if (actor.side === 'ally') getDpsRec(actor.charId).dmgTaken += bDmg;
      if (actor.hp <= 0) {
        actor.dead = true;
        actor.atb = 0;
        if (actor.side === 'enemy') session.defeatedThisRun.push(actor.enemyId);
      }
    }
    if (actor.dead) return;

    /* クールタイム減少 */
    for (let i = 0; i < actor.cds.length; i++) {
      if (actor.cds[i] > 0) actor.cds[i]--;
    }

    const picked = actor.side === 'ally' ? chooseAllySkill(actor, allies) : chooseEnemySkill(actor);
    const sk = picked.sk;
    if (sk.ct > 0) actor.cds[picked.idx] = sk.ct;

    actor.fxTag = 'acting';
    actor.fxTagTtl = 0.44;

    const skillBonus = 1 + (actor.skillPct || 0);
    let targets = [];
    let fxKind = 'attack';

    /* 回復技 */
    if (sk.kind === 'heal') {
      fxKind = 'heal';
      targets = pickTargets(sk.scope, ownTeam, false, true);
      const baseHeal = effAtk(actor, ownTeam) * (sk.mult || 1.2) * (1 + (actor.healPct || 0)) * skillBonus;
      const teamHealBonus =
        (allies.some((a) => !a.dead && a.charId === 'c_ssr_8') ? 0.14 : 0) +
        (allies.some((a) => !a.dead && a.charId === 'c_ur_6') ? 0.14 : 0);
      targets.forEach((t) => {
        const amount = Math.max(1, Math.round(baseHeal * (1 + (t.healRcvPct || 0) + teamHealBonus)));
        t.hp = Math.min(t.maxHp, t.hp + amount);
        t.trailHp = t.hp;
        if (t.uid !== actor.uid) {
          t.fxTag = 'healed';
          t.fxTagTtl = 0.44;
        }
        t.fxPop = { text: `+${amount}`, cls: 'heal', ttl: 0.70, seq: ++fxSeq };
        if (sk.cleanse) t.debuffs = [];
        if (sk.buff) addStatus(t.buffs, sk.buff.type, sk.buff.val, sk.buff.turns);
        if (actor.side === 'ally') {
          getDpsRec(actor.charId).healDone += amount;
          getDpsRec(t.charId).healRcvd += amount;
        }
      });
      AUDIO.play('heal');
    } else if (sk.kind === 'allyBuff') {
      fxKind = 'allyBuff';
      targets = pickTargets(sk.scope, ownTeam, false, false);
      targets.forEach((t) => {
        if (t.uid !== actor.uid) {
          t.fxTag = 'healed';
          t.fxTagTtl = 0.44;
        }
        if (sk.buff) addStatus(t.buffs, sk.buff.type, sk.buff.val, sk.buff.turns);
        if (sk.buff2) addStatus(t.buffs, sk.buff2.type, sk.buff2.val, sk.buff2.turns);
        if (sk.gaugeUp) t.atb = Math.min(99, t.atb + sk.gaugeUp);
        if (sk.healMult) {
          const amt = Math.max(1, Math.round(effAtk(actor, ownTeam) * sk.healMult * (1 + (actor.healPct || 0))));
          t.hp = Math.min(t.maxHp, t.hp + amt);
          t.trailHp = t.hp;
          t.fxPop = { text: `+${amt}`, cls: 'heal', ttl: 0.68, seq: ++fxSeq };
          if (actor.side === 'ally') {
            getDpsRec(actor.charId).healDone += amt;
            getDpsRec(t.charId).healRcvd += amt;
          }
        } else {
          t.fxPop = { text: '強化', cls: 'buff', ttl: 0.56, seq: ++fxSeq };
        }
      });
      if (sk.selfHeal) {
        const sh = Math.round(actor.maxHp * sk.selfHeal);
        actor.hp = Math.min(actor.maxHp, actor.hp + sh);
        actor.trailHp = actor.hp;
        actor.fxPop = { text: `+${sh}`, cls: 'heal', ttl: 0.68, seq: ++fxSeq };
        if (actor.side === 'ally') {
          getDpsRec(actor.charId).healDone += sh;
          getDpsRec(actor.charId).healRcvd += sh;
        }
      }
      if (sk.selfBuff) addStatus(actor.buffs, sk.selfBuff.type, sk.selfBuff.val, sk.selfBuff.turns);
      AUDIO.play('heal');
    } else {
      fxKind = 'attack';
      targets = pickTargets(sk.scope, oppTeam, actor.side === 'enemy', false);
      const isAoe = sk.scope !== 'single';
      let anyCrit = false;

      targets.forEach((t) => {
        const atkVal = effAtk(actor, ownTeam);
        const defVal = effDef(t);
        const defMit = 100 / (100 + defVal * 0.92);
        const elMult = getElementMult(actor.el, t.el);

        let extraDmg = 1 + (actor.dmgPct || 0);
        if (isAoe) extraDmg += (actor.aoePct || 0);
        if (actor.side === 'ally' && t.kind !== 'normal') extraDmg += (actor.bossPct || 0);
        if (actor.charId === 'c_ur_2' && (t.hp / t.maxHp) >= 0.7) extraDmg += 0.20;
        if (actor.charId === 'c_ur_ignis' && hasStatus(t.debuffs, 'burn')) extraDmg += 0.25;
        if (actor.charId === 'c_ur_7' && hasStatus(t.debuffs, 'burn')) extraDmg += 0.22;
        if (actor.charId === 'c_ur_kuchi' && t.debuffs.length > 0) extraDmg += 0.24;
        if (actor.charId === 'c_ur_9' && t.debuffs.length > 0) extraDmg += 0.22;
        if (actor.charId === 'c_ur_5' && t.el === 'dark') extraDmg += 0.18;
        if (actor.charId === 'c_ssr_2' && hasStatus(t.debuffs, 'burn')) extraDmg += 0.22;
        if (actor.charId === 'c_ssr_4' && sk.scope === 'single') extraDmg += 0.20;
        if (actor.side === 'ally' && allies.some((a) => !a.dead && a.charId === 'c_ssr_5') && actor.el === 'water') extraDmg += 0.12;
        if (actor.side === 'ally' && allies.some((a) => !a.dead && a.charId === 'c_ssr_7') && t.debuffs.length > 0) extraDmg += 0.10;
        if (actor.charId === 'c_r_5' && t.el === 'dark') extraDmg += 0.12;

        const critRate = actor.crit + (actor.side === 'ally' && allies.some((a) => !a.dead && a.charId === 'c_ssr_7') ? 0.08 : 0);
        const isCrit = Math.random() < critRate;
        if (isCrit) anyCrit = true;

        const raw = atkVal * (sk.mult || 1.0) * skillBonus * defMit * elMult * extraDmg * (isCrit ? actor.critDmg : 1.0) * (1 - (t.dmgCut || 0));
        const variance = 0.95 + Math.random() * 0.1;
        const dmg = Math.max(1, Math.round(raw * variance));

        t.hp = Math.max(0, t.hp - dmg);
        t.fxTag = 'targeted';
        t.fxTagTtl = 0.44;
        const popLabel = isCrit
          ? `会心 ${dmg}`
          : (elMult > 1.05 ? `弱点 ${dmg}` : (elMult < 0.95 ? `軽減 ${dmg}` : `${dmg}`));
        const popCls = isCrit ? 'crit' : (elMult > 1.05 ? 'weak' : (elMult < 0.95 ? 'resist' : 'dmg'));
        t.fxPop = { text: popLabel, cls: popCls, ttl: 0.72, seq: ++fxSeq };

        if (actor.side === 'ally') {
          getDpsRec(actor.charId).dmgDealt += dmg;
          if (actor.lifesteal > 0 && actor.hp > 0) {
            const ls = Math.max(1, Math.round(dmg * actor.lifesteal));
            actor.hp = Math.min(actor.maxHp, actor.hp + ls);
            actor.trailHp = actor.hp;
            getDpsRec(actor.charId).healDone += ls;
            getDpsRec(actor.charId).healRcvd += ls;
          }
        } else {
          getDpsRec(t.charId).dmgTaken += dmg;
          if (t.charId === 'c_ur_4' && t.hp > 0) {
            allies.forEach((a) => { if (!a.dead) a.atb = Math.min(99, a.atb + 5); });
          }
        }

        if (sk.debuff && t.hp > 0) addStatus(t.debuffs, sk.debuff.type, sk.debuff.val, sk.debuff.turns);
        if (sk.debuff2 && t.hp > 0) addStatus(t.debuffs, sk.debuff2.type, sk.debuff2.val, sk.debuff2.turns);

        if (t.hp <= 0) {
          t.dead = true;
          t.atb = 0;
          if (t.side === 'enemy') {
            session.defeatedThisRun.push(t.enemyId);
            if (actor.charId === 'c_ur_2') actor.atb = Math.min(99, actor.atb + 35);
          }
        }
      });

      if (sk.selfBuff) addStatus(actor.buffs, sk.selfBuff.type, sk.selfBuff.val, sk.selfBuff.turns);
      if (sk.buffAll) {
        ownTeam.forEach((m) => { if (!m.dead) addStatus(m.buffs, sk.buffAll.type, sk.buffAll.val, sk.buffAll.turns); });
      }
      AUDIO.play(anyCrit ? 'crit' : 'hit');
    }

    const targetSummary = buildTargetSummary(targets, sk.scope, fxKind !== 'attack');
    session.actionBanner = {
      side: actor.side,
      el: actor.el,
      kind: fxKind,
      actorName: actor.name,
      skillName: sk.name,
      targetSummary,
      scope: sk.scope,
      scopeText: scopeLabel(sk.scope)
    };

    session.activeFx = {
      seq: ++fxSeq,
      actorUid: actor.uid,
      actorSide: actor.side,
      el: actor.el,
      kind: fxKind,
      targetUids: targets.map((t) => t.uid),
      ttl: 0.56,
      maxTtl: 0.56
    };

    /* 行動終了パッシブ（自動回復オーラ） */
    if (actor.side === 'ally' && !actor.dead) {
      const regen = actor.skills.find((s) => s.scope === 'passive' && s.passiveType === 'regenAura');
      if (regen) {
        const low = allies.filter((a) => !a.dead).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
        if (low) {
          const rh = Math.max(1, Math.round(low.maxHp * (regen.val * 2)));
          low.hp = Math.min(low.maxHp, low.hp + rh);
          low.trailHp = low.hp;
          getDpsRec(actor.charId).healDone += rh;
          getDpsRec(low.charId).healRcvd += rh;
        }
      }
    }

    /* 行動終了時のバフ・デバフターン経過＆ゲージリセット */
    actor.buffs.forEach((b) => { b.turns--; });
    actor.buffs = actor.buffs.filter((b) => b.turns > 0);
    actor.debuffs.forEach((d) => { d.turns--; });
    actor.debuffs = actor.debuffs.filter((d) => d.turns > 0);
    actor.atb = Math.min(40, actor.afterGauge || 0);
  }

  /* 1周の報酬計算＆累計加算 */
  function finishSingleRun(won) {
    const cfg = session.cfg;
    const agg = session.aggregate;
    agg.runs += 1;
    agg.totalBattleTime += Math.max(0.5, session.battleTime || 0);
    if (won) agg.wins += 1; else agg.losses += 1;
    if (session.runHadIntruder && won) agg.intruders += 1;

    session.dps.forEach((d) => {
      let t = agg.dps.find((x) => x.charId === d.charId);
      if (!t) {
        t = { charId: d.charId, name: d.name, el: d.el, role: d.role, dmgDealt: 0, dmgTaken: 0, healDone: 0, healRcvd: 0 };
        agg.dps.push(t);
      }
      t.dmgDealt += d.dmgDealt;
      t.dmgTaken += d.dmgTaken;
      t.healDone += d.healDone;
      t.healRcvd += d.healRcvd;
    });

    const reward = {
      stone: 0, crystal: 0, gold: 0, soul: 0,
      mats: {}, shards: {}, bossMarks: {},
      grantCharIds: [],
      defeatedEnemyIds: session.defeatedThisRun.slice(),
      hadIntruder: session.runHadIntruder && won,
      clearKey: null,
      unlockAbility: null
    };

    if (won) {
      const snapBefore = STATE.getSnapshot();
      if (cfg.mode === 'main') {
        const wIdx = WDATA.WORLDS.findIndex((w) => w.id === cfg.worldId);
        const world = WDATA.WORLDS[wIdx];
        const stage = world.stages[cfg.stageNum - 1];
        const stageKey = `${world.id}_${stage.num}`;
        const firstClear = !snapBefore.clearedStages[stageKey];

        reward.stone = (firstClear ? 140 : 28) + wIdx * 10 + (stage.isBoss ? 22 : 0) + (session.runHadIntruder ? 45 : 0);
        reward.crystal = 36 + wIdx * 20 + stage.num * 6 + (stage.isBoss ? 26 : 0);
        reward.gold = 95 + wIdx * 50 + stage.num * 18;
        reward.clearKey = { mode: 'main', id: stageKey };

        const dropCount = (stage.isBoss ? 2 : 1) + (session.runHadIntruder ? 1 : 0);
        let droppedTreasure = null;
        for (let i = 0; i < dropCount; i++) {
          const sid = world.drops[Math.floor(Math.random() * world.drops.length)];
          const bonus = wIdx + (stage.isBoss ? 1.2 : 0) + (session.runHadIntruder ? 1.8 : 0);
          const dr = STATE.grantEquipDrop(sid, bonus);
          if (dr.autoSold) {
            agg.autoSoldCount += 1;
            agg.autoSoldGold += dr.gold;
          } else {
            agg.equips.push(dr.equip);
            if (dr.equip.quality === 4) {
              agg.treasureCount += 1;
              const ser = EDATA.SERIES_MAP[dr.equip.seriesId];
              const sl = EDATA.SLOT_MAP[dr.equip.slotId];
              const val = STATE.getEquipStatValue(dr.equip);
              const shortMap = { atk: '攻', def: '防', hp: 'HP', spd: '速' };
              const partName = ser ? ser.partNames[dr.equip.slotId] : '至宝装備';
              const statText = `${shortMap[sl ? sl.baseStat : 'atk'] || ''}+${SEC.formatNum(val)}`;
              const rec = { name: partName, statText, runNum: agg.runs };
              agg.treasures.push(rec);
              droppedTreasure = rec;
            }
          }
        }
        if (droppedTreasure) {
          session.treasureFlash = {
            text: `至宝獲得！ ${droppedTreasure.name}（${droppedTreasure.statText}）`,
            timer: 2.6,
            seq: ++fxSeq
          };
        }
      } else if (cfg.mode === 'raid') {
        const raid = WDATA.RAIDS.find((r) => r.id === cfg.raidId);
        const diffIdx = cfg.diffIdx || 0;
        const firstClear = !snapBefore.clearedRaids[raid.id];
        const matGain = 1 + diffIdx;
        const shardGain = diffIdx >= 2 ? 2 : 1;
        const markGain = diffIdx === 2 ? 2 : (diffIdx === 1 ? 1 : (firstClear || Math.random() < 0.55 ? 1 : 0));
        reward.stone = (firstClear ? 220 : 40) + diffIdx * 20;
        reward.crystal = 75 + diffIdx * 45;
        reward.gold = 220 + diffIdx * 120;
        reward.mats[raid.matId] = matGain;
        reward.shards[raid.charId] = shardGain;
        if (markGain > 0) reward.bossMarks[raid.bossCharId] = markGain;
        reward.clearKey = { mode: 'raid', id: raid.id };
      } else if (cfg.mode === 'gauntlet') {
        const g = WDATA.GAUNTLETS.find((x) => x.id === cfg.gauntletId);
        const firstClear = !snapBefore.clearedGauntlets[g.id];
        reward.stone = firstClear ? g.rewardStone : Math.round(g.rewardStone * 0.25);
        reward.crystal = 180;
        reward.soul = 65;
        reward.mats[g.rewardMat] = 2;
        reward.clearKey = { mode: 'gauntlet', id: g.id };
      } else if (cfg.mode === 'tower') {
        const tf = WDATA.getTowerFloor(cfg.floor);
        const firstClear = tf.floor > snapBefore.towerMaxCleared;
        reward.stone = firstClear ? tf.firstStone : 35;
        reward.crystal = 60 + tf.floor * 8;
        reward.gold = 140 + tf.floor * 20;
        reward.clearKey = { mode: 'tower', floor: tf.floor };
        if (firstClear && tf.milestone) {
          if (tf.milestone.kind === 'ability') reward.unlockAbility = tf.milestone.id;
          if (tf.milestone.kind === 'char') reward.grantCharIds.push(tf.milestone.id);
        }
      } else if (cfg.mode === 'trial') {
        const tr = WDATA.TRIALS.find((t) => t.id === cfg.trialId);
        const firstClear = !snapBefore.clearedTrials[tr.id];
        reward.stone = firstClear ? tr.rewardStone : 45;
        reward.crystal = 120;
        reward.soul = 45;
        reward.clearKey = { mode: 'trial', id: tr.id };
        if (firstClear && tr.rewardAbility) reward.unlockAbility = tr.rewardAbility;
      }

      agg.stone += reward.stone;
      agg.crystal += reward.crystal;
      agg.gold += reward.gold;
      agg.soul += reward.soul;
      Object.entries(reward.mats).forEach(([k, v]) => { agg.mats[k] = (agg.mats[k] || 0) + v; });
      Object.entries(reward.shards).forEach(([k, v]) => { agg.shards[k] = (agg.shards[k] || 0) + v; });
      Object.entries(reward.bossMarks).forEach(([k, v]) => { agg.bossMarks[k] = (agg.bossMarks[k] || 0) + v; });
      if (reward.unlockAbility) agg.unlockedAbilities.push(reward.unlockAbility);
      AUDIO.play(session.treasureFlash ? 'rare' : 'win');
    }

    const applied = STATE.applyBattleReward(reward);
    if (applied && applied.grantedChars && applied.grantedChars.length > 0) {
      applied.grantedChars.forEach((gc) => agg.grantedChars.push(gc));
    }

    /* 自動周回判定：停止予約がなければ次の周へスムーズに連続移行 */
    if (session.autoLoop && !session.stopRequested) {
      session.transitionTimer = 0.55;
      session.pendingRestart = true;
      session.activeFx = null;
      session.actionBanner = {
        side: won ? 'ally' : 'enemy',
        el: 'none',
        kind: 'info',
        actorName: won ? `第${agg.runs}周 勝利` : `第${agg.runs}周 敗北`,
        skillName: '次の周回へ移行中',
        targetSummary: `累計${agg.runs}周`,
        scope: 'all',
        scopeText: ''
      };
      return;
    }

    /* 終了してトータルリザルトを返す */
    const finalReport = {
      cfg: { ...cfg },
      lastWon: won,
      autoLoop: session.autoLoop,
      aggregate: agg
    };
    stopLoop();
    session = null;
    if (onFinishCb) onFinishCb(finalReport);
  }

  /* 1周の開始セットアップ */
  function startRunInstance() {
    const cfg = session.cfg;
    session.runHadIntruder = false;
    session.defeatedThisRun = [];
    session.pendingRestart = false;
    session.transitionTimer = 0;
    session.waveWaitTimer = 0;
    session.turnCooldown = 0.22;
    session.battleTime = 0;
    session.actionBanner = null;
    session.activeFx = null;

    if (cfg.mode === 'gauntlet') {
      session.maxWave = 3;
      const team0 = STATE.getSnapshot().gauntletParties[0].filter(Boolean);
      session.allies = buildAllyUnits(team0);
      session.dps = session.allies.map((a) => ({ charId: a.charId, name: a.name, el: a.el, role: a.role, dmgDealt: 0, dmgTaken: 0, healDone: 0, healRcvd: 0 }));
    } else {
      session.maxWave = cfg.mode === 'main' ? 5 : (cfg.mode === 'raid' ? 1 : 3);
      const pIds = (cfg.partyIds || STATE.getSnapshot().party).filter(Boolean);
      session.allies = buildAllyUnits(pIds);
      session.dps = session.allies.map((a) => ({ charId: a.charId, name: a.name, el: a.el, role: a.role, dmgDealt: 0, dmgTaken: 0, healDone: 0, healRcvd: 0 }));
    }
    session.enemies = spawnWave(cfg, 1);
  }

  /* メインバトルティック（ノンストップATB進行＋30fps描画スロットリング低発熱制御） */
  function tick(ts) {
    if (!session) return;
    if (!lastTs) lastTs = ts;
    const rawDt = Math.min(0.08, Math.max(0.001, (ts - lastTs) / 1000));
    lastTs = ts;
    const speed = STATE.getBattleSpeed();
    const dt = rawDt * speed;
    let forceRender = false;

    /* 演出タイマー減衰 */
    if (session.encounterBanner) {
      session.encounterBanner.timer -= rawDt;
      if (session.encounterBanner.timer <= 0) {
        session.encounterBanner = null;
        forceRender = true;
      }
    }
    if (session.treasureFlash) {
      session.treasureFlash.timer -= rawDt;
      if (session.treasureFlash.timer <= 0) {
        session.treasureFlash = null;
        forceRender = true;
      }
    }
    if (session.activeFx) {
      session.activeFx.ttl -= rawDt;
      if (session.activeFx.ttl <= 0) {
        session.activeFx = null;
        forceRender = true;
      }
    }

    const updateFx = (u) => {
      if (u.trailHp > u.hp) u.trailHp = Math.max(u.hp, u.trailHp - u.maxHp * rawDt * 1.5);
      if (u.fxPop) {
        u.fxPop.ttl -= rawDt;
        if (u.fxPop.ttl <= 0) u.fxPop = null;
      }
      if (u.fxTagTtl > 0) {
        u.fxTagTtl -= rawDt;
        if (u.fxTagTtl <= 0) {
          u.fxTagTtl = 0;
          u.fxTag = '';
        }
      }
    };
    session.allies.forEach(updateFx);
    session.enemies.forEach(updateFx);

    const maybeRender = () => {
      if (!session || !onUpdateCb) return;
      if (forceRender || (ts - lastRenderTs) >= 33) {
        lastRenderTs = ts;
        session.actionOrder = computeActionOrder(session, 5);
        onUpdateCb(session);
      }
    };

    if (session.pendingRestart) {
      session.transitionTimer -= rawDt;
      if (session.transitionTimer <= 0) {
        if (session.stopRequested) {
          const finalReport = {
            cfg: { ...session.cfg },
            lastWon: session.aggregate.wins > 0,
            autoLoop: session.autoLoop,
            aggregate: session.aggregate
          };
          stopLoop();
          session = null;
          if (onFinishCb) onFinishCb(finalReport);
          return;
        }
        startRunInstance();
        forceRender = true;
      }
      maybeRender();
      if (session) rafId = requestAnimationFrame(tick);
      return;
    }

    if (session.waveWaitTimer > 0) {
      session.waveWaitTimer -= rawDt;
      if (session.waveWaitTimer <= 0) {
        const nextWave = session.wave + 1;
        if (session.cfg.mode === 'gauntlet') {
          const nextTeam = STATE.getSnapshot().gauntletParties[nextWave - 1].filter(Boolean);
          session.allies = buildAllyUnits(nextTeam);
          session.allies.forEach((a) => getDpsRec(a.charId));
        } else {
          session.allies.forEach((a) => {
            if (!a.dead) {
              a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.08));
              a.trailHp = a.hp;
            }
          });
        }
        session.enemies = spawnWave(session.cfg, nextWave);
        session.turnCooldown = 0.2;
        forceRender = true;
      }
      maybeRender();
      if (session) rafId = requestAnimationFrame(tick);
      return;
    }

    /* ノンストップATB進行＆戦闘秒数カウント（倍速に左右されない×1基準DPS用） */
    session.battleTime += dt;
    const allAlive = session.allies.concat(session.enemies).filter((u) => !u.dead);
    let ready = null;
    for (const u of allAlive) {
      const team = u.side === 'ally' ? session.allies : session.enemies;
      u.atb = Math.min(100, u.atb + effSpd(u, team) * dt * 0.48);
      if (u.atb >= 100) {
        if (!ready || effSpd(u, team) > effSpd(ready, ready.side === 'ally' ? session.allies : session.enemies)) {
          ready = u;
        }
      }
    }

    if (session.turnCooldown > 0) {
      session.turnCooldown = Math.max(0, session.turnCooldown - dt);
    }

    if (session.turnCooldown <= 0 && ready) {
      executeTurn(ready);
      session.turnCooldown = 0.36;
      forceRender = true;

      const enemiesAlive = session.enemies.some((e) => !e.dead);
      const alliesAlive = session.allies.some((a) => !a.dead);
      if (!enemiesAlive) {
        if (session.wave < session.maxWave) {
          session.waveWaitTimer = 0.42;
        } else {
          finishSingleRun(true);
          if (!session) return;
        }
      } else if (!alliesAlive) {
        finishSingleRun(false);
        if (!session) return;
      }
    }

    maybeRender();
    if (session) rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastTs = 0;
    lastRenderTs = 0;
  }

  function start(cfg, autoLoop, onUpdate, onFinish) {
    stopLoop();
    onUpdateCb = onUpdate;
    onFinishCb = onFinish;
    session = {
      cfg,
      autoLoop: Boolean(autoLoop),
      stopRequested: false,
      wave: 1,
      maxWave: 5,
      isBossWave: false,
      isIntruderWave: false,
      runHadIntruder: false,
      defeatedThisRun: [],
      allies: [],
      enemies: [],
      dps: [],
      battleTime: 0,
      actionOrder: [],
      actionBanner: null,
      encounterBanner: null,
      treasureFlash: null,
      activeFx: null,
      turnCooldown: 0.22,
      waveWaitTimer: 0,
      pendingRestart: false,
      transitionTimer: 0,
      aggregate: {
        runs: 0,
        wins: 0,
        losses: 0,
        intruders: 0,
        totalBattleTime: 0,
        treasureCount: 0,
        treasures: [],
        stone: 0,
        crystal: 0,
        gold: 0,
        soul: 0,
        mats: {},
        shards: {},
        bossMarks: {},
        grantedChars: [],
        equips: [],
        autoSoldCount: 0,
        autoSoldGold: 0,
        unlockedAbilities: [],
        dps: []
      }
    };
    startRunInstance();
    session.actionOrder = computeActionOrder(session, 5);
    if (onUpdateCb) onUpdateCb(session);
    rafId = requestAnimationFrame(tick);
  }

  function forceUpdate() {
    if (!session || !onUpdateCb) return;
    session.actionOrder = computeActionOrder(session, 5);
    onUpdateCb(session);
  }

  function toggleAutoLoop() {
    if (!session) return;
    if (!session.autoLoop) {
      session.autoLoop = true;
      session.stopRequested = false;
    } else {
      session.stopRequested = !session.stopRequested;
    }
    forceUpdate();
  }

  function isActive() {
    return Boolean(session);
  }

  function getSession() {
    return session;
  }

  Object.defineProperty(window, '__IZ_BATTLE__', {
    value: Object.freeze({
      start,
      toggleAutoLoop,
      forceUpdate,
      isActive,
      getSession,
      scopeLabel
    }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
