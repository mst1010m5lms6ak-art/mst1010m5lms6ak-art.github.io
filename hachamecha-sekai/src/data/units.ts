import type { UnitDef } from '../types/game';

export const UNIT_DEFS: UnitDef[] = [
  // ==================== 炎 (FIRE) ====================
  {
    id: 'u_fire_tank',
    name: 'バルド',
    title: '紅蓮の盾兵',
    element: 'fire',
    races: ['human'],
    role: 'tank',
    baseHp: 1380,
    baseAtk: 132,
    baseDef: 158,
    baseSpd: 102,
    baseCrit: 10,
    skills: [
      {
        id: 'sk_ft_1',
        name: '烈火バッシュ',
        desc: '敵単体に炎攻撃＋自身に小シールド。',
        cooldown: 0,
        chaosGain: 10,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 1.05 },
          { kind: 'shield', value: 0.14 }
        ]
      },
      {
        id: 'sk_ft_2',
        name: '焦熱の号令',
        desc: '自身に挑発・防御強化2T＋味方全体シールド。',
        cooldown: 2,
        chaosGain: 16,
        target: 'ally_all',
        effects: [
          { kind: 'taunt', value: 1, duration: 2 },
          { kind: 'buff_def', value: 0.35, duration: 2 },
          { kind: 'shield', value: 0.2 }
        ]
      },
      {
        id: 'sk_ft_3',
        name: 'マグマ要塞崩壊',
        desc: '敵全体へ炎ダメージ＋防御低下＋味方全体大シールド。',
        cooldown: 4,
        chaosGain: 24,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 1.45 },
          { kind: 'debuff_def', value: 0.25, duration: 2 },
          { kind: 'shield', value: 0.28 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_fire_tank',
      unitId: 'u_fire_tank',
      name: '不滅の熔鉄大盾',
      lore: '火山の核を叩き鍛えた紅蓮の要塞盾。',
      atkBonus: 42,
      hpBonus: 460,
      defBonus: 95,
      spdBonus: 8,
      critBonus: 4,
      passiveTitle: '熔岩反響',
      passiveDesc: '被弾時に敵へ反撃＆カオスゲージ+6。',
      passiveKey: 'counter_burst',
      forgeCostGold: 2400,
      forgeCostShard: 35,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'initial' }
  },
  {
    id: 'u_fire_dealer',
    name: 'カイン',
    title: '業火の竜剣士',
    element: 'fire',
    races: ['human', 'dragon'],
    role: 'dealer',
    baseHp: 1020,
    baseAtk: 215,
    baseDef: 92,
    baseSpd: 118,
    baseCrit: 24,
    skills: [
      {
        id: 'sk_fd_1',
        name: '竜炎斬',
        desc: '敵単体に高威力2連撃の炎斬撃。',
        cooldown: 0,
        chaosGain: 11,
        target: 'enemy_single',
        effects: [{ kind: 'damage', value: 0.62, hits: 2 }]
      },
      {
        id: 'sk_fd_2',
        name: '紅蓮覚醒',
        desc: '自身の攻撃強化2T＋敵単体に炎連撃＋防御低下。',
        cooldown: 2,
        chaosGain: 15,
        target: 'enemy_single',
        effects: [
          { kind: 'buff_atk', value: 0.35, duration: 2 },
          { kind: 'damage', value: 1.65 },
          { kind: 'debuff_def', value: 0.22, duration: 2 }
        ]
      },
      {
        id: 'sk_fd_3',
        name: 'メテオ・インフェルノ',
        desc: '敵全体へ3連撃の竜炎流星群を叩き込む。',
        cooldown: 4,
        chaosGain: 26,
        target: 'enemy_all',
        effects: [{ kind: 'damage', value: 0.78, hits: 3 }]
      }
    ],
    signatureWeapon: {
      id: 'sig_fire_dealer',
      unitId: 'u_fire_dealer',
      name: '灼竜牙ブランディッシュ',
      lore: '古竜の牙を芯に据えた暴炎の魔剣。',
      atkBonus: 135,
      hpBonus: 210,
      defBonus: 25,
      spdBonus: 12,
      critBonus: 14,
      passiveTitle: '竜炎暴走',
      passiveDesc: '奥義ダメージ+40%＆会心発生時に追撃強化。',
      passiveKey: 'skill3_amp',
      forgeCostGold: 2600,
      forgeCostShard: 40,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'stage', stageId: 'st_02', label: '混沌の旅路 1-2 初回クリア' }
  },
  {
    id: 'u_fire_heal',
    name: 'イグナ',
    title: '熾天の焔竜',
    element: 'fire',
    races: ['dragon', 'fairy'],
    role: 'healer',
    baseHp: 1160,
    baseAtk: 154,
    baseDef: 112,
    baseSpd: 114,
    baseCrit: 12,
    skills: [
      {
        id: 'sk_fh_1',
        name: '灯火の息吹',
        desc: '敵単体に炎攻撃＋最も負傷した味方を回復。',
        cooldown: 0,
        chaosGain: 10,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.9 },
          { kind: 'heal', value: 0.75 }
        ]
      },
      {
        id: 'sk_fh_2',
        name: '不死鳥の羽音',
        desc: '味方全体を大きく回復し弱体を解除。',
        cooldown: 2,
        chaosGain: 15,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 1.35 },
          { kind: 'cleanse', value: 1 }
        ]
      },
      {
        id: 'sk_fh_3',
        name: '陽炎リバース',
        desc: '味方全体を超回復＋攻撃強化2T＋行動ゲージ加速。',
        cooldown: 4,
        chaosGain: 22,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 1.9 },
          { kind: 'buff_atk', value: 0.25, duration: 2 },
          { kind: 'gauge_up', value: 22 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_fire_heal',
      unitId: 'u_fire_heal',
      name: '鳳翼の聖炎杖',
      lore: '絶えぬ再生の炎を宿す竜妖の秘杖。',
      atkBonus: 88,
      hpBonus: 360,
      defBonus: 48,
      spdBonus: 14,
      critBonus: 6,
      passiveTitle: '熾炎の護膜',
      passiveDesc: '超過回復シールド変換率1.6倍＆回復量+20%。',
      passiveKey: 'overheal_wall',
      forgeCostGold: 2600,
      forgeCostShard: 40,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'shard', cost: 45, label: 'カオス結晶 45 で解放' }
  },
  {
    id: 'u_fire_sup',
    name: 'フレア',
    title: '爆炎の機巧師',
    element: 'fire',
    races: ['machine'],
    role: 'supporter',
    baseHp: 1080,
    baseAtk: 162,
    baseDef: 118,
    baseSpd: 128,
    baseCrit: 16,
    skills: [
      {
        id: 'sk_fs_1',
        name: '点火スパーク',
        desc: '敵単体に炎攻撃＋カオスゲージ大幅上昇。',
        cooldown: 0,
        chaosGain: 18,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.95 },
          { kind: 'chaos_gain', value: 8 }
        ]
      },
      {
        id: 'sk_fs_2',
        name: 'ターボ過給',
        desc: '味方全体の攻撃・速度強化2T＋行動ゲージ加速。',
        cooldown: 2,
        chaosGain: 16,
        target: 'ally_all',
        effects: [
          { kind: 'buff_atk', value: 0.3, duration: 2 },
          { kind: 'buff_spd', value: 0.25, duration: 2 },
          { kind: 'gauge_up', value: 24 }
        ]
      },
      {
        id: 'sk_fs_3',
        name: 'オーバーヒート炉心',
        desc: '敵全体に炎ダメージ＋防御大幅低下＋カオス急上昇。',
        cooldown: 4,
        chaosGain: 32,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 1.5 },
          { kind: 'debuff_def', value: 0.35, duration: 2 },
          { kind: 'chaos_gain', value: 20 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_fire_sup',
      unitId: 'u_fire_sup',
      name: '暴走機関イグナイタ',
      lore: '安全装置を最初から外した加速炉。',
      atkBonus: 82,
      hpBonus: 260,
      defBonus: 55,
      spdBonus: 24,
      critBonus: 8,
      passiveTitle: 'カオス過給機',
      passiveDesc: '全行動でカオスゲージ追加+10＆味方加速強化。',
      passiveKey: 'chaos_surge',
      forgeCostGold: 2500,
      forgeCostShard: 38,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'stage', stageId: 'st_05', label: '混沌の旅路 2-1 初回クリア' }
  },

  // ==================== 水 (WATER) ====================
  {
    id: 'u_water_dealer',
    name: 'ミオ',
    title: '蒼流の竜騎士',
    element: 'water',
    races: ['human', 'dragon'],
    role: 'dealer',
    baseHp: 1050,
    baseAtk: 208,
    baseDef: 98,
    baseSpd: 122,
    baseCrit: 22,
    skills: [
      {
        id: 'sk_wd_1',
        name: '蒼槍突き',
        desc: '敵単体に鋭い水属性突き＋自身加速。',
        cooldown: 0,
        chaosGain: 11,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 1.15 },
          { kind: 'gauge_up', value: 12 }
        ]
      },
      {
        id: 'sk_wd_2',
        name: '渦潮スラスト',
        desc: '敵ランダムへ3連撃＋行動ゲージ後退。',
        cooldown: 2,
        chaosGain: 16,
        target: 'enemy_random',
        effects: [
          { kind: 'damage', value: 0.72, hits: 3 },
          { kind: 'gauge_down', value: 15 }
        ]
      },
      {
        id: 'sk_wd_3',
        name: '海竜王の激流槍',
        desc: '敵単体へ極大4連撃＋防御破壊。',
        cooldown: 4,
        chaosGain: 24,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.78, hits: 4 },
          { kind: 'debuff_def', value: 0.3, duration: 2 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_water_dealer',
      unitId: 'u_water_dealer',
      name: '海神槍レヴィア',
      lore: '激流を束ねた蒼竜騎士の秘槍。',
      atkBonus: 128,
      hpBonus: 240,
      defBonus: 32,
      spdBonus: 18,
      critBonus: 12,
      passiveTitle: '激流連環',
      passiveDesc: '会心発生時に行動ゲージ+20%＆追撃威力上昇。',
      passiveKey: 'crit_chain',
      forgeCostGold: 2400,
      forgeCostShard: 35,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'initial' }
  },
  {
    id: 'u_water_sup',
    name: 'レン',
    title: '氷霧の魔導師',
    element: 'water',
    races: ['human', 'monster'],
    role: 'supporter',
    baseHp: 1030,
    baseAtk: 168,
    baseDef: 106,
    baseSpd: 125,
    baseCrit: 18,
    skills: [
      {
        id: 'sk_ws_1',
        name: '凍てつく矢',
        desc: '敵単体に水攻撃＋敵の行動ゲージ後退。',
        cooldown: 0,
        chaosGain: 11,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.96 },
          { kind: 'gauge_down', value: 18 }
        ]
      },
      {
        id: 'sk_ws_2',
        name: '絶対零度ミスト',
        desc: '敵全体の攻撃・防御低下2T＋高確率スタン。',
        cooldown: 3,
        chaosGain: 17,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 0.9 },
          { kind: 'debuff_atk', value: 0.28, duration: 2 },
          { kind: 'debuff_def', value: 0.25, duration: 2 },
          { kind: 'stun', value: 1, duration: 1, chance: 0.45 }
        ]
      },
      {
        id: 'sk_ws_3',
        name: '氷結タイムフリーズ',
        desc: '敵全体へ水攻撃＋行動ゲージ大幅後退＋味方加速。',
        cooldown: 4,
        chaosGain: 24,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 1.45 },
          { kind: 'gauge_down', value: 38 },
          { kind: 'gauge_up', value: 20 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_water_sup',
      unitId: 'u_water_sup',
      name: '零度魔典フロスト',
      lore: '時間を凍らせる魔氷の禁書。',
      atkBonus: 92,
      hpBonus: 240,
      defBonus: 42,
      spdBonus: 22,
      critBonus: 10,
      passiveTitle: '氷砕の呪印',
      passiveDesc: '攻撃時に敵の防御をさらに15%削り行動遅延強化。',
      passiveKey: 'break_armor',
      forgeCostGold: 2600,
      forgeCostShard: 40,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'shard', cost: 40, label: 'カオス結晶 40 で解放' }
  },
  {
    id: 'u_water_tank',
    name: 'カイ',
    title: '深海の甲殻機',
    element: 'water',
    races: ['monster', 'machine'],
    role: 'tank',
    baseHp: 1460,
    baseAtk: 124,
    baseDef: 170,
    baseSpd: 96,
    baseCrit: 8,
    skills: [
      {
        id: 'sk_wt_1',
        name: '水圧クラッシュ',
        desc: '敵単体に水攻撃＋敵の攻撃低下。',
        cooldown: 0,
        chaosGain: 10,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 1.0 },
          { kind: 'debuff_atk', value: 0.2, duration: 2 }
        ]
      },
      {
        id: 'sk_wt_2',
        name: '深海隔壁展開',
        desc: '自身に挑発＋味方全体へ特大シールド＋防御強化。',
        cooldown: 2,
        chaosGain: 16,
        target: 'ally_all',
        effects: [
          { kind: 'taunt', value: 1, duration: 2 },
          { kind: 'shield', value: 0.3 },
          { kind: 'buff_def', value: 0.35, duration: 2 }
        ]
      },
      {
        id: 'sk_wt_3',
        name: 'アビス・リフレクター',
        desc: '敵全体へ防御参照の水圧波＋味方全体シールド＆回復。',
        cooldown: 4,
        chaosGain: 23,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 1.5 },
          { kind: 'shield', value: 0.26 },
          { kind: 'heal', value: 0.85 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_water_tank',
      unitId: 'u_water_tank',
      name: '海溝装甲シェルコア',
      lore: '深海の極圧に耐える生体機械の核。',
      atkBonus: 36,
      hpBonus: 540,
      defBonus: 112,
      spdBonus: 8,
      critBonus: 4,
      passiveTitle: '絶対水圧壁',
      passiveDesc: '戦闘開始時＆行動時に味方全体へ追加シールド展開。',
      passiveKey: 'iron_fortress',
      forgeCostGold: 2700,
      forgeCostShard: 42,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'stage', stageId: 'st_04', label: '混沌の旅路 1-4 初回クリア' }
  },
  {
    id: 'u_water_heal',
    name: 'シズク',
    title: '泡沫の精霊',
    element: 'water',
    races: ['fairy'],
    role: 'healer',
    baseHp: 1120,
    baseAtk: 148,
    baseDef: 108,
    baseSpd: 120,
    baseCrit: 12,
    skills: [
      {
        id: 'sk_wh_1',
        name: '雫の癒波',
        desc: '味方単体を回復し行動ゲージ+14%加速。',
        cooldown: 0,
        chaosGain: 10,
        target: 'ally_single',
        effects: [
          { kind: 'heal', value: 1.25 },
          { kind: 'gauge_up', value: 14 }
        ]
      },
      {
        id: 'sk_wh_2',
        name: '清浄アクアベール',
        desc: '味方全体を回復＋弱体解除＋防御強化2T。',
        cooldown: 2,
        chaosGain: 15,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 1.3 },
          { kind: 'cleanse', value: 2 },
          { kind: 'buff_def', value: 0.25, duration: 2 }
        ]
      },
      {
        id: 'sk_wh_3',
        name: '大洋の祝福雨',
        desc: '味方全体を超回復＋特大シールド生成。',
        cooldown: 4,
        chaosGain: 22,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 2.1 },
          { kind: 'shield', value: 0.28 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_water_heal',
      unitId: 'u_water_heal',
      name: '蒼雫の結晶鈴',
      lore: '揺らぐたびに清らかな水膜を編む精霊の鈴。',
      atkBonus: 78,
      hpBonus: 340,
      defBonus: 50,
      spdBonus: 18,
      critBonus: 6,
      passiveTitle: '泡沫の聖域',
      passiveDesc: '超過回復シールド変換率1.6倍＆回復量+20%。',
      passiveKey: 'overheal_wall',
      forgeCostGold: 2500,
      forgeCostShard: 38,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'shard', cost: 40, label: 'カオス結晶 40 で解放' }
  },

  // ==================== 風 (WIND) ====================
  {
    id: 'u_wind_heal',
    name: 'カナデ',
    title: '翠風の旅人',
    element: 'wind',
    races: ['human'],
    role: 'healer',
    baseHp: 1140,
    baseAtk: 152,
    baseDef: 108,
    baseSpd: 124,
    baseCrit: 14,
    skills: [
      {
        id: 'sk_nh_1',
        name: 'そよ風の調べ',
        desc: '敵単体に風攻撃＋味方全体を小回復。',
        cooldown: 0,
        chaosGain: 11,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.88 },
          { kind: 'heal', value: 0.65 }
        ]
      },
      {
        id: 'sk_nh_2',
        name: '緑風のアンサンブル',
        desc: '味方全体を回復＋速度強化2T＋弱体解除。',
        cooldown: 2,
        chaosGain: 16,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 1.35 },
          { kind: 'buff_spd', value: 0.25, duration: 2 },
          { kind: 'cleanse', value: 1 }
        ]
      },
      {
        id: 'sk_nh_3',
        name: '疾風シンフォニア',
        desc: '味方全体を超回復＋行動ゲージ+30%加速。',
        cooldown: 4,
        chaosGain: 23,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 1.85 },
          { kind: 'gauge_up', value: 30 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_wind_heal',
      unitId: 'u_wind_heal',
      name: '翠風の竪琴ハープ',
      lore: '戦場に心地よい疾風を呼ぶ旅人の楽器。',
      atkBonus: 82,
      hpBonus: 320,
      defBonus: 46,
      spdBonus: 24,
      critBonus: 8,
      passiveTitle: '風追いリズム',
      passiveDesc: '行動ごとに味方全員の行動ゲージ+8%加速。',
      passiveKey: 'team_haste',
      forgeCostGold: 2600,
      forgeCostShard: 40,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'shard', cost: 45, label: 'カオス結晶 45 で解放' }
  },
  {
    id: 'u_wind_tank',
    name: 'ゼファー',
    title: '蒼穹の鋼翼',
    element: 'wind',
    races: ['dragon', 'machine'],
    role: 'tank',
    baseHp: 1360,
    baseAtk: 145,
    baseDef: 152,
    baseSpd: 118,
    baseCrit: 14,
    skills: [
      {
        id: 'sk_nt_1',
        name: 'ソニックウイング',
        desc: '敵単体に風攻撃＋自身にシールド＆加速。',
        cooldown: 0,
        chaosGain: 11,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 1.05 },
          { kind: 'shield', value: 0.14 },
          { kind: 'gauge_up', value: 10 }
        ]
      },
      {
        id: 'sk_nt_2',
        name: '気流インターセプト',
        desc: '自身に挑発＋味方全体の速度・防御強化2T。',
        cooldown: 2,
        chaosGain: 16,
        target: 'ally_all',
        effects: [
          { kind: 'taunt', value: 1, duration: 2 },
          { kind: 'buff_def', value: 0.3, duration: 2 },
          { kind: 'buff_spd', value: 0.22, duration: 2 }
        ]
      },
      {
        id: 'sk_nt_3',
        name: 'トルネード・イージス',
        desc: '敵全体に風連撃＋攻撃低下＋味方全体シールド。',
        cooldown: 4,
        chaosGain: 24,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 0.8, hits: 2 },
          { kind: 'debuff_atk', value: 0.28, duration: 2 },
          { kind: 'shield', value: 0.28 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_wind_tank',
      unitId: 'u_wind_tank',
      name: 'ジェット竜翼ブースター',
      lore: '暴風を装甲へと変換する超高速翼。',
      atkBonus: 62,
      hpBonus: 420,
      defBonus: 88,
      spdBonus: 22,
      critBonus: 8,
      passiveTitle: '嵐撃カウンター',
      passiveDesc: '被弾時に鋭い風刃反撃＆カオスゲージ+6。',
      passiveKey: 'counter_burst',
      forgeCostGold: 2700,
      forgeCostShard: 44,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'tower', floor: 5, label: '無限塔 5階 突破で解放' }
  },
  {
    id: 'u_wind_dealer',
    name: 'ガロウ',
    title: '嵐牙の魔獣',
    element: 'wind',
    races: ['monster'],
    role: 'dealer',
    baseHp: 990,
    baseAtk: 212,
    baseDef: 86,
    baseSpd: 136,
    baseCrit: 28,
    skills: [
      {
        id: 'sk_nd_1',
        name: '疾風爪',
        desc: '敵単体へ目にも留まらぬ3連撃。',
        cooldown: 0,
        chaosGain: 12,
        target: 'enemy_single',
        effects: [{ kind: 'damage', value: 0.42, hits: 3 }]
      },
      {
        id: 'sk_nd_2',
        name: '狂嵐ハント',
        desc: '自身に速度・攻撃強化＋敵単体へ強烈な2連撃。',
        cooldown: 2,
        chaosGain: 16,
        target: 'enemy_single',
        effects: [
          { kind: 'buff_atk', value: 0.3, duration: 2 },
          { kind: 'buff_spd', value: 0.25, duration: 2 },
          { kind: 'damage', value: 0.95, hits: 2 }
        ]
      },
      {
        id: 'sk_nd_3',
        name: 'テンペスト・ランペイジ',
        desc: '敵ランダムへ5連撃の嵐牙乱舞。',
        cooldown: 4,
        chaosGain: 26,
        target: 'enemy_random',
        effects: [{ kind: 'damage', value: 0.68, hits: 5 }]
      }
    ],
    signatureWeapon: {
      id: 'sig_wind_dealer',
      unitId: 'u_wind_dealer',
      name: '裂空の双牙爪',
      lore: '音速を超えて獲物を刻む暴風獣の爪。',
      atkBonus: 130,
      hpBonus: 180,
      defBonus: 22,
      spdBonus: 26,
      critBonus: 18,
      passiveTitle: '音速連撃',
      passiveDesc: '会心発生時に行動ゲージ+20%＆連撃加速。',
      passiveKey: 'crit_chain',
      forgeCostGold: 2600,
      forgeCostShard: 40,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'stage', stageId: 'st_03', label: '混沌の旅路 1-3 初回クリア' }
  },
  {
    id: 'u_wind_sup',
    name: 'シルフ',
    title: '疾風の羽精',
    element: 'wind',
    races: ['fairy'],
    role: 'supporter',
    baseHp: 1020,
    baseAtk: 156,
    baseDef: 98,
    baseSpd: 138,
    baseCrit: 16,
    skills: [
      {
        id: 'sk_ns_1',
        name: '追い風ウインク',
        desc: '敵単体に風攻撃＋味方最遅の行動ゲージ+16%。',
        cooldown: 0,
        chaosGain: 12,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.9 },
          { kind: 'gauge_up', value: 16 }
        ]
      },
      {
        id: 'sk_ns_2',
        name: 'フェアリー・ヘイスト',
        desc: '味方全体の速度・攻撃強化2T＋行動ゲージ+26%。',
        cooldown: 2,
        chaosGain: 18,
        target: 'ally_all',
        effects: [
          { kind: 'buff_spd', value: 0.3, duration: 2 },
          { kind: 'buff_atk', value: 0.25, duration: 2 },
          { kind: 'gauge_up', value: 26 }
        ]
      },
      {
        id: 'sk_ns_3',
        name: '風精の大号令',
        desc: '敵全体へ風ダメージ＋味方全員の行動ゲージ+45%！',
        cooldown: 4,
        chaosGain: 26,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 1.25 },
          { kind: 'gauge_up', value: 45 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_wind_sup',
      unitId: 'u_wind_sup',
      name: '蒼風の精霊羽笛',
      lore: '吹けば時の流れすら追い抜く精霊の笛。',
      atkBonus: 74,
      hpBonus: 240,
      defBonus: 40,
      spdBonus: 30,
      critBonus: 10,
      passiveTitle: '無限の追い風',
      passiveDesc: '行動ごとに味方全員の行動ゲージ+8%加速。',
      passiveKey: 'team_haste',
      forgeCostGold: 2400,
      forgeCostShard: 35,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'initial' }
  },

  // ==================== 光 (LIGHT) ====================
  {
    id: 'u_light_heal',
    name: 'ルナ',
    title: '星詠みの巫女',
    element: 'light',
    races: ['human', 'fairy'],
    role: 'healer',
    baseHp: 1140,
    baseAtk: 158,
    baseDef: 110,
    baseSpd: 118,
    baseCrit: 14,
    skills: [
      {
        id: 'sk_lh_1',
        name: '星屑の祈り',
        desc: '敵単体に光攻撃＋味方全体を小回復。',
        cooldown: 0,
        chaosGain: 11,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.92 },
          { kind: 'heal', value: 0.7 }
        ]
      },
      {
        id: 'sk_lh_2',
        name: '月光の加護',
        desc: '味方全体を大回復＋シールド付与＋弱体解除。',
        cooldown: 2,
        chaosGain: 16,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 1.4 },
          { kind: 'shield', value: 0.16 },
          { kind: 'cleanse', value: 1 }
        ]
      },
      {
        id: 'sk_lh_3',
        name: 'スターライト・ミラクル',
        desc: '味方全体を超回復＋攻撃・防御強化2T＋カオス増加。',
        cooldown: 4,
        chaosGain: 25,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 2.0 },
          { kind: 'buff_atk', value: 0.25, duration: 2 },
          { kind: 'buff_def', value: 0.25, duration: 2 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_light_heal',
      unitId: 'u_light_heal',
      name: '星環の天球杖',
      lore: '星々の軌道を写し取り癒やしへ変える秘杖。',
      atkBonus: 86,
      hpBonus: 340,
      defBonus: 52,
      spdBonus: 16,
      critBonus: 8,
      passiveTitle: '星幕の聖壁',
      passiveDesc: '超過回復シールド変換率1.6倍＆回復量+20%。',
      passiveKey: 'overheal_wall',
      forgeCostGold: 2400,
      forgeCostShard: 35,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'initial' }
  },
  {
    id: 'u_light_tank',
    name: 'イージス',
    title: '聖鎧の機人',
    element: 'light',
    races: ['human', 'machine'],
    role: 'tank',
    baseHp: 1440,
    baseAtk: 138,
    baseDef: 168,
    baseSpd: 104,
    baseCrit: 10,
    skills: [
      {
        id: 'sk_lt_1',
        name: '閃光シールド打',
        desc: '敵単体に光攻撃＋低確率スタン＋小シールド。',
        cooldown: 0,
        chaosGain: 10,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 1.02 },
          { kind: 'shield', value: 0.14 },
          { kind: 'stun', value: 1, duration: 1, chance: 0.28 }
        ]
      },
      {
        id: 'sk_lt_2',
        name: '聖域プロトコル',
        desc: '自身に挑発＋味方全体へ防御強化＆シールド＆弱体解除。',
        cooldown: 2,
        chaosGain: 16,
        target: 'ally_all',
        effects: [
          { kind: 'taunt', value: 1, duration: 2 },
          { kind: 'buff_def', value: 0.4, duration: 2 },
          { kind: 'shield', value: 0.26 },
          { kind: 'cleanse', value: 1 }
        ]
      },
      {
        id: 'sk_lt_3',
        name: 'ヘヴンズ・フォートレス',
        desc: '敵全体へ閃光波＋攻撃低下＋味方全体へ極大シールド。',
        cooldown: 4,
        chaosGain: 24,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 1.4 },
          { kind: 'debuff_atk', value: 0.3, duration: 2 },
          { kind: 'shield', value: 0.36 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_light_tank',
      unitId: 'u_light_tank',
      name: '天盾アルカディア',
      lore: '光量子障壁を常時展開する聖機甲盾。',
      atkBonus: 48,
      hpBonus: 520,
      defBonus: 110,
      spdBonus: 12,
      critBonus: 5,
      passiveTitle: '常時量子障壁',
      passiveDesc: '戦闘開始時＆行動時に味方全体へ追加シールド展開。',
      passiveKey: 'iron_fortress',
      forgeCostGold: 2800,
      forgeCostShard: 45,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'stage', stageId: 'st_06', label: '混沌の旅路 2-2 初回クリア' }
  },
  {
    id: 'u_light_dealer',
    name: 'ソラ',
    title: '輝翼の天竜',
    element: 'light',
    races: ['dragon'],
    role: 'dealer',
    baseHp: 1100,
    baseAtk: 222,
    baseDef: 102,
    baseSpd: 120,
    baseCrit: 24,
    skills: [
      {
        id: 'sk_ld_1',
        name: '天光ブレス',
        desc: '敵単体に貫通力の高い光ブレス。',
        cooldown: 0,
        chaosGain: 12,
        target: 'enemy_single',
        effects: [{ kind: 'damage', value: 1.22 }]
      },
      {
        id: 'sk_ld_2',
        name: 'シャイニング・ダイブ',
        desc: '敵全体へ2連撃の光急降下＋防御低下。',
        cooldown: 2,
        chaosGain: 16,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 0.68, hits: 2 },
          { kind: 'debuff_def', value: 0.22, duration: 2 }
        ]
      },
      {
        id: 'sk_ld_3',
        name: 'スーパーノヴァ・レイ',
        desc: '敵全体へ極大光レーザー＋自身攻撃強化。',
        cooldown: 4,
        chaosGain: 26,
        target: 'enemy_all',
        effects: [
          { kind: 'buff_atk', value: 0.3, duration: 2 },
          { kind: 'damage', value: 2.35 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_light_dealer',
      unitId: 'u_light_dealer',
      name: '天陽の竜宝珠',
      lore: '星一つ分の閃光を閉じ込めた聖竜の宝珠。',
      atkBonus: 145,
      hpBonus: 260,
      defBonus: 36,
      spdBonus: 14,
      critBonus: 15,
      passiveTitle: '超新星増幅',
      passiveDesc: '奥義ダメージ+40%＆弱点攻撃の威力を大幅強化。',
      passiveKey: 'skill3_amp',
      forgeCostGold: 3000,
      forgeCostShard: 50,
      forgeCostSigCore: 3
    },
    unlockMethod: { kind: 'stage', stageId: 'st_08', label: '混沌の旅路 2-4 初回クリア' }
  },
  {
    id: 'u_light_sup',
    name: 'プリズム',
    title: '光核の精霊機',
    element: 'light',
    races: ['fairy', 'machine'],
    role: 'supporter',
    baseHp: 1060,
    baseAtk: 160,
    baseDef: 114,
    baseSpd: 132,
    baseCrit: 18,
    skills: [
      {
        id: 'sk_ls_1',
        name: 'プリズムビーム',
        desc: '敵単体に光攻撃＋カオスゲージ急上昇。',
        cooldown: 0,
        chaosGain: 18,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.95 },
          { kind: 'chaos_gain', value: 9 }
        ]
      },
      {
        id: 'sk_ls_2',
        name: '七色オーバードライブ',
        desc: '味方全体に攻撃・防御・速度強化2T！',
        cooldown: 3,
        chaosGain: 20,
        target: 'ally_all',
        effects: [
          { kind: 'buff_atk', value: 0.28, duration: 2 },
          { kind: 'buff_def', value: 0.28, duration: 2 },
          { kind: 'buff_spd', value: 0.24, duration: 2 }
        ]
      },
      {
        id: 'sk_ls_3',
        name: 'スペクトル・カオス',
        desc: '敵全体へ光連撃＋味方加速＋カオスゲージ爆発上昇。',
        cooldown: 4,
        chaosGain: 34,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 0.75, hits: 2 },
          { kind: 'gauge_up', value: 28 },
          { kind: 'chaos_gain', value: 22 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_light_sup',
      unitId: 'u_light_sup',
      name: '七彩分光コア',
      lore: '光を無限に分光して混沌を増幅する結晶機。',
      atkBonus: 84,
      hpBonus: 260,
      defBonus: 54,
      spdBonus: 26,
      critBonus: 12,
      passiveTitle: '光乱反射',
      passiveDesc: '全行動でカオスゲージ追加+10＆味方全体支援強化。',
      passiveKey: 'chaos_surge',
      forgeCostGold: 2900,
      forgeCostShard: 48,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'shard', cost: 55, label: 'カオス結晶 55 で解放' }
  },

  // ==================== 闇 (DARK) ====================
  {
    id: 'u_dark_dealer',
    name: 'クロウ',
    title: '呪腕の狂戦士',
    element: 'dark',
    races: ['human', 'monster'],
    role: 'dealer',
    baseHp: 980,
    baseAtk: 232,
    baseDef: 84,
    baseSpd: 124,
    baseCrit: 30,
    skills: [
      {
        id: 'sk_dd_1',
        name: '漆黒の裂爪',
        desc: '敵単体に高会心の闇2連撃。',
        cooldown: 0,
        chaosGain: 12,
        target: 'enemy_single',
        effects: [{ kind: 'damage', value: 0.65, hits: 2 }]
      },
      {
        id: 'sk_dd_2',
        name: 'ブラッド・フレンジー',
        desc: '自身の攻撃極大強化＋敵単体へ防御貫通の闇撃。',
        cooldown: 2,
        chaosGain: 18,
        target: 'enemy_single',
        effects: [
          { kind: 'buff_atk', value: 0.45, duration: 2 },
          { kind: 'damage', value: 1.75 },
          { kind: 'debuff_def', value: 0.25, duration: 2 }
        ]
      },
      {
        id: 'sk_dd_3',
        name: 'カタストロフ・レイジ',
        desc: '敵ランダムへ4連撃の狂気斬撃＋カオス急上昇。',
        cooldown: 4,
        chaosGain: 28,
        target: 'enemy_random',
        effects: [
          { kind: 'damage', value: 0.88, hits: 4 },
          { kind: 'chaos_gain', value: 14 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_dark_dealer',
      unitId: 'u_dark_dealer',
      name: '魔腕グラトニー',
      lore: '敵の防御も理性も喰らい尽くす漆黒の籠手。',
      atkBonus: 152,
      hpBonus: 190,
      defBonus: 20,
      spdBonus: 16,
      critBonus: 20,
      passiveTitle: '狂宴チェーン',
      passiveDesc: '会心発生時に行動ゲージ+20%＆追撃威力上昇。',
      passiveKey: 'crit_chain',
      forgeCostGold: 2800,
      forgeCostShard: 46,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'stage', stageId: 'st_07', label: '混沌の旅路 2-3 初回クリア' }
  },
  {
    id: 'u_dark_tank',
    name: 'ヴリトラ',
    title: '深淵の禍竜',
    element: 'dark',
    races: ['dragon', 'monster'],
    role: 'tank',
    baseHp: 1520,
    baseAtk: 146,
    baseDef: 156,
    baseSpd: 98,
    baseCrit: 12,
    skills: [
      {
        id: 'sk_dt_1',
        name: '闇鱗の重撃',
        desc: '敵単体に闇攻撃＋敵の攻撃低下＋自己回復。',
        cooldown: 0,
        chaosGain: 11,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 1.05 },
          { kind: 'debuff_atk', value: 0.22, duration: 2 },
          { kind: 'heal', value: 0.65 }
        ]
      },
      {
        id: 'sk_dt_2',
        name: '深淵の咆哮',
        desc: '自身に挑発＋敵全体の攻撃・防御低下2T。',
        cooldown: 2,
        chaosGain: 18,
        target: 'enemy_all',
        effects: [
          { kind: 'taunt', value: 1, duration: 2 },
          { kind: 'damage', value: 0.85 },
          { kind: 'debuff_atk', value: 0.3, duration: 2 },
          { kind: 'debuff_def', value: 0.25, duration: 2 }
        ]
      },
      {
        id: 'sk_dt_3',
        name: 'アビス・ドミニオン',
        desc: '敵全体へ闇波動＋スタン判定＋味方全体シールド。',
        cooldown: 4,
        chaosGain: 26,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 1.55 },
          { kind: 'stun', value: 1, duration: 1, chance: 0.4 },
          { kind: 'shield', value: 0.28 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_dark_tank',
      unitId: 'u_dark_tank',
      name: '禍竜の黒逆鱗',
      lore: '触れた者に災厄を返す呪いの竜鱗。',
      atkBonus: 65,
      hpBonus: 580,
      defBonus: 98,
      spdBonus: 10,
      critBonus: 8,
      passiveTitle: '災厄の逆鱗',
      passiveDesc: '被弾時に強烈な闇反撃＆カオスゲージ+6。',
      passiveKey: 'counter_burst',
      forgeCostGold: 3000,
      forgeCostShard: 50,
      forgeCostSigCore: 3
    },
    unlockMethod: { kind: 'tower', floor: 10, label: '無限塔 10階 突破で解放' }
  },
  {
    id: 'u_dark_sup',
    name: 'ノクス',
    title: '悪戯の夢魔',
    element: 'dark',
    races: ['monster', 'fairy'],
    role: 'supporter',
    baseHp: 1010,
    baseAtk: 174,
    baseDef: 94,
    baseSpd: 134,
    baseCrit: 20,
    skills: [
      {
        id: 'sk_ds_1',
        name: '悪夢ウィスパー',
        desc: '敵単体に闇攻撃＋防御低下＋行動遅延。',
        cooldown: 0,
        chaosGain: 13,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.95 },
          { kind: 'debuff_def', value: 0.22, duration: 2 },
          { kind: 'gauge_down', value: 15 }
        ]
      },
      {
        id: 'sk_ds_2',
        name: 'カオス・トリック',
        desc: '敵全体の防御・攻撃を大幅低下＋カオスゲージ+20。',
        cooldown: 2,
        chaosGain: 22,
        target: 'enemy_all',
        effects: [
          { kind: 'debuff_def', value: 0.35, duration: 2 },
          { kind: 'debuff_atk', value: 0.25, duration: 2 },
          { kind: 'chaos_gain', value: 20 }
        ]
      },
      {
        id: 'sk_ds_3',
        name: 'ナイトメア・カーニバル',
        desc: '敵全体へ3連撃の幻惑攻撃＋高確率スタン＋遅延。',
        cooldown: 4,
        chaosGain: 28,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 0.62, hits: 3 },
          { kind: 'stun', value: 1, duration: 1, chance: 0.5 },
          { kind: 'gauge_down', value: 28 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_dark_sup',
      unitId: 'u_dark_sup',
      name: '夢幻の道化仮面',
      lore: '敵の戦意と装甲を同時に溶かす魔妖の仮面。',
      atkBonus: 98,
      hpBonus: 230,
      defBonus: 40,
      spdBonus: 26,
      critBonus: 14,
      passiveTitle: '装甲融解',
      passiveDesc: '攻撃時に追加で敵防御を削り弱体効果を強化。',
      passiveKey: 'break_armor',
      forgeCostGold: 2800,
      forgeCostShard: 46,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'shard', cost: 55, label: 'カオス結晶 55 で解放' }
  },
  {
    id: 'u_dark_heal',
    name: 'ユラ',
    title: '冥影の自動人形',
    element: 'dark',
    races: ['machine'],
    role: 'healer',
    baseHp: 1180,
    baseAtk: 162,
    baseDef: 122,
    baseSpd: 114,
    baseCrit: 14,
    skills: [
      {
        id: 'sk_dh_1',
        name: 'ドレイン・ニードル',
        desc: '敵単体に闇攻撃＋味方全体を小回復。',
        cooldown: 0,
        chaosGain: 11,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 1.05 },
          { kind: 'heal', value: 0.72 }
        ]
      },
      {
        id: 'sk_dh_2',
        name: '影縫いの修復術',
        desc: '味方全体を大回復＋防御強化＋弱体全解除。',
        cooldown: 2,
        chaosGain: 15,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 1.45 },
          { kind: 'buff_def', value: 0.3, duration: 2 },
          { kind: 'cleanse', value: 3 }
        ]
      },
      {
        id: 'sk_dh_3',
        name: '冥界ナノリペア',
        desc: '敵全体から生命吸収攻撃＋味方全体を超回復＆シールド。',
        cooldown: 4,
        chaosGain: 24,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 1.25 },
          { kind: 'heal', value: 1.85 },
          { kind: 'shield', value: 0.22 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_dark_heal',
      unitId: 'u_dark_heal',
      name: '黒曜の縫合ユニット',
      lore: '傷跡を即座に黒い装甲膜へ塗り替える修復器。',
      atkBonus: 92,
      hpBonus: 360,
      defBonus: 66,
      spdBonus: 16,
      critBonus: 8,
      passiveTitle: '黒膜リペア',
      passiveDesc: '超過回復シールド変換率1.6倍＆回復量+20%。',
      passiveKey: 'overheal_wall',
      forgeCostGold: 2800,
      forgeCostShard: 46,
      forgeCostSigCore: 2
    },
    unlockMethod: { kind: 'stage', stageId: 'st_09', label: '混沌の旅路 3-1 初回クリア' }
  },

  // ==================== 無 (NONE) ====================
  {
    id: 'u_none_tank',
    name: 'ゼロ',
    title: '境界の番人',
    element: 'none',
    races: ['human'],
    role: 'tank',
    baseHp: 1480,
    baseAtk: 144,
    baseDef: 166,
    baseSpd: 110,
    baseCrit: 14,
    skills: [
      {
        id: 'sk_zt_1',
        name: '無拍子カウンター',
        desc: '敵単体に無属性打撃＋シールド＋カオス増加。',
        cooldown: 0,
        chaosGain: 14,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 1.08 },
          { kind: 'shield', value: 0.16 }
        ]
      },
      {
        id: 'sk_zt_2',
        name: '零式ガード展開',
        desc: '自身に挑発＋味方全体特大シールド＆防御強化2T。',
        cooldown: 2,
        chaosGain: 20,
        target: 'ally_all',
        effects: [
          { kind: 'taunt', value: 1, duration: 2 },
          { kind: 'shield', value: 0.32 },
          { kind: 'buff_def', value: 0.4, duration: 2 }
        ]
      },
      {
        id: 'sk_zt_3',
        name: '次元遮断ドーム',
        desc: '敵全体へ無属性衝撃波＋遅延＋味方全体シールド＆加速。',
        cooldown: 4,
        chaosGain: 30,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 1.5 },
          { kind: 'gauge_down', value: 24 },
          { kind: 'shield', value: 0.34 },
          { kind: 'gauge_up', value: 18 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_none_tank',
      unitId: 'u_none_tank',
      name: '境界盾ヌル・ウォール',
      lore: 'あらゆる属性を無へ還す空白の盾。',
      atkBonus: 58,
      hpBonus: 560,
      defBonus: 118,
      spdBonus: 16,
      critBonus: 8,
      passiveTitle: '無の絶対防壁',
      passiveDesc: '戦闘開始時＆行動時に味方全体へ追加シールド展開。',
      passiveKey: 'iron_fortress',
      forgeCostGold: 3200,
      forgeCostShard: 55,
      forgeCostSigCore: 3
    },
    unlockMethod: { kind: 'stage', stageId: 'st_10', label: '混沌の旅路 3-2 初回クリア' }
  },
  {
    id: 'u_none_sup',
    name: 'ギア',
    title: '歯車仕掛けの道化',
    element: 'none',
    races: ['human', 'machine'],
    role: 'supporter',
    baseHp: 1080,
    baseAtk: 170,
    baseDef: 118,
    baseSpd: 140,
    baseCrit: 20,
    skills: [
      {
        id: 'sk_zs_1',
        name: 'ぜんまい乱打',
        desc: '敵ランダムへ2連撃＋カオス急上昇。',
        cooldown: 0,
        chaosGain: 20,
        target: 'enemy_random',
        effects: [
          { kind: 'damage', value: 0.55, hits: 2 },
          { kind: 'chaos_gain', value: 10 }
        ]
      },
      {
        id: 'sk_zs_2',
        name: '時間ねじまき',
        desc: '味方全員の行動ゲージ+32%加速＋攻撃・速度強化2T！',
        cooldown: 2,
        chaosGain: 22,
        target: 'ally_all',
        effects: [
          { kind: 'gauge_up', value: 32 },
          { kind: 'buff_atk', value: 0.3, duration: 2 },
          { kind: 'buff_spd', value: 0.28, duration: 2 }
        ]
      },
      {
        id: 'sk_zs_3',
        name: 'はちゃめちゃ歯車暴走',
        desc: '敵全体へ3連撃＋防御低下＋カオスゲージ超大爆発！',
        cooldown: 4,
        chaosGain: 40,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 0.65, hits: 3 },
          { kind: 'debuff_def', value: 0.35, duration: 2 },
          { kind: 'chaos_gain', value: 28 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_none_sup',
      unitId: 'u_none_sup',
      name: '永久ねじまきクロック',
      lore: '世界の歯車を逆回転させる道化の懐中時計。',
      atkBonus: 92,
      hpBonus: 280,
      defBonus: 58,
      spdBonus: 32,
      critBonus: 14,
      passiveTitle: '混沌加速ギア',
      passiveDesc: '全行動でカオスゲージ追加+10＆味方加速強化。',
      passiveKey: 'chaos_surge',
      forgeCostGold: 3200,
      forgeCostShard: 55,
      forgeCostSigCore: 3
    },
    unlockMethod: { kind: 'shard', cost: 65, label: 'カオス結晶 65 で解放' }
  },
  {
    id: 'u_none_dealer',
    name: 'カオス',
    title: '虚無の混沌竜',
    element: 'none',
    races: ['dragon'],
    role: 'dealer',
    baseHp: 1180,
    baseAtk: 245,
    baseDef: 108,
    baseSpd: 128,
    baseCrit: 28,
    skills: [
      {
        id: 'sk_zd_1',
        name: '混沌の爪撃',
        desc: '敵単体に高威力2連撃＋カオスゲージ大幅増加。',
        cooldown: 0,
        chaosGain: 16,
        target: 'enemy_single',
        effects: [{ kind: 'damage', value: 0.68, hits: 2 }]
      },
      {
        id: 'sk_zd_2',
        name: '次元裂き',
        desc: '敵全体へ無属性2連撃＋防御大幅破壊。',
        cooldown: 2,
        chaosGain: 22,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 0.82, hits: 2 },
          { kind: 'debuff_def', value: 0.32, duration: 2 }
        ]
      },
      {
        id: 'sk_zd_3',
        name: 'ビッグバン・カオス',
        desc: '敵全体へ4連撃の終末砲撃！カオス法則中はさらに暴走！',
        cooldown: 4,
        chaosGain: 34,
        target: 'enemy_all',
        effects: [
          { kind: 'damage', value: 0.85, hits: 4 },
          { kind: 'chaos_gain', value: 20 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_none_dealer',
      unitId: 'u_none_dealer',
      name: '終焉竜核シンギュラリティ',
      lore: '混沌世界の中心で脈打つ特異点の竜核。',
      atkBonus: 165,
      hpBonus: 320,
      defBonus: 42,
      spdBonus: 20,
      critBonus: 20,
      passiveTitle: '特異点暴走',
      passiveDesc: '奥義ダメージ+40%＆カオス法則発動中は全威力上昇。',
      passiveKey: 'skill3_amp',
      forgeCostGold: 3600,
      forgeCostShard: 65,
      forgeCostSigCore: 3
    },
    unlockMethod: { kind: 'stage', stageId: 'st_12', label: '混沌の旅路 3-4 初回クリア' }
  },
  {
    id: 'u_none_heal',
    name: 'ミミ',
    title: '歪み喰いの幻妖',
    element: 'none',
    races: ['monster', 'fairy'],
    role: 'healer',
    baseHp: 1180,
    baseAtk: 168,
    baseDef: 114,
    baseSpd: 126,
    baseCrit: 16,
    skills: [
      {
        id: 'sk_zh_1',
        name: 'ぱくぱく浄化',
        desc: '敵単体に無属性攻撃＋味方全体の弱体解除＆回復。',
        cooldown: 0,
        chaosGain: 14,
        target: 'enemy_single',
        effects: [
          { kind: 'damage', value: 0.96 },
          { kind: 'heal', value: 0.78 },
          { kind: 'cleanse', value: 1 }
        ]
      },
      {
        id: 'sk_zh_2',
        name: 'はちゃめちゃ回復鍋',
        desc: '味方全体を超回復＋ランダム強化＋カオス増加！',
        cooldown: 2,
        chaosGain: 22,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 1.55 },
          { kind: 'buff_atk', value: 0.25, duration: 2 },
          { kind: 'buff_spd', value: 0.2, duration: 2 }
        ]
      },
      {
        id: 'sk_zh_3',
        name: '世界の歪み大宴会',
        desc: '味方全体を超回復＋大シールド＋行動ゲージ+35%加速！',
        cooldown: 4,
        chaosGain: 30,
        target: 'ally_all',
        effects: [
          { kind: 'heal', value: 2.15 },
          { kind: 'shield', value: 0.3 },
          { kind: 'gauge_up', value: 35 }
        ]
      }
    ],
    signatureWeapon: {
      id: 'sig_none_heal',
      unitId: 'u_none_heal',
      name: '万象ごちゃまぜ大杓子',
      lore: '世界の歪みをすくって癒やしへ煮込む幻妖の杓子。',
      atkBonus: 94,
      hpBonus: 360,
      defBonus: 54,
      spdBonus: 24,
      critBonus: 10,
      passiveTitle: '宴の加速リズム',
      passiveDesc: '行動ごとに味方全員の行動ゲージ+8%加速＆回復強化。',
      passiveKey: 'team_haste',
      forgeCostGold: 3200,
      forgeCostShard: 55,
      forgeCostSigCore: 3
    },
    unlockMethod: { kind: 'tower', floor: 15, label: '無限塔 15階 突破で解放' }
  }
];

export const UNIT_MAP: Record<string, UnitDef> = Object.fromEntries(UNIT_DEFS.map((u) => [u.id, u]));
