import type { ElementType, EnemyTemplate, RaceType, RoleType, StageDef } from '../types/game';

function mkEnemy(
  id: string,
  name: string,
  element: ElementType,
  races: [RaceType] | [RaceType, RaceType],
  role: RoleType,
  hp: number,
  atk: number,
  def: number,
  spd: number,
  isBoss = false
): EnemyTemplate {
  return {
    id,
    name,
    element,
    races,
    role,
    isBoss,
    hp,
    atk,
    def,
    spd,
    skills: [
      {
        id: `${id}_s1`,
        name: isBoss ? '混沌の重撃' : '突撃',
        desc: '単体攻撃',
        cooldown: 0,
        chaosGain: 8,
        target: 'enemy_single',
        effects: [{ kind: 'damage', value: isBoss ? 1.18 : 1.0 }]
      },
      {
        id: `${id}_s2`,
        name: isBoss ? '大崩壊ウェイブ' : '荒れ狂う一撃',
        desc: isBoss ? '全体大攻撃' : '強攻撃',
        cooldown: isBoss ? 3 : 2,
        chaosGain: 14,
        target: isBoss ? 'enemy_all' : role === 'healer' ? 'ally_all' : 'enemy_single',
        effects: isBoss
          ? [
              { kind: 'damage', value: 1.25 },
              { kind: 'debuff_def', value: 0.2, duration: 2 }
            ]
          : role === 'healer'
            ? [{ kind: 'heal', value: 1.1 }]
            : [{ kind: 'damage', value: 1.38 }]
      }
    ]
  };
}

export const STAGE_DEFS: StageDef[] = [
  // ==================== 混沌の旅路 (12ステージ) ====================
  {
    id: 'st_01',
    category: 'story',
    name: '1-1 はちゃめちゃ草原',
    subtitle: '歪み始めた世界の入り口',
    recommendedPower: 1800,
    waves: [
      [
        mkEnemy('e_1_1', 'ぷよスライム', 'wind', ['monster'], 'dealer', 620, 92, 42, 92),
        mkEnemy('e_1_2', 'ねぼけゴブリン', 'fire', ['monster'], 'tank', 720, 84, 52, 86)
      ],
      [
        mkEnemy('e_1_3', 'はちゃめちゃ狼', 'wind', ['monster'], 'dealer', 950, 108, 48, 102, true),
        mkEnemy('e_1_4', '火の粉フェアリー', 'fire', ['fairy'], 'supporter', 620, 88, 44, 106)
      ]
    ],
    rewards: {
      gold: 380,
      exp: 180,
      shard: 5,
      powder: 12,
      sigCoreChance: 0.08,
      equipDropCount: 2,
      rarityWeights: { N: 65, R: 28, SR: 6, SSR: 1, CHAOS: 0 }
    },
    firstClearShard: 12
  },
  {
    id: 'st_02',
    category: 'story',
    name: '1-2 爆燃スクラップ谷',
    subtitle: '燃える歯車と暴走竜',
    recommendedPower: 2600,
    waves: [
      [
        mkEnemy('e_2_1', '暴走トースター機', 'fire', ['machine'], 'dealer', 860, 118, 65, 98),
        mkEnemy('e_2_2', '炎トカゲ', 'fire', ['dragon'], 'dealer', 900, 122, 58, 104)
      ],
      [
        mkEnemy('e_2_3', '灼熱スクラップ竜', 'fire', ['dragon', 'machine'], 'tank', 1650, 138, 84, 104, true),
        mkEnemy('e_2_4', '小悪魔ボマー', 'fire', ['monster'], 'dealer', 860, 128, 52, 110)
      ]
    ],
    rewards: {
      gold: 540,
      exp: 260,
      shard: 6,
      powder: 18,
      sigCoreChance: 0.12,
      equipDropCount: 2,
      rarityWeights: { N: 52, R: 36, SR: 10, SSR: 2, CHAOS: 0 }
    },
    firstClearUnitId: 'u_fire_dealer',
    firstClearShard: 12
  },
  {
    id: 'st_03',
    category: 'story',
    name: '1-3 逆流する大瀑布',
    subtitle: '水が空へ昇る異常領域',
    recommendedPower: 3600,
    waves: [
      [
        mkEnemy('e_3_1', '逆流クラゲ', 'water', ['monster'], 'supporter', 1120, 136, 72, 112),
        mkEnemy('e_3_2', '氷殻ガニ', 'water', ['monster', 'machine'], 'tank', 1350, 128, 96, 94)
      ],
      [
        mkEnemy('e_3_3', '瀑流の海蛇王', 'water', ['dragon'], 'dealer', 2450, 165, 92, 112, true),
        mkEnemy('e_3_4', '泡沫ウィスプ', 'water', ['fairy'], 'healer', 1180, 124, 72, 114)
      ]
    ],
    rewards: {
      gold: 740,
      exp: 360,
      shard: 8,
      powder: 25,
      sigCoreChance: 0.15,
      equipDropCount: 2,
      rarityWeights: { N: 42, R: 40, SR: 14, SSR: 4, CHAOS: 0 }
    },
    firstClearUnitId: 'u_wind_dealer',
    firstClearShard: 14
  },
  {
    id: 'st_04',
    category: 'story',
    name: '1-4 竜巻サーカス団',
    subtitle: '空飛ぶ獣と狂騒の嵐',
    recommendedPower: 4800,
    waves: [
      [
        mkEnemy('e_4_1', '突風ハーピー', 'wind', ['monster', 'fairy'], 'dealer', 1420, 168, 76, 126),
        mkEnemy('e_4_2', '風車ゴーレム', 'wind', ['machine'], 'tank', 1780, 148, 115, 96)
      ],
      [
        mkEnemy('e_4_3', '大竜巻キメラ', 'wind', ['dragon', 'monster'], 'dealer', 3300, 196, 102, 122, true),
        mkEnemy('e_4_4', '嵐笛フェアリー', 'wind', ['fairy'], 'supporter', 1480, 152, 82, 130),
        mkEnemy('e_4_5', '暴風ハウンド', 'wind', ['monster'], 'dealer', 1520, 178, 78, 128)
      ]
    ],
    rewards: {
      gold: 980,
      exp: 490,
      shard: 10,
      powder: 34,
      sigCoreChance: 0.2,
      equipDropCount: 3,
      rarityWeights: { N: 30, R: 42, SR: 21, SSR: 6, CHAOS: 1 }
    },
    firstClearUnitId: 'u_water_tank',
    firstClearShard: 16
  },
  {
    id: 'st_05',
    category: 'story',
    name: '2-1 歯車メトロポリス',
    subtitle: '自動人形が踊る鋼鉄都市',
    recommendedPower: 6400,
    waves: [
      [
        mkEnemy('e_5_1', '警備オートマタ', 'light', ['machine'], 'tank', 2180, 185, 140, 108),
        mkEnemy('e_5_2', '高圧レーザー機', 'fire', ['machine'], 'dealer', 1860, 224, 108, 122)
      ],
      [
        mkEnemy('e_5_3', '超鋼鉄市長ロボ', 'none', ['human', 'machine'], 'tank', 4600, 232, 148, 114, true),
        mkEnemy('e_5_4', '修理ドローン', 'light', ['machine'], 'healer', 1960, 172, 112, 124),
        mkEnemy('e_5_5', '火炎放水機', 'fire', ['machine'], 'dealer', 1920, 228, 102, 120)
      ]
    ],
    rewards: {
      gold: 1320,
      exp: 680,
      shard: 12,
      powder: 45,
      sigCoreChance: 0.24,
      equipDropCount: 3,
      rarityWeights: { N: 22, R: 40, SR: 27, SSR: 9, CHAOS: 2 }
    },
    firstClearUnitId: 'u_fire_sup',
    firstClearShard: 18
  },
  {
    id: 'st_06',
    category: 'story',
    name: '2-2 眩惑のプリズム聖堂',
    subtitle: '光が万華鏡のように割れる神殿',
    recommendedPower: 8200,
    waves: [
      [
        mkEnemy('e_6_1', '閃光セラフ機', 'light', ['fairy', 'machine'], 'supporter', 2380, 224, 128, 132),
        mkEnemy('e_6_2', '白銀の聖騎士', 'light', ['human'], 'tank', 2820, 210, 165, 112)
      ],
      [
        mkEnemy('e_6_3', '万華鏡の熾天竜', 'light', ['dragon', 'fairy'], 'dealer', 5900, 276, 142, 128, true),
        mkEnemy('e_6_4', '祈りの光精', 'light', ['fairy'], 'healer', 2500, 206, 124, 128),
        mkEnemy('e_6_5', '光槍ガード', 'light', ['human', 'machine'], 'dealer', 2480, 258, 134, 124)
      ]
    ],
    rewards: {
      gold: 1700,
      exp: 900,
      shard: 14,
      powder: 60,
      sigCoreChance: 0.28,
      equipDropCount: 3,
      rarityWeights: { N: 15, R: 36, SR: 33, SSR: 13, CHAOS: 3 }
    },
    firstClearUnitId: 'u_light_tank',
    firstClearShard: 20
  },
  {
    id: 'st_07',
    category: 'story',
    name: '2-3 ナイトメア遊園地',
    subtitle: '影が笑い出す真夜中の楽園',
    recommendedPower: 10200,
    waves: [
      [
        mkEnemy('e_7_1', '影ピエロ', 'dark', ['human', 'monster'], 'supporter', 2840, 266, 132, 136),
        mkEnemy('e_7_2', '呪いの観覧車霊', 'dark', ['monster', 'machine'], 'tank', 3450, 248, 172, 108)
      ],
      [
        mkEnemy('e_7_3', '悪夢団長メフィスト', 'dark', ['monster', 'fairy'], 'dealer', 7600, 318, 152, 134, true),
        mkEnemy('e_7_4', '闇喰いコウモリ', 'dark', ['monster'], 'dealer', 2920, 294, 126, 138),
        mkEnemy('e_7_5', '影縫いドール', 'dark', ['machine'], 'healer', 3100, 242, 146, 126)
      ]
    ],
    rewards: {
      gold: 2150,
      exp: 1180,
      shard: 16,
      powder: 78,
      sigCoreChance: 0.34,
      equipDropCount: 3,
      rarityWeights: { N: 10, R: 30, SR: 38, SSR: 17, CHAOS: 5 }
    },
    firstClearUnitId: 'u_dark_dealer',
    firstClearShard: 22
  },
  {
    id: 'st_08',
    category: 'story',
    name: '2-4 天空の竜闘技場',
    subtitle: '古竜たちが覇を競う浮遊島',
    recommendedPower: 12800,
    waves: [
      [
        mkEnemy('e_8_1', '炎翼ワイバーン', 'fire', ['dragon'], 'dealer', 3600, 325, 156, 134),
        mkEnemy('e_8_2', '氷鱗ドレイク', 'water', ['dragon'], 'tank', 4200, 295, 198, 116)
      ],
      [
        mkEnemy('e_8_3', '覇天の光竜帝', 'light', ['dragon'], 'dealer', 9800, 368, 184, 132, true),
        mkEnemy('e_8_4', '嵐翼ワイバーン', 'wind', ['dragon'], 'supporter', 3650, 312, 152, 142),
        mkEnemy('e_8_5', '闇鱗ドレイク', 'dark', ['dragon', 'monster'], 'dealer', 3850, 345, 160, 132)
      ]
    ],
    rewards: {
      gold: 2700,
      exp: 1520,
      shard: 19,
      powder: 98,
      sigCoreChance: 0.4,
      equipDropCount: 4,
      rarityWeights: { N: 5, R: 25, SR: 40, SSR: 23, CHAOS: 7 }
    },
    firstClearUnitId: 'u_light_dealer',
    firstClearShard: 24
  },
  {
    id: 'st_09',
    category: 'story',
    name: '3-1 歪みの境界回廊',
    subtitle: '物理法則が気まぐれに入れ替わる',
    recommendedPower: 15800,
    waves: [
      [
        mkEnemy('e_9_1', '虚無センチネル', 'none', ['machine'], 'tank', 4900, 355, 224, 124),
        mkEnemy('e_9_2', '歪みウィッチ', 'dark', ['human', 'fairy'], 'supporter', 4300, 378, 172, 142)
      ],
      [
        mkEnemy('e_9_3', '境界の双頭魔機', 'none', ['monster', 'machine'], 'dealer', 12400, 425, 206, 136, true),
        mkEnemy('e_9_4', '光影スプリット', 'light', ['fairy'], 'healer', 4600, 342, 182, 138),
        mkEnemy('e_9_5', '影光スプリット', 'dark', ['monster'], 'dealer', 4600, 405, 174, 140)
      ]
    ],
    rewards: {
      gold: 3350,
      exp: 1950,
      shard: 22,
      powder: 125,
      sigCoreChance: 0.45,
      equipDropCount: 4,
      rarityWeights: { N: 2, R: 18, SR: 42, SSR: 28, CHAOS: 10 }
    },
    firstClearUnitId: 'u_dark_heal',
    firstClearShard: 26
  },
  {
    id: 'st_10',
    category: 'story',
    name: '3-2 無限時計塔の頂',
    subtitle: '秒針が3本同時に逆走する塔',
    recommendedPower: 19500,
    waves: [
      [
        mkEnemy('e_10_1', 'クロノ・ナイト', 'none', ['human', 'machine'], 'tank', 6100, 412, 260, 132),
        mkEnemy('e_10_2', '秒針スナイパー', 'wind', ['machine'], 'dealer', 5200, 458, 195, 152)
      ],
      [
        mkEnemy('e_10_3', '大時計番人クロノス', 'none', ['human', 'machine'], 'supporter', 15600, 488, 240, 148, true),
        mkEnemy('e_10_4', '時空妖精ティック', 'light', ['fairy'], 'supporter', 5400, 402, 198, 154),
        mkEnemy('e_10_5', '時空妖精タック', 'dark', ['fairy'], 'dealer', 5400, 468, 192, 154)
      ]
    ],
    rewards: {
      gold: 4200,
      exp: 2450,
      shard: 26,
      powder: 160,
      sigCoreChance: 0.52,
      equipDropCount: 4,
      rarityWeights: { N: 0, R: 14, SR: 40, SSR: 32, CHAOS: 14 }
    },
    firstClearUnitId: 'u_none_tank',
    firstClearShard: 30
  },
  {
    id: 'st_11',
    category: 'story',
    name: '3-3 六属性ごちゃまぜ渦',
    subtitle: '全ての元素が激突する大渦潮',
    recommendedPower: 24000,
    waves: [
      [
        mkEnemy('e_11_1', '炎水キメラ', 'fire', ['dragon', 'monster'], 'dealer', 6800, 515, 232, 142),
        mkEnemy('e_11_2', '風光キメラ', 'wind', ['fairy', 'machine'], 'supporter', 6600, 488, 238, 152),
        mkEnemy('e_11_3', '闇無キメラ', 'dark', ['monster', 'machine'], 'tank', 7600, 472, 280, 130)
      ],
      [
        mkEnemy('e_11_4', '六元融合エレメンタ', 'none', ['dragon', 'fairy'], 'dealer', 19800, 565, 265, 146, true),
        mkEnemy('e_11_5', '混沌の癒し手', 'water', ['fairy'], 'healer', 6800, 462, 235, 146)
      ]
    ],
    rewards: {
      gold: 5200,
      exp: 3100,
      shard: 30,
      powder: 210,
      sigCoreChance: 0.62,
      equipDropCount: 4,
      rarityWeights: { N: 0, R: 8, SR: 36, SSR: 38, CHAOS: 18 }
    },
    firstClearShard: 35
  },
  {
    id: 'st_12',
    category: 'story',
    name: '3-4 はちゃめちゃ玉座',
    subtitle: '混沌世界の中心で暴れる特異点',
    recommendedPower: 30000,
    waves: [
      [
        mkEnemy('e_12_1', '親衛機竜Ω', 'light', ['dragon', 'machine'], 'tank', 8600, 560, 310, 140),
        mkEnemy('e_12_2', '深淵の道化王', 'dark', ['human', 'monster'], 'supporter', 7800, 590, 252, 156)
      ],
      [
        mkEnemy('e_12_3', '混沌竜帝アポカリプス', 'none', ['dragon', 'monster'], 'dealer', 26500, 660, 295, 152, true),
        mkEnemy('e_12_4', '秩序の残滓', 'light', ['fairy', 'machine'], 'healer', 8400, 540, 268, 148),
        mkEnemy('e_12_5', '狂騒の残滓', 'fire', ['dragon', 'fairy'], 'dealer', 8400, 620, 255, 154)
      ]
    ],
    rewards: {
      gold: 6800,
      exp: 4200,
      shard: 38,
      powder: 280,
      sigCoreChance: 0.78,
      equipDropCount: 5,
      rarityWeights: { N: 0, R: 0, SR: 30, SSR: 44, CHAOS: 26 }
    },
    firstClearUnitId: 'u_none_dealer',
    firstClearShard: 50
  },

  // ==================== 異界ボス討伐 (専用武器コア＆高レア装備) ====================
  {
    id: 'boss_fire',
    category: 'boss',
    name: '業火巨神イフリート改',
    subtitle: '炎の専用武器コア＆超高火力装備',
    recommendedPower: 7500,
    waves: [
      [
        mkEnemy('b_fire_1', '業火巨神イフリート改', 'fire', ['dragon', 'machine'], 'dealer', 8600, 290, 152, 126, true),
        mkEnemy('b_fire_2', 'マグマコア', 'fire', ['monster'], 'supporter', 3200, 215, 118, 132)
      ]
    ],
    rewards: {
      gold: 2600,
      exp: 1100,
      shard: 18,
      powder: 90,
      sigCoreChance: 0.85,
      equipDropCount: 4,
      rarityWeights: { N: 0, R: 18, SR: 42, SSR: 30, CHAOS: 10 }
    }
  },
  {
    id: 'boss_water',
    category: 'boss',
    name: '極寒海帝クラーケンΩ',
    subtitle: '水の専用武器コア＆堅牢防具狙い',
    recommendedPower: 11500,
    waves: [
      [
        mkEnemy('b_water_1', '極寒海帝クラーケンΩ', 'water', ['monster', 'machine'], 'tank', 13800, 345, 210, 124, true),
        mkEnemy('b_water_2', '冷凍触手', 'water', ['monster'], 'dealer', 4400, 300, 140, 134),
        mkEnemy('b_water_3', '回復触手', 'water', ['fairy'], 'healer', 4200, 265, 148, 130)
      ]
    ],
    rewards: {
      gold: 3800,
      exp: 1600,
      shard: 24,
      powder: 135,
      sigCoreChance: 0.92,
      equipDropCount: 4,
      rarityWeights: { N: 0, R: 8, SR: 38, SSR: 38, CHAOS: 16 }
    }
  },
  {
    id: 'boss_twins',
    category: 'boss',
    name: '光闇双神エクリプス',
    subtitle: '光闇同時襲来・CHAOS装備高確率',
    recommendedPower: 22000,
    waves: [
      [
        mkEnemy('b_tw_1', '白陽神ソレイユ', 'light', ['dragon', 'fairy'], 'dealer', 17500, 520, 240, 144, true),
        mkEnemy('b_tw_2', '黒月神ルナリス', 'dark', ['monster', 'fairy'], 'supporter', 16500, 505, 232, 150, true)
      ]
    ],
    rewards: {
      gold: 6400,
      exp: 2900,
      shard: 36,
      powder: 240,
      sigCoreChance: 1.0,
      equipDropCount: 5,
      rarityWeights: { N: 0, R: 0, SR: 22, SSR: 46, CHAOS: 32 }
    }
  },
  {
    id: 'boss_chaos',
    category: 'boss',
    name: '超絶はちゃめちゃ大魔王',
    subtitle: '究極ハクスラ・CHAOS厳選の聖地',
    recommendedPower: 38000,
    waves: [
      [
        mkEnemy('b_ch_1', '超絶はちゃめちゃ大魔王', 'none', ['dragon', 'monster'], 'dealer', 38000, 760, 340, 158, true),
        mkEnemy('b_ch_2', '暴走の右腕', 'fire', ['machine'], 'dealer', 13500, 680, 280, 154),
        mkEnemy('b_ch_3', '混沌の左腕', 'dark', ['fairy'], 'healer', 13500, 620, 285, 150)
      ]
    ],
    rewards: {
      gold: 11000,
      exp: 5600,
      shard: 55,
      powder: 420,
      sigCoreChance: 1.0,
      equipDropCount: 6,
      rarityWeights: { N: 0, R: 0, SR: 10, SSR: 42, CHAOS: 48 }
    }
  },

  // ==================== 素材特化周回 (常時開放) ====================
  {
    id: 'farm_gold',
    category: 'farm',
    name: '黄金ゴブリン大行進',
    subtitle: '大量ゴールド＆強化粉を爆速周回',
    recommendedPower: 2500,
    waves: [
      [
        mkEnemy('f_g_1', '金貨ゴブリン', 'light', ['monster'], 'supporter', 1100, 105, 65, 110),
        mkEnemy('f_g_2', '宝箱ミミック', 'none', ['monster', 'machine'], 'tank', 1450, 118, 82, 98),
        mkEnemy('f_g_3', '成金キングスライム', 'light', ['monster'], 'dealer', 1800, 130, 72, 106, true)
      ]
    ],
    rewards: {
      gold: 2600,
      exp: 420,
      shard: 8,
      powder: 65,
      sigCoreChance: 0.15,
      equipDropCount: 3,
      rarityWeights: { N: 35, R: 40, SR: 20, SSR: 5, CHAOS: 0 }
    }
  },
  {
    id: 'farm_exp',
    category: 'farm',
    name: '爆速レベリング道場',
    subtitle: '経験値特化・新キャラ育成に最適',
    recommendedPower: 4200,
    waves: [
      [
        mkEnemy('f_e_1', '経験値メタル機', 'none', ['machine'], 'tank', 1750, 145, 135, 126),
        mkEnemy('f_e_2', '師範代パンダ竜', 'wind', ['dragon'], 'dealer', 2400, 175, 110, 122, true),
        mkEnemy('f_e_3', '修練ウィスプ', 'water', ['fairy'], 'healer', 1650, 138, 95, 120)
      ]
    ],
    rewards: {
      gold: 1100,
      exp: 2400,
      shard: 10,
      powder: 45,
      sigCoreChance: 0.18,
      equipDropCount: 2,
      rarityWeights: { N: 25, R: 45, SR: 22, SSR: 7, CHAOS: 1 }
    }
  },
  {
    id: 'farm_shard',
    category: 'farm',
    name: 'カオス結晶鉱脈',
    subtitle: '仲間解放＆専用武器の結晶を掘る',
    recommendedPower: 9000,
    waves: [
      [
        mkEnemy('f_s_1', '結晶ゴーレム', 'dark', ['monster', 'machine'], 'tank', 3800, 245, 180, 114),
        mkEnemy('f_s_2', 'プリズム結晶竜', 'light', ['dragon'], 'dealer', 5400, 295, 165, 130, true),
        mkEnemy('f_s_3', '鉱脈の精霊', 'none', ['fairy'], 'supporter', 3200, 235, 145, 136)
      ]
    ],
    rewards: {
      gold: 2200,
      exp: 1350,
      shard: 32,
      powder: 110,
      sigCoreChance: 0.55,
      equipDropCount: 3,
      rarityWeights: { N: 5, R: 25, SR: 40, SSR: 24, CHAOS: 6 }
    }
  }
];

export const STAGE_MAP: Record<string, StageDef> = Object.fromEntries(STAGE_DEFS.map((s) => [s.id, s]));

const TOWER_ELEMENTS: ElementType[] = ['fire', 'water', 'wind', 'light', 'dark', 'none'];
const TOWER_RACES: ([RaceType] | [RaceType, RaceType])[] = [
  ['human'],
  ['human', 'dragon'],
  ['dragon', 'monster'],
  ['monster', 'fairy'],
  ['fairy', 'machine'],
  ['dragon', 'machine']
];

export function generateTowerStage(floor: number): StageDef {
  const isBossFloor = floor % 5 === 0;
  const scale = Math.pow(1.135, floor - 1);
  const elA = TOWER_ELEMENTS[(floor - 1) % TOWER_ELEMENTS.length];
  const elB = TOWER_ELEMENTS[(floor + 2) % TOWER_ELEMENTS.length];
  const raceA = TOWER_RACES[(floor - 1) % TOWER_RACES.length];
  const raceB = TOWER_RACES[(floor + 1) % TOWER_RACES.length];

  const baseHp = Math.round(980 * scale);
  const baseAtk = Math.round(115 * Math.pow(1.11, floor - 1));
  const baseDef = Math.round(62 * Math.pow(1.1, floor - 1));
  const baseSpd = Math.min(185, Math.round(100 + floor * 1.8));

  const wave: EnemyTemplate[] = isBossFloor
    ? [
        mkEnemy(`tw_${floor}_b`, `無限塔${floor}F守護神`, elA, raceA, 'dealer', Math.round(baseHp * 2.5), Math.round(baseAtk * 1.25), Math.round(baseDef * 1.2), baseSpd + 8, true),
        mkEnemy(`tw_${floor}_s1`, `塔衛兵α`, elB, raceB, 'tank', Math.round(baseHp * 1.15), Math.round(baseAtk * 0.95), Math.round(baseDef * 1.15), baseSpd),
        mkEnemy(`tw_${floor}_s2`, `塔術師β`, elA, ['fairy'], 'healer', Math.round(baseHp * 0.95), Math.round(baseAtk * 0.9), baseDef, baseSpd + 4)
      ]
    : [
        mkEnemy(`tw_${floor}_1`, `塔の番獣${floor}型`, elA, raceA, 'dealer', Math.round(baseHp * 1.15), baseAtk, baseDef, baseSpd + 4),
        mkEnemy(`tw_${floor}_2`, `塔の装甲機`, elB, raceB, 'tank', Math.round(baseHp * 1.3), Math.round(baseAtk * 0.92), Math.round(baseDef * 1.15), baseSpd - 4),
        mkEnemy(`tw_${floor}_3`, `塔の妖精`, elA, ['fairy'], 'supporter', Math.round(baseHp * 0.9), Math.round(baseAtk * 0.95), baseDef, baseSpd + 8)
      ];

  const chaosW = Math.min(45, Math.max(0, Math.floor((floor - 3) * 2.2)));
  const ssrW = Math.min(45, Math.max(4, Math.floor(4 + floor * 2.1)));
  const srW = Math.max(15, 45 - Math.floor(floor * 0.6));
  const rW = Math.max(0, 35 - floor * 2);
  const nW = Math.max(0, 20 - floor * 3);

  return {
    id: `tower_${floor}`,
    category: 'tower',
    name: `無限塔 ${floor}F`,
    subtitle: isBossFloor ? '階層ボス戦・豪華報酬！' : '果てなき混沌の試練',
    recommendedPower: Math.round(2200 * Math.pow(1.13, floor - 1)),
    waves: [wave],
    rewards: {
      gold: Math.round(650 * Math.pow(1.11, floor - 1) * (isBossFloor ? 1.8 : 1)),
      exp: Math.round(320 * Math.pow(1.11, floor - 1) * (isBossFloor ? 1.6 : 1)),
      shard: Math.round((8 + floor * 1.8) * (isBossFloor ? 2 : 1)),
      powder: Math.round((25 + floor * 6) * (isBossFloor ? 1.8 : 1)),
      sigCoreChance: isBossFloor ? 1.0 : Math.min(0.85, 0.15 + floor * 0.03),
      equipDropCount: isBossFloor ? 4 : 2,
      rarityWeights: { N: nW, R: rW, SR: srW, SSR: ssrW, CHAOS: chaosW }
    }
  };
}
