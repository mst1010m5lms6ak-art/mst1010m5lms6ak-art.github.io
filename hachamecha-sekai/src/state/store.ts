import { RARITY_ORDER } from '../data/constants';
import { getEquipUpgradeCost, rollEquipmentDrop } from '../data/equipment';
import { generateTowerStage, STAGE_MAP } from '../data/stages';
import { UNIT_DEFS, UNIT_MAP } from '../data/units';
import { getExpForNextLevel, getLevelUpGoldCost } from '../engine/stats';
import { ACHIEVEMENTS, createInitialSave, loadSaveData, persistSaveData } from '../engine/storage';
import type {
  BattleRewardSummary,
  BattleState,
  EquipmentItem,
  EquipSlot,
  RepeatSessionSummary,
  SaveData,
  StageDef,
  UserSettings
} from '../types/game';

export function resolveStage(stageId: string, towerFloor?: number): StageDef {
  if (stageId.startsWith('tower_')) {
    const f = towerFloor ?? (parseInt(stageId.replace('tower_', ''), 10) || 1);
    return generateTowerStage(f);
  }
  return STAGE_MAP[stageId] ?? STAGE_MAP.st_01;
}

export function shouldAutoSell(item: EquipmentItem, settings: UserSettings): boolean {
  if (!settings.autoSell.enabled || settings.autoSell.maxRarity === 'none') return false;
  if (item.locked) return false;
  const maxIdx = RARITY_ORDER.indexOf(settings.autoSell.maxRarity);
  const itemIdx = RARITY_ORDER.indexOf(item.rarity);
  return itemIdx <= maxIdx;
}

export function applyBattleOutcome(
  save: SaveData,
  battle: BattleState,
  stage: StageDef
): { nextSave: SaveData; reward: BattleRewardSummary } {
  const won = battle.phase === 'victory';
  const nextSave: SaveData = {
    ...save,
    ownedUnits: Object.fromEntries(
      Object.entries(save.ownedUnits).map(([k, v]) => [k, { ...v, equip: { ...v.equip } }])
    ),
    inventory: [...save.inventory],
    clearedStages: { ...save.clearedStages },
    totalBattles: save.totalBattles + 1,
    totalWins: save.totalWins + (won ? 1 : 0)
  };

  const dpsList = Object.values(battle.dps);
  if (!won) {
    return {
      nextSave,
      reward: {
        won: false,
        stageId: stage.id,
        stageName: stage.name,
        towerFloor: battle.towerFloor,
        durationSec: battle.elapsedSec,
        turns: battle.turnCount,
        gold: 0,
        exp: 0,
        shard: 0,
        powder: 0,
        sigCore: 0,
        keptEquips: [],
        autoSoldCount: 0,
        autoSoldGold: 0,
        autoSoldPowder: 0,
        levelUps: [],
        dps: dpsList
      }
    };
  }

  const isFirstClear = !nextSave.clearedStages[stage.id];
  nextSave.clearedStages[stage.id] = (nextSave.clearedStages[stage.id] ?? 0) + 1;

  if (stage.category === 'tower' && battle.towerFloor) {
    nextSave.towerMaxFloor = Math.max(nextSave.towerMaxFloor, battle.towerFloor);
  }

  let gold = stage.rewards.gold;
  const exp = stage.rewards.exp;
  let shard = stage.rewards.shard + (isFirstClear && stage.firstClearShard ? stage.firstClearShard : 0);
  let powder = stage.rewards.powder;
  const sigCore = Math.random() < stage.rewards.sigCoreChance ? 1 : 0;

  // 装備ドロップ＋自動売却処理
  const powerTier = Math.max(1, Math.round(stage.recommendedPower / 2400));
  const keptEquips: EquipmentItem[] = [];
  let autoSoldCount = 0;
  let autoSoldGold = 0;
  let autoSoldPowder = 0;

  for (let i = 0; i < stage.rewards.equipDropCount; i++) {
    const item = rollEquipmentDrop(stage.rewards.rarityWeights, powerTier);
    if (shouldAutoSell(item, nextSave.settings)) {
      autoSoldCount += 1;
      autoSoldGold += item.sellValue;
      autoSoldPowder += Math.max(4, Math.round(item.sellValue / 28));
    } else {
      keptEquips.push(item);
      nextSave.inventory.push(item);
    }
  }

  // インベントリ上限保護（180個超は未装備＆非ロックの古い低レアを整理）
  if (nextSave.inventory.length > 180) {
    const equippedSet = new Set<string>();
    Object.values(nextSave.ownedUnits).forEach((u) => {
      if (u.equip.weapon) equippedSet.add(u.equip.weapon);
      if (u.equip.armor) equippedSet.add(u.equip.armor);
      if (u.equip.accessory) equippedSet.add(u.equip.accessory);
    });
    nextSave.inventory = nextSave.inventory.filter((it, idx) => {
      if (idx >= nextSave.inventory.length - 160) return true;
      return it.locked || equippedSet.has(it.uid) || it.rarity === 'CHAOS' || it.rarity === 'SSR';
    });
  }

  gold += autoSoldGold;
  powder += autoSoldPowder;
  nextSave.gold += gold;
  nextSave.shard += shard;
  nextSave.powder += powder;
  nextSave.sigCore += sigCore;
  nextSave.totalAutoSold += autoSoldCount;

  // 初回クリア解放ユニット（ステージ or 無限塔）
  let firstClearUnitId: string | undefined;
  if (stage.firstClearUnitId && !nextSave.ownedUnits[stage.firstClearUnitId]) {
    firstClearUnitId = stage.firstClearUnitId;
    nextSave.ownedUnits[firstClearUnitId] = {
      unitId: firstClearUnitId,
      level: 1,
      exp: 0,
      equip: { weapon: null, armor: null, accessory: null },
      sigUnlocked: false,
      sigLevel: 1
    };
  }
  if (stage.category === 'tower' && battle.towerFloor) {
    for (const u of UNIT_DEFS) {
      if (u.unlockMethod.kind === 'tower' && battle.towerFloor >= u.unlockMethod.floor && !nextSave.ownedUnits[u.id]) {
        firstClearUnitId = u.id;
        nextSave.ownedUnits[u.id] = {
          unitId: u.id,
          level: 1,
          exp: 0,
          equip: { weapon: null, armor: null, accessory: null },
          sigUnlocked: false,
          sigLevel: 1
        };
      }
    }
  }

  // 編成中パーティへEXP付与
  const levelUps: BattleRewardSummary['levelUps'] = [];
  for (const uid of nextSave.party) {
    if (!uid) continue;
    const owned = nextSave.ownedUnits[uid];
    if (!owned) continue;
    const startLv = owned.level;
    owned.exp += exp;
    while (owned.level < 99 && owned.exp >= getExpForNextLevel(owned.level)) {
      owned.exp -= getExpForNextLevel(owned.level);
      owned.level += 1;
    }
    if (owned.level > startLv) {
      levelUps.push({ unitId: uid, name: UNIT_MAP[uid]?.name ?? uid, from: startLv, to: owned.level });
    }
  }

  return {
    nextSave,
    reward: {
      won: true,
      stageId: stage.id,
      stageName: stage.name,
      towerFloor: battle.towerFloor,
      durationSec: battle.elapsedSec,
      turns: battle.turnCount,
      gold,
      exp,
      shard,
      powder,
      sigCore,
      keptEquips,
      autoSoldCount,
      autoSoldGold,
      autoSoldPowder,
      firstClearUnitId,
      levelUps,
      dps: dpsList
    }
  };
}

export function mergeRepeatSession(
  prev: RepeatSessionSummary | null,
  reward: BattleRewardSummary
): RepeatSessionSummary {
  const base: RepeatSessionSummary = prev
    ? {
        ...prev,
        keptEquips: [...prev.keptEquips],
        dpsTotals: Object.fromEntries(Object.entries(prev.dpsTotals).map(([k, v]) => [k, { ...v }]))
      }
    : {
        stageId: reward.stageId,
        stageName: reward.stageName,
        runs: 0,
        wins: 0,
        losses: 0,
        totalDurationSec: 0,
        totalGold: 0,
        totalExp: 0,
        totalShard: 0,
        totalPowder: 0,
        totalSigCore: 0,
        keptEquips: [],
        autoSoldCount: 0,
        autoSoldGold: 0,
        autoSoldPowder: 0,
        dpsTotals: {}
      };

  base.runs += 1;
  if (reward.won) base.wins += 1;
  else base.losses += 1;
  base.totalDurationSec += reward.durationSec;
  base.totalGold += reward.gold;
  base.totalExp += reward.exp;
  base.totalShard += reward.shard;
  base.totalPowder += reward.powder;
  base.totalSigCore += reward.sigCore;
  base.keptEquips.push(...reward.keptEquips);
  base.autoSoldCount += reward.autoSoldCount;
  base.autoSoldGold += reward.autoSoldGold;
  base.autoSoldPowder += reward.autoSoldPowder;

  for (const d of reward.dps) {
    if (!base.dpsTotals[d.actorId]) {
      base.dpsTotals[d.actorId] = { ...d };
    } else {
      const cur = base.dpsTotals[d.actorId];
      cur.damageDealt += d.damageDealt;
      cur.damageTaken += d.damageTaken;
      cur.healingDone += d.healingDone;
      cur.healingReceived += d.healingReceived;
    }
  }
  return base;
}

export function assignUnitToPartySlot(save: SaveData, unitId: string, slotIndex: number): SaveData {
  const nextParty = [...save.party];
  const existingIdx = nextParty.indexOf(unitId);
  if (existingIdx === slotIndex) return save;
  if (existingIdx >= 0) {
    nextParty[existingIdx] = nextParty[slotIndex];
    nextParty[slotIndex] = unitId;
  } else {
    nextParty[slotIndex] = unitId;
  }
  return { ...save, party: nextParty };
}

export function removeUnitFromPartySlot(save: SaveData, slotIndex: number): SaveData {
  const filledCount = save.party.filter(Boolean).length;
  if (filledCount <= 1) return save; // 最低1体は編成必須
  const nextParty = [...save.party];
  nextParty[slotIndex] = null;
  return { ...save, party: nextParty };
}

export function levelUpUnitWithGold(save: SaveData, unitId: string, times = 1): SaveData {
  const owned = save.ownedUnits[unitId];
  if (!owned) return save;
  let gold = save.gold;
  let level = owned.level;
  let exp = owned.exp;
  for (let i = 0; i < times; i++) {
    if (level >= 99) break;
    const cost = getLevelUpGoldCost(level);
    if (gold < cost) break;
    gold -= cost;
    level += 1;
    exp = 0;
  }
  if (level === owned.level) return save;
  return {
    ...save,
    gold,
    ownedUnits: {
      ...save.ownedUnits,
      [unitId]: { ...owned, level, exp }
    }
  };
}

export function unlockUnitByShard(save: SaveData, unitId: string): SaveData {
  const def = UNIT_MAP[unitId];
  if (!def || save.ownedUnits[unitId] || def.unlockMethod.kind !== 'shard') return save;
  if (save.shard < def.unlockMethod.cost) return save;
  return {
    ...save,
    shard: save.shard - def.unlockMethod.cost,
    ownedUnits: {
      ...save.ownedUnits,
      [unitId]: {
        unitId,
        level: 1,
        exp: 0,
        equip: { weapon: null, armor: null, accessory: null },
        sigUnlocked: false,
        sigLevel: 1
      }
    }
  };
}

export function forgeOrUpgradeSignatureWeapon(save: SaveData, unitId: string): SaveData {
  const def = UNIT_MAP[unitId];
  const owned = save.ownedUnits[unitId];
  if (!def || !owned) return save;
  const sig = def.signatureWeapon;

  if (!owned.sigUnlocked) {
    if (save.gold < sig.forgeCostGold || save.shard < sig.forgeCostShard || save.sigCore < sig.forgeCostSigCore) {
      return save;
    }
    return {
      ...save,
      gold: save.gold - sig.forgeCostGold,
      shard: save.shard - sig.forgeCostShard,
      sigCore: save.sigCore - sig.forgeCostSigCore,
      ownedUnits: {
        ...save.ownedUnits,
        [unitId]: { ...owned, sigUnlocked: true, sigLevel: 1 }
      }
    };
  }

  if (owned.sigLevel >= 10) return save;
  const gCost = Math.round(sig.forgeCostGold * 0.65 * owned.sigLevel);
  const pCost = Math.round(35 * owned.sigLevel);
  const cCost = owned.sigLevel >= 5 ? 2 : 1;
  if (save.gold < gCost || save.powder < pCost || save.sigCore < cCost) return save;

  return {
    ...save,
    gold: save.gold - gCost,
    powder: save.powder - pCost,
    sigCore: save.sigCore - cCost,
    ownedUnits: {
      ...save.ownedUnits,
      [unitId]: { ...owned, sigLevel: owned.sigLevel + 1 }
    }
  };
}

export function equipItemToUnit(save: SaveData, unitId: string, itemUid: string | null, slot: EquipSlot): SaveData {
  const owned = save.ownedUnits[unitId];
  if (!owned) return save;

  const nextOwned = Object.fromEntries(
    Object.entries(save.ownedUnits).map(([k, v]) => [k, { ...v, equip: { ...v.equip } }])
  );

  // 他ユニットが装備中なら外す
  if (itemUid) {
    for (const u of Object.values(nextOwned)) {
      if (u.equip[slot] === itemUid) {
        u.equip[slot] = null;
      }
    }
  }
  nextOwned[unitId].equip[slot] = itemUid;
  return { ...save, ownedUnits: nextOwned };
}

export function upgradeEquipmentItem(save: SaveData, itemUid: string): SaveData {
  const idx = save.inventory.findIndex((i) => i.uid === itemUid);
  if (idx < 0) return save;
  const item = save.inventory[idx];
  if (item.level >= 20) return save;
  const cost = getEquipUpgradeCost(item);
  if (save.gold < cost.gold || save.powder < cost.powder) return save;

  const nextInv = [...save.inventory];
  nextInv[idx] = { ...item, level: item.level + 1 };
  return {
    ...save,
    gold: save.gold - cost.gold,
    powder: save.powder - cost.powder,
    inventory: nextInv
  };
}

export function sellEquipmentItem(save: SaveData, itemUid: string): SaveData {
  const item = save.inventory.find((i) => i.uid === itemUid);
  if (!item || item.locked) return save;
  // 装備中は外してから売却
  const nextOwned = Object.fromEntries(
    Object.entries(save.ownedUnits).map(([k, v]) => [
      k,
      {
        ...v,
        equip: {
          weapon: v.equip.weapon === itemUid ? null : v.equip.weapon,
          armor: v.equip.armor === itemUid ? null : v.equip.armor,
          accessory: v.equip.accessory === itemUid ? null : v.equip.accessory
        }
      }
    ])
  );
  return {
    ...save,
    gold: save.gold + item.sellValue,
    powder: save.powder + Math.max(5, Math.round(item.sellValue / 25)),
    ownedUnits: nextOwned,
    inventory: save.inventory.filter((i) => i.uid !== itemUid)
  };
}

export function toggleEquipmentLock(save: SaveData, itemUid: string): SaveData {
  return {
    ...save,
    inventory: save.inventory.map((it) => (it.uid === itemUid ? { ...it, locked: !it.locked } : it))
  };
}

export function claimAchievement(save: SaveData, achId: string): SaveData {
  if (save.claimedAchievements[achId]) return save;
  const ach = ACHIEVEMENTS.find((a) => a.id === achId);
  if (!ach) return save;
  const { current, target } = ach.check(save);
  if (current < target) return save;
  return {
    ...save,
    gold: save.gold + ach.rewardGold,
    shard: save.shard + ach.rewardShard,
    claimedAchievements: { ...save.claimedAchievements, [achId]: true }
  };
}

export { createInitialSave, loadSaveData, persistSaveData };
