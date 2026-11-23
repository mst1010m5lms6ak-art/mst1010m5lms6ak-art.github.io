import { ELEMENT_ORDER, RACE_ORDER, RARITY_ORDER, ROLE_ORDER } from '../data/constants';
import type { EquipmentItem, RaceType, UnitDef } from '../types/game';

const elementRank = (el: UnitDef['element']): number => {
  const i = ELEMENT_ORDER.indexOf(el);
  return i === -1 ? 99 : i;
};

const raceRank = (race: RaceType | undefined): number => {
  if (!race) return -1;
  const i = RACE_ORDER.indexOf(race);
  return i === -1 ? 99 : i;
};

const roleRank = (role: UnitDef['role']): number => {
  const i = ROLE_ORDER.indexOf(role);
  return i === -1 ? 99 : i;
};

/**
 * 1. 属性順: 炎 -> 水 -> 風 -> 光 -> 闇 -> 無
 * 2. 種族順: 人間 -> 竜 -> 魔物 -> 妖精 -> 機械
 *    2種族持ちは「人間 -> 人間・竜 -> 人間・魔物 ... -> 竜 -> 竜・魔物 ...」
 * 3. ロール順: タンク -> ディーラー -> サポーター -> ヒーラー
 */
export function compareUnits(a: UnitDef, b: UnitDef): number {
  const elDiff = elementRank(a.element) - elementRank(b.element);
  if (elDiff !== 0) return elDiff;

  const r1Diff = raceRank(a.races[0]) - raceRank(b.races[0]);
  if (r1Diff !== 0) return r1Diff;

  const r2Diff = raceRank(a.races[1]) - raceRank(b.races[1]);
  if (r2Diff !== 0) return r2Diff;

  const roleDiff = roleRank(a.role) - roleRank(b.role);
  if (roleDiff !== 0) return roleDiff;

  return a.id.localeCompare(b.id);
}

export function sortUnits(list: UnitDef[]): UnitDef[] {
  return [...list].sort(compareUnits);
}

export function sortEquipment(list: EquipmentItem[]): EquipmentItem[] {
  return [...list].sort((a, b) => {
    const rDiff = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if (rDiff !== 0) return rDiff;
    if (b.level !== a.level) return b.level - a.level;
    return b.mainValue - a.mainValue;
  });
}
