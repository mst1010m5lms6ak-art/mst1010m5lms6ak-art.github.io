import { RACE_ORDER } from '../data/constants';
import { getEquipEffectiveMainValue } from '../data/equipment';
import { UNIT_MAP } from '../data/units';
import type { ComputedStats, EquipmentItem, OwnedUnitState, RaceType, SaveData } from '../types/game';

export interface ActiveSynergy {
  race: RaceType;
  count: number;
  tier: 0 | 2 | 3;
}

export function getExpForNextLevel(level: number): number {
  return Math.round(120 * Math.pow(level, 1.45));
}

export function getLevelUpGoldCost(level: number): number {
  return Math.round(160 * Math.pow(level, 1.25));
}

export function getPartySynergies(party: (string | null)[]): ActiveSynergy[] {
  const counts: Record<RaceType, number> = {
    human: 0,
    dragon: 0,
    monster: 0,
    fairy: 0,
    machine: 0
  };
  for (const uid of party) {
    if (!uid) continue;
    const def = UNIT_MAP[uid];
    if (!def) continue;
    for (const r of def.races) {
      counts[r] += 1;
    }
  }
  return RACE_ORDER.map((race) => {
    const count = counts[race];
    const tier: 0 | 2 | 3 = count >= 3 ? 3 : count >= 2 ? 2 : 0;
    return { race, count, tier };
  }).filter((s) => s.count > 0);
}

export function computeUnitStats(
  unitId: string,
  owned: OwnedUnitState,
  inventoryMap: Record<string, EquipmentItem>,
  synergies: ActiveSynergy[] = []
): ComputedStats {
  const def = UNIT_MAP[unitId];
  const lv = owned.level;
  const lvMult = 1 + (lv - 1) * 0.115;

  let maxHp = Math.round(def.baseHp * lvMult);
  let atk = Math.round(def.baseAtk * lvMult);
  let defStat = Math.round(def.baseDef * lvMult);
  let spd = Math.round(def.baseSpd + (lv - 1) * 0.65);
  let crit = def.baseCrit;
  let chaosRate = def.element === 'none' ? 125 : 100;

  const eqIds = [owned.equip.weapon, owned.equip.armor, owned.equip.accessory];
  for (const eqId of eqIds) {
    if (!eqId) continue;
    const item = inventoryMap[eqId];
    if (!item) continue;
    const mv = getEquipEffectiveMainValue(item);
    if (item.mainStat === 'hp') maxHp += mv;
    if (item.mainStat === 'atk') atk += mv;
    if (item.mainStat === 'def') defStat += mv;
    if (item.mainStat === 'spd') spd += mv;
    for (const sub of item.subStats) {
      if (sub.stat === 'hp') maxHp += sub.value;
      if (sub.stat === 'atk') atk += sub.value;
      if (sub.stat === 'def') defStat += sub.value;
      if (sub.stat === 'spd') spd += sub.value;
      if (sub.stat === 'crit') crit += sub.value;
      if (sub.stat === 'chaos') chaosRate += sub.value;
    }
  }

  if (owned.sigUnlocked) {
    const sig = def.signatureWeapon;
    const sMult = 1 + (owned.sigLevel - 1) * 0.22;
    maxHp += Math.round(sig.hpBonus * sMult);
    atk += Math.round(sig.atkBonus * sMult);
    defStat += Math.round(sig.defBonus * sMult);
    spd += Math.round(sig.spdBonus * (1 + (owned.sigLevel - 1) * 0.1));
    crit += Math.round(sig.critBonus * (1 + (owned.sigLevel - 1) * 0.1));
  }

  // 種族シナジー反映
  let hpPct = 1;
  let atkPct = 1;
  let defPct = 1;
  let spdPct = 1;
  for (const s of synergies) {
    if (s.tier === 0) continue;
    if (s.race === 'human') {
      atkPct += s.tier === 3 ? 0.22 : 0.1;
      if (s.tier === 3) crit += 8;
    }
    if (s.race === 'dragon') {
      hpPct += s.tier === 3 ? 0.26 : 0.12;
      if (s.tier === 3) atkPct += 0.1;
    }
    if (s.race === 'monster') {
      crit += s.tier === 3 ? 22 : 10;
    }
    if (s.race === 'fairy') {
      spdPct += s.tier === 3 ? 0.18 : 0.08;
    }
    if (s.race === 'machine') {
      defPct += s.tier === 3 ? 0.32 : 0.15;
    }
  }

  return {
    maxHp: Math.round(maxHp * hpPct),
    atk: Math.round(atk * atkPct),
    def: Math.round(defStat * defPct),
    spd: Math.round(spd * spdPct),
    crit: Math.min(95, crit),
    chaosRate,
    sigActive: owned.sigUnlocked
  };
}

export function calcUnitPower(stats: ComputedStats): number {
  return Math.round(stats.maxHp * 0.36 + stats.atk * 3.1 + stats.def * 2.1 + stats.spd * 2.4 + stats.crit * 8 + (stats.sigActive ? 350 : 0));
}

export function calcPartyPower(save: SaveData): number {
  const invMap = Object.fromEntries(save.inventory.map((i) => [i.uid, i]));
  const syns = getPartySynergies(save.party);
  let total = 0;
  for (const uid of save.party) {
    if (!uid) continue;
    const owned = save.ownedUnits[uid];
    if (!owned) continue;
    total += calcUnitPower(computeUnitStats(uid, owned, invMap, syns));
  }
  return total;
}
