(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};

  const GAUGE_MAX = 100;
  const GAUGE_RATE = 0.45;
  const SUB_TICK_MS = 100;
  const MAX_ACTIONS_PER_STEP = 20;
  const MAX_TOTAL_TURNS = 500;
  const MAX_EVENTS = 120;
  const MAX_LOGS = 60;

  const VALID_POLICIES = new Set(['aggressive', 'balanced', 'defensive', 'conserve']);
  const VALID_TARGETS = new Set(['lowest_hp', 'boss_first', 'fastest_enemy', 'debuffed_first']);
  const VALID_PRIORITIES = new Set(['unique_first', 'collect_first', 'auto']);

  let activeBattle = null;

  function hasOwn(obj, key) {
    return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function clamp(v, min, max) {
    if (!Number.isFinite(v)) {
      return min;
    }
    return Math.min(max, Math.max(min, v));
  }

  function safeNum(v, fallback) {
    return (typeof v === 'number' && Number.isFinite(v)) ? v : fallback;
  }

  function createRng(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) {
      let state = (seed >>> 0) || 1;
      return function mulberry32() {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    return function mathRandom() {
      return Math.random();
    };
  }

  function resolveBattleArg(maybeBattle, arg2) {
    if (maybeBattle && typeof maybeBattle === 'object' && Array.isArray(maybeBattle.allies)) {
      return { battle: maybeBattle, hasBattleArg: true, rest: arg2 };
    }
    return { battle: activeBattle, hasBattleArg: false, rest: maybeBattle };
  }

  function computeResonanceBonuses(state) {
    const MasterData = IkaiApp.MasterData;
    const total = {
      hpPct: 0,
      atkPct: 0,
      defPct: 0,
      spd: 0,
      crit: 0,
      critDmg: 0,
      dmgDealtPct: 0,
      healPowerPct: 0
    };
    if (!state || !Array.isArray(state.resonanceSlots)) {
      return total;
    }
    for (let i = 0; i < state.resonanceSlots.length; i += 1) {
      const cid = state.resonanceSlots[i];
      if (!cid || !hasOwn(MasterData.CHARACTER_MAP, cid)) {
        continue;
      }
      const ch = MasterData.CHARACTER_MAP[cid];
      if (ch && ch.resonance && ch.resonance.bonus) {
        const b = ch.resonance.bonus;
        if (hasOwn(total, b.stat)) {
          total[b.stat] += safeNum(b.value, 0);
        }
      }
    }
    return total;
  }

  function computePartyAuras(state, partyIds) {
    const MasterData = IkaiApp.MasterData;
    const auras = {
      allyDmgDealtPct: 0,
      allySpd: 0
    };
    if (!state || !state.roster) {
      return auras;
    }

    const equipByUid = {};
    if (Array.isArray(state.equips)) {
      for (let i = 0; i < state.equips.length; i += 1) {
        const eq = state.equips[i];
        if (eq && eq.uid) {
          equipByUid[eq.uid] = eq;
        }
      }
    }

    for (let i = 0; i < partyIds.length; i += 1) {
      const cid = partyIds[i];
      const entry = hasOwn(state.roster, cid) ? state.roster[cid] : null;
      const charDef = hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid] : null;
      if (!entry || !charDef) {
        continue;
      }
      const awakeningIdx = clamp(Math.floor(safeNum(entry.awakening, 0)), 0, MasterData.AWAKENING_TIERS.length - 1);
      const tier = MasterData.AWAKENING_TIERS[awakeningIdx];
      const unlockedSlots = (tier && tier.unlockedSlots) ? tier.unlockedSlots : MasterData.EQUIP_SLOTS;
      const setCounts = {};
      if (entry.equipped && typeof entry.equipped === 'object') {
        for (let s = 0; s < unlockedSlots.length; s += 1) {
          const uid = entry.equipped[unlockedSlots[s]];
          const eqInst = uid && hasOwn(equipByUid, uid) ? equipByUid[uid] : null;
          const eqDef = eqInst && hasOwn(MasterData.EQUIP_MAP, eqInst.equipId)
            ? MasterData.EQUIP_MAP[eqInst.equipId]
            : null;
          if (eqDef && eqDef.setId) {
            setCounts[eqDef.setId] = (setCounts[eqDef.setId] || 0) + 1;
          }
        }
      }
      const setIds = Object.keys(setCounts);
      for (let k = 0; k < setIds.length; k += 1) {
        const sid = setIds[k];
        const setDef = hasOwn(MasterData.SET_MAP, sid) ? MasterData.SET_MAP[sid] : null;
        if (setDef && setCounts[sid] >= 4 && setDef.fourSetBonus && setDef.fourSetBonus.allyDmgDealtPct) {
          auras.allyDmgDealtPct += setDef.fourSetBonus.allyDmgDealtPct;
        }
      }

      if (Array.isArray(entry.emblemNodes) && entry.emblemNodes.indexOf(12) >= 0) {
        const node12 = MasterData.EMBLEM_NODES[11];
        const roleSpec = node12 && node12.roleSpecialByRole && node12.roleSpecialByRole[charDef.role];
        if (roleSpec && roleSpec.bonus && roleSpec.bonus.allySpd) {
          auras.allySpd += roleSpec.bonus.allySpd;
        }
      }
    }
    return auras;
  }

  function buildAllyUnit(cid, slot, state, resBonus, partyAuras) {
    const MasterData = IkaiApp.MasterData;
    const charDef = MasterData.CHARACTER_MAP[cid];
    const entry = (state && state.roster && hasOwn(state.roster, cid))
      ? state.roster[cid]
      : {
          awakening: 0,
          emblemNodes: [],
          equipped: {},
          skills: [null, null],
          tactic: { policy: 'balanced', target: 'lowest_hp', skillPriority: 'unique_first' }
        };

    const awakeningIdx = clamp(Math.floor(safeNum(entry.awakening, 0)), 0, MasterData.AWAKENING_TIERS.length - 1);
    const tier = MasterData.AWAKENING_TIERS[awakeningIdx];

    let flatHp = 0;
    let flatAtk = 0;
    let flatDef = 0;
    let flatSpd = 0;
    let flatCrit = 0;
    let critDmg = safeNum(charDef.baseStats.critDmg, 150);

    let hpPct = resBonus.hpPct;
    let atkPct = resBonus.atkPct;
    let defPct = resBonus.defPct;
    let dmgDealtPct = resBonus.dmgDealtPct + partyAuras.allyDmgDealtPct;
    let dmgTakenDownPct = 0;
    let healPowerPct = resBonus.healPowerPct;
    let initGaugePct = 0;
    let uniqueSkillDmgPct = 0;
    let singleTargetDmgPct = 0;
    let onHitAllyShieldPct = 0;
    let onHealAllyAtkPct = 0;
    let setOnHealAtkUpPct = 0;
    let setOnHealAtkDuration = 2;

    flatSpd += resBonus.spd + partyAuras.allySpd;
    flatCrit += resBonus.crit;
    critDmg += resBonus.critDmg;

    // Equips + Sets
    const equipByUid = {};
    if (state && Array.isArray(state.equips)) {
      for (let i = 0; i < state.equips.length; i += 1) {
        const eq = state.equips[i];
        if (eq && eq.uid) {
          equipByUid[eq.uid] = eq;
        }
      }
    }

    const setCounts = {};
    if (entry.equipped && typeof entry.equipped === 'object') {
      const unlockedSlots = tier.unlockedSlots || MasterData.EQUIP_SLOTS;
      for (let s = 0; s < unlockedSlots.length; s += 1) {
        const slotName = unlockedSlots[s];
        const uid = entry.equipped[slotName];
        const eqInst = uid && hasOwn(equipByUid, uid) ? equipByUid[uid] : null;
        const eqDef = eqInst && hasOwn(MasterData.EQUIP_MAP, eqInst.equipId)
          ? MasterData.EQUIP_MAP[eqInst.equipId]
          : null;
        if (!eqDef) {
          continue;
        }
        const qIdx = clamp(Math.floor(safeNum(eqInst.qualityIdx, 0)), 0, MasterData.QUALITY_RANKS.length - 1);
        const qMult = MasterData.QUALITY_RANKS[qIdx].multiplier;
        const bs = eqDef.baseStats || {};
        flatHp += Math.round(safeNum(bs.hp, 0) * qMult);
        flatAtk += Math.round(safeNum(bs.atk, 0) * qMult);
        flatDef += Math.round(safeNum(bs.def, 0) * qMult);
        flatSpd += Math.round(safeNum(bs.spd, 0) * qMult);
        flatCrit += Math.round(safeNum(bs.crit, 0) * qMult);
        if (eqDef.setId) {
          setCounts[eqDef.setId] = (setCounts[eqDef.setId] || 0) + 1;
        }
      }
    }

    const applyBonusObj = function (b) {
      if (!b) return;
      if (b.hp) flatHp += b.hp;
      if (b.atk) flatAtk += b.atk;
      if (b.def) flatDef += b.def;
      if (b.spd) flatSpd += b.spd;
      if (b.crit) flatCrit += b.crit;
      if (b.critDmg) critDmg += b.critDmg;
      if (b.hpPct) hpPct += b.hpPct;
      if (b.atkPct) atkPct += b.atkPct;
      if (b.defPct) defPct += b.defPct;
      if (b.dmgDealtPct) dmgDealtPct += b.dmgDealtPct;
      if (b.dmgTakenDownPct) dmgTakenDownPct += b.dmgTakenDownPct;
      if (b.healPowerPct) healPowerPct += b.healPowerPct;
      if (b.initGaugePct) initGaugePct += b.initGaugePct;
      if (b.uniqueSkillDmgPct) uniqueSkillDmgPct += b.uniqueSkillDmgPct;
      if (b.singleTargetDmgPct) singleTargetDmgPct += b.singleTargetDmgPct;
      if (b.onHitAllyShieldPct) onHitAllyShieldPct += b.onHitAllyShieldPct;
      if (b.onHealAllyAtkPct) onHealAllyAtkPct += b.onHealAllyAtkPct;
      if (b.onHealAtkUpPct) {
        setOnHealAtkUpPct += b.onHealAtkUpPct;
        if (b.duration) setOnHealAtkDuration = b.duration;
      }
    };

    const setKeys = Object.keys(setCounts);
    for (let i = 0; i < setKeys.length; i += 1) {
      const sid = setKeys[i];
      const setDef = hasOwn(MasterData.SET_MAP, sid) ? MasterData.SET_MAP[sid] : null;
      if (!setDef) continue;
      if (setCounts[sid] >= 2) {
        applyBonusObj(setDef.twoSetBonus);
      }
      if (setCounts[sid] >= 4) {
        applyBonusObj(setDef.fourSetBonus);
      }
    }

    // Emblem nodes
    if (Array.isArray(entry.emblemNodes)) {
      for (let i = 0; i < entry.emblemNodes.length; i += 1) {
        const nid = entry.emblemNodes[i];
        const nodeDef = MasterData.EMBLEM_NODES.find(function (n) { return n.id === nid; });
        if (!nodeDef) continue;
        applyBonusObj(nodeDef.bonus);
        if (nodeDef.id === 12 && nodeDef.roleSpecialByRole && nodeDef.roleSpecialByRole[charDef.role]) {
          applyBonusObj(nodeDef.roleSpecialByRole[charDef.role].bonus);
        }
      }
    }

    // Passive trait bonuses
    const trait = charDef.trait;
    const traitMult = tier.traitMultiplier;
    let hasEndureOnce = false;
    if (trait && trait.trigger === 'passive' && Array.isArray(trait.effects)) {
      for (let i = 0; i < trait.effects.length; i += 1) {
        if (trait.effects[i].type === 'selfHpPct') {
          hpPct += safeNum(trait.effects[i].value, 0) * traitMult;
        }
      }
    }
    if (trait && trait.trigger === 'onLethal' && Array.isArray(trait.effects)) {
      for (let i = 0; i < trait.effects.length; i += 1) {
        if (trait.effects[i].type === 'endureOnce') {
          hasEndureOnce = true;
        }
      }
    }

    const baseHp = Math.round(charDef.baseStats.hp * tier.statMultiplier) + flatHp;
    const baseAtk = Math.round(charDef.baseStats.atk * tier.statMultiplier) + flatAtk;
    const baseDef = Math.round(charDef.baseStats.def * tier.statMultiplier) + flatDef;
    const maxHp = Math.max(1, Math.round(baseHp * (1 + hpPct / 100)));
    const atk = Math.max(1, Math.round(baseAtk * (1 + atkPct / 100)));
    const def = Math.max(0, Math.round(baseDef * (1 + defPct / 100)));
    const spd = Math.max(20, Math.round(charDef.baseStats.spd + flatSpd));
    const crit = clamp(charDef.baseStats.crit + flatCrit, 0, 100);

    // Skills (unique + equipped collectible skills with mastery rank)
    const uniqueDef = charDef.uniqueSkill;
    const uniqueSkill = {
      id: uniqueDef.id,
      name: uniqueDef.name,
      kind: 'unique',
      targetType: uniqueDef.targetType,
      side: uniqueDef.side,
      cooldown: Math.max(1, safeNum(uniqueDef.cooldown, 3)),
      currentCd: 0,
      scale: 1 + uniqueSkillDmgPct / 100,
      effects: uniqueDef.effects
    };

    const collectSkills = [];
    const skillInv = (state && state.skillInventory) ? state.skillInventory : {};
    const equippedSkills = Array.isArray(entry.skills) ? entry.skills : [];
    const maxSlots = tier.skillSlots || 1;
    for (let s = 0; s < Math.min(maxSlots, equippedSkills.length); s += 1) {
      const skId = equippedSkills[s];
      if (!skId || !hasOwn(MasterData.SKILL_MAP, skId)) {
        continue;
      }
      const skDef = MasterData.SKILL_MAP[skId];
      const invEntry = hasOwn(skillInv, skId) ? skillInv[skId] : null;
      const rawRank = invEntry ? safeNum(invEntry.rank, 1) : 1;
      const rankIdx = clamp(Math.floor(rawRank), 1, Math.min(tier.maxMasteryRank || 3, MasterData.SKILL_MASTERY_RANKS.length)) - 1;
      const rankInfo = MasterData.SKILL_MASTERY_RANKS[rankIdx];
      collectSkills.push({
        id: skDef.id,
        name: skDef.name,
        kind: 'collect',
        targetType: skDef.targetType,
        side: skDef.side,
        cooldown: Math.max(1, safeNum(skDef.cooldown, 3) - safeNum(rankInfo.cdReduction, 0)),
        currentCd: 0,
        scale: safeNum(rankInfo.scale, 1),
        effects: skDef.effects
      });
    }

    const tacticSrc = entry.tactic || {};
    const tactic = {
      policy: VALID_POLICIES.has(tacticSrc.policy) ? tacticSrc.policy : 'balanced',
      target: VALID_TARGETS.has(tacticSrc.target) ? tacticSrc.target : 'lowest_hp',
      skillPriority: VALID_PRIORITIES.has(tacticSrc.skillPriority) ? tacticSrc.skillPriority : 'unique_first'
    };

    return {
      id: cid,
      charId: cid,
      name: charDef.name,
      rarity: charDef.rarity,
      role: charDef.role,
      side: 'ally',
      slot,
      isBoss: false,
      bossType: null,
      maxHp,
      hp: maxHp,
      atk,
      def,
      spd,
      crit,
      critDmg,
      gauge: clamp(initGaugePct, 0, 99),
      shield: 0,
      buffs: [],
      debuffs: [],
      stacks: { defPct: 0, dmgDealtPct: 0 },
      passiveModifiers: {
        dmgDealtPct,
        dmgTakenDownPct,
        healPowerPct,
        singleTargetDmgPct,
        onHitAllyShieldPct,
        onHealAllyAtkPct,
        setOnHealAtkUpPct,
        setOnHealAtkDuration,
        traitMult,
        hasEndureOnce
      },
      endureUsed: false,
      waveFirstHitReady: false,
      trait,
      uniqueSkill,
      collectSkills,
      reservedSkillId: null,
      tactic,
      activeTelegraph: null,
      metrics: {
        damageDealt: 0,
        damageTaken: 0,
        healingDone: 0,
        healingReceived: 0
      }
    };
  }

  function buildEnemyUnit(enemyDef, slot, scaleMult, instanceIndex) {
    const bs = enemyDef.baseStats || {};
    const maxHp = Math.max(1, Math.round(safeNum(bs.hp, 500) * scaleMult));
    const atk = Math.max(1, Math.round(safeNum(bs.atk, 80) * scaleMult));
    const def = Math.max(0, Math.round(safeNum(bs.def, 40) * scaleMult));
    const spd = Math.max(20, Math.round(safeNum(bs.spd, 100)));
    const crit = clamp(safeNum(bs.crit, 10), 0, 100);
    const critDmg = safeNum(bs.critDmg, 150);

    const skills = Array.isArray(enemyDef.skills) ? enemyDef.skills.map(function (sk) {
      return {
        id: sk.id,
        name: sk.name,
        kind: 'enemy',
        targetType: sk.targetType || '単体',
        side: sk.side || 'enemy',
        cooldown: Math.max(1, safeNum(sk.cooldown, 3)),
        currentCd: 0,
        scale: 1,
        targetPolicy: sk.targetPolicy || null,
        telegraph: sk.telegraph || null,
        effects: sk.effects || []
      };
    }) : [];

    return {
      id: enemyDef.id + '__' + instanceIndex,
      enemyId: enemyDef.id,
      name: enemyDef.name,
      rarity: enemyDef.isBoss ? 'SSR' : 'R',
      role: enemyDef.role || 'ディーラー',
      side: 'enemy',
      slot,
      isBoss: Boolean(enemyDef.isBoss),
      bossType: enemyDef.bossType || null,
      maxHp,
      hp: maxHp,
      atk,
      def,
      spd,
      crit,
      critDmg,
      gauge: 0,
      shield: 0,
      buffs: [],
      debuffs: [],
      stacks: { defPct: 0, dmgDealtPct: 0 },
      passiveModifiers: {
        dmgDealtPct: 0,
        dmgTakenDownPct: 0,
        healPowerPct: 0,
        singleTargetDmgPct: 0,
        onHitAllyShieldPct: 0,
        onHealAllyAtkPct: 0,
        setOnHealAtkUpPct: 0,
        setOnHealAtkDuration: 2,
        traitMult: 1,
        hasEndureOnce: false
      },
      endureUsed: false,
      waveFirstHitReady: false,
      trait: null,
      skills,
      nextSkillCursor: 0,
      activeTelegraph: null,
      metrics: {
        damageDealt: 0,
        damageTaken: 0,
        healingDone: 0,
        healingReceived: 0
      }
    };
  }

  function buildWavesForConfig(config) {
    const MasterData = IkaiApp.MasterData;
    const mode = config.mode || 'stage';

    if (mode === 'raid') {
      const raid = MasterData.RAID_BOSSES.find(function (r) { return r.id === config.raidId; }) || MasterData.RAID_BOSSES[0];
      const diff = raid.difficulties.find(function (d) { return d.id === config.difficultyId; }) || raid.difficulties[0];
      const bossDef = {
        id: raid.id,
        name: raid.name,
        isBoss: true,
        bossType: 'raid',
        role: 'ディーラー',
        baseStats: {
          hp: diff.hp,
          atk: diff.atk,
          def: diff.def,
          spd: diff.spd,
          crit: diff.id === 'extreme' ? 18 : (diff.id === 'deep' ? 15 : 14),
          critDmg: 150
        },
        skills: raid.skills
      };
      return {
        label: raid.name + '（' + diff.name + '）',
        waves: [{ waveNum: 1, isEliteWave: true, isBossWave: true, bossId: raid.id, customDefs: [{ def: bossDef, scale: 1 }] }]
      };
    }

    if (mode === 'abyss') {
      const floor = Math.max(1, Math.floor(safeNum(config.floor, 1)));
      const cfg = MasterData.ABYSS_CONFIG;
      const scale = cfg.baseHpScale + (floor - 1) * cfg.perFloorGrowth;
      const areaIdx = Math.floor((floor - 1) / 5) % MasterData.AREAS.length;
      const area = MasterData.AREAS[areaIdx];
      const baseStage = area.stages[(floor - 1) % 6];
      const isBossFloor = floor % cfg.milestoneInterval === 0;
      const srcWave = isBossFloor ? area.stages[2].waves[4] : baseStage.waves[Math.min(4, (floor - 1) % 5)];
      const defs = srcWave.enemyIds.map(function (eid) {
        return { def: MasterData.ENEMIES[eid], scale };
      });
      return {
        label: '無限深淵 第' + floor + '階層',
        waves: [{ waveNum: 1, isEliteWave: isBossFloor, isBossWave: isBossFloor, bossId: isBossFloor ? srcWave.bossId : null, customDefs: defs }]
      };
    }

    if (mode === 'trial') {
      const trial = MasterData.TRIALS.find(function (t) { return t.id === config.trialId; }) || MasterData.TRIALS[0];
      const trialIdx = MasterData.TRIALS.indexOf(trial);
      const area = MasterData.AREAS[Math.min(MasterData.AREAS.length - 1, trialIdx)];
      const stage = area.stages[2]; // 3-wave or 5-wave mid-boss trial
      const waves = stage.waves.map(function (w) {
        return {
          waveNum: w.waveNum,
          isEliteWave: w.isEliteWave,
          isBossWave: w.isBossWave,
          bossId: w.bossId,
          customDefs: w.enemyIds.map(function (eid) {
            return { def: MasterData.ENEMIES[eid], scale: stage.statScale * w.scale };
          })
        };
      });
      return {
        label: trial.name,
        waves
      };
    }

    const stageId = config.stageId || '1-1';
    const stage = hasOwn(MasterData.STAGE_MAP, stageId)
      ? MasterData.STAGE_MAP[stageId]
      : MasterData.AREAS[0].stages[0];

    const waves = stage.waves.map(function (w) {
      return {
        waveNum: w.waveNum,
        isEliteWave: w.isEliteWave,
        isBossWave: w.isBossWave,
        bossId: w.bossId,
        customDefs: w.enemyIds.map(function (eid) {
          return { def: MasterData.ENEMIES[eid], scale: stage.statScale * w.scale };
        })
      };
    });
    return {
      label: stage.id + ' ' + stage.name,
      stageId: stage.id,
      waves
    };
  }

  function sumEffectsValue(list, statName) {
    let total = 0;
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].stat === statName) {
        total += safeNum(list[i].value, 0);
      }
    }
    return total;
  }

  function hasEffectStat(list, statName) {
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].stat === statName && list[i].duration > 0) {
        return true;
      }
    }
    return false;
  }

  function isIncapacitated(unit) {
    return hasEffectStat(unit.debuffs, 'stun') || hasEffectStat(unit.debuffs, 'freeze');
  }

  function hasActiveBossTelegraph(battle) {
    for (let i = 0; i < battle.enemies.length; i += 1) {
      const e = battle.enemies[i];
      if (e.hp > 0 && e.activeTelegraph !== null) {
        return true;
      }
    }
    return false;
  }

  function getEffectiveSpd(battle, unit) {
    const spdUp = sumEffectsValue(unit.buffs, 'spdUp');
    const spdDown = sumEffectsValue(unit.debuffs, 'spdDown');
    let bonusSpd = 0;
    if (unit.side === 'ally' && unit.trait && unit.trait.trigger === 'passive' && Array.isArray(unit.trait.effects)) {
      for (let i = 0; i < unit.trait.effects.length; i += 1) {
        if (unit.trait.effects[i].type === 'bonusSpdOnTelegraph' && hasActiveBossTelegraph(battle)) {
          bonusSpd += safeNum(unit.trait.effects[i].value, 0) * unit.passiveModifiers.traitMult;
        }
      }
    }
    return Math.max(10, unit.spd * Math.max(0.2, 1 + (spdUp - spdDown) / 100) + bonusSpd);
  }

  function pushEvent(battle, ev) {
    battle.events.push(ev);
    if (battle.events.length > MAX_EVENTS) {
      battle.events.shift();
    }
  }

  function pushLog(battle, text) {
    battle.logs.push(text);
    if (battle.logs.length > MAX_LOGS) {
      battle.logs.shift();
    }
  }

  function applyBuff(battle, target, stat, value, duration) {
    if (!target || target.hp <= 0 || duration <= 0) {
      return;
    }
    const isSelfTurn = Boolean(battle && battle._activeTurnActor === target);
    const existing = target.buffs.find(function (b) { return b.stat === stat; });
    if (existing) {
      existing.value = Math.max(existing.value, value);
      if (existing.skipEndTick) {
        existing.duration = Math.max(existing.duration, duration);
      } else if (isSelfTurn && duration >= existing.duration) {
        existing.duration = duration;
        existing.skipEndTick = true;
      } else {
        existing.duration = Math.max(existing.duration, duration);
      }
    } else {
      const entry = { stat, value, duration };
      if (isSelfTurn) {
        entry.skipEndTick = true;
      }
      target.buffs.push(entry);
    }
  }

  function applyDebuff(battle, source, target, stat, value, duration) {
    if (!target || target.hp <= 0 || duration <= 0) {
      return false;
    }
    const isSelfTurn = Boolean(battle && battle._activeTurnActor === target);
    const existing = target.debuffs.find(function (d) { return d.stat === stat; });
    if (existing) {
      existing.value = Math.max(existing.value, value);
      if (existing.skipEndTick) {
        existing.duration = Math.max(existing.duration, duration);
      } else if (isSelfTurn && duration >= existing.duration) {
        existing.duration = duration;
        existing.skipEndTick = true;
      } else {
        existing.duration = Math.max(existing.duration, duration);
      }
    } else {
      const entry = { stat, value, duration };
      if (isSelfTurn) {
        entry.skipEndTick = true;
      }
      target.debuffs.push(entry);
    }

    if (stat === 'spdDown' && source && source.hp > 0 && source.trait && source.trait.trigger === 'onDebuff') {
      const effects = source.trait.effects || [];
      for (let i = 0; i < effects.length; i += 1) {
        if (effects[i].type === 'selfGaugeUpOnSpdDown') {
          const gain = safeNum(effects[i].value, 0) * source.passiveModifiers.traitMult;
          source.gauge = clamp(source.gauge + gain, 0, 200);
        }
      }
    }
    return true;
  }

  function addShield(battle, target, amount, duration) {
    if (!target || target.hp <= 0 || amount <= 0) {
      return;
    }
    target.shield = Math.max(target.shield, Math.round(amount));
    applyBuff(battle, target, 'shield', Math.round(amount), duration || 2);
  }

  function syncShieldBuff(target) {
    if (target.shield <= 0) {
      target.shield = 0;
      target.buffs = target.buffs.filter(function (b) { return b.stat !== 'shield'; });
    } else {
      const b = target.buffs.find(function (x) { return x.stat === 'shield'; });
      if (b) {
        b.value = target.shield;
      }
    }
  }

  function recordHitDamage(attacker, target, rawDamage, isCrit, battle) {
    const cleanRaw = Math.max(0, Math.round(safeNum(rawDamage, 0)));
    const absorbed = Math.min(target.shield, cleanRaw);
    target.shield = Math.max(0, target.shield - absorbed);
    syncShieldBuff(target);

    const afterShield = cleanRaw - absorbed;
    let hpLoss = Math.min(target.hp, afterShield);
    const prevHp = target.hp;
    target.hp = Math.max(0, prevHp - hpLoss);

    if (target.hp === 0 && target.passiveModifiers.hasEndureOnce && !target.endureUsed) {
      target.endureUsed = true;
      target.hp = 1;
      hpLoss = Math.max(0, prevHp - 1);
      pushEvent(battle, { type: 'endure', unitId: target.id, side: target.side });
      pushLog(battle, target.name + 'は致命の一撃をHP1で耐えた！');
    }

    if (target.hp <= 0) {
      target.activeTelegraph = null;
      target.shield = 0;
      target.buffs = [];
      target.debuffs = [];
    }

    const totalImpact = absorbed + hpLoss;
    if (attacker && attacker.side === 'ally') {
      attacker.metrics.damageDealt += totalImpact;
    }
    if (target.side === 'ally') {
      target.metrics.damageTaken += totalImpact;
    }

    pushEvent(battle, {
      type: 'damage',
      sourceId: attacker ? attacker.id : null,
      targetId: target.id,
      targetSide: target.side,
      value: cleanRaw,
      hpLoss,
      absorbed,
      isCrit: Boolean(isCrit)
    });

    if (target.hp > 0 && target.trait && target.trait.trigger === 'onHitTaken') {
      const tEffects = target.trait.effects || [];
      for (let i = 0; i < tEffects.length; i += 1) {
        const te = tEffects[i];
        if (te.type === 'stackBuff' && te.stat === 'defPct') {
          const maxSt = safeNum(te.maxStacks, 5);
          if (target.stacks.defPct < maxSt) {
            target.stacks.defPct += 1;
          }
        }
      }
    }

    if (target.hp > 0 && target.side === 'ally' && target.passiveModifiers.onHitAllyShieldPct > 0) {
      const allies = battle.allies;
      for (let i = 0; i < allies.length; i += 1) {
        if (allies[i].hp > 0) {
          addShield(battle, allies[i], Math.round(allies[i].maxHp * (target.passiveModifiers.onHitAllyShieldPct / 100)), 1);
        }
      }
    }

    return { totalImpact, hpLoss, absorbed };
  }

  function applyHealing(battle, healer, target, rawHeal) {
    if (!target || target.hp <= 0) {
      return 0;
    }
    const healDownPct = clamp(sumEffectsValue(target.debuffs, 'healDown'), 0, 80);
    const casterHealBoost = healer ? healer.passiveModifiers.healPowerPct : 0;
    const targetHealBoost = target.passiveModifiers.healPowerPct;
    let traitBonus = 0;

    if (healer && healer.trait && healer.trait.trigger === 'onHeal') {
      const effects = healer.trait.effects || [];
      for (let i = 0; i < effects.length; i += 1) {
        const ef = effects[i];
        if (ef.type === 'lowHpHealBonus') {
          const hpPct = (target.hp / target.maxHp) * 100;
          if (hpPct <= safeNum(ef.belowPct, 40)) {
            traitBonus += safeNum(ef.value, 0) * healer.passiveModifiers.traitMult;
          }
        }
      }
    }

    const mult = Math.max(0.1, (1 + (casterHealBoost + targetHealBoost + traitBonus) / 100) * (1 - healDownPct / 100));
    const finalHeal = Math.max(1, Math.round(safeNum(rawHeal, 0) * mult));
    const actualHeal = Math.min(target.maxHp - target.hp, finalHeal);
    target.hp += actualHeal;

    if (healer && healer.side === 'ally') {
      healer.metrics.healingDone += actualHeal;
    }
    if (target.side === 'ally') {
      target.metrics.healingReceived += actualHeal;
    }

    pushEvent(battle, {
      type: 'heal',
      sourceId: healer ? healer.id : null,
      targetId: target.id,
      targetSide: target.side,
      value: actualHeal > 0 ? actualHeal : finalHeal
    });

    if (healer && healer.trait && healer.trait.trigger === 'onHeal') {
      const effects = healer.trait.effects || [];
      for (let i = 0; i < effects.length; i += 1) {
        const ef = effects[i];
        if (ef.type === 'buff') {
          applyBuff(battle, target, ef.stat, safeNum(ef.value, 10) * healer.passiveModifiers.traitMult, safeNum(ef.duration, 1));
        }
      }
    }

    if (healer && healer.side === 'ally') {
      if (healer.passiveModifiers.setOnHealAtkUpPct > 0) {
        applyBuff(battle, target, 'atkUp', healer.passiveModifiers.setOnHealAtkUpPct, healer.passiveModifiers.setOnHealAtkDuration);
      }
      if (healer.passiveModifiers.onHealAllyAtkPct > 0) {
        applyBuff(battle, target, 'atkUp', healer.passiveModifiers.onHealAllyAtkPct, 2);
      }
    }

    return actualHeal;
  }

  function getAliveUnits(list) {
    return list.filter(function (u) { return u.hp > 0; });
  }

  function sortByHpRatioAsc(a, b) {
    const rA = a.hp / a.maxHp;
    const rB = b.hp / b.maxHp;
    if (rA !== rB) return rA - rB;
    if (a.hp !== b.hp) return a.hp - b.hp;
    return a.slot - b.slot;
  }

  function selectEnemyTarget(battle, actor, targetPolicyOverride) {
    const foes = actor.side === 'ally' ? getAliveUnits(battle.enemies) : getAliveUnits(battle.allies);
    if (foes.length === 0) return null;

    if (targetPolicyOverride === 'highest_atk') {
      return foes.slice().sort(function (a, b) {
        if (b.atk !== a.atk) return b.atk - a.atk;
        return a.slot - b.slot;
      })[0];
    }

    const taunters = foes.filter(function (u) { return hasEffectStat(u.buffs, 'taunt'); });
    if (taunters.length > 0) {
      return taunters.slice().sort(sortByHpRatioAsc)[0];
    }

    const policy = targetPolicyOverride || (actor.side === 'ally' ? (actor.tactic ? actor.tactic.target : battle.globalTargetPolicy) : 'lowest_hp');

    if (policy === 'boss_first') {
      const bosses = foes.filter(function (u) { return u.isBoss; });
      if (bosses.length > 0) {
        return bosses.slice().sort(sortByHpRatioAsc)[0];
      }
    } else if (policy === 'fastest_enemy') {
      return foes.slice().sort(function (a, b) {
        const sDiff = getEffectiveSpd(battle, b) - getEffectiveSpd(battle, a);
        if (sDiff !== 0) return sDiff;
        return a.slot - b.slot;
      })[0];
    } else if (policy === 'debuffed_first') {
      const sorted = foes.slice().sort(function (a, b) {
        const dDiff = b.debuffs.length - a.debuffs.length;
        if (dDiff !== 0) return dDiff;
        return sortByHpRatioAsc(a, b);
      });
      return sorted[0];
    }

    return foes.slice().sort(sortByHpRatioAsc)[0];
  }

  function selectRangeTargets(allFoes, primary, maxCount) {
    if (!primary || allFoes.length === 0) return [];
    const out = [primary];
    const sorted = allFoes.slice().sort(function (a, b) {
      return Math.abs(a.slot - primary.slot) - Math.abs(b.slot - primary.slot);
    });
    for (let i = 0; i < sorted.length && out.length < maxCount; i += 1) {
      if (sorted[i].id !== primary.id) {
        out.push(sorted[i]);
      }
    }
    return out;
  }

  function selectAllyTargetForSupport(friends, effectType) {
    if (friends.length === 0) return null;
    if (effectType === 'heal' || effectType === 'cleanse' || effectType === 'shield') {
      return friends.slice().sort(sortByHpRatioAsc)[0];
    }
    return friends.slice().sort(function (a, b) {
      if (b.atk !== a.atk) return b.atk - a.atk;
      return a.slot - b.slot;
    })[0];
  }

  function calculateDamage(battle, attacker, target, effect, skill) {
    const atkUp = sumEffectsValue(attacker.buffs, 'atkUp');
    const atkDown = sumEffectsValue(attacker.debuffs, 'atkDown');
    const effAtk = Math.max(1, attacker.atk * Math.max(0.25, 1 + (atkUp - atkDown) / 100));

    const defUp = sumEffectsValue(target.buffs, 'defUp') + (target.stacks.defPct * 5 * target.passiveModifiers.traitMult);
    const defDown = sumEffectsValue(target.debuffs, 'defDown');
    const defIgnore = clamp(safeNum(effect.defIgnore, 0), 0, 0.95);
    const effDef = Math.max(0, target.def * Math.max(0.1, 1 + (defUp - defDown) / 100) * (1 - defIgnore));

    const mitigation = 100 / (100 + effDef * 0.65);

    const critUp = sumEffectsValue(attacker.buffs, 'critUp');
    const critDown = sumEffectsValue(attacker.debuffs, 'critDown');
    const critChance = clamp(attacker.crit + critUp - critDown, 0, 100);
    const isCrit = (battle.rng() * 100) < critChance;
    const critMult = isCrit ? (attacker.critDmg / 100) : 1;

    let dmgDealtBonus = attacker.passiveModifiers.dmgDealtPct + (attacker.stacks.dmgDealtPct * 6 * attacker.passiveModifiers.traitMult);
    if (skill && skill.targetType === '単体') {
      dmgDealtBonus += attacker.passiveModifiers.singleTargetDmgPct;
    }

    if (attacker.waveFirstHitReady) {
      dmgDealtBonus += 10;
    }

    if (attacker.trait && attacker.trait.trigger === 'onAttack' && Array.isArray(attacker.trait.effects)) {
      const foesAlive = attacker.side === 'ally' ? getAliveUnits(battle.enemies).length : getAliveUnits(battle.allies).length;
      for (let i = 0; i < attacker.trait.effects.length; i += 1) {
        const te = attacker.trait.effects[i];
        if (te.type === 'conditionalDmgUp' && foesAlive >= safeNum(te.minEnemies, 3)) {
          dmgDealtBonus += safeNum(te.value, 0) * attacker.passiveModifiers.traitMult;
        } else if (te.type === 'bonusVsDebuffed' && target.debuffs.length > 0) {
          dmgDealtBonus += safeNum(te.value, 0) * attacker.passiveModifiers.traitMult;
        } else if (te.type === 'singleTargetDmgUp' && (!skill || skill.targetType === '単体')) {
          dmgDealtBonus += safeNum(te.value, 0) * attacker.passiveModifiers.traitMult;
        }
      }
    }

    if (effect.bonusPerBuff && target.buffs.length > 0) {
      dmgDealtBonus += target.buffs.length * safeNum(effect.bonusPerBuff, 0) * 100;
    }

    const dmgDownBuff = sumEffectsValue(target.buffs, 'dmgDown');
    const totalDmgDown = clamp(dmgDownBuff + target.passiveModifiers.dmgTakenDownPct, 0, 75);
    const vulnPct = sumEffectsValue(target.debuffs, 'vuln');

    let ratio = safeNum(effect.ratio, 1.0);
    if (skill && typeof skill.scale === 'number') {
      ratio *= skill.scale;
    }
    if (effect.executeBelow50Scale && (target.hp / target.maxHp) <= 0.5) {
      ratio *= safeNum(effect.executeBelow50Scale, 1);
    }
    if (isCrit && effect.critBonusRatio) {
      ratio += safeNum(effect.critBonusRatio, 0);
    }

    const dmgDealtMult = Math.max(0.2, 1 + dmgDealtBonus / 100);
    const dmgTakenMult = Math.max(0.2, (1 - totalDmgDown / 100) * (1 + vulnPct / 100));
    const variance = 0.96 + battle.rng() * 0.08;

    const raw = effAtk * ratio * mitigation * dmgDealtMult * dmgTakenMult * critMult * variance;
    const damage = Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1;
    return { damage, isCrit };
  }

  function triggerCounterIfApplicable(battle, defender, attacker) {
    if (!defender || defender.hp <= 0 || !attacker || attacker.hp <= 0) {
      return;
    }
    if (!hasEffectStat(defender.buffs, 'counter') || isIncapacitated(defender)) {
      return;
    }
    const res = calculateDamage(battle, defender, attacker, { ratio: 0.85 }, { targetType: '単体', scale: 1 });
    recordHitDamage(defender, attacker, res.damage, res.isCrit, battle);
    pushLog(battle, defender.name + 'の反撃！ ' + attacker.name + 'に' + res.damage + 'ダメージ');
    if (attacker.hp > 0 && defender.trait && defender.trait.trigger === 'onCounterHit') {
      const teList = defender.trait.effects || [];
      for (let i = 0; i < teList.length; i += 1) {
        if (teList[i].type === 'debuff') {
          applyDebuff(battle, defender, attacker, teList[i].stat, safeNum(teList[i].value, 15) * defender.passiveModifiers.traitMult, safeNum(teList[i].duration, 2));
        }
      }
    }
  }

  function resolveEffectTargets(battle, actor, skill, effect, stateCtx) {
    const friends = actor.side === 'ally' ? getAliveUnits(battle.allies) : getAliveUnits(battle.enemies);
    const foes = actor.side === 'ally' ? getAliveUnits(battle.enemies) : getAliveUnits(battle.allies);
    const explicitTarget = effect.target;

    if (explicitTarget === 'self') {
      return [actor];
    }
    if (explicitTarget === 'allies') {
      return friends;
    }
    if (explicitTarget === 'lowestHpAlly') {
      const chosen = friends.slice().sort(sortByHpRatioAsc)[0] || null;
      stateCtx.primaryAlly = chosen;
      return chosen ? [chosen] : [];
    }
    if (explicitTarget === 'otherAllies') {
      const primaryId = stateCtx.primaryAlly ? stateCtx.primaryAlly.id : null;
      return friends.filter(function (f) { return f.id !== primaryId; });
    }
    if (explicitTarget === 'ally') {
      if (!stateCtx.primaryAlly || stateCtx.primaryAlly.hp <= 0) {
        stateCtx.primaryAlly = selectAllyTargetForSupport(friends, effect.type);
      }
      return stateCtx.primaryAlly ? [stateCtx.primaryAlly] : [];
    }
    if (explicitTarget === 'enemies') {
      return foes;
    }
    if (explicitTarget === 'range') {
      if (!stateCtx.primaryEnemy || stateCtx.primaryEnemy.hp <= 0) {
        stateCtx.primaryEnemy = selectEnemyTarget(battle, actor, effect.targetPolicy || skill.targetPolicy);
      }
      return selectRangeTargets(foes, stateCtx.primaryEnemy, 3);
    }
    if (explicitTarget === 'enemy') {
      if (!stateCtx.primaryEnemy || stateCtx.primaryEnemy.hp <= 0) {
        stateCtx.primaryEnemy = selectEnemyTarget(battle, actor, effect.targetPolicy || skill.targetPolicy);
      }
      return stateCtx.primaryEnemy ? [stateCtx.primaryEnemy] : [];
    }

    // Infer from skill.side + skill.targetType
    if (skill.side === 'self') {
      return [actor];
    }
    if (skill.side === 'ally') {
      if (skill.targetType === '全体') {
        return friends;
      }
      if (skill.targetType === '範囲') {
        if (!stateCtx.primaryAlly || stateCtx.primaryAlly.hp <= 0) {
          stateCtx.primaryAlly = selectAllyTargetForSupport(friends, effect.type);
        }
        return selectRangeTargets(friends, stateCtx.primaryAlly, 3);
      }
      if (!stateCtx.primaryAlly || stateCtx.primaryAlly.hp <= 0) {
        stateCtx.primaryAlly = selectAllyTargetForSupport(friends, effect.type);
      }
      return stateCtx.primaryAlly ? [stateCtx.primaryAlly] : [];
    }

    // Enemy-targeted skill
    if (effect.type === 'selfShield' || effect.type === 'selfHealPct' || effect.type === 'selfAtkUp' || effect.type === 'selfDefUp' || effect.type === 'selfSpdUp' || effect.type === 'selfDmgDown' || effect.type === 'allyGaugeUp') {
      return effect.type === 'allyGaugeUp' ? friends : [actor];
    }
    if (skill.targetType === '全体') {
      return foes;
    }
    if (skill.targetType === '範囲') {
      if (!stateCtx.primaryEnemy || stateCtx.primaryEnemy.hp <= 0) {
        stateCtx.primaryEnemy = selectEnemyTarget(battle, actor, effect.targetPolicy || skill.targetPolicy);
      }
      return selectRangeTargets(foes, stateCtx.primaryEnemy, 3);
    }
    if (!stateCtx.primaryEnemy || stateCtx.primaryEnemy.hp <= 0) {
      stateCtx.primaryEnemy = selectEnemyTarget(battle, actor, effect.targetPolicy || skill.targetPolicy);
    }
    return stateCtx.primaryEnemy ? [stateCtx.primaryEnemy] : [];
  }

  function executeSkill(battle, actor, skill) {
    const stateCtx = {
      primaryEnemy: null,
      primaryAlly: null,
      critTargets: new Set(),
      attackedTargets: []
    };

    let anyCrit = false;
    let didDamage = false;

    for (let i = 0; i < skill.effects.length; i += 1) {
      const ef = skill.effects[i];
      if (typeof ef.chance === 'number' && battle.rng() > ef.chance) {
        continue;
      }
      const targets = resolveEffectTargets(battle, actor, skill, ef, stateCtx);

      for (let t = 0; t < targets.length; t += 1) {
        const target = targets[t];
        if (!target || target.hp <= 0) continue;

        switch (ef.type) {
          case 'damage': {
            didDamage = true;
            const hits = Math.max(1, Math.floor(safeNum(ef.hits, 1)));
            for (let h = 0; h < hits; h += 1) {
              if (target.hp <= 0) break;
              const res = calculateDamage(battle, actor, target, ef, skill);
              recordHitDamage(actor, target, res.damage, res.isCrit, battle);
              if (res.isCrit) {
                anyCrit = true;
                stateCtx.critTargets.add(target.id);
              }
            }
            if (stateCtx.attackedTargets.indexOf(target) < 0) {
              stateCtx.attackedTargets.push(target);
            }
            break;
          }
          case 'heal': {
            const rawHeal = actor.atk * safeNum(ef.ratio, 1) * (typeof skill.scale === 'number' ? skill.scale : 1);
            applyHealing(battle, actor, target, rawHeal);
            break;
          }
          case 'selfHealPct': {
            const rawSelfHeal = target.maxHp * safeNum(ef.ratio, 0.10);
            applyHealing(battle, actor, target, rawSelfHeal);
            break;
          }
          case 'buff': {
            applyBuff(battle, target, ef.stat, safeNum(ef.value, 10), safeNum(ef.duration, 2));
            break;
          }
          case 'selfAtkUp': {
            applyBuff(battle, actor, 'atkUp', safeNum(ef.value, 15), safeNum(ef.duration, 2));
            break;
          }
          case 'selfDefUp': {
            applyBuff(battle, actor, 'defUp', safeNum(ef.value, 20), safeNum(ef.duration, 2));
            break;
          }
          case 'selfSpdUp': {
            applyBuff(battle, actor, 'spdUp', safeNum(ef.value, 15), safeNum(ef.duration, 2));
            break;
          }
          case 'selfDmgDown': {
            applyBuff(battle, actor, 'dmgDown', safeNum(ef.value, 20), safeNum(ef.duration, 2));
            break;
          }
          case 'debuff': {
            applyDebuff(battle, actor, target, ef.stat, safeNum(ef.value, 10), safeNum(ef.duration, 2));
            break;
          }
          case 'shield': {
            const basisHp = ef.basis === 'casterMaxHp' ? actor.maxHp : target.maxHp;
            const shAmt = basisHp * safeNum(ef.ratio, 0.15) * (typeof skill.scale === 'number' ? skill.scale : 1);
            addShield(battle, target, shAmt, safeNum(ef.duration, 2));
            break;
          }
          case 'selfShield': {
            const selfShAmt = actor.maxHp * safeNum(ef.ratio, 0.15);
            addShield(battle, actor, selfShAmt, safeNum(ef.duration, 2));
            break;
          }
          case 'gaugeUp':
          case 'allyGaugeUp': {
            target.gauge = clamp(target.gauge + safeNum(ef.value, 15), 0, 200);
            break;
          }
          case 'gaugeDown': {
            target.gauge = Math.max(0, target.gauge - safeNum(ef.value, 20));
            break;
          }
          case 'critGaugeDown': {
            if (stateCtx.critTargets.has(target.id)) {
              target.gauge = Math.max(0, target.gauge - safeNum(ef.value, 20));
            }
            break;
          }
          case 'dispel': {
            const cnt = Math.max(1, Math.floor(safeNum(ef.count, 1)));
            for (let c = 0; c < cnt && target.buffs.length > 0; c += 1) {
              const removed = target.buffs.shift();
              if (removed && removed.stat === 'shield') {
                target.shield = 0;
              }
            }
            break;
          }
          case 'dispelAll': {
            target.buffs = [];
            target.shield = 0;
            break;
          }
          case 'cleanse': {
            const cnt = Math.max(1, Math.floor(safeNum(ef.count, 1)));
            for (let c = 0; c < cnt && target.debuffs.length > 0; c += 1) {
              target.debuffs.shift();
            }
            break;
          }
          case 'cleanseAll': {
            target.debuffs = [];
            break;
          }
          default:
            break;
        }
      }
    }

    if (didDamage) {
      actor.waveFirstHitReady = false;
    }

    if (anyCrit && actor.trait && actor.trait.trigger === 'onCrit') {
      const teList = actor.trait.effects || [];
      for (let i = 0; i < teList.length; i += 1) {
        if (teList[i].type === 'selfGaugeUp') {
          actor.gauge = clamp(actor.gauge + safeNum(teList[i].value, 20) * actor.passiveModifiers.traitMult, 0, 200);
        }
      }
    }

    if (didDamage && (skill.targetType === '単体' || skill.targetType === '範囲')) {
      for (let i = 0; i < stateCtx.attackedTargets.length; i += 1) {
        const defender = stateCtx.attackedTargets[i];
        triggerCounterIfApplicable(battle, defender, actor);
      }
    }

    pushLog(battle, actor.name + 'の『' + skill.name + '』');
  }

  function chooseAllySkill(battle, ally) {
    const friends = getAliveUnits(battle.allies);
    const minFriendHpPct = friends.reduce(function (minVal, f) {
      return Math.min(minVal, (f.hp / f.maxHp) * 100);
    }, 100);

    const uniqueReady = ally.uniqueSkill && ally.uniqueSkill.currentCd === 0 ? ally.uniqueSkill : null;
    const collectReady = ally.collectSkills.filter(function (s) { return s.currentCd === 0; });
    const allReady = (uniqueReady ? [uniqueReady] : []).concat(collectReady);

    if (ally.reservedSkillId) {
      const reserved = ally.reservedSkillId === 'unique'
        ? uniqueReady
        : allReady.find(function (s) { return s.id === ally.reservedSkillId; });
      if (reserved) {
        ally.reservedSkillId = null;
        return reserved;
      }
    }

    const policy = ally.tactic ? ally.tactic.policy : battle.globalTactic;
    const priority = ally.tactic ? ally.tactic.skillPriority : 'unique_first';

    const isHealOrDefenseSkill = function (sk) {
      return sk.side === 'ally' || sk.side === 'self';
    };
    const isHealSkill = function (sk) {
      return Array.isArray(sk.effects) && sk.effects.some(function (e) { return e.type === 'heal'; });
    };

    if (policy === 'conserve') {
      if (ally.role === 'ヒーラー' && minFriendHpPct < 50) {
        const healSk = allReady.find(isHealSkill);
        if (healSk) return healSk;
      }
      return null;
    }

    if (policy === 'defensive') {
      if (minFriendHpPct < 65) {
        const defSk = allReady.find(isHealOrDefenseSkill);
        if (defSk) return defSk;
      }
    }

    if (policy === 'balanced') {
      if (ally.role === 'ヒーラー') {
        if (minFriendHpPct >= 88) {
          const attackSk = allReady.find(function (sk) { return sk.side === 'enemy'; });
          if (attackSk) return attackSk;
          return null;
        }
        const preferredOrder = priority === 'collect_first'
          ? collectReady.concat(uniqueReady ? [uniqueReady] : [])
          : allReady;
        const healSk = preferredOrder.find(isHealSkill);
        if (healSk) return healSk;
      }
    }

    if (allReady.length === 0) {
      return null;
    }

    if (priority === 'collect_first' && collectReady.length > 0) {
      return collectReady[0];
    }
    if (priority === 'unique_first' && uniqueReady) {
      return uniqueReady;
    }
    if (policy === 'aggressive' || policy === 'balanced' || policy === 'defensive') {
      return allReady[0];
    }
    return null;
  }

  function tickStatusDurations(unit, usedSkill) {
    for (let i = unit.buffs.length - 1; i >= 0; i -= 1) {
      if (unit.buffs[i].skipEndTick) {
        delete unit.buffs[i].skipEndTick;
        continue;
      }
      unit.buffs[i].duration -= 1;
      if (unit.buffs[i].duration <= 0) {
        if (unit.buffs[i].stat === 'shield') {
          unit.shield = 0;
        }
        unit.buffs.splice(i, 1);
      }
    }
    for (let i = unit.debuffs.length - 1; i >= 0; i -= 1) {
      if (unit.debuffs[i].skipEndTick) {
        delete unit.debuffs[i].skipEndTick;
        continue;
      }
      unit.debuffs[i].duration -= 1;
      if (unit.debuffs[i].duration <= 0) {
        unit.debuffs.splice(i, 1);
      }
    }
    if (unit.uniqueSkill && unit.uniqueSkill !== usedSkill && unit.uniqueSkill.currentCd > 0) {
      unit.uniqueSkill.currentCd -= 1;
    }
    if (Array.isArray(unit.collectSkills)) {
      for (let i = 0; i < unit.collectSkills.length; i += 1) {
        if (unit.collectSkills[i] !== usedSkill && unit.collectSkills[i].currentCd > 0) {
          unit.collectSkills[i].currentCd -= 1;
        }
      }
    }
    if (Array.isArray(unit.skills)) {
      for (let i = 0; i < unit.skills.length; i += 1) {
        if (unit.skills[i] !== usedSkill && unit.skills[i].currentCd > 0) {
          unit.skills[i].currentCd -= 1;
        }
      }
    }
  }

  function executeUnitTurn(battle, actor) {
    if (!actor || actor.hp <= 0 || battle.status !== 'ongoing') {
      return;
    }

    battle.turnCount += 1;
    battle._activeTurnActor = actor;
    let usedSkill = null;

    try {
      // 1. onTurnStart triggers + burn/regen ticks
      if (actor.trait && actor.trait.trigger === 'onTurnStart') {
        const teList = actor.trait.effects || [];
        for (let i = 0; i < teList.length; i += 1) {
          const te = teList[i];
          if (te.type === 'conditionalSelfHealPct' && (actor.hp / actor.maxHp) * 100 <= safeNum(te.belowHpPct, 50)) {
            applyHealing(battle, actor, actor, actor.maxHp * safeNum(te.ratio, 0.10) * actor.passiveModifiers.traitMult);
          }
        }
      }

      if (hasEffectStat(actor.buffs, 'regen')) {
        const regenPct = sumEffectsValue(actor.buffs, 'regen');
        applyHealing(battle, actor, actor, actor.maxHp * (regenPct / 100));
      }

      if (hasEffectStat(actor.debuffs, 'burn')) {
        const burnDmg = Math.max(1, Math.round(actor.maxHp * 0.05));
        recordHitDamage(null, actor, burnDmg, false, battle);
        if (actor.hp <= 0) {
          return;
        }
      }

      // 2. Check stun / freeze
      if (isIncapacitated(actor)) {
        pushEvent(battle, { type: 'stun_skip', unitId: actor.id, side: actor.side });
        pushLog(battle, actor.name + 'は行動不能で動けない！');
        tickStatusDurations(actor, null);
        return;
      }

      // 3. Choose & execute skill or basic attack
      const basicAttack = {
        id: 'basic_attack',
        name: '通常攻撃',
        kind: 'basic',
        targetType: '単体',
        side: 'enemy',
        cooldown: 0,
        scale: 1,
        effects: [{ type: 'damage', ratio: 1.0 }]
      };

      if (actor.side === 'ally') {
        const chosen = chooseAllySkill(battle, actor);
        if (chosen) {
          executeSkill(battle, actor, chosen);
          chosen.currentCd = chosen.cooldown;
          usedSkill = chosen;
          if (chosen.kind === 'collect') {
            battle.skillUses[chosen.id] = (battle.skillUses[chosen.id] || 0) + 1;
          }
        } else {
          executeSkill(battle, actor, basicAttack);
        }
      } else {
        // Enemy AI + Boss Telegraph State Machine
        if (actor.activeTelegraph) {
          actor.activeTelegraph.remainingTurns -= 1;
          if (actor.activeTelegraph.remainingTurns <= 0) {
            const tSkill = actor.skills.find(function (s) { return s.id === actor.activeTelegraph.skillId; });
            actor.activeTelegraph = null;
            if (tSkill) {
              usedSkill = tSkill;
              executeSkill(battle, actor, tSkill);
              tSkill.currentCd = tSkill.cooldown;
            } else {
              executeSkill(battle, actor, basicAttack);
            }
          } else {
            executeSkill(battle, actor, basicAttack);
          }
        } else {
          const readySkills = actor.skills.filter(function (s) { return s.currentCd === 0; });
          if (readySkills.length > 0) {
            const picked = readySkills[actor.nextSkillCursor % readySkills.length];
            actor.nextSkillCursor += 1;
            if (picked.telegraph && picked.telegraph.enabled) {
              actor.activeTelegraph = {
                skillId: picked.id,
                skillName: picked.telegraph.skillName || picked.name,
                targetType: picked.telegraph.targetType || picked.targetType,
                warningText: picked.telegraph.warningText || (picked.name + 'の予兆'),
                remainingTurns: Math.max(1, safeNum(picked.telegraph.chargeTurns, 1)),
                totalTurns: Math.max(1, safeNum(picked.telegraph.chargeTurns, 1))
              };
              pushEvent(battle, {
                type: 'boss_telegraph',
                unitId: actor.id,
                skillName: actor.activeTelegraph.skillName,
                warningText: actor.activeTelegraph.warningText
              });
              pushLog(battle, actor.name + '：' + actor.activeTelegraph.warningText);
              executeSkill(battle, actor, basicAttack);
            } else {
              usedSkill = picked;
              executeSkill(battle, actor, picked);
              picked.currentCd = picked.cooldown;
            }
          } else {
            executeSkill(battle, actor, basicAttack);
          }
        }
      }

      // 4. onTurnEnd triggers
      if (actor.hp > 0 && actor.trait && actor.trait.trigger === 'onTurnEnd') {
        const teList = actor.trait.effects || [];
        for (let i = 0; i < teList.length; i += 1) {
          const te = teList[i];
          if (te.type === 'stackBuff' && te.stat === 'dmgDealtPct') {
            const maxSt = safeNum(te.maxStacks, 4);
            if (actor.stacks.dmgDealtPct < maxSt) {
              actor.stacks.dmgDealtPct += 1;
            }
          } else if (te.type === 'healLowestAllyPct') {
            const friends = getAliveUnits(battle.allies);
            if (friends.length > 0) {
              const lowest = friends.slice().sort(sortByHpRatioAsc)[0];
              applyHealing(battle, actor, lowest, lowest.maxHp * safeNum(te.ratio, 0.05) * actor.passiveModifiers.traitMult);
            }
          }
        }
      }

      // 5. Tick durations & cooldowns at end of turn
      tickStatusDurations(actor, usedSkill);
    } finally {
      battle._activeTurnActor = null;
    }
  }

  function spawnWave(battle, waveIdx, isBattleStart) {
    const waveDef = battle.waves[waveIdx];
    battle.waveIndex = waveIdx;
    battle.enemies = waveDef.customDefs.map(function (entry, idx) {
      return buildEnemyUnit(entry.def, idx, entry.scale, waveIdx + '_' + idx);
    });

    const aliveAllies = getAliveUnits(battle.allies);
    if (isBattleStart) {
      for (let i = 0; i < aliveAllies.length; i += 1) {
        const ally = aliveAllies[i];
        if (ally.trait && ally.trait.trigger === 'onBattleStart') {
          const eff = ally.trait.effects || [];
          for (let j = 0; j < eff.length; j += 1) {
            if (eff[j].type === 'initGaugeUp') {
              const val = safeNum(eff[j].value, 20) * ally.passiveModifiers.traitMult;
              for (let k = 0; k < aliveAllies.length; k += 1) {
                aliveAllies[k].gauge = clamp(aliveAllies[k].gauge + val, 0, 99);
              }
            } else if (eff[j].type === 'selfInitGaugeUp') {
              ally.gauge = clamp(ally.gauge + safeNum(eff[j].value, 15) * ally.passiveModifiers.traitMult, 0, 99);
            }
          }
        }
      }
    }

    // onWaveStart triggers
    let hasWaveFirstHitAura = false;
    for (let i = 0; i < aliveAllies.length; i += 1) {
      const ally = aliveAllies[i];
      if (!ally.trait || ally.trait.trigger !== 'onWaveStart') continue;
      const eff = ally.trait.effects || [];
      for (let j = 0; j < eff.length; j += 1) {
        if (eff[j].type === 'allyHighestAtkGaugeUp') {
          const topAlly = aliveAllies.slice().sort(function (a, b) { return b.atk - a.atk; })[0];
          if (topAlly) {
            topAlly.gauge = clamp(topAlly.gauge + safeNum(eff[j].value, 15) * ally.passiveModifiers.traitMult, 0, 99);
          }
        } else if (eff[j].type === 'waveHealPct') {
          const ratio = safeNum(eff[j].ratio, 0.08) * ally.passiveModifiers.traitMult;
          for (let k = 0; k < aliveAllies.length; k += 1) {
            applyHealing(battle, ally, aliveAllies[k], aliveAllies[k].maxHp * ratio);
          }
        } else if (eff[j].type === 'waveFirstHitDmgUp') {
          hasWaveFirstHitAura = true;
        }
      }
    }

    if (hasWaveFirstHitAura) {
      for (let i = 0; i < aliveAllies.length; i += 1) {
        aliveAllies[i].waveFirstHitReady = true;
      }
    }

    pushEvent(battle, { type: 'wave_start', waveIndex: waveIdx, totalWaves: battle.waves.length });
    pushLog(battle, 'WAVE ' + (waveIdx + 1) + '/' + battle.waves.length + ' 開始');
  }

  function checkBattleOutcome(battle) {
    const aliveAllies = getAliveUnits(battle.allies);
    if (aliveAllies.length === 0) {
      battle.status = 'defeat';
      pushEvent(battle, { type: 'battle_end', status: 'defeat' });
      return;
    }

    const aliveEnemies = getAliveUnits(battle.enemies);
    if (aliveEnemies.length === 0) {
      if (battle.waveIndex + 1 < battle.waves.length) {
        spawnWave(battle, battle.waveIndex + 1, false);
      } else {
        battle.status = 'victory';
        pushEvent(battle, { type: 'battle_end', status: 'victory' });
      }
      return;
    }

    if (battle.turnCount >= MAX_TOTAL_TURNS) {
      battle.status = 'defeat';
      pushEvent(battle, { type: 'battle_end', status: 'defeat', reason: 'timeout' });
    }
  }

  function projectTimeline(battle, count) {
    const limit = count || 8;
    const simUnits = [];
    const allUnits = battle.allies.concat(battle.enemies);
    for (let i = 0; i < allUnits.length; i += 1) {
      const u = allUnits[i];
      if (u.hp <= 0) continue;
      simUnits.push({
        id: u.id,
        name: u.name,
        side: u.side,
        role: u.role,
        isBoss: u.isBoss,
        slot: u.slot,
        gauge: u.gauge,
        effSpd: getEffectiveSpd(battle, u)
      });
    }
    if (simUnits.length === 0) return [];

    const out = [];
    let guard = 0;
    while (out.length < limit && guard < 120) {
      guard += 1;
      let ready = null;
      let minDt = Infinity;

      for (let i = 0; i < simUnits.length; i += 1) {
        const su = simUnits[i];
        if (su.gauge >= GAUGE_MAX) {
          if (!ready || su.gauge > ready.gauge || (su.gauge === ready.gauge && (su.effSpd > ready.effSpd || (su.effSpd === ready.effSpd && su.side === 'ally' && ready.side !== 'ally')))) {
            ready = su;
          }
        } else {
          const dtNeeded = (GAUGE_MAX - su.gauge) / Math.max(1, su.effSpd * GAUGE_RATE);
          if (dtNeeded < minDt) {
            minDt = dtNeeded;
          }
        }
      }

      if (!ready && Number.isFinite(minDt) && minDt > 0) {
        for (let i = 0; i < simUnits.length; i += 1) {
          simUnits[i].gauge += simUnits[i].effSpd * GAUGE_RATE * minDt;
        }
        continue;
      }

      if (!ready) break;
      ready.gauge = Math.max(0, ready.gauge - GAUGE_MAX);
      out.push({
        order: out.length + 1,
        unitId: ready.id,
        name: ready.name,
        side: ready.side,
        role: ready.role,
        isBoss: ready.isBoss
      });
    }
    return out;
  }

  function createBattle(config) {
    const cfg = config || {};
    const state = cfg.state || (IkaiApp.StateStore ? IkaiApp.StateStore.getState() : null);
    const MasterData = IkaiApp.MasterData;

    let partyIds = Array.isArray(cfg.partyIds) && cfg.partyIds.length > 0
      ? cfg.partyIds.filter(Boolean)
      : (state && Array.isArray(state.party) ? state.party.filter(Boolean) : []);
    if (partyIds.length === 0) {
      partyIds = ['char_todo_seiichi', 'char_kobayashi_shohei', 'char_saito_riko', 'char_nakamura_yui'];
    }
    partyIds = partyIds.filter(function (cid) { return hasOwn(MasterData.CHARACTER_MAP, cid); }).slice(0, 4);

    const resBonus = computeResonanceBonuses(state);
    const partyAuras = computePartyAuras(state, partyIds);
    const allies = partyIds.map(function (cid, idx) {
      return buildAllyUnit(cid, idx, state, resBonus, partyAuras);
    });

    const waveSetup = buildWavesForConfig(cfg);
    const defaultSpeed = state && state.settings ? state.settings.battleSpeed : 1;
    const defaultAuto = state && state.settings ? state.settings.autoRepeatCount : 0;

    const battle = {
      id: 'bat_' + Date.now(),
      mode: cfg.mode || 'stage',
      stageId: waveSetup.stageId || cfg.stageId || '1-1',
      stageLabel: waveSetup.label,
      floor: cfg.floor || 1,
      raidId: cfg.raidId || null,
      difficultyId: cfg.difficultyId || null,
      trialId: cfg.trialId || null,
      status: 'ongoing',
      waves: waveSetup.waves,
      waveIndex: 0,
      turnCount: 0,
      elapsedMs: 0,
      speed: clamp(Math.floor(safeNum(cfg.speed, defaultSpeed)), 1, 3),
      autoRepeat: typeof cfg.autoRepeat === 'boolean'
        ? (cfg.autoRepeat ? 10 : 0)
        : Math.max(0, Math.floor(safeNum(cfg.autoRepeat, defaultAuto))),
      globalTactic: VALID_POLICIES.has(cfg.globalTactic) ? cfg.globalTactic : 'balanced',
      globalTargetPolicy: VALID_TARGETS.has(cfg.globalTargetPolicy) ? cfg.globalTargetPolicy : 'lowest_hp',
      allies,
      enemies: [],
      events: [],
      logs: [],
      skillUses: {},
      rng: createRng(cfg.seed)
    };

    spawnWave(battle, 0, true);
    activeBattle = battle;
    return battle;
  }

  function step(battleOrDt, maybeDt) {
    const resolved = resolveBattleArg(battleOrDt, maybeDt);
    const battle = resolved.battle;
    const dtMs = resolved.hasBattleArg ? resolved.rest : battleOrDt;

    if (!battle) {
      return null;
    }

    if (battle.status !== 'ongoing' || !Number.isFinite(dtMs) || dtMs <= 0) {
      return getSnapshot(battle);
    }

    const totalSimMs = dtMs * battle.speed;
    let remainingMs = totalSimMs;
    let actionsDone = 0;
    let subSteps = 0;

    while (remainingMs > 0 && actionsDone < MAX_ACTIONS_PER_STEP && battle.status === 'ongoing' && subSteps < 120) {
      subSteps += 1;
      const chunkMs = Math.min(remainingMs, SUB_TICK_MS);
      remainingMs -= chunkMs;
      battle.elapsedMs += chunkMs;
      const dtSec = chunkMs / 1000;

      const alive = getAliveUnits(battle.allies.concat(battle.enemies));
      for (let i = 0; i < alive.length; i += 1) {
        const u = alive[i];
        u.gauge = clamp(u.gauge + getEffectiveSpd(battle, u) * dtSec * GAUGE_RATE, 0, 200);
      }

      while (actionsDone < MAX_ACTIONS_PER_STEP && battle.status === 'ongoing') {
        const candidates = getAliveUnits(battle.allies.concat(battle.enemies)).filter(function (u) {
          return u.gauge >= GAUGE_MAX;
        });
        if (candidates.length === 0) {
          break;
        }
        candidates.sort(function (a, b) {
          if (b.gauge !== a.gauge) return b.gauge - a.gauge;
          const spdDiff = getEffectiveSpd(battle, b) - getEffectiveSpd(battle, a);
          if (spdDiff !== 0) return spdDiff;
          if (a.side !== b.side) return a.side === 'ally' ? -1 : 1;
          return a.slot - b.slot;
        });

        const actor = candidates[0];
        actor.gauge = Math.max(0, actor.gauge - GAUGE_MAX);
        executeUnitTurn(battle, actor);
        actionsDone += 1;
        checkBattleOutcome(battle);
      }
    }

    return getSnapshot(battle);
  }

  function setGlobalTactic(battleOrPolicy, maybePolicy) {
    const resolved = resolveBattleArg(battleOrPolicy, maybePolicy);
    const battle = resolved.battle;
    const policy = resolved.hasBattleArg ? resolved.rest : battleOrPolicy;
    if (!battle || !VALID_POLICIES.has(policy)) {
      return false;
    }
    battle.globalTactic = policy;
    for (let i = 0; i < battle.allies.length; i += 1) {
      battle.allies[i].tactic.policy = policy;
    }
    return true;
  }

  function setUnitTactic(battleOrUnitId, unitIdOrPatch, maybePatch) {
    const hasBattle = battleOrUnitId && typeof battleOrUnitId === 'object' && Array.isArray(battleOrUnitId.allies);
    const battle = hasBattle ? battleOrUnitId : activeBattle;
    const unitId = hasBattle ? unitIdOrPatch : battleOrUnitId;
    const patch = hasBattle ? maybePatch : unitIdOrPatch;
    if (!battle || !patch || typeof patch !== 'object') {
      return false;
    }
    const unit = battle.allies.find(function (a) { return a.id === unitId; });
    if (!unit) {
      return false;
    }
    if (VALID_POLICIES.has(patch.policy)) {
      unit.tactic.policy = patch.policy;
    }
    if (VALID_TARGETS.has(patch.target)) {
      unit.tactic.target = patch.target;
    }
    if (VALID_PRIORITIES.has(patch.skillPriority)) {
      unit.tactic.skillPriority = patch.skillPriority;
    }
    return true;
  }

  function setGlobalTargetPolicy(battleOrPolicy, maybePolicy) {
    const resolved = resolveBattleArg(battleOrPolicy, maybePolicy);
    const battle = resolved.battle;
    const policy = resolved.hasBattleArg ? resolved.rest : battleOrPolicy;
    if (!battle || !VALID_TARGETS.has(policy)) {
      return false;
    }
    battle.globalTargetPolicy = policy;
    for (let i = 0; i < battle.allies.length; i += 1) {
      battle.allies[i].tactic.target = policy;
    }
    return true;
  }

  function reserveSkill(battleOrUnitId, unitIdOrSkillId, maybeSkillId) {
    const hasBattle = battleOrUnitId && typeof battleOrUnitId === 'object' && Array.isArray(battleOrUnitId.allies);
    const battle = hasBattle ? battleOrUnitId : activeBattle;
    const unitId = hasBattle ? unitIdOrSkillId : battleOrUnitId;
    const skillId = hasBattle ? maybeSkillId : unitIdOrSkillId;
    if (!battle) return false;
    const unit = battle.allies.find(function (a) { return a.id === unitId; });
    if (!unit || unit.hp <= 0) return false;
    if (skillId === null || skillId === undefined || skillId === '') {
      unit.reservedSkillId = null;
      return true;
    }
    if (skillId === 'unique' || (unit.uniqueSkill && unit.uniqueSkill.id === skillId)) {
      unit.reservedSkillId = 'unique';
      return true;
    }
    if (unit.collectSkills.some(function (s) { return s.id === skillId; })) {
      unit.reservedSkillId = skillId;
      return true;
    }
    return false;
  }

  function setSpeed(battleOrSpeed, maybeSpeed) {
    const resolved = resolveBattleArg(battleOrSpeed, maybeSpeed);
    const battle = resolved.battle;
    const spd = resolved.hasBattleArg ? resolved.rest : battleOrSpeed;
    if (!battle) return 1;
    battle.speed = clamp(Math.round(safeNum(spd, 1)), 1, 3);
    return battle.speed;
  }

  function setAutoRepeat(battleOrVal, maybeVal) {
    const resolved = resolveBattleArg(battleOrVal, maybeVal);
    const battle = resolved.battle;
    const val = resolved.hasBattleArg ? resolved.rest : battleOrVal;
    if (!battle) return 0;
    if (typeof val === 'boolean') {
      battle.autoRepeat = val ? 10 : 0;
    } else {
      battle.autoRepeat = Math.max(0, Math.floor(safeNum(val, 0)));
    }
    return battle.autoRepeat;
  }

  function mapUnitSnapshot(battle, u) {
    return {
      id: u.id,
      name: u.name,
      rarity: u.rarity,
      role: u.role,
      side: u.side,
      slot: u.slot,
      isBoss: u.isBoss,
      bossType: u.bossType,
      hp: u.hp,
      maxHp: u.maxHp,
      hpPct: u.maxHp > 0 ? clamp((u.hp / u.maxHp) * 100, 0, 100) : 0,
      shield: u.shield,
      gauge: clamp(u.gauge, 0, 100),
      effSpd: Math.round(getEffectiveSpd(battle, u)),
      buffs: u.buffs.map(function (b) { return { stat: b.stat, value: b.value, duration: b.duration }; }),
      debuffs: u.debuffs.map(function (d) { return { stat: d.stat, value: d.value, duration: d.duration }; }),
      uniqueSkill: u.uniqueSkill ? {
        id: u.uniqueSkill.id,
        name: u.uniqueSkill.name,
        targetType: u.uniqueSkill.targetType,
        cooldown: u.uniqueSkill.cooldown,
        currentCd: u.uniqueSkill.currentCd
      } : null,
      collectSkills: Array.isArray(u.collectSkills) ? u.collectSkills.map(function (s) {
        return {
          id: s.id,
          name: s.name,
          targetType: s.targetType,
          cooldown: s.cooldown,
          currentCd: s.currentCd
        };
      }) : [],
      reservedSkillId: u.reservedSkillId || null,
      tactic: u.tactic ? { policy: u.tactic.policy, target: u.tactic.target, skillPriority: u.tactic.skillPriority } : null,
      activeTelegraph: u.activeTelegraph ? {
        skillId: u.activeTelegraph.skillId,
        skillName: u.activeTelegraph.skillName,
        targetType: u.activeTelegraph.targetType,
        warningText: u.activeTelegraph.warningText,
        remainingTurns: u.activeTelegraph.remainingTurns,
        totalTurns: u.activeTelegraph.totalTurns
      } : null,
      metrics: {
        damageDealt: u.metrics.damageDealt,
        damageTaken: u.metrics.damageTaken,
        healingDone: u.metrics.healingDone,
        healingReceived: u.metrics.healingReceived
      }
    };
  }

  function getSnapshot(maybeBattle) {
    const battle = maybeBattle || activeBattle;
    if (!battle) return null;

    const allies = battle.allies.map(function (a) { return mapUnitSnapshot(battle, a); });
    const enemies = battle.enemies.map(function (e) { return mapUnitSnapshot(battle, e); });

    const bossUnit = enemies.find(function (e) { return e.hp > 0 && e.isBoss; }) || enemies.find(function (e) { return e.isBoss; }) || null;
    const bossTelegraph = bossUnit && bossUnit.activeTelegraph ? bossUnit.activeTelegraph : null;

    const totals = { damageDealt: 0, damageTaken: 0, healingDone: 0, healingReceived: 0 };
    const byUnit = allies.map(function (a) {
      totals.damageDealt += a.metrics.damageDealt;
      totals.damageTaken += a.metrics.damageTaken;
      totals.healingDone += a.metrics.healingDone;
      totals.healingReceived += a.metrics.healingReceived;
      return {
        unitId: a.id,
        name: a.name,
        role: a.role,
        rarity: a.rarity,
        damageDealt: a.metrics.damageDealt,
        damageTaken: a.metrics.damageTaken,
        healingDone: a.metrics.healingDone,
        healingReceived: a.metrics.healingReceived
      };
    });

    const events = battle.events.splice(0, battle.events.length);

    return {
      id: battle.id,
      mode: battle.mode,
      stageId: battle.stageId,
      stageLabel: battle.stageLabel,
      floor: battle.floor,
      raidId: battle.raidId,
      difficultyId: battle.difficultyId,
      trialId: battle.trialId,
      status: battle.status,
      waveIndex: battle.waveIndex,
      totalWaves: battle.waves.length,
      isBossWave: Boolean(battle.waves[battle.waveIndex] && battle.waves[battle.waveIndex].isBossWave),
      turnCount: battle.turnCount,
      elapsedMs: Math.round(battle.elapsedMs),
      speed: battle.speed,
      autoRepeat: battle.autoRepeat,
      globalTactic: battle.globalTactic,
      globalTargetPolicy: battle.globalTargetPolicy,
      allies,
      enemies,
      bossTelegraph,
      timeline: projectTimeline(battle, 8),
      dpsMeters: {
        totals,
        byUnit
      },
      events,
      logs: battle.logs.slice(-12),
      skillUses: Object.assign({}, battle.skillUses)
    };
  }

  function getActiveBattle() {
    return activeBattle;
  }

  IkaiApp.CombatEngine = Object.freeze({
    createBattle,
    step,
    setGlobalTactic,
    setUnitTactic,
    setTactic: setUnitTactic,
    setGlobalTargetPolicy,
    setTargetPriority: setGlobalTargetPolicy,
    reserveSkill,
    setSpeed,
    setAutoRepeat,
    getSnapshot,
    getActiveBattle
  });
})(typeof window !== 'undefined' ? window : globalThis);
