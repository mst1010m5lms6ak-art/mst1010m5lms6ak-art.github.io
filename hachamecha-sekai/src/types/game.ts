export type ElementType = 'fire' | 'water' | 'wind' | 'light' | 'dark' | 'none';
export type RaceType = 'human' | 'dragon' | 'monster' | 'fairy' | 'machine';
export type RoleType = 'tank' | 'dealer' | 'supporter' | 'healer';
export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'CHAOS';
export type EquipSlot = 'weapon' | 'armor' | 'accessory';
export type TargetType = 'enemy_single' | 'enemy_all' | 'enemy_random' | 'ally_single' | 'ally_all' | 'self';
export type MainTab = 'stage' | 'party' | 'equip' | 'archive' | 'settings';
export type StageCategory = 'story' | 'tower' | 'boss' | 'farm';
export type BattleSpeed = 1 | 2 | 3;
export type DpsMetric = 'damageDealt' | 'damageTaken' | 'healingDone' | 'healingReceived';

export interface SkillEffect {
  kind:
    | 'damage'
    | 'heal'
    | 'shield'
    | 'buff_atk'
    | 'buff_def'
    | 'buff_spd'
    | 'debuff_def'
    | 'debuff_atk'
    | 'taunt'
    | 'gauge_up'
    | 'gauge_down'
    | 'chaos_gain'
    | 'cleanse'
    | 'stun';
  value: number;
  hits?: number;
  duration?: number;
  chance?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  cooldown: number;
  chaosGain: number;
  target: TargetType;
  effects: SkillEffect[];
}

export interface SignatureWeaponDef {
  id: string;
  unitId: string;
  name: string;
  lore: string;
  atkBonus: number;
  hpBonus: number;
  defBonus: number;
  spdBonus: number;
  critBonus: number;
  passiveTitle: string;
  passiveDesc: string;
  passiveKey:
    | 'counter_burst'
    | 'skill3_amp'
    | 'team_haste'
    | 'overheal_wall'
    | 'crit_chain'
    | 'chaos_surge'
    | 'break_armor'
    | 'iron_fortress';
  forgeCostGold: number;
  forgeCostShard: number;
  forgeCostSigCore: number;
}

export interface UnitDef {
  id: string;
  name: string;
  title: string;
  element: ElementType;
  races: [RaceType] | [RaceType, RaceType];
  role: RoleType;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  baseCrit: number;
  skills: [SkillDef, SkillDef, SkillDef];
  signatureWeapon: SignatureWeaponDef;
  unlockMethod:
    | { kind: 'initial' }
    | { kind: 'stage'; stageId: string; label: string }
    | { kind: 'tower'; floor: number; label: string }
    | { kind: 'shard'; cost: number; label: string };
}

export interface EquipSubStat {
  stat: 'hp' | 'atk' | 'def' | 'spd' | 'crit' | 'chaos';
  value: number;
}

export interface EquipmentItem {
  uid: string;
  templateId: string;
  name: string;
  slot: EquipSlot;
  rarity: Rarity;
  level: number;
  mainStat: 'hp' | 'atk' | 'def' | 'spd';
  mainValue: number;
  subStats: EquipSubStat[];
  locked: boolean;
  sellValue: number;
}

export interface OwnedUnitState {
  unitId: string;
  level: number;
  exp: number;
  equip: {
    weapon: string | null;
    armor: string | null;
    accessory: string | null;
  };
  sigUnlocked: boolean;
  sigLevel: number;
}

export interface ComputedStats {
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  chaosRate: number;
  sigActive: boolean;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  element: ElementType;
  races: [RaceType] | [RaceType, RaceType];
  role: RoleType;
  isBoss?: boolean;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  skills: [SkillDef, SkillDef];
}

export interface StageDef {
  id: string;
  category: StageCategory;
  name: string;
  subtitle: string;
  recommendedPower: number;
  waves: EnemyTemplate[][];
  rewards: {
    gold: number;
    exp: number;
    shard: number;
    powder: number;
    sigCoreChance: number;
    equipDropCount: number;
    rarityWeights: Record<Rarity, number>;
  };
  firstClearUnitId?: string;
  firstClearShard?: number;
  chaosMod?: string;
}

export interface StatusEffect {
  id: 'atk_up' | 'def_up' | 'spd_up' | 'def_down' | 'atk_down' | 'taunt' | 'stun';
  turns: number;
  power: number;
}

export interface BattleActor {
  instanceId: string;
  sourceId: string;
  side: 'ally' | 'enemy';
  slotIndex: number;
  name: string;
  title: string;
  element: ElementType;
  races: [RaceType] | [RaceType, RaceType];
  role: RoleType;
  isBoss?: boolean;
  maxHp: number;
  hp: number;
  shield: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  chaosRate: number;
  sigActive: boolean;
  sigPassiveKey?: SignatureWeaponDef['passiveKey'];
  sigLevel: number;
  gauge: number;
  cooldowns: [number, number, number];
  skills: SkillDef[];
  statuses: StatusEffect[];
  dealerStacks: number;
  alive: boolean;
  animState?: 'idle' | 'attack' | 'hit' | 'heal' | 'burst';
  animNonce: number;
}

export interface ChaosLaw {
  id: string;
  name: string;
  shortDesc: string;
  color: string;
  remainingActions: number;
}

export interface BattleLogEntry {
  id: number;
  text: string;
  tone: 'damage' | 'crit' | 'heal' | 'chaos' | 'buff' | 'system';
}

export interface DpsEntry {
  actorId: string;
  name: string;
  element: ElementType;
  role: RoleType;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  healingReceived: number;
}

export interface FloatingNumber {
  id: number;
  targetId: string;
  text: string;
  kind: 'damage' | 'crit' | 'weak' | 'resist' | 'heal' | 'shield' | 'chaos';
}

export interface BattleFxEvent {
  id: number;
  kind: 'slash' | 'burst' | 'heal' | 'chaos' | 'hit' | 'orb';
  element: ElementType;
  targetSide: 'ally' | 'enemy' | 'all';
  targetSlot?: number;
}

export interface BattleRewardSummary {
  won: boolean;
  stageId: string;
  stageName: string;
  towerFloor?: number;
  durationSec: number;
  turns: number;
  gold: number;
  exp: number;
  shard: number;
  powder: number;
  sigCore: number;
  keptEquips: EquipmentItem[];
  autoSoldCount: number;
  autoSoldGold: number;
  autoSoldPowder: number;
  firstClearUnitId?: string;
  levelUps: Array<{ unitId: string; name: string; from: number; to: number }>;
  dps: DpsEntry[];
}

export interface RepeatSessionSummary {
  stageId: string;
  stageName: string;
  runs: number;
  wins: number;
  losses: number;
  totalDurationSec: number;
  totalGold: number;
  totalExp: number;
  totalShard: number;
  totalPowder: number;
  totalSigCore: number;
  keptEquips: EquipmentItem[];
  autoSoldCount: number;
  autoSoldGold: number;
  autoSoldPowder: number;
  dpsTotals: Record<string, DpsEntry>;
}

export interface BattleState {
  stageId: string;
  stageName: string;
  stageCategory: StageCategory;
  towerFloor?: number;
  waveIndex: number;
  totalWaves: number;
  actors: BattleActor[];
  activeActorId: string | null;
  waitingManual: boolean;
  selectedSkillIndex: number;
  selectedTargetId: string | null;
  chaosGauge: number;
  chaosOrbReady: boolean;
  activeLaw: ChaosLaw | null;
  turnCount: number;
  elapsedSec: number;
  speed: BattleSpeed;
  autoBattle: boolean;
  autoRepeat: boolean;
  logs: BattleLogEntry[];
  nextLogId: number;
  dps: Record<string, DpsEntry>;
  floatingNumbers: FloatingNumber[];
  fxEvents: BattleFxEvent[];
  phase: 'running' | 'victory' | 'defeat';
  lastReward: BattleRewardSummary | null;
  repeatSession: RepeatSessionSummary | null;
  repeatCountdown: number | null;
  showRepeatFinal: boolean;
}

export interface AutoSellSettings {
  enabled: boolean;
  maxRarity: 'none' | 'N' | 'R' | 'SR';
}

export interface UserSettings {
  handedness: 'right' | 'left';
  seEnabled: boolean;
  seVolume: number;
  defaultSpeed: BattleSpeed;
  defaultAuto: boolean;
  autoSell: AutoSellSettings;
  autoChaosOrb: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  rewardShard: number;
  rewardGold: number;
  check: (save: SaveData) => { current: number; target: number };
}

export interface SaveData {
  version: number;
  gold: number;
  shard: number;
  powder: number;
  sigCore: number;
  party: (string | null)[];
  ownedUnits: Record<string, OwnedUnitState>;
  inventory: EquipmentItem[];
  clearedStages: Record<string, number>;
  towerMaxFloor: number;
  totalBattles: number;
  totalWins: number;
  totalChaosTriggered: number;
  totalAutoSold: number;
  claimedAchievements: Record<string, boolean>;
  settings: UserSettings;
}
