'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});
  const Data = Kairo.data;
  const Sec = Kairo.security;

  const MAX_RELICS = 180;
  const SUMMON_COST_1 = 150;
  const SUMMON_COST_10 = 1500;
  const HARD_PITY = 50;
  const SOFT_PITY_START = 35;
  const MILEAGE_UR_COST = 50;

  let actionLock = false;
  let saveTimer = null;

  function createStarterUnit(id) {
    return {
      id,
      level: 1,
      exp: 0,
      lb: 0,      // limit break 0..5
      stars: 1,   // awakening 1..6
      shards: 0,
      skills: { basic: 1, skill: 1, ult: 1, passive: 1 },
      relics: { weapon: null, armor: null, memory: null, ring: null }
    };
  }

  function createInitialState() {
    const now = Date.now();
    const starters = ['sr_arc_leon', 'sr_cyb_nova', 'sr_yok_sakura', 'r_stm_guard'];
    const units = {};
    starters.forEach((id) => { units[id] = createStarterUnit(id); });

    const starterRelic = Data.generateRelic({ tier: 1, forceRarity: 2, forceSet: 'cross_fusion', forceSlot: 'weapon' });
    starterRelic.equippedBy = 'sr_cyb_nova';
    units['sr_cyb_nova'].relics.weapon = starterRelic.id;

    return {
      schemaVersion: 1,
      createdAt: now,
      lastSavedAt: now,
      commanderRank: 1,
      commanderExp: 0,
      currencies: {
        gems: 1650,     // 星晶（初回10連+α）
        gold: 2500,     // 魂貨
        expPool: 1200,  // 記憶結晶（キャラ経験値プール）
        dust: 180,      // 遺物塵
        cores: 2,       // 覚醒核
        mileage: 0      // 境界結晶（UR交換マイレージ）
      },
      units,
      party: starters.slice(),
      relics: [starterRelic],
      progress: {
        currentStageId: 'st_1_1',
        clearedStages: {},     // stageId -> stars (1..3)
        maxCorridorFloor: 0,
        corridorChallengeFloor: 1
      },
      gacha: {
        banner: 'all',         // all | arcadia | cyber | yokai | steam | astral
        pity: 0,
        lastResults: []
      },
      settings: {
        speed: 2,              // 1 | 2 | 4
        autoLoop: true,
        retryOnDefeat: false,
        tactic: 'balanced',
        autoSalvageRank: 0,    // 0:OFF, 1:白銀以下, 2:蒼玉以下, 3:紫晶以下
        soundEnabled: true,
        soundVolume: 0.45,
        handMode: 'right',     // right | left
        contrastMode: 'normal',// normal | high
        motionMode: 'full'     // full | reduced
      },
      codex: {
        relicSets: { cross_fusion: true },
        enemies: {}
      },
      achievementsClaimed: {},
      stats: {
        totalWins: 0,
        totalDefeats: 0,
        totalKills: 0,
        bossWins: 0,
        maxHitDamage: 0,
        totalSummons: 0,
        totalLimitBreaks: 0,
        totalAwakens: 0,
        totalRelicsFound: 1,
        totalRelicsSalvaged: 0,
        totalReforges: 0,
        fastestClearMs: 0,
        totalPlaySec: 0,
        tamperRecoveries: 0,
        clockAnomalies: 0
      }
    };
  }

  function sanitizeState(raw) {
    const base = createInitialState();
    if (!raw || typeof raw !== 'object') return base;

    base.createdAt = Sec.clampInt(raw.createdAt, 0, Date.now() + 86400000, base.createdAt);
    base.lastSavedAt = Sec.clampInt(raw.lastSavedAt, 0, Date.now() + 86400000, base.lastSavedAt);
    base.commanderRank = Sec.clampInt(raw.commanderRank, 1, 999, 1);
    base.commanderExp = Sec.clampInt(raw.commanderExp, 0, 999999999, 0);

    if (raw.currencies && typeof raw.currencies === 'object') {
      base.currencies.gems = Sec.clampInt(raw.currencies.gems, 0, 99999999, base.currencies.gems);
      base.currencies.gold = Sec.clampInt(raw.currencies.gold, 0, 999999999, base.currencies.gold);
      base.currencies.expPool = Sec.clampInt(raw.currencies.expPool, 0, 999999999, base.currencies.expPool);
      base.currencies.dust = Sec.clampInt(raw.currencies.dust, 0, 99999999, base.currencies.dust);
      base.currencies.cores = Sec.clampInt(raw.currencies.cores, 0, 99999, base.currencies.cores);
      base.currencies.mileage = Sec.clampInt(raw.currencies.mileage, 0, 99999, 0);
    }

    // Relics
    const validRelicIds = new Set();
    if (Array.isArray(raw.relics)) {
      const cleanRelics = [];
      for (let i = 0; i < Math.min(raw.relics.length, MAX_RELICS + 80); i++) {
        const r = raw.relics[i];
        if (!r || typeof r !== 'object' || typeof r.id !== 'string') continue;
        if (!Data.RELIC_SETS[r.setId] || !Data.RELIC_SLOTS[r.slot]) continue;
        if (!r.main || !Data.STAT_META[r.main.stat]) continue;
        const rarity = Sec.clampInt(r.rarity, 1, 5, 1);
        const maxLv = Data.RELIC_RARITIES[rarity].maxLv;
        const subs = [];
        if (Array.isArray(r.subs)) {
          for (let j = 0; j < Math.min(r.subs.length, 4); j++) {
            const s = r.subs[j];
            if (!s || !Data.STAT_META[s.stat]) continue;
            subs.push({
              stat: s.stat,
              val: Sec.clampNumber(s.val, 0.1, 9999, 1),
              grade: ['S', 'A', 'B', 'C'].includes(s.grade) ? s.grade : 'B',
              rolls: Sec.clampInt(s.rolls, 1, 8, 1)
            });
          }
        }
        cleanRelics.push({
          id: r.id.slice(0, 48),
          setId: r.setId,
          slot: r.slot,
          rarity,
          tier: Sec.clampInt(r.tier, 1, 5, 1),
          level: Sec.clampInt(r.level, 0, maxLv, 0),
          locked: Boolean(r.locked),
          equippedBy: typeof r.equippedBy === 'string' && Data.UNIT_MAP[r.equippedBy] ? r.equippedBy : null,
          main: { stat: r.main.stat, base: Sec.clampNumber(r.main.base, 1, 99999, 10) },
          subs
        });
        validRelicIds.add(r.id.slice(0, 48));
      }
      base.relics = cleanRelics;
    }

    // Units
    if (raw.units && typeof raw.units === 'object') {
      const cleanUnits = {};
      for (const uid in raw.units) {
        if (!Object.prototype.hasOwnProperty.call(raw.units, uid) || !Data.UNIT_MAP[uid]) continue;
        const u = raw.units[uid];
        if (!u || typeof u !== 'object') continue;
        const stars = Sec.clampInt(u.stars, 1, Data.RARITIES[Data.UNIT_MAP[uid].rarity].maxStars, 1);
        const maxLv = getMaxLevelForStars(stars);
        const relics = { weapon: null, armor: null, memory: null, ring: null };
        if (u.relics && typeof u.relics === 'object') {
          ['weapon', 'armor', 'memory', 'ring'].forEach((sl) => {
            const rid = u.relics[sl];
            if (typeof rid === 'string' && validRelicIds.has(rid)) {
              relics[sl] = rid;
            }
          });
        }
        cleanUnits[uid] = {
          id: uid,
          level: Sec.clampInt(u.level, 1, maxLv, 1),
          exp: Sec.clampInt(u.exp, 0, 99999999, 0),
          lb: Sec.clampInt(u.lb, 0, 5, 0),
          stars,
          shards: Sec.clampInt(u.shards, 0, 99999, 0),
          skills: {
            basic: Sec.clampInt(u.skills?.basic, 1, 10, 1),
            skill: Sec.clampInt(u.skills?.skill, 1, 10, 1),
            ult: Sec.clampInt(u.skills?.ult, 1, 10, 1),
            passive: Sec.clampInt(u.skills?.passive, 1, 10, 1)
          },
          relics
        };
      }
      if (Object.keys(cleanUnits).length > 0) base.units = cleanUnits;
    }

    // Reconcile relic equippedBy pointers
    base.relics.forEach((rel) => {
      if (rel.equippedBy) {
        const owner = base.units[rel.equippedBy];
        if (!owner || owner.relics[rel.slot] !== rel.id) {
          rel.equippedBy = null;
        }
      }
    });

    // Party
    if (Array.isArray(raw.party)) {
      const p = [];
      for (const uid of raw.party) {
        if (typeof uid === 'string' && base.units[uid] && !p.includes(uid) && p.length < 4) {
          p.push(uid);
        }
      }
      if (p.length > 0) base.party = p;
    }
    if (base.party.length === 0) {
      base.party = Object.keys(base.units).slice(0, 4);
    }

    // Progress
    if (raw.progress && typeof raw.progress === 'object') {
      base.progress.currentStageId = typeof raw.progress.currentStageId === 'string' ? raw.progress.currentStageId.slice(0, 32) : 'st_1_1';
      base.progress.maxCorridorFloor = Sec.clampInt(raw.progress.maxCorridorFloor, 0, 9999, 0);
      base.progress.corridorChallengeFloor = Sec.clampInt(raw.progress.corridorChallengeFloor, 1, base.progress.maxCorridorFloor + 1, 1);
      if (raw.progress.clearedStages && typeof raw.progress.clearedStages === 'object') {
        const cs = {};
        for (const sid in raw.progress.clearedStages) {
          if (Object.prototype.hasOwnProperty.call(raw.progress.clearedStages, sid)) {
            cs[sid.slice(0, 32)] = Sec.clampInt(raw.progress.clearedStages[sid], 1, 3, 1);
          }
        }
        base.progress.clearedStages = cs;
      }
    }

    // Gacha
    if (raw.gacha && typeof raw.gacha === 'object') {
      base.gacha.banner = (raw.gacha.banner === 'all' || Data.REALMS[raw.gacha.banner]) ? raw.gacha.banner : 'all';
      base.gacha.pity = Sec.clampInt(raw.gacha.pity, 0, HARD_PITY, 0);
    }

    // Settings
    if (raw.settings && typeof raw.settings === 'object') {
      base.settings.speed = [1, 2, 4].includes(raw.settings.speed) ? raw.settings.speed : 2;
      base.settings.autoLoop = raw.settings.autoLoop !== false;
      base.settings.retryOnDefeat = Boolean(raw.settings.retryOnDefeat);
      base.settings.tactic = Data.TACTICS[raw.settings.tactic] ? raw.settings.tactic : 'balanced';
      base.settings.autoSalvageRank = Sec.clampInt(raw.settings.autoSalvageRank, 0, 3, 0);
      base.settings.soundEnabled = raw.settings.soundEnabled !== false;
      base.settings.soundVolume = Sec.clampNumber(raw.settings.soundVolume, 0, 1, 0.45);
      base.settings.handMode = raw.settings.handMode === 'left' ? 'left' : 'right';
      base.settings.contrastMode = raw.settings.contrastMode === 'high' ? 'high' : 'normal';
      base.settings.motionMode = raw.settings.motionMode === 'reduced' ? 'reduced' : 'full';
    }

    // Codex
    if (raw.codex && typeof raw.codex === 'object') {
      if (raw.codex.relicSets && typeof raw.codex.relicSets === 'object') {
        for (const k in raw.codex.relicSets) {
          if (Data.RELIC_SETS[k]) base.codex.relicSets[k] = true;
        }
      }
      if (raw.codex.enemies && typeof raw.codex.enemies === 'object') {
        for (const k in raw.codex.enemies) {
          if (Object.prototype.hasOwnProperty.call(raw.codex.enemies, k)) {
            base.codex.enemies[k.slice(0, 48)] = Sec.clampInt(raw.codex.enemies[k], 1, 9999999, 1);
          }
        }
      }
    }

    // Achievements
    if (raw.achievementsClaimed && typeof raw.achievementsClaimed === 'object') {
      for (const k in raw.achievementsClaimed) {
        if (Object.prototype.hasOwnProperty.call(raw.achievementsClaimed, k) && raw.achievementsClaimed[k]) {
          base.achievementsClaimed[k.slice(0, 40)] = true;
        }
      }
    }

    // Stats
    if (raw.stats && typeof raw.stats === 'object') {
      for (const k in base.stats) {
        if (Object.prototype.hasOwnProperty.call(raw.stats, k)) {
          base.stats[k] = Sec.clampInt(raw.stats[k], 0, 999999999, base.stats[k]);
        }
      }
    }

    return base;
  }

  function getMaxLevelForStars(stars) {
    return 20 + (stars - 1) * 16; // ★1:20, ★2:36, ★3:52, ★4:68, ★5:84, ★6:100
  }

  function getLevelUpCost(level) {
    const exp = Math.round(55 * Math.pow(1.135, level - 1));
    const gold = Math.round(45 * Math.pow(1.125, level - 1));
    return { exp, gold };
  }

  function previewLevelUp(stateObj, unitId, steps) {
    const inst = stateObj.units[unitId];
    if (!inst) return { gained: 0, targetLevel: 1, exp: 0, gold: 0, canAfford: false };
    const maxLv = getMaxLevelForStars(inst.stars);
    const limit = steps === 'max' ? 100 : Sec.clampInt(steps, 1, 100, 1);
    let lv = inst.level;
    let totalExp = 0;
    let totalGold = 0;
    let gained = 0;

    while (gained < limit && lv < maxLv) {
      const c = getLevelUpCost(lv);
      if (stateObj.currencies.expPool < totalExp + c.exp || stateObj.currencies.gold < totalGold + c.gold) {
        if (gained === 0) {
          return { gained: 0, targetLevel: Math.min(maxLv, lv + 1), exp: c.exp, gold: c.gold, canAfford: false };
        }
        break;
      }
      totalExp += c.exp;
      totalGold += c.gold;
      lv++;
      gained++;
    }
    return { gained, targetLevel: lv, exp: totalExp, gold: totalGold, canAfford: gained > 0 };
  }

  function previewBulkSalvage(stateObj, maxRank) {
    let count = 0;
    let dust = 0;
    for (const r of stateObj.relics) {
      if (!r.locked && !r.equippedBy && r.rarity <= maxRank) {
        count++;
        dust += Data.RELIC_RARITIES[r.rarity].salvageDust + r.level * 8;
      }
    }
    return { count, dust };
  }

  function getLimitBreakShardCost(lb) {
    return [20, 35, 50, 75, 100][lb] || 999;
  }

  function getAwakenCost(stars) {
    return {
      cores: stars,
      gold: 800 * stars * stars
    };
  }

  function getSkillUpgradeCost(skLv) {
    return {
      gold: Math.round(350 * Math.pow(1.45, skLv - 1)),
      dust: Math.round(18 * Math.pow(1.38, skLv - 1))
    };
  }

  // Compute full unit stats including level, LB, awakening, relics, set bonuses, and codex bonuses
  function computeUnitStats(state, unitId) {
    const def = Data.UNIT_MAP[unitId];
    const inst = state.units[unitId];
    if (!def || !inst) return null;

    const lvScale = 1 + (inst.level - 1) * 0.088 + Math.pow(Math.max(0, inst.level - 1), 1.35) * 0.008;
    const lbScale = 1 + inst.lb * 0.11;
    const starScale = 1 + (inst.stars - 1) * 0.14;
    const totalMult = lvScale * lbScale * starScale;

    let hp = def.base.hp * totalMult;
    let atk = def.base.atk * totalMult;
    let defVal = def.base.def * totalMult;
    let spd = def.base.spd + (inst.stars - 1) * 2 + inst.lb;
    let crit = def.base.crit + inst.lb * 1.2;
    let cdmg = def.base.cdmg + inst.lb * 4;

    const mods = {
      atkPct: 0, hpPct: 0, defPct: 0, spdPct: 0,
      atkFlat: 0, hpFlat: 0, spdFlat: 0,
      critPct: 0, cdmgPct: 0, spGainPct: 0,
      startSp: 0, ultPct: 0, dmgPct: 0, penPct: 0,
      dmgRed: 0, lifesteal: 0, regenSelf: 0, rampSelf: 0, healBonus: 0
    };

    // Passive self mods
    const p = def.passive || {};
    if (p.dmgPct) mods.dmgPct += p.dmgPct + inst.lb * 5;
    if (p.cdmgPct) mods.cdmgPct += p.cdmgPct + inst.lb * 8;
    if (p.hpPct) mods.hpPct += p.hpPct;
    if (p.defPct) mods.defPct += p.defPct;
    if (p.spdPct) mods.spdPct += p.spdPct;
    if (p.critPct) mods.critPct += p.critPct;
    if (p.spGainPct) mods.spGainPct += p.spGainPct;
    if (p.startSp) mods.startSp += p.startSp;
    if (p.ultPct) mods.ultPct += p.ultPct + inst.lb * 7;
    if (p.penPct) mods.penPct += p.penPct;
    if (p.dmgRed) mods.dmgRed += p.dmgRed;
    if (p.lifesteal) mods.lifesteal += p.lifesteal;
    if (p.regenSelf) mods.regenSelf += p.regenSelf;
    if (p.rampSelf) mods.rampSelf += p.rampSelf;
    if (p.healBonus) mods.healBonus += p.healBonus;

    // Relics + set bonuses
    const setCounts = Object.create(null);
    const equippedRelics = [];
    ['weapon', 'armor', 'memory', 'ring'].forEach((sl) => {
      const rid = inst.relics[sl];
      if (!rid) return;
      const rel = state.relics.find((x) => x.id === rid);
      if (!rel) return;
      equippedRelics.push(rel);
      setCounts[rel.setId] = (setCounts[rel.setId] || 0) + 1;
      const mainVal = Data.getRelicMainValue(rel);
      if (mods[rel.main.stat] !== undefined) mods[rel.main.stat] += mainVal;
      rel.subs.forEach((s) => {
        if (mods[s.stat] !== undefined) mods[s.stat] += s.val;
      });
    });

    const activeSets = [];
    for (const sid in setCounts) {
      const c = setCounts[sid];
      const sDef = Data.RELIC_SETS[sid];
      if (!sDef) continue;
      if (c >= 2) {
        activeSets.push({ id: sid, name: sDef.name, pieces: c >= 4 ? 4 : 2, color: sDef.color });
        for (const k in sDef.two.stat) mods[k] = (mods[k] || 0) + sDef.two.stat[k];
      }
      if (c >= 4) {
        for (const k in sDef.four.stat) mods[k] = (mods[k] || 0) + sDef.four.stat[k];
      }
    }

    // Codex global permanent bonuses
    const codexBonus = Data.computeCodexBonuses(state);
    mods.atkPct += codexBonus.atkPct;
    mods.hpPct += codexBonus.hpPct;
    mods.defPct += codexBonus.defPct;

    const finalHp = Math.round(hp * (1 + mods.hpPct / 100) + mods.hpFlat);
    const finalAtk = Math.round(atk * (1 + mods.atkPct / 100) + mods.atkFlat);
    const finalDef = Math.round(defVal * (1 + mods.defPct / 100));
    const finalSpd = Math.round((spd + mods.spdFlat) * (1 + mods.spdPct / 100));
    const finalCrit = Math.min(100, Math.round((crit + mods.critPct) * 10) / 10);
    const finalCdmg = Math.round((cdmg + mods.cdmgPct) * 10) / 10;

    const power = Math.round(
      finalHp * 0.28 +
      finalAtk * 2.85 +
      finalDef * 1.9 +
      finalSpd * 4.5 +
      finalCrit * 14 +
      (finalCdmg - 150) * 6 +
      (inst.skills.basic + inst.skills.skill + inst.skills.ult + inst.skills.passive) * 35
    );

    return {
      hp: finalHp,
      atk: finalAtk,
      def: finalDef,
      spd: finalSpd,
      crit: finalCrit,
      cdmg: finalCdmg,
      power,
      mods,
      activeSets,
      equippedRelics
    };
  }

  function computePartySynergy(state) {
    const realms = state.party.map((uid) => Data.UNIT_MAP[uid]?.realm).filter(Boolean);
    return Data.evaluatePartySynergies(realms);
  }

  function computePartyPower(state) {
    const syn = computePartySynergy(state);
    const synMult = 1 + (syn.bonuses.atkPct + syn.bonuses.hpPct + syn.bonuses.defPct) / 280;
    let total = 0;
    state.party.forEach((uid) => {
      const st = computeUnitStats(state, uid);
      if (st) total += st.power;
    });
    return Math.round(total * synMult);
  }

  function getAchievementProgress(state, ach) {
    switch (ach.metric) {
      case 'campaignClearedCount':
        return Data.CAMPAIGN_STAGES.filter((s) => state.progress.clearedStages[s.id]).length;
      case 'maxCorridorFloor':
        return state.progress.maxCorridorFloor || 0;
      case 'ownedUnitsCount':
        return Object.keys(state.units).length;
      case 'ownedUrCount':
        return Object.keys(state.units).filter((id) => Data.UNIT_MAP[id]?.rarity === 'UR').length;
      case 'maxUnitLevel':
        return Object.values(state.units).reduce((m, u) => Math.max(m, u.level), 1);
      case 'maxRelicLevel':
        return state.relics.reduce((m, r) => Math.max(m, r.level), 0);
      default:
        return state.stats[ach.metric] || 0;
    }
  }

  function getClaimableAchievements(state) {
    return Data.ACHIEVEMENTS.filter((a) => !state.achievementsClaimed[a.id] && getAchievementProgress(state, a) >= a.target);
  }

  // --- Store & Transactional Actions ---
  const listeners = new Set();
  let state = createInitialState();
  let lastTamperNotice = false;
  let pendingOfflineReport = null;

  function emit(reason) {
    listeners.forEach((fn) => {
      try { fn(state, reason); } catch (_e) {}
    });
  }

  function scheduleSave(immediate) {
    state.lastSavedAt = Date.now();
    if (saveTimer) clearTimeout(saveTimer);
    if (immediate) {
      Sec.StorageVault.save(state).catch(() => {});
      return;
    }
    saveTimer = setTimeout(() => {
      Sec.StorageVault.save(state).catch(() => {});
    }, 350);
  }

  function withLock(fn) {
    if (actionLock) return { ok: false, msg: '処理中です' };
    actionLock = true;
    try {
      return fn();
    } finally {
      actionLock = false;
    }
  }

  function addCommanderExp(amount) {
    state.commanderExp += Math.max(0, Math.floor(amount));
    let leveled = false;
    while (state.commanderExp >= state.commanderRank * 260) {
      state.commanderExp -= state.commanderRank * 260;
      state.commanderRank++;
      state.currencies.gems += 80;
      leveled = true;
    }
    return leveled;
  }

  function addRelicWithFilter(relic) {
    state.stats.totalRelicsFound++;
    state.codex.relicSets[relic.setId] = true;

    const filterRank = state.settings.autoSalvageRank || 0;
    if (filterRank > 0 && relic.rarity <= filterRank) {
      const dust = Data.RELIC_RARITIES[relic.rarity].salvageDust;
      state.currencies.dust += dust;
      state.stats.totalRelicsSalvaged++;
      return { kept: false, autoSalvaged: true, dust, relic };
    }

    // If inventory full, auto-salvage lowest unlocked unequipped relic or current if weaker
    const unequippedCount = state.relics.filter((r) => !r.equippedBy).length;
    if (unequippedCount >= MAX_RELICS) {
      const dust = Data.RELIC_RARITIES[relic.rarity].salvageDust;
      state.currencies.dust += dust;
      state.stats.totalRelicsSalvaged++;
      return { kept: false, overflowSalvaged: true, dust, relic };
    }

    state.relics.unshift(relic);
    return { kept: true, relic };
  }

  const Store = {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    isTamperRecovered: () => lastTamperNotice,
    getPendingOfflineReport: () => pendingOfflineReport,
    clearPendingOfflineReport() {
      pendingOfflineReport = null;
      emit('offlineCleared');
    },

    async init() {
      Sec.StorageVault.requestPersistence().catch(() => {});
      const loaded = await Sec.StorageVault.load();
      if (loaded.found && loaded.data) {
        const prevSaved = loaded.data.lastSavedAt || Date.now();
        state = sanitizeState(loaded.data);
        if (loaded.tampered) {
          lastTamperNotice = true;
          state.stats.tamperRecoveries++;
        }
        // Compute offline rewards safely
        const evalTime = Sec.evaluateOfflineElapsed(prevSaved, Date.now());
        if (evalTime.anomaly) {
          state.stats.clockAnomalies++;
        }
        if (evalTime.elapsedMs >= 60 * 1000) {
          pendingOfflineReport = this.buildOfflineReport(evalTime.elapsedMs, evalTime.capped);
        }
      } else {
        state = createInitialState();
        if (loaded.tampered) {
          lastTamperNotice = true;
          state.stats.tamperRecoveries++;
        }
        await Sec.StorageVault.save(state);
      }
      Kairo.audio.setEnabled(state.settings.soundEnabled);
      Kairo.audio.setVolume(state.settings.soundVolume);
      emit('init');
      return state;
    },

    buildOfflineReport(elapsedMs, capped) {
      const minutes = Math.floor(elapsedMs / 60000);
      // Determine highest cleared campaign stage for rate calculation
      let bestStage = Data.CAMPAIGN_STAGES[0];
      for (const s of Data.CAMPAIGN_STAGES) {
        if (state.progress.clearedStages[s.id]) bestStage = s;
      }
      const cycles = Math.max(1, Math.floor(minutes * 1.4));
      const gold = Math.round(bestStage.rewards.gold * cycles * 0.65);
      const exp = Math.round(bestStage.rewards.exp * cycles * 0.65);
      const dust = Math.round(bestStage.rewards.dust * cycles * 0.45);
      const gems = Math.min(900, Math.round(bestStage.rewards.gemLoop * Math.min(cycles, 45) * 0.4));
      const relicRolls = Math.min(8, Math.floor(minutes / 18));
      return {
        elapsedMs,
        minutes,
        capped,
        stageName: `${bestStage.code} ${bestStage.name}`,
        stage: bestStage,
        gold, exp, dust, gems, relicRolls
      };
    },

    claimOfflineRewards() {
      return withLock(() => {
        if (!pendingOfflineReport) return { ok: false };
        const rep = pendingOfflineReport;
        state.currencies.gold += rep.gold;
        state.currencies.expPool += rep.exp;
        state.currencies.dust += rep.dust;
        state.currencies.gems += rep.gems;
        const foundRelics = [];
        let salvagedDust = 0;
        for (let i = 0; i < rep.relicRolls; i++) {
          const r = Data.generateRelic({ tier: rep.stage.relicTier, sets: rep.stage.relicSets });
          const res = addRelicWithFilter(r);
          if (res.kept) foundRelics.push(r);
          else salvagedDust += res.dust;
        }
        pendingOfflineReport = null;
        scheduleSave(true);
        Kairo.audio.play('win');
        emit('offlineClaimed');
        return { ok: true, foundRelics, salvagedDust };
      });
    },

    // --- Stage & Battle Rewards ---
    setStage(stageId) {
      const stage = Data.getStageById(stageId);
      if (!stage) return false;
      state.progress.currentStageId = stage.id;
      scheduleSave();
      emit('stageChanged');
      return true;
    },

    recordBattleWin(stage, stars, durationMs, enemiesKilled, maxHit) {
      const isFirst = !state.progress.clearedStages[stage.id];
      const prevStars = state.progress.clearedStages[stage.id] || 0;
      state.progress.clearedStages[stage.id] = Math.max(prevStars, stars);

      const codexBonus = Data.computeCodexBonuses(state);
      const dropMult = 1 + codexBonus.dropPct / 100;

      const gold = Math.round(stage.rewards.gold * (0.95 + Math.random() * 0.12));
      const exp = Math.round(stage.rewards.exp * (0.95 + Math.random() * 0.12));
      const dust = Math.round(stage.rewards.dust * (0.9 + Math.random() * 0.2));
      let gems = stage.rewards.gemLoop + (isFirst ? stage.rewards.gemFirst : 0);
      let cores = 0;
      if (stage.rewards.coreChance && Math.random() < stage.rewards.coreChance * dropMult) {
        cores = 1;
      }

      state.currencies.gold += gold;
      state.currencies.expPool += exp;
      state.currencies.dust += dust;
      state.currencies.gems += gems;
      state.currencies.cores += cores;
      addCommanderExp(Math.round(exp * 0.4));

      // Relic drop (62% base * codex drop bonus, 100% on boss raids / corridor bosses)
      const droppedRelics = [];
      let autoSalvagedCount = 0;
      let autoSalvagedDust = 0;
      const dropChance = stage.guaranteedMinRarity ? 1.0 : Math.min(0.95, 0.62 * dropMult);
      const rollCount = stage.guaranteedMinRarity ? 2 : 1;
      for (let i = 0; i < rollCount; i++) {
        if (Math.random() < dropChance) {
          const rel = Data.generateRelic({
            tier: stage.relicTier || 1,
            sets: stage.relicSets,
            minRarity: stage.guaranteedMinRarity || 1
          });
          const res = addRelicWithFilter(rel);
          if (res.kept) droppedRelics.push(rel);
          else {
            autoSalvagedCount++;
            autoSalvagedDust += res.dust;
          }
        }
      }

      // Corridor advancement
      if (stage.isCorridor) {
        if (stage.floor > state.progress.maxCorridorFloor) {
          state.progress.maxCorridorFloor = stage.floor;
        }
        state.progress.corridorChallengeFloor = stage.floor + 1;
      }

      // Stats & enemy codex
      state.stats.totalWins++;
      if (stage.id.startsWith('boss_')) state.stats.bossWins++;
      state.stats.totalKills += enemiesKilled.length;
      if (maxHit > state.stats.maxHitDamage) state.stats.maxHitDamage = maxHit;
      if (durationMs > 0 && (state.stats.fastestClearMs === 0 || durationMs < state.stats.fastestClearMs)) {
        state.stats.fastestClearMs = Math.round(durationMs);
      }
      enemiesKilled.forEach((ename) => {
        state.codex.enemies[ename] = (state.codex.enemies[ename] || 0) + 1;
      });

      scheduleSave();
      emit('battleWin');

      return {
        isFirst, stars, gold, exp, dust, gems, cores,
        droppedRelics, autoSalvagedCount, autoSalvagedDust
      };
    },

    recordBattleDefeat(maxHit) {
      state.stats.totalDefeats++;
      if (maxHit > state.stats.maxHitDamage) state.stats.maxHitDamage = maxHit;
      scheduleSave();
      emit('battleDefeat');
    },

    sweepStage(stageId, times) {
      return withLock(() => {
        const stage = Data.getStageById(stageId);
        if (!stage || (state.progress.clearedStages[stage.id] || 0) < 3) {
          return { ok: false, msg: '星3達成済み領域で実行できます' };
        }
        const n = Sec.clampInt(times, 1, 10, 10);
        let gold = 0, exp = 0, dust = 0, gems = 0, cores = 0, kept = 0, salvaged = 0, maxRarity = 0;
        for (let i = 0; i < n; i++) {
          const enemies = [];
          stage.waves.forEach((w) => w.forEach((e) => enemies.push(e.name)));
          const r = this.recordBattleWin(stage, 3, 0, enemies, 0);
          gold += r.gold; exp += r.exp; dust += r.dust; gems += r.gems; cores += r.cores;
          kept += r.droppedRelics.length;
          salvaged += r.autoSalvagedCount;
          r.droppedRelics.forEach((rel) => { if (rel.rarity > maxRarity) maxRarity = rel.rarity; });
        }
        scheduleSave(true);
        Kairo.audio.play(maxRarity >= 4 ? 'dropRare' : 'win');
        emit('sweepDone');
        return { ok: true, times: n, gold, exp, dust, gems, cores, kept, salvaged, maxRarity };
      });
    },

    // --- Party & Unit Growth ---
    togglePartyMember(unitId) {
      return withLock(() => {
        if (!state.units[unitId]) return { ok: false };
        const idx = state.party.indexOf(unitId);
        if (idx >= 0) {
          if (state.party.length <= 1) return { ok: false, msg: '最低1体の出撃が必要です' };
          state.party.splice(idx, 1);
        } else {
          if (state.party.length >= 4) {
            state.party[3] = unitId;
          } else {
            state.party.push(unitId);
          }
        }
        scheduleSave();
        Kairo.audio.play('confirm');
        emit('partyChanged');
        return { ok: true };
      });
    },

    autoAssembleParty() {
      return withLock(() => {
        const owned = Object.keys(state.units);
        // Score units by power and reward realm diversity
        const scored = owned.map((id) => ({ id, power: computeUnitStats(state, id).power, realm: Data.UNIT_MAP[id].realm, role: Data.UNIT_MAP[id].role }));
        scored.sort((a, b) => b.power - a.power);

        const picked = [];
        const usedRealms = new Set();
        // Prefer strongest healer/support if high power, then top power diverse realms
        const bestSupport = scored.find((u) => u.role === 'support');
        if (bestSupport) {
          picked.push(bestSupport.id);
          usedRealms.add(bestSupport.realm);
        }
        for (const u of scored) {
          if (picked.length >= 4) break;
          if (!picked.includes(u.id) && !usedRealms.has(u.realm)) {
            picked.push(u.id);
            usedRealms.add(u.realm);
          }
        }
        for (const u of scored) {
          if (picked.length >= 4) break;
          if (!picked.includes(u.id)) picked.push(u.id);
        }
        state.party = picked;
        scheduleSave();
        Kairo.audio.play('confirm');
        emit('partyChanged');
        return { ok: true };
      });
    },

    levelUpUnit(unitId, steps) {
      return withLock(() => {
        const inst = state.units[unitId];
        if (!inst) return { ok: false, msg: '未所持の英雄です' };
        const maxLv = getMaxLevelForStars(inst.stars);
        if (inst.level >= maxLv) return { ok: false, msg: '覚醒でレベル上限を解放してください' };

        let gained = 0;
        const limit = steps === 'max' ? 100 : Sec.clampInt(steps, 1, 100, 1);
        while (gained < limit && inst.level < maxLv) {
          const cost = getLevelUpCost(inst.level);
          if (state.currencies.expPool < cost.exp || state.currencies.gold < cost.gold) break;
          state.currencies.expPool -= cost.exp;
          state.currencies.gold -= cost.gold;
          inst.level++;
          gained++;
        }
        if (gained === 0) {
          Kairo.audio.play('error');
          return { ok: false, msg: '記憶結晶または魂貨が不足しています' };
        }
        scheduleSave();
        Kairo.audio.play('levelUp');
        emit('unitGrown');
        return { ok: true, gained, level: inst.level };
      });
    },

    limitBreakUnit(unitId) {
      return withLock(() => {
        const inst = state.units[unitId];
        if (!inst) return { ok: false };
        if (inst.lb >= 5) return { ok: false, msg: '限界突破は最大です' };
        const need = getLimitBreakShardCost(inst.lb);
        if (inst.shards < need) {
          Kairo.audio.play('error');
          return { ok: false, msg: `魂片が${need - inst.shards}不足しています` };
        }
        inst.shards -= need;
        inst.lb++;
        state.stats.totalLimitBreaks++;
        scheduleSave(true);
        Kairo.audio.play('summonSSR');
        emit('unitGrown');
        return { ok: true, lb: inst.lb };
      });
    },

    awakenUnit(unitId) {
      return withLock(() => {
        const inst = state.units[unitId];
        if (!inst) return { ok: false };
        const maxStars = Data.RARITIES[Data.UNIT_MAP[unitId].rarity].maxStars;
        if (inst.stars >= maxStars) return { ok: false, msg: '最大覚醒済みです' };
        const cost = getAwakenCost(inst.stars);
        if (state.currencies.cores < cost.cores || state.currencies.gold < cost.gold) {
          Kairo.audio.play('error');
          return { ok: false, msg: `覚醒核${cost.cores}・魂貨${cost.gold}が必要です` };
        }
        state.currencies.cores -= cost.cores;
        state.currencies.gold -= cost.gold;
        inst.stars++;
        state.stats.totalAwakens++;
        scheduleSave(true);
        Kairo.audio.play('summonUR');
        emit('unitGrown');
        return { ok: true, stars: inst.stars };
      });
    },

    upgradeSkill(unitId, skillKey) {
      return withLock(() => {
        const inst = state.units[unitId];
        if (!inst || !inst.skills[skillKey]) return { ok: false };
        const cur = inst.skills[skillKey];
        if (cur >= 10) return { ok: false, msg: '最大レベルです' };
        const cost = getSkillUpgradeCost(cur);
        if (state.currencies.gold < cost.gold || state.currencies.dust < cost.dust) {
          Kairo.audio.play('error');
          return { ok: false, msg: `魂貨${cost.gold}・遺物塵${cost.dust}が必要です` };
        }
        state.currencies.gold -= cost.gold;
        state.currencies.dust -= cost.dust;
        inst.skills[skillKey]++;
        scheduleSave();
        Kairo.audio.play('levelUp');
        emit('unitGrown');
        return { ok: true, level: inst.skills[skillKey] };
      });
    },

    // --- Gacha / Summoning ---
    setGachaBanner(bannerId) {
      if (bannerId !== 'all' && !Data.REALMS[bannerId]) return false;
      state.gacha.banner = bannerId;
      scheduleSave();
      Kairo.audio.play('tap');
      emit('gachaChanged');
      return true;
    },

    performSummon(count) {
      return withLock(() => {
        const n = count === 10 ? 10 : 1;
        const cost = n === 10 ? SUMMON_COST_10 : SUMMON_COST_1;
        if (state.currencies.gems < cost) {
          Kairo.audio.play('error');
          return { ok: false, msg: `星晶が${cost - state.currencies.gems}不足しています` };
        }
        state.currencies.gems -= cost;

        const banner = state.gacha.banner;
        const results = [];
        let bestRank = 1;

        for (let i = 0; i < n; i++) {
          state.gacha.pity++;
          state.currencies.mileage++;
          state.stats.totalSummons++;

          // Soft & Hard pity calculation
          let urRate = Data.RARITIES.UR.rate;
          if (state.gacha.pity >= HARD_PITY) {
            urRate = 1.0;
          } else if (state.gacha.pity >= SOFT_PITY_START) {
            urRate += (state.gacha.pity - SOFT_PITY_START + 1) * 0.045;
          }

          let rarity = 'R';
          const roll = Math.random();
          if (roll < urRate) {
            rarity = 'UR';
            state.gacha.pity = 0;
          } else if (roll < urRate + Data.RARITIES.SSR.rate) {
            rarity = 'SSR';
          } else if (roll < urRate + Data.RARITIES.SSR.rate + Data.RARITIES.SR.rate || (n === 10 && i === 9 && bestRank < 2)) {
            rarity = 'SR';
          } else {
            rarity = 'R';
          }

          // Weighted realm selection for pickup banner
          const pool = Data.UNITS.filter((u) => u.rarity === rarity);
          const weights = pool.map((u) => (banner !== 'all' && u.realm === banner) ? 2.8 : 1.0);
          const wSum = weights.reduce((a, b) => a + b, 0);
          let rw = Math.random() * wSum;
          let picked = pool[0];
          for (let j = 0; j < pool.length; j++) {
            rw -= weights[j];
            if (rw <= 0) { picked = pool[j]; break; }
          }

          const rank = Data.RARITIES[rarity].rank;
          if (rank > bestRank) bestRank = rank;

          const isNew = !state.units[picked.id];
          let bonusText = '新規契約';
          if (isNew) {
            state.units[picked.id] = createStarterUnit(picked.id);
          } else {
            const inst = state.units[picked.id];
            const sh = Data.RARITIES[rarity].shardValue;
            if (inst.lb >= 5) {
              const dust = sh * 3;
              state.currencies.dust += dust;
              if (rarity === 'UR' || rarity === 'SSR') state.currencies.cores += 1;
              bonusText = `完凸変換:塵+${dust}`;
            } else {
              inst.shards += sh;
              bonusText = `魂片+${sh}`;
            }
          }

          results.push({
            unitId: picked.id,
            rarity,
            isNew,
            bonusText
          });
        }

        state.gacha.lastResults = results;
        scheduleSave(true);
        Kairo.audio.play(bestRank >= 4 ? 'summonUR' : bestRank === 3 ? 'summonSSR' : 'summonStart');
        emit('summonDone');
        return { ok: true, results, bestRank };
      });
    },

    exchangeMileageUR(unitId) {
      return withLock(() => {
        const def = Data.UNIT_MAP[unitId];
        if (!def || def.rarity !== 'UR') return { ok: false, msg: '対象外です' };
        if (state.currencies.mileage < MILEAGE_UR_COST) {
          Kairo.audio.play('error');
          return { ok: false, msg: `境界結晶が${MILEAGE_UR_COST}個必要です` };
        }
        state.currencies.mileage -= MILEAGE_UR_COST;
        const isNew = !state.units[unitId];
        if (isNew) {
          state.units[unitId] = createStarterUnit(unitId);
        } else {
          state.units[unitId].shards += 60;
        }
        state.gacha.lastResults = [{ unitId, rarity: 'UR', isNew, bonusText: isNew ? '結晶契約' : '魂片+60' }];
        scheduleSave(true);
        Kairo.audio.play('summonUR');
        emit('summonDone');
        return { ok: true, isNew };
      });
    },

    // --- Relic Management & Hack-and-Slash Crafting ---
    equipRelic(unitId, relicId) {
      return withLock(() => {
        const inst = state.units[unitId];
        const rel = state.relics.find((r) => r.id === relicId);
        if (!inst || !rel) return { ok: false };

        // Detach from previous owner if any
        if (rel.equippedBy && state.units[rel.equippedBy]) {
          state.units[rel.equippedBy].relics[rel.slot] = null;
        }
        // Detach existing relic in target slot
        const oldId = inst.relics[rel.slot];
        if (oldId) {
          const oldRel = state.relics.find((r) => r.id === oldId);
          if (oldRel) oldRel.equippedBy = null;
        }
        inst.relics[rel.slot] = rel.id;
        rel.equippedBy = unitId;
        scheduleSave();
        Kairo.audio.play('confirm');
        emit('relicChanged');
        return { ok: true };
      });
    },

    unequipRelic(unitId, slot) {
      return withLock(() => {
        const inst = state.units[unitId];
        if (!inst || !inst.relics[slot]) return { ok: false };
        const rel = state.relics.find((r) => r.id === inst.relics[slot]);
        if (rel) rel.equippedBy = null;
        inst.relics[slot] = null;
        scheduleSave();
        Kairo.audio.play('tap');
        emit('relicChanged');
        return { ok: true };
      });
    },

    autoEquipUnit(unitId) {
      return withLock(() => {
        const inst = state.units[unitId];
        const def = Data.UNIT_MAP[unitId];
        if (!inst || !def) return { ok: false };
        const rolePriority = Data.ROLES[def.role]?.priority || ['atk', 'hp', 'spd'];

        const scoreForUnit = (rel) => {
          let sc = Data.getRelicScore(rel);
          const ms = rel.main.stat;
          if (rolePriority.some((p) => ms.toLowerCase().includes(p))) sc += 32;
          rel.subs.forEach((s) => {
            if (rolePriority.some((p) => s.stat.toLowerCase().includes(p))) sc += 14;
          });
          return sc;
        };

        let equippedCount = 0;
        ['weapon', 'armor', 'memory', 'ring'].forEach((slot) => {
          const candidates = state.relics.filter((r) => r.slot === slot && (!r.equippedBy || r.equippedBy === unitId));
          if (candidates.length === 0) return;
          candidates.sort((a, b) => scoreForUnit(b) - scoreForUnit(a));
          const best = candidates[0];
          const oldId = inst.relics[slot];
          if (oldId !== best.id) {
            if (oldId) {
              const oldRel = state.relics.find((r) => r.id === oldId);
              if (oldRel) oldRel.equippedBy = null;
            }
            inst.relics[slot] = best.id;
            best.equippedBy = unitId;
            equippedCount++;
          }
        });

        scheduleSave();
        Kairo.audio.play('confirm');
        emit('relicChanged');
        return { ok: true, equippedCount };
      });
    },

    upgradeRelic(relicId, steps) {
      return withLock(() => {
        const rel = state.relics.find((r) => r.id === relicId);
        if (!rel) return { ok: false };
        const rMeta = Data.RELIC_RARITIES[rel.rarity];
        if (rel.level >= rMeta.maxLv) return { ok: false, msg: '最大強化済みです' };

        let gained = 0;
        const limit = Sec.clampInt(steps, 1, 15, 1);
        while (gained < limit && rel.level < rMeta.maxLv) {
          const dustCost = Math.round((12 + rel.level * 8) * rMeta.mult);
          const goldCost = Math.round((90 + rel.level * 65) * rMeta.mult);
          if (state.currencies.dust < dustCost || state.currencies.gold < goldCost) break;
          state.currencies.dust -= dustCost;
          state.currencies.gold -= goldCost;
          rel.level++;
          gained++;

          // Every 3 levels: boost a random substat (or add one if < 4)
          if (rel.level % 3 === 0) {
            if (rel.subs.length < 4) {
              const used = new Set([rel.main.stat, ...rel.subs.map((s) => s.stat)]);
              rel.subs.push(Data.rollSubStat(rel.tier, rel.rarity, used));
            } else {
              const target = rel.subs[Math.floor(Math.random() * rel.subs.length)];
              const meta = Data.STAT_META[target.stat];
              const inc = (meta.subMin + (meta.subMax - meta.subMin) * (0.4 + Math.random() * 0.6)) * (0.55 + rel.rarity * 0.1);
              target.val = meta.suffix === '%' ? Math.round((target.val + inc) * 10) / 10 : Math.round(target.val + Math.max(1, inc));
              target.rolls = (target.rolls || 1) + 1;
              if (target.rolls >= 3 && target.grade !== 'S') target.grade = 'S';
            }
          }
        }
        if (gained === 0) {
          Kairo.audio.play('error');
          return { ok: false, msg: '遺物塵または魂貨が不足しています' };
        }
        scheduleSave();
        Kairo.audio.play('forge');
        emit('relicChanged');
        return { ok: true, gained, level: rel.level };
      });
    },

    reforgeRelic(relicId) {
      return withLock(() => {
        const rel = state.relics.find((r) => r.id === relicId);
        if (!rel) return { ok: false };
        const dustCost = 45 + rel.rarity * 25;
        if (state.currencies.dust < dustCost) {
          Kairo.audio.play('error');
          return { ok: false, msg: `遺物塵が${dustCost}必要です` };
        }
        state.currencies.dust -= dustCost;
        const count = Math.max(rel.subs.length, Data.RELIC_RARITIES[rel.rarity].subs);
        const used = new Set([rel.main.stat]);
        const newSubs = [];
        for (let i = 0; i < count; i++) {
          const s = Data.rollSubStat(rel.tier, rel.rarity, used);
          used.add(s.stat);
          newSubs.push(s);
        }
        rel.subs = newSubs;
        state.stats.totalReforges++;
        scheduleSave();
        Kairo.audio.play('forge');
        emit('relicChanged');
        return { ok: true };
      });
    },

    toggleLockRelic(relicId) {
      const rel = state.relics.find((r) => r.id === relicId);
      if (!rel) return false;
      rel.locked = !rel.locked;
      scheduleSave();
      Kairo.audio.play('tap');
      emit('relicChanged');
      return rel.locked;
    },

    salvageRelic(relicId) {
      return withLock(() => {
        const idx = state.relics.findIndex((r) => r.id === relicId);
        if (idx < 0) return { ok: false };
        const rel = state.relics[idx];
        if (rel.locked) return { ok: false, msg: '保護中の遺物は分解できません' };
        if (rel.equippedBy) return { ok: false, msg: '装備中の遺物は分解できません' };
        const dust = Data.RELIC_RARITIES[rel.rarity].salvageDust + rel.level * 10;
        state.relics.splice(idx, 1);
        state.currencies.dust += dust;
        state.stats.totalRelicsSalvaged++;
        scheduleSave();
        Kairo.audio.play('forge');
        emit('relicChanged');
        return { ok: true, dust };
      });
    },

    bulkSalvageRelics(maxRank) {
      return withLock(() => {
        let count = 0;
        let dust = 0;
        state.relics = state.relics.filter((r) => {
          if (!r.locked && !r.equippedBy && r.rarity <= maxRank) {
            count++;
            dust += Data.RELIC_RARITIES[r.rarity].salvageDust + r.level * 8;
            return false;
          }
          return true;
        });
        if (count === 0) return { ok: false, msg: '該当する未保護遺物がありません' };
        state.currencies.dust += dust;
        state.stats.totalRelicsSalvaged += count;
        scheduleSave();
        Kairo.audio.play('forge');
        emit('relicChanged');
        return { ok: true, count, dust };
      });
    },

    craftRelic(setId, slotId) {
      return withLock(() => {
        const dustCost = 160;
        const goldCost = 1000;
        if (state.currencies.dust < dustCost || state.currencies.gold < goldCost) {
          Kairo.audio.play('error');
          return { ok: false, msg: `遺物塵${dustCost}・魂貨${goldCost}が必要です` };
        }
        state.currencies.dust -= dustCost;
        state.currencies.gold -= goldCost;
        const cleared = Data.CAMPAIGN_STAGES.filter((s) => state.progress.clearedStages[s.id]).length;
        const tier = Math.min(5, Math.max(2, Math.ceil((cleared + 1) / 3)));
        const rel = Data.generateRelic({ tier, minRarity: 3, forceSet: setId, forceSlot: slotId });
        state.relics.unshift(rel);
        state.codex.relicSets[rel.setId] = true;
        state.stats.totalRelicsFound++;
        scheduleSave();
        Kairo.audio.play(rel.rarity >= 5 ? 'summonUR' : 'dropRare');
        emit('relicChanged');
        return { ok: true, relic: rel };
      });
    },

    // --- Achievements ---
    claimAllAchievements() {
      return withLock(() => {
        const list = getClaimableAchievements(state);
        if (list.length === 0) return { ok: false, msg: '受取可能な実績はありません' };
        let gems = 0, gold = 0, exp = 0, dust = 0, cores = 0;
        list.forEach((a) => {
          state.achievementsClaimed[a.id] = true;
          gems += a.reward.gems || 0;
          gold += a.reward.gold || 0;
          exp += a.reward.exp || 0;
          dust += a.reward.dust || 0;
          cores += a.reward.cores || 0;
        });
        state.currencies.gems += gems;
        state.currencies.gold += gold;
        state.currencies.expPool += exp;
        state.currencies.dust += dust;
        state.currencies.cores += cores;
        scheduleSave(true);
        Kairo.audio.play('win');
        emit('achievementsClaimed');
        return { ok: true, count: list.length, gems, gold, exp, dust, cores };
      });
    },

    // --- Settings & Transfer ---
    updateSetting(key, val) {
      if (!Object.prototype.hasOwnProperty.call(state.settings, key)) return;
      state.settings[key] = val;
      if (key === 'soundEnabled') Kairo.audio.setEnabled(val);
      if (key === 'soundVolume') Kairo.audio.setVolume(val);
      scheduleSave();
      emit('settingChanged');
    },

    exportTransferCode() {
      return Sec.StorageVault.exportCode(state);
    },

    async importTransferCode(code) {
      const res = Sec.StorageVault.importCode(code);
      if (!res.ok) {
        Kairo.audio.play('error');
        return { ok: false, msg: '記録コードの署名検証に失敗しました' };
      }
      state = sanitizeState(res.data);
      await Sec.StorageVault.save(state);
      Kairo.audio.setEnabled(state.settings.soundEnabled);
      Kairo.audio.setVolume(state.settings.soundVolume);
      Kairo.audio.play('win');
      emit('imported');
      return { ok: true };
    },

    async resetAllData() {
      await Sec.StorageVault.wipeAll();
      state = createInitialState();
      pendingOfflineReport = null;
      lastTamperNotice = false;
      await Sec.StorageVault.save(state);
      emit('reset');
    },

    tickPlayTime(sec) {
      state.stats.totalPlaySec += sec;
    },

    // Helper exports
    computeUnitStats: (uid) => computeUnitStats(state, uid),
    computePartySynergy: () => computePartySynergy(state),
    computePartyPower: () => computePartyPower(state),
    getMaxLevelForStars,
    getLevelUpCost,
    previewLevelUp: (uid, steps) => previewLevelUp(state, uid, steps),
    previewBulkSalvage: (maxRank) => previewBulkSalvage(state, maxRank),
    getLimitBreakShardCost,
    getAwakenCost,
    getSkillUpgradeCost,
    getAchievementProgress: (ach) => getAchievementProgress(state, ach),
    getClaimableAchievements: () => getClaimableAchievements(state),
    constants: { MAX_RELICS, SUMMON_COST_1, SUMMON_COST_10, HARD_PITY, SOFT_PITY_START, MILEAGE_UR_COST }
  };

  Kairo.store = Store;
})(window);
