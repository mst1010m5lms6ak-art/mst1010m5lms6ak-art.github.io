/* ==========================================================================
   state.js - ゲーム状態管理・育成・編成・装備・専用武器・オフライン報酬
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});
  const MAX_EQUIP_BAG = 160;
  let saveTimer = null;

  function createInitialSave() {
    const units = {};
    for (const u of HS.UNITS) {
      const starter = u.unlock.type === 'starter';
      units[u.id] = {
        unlocked: starter,
        level: 1,
        exp: 0,
        awakening: 0,
        exWeaponLv: 0,
        equips: { weapon: null, armor: null, accessory: null }
      };
    }

    // 初期装備を3つ配布（すぐ装備厳選とD&Dを体験できる）
    const initGear = [
      HS.EQUIP.generateEquipment(1600, 0.9),
      HS.EQUIP.generateEquipment(1600, 1.1),
      HS.EQUIP.generateEquipment(1600, 1.3)
    ];

    return {
      version: 1,
      savedAt: Date.now(),
      lastActiveAt: Date.now(),
      resources: {
        gold: 1200,
        expCrystal: 450,
        dust: 40,
        shards: 15,
        cores: 2
      },
      party: ['kagura', 'hayate', 'lill', 'shizuku'],
      units,
      equipment: initGear,
      clearedStages: {},
      towerFloor: 1,
      selectedStageMode: 'story',
      selectedWorld: 1,
      selectedStageId: 'w1-1',
      settings: {
        speed: 1,
        autoBattle: true,
        autoRepeat: false,
        sound: true
      },
      autoSell: {
        enabled: true,
        maxRarity: 'N',
        keepHighScore: false,
        keepScoreThreshold: 1200
      },
      stats: {
        totalRuns: 0,
        totalWins: 0,
        totalAnomalies: 0,
        totalAutoSold: 0,
        maxSingleHit: 0
      }
    };
  }

  function mergeSave(loaded) {
    const base = createInitialSave();
    if (!loaded || typeof loaded !== 'object') return base;

    const merged = {
      ...base,
      ...loaded,
      resources: { ...base.resources, ...(loaded.resources || {}) },
      settings: { ...base.settings, ...(loaded.settings || {}) },
      autoSell: { ...base.autoSell, ...(loaded.autoSell || {}) },
      stats: { ...base.stats, ...(loaded.stats || {}) },
      clearedStages: { ...(loaded.clearedStages || {}) }
    };

    // 3倍速上限を厳守
    if (!HS.CONST.SPEED_STEPS.includes(merged.settings.speed)) {
      merged.settings.speed = 1;
    }

    // 全20ユニットの整合性補完
    const mergedUnits = {};
    for (const u of HS.UNITS) {
      const prev = loaded.units && loaded.units[u.id];
      mergedUnits[u.id] = {
        unlocked: prev ? !!prev.unlocked : u.unlock.type === 'starter',
        level: Math.max(1, prev?.level || 1),
        exp: Math.max(0, prev?.exp || 0),
        awakening: Math.max(0, Math.min(10, prev?.awakening || 0)),
        exWeaponLv: Math.max(0, Math.min(5, prev?.exWeaponLv || 0)),
        equips: {
          weapon: prev?.equips?.weapon || null,
          armor: prev?.equips?.armor || null,
          accessory: prev?.equips?.accessory || null
        }
      };
    }
    merged.units = mergedUnits;

    // 装備マップ検証
    merged.equipment = Array.isArray(loaded.equipment) ? loaded.equipment : base.equipment;
    const eqIds = new Set(merged.equipment.map((e) => e.id));
    for (const uid of Object.keys(merged.units)) {
      const eq = merged.units[uid].equips;
      for (const s of ['weapon', 'armor', 'accessory']) {
        if (eq[s] && !eqIds.has(eq[s])) eq[s] = null;
      }
    }

    // パーティ整合性検証
    const cleanParty = [null, null, null, null];
    const seen = new Set();
    if (Array.isArray(loaded.party)) {
      for (let i = 0; i < 4; i++) {
        const uid = loaded.party[i];
        if (uid && merged.units[uid]?.unlocked && !seen.has(uid)) {
          cleanParty[i] = uid;
          seen.add(uid);
        }
      }
    }
    if (!cleanParty.some(Boolean)) cleanParty[0] = 'kagura';
    merged.party = cleanParty;

    return merged;
  }

  const STATE = {
    data: null,
    ui: {
      tab: 'battle',
      battleUpperView: 'arena', // 'arena' | 'dps' | 'log'
      dpsMetric: 'dmgDealt',    // 'dmgDealt' | 'dmgTaken' | 'healDone' | 'healRecv'
      selectedPartySlot: 0,
      selectedUnitId: 'kagura',
      selectedGearId: null,
      gearTargetUnitId: 'kagura',
      partyFilterAttr: 'all',
      unitFilterAttr: 'all',
      gearFilterSlot: 'all',
      worldSubTab: 'drift',     // 'drift' | 'codex' | 'system'
      logFilter: 'all'
    }
  };

  function scheduleSave(immediate) {
    if (!STATE.data) return;
    STATE.data.savedAt = Date.now();
    STATE.data.lastActiveAt = Date.now();
    if (saveTimer) clearTimeout(saveTimer);
    if (immediate) {
      HS.STORAGE.save(STATE.data);
    } else {
      saveTimer = setTimeout(() => HS.STORAGE.save(STATE.data), 450);
    }
  }

  async function init() {
    const loaded = await HS.STORAGE.load();
    STATE.data = mergeSave(loaded);
    HS.AUDIO.setEnabled(STATE.data.settings.sound);
    if (STATE.data.equipment.length) {
      STATE.ui.selectedGearId = STATE.data.equipment[0].id;
    }
    return STATE.data;
  }

  function getEquipMap() {
    const map = {};
    for (const item of STATE.data.equipment) map[item.id] = item;
    return map;
  }

  function getPartySynergy() {
    return HS.UTIL.calcPartySynergies(STATE.data.party);
  }

  function getUnitStats(unitId, usePartySynergy) {
    const def = HS.UNITS_MAP[unitId];
    const save = STATE.data.units[unitId];
    if (!def || !save) return null;
    const eqMap = getEquipMap();
    const syn = usePartySynergy ? getPartySynergy().bonuses : null;
    return HS.UTIL.calcUnitStats(def, save, eqMap, syn);
  }

  function getPartyTotalPower() {
    const eqMap = getEquipMap();
    const syn = getPartySynergy().bonuses;
    let sum = 0;
    for (const uid of STATE.data.party) {
      if (!uid) continue;
      const st = HS.UTIL.calcUnitStats(HS.UNITS_MAP[uid], STATE.data.units[uid], eqMap, syn);
      sum += st.power;
    }
    return sum;
  }

  function isStageUnlocked(stage) {
    if (stage.mode === 'tower') return true;
    if (stage.mode === 'boss') {
      const idx = HS.STAGES.BOSS_STAGES.findIndex((s) => s.id === stage.id);
      if (idx <= 0) return !!STATE.data.clearedStages['w1-4'];
      const prev = HS.STAGES.BOSS_STAGES[idx - 1];
      return !!STATE.data.clearedStages[prev.id];
    }
    const idx = HS.STAGES.STORY_STAGES.findIndex((s) => s.id === stage.id);
    if (idx <= 0) return true;
    const prev = HS.STAGES.STORY_STAGES[idx - 1];
    return !!STATE.data.clearedStages[prev.id];
  }

  function getHighestClearedPower() {
    let maxP = 1400;
    for (const s of HS.STAGES.STORY_STAGES) {
      if (STATE.data.clearedStages[s.id] && s.recPower > maxP) maxP = s.recPower;
    }
    return maxP;
  }

  // ================= パーティ編成 =================
  function setPartySlot(slotIdx, unitId) {
    if (slotIdx < 0 || slotIdx > 3) return false;
    if (!STATE.data.units[unitId]?.unlocked) return false;
    const party = STATE.data.party;
    const existing = party.indexOf(unitId);
    if (existing !== -1) {
      const tmp = party[slotIdx];
      party[slotIdx] = unitId;
      party[existing] = tmp;
    } else {
      party[slotIdx] = unitId;
    }
    scheduleSave();
    return true;
  }

  function swapPartySlots(idxA, idxB) {
    if (idxA === idxB || idxA < 0 || idxB < 0 || idxA > 3 || idxB > 3) return false;
    const party = STATE.data.party;
    const tmp = party[idxA];
    party[idxA] = party[idxB];
    party[idxB] = tmp;
    if (!party.some(Boolean)) party[0] = 'kagura';
    scheduleSave();
    return true;
  }

  function removePartySlot(slotIdx) {
    const party = STATE.data.party;
    if (!party[slotIdx]) return false;
    const count = party.filter(Boolean).length;
    if (count <= 1) return false;
    party[slotIdx] = null;
    scheduleSave();
    return true;
  }

  // ================= 育成・覚醒・専用武器 =================
  function getLevelUpCost(level) {
    return {
      gold: Math.round(70 * Math.pow(1.14, level - 1)),
      exp: Math.round(65 * Math.pow(1.13, level - 1))
    };
  }

  function levelUpUnit(unitId, times) {
    const u = STATE.data.units[unitId];
    if (!u || !u.unlocked) return { ok: false, msg: '未解放のキャラです' };
    let gained = 0;
    const maxLv = 99 + u.awakening * 10;
    for (let i = 0; i < (times || 1); i++) {
      if (u.level >= maxLv) break;
      const c = getLevelUpCost(u.level);
      if (STATE.data.resources.gold < c.gold || STATE.data.resources.expCrystal < c.exp) break;
      STATE.data.resources.gold -= c.gold;
      STATE.data.resources.expCrystal -= c.exp;
      u.level += 1;
      gained += 1;
    }
    if (!gained) {
      if (u.level >= maxLv) return { ok: false, msg: '上限レベル到達（覚醒で上限解放）' };
      return { ok: false, msg: 'ゴールドまたは経験結晶が不足しています' };
    }
    scheduleSave();
    return { ok: true, gained, level: u.level };
  }

  function getAwakenCost(awakening) {
    return {
      shards: 10 + awakening * 8,
      gold: 450 * (awakening + 1)
    };
  }

  function awakenUnit(unitId) {
    const u = STATE.data.units[unitId];
    if (!u || !u.unlocked) return { ok: false, msg: '未解放です' };
    if (u.awakening >= 10) return { ok: false, msg: '最大覚醒済みです' };
    const c = getAwakenCost(u.awakening);
    if (STATE.data.resources.shards < c.shards || STATE.data.resources.gold < c.gold) {
      return { ok: false, msg: `魂片${c.shards}と${HS.UTIL.fmtNum(c.gold)}Gが必要です` };
    }
    STATE.data.resources.shards -= c.shards;
    STATE.data.resources.gold -= c.gold;
    u.awakening += 1;
    scheduleSave();
    return { ok: true, awakening: u.awakening };
  }

  function unlockUnitByShards(unitId) {
    const u = STATE.data.units[unitId];
    if (!u) return { ok: false, msg: '不明なキャラです' };
    if (u.unlocked) return { ok: false, msg: 'すでに加入済みです' };
    const cost = 30;
    if (STATE.data.resources.shards < cost) {
      return { ok: false, msg: `魂片が${cost}個必要です（現在${STATE.data.resources.shards}）` };
    }
    STATE.data.resources.shards -= cost;
    u.unlocked = true;
    scheduleSave();
    return { ok: true };
  }

  function getExWeaponCost(exLv) {
    return {
      cores: 2 + exLv * 3,
      shards: 8 + exLv * 8,
      gold: 800 * (exLv + 1)
    };
  }

  function upgradeExWeapon(unitId) {
    const u = STATE.data.units[unitId];
    if (!u || !u.unlocked) return { ok: false, msg: '未加入のキャラです' };
    if (u.exWeaponLv >= 5) return { ok: false, msg: '専用武器は最大Lv.5です' };
    const c = getExWeaponCost(u.exWeaponLv);
    if (
      STATE.data.resources.cores < c.cores ||
      STATE.data.resources.shards < c.shards ||
      STATE.data.resources.gold < c.gold
    ) {
      return { ok: false, msg: `星屑コア${c.cores}・魂片${c.shards}・${HS.UTIL.fmtNum(c.gold)}Gが必要` };
    }
    STATE.data.resources.cores -= c.cores;
    STATE.data.resources.shards -= c.shards;
    STATE.data.resources.gold -= c.gold;
    u.exWeaponLv += 1;
    scheduleSave();
    return { ok: true, lv: u.exWeaponLv };
  }

  // ================= 装備・自動売却 =================
  function addEquipmentLoot(item) {
    const rule = STATE.data.autoSell;
    const bagFull = STATE.data.equipment.length >= MAX_EQUIP_BAG;
    if (HS.EQUIP.shouldAutoSell(item, rule) || (bagFull && !item.locked)) {
      const val = HS.EQUIP.getSellValue(item);
      STATE.data.resources.gold += val.gold;
      STATE.data.resources.dust += val.dust;
      STATE.data.stats.totalAutoSold += 1;
      return { kept: false, autoSold: true, gold: val.gold, dust: val.dust, item };
    }
    STATE.data.equipment.unshift(item);
    return { kept: true, autoSold: false, item };
  }

  function equipItem(unitId, itemId) {
    const u = STATE.data.units[unitId];
    const item = STATE.data.equipment.find((e) => e.id === itemId);
    if (!u || !u.unlocked || !item) return false;

    // 他キャラが装備中なら外す
    if (item.equippedBy && item.equippedBy !== unitId) {
      const prevOwner = STATE.data.units[item.equippedBy];
      if (prevOwner && prevOwner.equips[item.slot] === item.id) {
        prevOwner.equips[item.slot] = null;
      }
    }

    // 現在このスロットに付いている装備を外す
    const curId = u.equips[item.slot];
    if (curId && curId !== item.id) {
      const curItem = STATE.data.equipment.find((e) => e.id === curId);
      if (curItem) curItem.equippedBy = null;
    }

    u.equips[item.slot] = item.id;
    item.equippedBy = unitId;
    scheduleSave();
    return true;
  }

  function unequipSlot(unitId, slot) {
    const u = STATE.data.units[unitId];
    if (!u || !u.equips[slot]) return false;
    const item = STATE.data.equipment.find((e) => e.id === u.equips[slot]);
    if (item) item.equippedBy = null;
    u.equips[slot] = null;
    scheduleSave();
    return true;
  }

  function autoEquipUnit(unitId) {
    const u = STATE.data.units[unitId];
    if (!u || !u.unlocked) return false;
    let changed = false;
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const cands = STATE.data.equipment
        .filter((e) => e.slot === slot && (!e.equippedBy || e.equippedBy === unitId))
        .sort((a, b) => b.score - a.score);
      if (cands[0] && u.equips[slot] !== cands[0].id) {
        equipItem(unitId, cands[0].id);
        changed = true;
      }
    }
    return changed;
  }

  function enhanceEquipment(itemId) {
    const item = STATE.data.equipment.find((e) => e.id === itemId);
    if (!item) return { ok: false, msg: '装備が見つかりません' };
    if (item.enhance >= 15) return { ok: false, msg: '最大強化(+15)です' };
    const cost = HS.EQUIP.getEnhanceCost(item);
    if (STATE.data.resources.gold < cost.gold || STATE.data.resources.dust < cost.dust) {
      return { ok: false, msg: `${HS.UTIL.fmtNum(cost.gold)}G・魔粉${cost.dust}が必要です` };
    }
    STATE.data.resources.gold -= cost.gold;
    STATE.data.resources.dust -= cost.dust;
    item.enhance += 1;
    item.score = HS.EQUIP.calcEquipScore(item);
    scheduleSave();
    return { ok: true, enhance: item.enhance };
  }

  function toggleEquipLock(itemId) {
    const item = STATE.data.equipment.find((e) => e.id === itemId);
    if (!item) return false;
    item.locked = !item.locked;
    scheduleSave();
    return item.locked;
  }

  function sellEquipment(itemId) {
    const idx = STATE.data.equipment.findIndex((e) => e.id === itemId);
    if (idx === -1) return { ok: false, msg: '対象がありません' };
    const item = STATE.data.equipment[idx];
    if (item.locked) return { ok: false, msg: 'ロック中の装備は売却できません' };
    if (item.equippedBy) return { ok: false, msg: '装備中のため売却できません' };
    const val = HS.EQUIP.getSellValue(item);
    STATE.data.equipment.splice(idx, 1);
    STATE.data.resources.gold += val.gold;
    STATE.data.resources.dust += val.dust;
    if (STATE.ui.selectedGearId === itemId) {
      STATE.ui.selectedGearId = STATE.data.equipment[0]?.id || null;
    }
    scheduleSave();
    return { ok: true, gold: val.gold, dust: val.dust };
  }

  function bulkSellByRule() {
    const rule = { ...STATE.data.autoSell, enabled: true };
    let count = 0;
    let gold = 0;
    let dust = 0;
    const remain = [];
    for (const item of STATE.data.equipment) {
      if (HS.EQUIP.shouldAutoSell(item, rule)) {
        const val = HS.EQUIP.getSellValue(item);
        count += 1;
        gold += val.gold;
        dust += val.dust;
      } else {
        remain.push(item);
      }
    }
    STATE.data.equipment = remain;
    STATE.data.resources.gold += gold;
    STATE.data.resources.dust += dust;
    if (!remain.some((e) => e.id === STATE.ui.selectedGearId)) {
      STATE.ui.selectedGearId = remain[0]?.id || null;
    }
    scheduleSave();
    return { count, gold, dust };
  }

  // ================= オフライン探索報酬 =================
  function getPendingOfflineRewards() {
    const now = Date.now();
    const elapsedSec = Math.min(12 * 3600, Math.max(0, Math.floor((now - (STATE.data.lastActiveAt || now)) / 1000)));
    const power = getHighestClearedPower();
    const rate = Math.pow(power / 1400, 0.72);
    const minutes = Math.floor(elapsedSec / 60);
    return {
      elapsedSec,
      minutes,
      gold: Math.round(minutes * 26 * rate),
      expCrystal: Math.round(minutes * 16 * rate),
      shards: Math.floor(minutes / 18),
      gearCount: Math.min(8, Math.floor(minutes / 20))
    };
  }

  function claimOfflineRewards() {
    const r = getPendingOfflineRewards();
    if (r.minutes < 1) return { ok: false, msg: '探索時間が1分未満です' };
    STATE.data.resources.gold += r.gold;
    STATE.data.resources.expCrystal += r.expCrystal;
    STATE.data.resources.shards += r.shards;
    const power = getHighestClearedPower();
    let kept = 0;
    let sold = 0;
    for (let i = 0; i < r.gearCount; i++) {
      const g = HS.EQUIP.generateEquipment(power, 1.0);
      const res = addEquipmentLoot(g);
      if (res.kept) kept += 1; else sold += 1;
    }
    STATE.data.lastActiveAt = Date.now();
    scheduleSave(true);
    return { ok: true, ...r, kept, sold };
  }

  HS.STATE = {
    get data() { return STATE.data; },
    set data(v) { STATE.data = v; },
    ui: STATE.ui,
    init,
    createInitialSave,
    mergeSave,
    scheduleSave,
    getEquipMap,
    getPartySynergy,
    getUnitStats,
    getPartyTotalPower,
    isStageUnlocked,
    getHighestClearedPower,
    setPartySlot,
    swapPartySlots,
    removePartySlot,
    getLevelUpCost,
    levelUpUnit,
    getAwakenCost,
    awakenUnit,
    unlockUnitByShards,
    getExWeaponCost,
    upgradeExWeapon,
    addEquipmentLoot,
    equipItem,
    unequipSlot,
    autoEquipUnit,
    enhanceEquipment,
    toggleEquipLock,
    sellEquipment,
    bulkSellByRule,
    getPendingOfflineRewards,
    claimOfflineRewards
  };
})(window);
