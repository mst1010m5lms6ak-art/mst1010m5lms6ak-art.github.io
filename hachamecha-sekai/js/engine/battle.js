(function () {
  'use strict';

  const Hacha = window.Hacha;

  function createBattleController(callbacks) {
    const cb = callbacks || {};
    const vfx = Hacha.engine.createVfxLayer();

    let rafId = null;
    let lastTs = 0;
    let running = false;
    let paused = false;
    let session = null;   // 現在進行中の1戦データ
    let loop = null;      // 周回セッション（自動周回時は累積維持）

    function getSpeedMult() {
      const s = (Hacha.state && Hacha.state.settings && Hacha.state.settings.battleSpeed) || 1;
      return s === 3 ? 2.35 : (s === 2 ? 1.65 : 1);
    }

    function createEmptyDpsMap(partySpecs) {
      const map = {};
      partySpecs.units.forEach((u) => {
        map[u.charId] = {
          charId: u.charId,
          name: u.def.name,
          icon: u.def.icon,
          element: u.def.element,
          dmgDealt: 0,
          dmgTaken: 0,
          healDone: 0,
          healRecv: 0
        };
      });
      return map;
    }

    function createUnitFromAllySpec(spec, slotIdx) {
      const startShield = Math.round(
        spec.maxHp * (
          (spec.mods.waveShieldPct || 0) +
          (spec.resTotals.shieldStart || 0)
        )
      );
      return {
        key: `ally_${slotIdx}`,
        side: 'ally',
        slot: slotIdx,
        charId: spec.charId,
        name: spec.def.name,
        icon: spec.def.icon,
        element: spec.def.element,
        races: spec.def.races.slice(),
        role: spec.def.role,
        skills: spec.def.skills,
        skillRanks: spec.prog.skillRanks.slice(),
        cds: [0, 0, 0],
        maxHp: spec.maxHp,
        hp: spec.maxHp,
        displayHp: spec.maxHp,
        trailHp: spec.maxHp,
        shield: startShield,
        displayShield: startShield,
        atk: spec.atk,
        defVal: spec.defVal,
        spd: spec.spd,
        crit: spec.crit,
        ct: (spec.mods.waveStartCt || 0),
        statuses: [],
        mods: spec.mods,
        partyMods: spec.partyMods,
        resTotals: spec.resTotals,
        alive: true,
        gutsUsed: false,
        reviveUsed: false,
        hitFlash: 0,
        isBoss: false,
        isIntruder: false
      };
    }

    function createUnitFromEnemyId(enemyId, slotIdx, stage, opts) {
      const def = Hacha.data.ENEMY_MAP[enemyId];
      const o = opts || {};
      const scale = (stage.scale || 1) * (o.elite ? 1.55 : 1) * (o.intruder ? 1.15 : 1);
      const maxHp = Math.round(def.base.hp * scale);
      const atk = Math.round(def.base.atk * (0.85 + scale * 0.25));
      const defVal = Math.round(def.base.def * (0.85 + scale * 0.2));
      const spd = Math.round(def.base.spd * (0.95 + Math.min(0.25, (scale - 1) * 0.12)));

      /* 図鑑へ遭遇登録（ボーナス無し・観賞用） */
      if (Hacha.state && Hacha.state.codex && !Hacha.state.codex.enemies.includes(enemyId)) {
        Hacha.state.codex.enemies.push(enemyId);
      }

      return {
        key: `enemy_${slotIdx}_${Math.random().toString(36).slice(2, 6)}`,
        side: 'enemy',
        slot: slotIdx,
        enemyId,
        name: def.name,
        icon: def.icon,
        element: def.element,
        races: def.races.slice(),
        role: def.role,
        skills: def.skills,
        skillRanks: [1, 1, 1],
        cds: [0, 0, 0],
        maxHp,
        hp: maxHp,
        displayHp: maxHp,
        trailHp: maxHp,
        shield: 0,
        displayShield: 0,
        atk,
        defVal,
        spd,
        crit: o.boss ? 0.14 : 0.08,
        ct: Hacha.util.randInt(0, 140),
        statuses: [],
        mods: {},
        partyMods: {},
        resTotals: {},
        alive: true,
        gutsUsed: false,
        reviveUsed: false,
        hitFlash: 0,
        isBoss: !!o.boss || def.category === 'boss' || def.category === 'raid',
        isIntruder: !!o.intruder || def.category === 'intruder',
        isArenaUnit: false
      };
    }

    /* 闘技場専用：ゲーム内キャラ定義から4vs4模擬戦の相手ユニットを生成 */
    function createUnitFromArenaCharId(charId, slotIdx, stage, isLeader) {
      const def = Hacha.data.CHARACTER_MAP[charId] || Hacha.data.CHARACTERS[0];
      const scale = stage.scale || 1;
      const mods = {};
      (def.skills || []).forEach((sk) => {
        if (sk.scope === 'passive' && sk.passive) {
          Object.keys(sk.passive).forEach((k) => {
            mods[k] = (mods[k] || 0) + sk.passive[k];
          });
        }
      });

      const maxHp = Math.round(def.base.hp * (1 + (mods.hpPct || 0)) * (1.35 * scale) * (isLeader ? 1.12 : 1));
      const atk = Math.round(def.base.atk * (0.86 * scale));
      const defVal = Math.round(def.base.def * (1 + (mods.defPct || 0)) * (0.86 * scale));
      const spd = Math.round(def.base.spd * (1 + (mods.spdPct || 0)) * (0.94 + Math.min(0.18, Math.max(-0.08, (scale - 1) * 0.12))));
      const crit = Math.min(0.55, (def.base.crit || 0.10) + (mods.critFlat || 0));

      return {
        key: `arena_${slotIdx}_${charId}_${Math.random().toString(36).slice(2, 6)}`,
        side: 'enemy',
        slot: slotIdx,
        charId: def.id,
        name: def.name,
        icon: def.icon,
        element: def.element,
        races: def.races.slice(),
        role: def.role,
        skills: def.skills,
        skillRanks: [1, 1, 1],
        cds: [0, 0, 0],
        maxHp,
        hp: maxHp,
        displayHp: maxHp,
        trailHp: maxHp,
        shield: 0,
        displayShield: 0,
        atk,
        defVal,
        spd,
        crit,
        ct: Hacha.util.randInt(0, 120),
        statuses: [],
        mods,
        partyMods: {},
        resTotals: {},
        alive: true,
        gutsUsed: false,
        reviveUsed: false,
        hitFlash: 0,
        isBoss: !!isLeader,
        isIntruder: false,
        isArenaUnit: true
      };
    }

    function addLog(kind, actor, action, result, resultCls) {
      if (!session) return;
      session.logs.push({
        id: ++session.logSeq,
        kind: kind || 'normal',
        actor: actor || '',
        action: action || '',
        result: result || '',
        resultCls: resultCls || ''
      });
      if (session.logs.length > 42) session.logs.shift();
      if (cb.onLog) cb.onLog(session.logs);
    }

    function hasStatus(u, id) {
      return u.statuses.some((s) => s.id === id && s.turns > 0);
    }

    function applyStatus(target, id, turns, sourceMods) {
      if (!target || !target.alive) return false;
      const meta = Hacha.consts.STATUS_META[id];
      if (!meta) return false;
      if (meta.kind === 'ailment' && target.mods && target.mods.immuneCC && (id === 'stun' || id === 'freeze' || id === 'silence')) {
        return false;
      }
      if (meta.kind !== 'buff' && target.mods && target.mods.statusRes) {
        if (Math.random() < target.mods.statusRes) return false;
      }
      const existing = target.statuses.find((s) => s.id === id);
      if (existing) {
        existing.turns = Math.max(existing.turns, turns);
      } else {
        target.statuses.push({ id, turns });
        if (target.statuses.length > 6) {
          /* バフ/デバフ枠を6枠に維持しUIズレゼロ保証 */
          target.statuses.shift();
        }
      }
      if (meta.kind === 'buff' && target.side === 'ally' && session) {
        const ruleMod = (session.rule && session.rule.mods) || {};
        addChainGauge(3 * (1 + (ruleMod.buffChainBonus || 0)));
      }
      return true;
    }

    function cleanseStatuses(target, count) {
      let removed = 0;
      for (let i = target.statuses.length - 1; i >= 0 && removed < count; i--) {
        const meta = Hacha.consts.STATUS_META[target.statuses[i].id];
        if (meta && (meta.kind === 'ailment' || meta.kind === 'debuff')) {
          target.statuses.splice(i, 1);
          removed++;
        }
      }
      return removed;
    }

    function getEffectiveSpd(u) {
      let sp = u.spd;
      if (hasStatus(u, 'spd_up')) sp *= 1.28;
      if (hasStatus(u, 'spd_down')) sp *= 0.74;
      const rm = (session && session.rule && session.rule.mods) || {};
      if (rm.globalCtBoost) sp *= (1 + rm.globalCtBoost);
      return Math.max(30, sp);
    }

    function getEffectiveAtk(u) {
      let a = u.atk;
      if (hasStatus(u, 'atk_up')) a *= 1.28;
      if (hasStatus(u, 'atk_down')) a *= 0.76;
      if (u.mods && u.mods.missingHpAtk) {
        const missingRatio = 1 - (u.hp / u.maxHp);
        a *= (1 + u.mods.missingHpAtk * missingRatio);
      }
      return a;
    }

    function getEffectiveDef(u) {
      let d = u.defVal;
      if (hasStatus(u, 'def_up')) d *= 1.32;
      if (hasStatus(u, 'def_down')) d *= 0.70;
      return Math.max(10, d);
    }

    function addChainGauge(amount) {
      if (!session || amount <= 0) return;
      const resGain = (session.partySpecs.resInfo.totals.chainGain || 0);
      session.chainGauge = Math.min(100, session.chainGauge + amount * (1 + resGain));
    }

    function recordDps(charId, field, amount) {
      if (!session || !charId || amount <= 0) return;
      const rec = session.dpsMap[charId];
      if (rec) rec[field] += Math.round(amount);
    }

    function applyHeal(healer, target, rawAmount) {
      if (!target || !target.alive || rawAmount <= 0) return 0;
      const rm = (session.rule && session.rule.mods) || {};
      let mult = 1 + (healer && healer.mods ? (healer.mods.healPower || 0) : 0)
                   + (healer && healer.resTotals ? (healer.resTotals.heal || 0) : 0)
                   + (rm.healBonus || 0);
      if (healer && healer.mods && healer.mods.lowHpHealBonus && (target.hp / target.maxHp) <= 0.40) {
        mult += healer.mods.lowHpHealBonus;
      }
      const amount = Math.max(1, Math.round(rawAmount * mult));
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + amount);
      const actual = target.hp - before;
      const overflow = Math.max(0, amount - actual);

      if (overflow > 0 && healer && healer.mods && healer.mods.overhealShield) {
        target.shield += Math.round(overflow * healer.mods.overhealShield);
      }
      if (target.mods && target.mods.healToShieldPct && actual > 0) {
        target.shield += Math.round(target.maxHp * target.mods.healToShieldPct);
      }

      if (healer && healer.side === 'ally') recordDps(healer.charId, 'healDone', amount);
      if (target.side === 'ally') recordDps(target.charId, 'healRecv', amount);

      vfx.spawnRing(target.side, target.slot, '#44e69a');
      vfx.spawnFloatText(target.side, target.slot, `+${amount}`, '#6bffb8', false);

      if (healer && healer.mods) {
        if (healer.mods.cleanseChance && Math.random() < healer.mods.cleanseChance) {
          cleanseStatuses(target, 1);
        }
        if (healer.mods.healGrantRegen) applyStatus(target, 'regen', healer.mods.healGrantRegen);
        if (healer.mods.healGrantDefUp) applyStatus(target, 'def_up', healer.mods.healGrantDefUp);
        if (healer.mods.healGrantAtkUp) applyStatus(target, 'atk_up', healer.mods.healGrantAtkUp);
        if (healer.mods.healCtBoost) target.ct = Math.min(999, target.ct + healer.mods.healCtBoost);
      }
      return amount;
    }

    function applyDamage(attacker, target, rawDmg, opts) {
      if (!target || !target.alive) return { dealt: 0, killed: false, weak: false, crit: false };
      const o = opts || {};
      const rm = (session.rule && session.rule.mods) || {};
      const atkEl = attacker ? attacker.element : 'none';
      let elMult = o.ignoreElement ? 1.0 : Hacha.util.getElementMultiplier(atkEl, target.element);

      const isWeak = elMult > 1.05;
      const isResist = elMult < 0.95;
      if (isWeak) {
        elMult += (attacker && attacker.mods && attacker.mods.weakDmgBonus ? attacker.mods.weakDmgBonus : 0);
        elMult += (attacker && attacker.partyMods && attacker.partyMods.partyWeakBonus ? attacker.partyMods.partyWeakBonus : 0);
        if (rm.weakExtra && rm.boostElements && rm.boostElements.includes(atkEl)) elMult += rm.weakExtra;
      }
      if (isWeak && target.mods && target.mods.weakTakenRed) {
        elMult *= (1 - target.mods.weakTakenRed);
      }

      let critChance = attacker ? attacker.crit : 0.08;
      if (attacker && hasStatus(attacker, 'crit_up')) critChance += 0.25;
      const isCrit = !o.noCrit && Math.random() < critChance;
      const critMult = isCrit
        ? 1.50 + (attacker && attacker.mods ? (attacker.mods.critDmgBonus || 0) : 0)
               + (attacker && attacker.partyMods ? (attacker.partyMods.partyCritDmg || 0) : 0)
               + (attacker && attacker.resTotals ? (attacker.resTotals.critDmg || 0) : 0)
        : 1.0;

      const pen = Math.min(0.75,
        (o.defPen || 0) +
        (attacker && attacker.mods ? (attacker.mods.defPen || 0) : 0) +
        (attacker && attacker.resTotals ? (attacker.resTotals.pen || 0) : 0)
      );
      const effDef = getEffectiveDef(target) * (1 - pen);
      const defFactor = 220 / (220 + effDef);

      let dmg = rawDmg * defFactor * elMult * critMult;

      /* スコープ・状況ボーナス */
      if (attacker && attacker.mods) {
        if (o.scope === 'single') dmg *= (1 + (attacker.mods.singleBonus || 0) + (rm.singleSkillBonus || 0));
        if (o.scope === 'area') dmg *= (1 + (attacker.mods.multiBonus || 0) + (rm.areaSkillBonus || 0));
        if (o.scope === 'all') dmg *= (1 + (attacker.mods.multiBonus || 0) + (rm.allSkillBonus || 0));
        if (attacker.mods.bossDmgBonus && (target.isBoss || target.isIntruder)) dmg *= (1 + attacker.mods.bossDmgBonus);
        if (attacker.mods.highHpDmgBonus && (attacker.hp / attacker.maxHp) >= 0.80) dmg *= (1 + attacker.mods.highHpDmgBonus);
        if (attacker.mods.executeBonus && (target.hp / target.maxHp) <= 0.40) dmg *= (1 + attacker.mods.executeBonus);
        if (attacker.mods.debuffedDmgBonus && target.statuses.some((s) => {
          const m = Hacha.consts.STATUS_META[s.id];
          return m && m.kind !== 'buff';
        })) dmg *= (1 + attacker.mods.debuffedDmgBonus);
      }
      if (rm.spdScaleDmg && attacker) {
        dmg *= (1 + Math.min(0.35, (getEffectiveSpd(attacker) / 140) * rm.spdScaleDmg));
      }
      if (hasStatus(target, 'vuln')) dmg *= 1.24;

      /* 被ダメ軽減 */
      let dmgRed = (target.mods ? (target.mods.dmgTakenRed || 0) : 0)
                 + (target.partyMods ? (target.partyMods.partyDmgRed || 0) : 0);
      if (target.mods && target.mods.lowHpDmgRed && (target.hp / target.maxHp) < 0.50) {
        dmgRed += target.mods.lowHpDmgRed;
      }
      dmg *= (1 - Math.min(0.60, dmgRed));

      /* 乱数振れ幅 ±5% */
      dmg = Math.max(1, Math.round(dmg * (0.95 + Math.random() * 0.10)));

      let remaining = dmg;
      if (target.shield > 0) {
        const absorbed = Math.min(target.shield, remaining);
        target.shield -= absorbed;
        remaining -= absorbed;
      }
      target.hp = Math.max(0, target.hp - remaining);
      target.hitFlash = 0.22;

      /* 根性（不死身の砦）チェック */
      let killed = false;
      if (target.hp <= 0) {
        if (target.mods && target.mods.gutsPct && !target.gutsUsed) {
          target.gutsUsed = true;
          target.hp = Math.max(1, Math.round(target.maxHp * target.mods.gutsPct));
          vfx.spawnFloatText(target.side, target.slot, '不屈！', '#ffe066', true);
        } else {
          target.alive = false;
          target.ct = 0;
          target.statuses = [];
          killed = true;
        }
      }

      if (attacker && attacker.side === 'ally') recordDps(attacker.charId, 'dmgDealt', dmg);
      if (target.side === 'ally') recordDps(target.charId, 'dmgTaken', dmg);

      /* 吸収 */
      if (attacker && attacker.alive && attacker.mods && attacker.mods.lifesteal) {
        applyHeal(attacker, attacker, Math.round(dmg * attacker.mods.lifesteal));
      }

      /* 被弾時効果（反撃・ゲージ・共鳴） */
      if (target.alive && target.side === 'ally' && target.mods) {
        if (target.mods.hitChainGain) addChainGauge(target.mods.hitChainGain);
        if (target.mods.hitCtBoost && Math.random() < 0.35) {
          target.ct = Math.min(999, target.ct + target.mods.hitCtBoost);
        }
        if (target.mods.thornsDefRatio && attacker && attacker.alive && !o.isCounter) {
          const counterRaw = Math.round(getEffectiveDef(target) * target.mods.thornsDefRatio);
          applyDamage(target, attacker, counterRaw, { scope: 'single', noCrit: true, isCounter: true });
        }
      }

      /* 蘇生の光脈チェック（味方が倒れた時） */
      if (killed && target.side === 'ally') {
        const reviver = session.allies.find((a) => a.alive && a.mods && a.mods.autoRevivePct && !a.reviveUsed);
        if (reviver) {
          reviver.reviveUsed = true;
          target.alive = true;
          target.hp = Math.max(1, Math.round(target.maxHp * reviver.mods.autoRevivePct));
          killed = false;
          vfx.spawnRing(target.side, target.slot, '#ffe066');
          vfx.spawnFloatText(target.side, target.slot, '蘇生！', '#ffe066', true);
          addLog('normal', `${reviver.icon}${reviver.name}`, `蘇生の光脈 ▶ ${target.name}`, `HP${target.hp}`, 'log-heal');
        }
      }

      /* 撃破ボーナス（味方） */
      if (killed && attacker && attacker.side === 'ally') {
        if (target.isIntruder) {
          session.intrudersDefeated.push(target.enemyId);
        }
        session.enemiesDefeated += 1;
        if (attacker.mods && attacker.mods.killCtBoost) {
          attacker.ct = Math.min(999, attacker.ct + attacker.mods.killCtBoost);
          applyStatus(attacker, 'atk_up', 2);
        }
        addChainGauge(8);
      }

      const txt = isCrit ? `${dmg}!` : `${dmg}`;
      const col = isWeak ? '#ffe066' : (isCrit ? '#ff9d5c' : (isResist ? '#9bb0d4' : '#ffffff'));
      vfx.spawnFloatText(target.side, target.slot, txt, col, isCrit || isWeak);

      return { dealt: dmg, killed, weak: isWeak, crit: isCrit, resist: isResist };
    }

    function pickTargets(actor, scope) {
      const foes = (actor.side === 'ally' ? session.enemies : session.allies).filter((u) => u.alive);
      const friends = (actor.side === 'ally' ? session.allies : session.enemies).filter((u) => u.alive);
      if (scope === 'self') return [actor];
      if (scope === 'ally_all') return friends;
      if (scope === 'ally_single') {
        const sorted = friends.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        return sorted.length ? [sorted[0]] : [];
      }
      if (scope === 'ally_area') {
        const sorted = friends.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        return sorted.slice(0, 2);
      }
      if (scope === 'all') return foes;

      /* 敵単体・範囲：挑発持ち優先 */
      const taunters = foes.filter((f) => hasStatus(f, 'taunt'));
      const primaryPool = taunters.length ? taunters : foes;
      if (!primaryPool.length) return [];
      const first = Hacha.util.pickRandom(primaryPool);
      if (scope === 'single') return [first];
      const others = foes.filter((f) => f !== first);
      return others.length ? [first, Hacha.util.pickRandom(others)] : [first];
    }

    function chooseSkill(actor) {
      const silenced = hasStatus(actor, 'silence');
      const friends = (actor.side === 'ally' ? session.allies : session.enemies).filter((u) => u.alive);
      const lowestHpRatio = friends.reduce((min, f) => Math.min(min, f.hp / f.maxHp), 1);

      /* 使用可能技リスト（パッシブ除外、沈黙時は技0のみ） */
      if (silenced) return { skill: actor.skills[0], idx: 0 };

      /* 回復技が必要なら優先 */
      for (let i = actor.skills.length - 1; i >= 1; i--) {
        const sk = actor.skills[i];
        if (!sk || sk.scope === 'passive' || actor.cds[i] > 0) continue;
        if (sk.healMult && lowestHpRatio < 0.78) return { skill: sk, idx: i };
      }

      /* クールダウン明けの高位技（奥義→技2→技1）を優先 */
      for (let i = actor.skills.length - 1; i >= 1; i--) {
        const sk = actor.skills[i];
        if (!sk || sk.scope === 'passive' || actor.cds[i] > 0) continue;
        if (sk.healMult && lowestHpRatio >= 0.92) continue;
        return { skill: sk, idx: i };
      }

      return { skill: actor.skills[0], idx: 0 };
    }

    function recordSkillMastery(ally, skillIdx) {
      const prog = Hacha.state && Hacha.state.chars[ally.charId];
      if (!prog) return;
      prog.skillUses[skillIdx] = (prog.skillUses[skillIdx] || 0) + 1;
      const curRank = prog.skillRanks[skillIdx] || 1;
      if (curRank < 10) {
        const need = 10 + curRank * 7;
        if (prog.skillUses[skillIdx] >= need) {
          prog.skillUses[skillIdx] -= need;
          prog.skillRanks[skillIdx] = curRank + 1;
          ally.skillRanks[skillIdx] = curRank + 1;
          const sk = ally.skills[skillIdx];
          session.rankUps.push({ charName: ally.name, skillName: sk ? sk.name : '技', rank: curRank + 1 });
        }
      }
    }

    function executeTurn(actor) {
      const rm = (session.rule && session.rule.mods) || {};
      const elColor = (Hacha.consts.ELEMENT_MAP[actor.element] || {}).color || '#48d6ff';

      /* 1. ターン開始時 継続回復・火傷・毒処理 */
      if (hasStatus(actor, 'regen')) {
        applyHeal(actor, actor, Math.round(actor.maxHp * 0.08));
      }
      const dotMult = 1 + (rm.dotBonus || 0) + (actor.side === 'enemy' ? (session.partySpecs.partyMods.partyDotBonus || 0) : 0);
      if (hasStatus(actor, 'burn') && actor.alive) {
        const d = Math.max(1, Math.round(actor.maxHp * 0.055 * dotMult));
        actor.hp = Math.max(1, actor.hp - d);
        vfx.spawnFloatText(actor.side, actor.slot, `🔥-${d}`, '#ff875c', false);
        addLog('normal', `${actor.icon}${actor.name}`, '火傷の継続ダメージ', `-${d}`, 'log-dmg');
      }
      if (hasStatus(actor, 'poison') && actor.alive) {
        const d = Math.max(1, Math.round(actor.maxHp * 0.06 * dotMult));
        actor.hp = Math.max(1, actor.hp - d);
        vfx.spawnFloatText(actor.side, actor.slot, `☠-${d}`, '#c78cff', false);
        addLog('normal', `${actor.icon}${actor.name}`, '毒の継続ダメージ', `-${d}`, 'log-dmg');
      }

      /* 2. 行動不能（気絶・凍結）チェック */
      if (hasStatus(actor, 'stun') || hasStatus(actor, 'freeze')) {
        const why = hasStatus(actor, 'freeze') ? '凍結で行動不能' : '気絶で行動不能';
        addLog('normal', `${actor.icon}${actor.name}`, why, 'スキップ', 'log-buff');
        tickActorEnd(actor);
        return;
      }

      /* 3. 技の選択＆実行 */
      const { skill, idx } = chooseSkill(actor);
      const targets = pickTargets(actor, skill.scope);
      const rank = actor.skillRanks[idx] || 1;
      const rankMult = 1 + (rank - 1) * 0.065;

      /* CDセット（アビリティ短縮適用） */
      for (let i = 0; i < actor.cds.length; i++) {
        if (actor.cds[i] > 0) actor.cds[i]--;
      }
      if (skill.cd > 0) {
        const cdRed = (idx === 2 && actor.mods && actor.mods.cdReduce) ? actor.mods.cdReduce : 0;
        actor.cds[idx] = Math.max(1, skill.cd - cdRed);
      }

      if (actor.side === 'ally') {
        recordSkillMastery(actor, idx);
      }

      const isAttack = (skill.mult || 0) > 0 && ['single', 'area', 'all'].includes(skill.scope);
      const isHeal = (skill.healMult || 0) > 0;
      const effAtk = getEffectiveAtk(actor);
      const effDef = getEffectiveDef(actor);

      let totalDmg = 0;
      let anyWeak = false;
      let anyCrit = false;
      let totalHeal = 0;

      if (isAttack && targets.length) {
        targets.forEach((t) => {
          let baseRaw = (effAtk * skill.mult + (skill.defScale ? effDef * skill.defScale : 0)) * rankMult;
          if (skill.bonusVsStatus && hasStatus(t, skill.bonusVsStatus)) baseRaw *= 1.38;

          vfx.spawnBeam(actor.side, actor.slot, t.side, t.slot, elColor);
          const res = applyDamage(actor, t, baseRaw, { scope: skill.scope, defPen: skill.defPen || 0 });
          totalDmg += res.dealt;
          if (res.weak) anyWeak = true;
          if (res.crit) anyCrit = true;

          /* 追加追撃アビリティ */
          if (t.alive && actor.mods && actor.mods.extraHitChance && Math.random() < actor.mods.extraHitChance) {
            const extra = applyDamage(actor, t, baseRaw * 0.45, { scope: 'single', noCrit: true });
            totalDmg += extra.dealt;
          }

          /* 状態異常・デバフ付与 */
          const rateBoost = (actor.mods ? (actor.mods.statusRate || 0) : 0) + (actor.resTotals ? (actor.resTotals.statusRate || 0) : 0);
          if (t.alive && skill.status && Math.random() < (skill.status.chance + rateBoost)) {
            applyStatus(t, skill.status.id, skill.status.turns || 2);
          }
          if (t.alive && skill.status2 && Math.random() < (skill.status2.chance + rateBoost)) {
            applyStatus(t, skill.status2.id, skill.status2.turns || 2);
          }
          if (t.alive && actor.mods && actor.mods.hitDefDown && Math.random() < actor.mods.hitDefDown) {
            applyStatus(t, 'def_down', 2);
          }
          if (t.alive && rm.extraBurnChance && Math.random() < rm.extraBurnChance) {
            applyStatus(t, 'burn', 2);
          }
        });

        /* 吸収味方回復（ツクヨミ栞など） */
        if (skill.drainPartyHeal && totalDmg > 0) {
          const friends = (actor.side === 'ally' ? session.allies : session.enemies).filter((u) => u.alive);
          friends.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
          if (friends[0]) applyHeal(actor, friends[0], Math.round(totalDmg * skill.drainPartyHeal));
        }

        Hacha.audio.play(anyCrit ? 'crit' : (anyWeak ? 'weak' : 'hit'));
        const targetLabel = targets.length === 1 ? targets[0].name : `${actor.side === 'ally' ? '敵' : '味方'}${targets.length}体`;
        const tag = anyWeak ? ' 弱点' : (anyCrit ? ' 会心' : '');
        addLog('normal', `${actor.icon}${actor.name}`, `${skill.name} ▶ ${targetLabel}`, `-${Hacha.util.formatNum(totalDmg)}${tag}`, anyWeak ? 'log-weak' : 'log-dmg');
      }

      if (isHeal && targets.length) {
        targets.forEach((t) => {
          const rawH = effAtk * skill.healMult * rankMult;
          totalHeal += applyHeal(actor, t, rawH);
          if (skill.cleanse) cleanseStatuses(t, skill.cleanse);
          if (skill.shieldPct) t.shield += Math.round(t.maxHp * skill.shieldPct);
        });
        if (actor.side === 'ally' && actor.mods && actor.mods.healChainGain) {
          addChainGauge(actor.mods.healChainGain);
        }
        Hacha.audio.play('heal');
        const targetLabel = targets.length === 1 ? targets[0].name : `${actor.side === 'ally' ? '味方' : '相手'}${targets.length}体`;
        addLog('normal', `${actor.icon}${actor.name}`, `${skill.name} ▶ ${targetLabel}`, `+${Hacha.util.formatNum(totalHeal)}`, 'log-heal');
      }

      /* 自己バフ・味方バフ・障壁・行動加速 */
      if (skill.selfBuff) {
        skill.selfBuff.forEach((b) => applyStatus(actor, b.id, b.turns));
        vfx.spawnRing(actor.side, actor.slot, '#48d6ff');
      }
      if (skill.allyBuff) {
        const friends = (actor.side === 'ally' ? session.allies : session.enemies).filter((u) => u.alive);
        const list = (skill.scope === 'ally_single' || skill.scope === 'ally_area') ? targets : friends;
        list.forEach((f) => {
          skill.allyBuff.forEach((b) => applyStatus(f, b.id, b.turns));
          vfx.spawnRing(f.side, f.slot, '#5fd6ff');
        });
      }
      if (skill.shieldPct && !isHeal) {
        const list = skill.scope === 'self' ? [actor] : (actor.side === 'ally' ? session.allies : session.enemies).filter((u) => u.alive);
        list.forEach((f) => {
          f.shield += Math.round(f.maxHp * skill.shieldPct);
          vfx.spawnRing(f.side, f.slot, '#a3ebff');
        });
      }
      if (skill.selfCtAdd) actor.ct = Math.min(999, actor.ct + skill.selfCtAdd);
      if (skill.allyCtAdd) {
        const friends = (actor.side === 'ally' ? session.allies : session.enemies).filter((u) => u.alive);
        friends.forEach((f) => { f.ct = Math.min(999, f.ct + skill.allyCtAdd); });
      }
      if (skill.chainAdd && actor.side === 'ally') addChainGauge(skill.chainAdd);

      if (!isAttack && !isHeal) {
        Hacha.audio.play('buff');
        const tLabel = skill.scope === 'self' ? '自身' : (actor.side === 'ally' ? '味方全体' : '相手全体');
        addLog('normal', `${actor.icon}${actor.name}`, `${skill.name} ▶ ${tLabel}`, '強化展開', 'log-buff');
      }

      /* 味方行動時の追加アビリティ効果＆共鳴ゲージ増加 */
      if (actor.side === 'ally') {
        const baseChain = 10 * (1 + (actor.mods.atkChainBonus || 0));
        addChainGauge(baseChain);

        if (actor.mods.selfRegenPct && actor.alive) {
          applyHeal(actor, actor, Math.round(actor.maxHp * actor.mods.selfRegenPct));
        }
        if (actor.mods.allySpotHealPct) {
          const aliveAllies = session.allies.filter((a) => a.alive).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
          if (aliveAllies[0]) applyHeal(actor, aliveAllies[0], Math.round(aliveAllies[0].maxHp * actor.mods.allySpotHealPct));
        }
        if (actor.mods.turnPartyHeal) {
          session.allies.filter((a) => a.alive).forEach((a) => {
            applyHeal(actor, a, Math.round(a.maxHp * actor.mods.turnPartyHeal));
          });
        }
        if (actor.mods.turnPartyShield) {
          session.allies.filter((a) => a.alive).forEach((a) => {
            a.shield += Math.round(a.maxHp * actor.mods.turnPartyShield);
          });
        }
        if (actor.mods.turnPartyCt) {
          session.allies.filter((a) => a.alive).forEach((a) => {
            a.ct = Math.min(999, a.ct + actor.mods.turnPartyCt);
          });
        }
        if (actor.mods.boostAceCt) {
          const ace = session.allies.filter((a) => a.alive).sort((a, b) => b.atk - a.atk)[0];
          if (ace) ace.ct = Math.min(999, ace.ct + actor.mods.boostAceCt);
        }
        if (actor.mods.turnDebuffAtk && Math.random() < actor.mods.turnDebuffAtk) {
          const foes = session.enemies.filter((e) => e.alive);
          if (foes.length) applyStatus(Hacha.util.pickRandom(foes), 'atk_down', 2);
        }
        if (actor.mods.turnRandomDebuff && Math.random() < actor.mods.turnRandomDebuff) {
          const foes = session.enemies.filter((e) => e.alive);
          if (foes.length) {
            const pick = Hacha.util.pickRandom(['atk_down', 'def_down', 'spd_down', 'vuln']);
            applyStatus(Hacha.util.pickRandom(foes), pick, 2);
          }
        }
        if (actor.mods.turnAllVuln && Math.random() < actor.mods.turnAllVuln) {
          session.enemies.filter((e) => e.alive).forEach((e) => applyStatus(e, 'vuln', 2));
        }
      }

      tickActorEnd(actor);
    }

    function tickActorEnd(actor) {
      for (let i = actor.statuses.length - 1; i >= 0; i--) {
        actor.statuses[i].turns -= 1;
        if (actor.statuses[i].turns <= 0) actor.statuses.splice(i, 1);
      }
    }

    /* はちゃめちゃ共鳴チェイン（単独ターン割り込み・同時攻撃なし） */
    function executeResonanceChain() {
      const aliveAllies = session.allies.filter((a) => a.alive);
      const aliveEnemies = session.enemies.filter((e) => e.alive);
      if (!aliveAllies.length || !aliveEnemies.length) return;

      const resActive = session.partySpecs.resInfo.active;
      const mainRes = resActive.length ? Hacha.util.pickRandom(resActive) : null;
      const chainTitle = mainRes ? mainRes.chainTag : 'はちゃめちゃ一斉連携';
      const rm = (session.rule && session.rule.mods) || {};

      const powerMult = 1 + (session.partySpecs.resInfo.totals.chainPower || 0)
                          + (session.partySpecs.partyMods.chainPowerBonus || 0)
                          + (rm.chainBonus || 0)
                          + (resActive.length * 0.10);

      const sumAtk = aliveAllies.reduce((s, a) => s + getEffectiveAtk(a), 0);
      const perEnemyRaw = (sumAtk * 0.72) * powerMult;
      const lead = aliveAllies[0];

      vfx.spawnChainNova(chainTitle);
      Hacha.audio.play('chain');

      let totalChainDmg = 0;
      aliveEnemies.forEach((e) => {
        const res = applyDamage(lead, e, perEnemyRaw, { scope: 'all', ignoreElement: true, defPen: 0.25 });
        totalChainDmg += res.dealt;
        vfx.spawnBurst(
          (e.slot % 2 === 0 ? 90 : 250),
          (Math.floor(e.slot / 2) === 0 ? 45 : 105),
          '#ffe066', 10
        );
      });

      /* 共鳴チェイン付随の全体小回復＆障壁 */
      const chainShield = session.partySpecs.partyMods.chainPartyShield || 0;
      aliveAllies.forEach((a) => {
        applyHeal(lead, a, Math.round(a.maxHp * 0.10));
        if (chainShield > 0) a.shield += Math.round(a.maxHp * chainShield);
      });

      const refund = Math.min(40, session.partySpecs.partyMods.chainRefund || 0);
      session.chainGauge = refund;
      session.chainBanner = `🌈 共鳴チェイン発動！ ${chainTitle}`;
      session.chainBannerTimer = 1.6;
      addLog('chain', '🌈共鳴チェイン', `${chainTitle} ▶ 敵${aliveEnemies.length}体`, `-${Hacha.util.formatNum(totalChainDmg)}`, 'log-weak');
    }

    function maybeTriggerIntrusion() {
      if (!session) return false;
      const st = session.stage;
      /* 乱入は大陸の通常WAVEのみ発生（厳密0.3%・1WAVEにつき1回のみ抽選） */
      if (st.mode !== 'main') return false;
      if (session.wave >= st.waves) return false;
      if (session.waveIntruded || session.waveIntrusionRolled) return false;
      if (!st.intruderPool || !st.intruderPool.length) return false;

      const occupied = new Set(session.enemies.filter((e) => e.alive).map((e) => e.slot));
      if (occupied.size >= 4) return false;

      session.waveIntrusionRolled = true;
      const prob = typeof st.intruderChance === 'number' ? st.intruderChance : 0.003;
      if (Math.random() >= prob) return false;

      let freeSlot = -1;
      for (let i = 0; i < 4; i++) {
        if (!occupied.has(i)) { freeSlot = i; break; }
      }
      if (freeSlot < 0) return false;

      const intruderId = Hacha.util.pickRandom(st.intruderPool);
      const intruder = createUnitFromEnemyId(intruderId, freeSlot, st, { intruder: true });
      session.enemies = session.enemies.filter((e) => e.slot !== freeSlot);
      session.enemies.push(intruder);
      session.enemies.sort((a, b) => a.slot - b.slot);
      session.waveIntruded = true;
      session.intrusionBanner = `🚨 乱入発生！ ${intruder.icon}${intruder.name} が割り込んだ！`;
      session.intrusionBannerTimer = 2.6;

      vfx.spawnIntrusionWave(intruder.name);
      Hacha.audio.play('intrusion');
      addLog('intrusion', '🚨乱入発生', `${intruder.icon}${intruder.name} が戦場へ乱入！`, `WAVE ${session.wave}`, 'log-dmg');
      return true;
    }

    function spawnWave(waveNum) {
      const st = session.stage;
      session.wave = waveNum;
      session.waveIntruded = false;
      session.waveIntrusionRolled = false;
      session.arenaTeamName = '';
      session.enemies = [];

      const isFinalWave = waveNum >= st.waves;
      if (st.mode === 'arena' && Array.isArray(st.arenaWaves)) {
        const waveCfg = st.arenaWaves[Math.min(st.arenaWaves.length - 1, waveNum - 1)];
        const ids = (waveCfg && waveCfg.charIds) || ['c_fire_tank', 'c_water_dealer', 'c_wind_supporter', 'c_light_healer'];
        session.arenaTeamName = (waveCfg && waveCfg.teamName) || `第${waveNum}試合チーム`;
        ids.slice(0, 4).forEach((cid, idx) => {
          session.enemies.push(createUnitFromArenaCharId(cid, idx, st, isFinalWave && idx === 0));
        });
      } else if (isFinalWave) {
        const boss = createUnitFromEnemyId(st.bossId, 0, st, { boss: true, elite: !!st.bossIsElite });
        session.enemies.push(boss);
        if (st.mode !== 'raid' && st.normalPool && st.normalPool.length) {
          const escortCount = Hacha.util.randInt(1, 2);
          for (let i = 1; i <= escortCount; i++) {
            const eid = Hacha.util.pickRandom(st.normalPool);
            session.enemies.push(createUnitFromEnemyId(eid, i, st, {}));
          }
        }
      } else {
        /* 通常WAVEは1〜4体ランダム出現 */
        const count = Hacha.util.randInt(1, 4);
        for (let i = 0; i < count; i++) {
          const eid = Hacha.util.pickRandom(st.normalPool);
          session.enemies.push(createUnitFromEnemyId(eid, i, st, {}));
        }
      }

      /* WAVE開始時の味方アビリティ＆世界法則効果 */
      const rm = (session.rule && session.rule.mods) || {};
      session.allies.filter((a) => a.alive).forEach((a) => {
        if (a.mods.waveStartCt && waveNum > 1) a.ct = Math.min(999, a.ct + a.mods.waveStartCt);
        if (a.mods.waveShieldPct) a.shield += Math.round(a.maxHp * a.mods.waveShieldPct);
        if (a.mods.startTaunt) applyStatus(a, 'taunt', a.mods.startTaunt);
        if (rm.startShieldRatio) a.shield += Math.round(a.maxHp * rm.startShieldRatio);
        if (a.mods.partyWaveShield) {
          session.allies.filter((al) => al.alive).forEach((al) => {
            al.shield += Math.round(al.maxHp * a.mods.partyWaveShield);
          });
        }
        if (a.mods.wavePartyAtkUp) {
          session.allies.filter((al) => al.alive).forEach((al) => applyStatus(al, 'atk_up', a.mods.wavePartyAtkUp));
        }
        if (a.mods.wavePartyHeal && waveNum > 1) {
          session.allies.filter((al) => al.alive).forEach((al) => {
            applyHeal(a, al, Math.round(al.maxHp * a.mods.wavePartyHeal));
          });
        }
        if (a.mods.waveEnemyDefDown) {
          session.enemies.forEach((e) => applyStatus(e, 'def_down', a.mods.waveEnemyDefDown));
        }
      });

      if (st.mode === 'arena') {
        const roundLabel = waveNum === 1 ? '1回戦' : (waveNum === st.waves ? '決勝戦' : `第${waveNum}試合`);
        addLog('wave', `🏟️${roundLabel}`, `${session.arenaTeamName}（4体）が出場！`, st.shortName, 'log-buff');
      } else {
        addLog('wave', `WAVE ${waveNum}/${st.waves}`, isFinalWave ? '強敵部隊が出現！' : `敵${session.enemies.length}体が出現`, st.shortName, 'log-buff');
      }

      if (!isFinalWave && st.mode === 'main') {
        maybeTriggerIntrusion();
      }
    }

    /* 行動順予測（現在行動中＋先読み6手：同時攻撃が起きないことを可視化） */
    function predictTurnOrder(count) {
      if (!session) return [];
      const living = session.allies.concat(session.enemies).filter((u) => u.alive);
      if (!living.length) return [];

      const sim = living.map((u) => ({
        u,
        ct: u.ct,
        spd: getEffectiveSpd(u)
      }));

      const out = [];
      if (session.activeActorKey) {
        const actU = living.find((u) => u.key === session.activeActorKey);
        if (actU) out.push({ unit: actU, acting: true });
      }

      while (out.length < (count || 6)) {
        let bestIdx = 0;
        let bestTime = Infinity;
        for (let i = 0; i < sim.length; i++) {
          const rem = Math.max(0, 1000 - sim[i].ct);
          const t = rem / sim[i].spd;
          if (t < bestTime - 0.0001 || (Math.abs(t - bestTime) <= 0.0001 && sim[i].u.side === 'ally' && sim[bestIdx].u.side !== 'ally')) {
            bestTime = t;
            bestIdx = i;
          }
        }
        for (let i = 0; i < sim.length; i++) {
          sim[i].ct += sim[i].spd * bestTime;
        }
        const winner = sim[bestIdx];
        winner.ct = Math.max(0, winner.ct - 1000);
        out.push({ unit: winner.u, acting: false });
      }
      return out.slice(0, count || 6);
    }

    function finalizeSingleBattle(won, retreated) {
      const state = Hacha.state;
      const st = session.stage;
      state.progress.totalBattles += 1;

      const result = {
        won: !!won,
        retreated: !!retreated,
        stage: st,
        elapsedSec: session.elapsedSec,
        enemiesDefeated: session.enemiesDefeated,
        intruderCount: session.intrudersDefeated.length,
        coins: 0,
        crystals: { tank: 0, dealer: 0, supporter: 0, healer: 0 },
        scrolls: 0,
        fragments: 0,
        keptDrops: [],
        autoSoldCount: 0,
        autoSoldCoins: 0,
        rankUps: session.rankUps.slice(),
        dispatchReports: [],
        newScouts: [],
        dpsSnapshot: Object.keys(session.dpsMap).map((k) => Object.assign({}, session.dpsMap[k])),
        dpsElapsedSec: session.dpsElapsedSec
      };

      if (won) {
        state.progress.totalWins += 1;
        state.progress.intruderKills += session.intrudersDefeated.length;
        session.intrudersDefeated.forEach((eid) => {
          state.progress.intruderKillMap[eid] = (state.progress.intruderKillMap[eid] || 0) + 1;
        });

        /* 進行記録更新 */
        if (st.mode === 'main') {
          state.progress.clearedStages[st.id] = (state.progress.clearedStages[st.id] || 0) + 1;
        } else if (st.mode === 'tower') {
          if (st.floor > (state.progress.bestTowerFloor || 0)) state.progress.bestTowerFloor = st.floor;
          if (st.floor >= state.progress.towerFloor) state.progress.towerFloor = st.floor + 1;
        } else if (st.mode === 'raid') {
          state.progress.bossCleared[st.id] = (state.progress.bossCleared[st.id] || 0) + 1;
        } else if (st.mode === 'trial') {
          state.progress.trialCleared[st.id] = (state.progress.trialCleared[st.id] || 0) + 1;
        } else if (st.mode === 'arena') {
          state.progress.arenaCleared[st.id] = (state.progress.arenaCleared[st.id] || 0) + 1;
        }

        /* 報酬計算（0.3%激レア乱入撃破時は豪華ボーナス加算） */
        const intBonus = session.intrudersDefeated.length;
        result.coins = st.coins + intBonus * 450;
        result.scrolls = st.scrolls + intBonus * 3;
        result.fragments = st.fragments + intBonus * 3;

        state.resources.coins += result.coins;
        state.resources.scrolls += result.scrolls;
        state.resources.fragments += result.fragments;

        const roles = ['tank', 'dealer', 'supporter', 'healer'];
        const totalCrys = st.crystals + intBonus * 4;
        for (let i = 0; i < totalCrys; i++) {
          const r = Hacha.util.pickRandom(roles);
          state.resources.crystals[r] += 1;
          result.crystals[r] += 1;
        }

        /* 装備ドロップ＆自動売却 */
        if (Math.random() < (st.dropChance || 0.7)) {
          const d1 = Hacha.engine.stats.rollEquipmentDrop(state, st.dropPool, st.minQuality, 0);
          if (d1) {
            if (d1.autoSold) { result.autoSoldCount++; result.autoSoldCoins += d1.sellCoins; }
            else result.keptDrops.push(d1);
          }
        }
        /* 0.3%乱入敵からの超高品質レア装備ドロップ */
        for (let i = 0; i < intBonus; i++) {
          const intPool = ['eq_w_12', 'eq_a_12', 'eq_c_12', 'eq_w_14', 'eq_a_14', 'eq_c_14'].concat(st.dropPool || []);
          const dInt = Hacha.engine.stats.rollEquipmentDrop(state, intPool, Math.min(95, (st.minQuality || 50) + 22), 0.10);
          if (dInt) {
            if (dInt.autoSold) { result.autoSoldCount++; result.autoSoldCoins += dInt.sellCoins; }
            else result.keptDrops.push(dInt);
          }
        }

        /* 戦闘回数連動の異界派遣を進行 */
        result.dispatchReports = Hacha.engine.dispatch.advanceDispatchesOnVictory(state);
        result.dispatchReports.forEach((rep) => {
          if (rep.dropResult) {
            if (rep.dropResult.autoSold) {
              result.autoSoldCount++;
              result.autoSoldCoins += rep.dropResult.sellCoins;
            } else {
              result.keptDrops.push(rep.dropResult);
            }
          }
        });

        /* 新規キャラ加入（スカウト条件）チェック */
        result.newScouts = Hacha.engine.dispatch.checkScoutUnlocks(state);
      }

      /* 極品質取得音 */
      if (result.keptDrops.some((d) => d.item && d.item.quality >= 100)) {
        Hacha.audio.play('perfect');
      } else {
        Hacha.audio.play(won ? 'win' : 'lose');
      }

      Hacha.storage.saveState(true);

      /* 周回セッション集計（自動周回中） */
      if (loop && loop.active) {
        loop.runs += 1;
        if (won) loop.wins += 1; else loop.losses += 1;
        loop.intruderKills += result.intruderCount;
        loop.totalCoins += result.coins;
        loop.totalScrolls += result.scrolls;
        loop.totalFragments += result.fragments;
        Object.keys(result.crystals).forEach((k) => { loop.totalCrystals[k] += result.crystals[k]; });
        loop.autoSoldCount += result.autoSoldCount;
        loop.autoSoldCoins += result.autoSoldCoins;
        result.keptDrops.forEach((d) => loop.keptDrops.push(d));
        result.dispatchReports.forEach((r) => loop.dispatchReports.push(r));
        result.newScouts.forEach((s) => loop.newScouts.push(s));
        result.rankUps.forEach((ru) => loop.rankUps.push(ru));

        /* 続行条件：勝利 かつ 終了予約なし かつ 撤退なし */
        if (won && !retreated && !loop.stopRequested) {
          session.phase = 'loop_intermission';
          session.phaseTimer = 0.72;
          if (cb.onLoopIntermission) cb.onLoopIntermission(loop, result);
          return;
        }

        /* 周回終了（進行中戦闘が完了したタイミングで周回専用リザルトへ！） */
        const summary = Object.assign({}, loop, {
          totalElapsedSec: (Date.now() - loop.startTime) / 1000,
          dpsSnapshot: Object.keys(session.dpsMap).map((k) => Object.assign({}, session.dpsMap[k])),
          dpsElapsedSec: session.dpsElapsedSec,
          stoppedByDefeat: !won,
          retreated: !!retreated
        });
        stopEngineLoop();
        if (cb.onFinish) cb.onFinish({ isLoopResult: true, loopSummary: summary, lastResult: result });
        return;
      }

      /* 通常リザルトへ */
      stopEngineLoop();
      if (cb.onFinish) cb.onFinish({ isLoopResult: false, result });
    }

    function stopEngineLoop() {
      running = false;
      paused = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function setPaused(flag) {
      paused = !!flag;
      lastTs = performance.now();
    }

    function startSingleRun(stage, keepLoopState) {
      const state = Hacha.state;
      const partySpecs = Hacha.engine.stats.buildBattlePartySpecs(state, stage);
      const allies = partySpecs.units.map((spec, idx) => createUnitFromAllySpec(spec, idx));

      const reuseDps = keepLoopState && session && session.dpsMap;
      const dpsMap = reuseDps ? session.dpsMap : createEmptyDpsMap(partySpecs);
      const dpsElapsedSec = reuseDps ? session.dpsElapsedSec : 0;

      session = {
        stage,
        rule: partySpecs.rule,
        partySpecs,
        allies,
        enemies: [],
        wave: 1,
        waveIntruded: false,
        waveIntrusionRolled: false,
        arenaTeamName: '',
        chainGauge: 0,
        displayChainGauge: 0,
        phase: 'charging',
        phaseTimer: 0,
        activeActorKey: null,
        logs: [],
        logSeq: 0,
        elapsedSec: 0,
        dpsMap,
        dpsElapsedSec,
        enemiesDefeated: 0,
        intrudersDefeated: [],
        rankUps: [],
        intrusionBanner: '',
        intrusionBannerTimer: 0,
        chainBanner: '',
        chainBannerTimer: 0
      };

      vfx.clear();
      spawnWave(1);
      if (cb.onStateSync) cb.onStateSync(getSnapshot());
    }

    function startBattle(stage, enableLoop) {
      stopEngineLoop();
      const isLoop = !!enableLoop;
      loop = isLoop ? {
        active: true,
        stopRequested: false,
        stage,
        runs: 0,
        wins: 0,
        losses: 0,
        startTime: Date.now(),
        intruderKills: 0,
        totalCoins: 0,
        totalCrystals: { tank: 0, dealer: 0, supporter: 0, healer: 0 },
        totalScrolls: 0,
        totalFragments: 0,
        keptDrops: [],
        autoSoldCount: 0,
        autoSoldCoins: 0,
        dispatchReports: [],
        newScouts: [],
        rankUps: []
      } : null;

      startSingleRun(stage, false);
      running = true;
      lastTs = performance.now();
      rafId = requestAnimationFrame(tick);
    }

    function enableLoopMidBattle() {
      if (!session) return;
      if (loop && loop.active) {
        loop.stopRequested = false;
        return;
      }
      loop = {
        active: true,
        stopRequested: false,
        stage: session.stage,
        runs: 0,
        wins: 0,
        losses: 0,
        startTime: Date.now(),
        intruderKills: 0,
        totalCoins: 0,
        totalCrystals: { tank: 0, dealer: 0, supporter: 0, healer: 0 },
        totalScrolls: 0,
        totalFragments: 0,
        keptDrops: [],
        autoSoldCount: 0,
        autoSoldCoins: 0,
        dispatchReports: [],
        newScouts: [],
        rankUps: []
      };
    }

    /* 周回セッションを現在完了済み戦果で綺麗に確定するヘルパー */
    function finishLoopNow(retreated) {
      if (!loop || !loop.active || !session) return;
      const summary = Object.assign({}, loop, {
        totalElapsedSec: (Date.now() - loop.startTime) / 1000,
        dpsSnapshot: Object.keys(session.dpsMap).map((k) => Object.assign({}, session.dpsMap[k])),
        dpsElapsedSec: session.dpsElapsedSec,
        stoppedByDefeat: false,
        retreated: !!retreated
      });
      stopEngineLoop();
      if (cb.onFinish) cb.onFinish({ isLoopResult: true, loopSummary: summary, lastResult: null });
    }

    /* 周回終了予約：進行中の戦闘が完了してからリザルトへ遷移（待機中なら即リザルト確定） */
    function requestStopLoop() {
      if (loop && loop.active) {
        loop.stopRequested = true;
        if (session && session.phase === 'loop_intermission') {
          finishLoopNow(false);
        }
      }
    }

    function retreat() {
      if (!session || !running) return;
      /* 周回インターミッション中の撤退は直前勝利分をそのまま周回リザルトへ綺麗に確定 */
      if (session.phase === 'loop_intermission' && loop && loop.active) {
        finishLoopNow(true);
        return;
      }
      finalizeSingleBattle(false, true);
    }

    function stepSmoothGauges(rawDt) {
      const hpRate = Math.min(1, rawDt * 14);
      const trailRate = Math.min(1, rawDt * 3.8);
      const shRate = Math.min(1, rawDt * 12);
      const chRate = Math.min(1, rawDt * 10);

      session.allies.concat(session.enemies).forEach((u) => {
        if (u.hitFlash > 0) u.hitFlash = Math.max(0, u.hitFlash - rawDt);

        const dh = u.hp - u.displayHp;
        u.displayHp = Math.abs(dh) < 0.6 ? u.hp : (u.displayHp + dh * hpRate);

        if (u.hp >= u.trailHp) {
          u.trailHp = u.hp;
        } else {
          const dtHp = u.hp - u.trailHp;
          u.trailHp = Math.abs(dtHp) < 0.6 ? u.hp : (u.trailHp + dtHp * trailRate);
        }

        const ds = u.shield - u.displayShield;
        u.displayShield = Math.abs(ds) < 0.6 ? u.shield : (u.displayShield + ds * shRate);
      });

      const dc = session.chainGauge - session.displayChainGauge;
      session.displayChainGauge = Math.abs(dc) < 0.12 ? session.chainGauge : (session.displayChainGauge + dc * chRate);
    }

    function advanceCtGauges(dt, excludeKey) {
      const living = session.allies.concat(session.enemies).filter((u) => u.alive);
      living.forEach((u) => {
        if (excludeKey && u.key === excludeKey) return;
        u.ct = Math.min(1200, u.ct + getEffectiveSpd(u) * dt * 2.55);
      });
    }

    function tick(now) {
      if (!running || !session) return;
      if (paused) {
        lastTs = now;
        rafId = requestAnimationFrame(tick);
        return;
      }
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const sp = getSpeedMult();
      const dt = rawDt * sp;

      session.elapsedSec += rawDt;
      session.dpsElapsedSec += rawDt;

      if (session.intrusionBannerTimer > 0) {
        session.intrusionBannerTimer -= rawDt;
        if (session.intrusionBannerTimer <= 0) session.intrusionBanner = '';
      }
      if (session.chainBannerTimer > 0) {
        session.chainBannerTimer -= rawDt;
        if (session.chainBannerTimer <= 0) session.chainBanner = '';
      }

      /* HPバー・ダメージ残像・シールド・共鳴ゲージを毎フレームぬるぬる補間 */
      stepSmoothGauges(rawDt);

      if (session.phase === 'loop_intermission') {
        if (loop && loop.stopRequested) {
          finishLoopNow(false);
          return;
        }
        session.phaseTimer -= rawDt;
        if (session.phaseTimer <= 0) {
          /* 異界塔自動周回時は次階層へ進む */
          const nextStage = session.stage.mode === 'tower'
            ? Hacha.data.buildTowerStage(Hacha.state.progress.towerFloor)
            : session.stage;
          if (loop) loop.stage = nextStage;
          startSingleRun(nextStage, true);
        }
      } else if (session.phase === 'acting' || session.phase === 'chain') {
        /* 攻撃・共鳴演出中も他ユニットのCTゲージが途切れず進行（同時攻撃は厳格に防止） */
        advanceCtGauges(dt, session.activeActorKey);
        session.phaseTimer -= rawDt;
        if (session.phaseTimer <= 0) {
          session.activeActorKey = null;
          const aliveAllies = session.allies.filter((a) => a.alive);
          const aliveEnemies = session.enemies.filter((e) => e.alive);

          if (!aliveAllies.length) {
            finalizeSingleBattle(false, false);
            if (!running) return;
          } else if (!aliveEnemies.length) {
            if (session.wave < session.stage.waves) {
              spawnWave(session.wave + 1);
              session.phase = 'charging';
            } else {
              finalizeSingleBattle(true, false);
              if (!running) return;
            }
          } else {
            /* 大陸のみ：敵が1体以上減って空きスロットができたら未抽選WAVEで0.3%判定 */
            if (session.stage.mode === 'main') {
              maybeTriggerIntrusion();
            }
            session.phase = 'charging';
          }
        }
      } else if (session.phase === 'charging') {
        /* 共鳴チェイン100%到達：単独割り込み発動 */
        const aliveAllies = session.allies.filter((a) => a.alive);
        const aliveEnemies = session.enemies.filter((e) => e.alive);
        if (session.chainGauge >= 100 && aliveAllies.length && aliveEnemies.length) {
          session.phase = 'chain';
          session.phaseTimer = 0.76 / sp;
          executeResonanceChain();
        } else {
          /* 全生存ユニットのCTゲージを滑らかに進行 */
          advanceCtGauges(dt, null);

          /* 1000以上になった中から厳密に1体だけ選出して行動（同時攻撃は絶対に起きない） */
          const ready = aliveAllies.concat(aliveEnemies).filter((u) => u.ct >= 1000);
          if (ready.length) {
            ready.sort((a, b) => {
              if (b.ct !== a.ct) return b.ct - a.ct;
              if (b.spd !== a.spd) return b.spd - a.spd;
              return a.side === 'ally' ? -1 : 1;
            });
            const actor = ready[0];
            actor.ct = Math.max(0, actor.ct - 1000);
            session.activeActorKey = actor.key;
            session.phase = 'acting';
            session.phaseTimer = 0.62 / sp;
            executeTurn(actor);
          }
        }
      }

      vfx.step(rawDt);
      if (cb.onFrame) cb.onFrame(getSnapshot());
      rafId = requestAnimationFrame(tick);
    }

    function getSnapshot() {
      if (!session) return null;
      return {
        stage: session.stage,
        rule: session.rule,
        resonances: session.partySpecs.resInfo.active,
        allies: session.allies,
        enemies: session.enemies,
        wave: session.wave,
        arenaTeamName: session.arenaTeamName || '',
        chainGauge: session.chainGauge,
        displayChainGauge: session.displayChainGauge,
        activeActorKey: session.activeActorKey,
        turnOrder: predictTurnOrder(4),
        logs: session.logs,
        dpsMap: session.dpsMap,
        dpsElapsedSec: session.dpsElapsedSec,
        phase: session.phase,
        intrusionBanner: session.intrusionBanner,
        chainBanner: session.chainBanner,
        loop: loop ? Object.assign({}, loop) : null,
        running
      };
    }

    return {
      vfx,
      startBattle,
      enableLoopMidBattle,
      requestStopLoop,
      retreat,
      setPaused,
      stopEngineLoop,
      getSnapshot,
      isRunning: () => running
    };
  }

  Hacha.engine.createBattleController = createBattleController;
})();
