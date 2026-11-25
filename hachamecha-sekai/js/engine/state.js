(function () {
  'use strict';

  const HS = window.HS;

  let state = null;
  let saveTimer = null;
  const listeners = new Set();

  function makeUid() {
    return 'eq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function makeDefaultCharProgress() {
    return {
      abilityTier: 0,       // 0..5 unlocked tiers
      abilityChoices: [0, 0, 0, 0, 0],
      masteryXp: [0, 0, 0], // per skill index 0..2
      awakening: 0,         // 0..3
      equips: { weapon: null, armor: null, accessory: null, core: null }
    };
  }

  function createInitialState() {
    const starterIds = HS.Data.CHARACTERS
      .filter((c) => c.unlock && c.unlock.type === 'starter')
      .map((c) => c.id);

    const charProgress = {};
    for (const id of starterIds) {
      charProgress[id] = makeDefaultCharProgress();
    }

    // Starter gift gear so player immediately experiences equipment quality & set bonuses
    const starterGear = [
      { uid: makeUid(), itemId: 'eq_rg_w', quality: 64, locked: false },
      { uid: makeUid(), itemId: 'eq_rg_a', quality: 72, locked: false },
      { uid: makeUid(), itemId: 'eq_ff_w', quality: 78, locked: false },
      { uid: makeUid(), itemId: 'eq_ct_w', quality: 70, locked: false }
    ];

    if (charProgress.c_fire_kain) {
      charProgress.c_fire_kain.equips.weapon = starterGear[0].uid;
      charProgress.c_fire_kain.equips.armor = starterGear[1].uid;
    }
    if (charProgress.c_fire_ignis) {
      charProgress.c_fire_ignis.equips.weapon = starterGear[2].uid;
    }
    if (charProgress.c_water_noa) {
      charProgress.c_water_noa.equips.weapon = starterGear[3].uid;
    }

    return {
      version: 1,
      resources: {
        gold: 500,
        crystal: 12,
        shard: 4
      },
      unlockedChars: starterIds.slice(),
      charProgress,
      frontParty: [
        'c_fire_kain',
        'c_fire_ignis',
        'c_wind_ren',
        'c_water_noa'
      ],
      reserveLinks: [null, null, null, null],
      inventory: starterGear,
      progress: {
        normalCleared: {},   // '1-1': true
        towerCleared: { 1: 0, 2: 0 },
        raidCleared: {},     // raid_fire: maxLv
        constraintCleared: {}
      },
      expeditions: [null, null, null], // 3 active expedition slots
      discoveredEnemies: {},
      settings: {
        battleSpeed: 1,      // 1 | 2 | 3
        autoSellBelow: 0,    // 0 (OFF), 50, 70, 80, 90, 95, 100
        protectRaid: true
      },
      uiSelections: {
        deployMode: 'normal',
        areaId: 1,
        stageNum: 1,
        towerId: 1,
        raidId: 'raid_fire',
        raidLv: 1,
        constraintId: 'con_fire'
      }
    };
  }

  function sanitizeState(raw) {
    const base = createInitialState();
    if (!raw || typeof raw !== 'object') return base;

    const merged = {
      version: 1,
      resources: {
        gold: Math.max(0, Math.floor(Number(raw.resources?.gold) || 0)),
        crystal: Math.max(0, Math.floor(Number(raw.resources?.crystal) || 0)),
        shard: Math.max(0, Math.floor(Number(raw.resources?.shard) || 0))
      },
      unlockedChars: Array.isArray(raw.unlockedChars)
        ? Array.from(new Set(raw.unlockedChars.filter((id) => Boolean(HS.Data.CHAR_MAP[id]))))
        : base.unlockedChars,
      charProgress: {},
      frontParty: Array.isArray(raw.frontParty) ? raw.frontParty.slice(0, 4) : base.frontParty,
      reserveLinks: Array.isArray(raw.reserveLinks) ? raw.reserveLinks.slice(0, 4) : [null, null, null, null],
      inventory: [],
      progress: {
        normalCleared: raw.progress?.normalCleared && typeof raw.progress.normalCleared === 'object' ? { ...raw.progress.normalCleared } : {},
        towerCleared: {
          1: Math.max(0, Math.min(100, Math.floor(Number(raw.progress?.towerCleared?.[1]) || 0))),
          2: Math.max(0, Math.min(100, Math.floor(Number(raw.progress?.towerCleared?.[2]) || 0)))
        },
        raidCleared: raw.progress?.raidCleared && typeof raw.progress.raidCleared === 'object' ? { ...raw.progress.raidCleared } : {},
        constraintCleared: raw.progress?.constraintCleared && typeof raw.progress.constraintCleared === 'object' ? { ...raw.progress.constraintCleared } : {}
      },
      expeditions: [null, null, null],
      discoveredEnemies: raw.discoveredEnemies && typeof raw.discoveredEnemies === 'object' ? { ...raw.discoveredEnemies } : {},
      settings: {
        battleSpeed: [1, 2, 3].includes(raw.settings?.battleSpeed) ? raw.settings.battleSpeed : 1,
        autoSellBelow: HS.CONST.AUTO_SELL_OPTIONS.includes(raw.settings?.autoSellBelow) ? raw.settings.autoSellBelow : 0,
        protectRaid: raw.settings?.protectRaid !== false
      },
      uiSelections: {
        ...base.uiSelections,
        ...(raw.uiSelections && typeof raw.uiSelections === 'object' ? raw.uiSelections : {})
      }
    };

    if (merged.unlockedChars.length === 0) {
      merged.unlockedChars = base.unlockedChars;
    }

    // Inventory validation
    const uidSet = new Set();
    if (Array.isArray(raw.inventory)) {
      for (const item of raw.inventory) {
        if (!item || typeof item !== 'object') continue;
        if (!HS.Data.EQUIP_ITEM_MAP[item.itemId]) continue;
        const uid = typeof item.uid === 'string' && !uidSet.has(item.uid) ? item.uid : makeUid();
        uidSet.add(uid);
        merged.inventory.push({
          uid,
          itemId: item.itemId,
          quality: Math.max(1, Math.min(100, Math.round(Number(item.quality) || 1))),
          locked: Boolean(item.locked)
        });
      }
    }

    // Character progress validation
    for (const cid of merged.unlockedChars) {
      const src = raw.charProgress?.[cid] || {};
      const prog = makeDefaultCharProgress();
      prog.abilityTier = Math.max(0, Math.min(5, Math.floor(Number(src.abilityTier) || 0)));
      if (Array.isArray(src.abilityChoices)) {
        prog.abilityChoices = [0, 1, 2, 3, 4].map((i) => Math.max(0, Math.min(4, Math.floor(Number(src.abilityChoices[i]) || 0))));
      }
      if (Array.isArray(src.masteryXp)) {
        prog.masteryXp = [0, 1, 2].map((i) => Math.max(0, Math.floor(Number(src.masteryXp[i]) || 0)));
      }
      prog.awakening = Math.max(0, Math.min(3, Math.floor(Number(src.awakening) || 0)));
      for (const slot of ['weapon', 'armor', 'accessory', 'core']) {
        const uid = src.equips?.[slot];
        if (uid && uidSet.has(uid)) prog.equips[slot] = uid;
      }
      merged.charProgress[cid] = prog;
    }

    // Ensure valid frontParty & reserveLinks (no duplicates)
    const used = new Set();
    merged.frontParty = [0, 1, 2, 3].map((i) => {
      const cid = merged.frontParty[i];
      if (cid && merged.charProgress[cid] && !used.has(cid)) {
        used.add(cid);
        return cid;
      }
      return null;
    });
    if (merged.frontParty.every((x) => !x)) {
      merged.frontParty[0] = merged.unlockedChars[0];
      used.add(merged.frontParty[0]);
    }

    merged.reserveLinks = [0, 1, 2, 3].map((i) => {
      const cid = merged.reserveLinks[i];
      if (cid && merged.charProgress[cid] && !used.has(cid)) {
        used.add(cid);
        return cid;
      }
      return null;
    });

    // Expeditions validation
    if (Array.isArray(raw.expeditions)) {
      for (let i = 0; i < 3; i++) {
        const exp = raw.expeditions[i];
        if (exp && typeof exp === 'object' && HS.Data.EXPEDITIONS.some((e) => e.id === exp.routeId)) {
          const chars = (Array.isArray(exp.charIds) ? exp.charIds : []).filter((cid) => merged.charProgress[cid] && !used.has(cid));
          chars.forEach((cid) => used.add(cid));
          if (chars.length > 0) {
            merged.expeditions[i] = {
              routeId: exp.routeId,
              charIds: chars.slice(0, 4),
              startedAt: Number(exp.startedAt) || Date.now(),
              bonusSec: Math.max(0, Number(exp.bonusSec) || 0)
            };
          }
        }
      }
    }

    return merged;
  }

  function emitChange() {
    scheduleSave();
    listeners.forEach((fn) => {
      try { fn(state); } catch {}
    });
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (state) HS.Storage.save(state);
    }, 280);
  }

  async function init() {
    const loaded = await HS.Storage.load();
    state = sanitizeState(loaded);
    await HS.Storage.save(state);
    return state;
  }

  function getState() {
    return state;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function getCharProgress(charId) {
    if (!state.charProgress[charId]) {
      state.charProgress[charId] = makeDefaultCharProgress();
    }
    return state.charProgress[charId];
  }

  function isUnlocked(charId) {
    return state.unlockedChars.includes(charId);
  }

  function unlockCharacter(charId) {
    if (!HS.Data.CHAR_MAP[charId]) return false;
    if (isUnlocked(charId)) return false;
    state.unlockedChars.push(charId);
    state.charProgress[charId] = makeDefaultCharProgress();
    emitChange();
    return true;
  }

  function buyShopCharacter(charId) {
    const def = HS.Data.CHAR_MAP[charId];
    if (!def || !def.unlock || def.unlock.type !== 'shop') return { ok: false, reason: '交換対象外です' };
    if (isUnlocked(charId)) return { ok: false, reason: 'すでに仲間です' };
    if (state.resources.gold < def.unlock.cost) return { ok: false, reason: '世界貨が足りません' };
    state.resources.gold -= def.unlock.cost;
    unlockCharacter(charId);
    return { ok: true, char: def };
  }

  function getMasteryRank(xp) {
    const table = HS.CONST.MASTERY_XP_TABLE;
    let rank = 1;
    for (let i = 1; i < table.length; i++) {
      if (xp >= table[i]) rank = i + 1;
    }
    return rank;
  }

  function gainBattleMastery(charIds, amount) {
    for (const cid of charIds) {
      if (!cid || !state.charProgress[cid]) continue;
      const prog = state.charProgress[cid];
      for (let i = 0; i < 3; i++) {
        prog.masteryXp[i] = Math.min(999, (prog.masteryXp[i] || 0) + amount);
      }
    }
  }

  function trainMastery(charId, skillIdx) {
    const def = HS.Data.CHAR_MAP[charId];
    const prog = state.charProgress[charId];
    if (!def || !prog) return { ok: false, reason: '対象が見つかりません' };
    if (def.skills[skillIdx]?.passive) return { ok: false, reason: '固有パッシブは鍛錬対象外です' };
    const curXp = prog.masteryXp[skillIdx] || 0;
    const rank = getMasteryRank(curXp);
    if (rank >= 5) return { ok: false, reason: '熟練ランクは最大です' };

    const nextReq = HS.CONST.MASTERY_XP_TABLE[rank];
    const need = Math.max(1, nextReq - curXp);
    const goldCost = need * 16;
    const crystalCost = Math.max(1, Math.ceil(need / 6));
    if (state.resources.gold < goldCost || state.resources.crystal < crystalCost) {
      return { ok: false, reason: `世界貨${goldCost}・戦術結晶${crystalCost}が必要です` };
    }
    state.resources.gold -= goldCost;
    state.resources.crystal -= crystalCost;
    prog.masteryXp[skillIdx] = nextReq;
    emitChange();
    return { ok: true, newRank: rank + 1 };
  }

  function unlockAbilityTier(charId) {
    const prog = state.charProgress[charId];
    if (!prog) return { ok: false, reason: '未解放のキャラです' };
    if (prog.abilityTier >= 5) return { ok: false, reason: '全段階解放済みです' };
    const cost = HS.CONST.ABILITY_COSTS[prog.abilityTier];
    if (state.resources.gold < cost.gold || state.resources.crystal < cost.crystal) {
      return { ok: false, reason: `世界貨${cost.gold}・戦術結晶${cost.crystal}が必要です` };
    }
    state.resources.gold -= cost.gold;
    state.resources.crystal -= cost.crystal;
    prog.abilityTier += 1;
    emitChange();
    return { ok: true, tier: prog.abilityTier };
  }

  function selectAbilityChoice(charId, tierIdx, slotIdx) {
    const prog = state.charProgress[charId];
    if (!prog || tierIdx >= prog.abilityTier) return false;
    prog.abilityChoices[tierIdx] = Math.max(0, Math.min(4, slotIdx));
    emitChange();
    return true;
  }

  function unlockAwakening(charId) {
    const prog = state.charProgress[charId];
    if (!prog) return { ok: false, reason: '未解放のキャラです' };
    if (prog.awakening >= 3) return { ok: false, reason: '全刻印を解放済みです' };
    const cost = HS.CONST.AWAKEN_COSTS[prog.awakening];
    if (state.resources.gold < cost.gold || state.resources.shard < cost.shard) {
      return { ok: false, reason: `世界貨${cost.gold}・刻印欠片${cost.shard}が必要です` };
    }
    state.resources.gold -= cost.gold;
    state.resources.shard -= cost.shard;
    prog.awakening += 1;
    emitChange();
    return { ok: true, awakening: prog.awakening };
  }

  function getCharAssignment(charId) {
    const fIdx = state.frontParty.indexOf(charId);
    if (fIdx !== -1) return { type: 'front', slot: fIdx };
    const rIdx = state.reserveLinks.indexOf(charId);
    if (rIdx !== -1) return { type: 'reserve', slot: rIdx };
    for (let i = 0; i < state.expeditions.length; i++) {
      const exp = state.expeditions[i];
      if (exp && exp.charIds.includes(charId)) return { type: 'expedition', slot: i };
    }
    return { type: 'idle', slot: -1 };
  }

  function setFrontSlot(slotIdx, charId) {
    if (slotIdx < 0 || slotIdx > 3) return false;
    if (charId === null) {
      const remaining = state.frontParty.filter((id, i) => i !== slotIdx && Boolean(id));
      if (remaining.length === 0) return false;
      state.frontParty[slotIdx] = null;
      emitChange();
      return true;
    }
    if (!isUnlocked(charId)) return false;
    const assign = getCharAssignment(charId);
    if (assign.type === 'expedition') return false;
    if (assign.type === 'front') {
      const prev = state.frontParty[slotIdx];
      state.frontParty[slotIdx] = charId;
      state.frontParty[assign.slot] = prev;
    } else if (assign.type === 'reserve') {
      const prev = state.frontParty[slotIdx];
      state.frontParty[slotIdx] = charId;
      state.reserveLinks[assign.slot] = prev;
    } else {
      state.frontParty[slotIdx] = charId;
    }
    emitChange();
    return true;
  }

  function setReserveSlot(slotIdx, charId) {
    if (slotIdx < 0 || slotIdx > 3) return false;
    if (charId === null) {
      state.reserveLinks[slotIdx] = null;
      emitChange();
      return true;
    }
    if (!isUnlocked(charId)) return false;
    const assign = getCharAssignment(charId);
    if (assign.type === 'expedition') return false;
    if (assign.type === 'front') {
      const frontCount = state.frontParty.filter(Boolean).length;
      if (frontCount <= 1 && !state.reserveLinks[slotIdx]) return false;
      const prev = state.reserveLinks[slotIdx];
      state.reserveLinks[slotIdx] = charId;
      state.frontParty[assign.slot] = prev;
    } else if (assign.type === 'reserve') {
      const prev = state.reserveLinks[slotIdx];
      state.reserveLinks[slotIdx] = charId;
      state.reserveLinks[assign.slot] = prev;
    } else {
      state.reserveLinks[slotIdx] = charId;
    }
    emitChange();
    return true;
  }

  // Equipment ownership map
  function getEquipOwnerMap() {
    const map = {};
    for (const [cid, prog] of Object.entries(state.charProgress)) {
      for (const slot of ['weapon', 'armor', 'accessory', 'core']) {
        const uid = prog.equips?.[slot];
        if (uid) map[uid] = cid;
      }
    }
    return map;
  }

  function equipItem(charId, uid) {
    const prog = state.charProgress[charId];
    const item = state.inventory.find((x) => x.uid === uid);
    if (!prog || !item) return false;
    const def = HS.Data.EQUIP_ITEM_MAP[item.itemId];
    if (!def) return false;

    const owners = getEquipOwnerMap();
    const prevOwner = owners[uid];
    if (prevOwner && prevOwner !== charId && state.charProgress[prevOwner]) {
      state.charProgress[prevOwner].equips[def.slot] = null;
    }
    prog.equips[def.slot] = uid;
    emitChange();
    return true;
  }

  function unequipSlot(charId, slot) {
    const prog = state.charProgress[charId];
    if (!prog) return false;
    prog.equips[slot] = null;
    emitChange();
    return true;
  }

  function toggleLockEquip(uid) {
    const item = state.inventory.find((x) => x.uid === uid);
    if (!item) return false;
    item.locked = !item.locked;
    emitChange();
    return true;
  }

  function sellEquip(uid) {
    const owners = getEquipOwnerMap();
    if (owners[uid]) return { ok: false, reason: '装着中の装備は売却できません' };
    const idx = state.inventory.findIndex((x) => x.uid === uid);
    if (idx === -1) return { ok: false, reason: '装備が見つかりません' };
    const item = state.inventory[idx];
    if (item.locked) return { ok: false, reason: '保護中の装備は売却できません' };
    const val = HS.Data.getSellValue(item.itemId, item.quality);
    state.inventory.splice(idx, 1);
    state.resources.gold += val;
    emitChange();
    return { ok: true, gold: val };
  }

  function bulkSellEquips(maxQualityExclusive) {
    const owners = getEquipOwnerMap();
    let count = 0;
    let totalGold = 0;
    const kept = [];
    for (const item of state.inventory) {
      const def = HS.Data.EQUIP_ITEM_MAP[item.itemId];
      const set = def ? HS.Data.EQUIP_SET_MAP[def.setId] : null;
      const isProtected =
        Boolean(owners[item.uid]) ||
        item.locked ||
        item.quality === 100 ||
        (state.settings.protectRaid && set?.raidOnly);

      if (!isProtected && item.quality < maxQualityExclusive) {
        count++;
        totalGold += HS.Data.getSellValue(item.itemId, item.quality);
      } else {
        kept.push(item);
      }
    }
    state.inventory = kept;
    state.resources.gold += totalGold;
    emitChange();
    return { count, gold: totalGold };
  }

  function rollEquipmentDrop(setPool, minQuality, perfectBoost) {
    const setId = setPool[Math.floor(Math.random() * setPool.length)];
    const candidates = HS.Data.EQUIP_ITEMS.filter((i) => i.setId === setId);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const floorQ = Math.max(1, Math.min(99, Math.round(minQuality || 1)));
    let quality;
    const perfectChance = perfectBoost ? 0.14 : 0.045;
    if (Math.random() < perfectChance) {
      quality = 100;
    } else {
      const r = Math.pow(Math.random(), 1.15);
      quality = Math.min(100, floorQ + Math.floor(r * (101 - floorQ)));
    }
    return {
      uid: makeUid(),
      itemId: chosen.id,
      quality,
      locked: quality === 100
    };
  }

  function receiveEquipDrop(item) {
    const def = HS.Data.EQUIP_ITEM_MAP[item.itemId];
    const set = def ? HS.Data.EQUIP_SET_MAP[def.setId] : null;
    const threshold = state.settings.autoSellBelow || 0;
    const protectedItem = item.quality === 100 || item.locked || (state.settings.protectRaid && set?.raidOnly);

    if (threshold > 0 && !protectedItem && item.quality < threshold) {
      const soldGold = HS.Data.getSellValue(item.itemId, item.quality);
      state.resources.gold += soldGold;
      return { kept: false, soldGold, item };
    }

    // Soft inventory cap safety (auto-sells lowest unlocked unequipped if over 260)
    state.inventory.push(item);
    return { kept: true, soldGold: 0, item };
  }

  // Stage Unlocking
  function isNormalStageUnlocked(areaId, stageNum) {
    if (areaId === 1 && stageNum === 1) return true;
    if (stageNum > 1) return Boolean(state.progress.normalCleared[`${areaId}-${stageNum - 1}`]);
    return Boolean(state.progress.normalCleared[`${areaId - 1}-10`]);
  }

  function isTowerUnlocked(towerId) {
    const t = HS.Data.TOWERS.find((x) => x.id === towerId);
    if (!t) return false;
    if (!t.requireTowerId) return true;
    return (state.progress.towerCleared[t.requireTowerId] || 0) >= 100;
  }

  // Expedition helpers
  function getIdleChars() {
    return HS.Data.CHARACTERS.filter((c) => isUnlocked(c.id) && getCharAssignment(c.id).type === 'idle');
  }

  function startExpedition(slotIdx, routeId, charIds) {
    if (slotIdx < 0 || slotIdx > 2 || state.expeditions[slotIdx]) return { ok: false, reason: '枠が使用中です' };
    const route = HS.Data.EXPEDITIONS.find((e) => e.id === routeId);
    if (!route) return { ok: false, reason: '遠征先が無効です' };
    const valid = charIds.filter((cid) => isUnlocked(cid) && getCharAssignment(cid).type === 'idle').slice(0, 4);
    if (valid.length === 0) return { ok: false, reason: '待機中のキャラを選んでください' };
    state.expeditions[slotIdx] = {
      routeId,
      charIds: valid,
      startedAt: Date.now(),
      bonusSec: 0
    };
    emitChange();
    return { ok: true };
  }

  function getExpeditionStatus(exp) {
    if (!exp) return null;
    const route = HS.Data.EXPEDITIONS.find((e) => e.id === exp.routeId);
    if (!route) return null;
    const elapsedSec = Math.max(0, (Date.now() - exp.startedAt) / 1000) + (exp.bonusSec || 0);
    const pct = Math.min(1, elapsedSec / route.durationSec);
    const remainSec = Math.max(0, Math.ceil(route.durationSec - elapsedSec));
    return { route, elapsedSec, pct, remainSec, done: pct >= 1 };
  }

  function accelerateExpeditionsByBattle() {
    let changed = false;
    for (const exp of state.expeditions) {
      if (!exp) continue;
      const route = HS.Data.EXPEDITIONS.find((e) => e.id === exp.routeId);
      if (!route) continue;
      exp.bonusSec = (exp.bonusSec || 0) + route.clearAccelSec;
      changed = true;
    }
    if (changed) scheduleSave();
  }

  function claimExpedition(slotIdx) {
    const exp = state.expeditions[slotIdx];
    const st = getExpeditionStatus(exp);
    if (!exp || !st || !st.done) return { ok: false, reason: 'まだ帰還していません' };

    const mult = 0.75 + exp.charIds.length * 0.35;
    const gold = Math.round(st.route.rewards.gold * mult);
    const crystal = Math.round(st.route.rewards.crystal * mult);
    const shard = Math.round(st.route.rewards.shard * mult);
    state.resources.gold += gold;
    state.resources.crystal += crystal;
    state.resources.shard += shard;

    let dropRes = null;
    if (Math.random() < st.route.rewards.equipChance) {
      const unlockedAreas = HS.Data.NORMAL_AREAS.filter((a) => a.id === 1 || state.progress.normalCleared[`${a.id - 1}-10`]);
      const setPool = unlockedAreas.map((a) => a.setId);
      setPool.push('wander_chaos');
      const item = rollEquipmentDrop(setPool, st.route.rewards.minQuality || 35, st.route.id === 'exp_relic');
      dropRes = receiveEquipDrop(item);
    }

    state.expeditions[slotIdx] = null;
    emitChange();
    return { ok: true, gold, crystal, shard, dropRes };
  }

  function cancelExpedition(slotIdx) {
    if (!state.expeditions[slotIdx]) return false;
    state.expeditions[slotIdx] = null;
    emitChange();
    return true;
  }

  // Record battle victory & commit rewards
  function commitBattleVictory(plan, defeatedIntruders, frontIds) {
    const rewards = {
      gold: 0,
      crystal: 0,
      shard: 0,
      drops: [],
      autoSoldCount: 0,
      autoSoldGold: 0,
      newChar: null,
      alreadyClaimedTower: false
    };

    // Mastery gain for participating front characters
    gainBattleMastery(frontIds, plan.mode === 'raid' ? 14 : plan.mode === 'tower' ? 10 : 6);
    accelerateExpeditionsByBattle();

    if (plan.mode === 'tower') {
      const prev = state.progress.towerCleared[plan.towerId] || 0;
      if (plan.floor > prev) {
        state.progress.towerCleared[plan.towerId] = plan.floor;
        rewards.gold = plan.goldReward;
        rewards.crystal = plan.crystalReward;
        rewards.shard = plan.shardReward;
        state.resources.gold += rewards.gold;
        state.resources.crystal += rewards.crystal;
        state.resources.shard += rewards.shard;

        if (plan.floor % 5 === 0 || plan.floor === 100) {
          const item = rollEquipmentDrop(plan.setPool, plan.minQuality, plan.floor % 25 === 0);
          const res = receiveEquipDrop(item);
          rewards.drops.push(res);
          if (!res.kept) {
            rewards.autoSoldCount++;
            rewards.autoSoldGold += res.soldGold;
          }
        }
        if (plan.floor === 100) {
          const tower = HS.Data.TOWERS.find((t) => t.id === plan.towerId);
          if (tower && unlockCharacter(tower.rewardCharId)) {
            rewards.newChar = HS.Data.CHAR_MAP[tower.rewardCharId];
          }
        }
      } else {
        rewards.alreadyClaimedTower = true;
      }
      emitChange();
      return rewards;
    }

    // Standard rewards for Normal / Raid / Constraint
    const intruderGold = defeatedIntruders * Math.round(plan.goldReward * 0.65);
    const intruderCrystal = defeatedIntruders * 4;
    rewards.gold = plan.goldReward + intruderGold;
    rewards.crystal = plan.crystalReward + intruderCrystal;
    rewards.shard = plan.shardReward + defeatedIntruders * 2;

    state.resources.gold += rewards.gold;
    state.resources.crystal += rewards.crystal;
    state.resources.shard += rewards.shard;

    // Drops
    const baseDropCount = plan.guaranteedDrops || (Math.random() < 0.72 ? 1 : 0);
    for (let i = 0; i < baseDropCount; i++) {
      const item = rollEquipmentDrop(plan.setPool, plan.minQuality, plan.mode === 'raid' && plan.raidLv >= 7);
      const res = receiveEquipDrop(item);
      rewards.drops.push(res);
      if (!res.kept) {
        rewards.autoSoldCount++;
        rewards.autoSoldGold += res.soldGold;
      }
    }

    // Bonus intruder drops (high quality + wander_chaos set chance!)
    for (let i = 0; i < defeatedIntruders; i++) {
      const pool = [...plan.setPool, 'wander_chaos'];
      const item = rollEquipmentDrop(pool, Math.min(88, (plan.minQuality || 20) + 32), true);
      const res = receiveEquipDrop(item);
      rewards.drops.push(res);
      if (!res.kept) {
        rewards.autoSoldCount++;
        rewards.autoSoldGold += res.soldGold;
      }
    }

    if (plan.mode === 'normal') {
      const key = `${plan.areaId}-${plan.stageNum}`;
      const isFirstClear = !state.progress.normalCleared[key];
      state.progress.normalCleared[key] = true;
      if (isFirstClear && plan.stageNum === 10) {
        const area = HS.Data.NORMAL_AREAS.find((a) => a.id === plan.areaId);
        if (area && area.clearUnlockChar && unlockCharacter(area.clearUnlockChar)) {
          rewards.newChar = HS.Data.CHAR_MAP[area.clearUnlockChar];
        }
      }
    } else if (plan.mode === 'raid') {
      const cur = state.progress.raidCleared[plan.raidId] || 0;
      if (plan.raidLv > cur) state.progress.raidCleared[plan.raidId] = plan.raidLv;
    } else if (plan.mode === 'constraint') {
      state.progress.constraintCleared[plan.constraintId] = (state.progress.constraintCleared[plan.constraintId] || 0) + 1;
    }

    emitChange();
    return rewards;
  }

  function markEnemiesDiscovered(enemyIds) {
    let added = false;
    for (const id of enemyIds) {
      if (id && !state.discoveredEnemies[id]) {
        state.discoveredEnemies[id] = true;
        added = true;
      }
    }
    if (added) scheduleSave();
  }

  function updateSetting(key, val) {
    state.settings[key] = val;
    emitChange();
  }

  function updateUiSelection(patch) {
    Object.assign(state.uiSelections, patch);
    scheduleSave();
  }

  async function importBackup(code) {
    const parsed = HS.Storage.importCode(code);
    if (!parsed) return false;
    state = sanitizeState(parsed);
    await HS.Storage.save(state);
    emitChange();
    return true;
  }

  async function resetSave() {
    await HS.Storage.clearAll();
    state = createInitialState();
    await HS.Storage.save(state);
    emitChange();
  }

  HS.Engine.State = {
    init,
    getState,
    subscribe,
    getCharProgress,
    isUnlocked,
    unlockCharacter,
    buyShopCharacter,
    getMasteryRank,
    trainMastery,
    unlockAbilityTier,
    selectAbilityChoice,
    unlockAwakening,
    getCharAssignment,
    setFrontSlot,
    setReserveSlot,
    getEquipOwnerMap,
    equipItem,
    unequipSlot,
    toggleLockEquip,
    sellEquip,
    bulkSellEquips,
    isNormalStageUnlocked,
    isTowerUnlocked,
    getIdleChars,
    startExpedition,
    getExpeditionStatus,
    claimExpedition,
    cancelExpedition,
    commitBattleVictory,
    markEnemiesDiscovered,
    updateSetting,
    updateUiSelection,
    importBackup,
    resetSave
  };
})();
