/* ==========================================================================
   combat.js - ATB行動順・はちゃめちゃ異変・4指標DPS・1行ログ・3倍速・無限周回
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  const MAX_LOGS = 80;

  const engine = {
    phase: 'idle', // 'idle' | 'fighting' | 'repeat_wait' | 'ended'
    stage: null,
    allies: [],
    enemies: [],
    focusedEnemyId: null,
    selectedAllyId: null,
    elapsed: 0,
    chaos: 0,
    anomaly: null, // { def, timer, tickAccum }
    logs: [],
    logSeq: 1,
    vfx: [],
    popups: [],
    shake: 0,
    flash: null,
    repeatSession: null,
    repeatWaitTimer: 0,
    lastNormalResult: null,
    callbacks: {
      onNormalResult: null,
      onRepeatResult: null,
      onStateChange: null
    }
  };

  function isActive() {
    return engine.phase === 'fighting' || engine.phase === 'repeat_wait';
  }

  function isRepeating() {
    return !!engine.repeatSession;
  }

  function addLog(actor, target, skill, valText, kind, actorAttr) {
    engine.logs.push({
      id: engine.logSeq++,
      actor: actor || '戦場',
      target: target || '',
      skill: skill || '',
      valText: valText || '',
      kind: kind || 'dmg',
      actorAttr: actorAttr || 'null'
    });
    if (engine.logs.length > MAX_LOGS) {
      engine.logs.splice(0, engine.logs.length - MAX_LOGS);
    }
  }

  function pushPopup(unit, text, color, big) {
    // 近接ポップアップとの縦重なりを回避
    let yOff = 0;
    for (const p of engine.popups) {
      if (Math.abs(p.x - unit.x) < 34 && Math.abs(p.y - (unit.y - 18 - yOff)) < 15) {
        yOff += 14;
      }
    }
    engine.popups.push({
      x: unit.x + HS.UTIL.rand(-10, 10),
      y: unit.y - 18 - Math.min(42, yOff),
      vy: -32,
      text,
      color: color || '#fff',
      big: !!big,
      life: 0.9,
      maxLife: 0.9
    });
  }

  function pushVfx(type, from, to, color) {
    engine.vfx.push({
      type,
      x1: from.x,
      y1: from.y,
      x2: to ? to.x : from.x,
      y2: to ? to.y : from.y,
      color: color || '#ff3898',
      life: 0.34,
      maxLife: 0.34
    });
  }

  function buildCombatants(stage) {
    const eqMap = HS.STATE.getEquipMap();
    const syn = HS.STATE.getPartySynergy().bonuses;
    const partyIds = HS.STATE.data.party.filter(Boolean);

    const allies = partyIds.map((uid, idx) => {
      const def = HS.UNITS_MAP[uid];
      const save = HS.STATE.data.units[uid];
      const st = HS.UTIL.calcUnitStats(def, save, eqMap, syn);
      const exPassive = save.exWeaponLv > 0 ? def.exWeapon.passiveId : null;
      const startShield =
        (def.role === 'tank' ? Math.round(st.hp * 0.22) : 0) +
        Math.round(st.hp * (syn.startShieldPct || 0));

      return {
        uid,
        cid: `a_${idx}`,
        side: 'ally',
        slotIdx: idx,
        name: def.name,
        attr: def.attr,
        races: def.races,
        role: def.role,
        skills: def.skills,
        exPassive,
        exWeaponLv: save.exWeaponLv || 0,
        maxHp: st.hp,
        hp: st.hp,
        shield: startShield,
        atk: st.atk,
        def: st.def,
        spd: st.spd,
        crit: st.crit,
        cdmg: st.cdmg,
        healPct: st.healPct,
        dmgRed: st.dmgRed,
        lifesteal: st.lifesteal + (exPassive === 'dark_vamp' ? 0.12 : 0),
        chaosGain: st.chaosGain,
        attrBonus: st.attrBonus,
        gauge: HS.UTIL.rand(8, 22) + (syn.startSp || 0),
        cds: [0, 0, 0],
        queuedSkillIdx: null,
        queuedTargetCid: null,
        buffs: {}, // { atkUp: turns, defUp: turns, spdUp: turns, taunt: turns }
        debuffs: {},
        frenzyStacks: 0,
        alive: true,
        hitAnim: 0,
        actAnim: 0,
        x: 0,
        y: 0,
        metrics: { dmgDealt: 0, dmgTaken: 0, healDone: 0, healRecv: 0 }
      };
    });

    // パッシブ開始効果（リル加速・オーロラ全体障壁）
    if (allies.some((a) => a.exPassive === 'haste_aura')) {
      for (const a of allies) a.gauge = Math.min(95, a.gauge + 20);
    }
    if (allies.some((a) => a.exPassive === 'photon_nova')) {
      for (const a of allies) a.shield += Math.round(a.maxHp * 0.18);
    }

    const enemies = stage.enemies.map((e, idx) => ({
      uid: `e_${idx}`,
      cid: `e_${idx}`,
      side: 'enemy',
      slotIdx: idx,
      name: e.name,
      attr: e.attr,
      role: e.role,
      isBoss: !!e.isBoss,
      maxHp: e.hp,
      hp: e.hp,
      shield: e.role === 'tank' ? Math.round(e.hp * 0.14) : 0,
      atk: e.atk,
      def: e.def,
      spd: e.spd,
      crit: e.isBoss ? 0.16 : 0.08,
      cdmg: 1.45,
      healPct: 0,
      dmgRed: e.role === 'tank' ? 0.12 : 0,
      lifesteal: 0,
      gauge: HS.UTIL.rand(4, 18),
      cds: [0, 1, 2],
      buffs: {},
      debuffs: {},
      alive: true,
      hitAnim: 0,
      actAnim: 0,
      x: 0,
      y: 0
    }));

    return { allies, enemies };
  }

  function startBattle(stageId, useRepeat) {
    const stage = HS.STAGES.getStage(stageId, HS.STATE.data.towerFloor);
    const { allies, enemies } = buildCombatants(stage);
    if (!allies.length) return false;

    engine.stage = stage;
    engine.allies = allies;
    engine.enemies = enemies;
    engine.focusedEnemyId = enemies[0]?.cid || null;
    engine.selectedAllyId = allies[0]?.cid || null;
    engine.elapsed = 0;
    engine.chaos = 0;
    engine.anomaly = null;
    engine.logs = [];
    engine.vfx = [];
    engine.popups = [];
    engine.shake = 0;
    engine.flash = null;
    engine.phase = 'fighting';
    engine.repeatWaitTimer = 0;

    if (useRepeat && !engine.repeatSession) {
      engine.repeatSession = {
        stageId: stage.id,
        stageName: stage.name,
        startedAt: Date.now(),
        runs: 0,
        wins: 0,
        losses: 0,
        totalElapsed: 0,
        gold: 0,
        exp: 0,
        shards: 0,
        cores: 0,
        keptGear: [],
        autoSoldCount: 0,
        autoSoldGold: 0,
        autoSoldDust: 0,
        unlockedUnits: [],
        unitMetrics: {}
      };
    } else if (!useRepeat) {
      engine.repeatSession = null;
    }

    addLog('戦闘開始', stage.name, stage.code, `${enemies.length}体出現`, 'chaos', stage.attr);
    if (engine.callbacks.onStateChange) engine.callbacks.onStateChange();
    return true;
  }

  function stopRepeatAndShowSummary() {
    if (!engine.repeatSession) {
      retreatBattle();
      return;
    }
    const summary = { ...engine.repeatSession };
    engine.repeatSession = null;
    engine.phase = 'idle';
    HS.STATE.data.settings.autoRepeat = false;
    HS.STATE.scheduleSave(true);
    if (engine.callbacks.onRepeatResult) engine.callbacks.onRepeatResult(summary);
    if (engine.callbacks.onStateChange) engine.callbacks.onStateChange();
  }

  function retreatBattle() {
    if (engine.repeatSession && engine.repeatSession.runs > 0) {
      stopRepeatAndShowSummary();
      return;
    }
    engine.repeatSession = null;
    engine.phase = 'idle';
    if (engine.callbacks.onStateChange) engine.callbacks.onStateChange();
  }

  function getEffSpd(u) {
    let s = u.spd;
    if (u.side === 'ally' && engine.allies.some((a) => a.alive && a.role === 'supporter')) {
      s *= 1.10;
    }
    if (u.buffs.spdUp) s *= 1.28;
    if (u.debuffs.spdDown) s *= 0.76;
    if (engine.anomaly && engine.anomaly.def.id === 'meteor' && u.side === 'ally') s *= 1.35;
    if (engine.anomaly && engine.anomaly.def.id === 'chrono') s *= 1.60;
    return Math.max(25, s);
  }

  /**
   * 今後の行動順を正確にシミュレートして上位N体を返す
   */
  function getActionOrder(limit) {
    const n = limit || 7;
    const pool = [...engine.allies, ...engine.enemies]
      .filter((u) => u.alive)
      .map((u) => ({
        cid: u.cid,
        name: u.name,
        side: u.side,
        attr: u.attr,
        role: u.role,
        gauge: u.gauge,
        spd: getEffSpd(u)
      }));
    if (!pool.length) return [];

    const order = [];
    for (let step = 0; step < n; step++) {
      let best = null;
      let minT = Infinity;
      for (const p of pool) {
        const rem = Math.max(0, 100 - p.gauge);
        const t = rem / p.spd;
        if (t < minT) {
          minT = t;
          best = p;
        }
      }
      if (!best) break;
      for (const p of pool) p.gauge += p.spd * minT;
      order.push({
        cid: best.cid,
        name: best.name,
        side: best.side,
        attr: best.attr,
        role: best.role
      });
      best.gauge = 0;
    }
    return order;
  }

  function addChaos(amount, actor) {
    if (engine.anomaly) return;
    const bonus = actor && actor.chaosGain ? 1 + actor.chaosGain : 1;
    engine.chaos = Math.min(100, engine.chaos + amount * bonus);
  }

  function triggerChaosAnomaly(manual) {
    if (engine.phase !== 'fighting' || engine.chaos < 100 || engine.anomaly) return false;
    const def = HS.UTIL.pick(HS.CONST.CHAOS_ANOMALIES);
    const hasMikotoEx = engine.allies.some((a) => a.alive && a.exPassive === 'chaos_master');
    engine.chaos = 0;
    engine.anomaly = {
      def,
      timer: def.duration + (hasMikotoEx ? 3 : 0),
      tickAccum: 0
    };
    engine.shake = 12;
    engine.flash = { color: def.color, alpha: 0.45 };
    HS.STATE.data.stats.totalAnomalies += 1;
    HS.AUDIO.play('chaos');

    // ゼロワン専用武器: 異変発動時に全体障壁＆回復
    const zeroAlly = engine.allies.find((a) => a.alive && a.exPassive === 'singularity_core');
    if (zeroAlly) {
      for (const a of engine.allies.filter((x) => x.alive)) {
        a.shield += Math.round(a.maxHp * 0.20);
        applyHeal(zeroAlly, a, Math.round(a.maxHp * 0.15), '特異点障壁');
      }
    }

    addLog('異変発生', manual ? '手動発動' : '混沌暴走', def.name, `${engine.anomaly.timer.toFixed(0)}秒`, 'chaos', 'null');
    return true;
  }

  function pickEnemyTarget(preferredCid) {
    const alive = engine.enemies.filter((e) => e.alive);
    if (!alive.length) return null;
    if (preferredCid) {
      const exact = alive.find((e) => e.cid === preferredCid);
      if (exact) return exact;
    }
    const focused = alive.find((e) => e.cid === engine.focusedEnemyId);
    if (focused) return focused;
    engine.focusedEnemyId = alive[0].cid;
    return alive[0];
  }

  function pickAllyTargetForEnemy() {
    const alive = engine.allies.filter((a) => a.alive);
    if (!alive.length) return null;
    const taunting = alive.filter((a) => a.buffs.taunt > 0);
    if (taunting.length) return HS.UTIL.pick(taunting);
    const weights = alive.map((a) => {
      let w = a.role === 'tank' ? 3.2 : 1.0;
      if (a.slotIdx === 0) w *= 1.45;
      return w;
    });
    const total = weights.reduce((s, v) => s + v, 0);
    let r = Math.random() * total;
    for (let i = 0; i < alive.length; i++) {
      r -= weights[i];
      if (r <= 0) return alive[i];
    }
    return alive[0];
  }

  function applyHeal(caster, target, rawAmt, skillName) {
    if (!target || !target.alive) return 0;
    let amt = rawAmt * (1 + (caster.healPct || 0));
    if (engine.anomaly && engine.anomaly.def.id === 'fever') amt *= 1.55;
    amt = Math.max(1, Math.round(amt));

    const missing = target.maxHp - target.hp;
    const actualHeal = Math.min(missing, amt);
    const overheal = Math.max(0, amt - actualHeal);
    target.hp += actualHeal;

    // ヒーラー固有アビリティ: 超過回復の50%を障壁化＋弱体1つ解除
    if (caster.side === 'ally' && caster.role === 'healer') {
      if (overheal > 0) target.shield += Math.round(overheal * 0.50);
      const debuffKeys = Object.keys(target.debuffs);
      if (debuffKeys.length) delete target.debuffs[debuffKeys[0]];
    }

    // シズク専用武器: 回復対象ゲージ+14%
    if (caster.side === 'ally' && caster.exPassive === 'overheal_gauge') {
      target.gauge = Math.min(100, target.gauge + 14);
    }

    if (caster.side === 'ally' && caster.metrics) caster.metrics.healDone += amt;
    if (target.side === 'ally' && target.metrics) target.metrics.healRecv += amt;

    pushPopup(target, `+${HS.UTIL.fmtNum(amt)}`, '#52f29b', false);
    pushVfx('heal', caster, target, '#52f29b');
    addLog(caster.name, target.name, skillName, `+${HS.UTIL.fmtNum(amt)}`, 'heal', caster.attr);
    HS.AUDIO.play('heal');
    return amt;
  }

  function applyDamage(attacker, target, mult, skillName, opts) {
    if (!target || !target.alive) return 0;
    const o = opts || {};

    let atk = attacker.atk;
    if (attacker.buffs.atkUp) atk *= 1.28;
    if (attacker.debuffs.atkDown) atk *= 0.78;
    if (attacker.role === 'dealer' && attacker.frenzyStacks) {
      atk *= 1 + attacker.frenzyStacks * 0.05;
    }

    let def = target.def;
    if (target.buffs.defUp) def *= 1.30;
    if (target.debuffs.defDown) def *= 0.70;
    if (attacker.exPassive === 'pierce_surge') def *= 0.75;

    const atkAttr = o.overrideAttr || attacker.attr;
    const rel = HS.CONST.getAttrMultiplier(atkAttr, target.attr);
    const defFactor = 100 / (100 + def * 0.75);

    let dmg = atk * mult * defFactor * rel.mult * HS.UTIL.rand(0.94, 1.07);
    if (attacker.attrBonus) dmg *= 1 + attacker.attrBonus;

    // 各種専用武器パッシブ倍率
    if (attacker.exPassive === 'speed_scaling') dmg += attacker.spd * 1.8;
    if (attacker.exPassive === 'dragon_execute' && target.hp / target.maxHp <= 0.5) dmg *= 1.35;
    if (attacker.exPassive === 'abyss_echo' && Object.keys(target.debuffs).length > 0) dmg *= 1.40;
    if (attacker.side === 'ally' && attacker.shield > 0 && engine.allies.some((a) => a.alive && a.exPassive === 'prism_bless')) {
      dmg *= 1.15;
    }

    // はちゃめちゃ異変ボーナス
    if (engine.anomaly) {
      if (engine.anomaly.def.id === 'fever') dmg *= 1.55;
      if (attacker.side === 'ally' && engine.allies.some((a) => a.alive && a.exPassive === 'chaos_master')) dmg *= 1.25;
      if (attacker.exPassive === 'chaos_overdrive') dmg *= 1.30;
    }

    // 会心判定
    let critChance = attacker.crit + (o.bonusCrit || 0);
    if (engine.anomaly && engine.anomaly.def.id === 'fever') critChance += 0.30;
    const isCrit = Math.random() < critChance;
    if (isCrit) dmg *= attacker.cdmg || 1.5;

    // 被ダメ軽減
    let red = target.dmgRed || 0;
    if (target.exPassive === 'tide_guard' && target.shield > 0) red += 0.15;
    dmg *= 1 - HS.UTIL.clamp(red, 0, 0.72);
    dmg = Math.max(1, Math.round(dmg));

    // 障壁吸収→HP減少
    let rem = dmg;
    if (target.shield > 0) {
      const abs = Math.min(target.shield, rem);
      target.shield -= abs;
      rem -= abs;
    }
    target.hp = Math.max(0, target.hp - rem);
    target.hitAnim = 1;

    // DPS集計
    if (attacker.side === 'ally' && attacker.metrics) {
      attacker.metrics.dmgDealt += dmg;
      if (dmg > HS.STATE.data.stats.maxSingleHit) HS.STATE.data.stats.maxSingleHit = dmg;
    }
    if (target.side === 'ally' && target.metrics) {
      target.metrics.dmgTaken += dmg;
    }

    // ディーラー固有アビリティ: 会心または弱点で攻撃スタック
    if (attacker.side === 'ally' && attacker.role === 'dealer' && (isCrit || rel.relation === 'weak')) {
      attacker.frenzyStacks = Math.min(8, (attacker.frenzyStacks || 0) + 1);
    }

    // タンク固有アビリティ: 被弾時にカオス+4
    if (target.side === 'ally' && target.role === 'tank') {
      addChaos(4, target);
      if (target.exPassive === 'reflect_burn' && attacker.alive && !o.isReflect) {
        const refDmg = Math.max(1, Math.round(target.def * 0.85));
        attacker.hp = Math.max(0, attacker.hp - refDmg);
        if (target.metrics) target.metrics.dmgDealt += refDmg;
        pushPopup(attacker, `反撃-${refDmg}`, '#ff7a45', false);
        if (attacker.hp <= 0) attacker.alive = false;
      }
    }

    // 吸血回復
    const vamp = (attacker.lifesteal || 0) + (o.lifestealBonus || 0);
    if (vamp > 0 && attacker.alive) {
      const vh = Math.max(1, Math.round(dmg * vamp));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + vh);
      if (attacker.metrics) {
        attacker.metrics.healDone += vh;
        attacker.metrics.healRecv += vh;
      }
    }

    // ミオ専用武器: 命中時敵ゲージ後退
    if (attacker.exPassive === 'chill_delay' && target.alive) {
      target.gauge = Math.max(0, target.gauge - 12);
    }

    // ホムラ専用武器: 会心時に全体爆風
    if (isCrit && attacker.exPassive === 'crit_splash' && !o.isSplash) {
      for (const e of engine.enemies.filter((x) => x.alive && x.cid !== target.cid)) {
        applyDamage(attacker, e, 0.45, '尺玉爆風', { isSplash: true, isReflect: true });
      }
    }

    // 属性シャッフル異変: 味方攻撃にランダム属性追撃
    if (engine.anomaly && engine.anomaly.def.id === 'shuffle' && attacker.side === 'ally' && !o.isSplash) {
      const randAttr = HS.UTIL.pick(['fire', 'water', 'wind', 'light', 'dark']);
      applyDamage(attacker, target, 0.35, '属性暴走', { isSplash: true, overrideAttr: randAttr });
    }

    const col = isCrit ? '#ffd633' : rel.relation === 'weak' ? '#ff5a4f' : '#ffffff';
    const tag = `${isCrit ? '!' : ''}${rel.relation === 'weak' ? '弱点' : ''}`;
    pushPopup(target, `-${HS.UTIL.fmtNum(dmg)}${tag}`, col, isCrit);
    pushVfx(o.vfxType || 'slash', attacker, target, HS.CONST.ATTR_MAP[atkAttr]?.color || '#ff3898');
    if (isCrit) {
      engine.shake = Math.max(engine.shake, 5);
      HS.AUDIO.play('crit');
    } else {
      HS.AUDIO.play('hit');
    }

    addLog(
      attacker.name,
      target.name,
      skillName,
      `-${HS.UTIL.fmtNum(dmg)}${isCrit ? '!' : ''}`,
      isCrit ? 'crit' : 'dmg',
      atkAttr
    );

    if (target.hp <= 0) {
      target.alive = false;
      addLog(attacker.name, target.name, '撃破', 'K.O.', 'chaos', atkAttr);
      if (attacker.exPassive === 'abyss_echo') attacker.gauge = Math.min(100, attacker.gauge + 50);
    }
    return dmg;
  }

  function tickStatus(u) {
    for (const k of Object.keys(u.buffs)) {
      u.buffs[k] -= 1;
      if (u.buffs[k] <= 0) delete u.buffs[k];
    }
    for (const k of Object.keys(u.debuffs)) {
      u.debuffs[k] -= 1;
      if (u.debuffs[k] <= 0) delete u.debuffs[k];
    }
    for (let i = 0; i < u.cds.length; i++) {
      if (u.cds[i] > 0) u.cds[i] -= 1;
    }
  }

  function chooseAllySkillIndex(ally) {
    if (ally.queuedSkillIdx !== null && ally.cds[ally.queuedSkillIdx] <= 0) {
      const idx = ally.queuedSkillIdx;
      ally.queuedSkillIdx = null;
      return idx;
    }
    const auto = HS.STATE.data.settings.autoBattle;
    if (!auto) return 0; // 手動時は通常技でテンポ維持、技2・3はタップ/D&Dで任意発動

    // AI判断: ヒーラーはHPが減っていたら優先回復
    if (ally.role === 'healer') {
      const lowRatio = Math.min(...engine.allies.filter((a) => a.alive).map((a) => a.hp / a.maxHp));
      if (lowRatio < 0.72) {
        if (ally.cds[2] <= 0) return 2;
        if (ally.cds[1] <= 0) return 1;
      }
      return 0;
    }
    if (ally.cds[2] <= 0) return 2;
    if (ally.cds[1] <= 0) return 1;
    return 0;
  }

  function executeAllyTurn(ally) {
    tickStatus(ally);
    ally.actAnim = 1;

    // 行動開始時パッシブ
    if (ally.exPassive === 'tide_guard') {
      applyHeal(ally, ally, Math.round(ally.maxHp * 0.05), '竜鱗再生');
    }
    if (ally.exPassive === 'wind_regen') {
      for (const a of engine.allies.filter((x) => x.alive)) {
        applyHeal(ally, a, Math.round(a.maxHp * 0.05), '翡翠の風');
      }
    }

    const sIdx = chooseAllySkillIndex(ally);
    const sk = ally.skills[sIdx];
    const prefTarget = ally.queuedTargetCid;
    ally.queuedTargetCid = null;
    ally.cds[sIdx] = engine.anomaly && engine.anomaly.def.id === 'chrono' ? Math.max(0, sk.cd - 1) : sk.cd;

    const aliveEnemies = engine.enemies.filter((e) => e.alive);
    const aliveAllies = engine.allies.filter((a) => a.alive);
    if (!aliveEnemies.length) return;

    const shieldScale = engine.allies.some((a) => a.alive && a.exPassive === 'prism_bless') ? 1.35 : 1;
    const hasteScale = engine.allies.some((a) => a.alive && a.exPassive === 'haste_aura') ? 1.40 : 1;

    // スキル種別実行
    if (sk.type === 'dmg') {
      const t = pickEnemyTarget(prefTarget);
      if (t) {
        applyDamage(ally, t, sk.mult, sk.name, { lifestealBonus: sk.lifestealBonus });
        if (sk.debuff && t.alive) t.debuffs[sk.debuff] = 2;
      }
    } else if (sk.type === 'aoe' || sk.type === 'debuffAll') {
      for (const e of aliveEnemies) {
        if (sk.mult) applyDamage(ally, e, sk.mult, sk.name, { vfxType: 'beam' });
        if (sk.debuff && e.alive) e.debuffs[sk.debuff] = 2;
        if (sk.pushBack && e.alive) e.gauge = Math.max(0, e.gauge - sk.pushBack);
      }
    } else if (sk.type === 'multi') {
      const hits = (sk.hits || 3) + (ally.exPassive === 'chaos_overdrive' && engine.anomaly ? 1 : 0);
      for (let h = 0; h < hits; h++) {
        const pool = engine.enemies.filter((e) => e.alive);
        if (!pool.length) break;
        const t = h === 0 && prefTarget ? pickEnemyTarget(prefTarget) : HS.UTIL.pick(pool);
        const rndAttr = ally.uid === 'mechako' ? HS.UTIL.pick(['fire', 'water', 'wind', 'light', 'dark']) : null;
        applyDamage(ally, t, sk.mult, sk.name, { bonusCrit: 0.12, overrideAttr: rndAttr });
      }
    } else if (sk.type === 'chaos') {
      const roll = HS.UTIL.rand(0.85, 1.85);
      for (const e of aliveEnemies) {
        applyDamage(ally, e, sk.mult * roll * 0.72, `${sk.name}×${roll.toFixed(1)}`, { vfxType: 'beam' });
      }
    } else if (sk.type === 'taunt') {
      ally.buffs.taunt = 2;
      for (const a of aliveAllies) {
        if (sk.shieldPct) a.shield += Math.round(ally.maxHp * sk.shieldPct * shieldScale);
        if (sk.buff) a.buffs[sk.buff] = 2;
      }
      pushVfx('buff', ally, ally, '#ffd633');
      addLog(ally.name, '味方全体', sk.name, '挑発+障壁', 'buff', ally.attr);
      HS.AUDIO.play('buff');
      if (ally.exPassive === 'photon_nova') {
        for (const e of aliveEnemies) applyDamage(ally, e, 0.9, '光子衝撃');
      }
    } else if (sk.type === 'heal') {
      const t = (prefTarget && aliveAllies.find((a) => a.cid === prefTarget)) ||
        [...aliveAllies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (t) {
        applyHeal(ally, t, ally.atk * sk.mult, sk.name);
        if (sk.shieldPct) t.shield += Math.round(ally.maxHp * sk.shieldPct * shieldScale);
      }
    } else if (sk.type === 'healAll' || sk.type === 'shieldAll') {
      for (const a of aliveAllies) {
        if (sk.mult || sk.healAllMult) {
          applyHeal(ally, a, ally.atk * (sk.mult || sk.healAllMult), sk.name);
        }
        if (sk.shieldPct) a.shield += Math.round(ally.maxHp * sk.shieldPct * shieldScale);
        if (sk.buff) a.buffs[sk.buff] = 2;
      }
      if (ally.exPassive === 'heal_ignite') {
        const hi = [...aliveEnemies].sort((a, b) => b.hp - a.hp)[0];
        if (hi) applyDamage(ally, hi, 0.90, '魂釜の炎');
      }
    } else if (sk.type === 'buffAll') {
      for (const a of aliveAllies) {
        if (sk.buff) a.buffs[sk.buff] = 2;
        if (sk.shieldPct) a.shield += Math.round(ally.maxHp * sk.shieldPct * shieldScale);
      }
      pushVfx('buff', ally, ally, '#2ee6ff');
      addLog(ally.name, '味方全体', sk.name, '強化付与', 'buff', ally.attr);
      HS.AUDIO.play('buff');
    }

    // 付帯効果
    if (sk.selfShieldPct) ally.shield += Math.round(ally.maxHp * sk.selfShieldPct * shieldScale);
    if (sk.buffSelf) ally.buffs[sk.buffSelf] = 2;
    if (sk.buff && sk.type !== 'taunt' && sk.type !== 'healAll' && sk.type !== 'buffAll') {
      for (const a of aliveAllies) a.buffs[sk.buff] = 2;
    }
    if (sk.healLowest) {
      const low = [...aliveAllies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (low) applyHeal(ally, low, ally.atk * sk.healLowest, sk.name);
    }
    if (sk.pushGauge) {
      const gain = sk.pushGauge * hasteScale;
      if (sk.type === 'buffAll' || sk.type === 'healAll' || sk.type === 'aoe') {
        for (const a of aliveAllies) a.gauge = Math.min(100, a.gauge + gain);
      } else {
        const slow = [...aliveAllies].sort((a, b) => a.gauge - b.gauge)[0];
        if (slow) slow.gauge = Math.min(100, slow.gauge + gain);
      }
    }

    // サポーター固有アビリティ: 技使用時に最少ゲージ味方+16%
    if (ally.role === 'supporter') {
      const lowG = [...aliveAllies].filter((a) => a.cid !== ally.cid).sort((a, b) => a.gauge - b.gauge)[0];
      if (lowG) lowG.gauge = Math.min(100, lowG.gauge + 16 * hasteScale);
    }

    // 専用武器の行動後効果
    if (ally.exPassive === 'pierce_surge' && sIdx > 0) ally.gauge = Math.min(100, ally.gauge + 15);
    if (ally.exPassive === 'chaos_spark') addChaos(6, ally);
    if (ally.exPassive === 'cd_rewind' && sIdx > 0) {
      for (const a of aliveAllies) {
        a.cds = a.cds.map((c) => Math.max(0, c - 1));
      }
    }

    addChaos(sk.chaos || 8, ally);
  }

  function executeEnemyTurn(enemy) {
    tickStatus(enemy);
    enemy.actAnim = 1;

    // メア専用武器: 敵行動ごとに闇の呪いダメ
    const mare = engine.allies.find((a) => a.alive && a.exPassive === 'curse_amp');
    if (mare && enemy.alive) {
      applyDamage(mare, enemy, 0.45, '悪夢の呪い', { isSplash: true });
      if (!enemy.alive) return;
    }

    const aliveAllies = engine.allies.filter((a) => a.alive);
    const aliveEnemies = engine.enemies.filter((e) => e.alive);
    if (!aliveAllies.length) return;

    if (enemy.role === 'healer' && enemy.cds[1] <= 0) {
      enemy.cds[1] = 2;
      const low = [...aliveEnemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (low && low.hp / low.maxHp < 0.85) {
        const healAmt = Math.round(enemy.atk * 1.4);
        low.hp = Math.min(low.maxHp, low.hp + healAmt);
        pushPopup(low, `+${HS.UTIL.fmtNum(healAmt)}`, '#52f29b', false);
        addLog(enemy.name, low.name, '修復波動', `+${HS.UTIL.fmtNum(healAmt)}`, 'heal', enemy.attr);
        return;
      }
    }

    if (enemy.isBoss && enemy.cds[2] <= 0) {
      enemy.cds[2] = 3;
      for (const a of aliveAllies) {
        applyDamage(enemy, a, 1.18, '混沌暴走波', { vfxType: 'beam' });
      }
      engine.shake = Math.max(engine.shake, 7);
      return;
    }

    const target = pickAllyTargetForEnemy();
    if (target) {
      const mult = enemy.cds[1] <= 0 ? (enemy.cds[1] = 2, 1.32) : 1.0;
      const name = mult > 1 ? '強襲撃' : '通常攻撃';
      applyDamage(enemy, target, mult, name);
    }
  }

  function settleBattle(won) {
    const stage = engine.stage;
    HS.STATE.data.stats.totalRuns += 1;
    if (won) HS.STATE.data.stats.totalWins += 1;

    const loot = {
      won,
      stageId: stage.id,
      stageCode: stage.code,
      stageName: stage.name,
      elapsed: engine.elapsed,
      gold: 0,
      exp: 0,
      shards: 0,
      cores: 0,
      gearDrops: [],
      autoSoldCount: 0,
      autoSoldGold: 0,
      autoSoldDust: 0,
      unlockedUnit: null,
      levelUps: [],
      metrics: engine.allies.map((a) => ({
        uid: a.uid,
        name: a.name,
        attr: a.attr,
        role: a.role,
        ...a.metrics
      }))
    };

    if (won) {
      HS.AUDIO.play('win');
      const isFirst = !HS.STATE.data.clearedStages[stage.id];
      HS.STATE.data.clearedStages[stage.id] = (HS.STATE.data.clearedStages[stage.id] || 0) + 1;
      if (stage.mode === 'tower' && stage.floor >= HS.STATE.data.towerFloor) {
        HS.STATE.data.towerFloor = stage.floor + 1;
      }

      loot.gold = stage.gold + (isFirst ? Math.round(stage.gold * 0.5) : 0);
      loot.exp = stage.exp;
      loot.shards = stage.shards + (isFirst ? 5 : 0);
      loot.cores = Math.random() < (stage.coreChance || 0.2) ? (stage.coreCount || 1) : 0;

      HS.STATE.data.resources.gold += loot.gold;
      HS.STATE.data.resources.expCrystal += loot.exp;
      HS.STATE.data.resources.shards += loot.shards;
      HS.STATE.data.resources.cores += loot.cores;

      // 出撃メンバーにも直接少量経験値付与→自動レベルアップチェック
      for (const a of engine.allies) {
        const us = HS.STATE.data.units[a.uid];
        if (!us) continue;
        us.exp += Math.round(stage.exp * 0.45);
        const maxLv = 99 + us.awakening * 10;
        let up = 0;
        while (us.level < maxLv) {
          const need = Math.round(90 * Math.pow(1.15, us.level - 1));
          if (us.exp >= need) {
            us.exp -= need;
            us.level += 1;
            up += 1;
          } else break;
        }
        if (up > 0) loot.levelUps.push({ name: a.name, level: us.level, up });
      }

      // ステージ初回クリアによるキャラ解放（ガチャ無し！）
      if (stage.unlockUnit && HS.STATE.data.units[stage.unlockUnit] && !HS.STATE.data.units[stage.unlockUnit].unlocked) {
        HS.STATE.data.units[stage.unlockUnit].unlocked = true;
        loot.unlockedUnit = HS.UNITS_MAP[stage.unlockUnit];
      }

      // ハクスラ装備ドロップ (1〜2個)
      const dropCount = stage.mode === 'boss' || (stage.mode === 'tower' && stage.floor % 5 === 0) ? 2 : 1;
      for (let i = 0; i < dropCount; i++) {
        const gear = HS.EQUIP.generateEquipment(stage.recPower, stage.rarityBias || (0.6 + (stage.world || 1) * 0.35));
        const res = HS.STATE.addEquipmentLoot(gear);
        loot.gearDrops.push(res);
        if (res.autoSold) {
          loot.autoSoldCount += 1;
          loot.autoSoldGold += res.gold;
          loot.autoSoldDust += res.dust;
        }
      }
      if (loot.gearDrops.some((d) => d.kept)) HS.AUDIO.play('drop');
    } else {
      HS.AUDIO.play('lose');
    }

    HS.STATE.scheduleSave(true);

    // ===== 自動周回モード vs 通常戦闘モードの完全分離 =====
    if (engine.repeatSession) {
      const rs = engine.repeatSession;
      rs.runs += 1;
      rs.totalElapsed += engine.elapsed;
      if (won) rs.wins += 1; else rs.losses += 1;
      rs.gold += loot.gold;
      rs.exp += loot.exp;
      rs.shards += loot.shards;
      rs.cores += loot.cores;
      rs.autoSoldCount += loot.autoSoldCount;
      rs.autoSoldGold += loot.autoSoldGold;
      rs.autoSoldDust += loot.autoSoldDust;
      for (const d of loot.gearDrops) {
        if (d.kept) rs.keptGear.push(d.item);
      }
      if (loot.unlockedUnit) rs.unlockedUnits.push(loot.unlockedUnit);
      for (const m of loot.metrics) {
        if (!rs.unitMetrics[m.uid]) {
          rs.unitMetrics[m.uid] = { ...m };
        } else {
          rs.unitMetrics[m.uid].dmgDealt += m.dmgDealt;
          rs.unitMetrics[m.uid].dmgTaken += m.dmgTaken;
          rs.unitMetrics[m.uid].healDone += m.healDone;
          rs.unitMetrics[m.uid].healRecv += m.healRecv;
        }
      }

      if (!won) {
        // 周回中敗北 → 周回終了して専用集計リザルトへ
        stopRepeatAndShowSummary();
      } else {
        engine.phase = 'repeat_wait';
        engine.repeatWaitTimer = 1.15;
        if (engine.callbacks.onStateChange) engine.callbacks.onStateChange();
      }
      return;
    }

    engine.phase = 'ended';
    engine.lastNormalResult = loot;
    if (engine.callbacks.onNormalResult) engine.callbacks.onNormalResult(loot);
    if (engine.callbacks.onStateChange) engine.callbacks.onStateChange();
  }

  function update(rawDt) {
    const dt = Math.min(0.05, rawDt || 0.016);

    // VFX・ポップアップ更新
    if (engine.shake > 0) engine.shake = Math.max(0, engine.shake - dt * 28);
    if (engine.flash) {
      engine.flash.alpha -= dt * 1.4;
      if (engine.flash.alpha <= 0) engine.flash = null;
    }
    for (let i = engine.vfx.length - 1; i >= 0; i--) {
      engine.vfx[i].life -= dt;
      if (engine.vfx[i].life <= 0) engine.vfx.splice(i, 1);
    }
    for (let i = engine.popups.length - 1; i >= 0; i--) {
      const p = engine.popups[i];
      p.life -= dt;
      p.y += p.vy * dt;
      if (p.life <= 0) engine.popups.splice(i, 1);
    }
    for (const u of [...engine.allies, ...engine.enemies]) {
      if (u.hitAnim > 0) u.hitAnim = Math.max(0, u.hitAnim - dt * 4.5);
      if (u.actAnim > 0) u.actAnim = Math.max(0, u.actAnim - dt * 3.5);
    }

    if (engine.phase === 'repeat_wait') {
      engine.repeatWaitTimer -= dt;
      if (engine.repeatWaitTimer <= 0 && engine.repeatSession) {
        let nextStageId = engine.repeatSession.stageId;
        if (nextStageId.startsWith('tower-')) {
          nextStageId = `tower-${HS.STATE.data.towerFloor}`;
          engine.repeatSession.stageId = nextStageId;
        }
        startBattle(nextStageId, true);
      }
      return;
    }

    if (engine.phase !== 'fighting') return;

    const spdMult = HS.UTIL.clamp(HS.STATE.data.settings.speed || 1, 1, 3);
    const simDt = dt * spdMult;
    engine.elapsed += simDt;

    // 異変タイマー更新
    if (engine.anomaly) {
      engine.anomaly.timer -= simDt;
      engine.anomaly.tickAccum += simDt;
      if (engine.anomaly.tickAccum >= 1.0) {
        engine.anomaly.tickAccum -= 1.0;
        if (engine.anomaly.def.id === 'meteor') {
          const aliveE = engine.enemies.filter((e) => e.alive);
          const lead = engine.allies.find((a) => a.alive);
          if (aliveE.length && lead) {
            const target = HS.UTIL.pick(aliveE);
            applyDamage(lead, target, 0.75, '反転メテオ', { vfxType: 'meteor', isSplash: true });
          }
        } else if (engine.anomaly.def.id === 'parade') {
          const lead = engine.allies.find((a) => a.alive);
          if (lead) {
            for (const a of engine.allies.filter((x) => x.alive)) {
              applyHeal(lead, a, Math.round(a.maxHp * 0.08), '大回復パレード');
            }
          }
        }
      }
      if (engine.anomaly.timer <= 0) engine.anomaly = null;
    } else if (engine.chaos >= 100 && HS.STATE.data.settings.autoBattle) {
      triggerChaosAnomaly(false);
    }

    // ATB進行
    const allUnits = [...engine.allies, ...engine.enemies].filter((u) => u.alive);
    let actor = null;
    let topGauge = 99.99;
    for (const u of allUnits) {
      u.gauge += getEffSpd(u) * simDt * 0.42;
      if (u.gauge >= 100 && u.gauge > topGauge) {
        topGauge = u.gauge;
        actor = u;
      }
    }

    if (actor) {
      actor.gauge = 0;
      if (actor.side === 'ally') executeAllyTurn(actor);
      else executeEnemyTurn(actor);

      // 勝敗判定
      if (!engine.enemies.some((e) => e.alive)) {
        settleBattle(true);
      } else if (!engine.allies.some((a) => a.alive)) {
        settleBattle(false);
      }
    }
  }

  function queueAllySkill(allyCid, skillIdx, targetCid) {
    const ally = engine.allies.find((a) => a.cid === allyCid && a.alive);
    if (!ally) return false;
    if (ally.cds[skillIdx] > 0) return false;
    ally.queuedSkillIdx = skillIdx;
    if (targetCid) ally.queuedTargetCid = targetCid;
    HS.AUDIO.play('tap');
    return true;
  }

  function setFocusEnemy(enemyCid) {
    const e = engine.enemies.find((x) => x.cid === enemyCid && x.alive);
    if (!e) return false;
    engine.focusedEnemyId = e.cid;
    HS.AUDIO.play('tap');
    return true;
  }

  function setSelectedAlly(allyCid) {
    const a = engine.allies.find((x) => x.cid === allyCid);
    if (!a) return false;
    engine.selectedAllyId = a.cid;
    HS.AUDIO.play('tap');
    return true;
  }

  HS.COMBAT = {
    engine,
    isActive,
    isRepeating,
    startBattle,
    stopRepeatAndShowSummary,
    retreatBattle,
    triggerChaosAnomaly,
    getActionOrder,
    queueAllySkill,
    setFocusEnemy,
    setSelectedAlly,
    update
  };
})(window);
