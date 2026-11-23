import type { ChaosLaw, ElementType, RaceType, Rarity, RoleType } from '../types/game';

export const ELEMENT_ORDER: ElementType[] = ['fire', 'water', 'wind', 'light', 'dark', 'none'];
export const RACE_ORDER: RaceType[] = ['human', 'dragon', 'monster', 'fairy', 'machine'];
export const ROLE_ORDER: RoleType[] = ['tank', 'dealer', 'supporter', 'healer'];
export const RARITY_ORDER: Rarity[] = ['N', 'R', 'SR', 'SSR', 'CHAOS'];

export const ELEMENT_META: Record<
  ElementType,
  { name: string; short: string; color: string; glow: string; bg: string }
> = {
  fire: { name: '炎', short: '炎', color: '#ff5268', glow: 'rgba(255,82,104,0.45)', bg: 'rgba(255,82,104,0.16)' },
  water: { name: '水', short: '水', color: '#29d2ff', glow: 'rgba(41,210,255,0.45)', bg: 'rgba(41,210,255,0.16)' },
  wind: { name: '風', short: '風', color: '#38f29b', glow: 'rgba(56,242,155,0.45)', bg: 'rgba(56,242,155,0.16)' },
  light: { name: '光', short: '光', color: '#ffd94a', glow: 'rgba(255,217,74,0.45)', bg: 'rgba(255,217,74,0.16)' },
  dark: { name: '闇', short: '闇', color: '#c06bff', glow: 'rgba(192,107,255,0.45)', bg: 'rgba(192,107,255,0.16)' },
  none: { name: '無', short: '無', color: '#c8d0e8', glow: 'rgba(200,208,232,0.4)', bg: 'rgba(200,208,232,0.14)' }
};

export const RACE_META: Record<
  RaceType,
  { name: string; symbol: string; synergy2: string; synergy3: string }
> = {
  human: { name: '人間', symbol: '人', synergy2: '味方全体ATK+10%', synergy3: '味方全体ATK+22%・会心+8%' },
  dragon: { name: '竜', symbol: '竜', synergy2: '味方全体HP+12%', synergy3: '味方全体HP+26%・ATK+10%' },
  monster: { name: '魔物', symbol: '魔', synergy2: '味方全体会心+10%', synergy3: '味方全体会心+22%・追撃強化' },
  fairy: { name: '妖精', symbol: '妖', synergy2: '味方全体SPD+8%', synergy3: '味方全体SPD+18%・回復+12%' },
  machine: { name: '機械', symbol: '機', synergy2: '味方全体DEF+15%', synergy3: '味方全体DEF+32%・開幕シールド' }
};

export const ROLE_META: Record<
  RoleType,
  {
    name: string;
    short: string;
    color: string;
    abilityName: string;
    abilityDesc: string;
  }
> = {
  tank: {
    name: 'タンク',
    short: '盾',
    color: '#4ea8ff',
    abilityName: '鉄壁の挑発',
    abilityDesc: '標的になりやすく被ダメ20%減。被弾時に味方全体へ小シールド付与。'
  },
  dealer: {
    name: 'ディーラー',
    short: '刃',
    color: '#ff5c77',
    abilityName: '追撃の極意',
    abilityDesc: '弱点・会心時に35%追撃。攻撃ごとに与ダメが累積強化(最大+30%)。'
  },
  supporter: {
    name: 'サポーター',
    short: '星',
    color: '#ffd652',
    abilityName: '時空干渉',
    abilityDesc: '行動開始時に最も遅い味方の行動ゲージ+18%加速、強化効果+1T延長。'
  },
  healer: {
    name: 'ヒーラー',
    short: '癒',
    color: '#45f0a2',
    abilityName: '生命の奔流',
    abilityDesc: '回復量+25%。最大HP超過分の回復をシールドへ変換し弱体を1つ解除。'
  }
};

export const RARITY_META: Record<Rarity, { label: string; color: string; border: string; mult: number; sellBase: number }> = {
  N: { label: 'N', color: '#aeb7cc', border: '#59637a', mult: 1.0, sellBase: 60 },
  R: { label: 'R', color: '#47d1ff', border: '#278db3', mult: 1.35, sellBase: 160 },
  SR: { label: 'SR', color: '#d07bff', border: '#9443cc', mult: 1.8, sellBase: 420 },
  SSR: { label: 'SSR', color: '#ffd84d', border: '#d49d15', mult: 2.4, sellBase: 1100 },
  CHAOS: { label: 'CHAOS', color: '#ff4d8d', border: '#ff4d8d', mult: 3.15, sellBase: 2800 }
};

export function getElementMultiplier(attacker: ElementType, defender: ElementType): { mult: number; relation: 'weak' | 'resist' | 'neutral' } {
  if (attacker === 'none' || defender === 'none') {
    return { mult: 1.0, relation: 'neutral' };
  }
  if (
    (attacker === 'fire' && defender === 'wind') ||
    (attacker === 'wind' && defender === 'water') ||
    (attacker === 'water' && defender === 'fire')
  ) {
    return { mult: 1.5, relation: 'weak' };
  }
  if (
    (attacker === 'fire' && defender === 'water') ||
    (attacker === 'water' && defender === 'wind') ||
    (attacker === 'wind' && defender === 'fire')
  ) {
    return { mult: 0.75, relation: 'resist' };
  }
  if ((attacker === 'light' && defender === 'dark') || (attacker === 'dark' && defender === 'light')) {
    return { mult: 1.5, relation: 'weak' };
  }
  return { mult: 1.0, relation: 'neutral' };
}

export const CHAOS_LAWS: Omit<ChaosLaw, 'remainingActions'>[] = [
  {
    id: 'gravity_bug',
    name: '重力バグ',
    shortDesc: '行動加速＆35%確率で追加連撃発生',
    color: '#29d2ff'
  },
  {
    id: 'element_scramble',
    name: '属性ごちゃまぜ',
    shortDesc: '弱点倍率が2.1倍へ暴走！',
    color: '#ff5268'
  },
  {
    id: 'crit_inflation',
    name: '会心インフレ',
    shortDesc: '全攻撃が確定会心＆会心倍率上昇',
    color: '#ffd94a'
  },
  {
    id: 'overheal_boom',
    name: '回復爆発',
    shortDesc: '回復量1.5倍＆被弾時にシールド反射',
    color: '#38f29b'
  },
  {
    id: 'timeline_jam',
    name: '時間大渋滞',
    shortDesc: '味方全員の行動ゲージ+40%即時加速',
    color: '#c06bff'
  },
  {
    id: 'mad_counter',
    name: '狂気の反撃祭',
    shortDesc: '味方が被弾するたびに強烈な反撃発動',
    color: '#ff6f3c'
  }
];
