import type { EquipmentItem, EquipSlot, EquipSubStat, Rarity } from '../types/game';
import { RARITY_META } from './constants';

interface EquipTemplate {
  id: string;
  name: string;
  slot: EquipSlot;
  mainStat: 'hp' | 'atk' | 'def' | 'spd';
  baseValue: number;
}

const EQUIP_TEMPLATES: EquipTemplate[] = [
  { id: 'eq_w_blade', name: '混沌の乱刃', slot: 'weapon', mainStat: 'atk', baseValue: 48 },
  { id: 'eq_w_hammer', name: '暴走ハンマー', slot: 'weapon', mainStat: 'atk', baseValue: 54 },
  { id: 'eq_w_staff', name: '歪み魔導杖', slot: 'weapon', mainStat: 'atk', baseValue: 45 },
  { id: 'eq_w_lance', name: '音速ドリル槍', slot: 'weapon', mainStat: 'spd', baseValue: 12 },
  { id: 'eq_a_plate', name: 'はちゃめちゃ装甲', slot: 'armor', mainStat: 'def', baseValue: 44 },
  { id: 'eq_a_cloak', name: '星屑マント', slot: 'armor', mainStat: 'hp', baseValue: 340 },
  { id: 'eq_a_core', name: '竜鱗ベスト', slot: 'armor', mainStat: 'hp', baseValue: 380 },
  { id: 'eq_c_ring', name: '加速クロック環', slot: 'accessory', mainStat: 'spd', baseValue: 14 },
  { id: 'eq_c_orb', name: '狂乱の宝珠', slot: 'accessory', mainStat: 'atk', baseValue: 36 },
  { id: 'eq_c_charm', name: '守護のお守り', slot: 'accessory', mainStat: 'hp', baseValue: 290 }
];

const RARITY_PREFIX: Record<Rarity, string[]> = {
  N: ['古びた', '量産の'],
  R: ['精鋭の', '閃く'],
  SR: ['魔導', '轟く'],
  SSR: ['神域の', '超絶'],
  CHAOS: ['はちゃめちゃ', '特異点']
};

const SUB_STAT_POOL: Array<{ stat: EquipSubStat['stat']; min: number; max: number }> = [
  { stat: 'hp', min: 45, max: 115 },
  { stat: 'atk', min: 10, max: 28 },
  { stat: 'def', min: 8, max: 24 },
  { stat: 'spd', min: 3, max: 9 },
  { stat: 'crit', min: 3, max: 9 },
  { stat: 'chaos', min: 4, max: 12 }
];

const SUB_COUNT_BY_RARITY: Record<Rarity, number> = {
  N: 1,
  R: 2,
  SR: 2,
  SSR: 3,
  CHAOS: 4
};

function pickRarity(weights: Record<Rarity, number>): Rarity {
  const entries = Object.entries(weights) as [Rarity, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return 'N';
  let roll = Math.random() * total;
  for (const [r, w] of entries) {
    roll -= w;
    if (roll <= 0) return r;
  }
  return entries[entries.length - 1][0];
}

let equipSeq = 1;

export function rollEquipmentDrop(weights: Record<Rarity, number>, powerTier = 1): EquipmentItem {
  const rarity = pickRarity(weights);
  const tpl = EQUIP_TEMPLATES[Math.floor(Math.random() * EQUIP_TEMPLATES.length)];
  const meta = RARITY_META[rarity];
  const tierFactor = 1 + Math.min(2.6, powerTier * 0.12);
  const variance = 0.9 + Math.random() * 0.22;
  const mainValue = Math.max(1, Math.round(tpl.baseValue * meta.mult * tierFactor * variance));

  const subCount = SUB_COUNT_BY_RARITY[rarity];
  const pool = [...SUB_STAT_POOL];
  const subStats: EquipSubStat[] = [];
  for (let i = 0; i < subCount && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const chosen = pool.splice(idx, 1)[0];
    const raw = chosen.min + Math.random() * (chosen.max - chosen.min);
    const mult = chosen.stat === 'crit' || chosen.stat === 'chaos' || chosen.stat === 'spd' ? Math.sqrt(meta.mult) : meta.mult;
    subStats.push({
      stat: chosen.stat,
      value: Math.max(1, Math.round(raw * mult))
    });
  }

  const prefixes = RARITY_PREFIX[rarity];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const uid = `eq_${Date.now().toString(36)}_${(equipSeq++).toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

  return {
    uid,
    templateId: tpl.id,
    name: `${prefix}${tpl.name}`,
    slot: tpl.slot,
    rarity,
    level: 1,
    mainStat: tpl.mainStat,
    mainValue,
    subStats,
    locked: rarity === 'CHAOS',
    sellValue: Math.round(meta.sellBase * tierFactor)
  };
}

export function getEquipEffectiveMainValue(item: EquipmentItem): number {
  return Math.round(item.mainValue * (1 + (item.level - 1) * 0.14));
}

export function getEquipUpgradeCost(item: EquipmentItem): { gold: number; powder: number } {
  const rMult = RARITY_META[item.rarity].mult;
  return {
    gold: Math.round(140 * item.level * rMult),
    powder: Math.round(10 * item.level * Math.sqrt(rMult))
  };
}

export function getStatLabel(stat: EquipSubStat['stat']): string {
  switch (stat) {
    case 'hp':
      return 'HP';
    case 'atk':
      return 'ATK';
    case 'def':
      return 'DEF';
    case 'spd':
      return 'SPD';
    case 'crit':
      return '会心%';
    case 'chaos':
      return '混沌%';
  }
}

export function getSlotLabel(slot: EquipSlot): string {
  switch (slot) {
    case 'weapon':
      return '武器';
    case 'armor':
      return '防具';
    case 'accessory':
      return '装飾';
  }
}

export function createStarterEquipment(): EquipmentItem[] {
  return [
    {
      uid: 'starter_eq_1',
      templateId: 'eq_w_blade',
      name: '精鋭の混沌の乱刃',
      slot: 'weapon',
      rarity: 'R',
      level: 1,
      mainStat: 'atk',
      mainValue: 68,
      subStats: [
        { stat: 'crit', value: 6 },
        { stat: 'spd', value: 5 }
      ],
      locked: false,
      sellValue: 180
    },
    {
      uid: 'starter_eq_2',
      templateId: 'eq_a_plate',
      name: '精鋭のはちゃめちゃ装甲',
      slot: 'armor',
      rarity: 'R',
      level: 1,
      mainStat: 'def',
      mainValue: 62,
      subStats: [
        { stat: 'hp', value: 110 },
        { stat: 'def', value: 14 }
      ],
      locked: false,
      sellValue: 180
    }
  ];
}
