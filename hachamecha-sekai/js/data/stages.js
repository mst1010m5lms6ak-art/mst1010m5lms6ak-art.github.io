(function () {
  'use strict';

  const Hacha = window.Hacha;

  /*
   * 全5種PvEコンテンツ定義
   * 1. メイン：はちゃめちゃ大陸（5エリア × 各10ステージ ＝ 50ステージ、各5WAVE、乱入あり）
   * 2. 混沌の無限塔（エンドレス階層、階層ごとに世界法則が変化）
   * 3. 異界大ボス討伐（5種の単体高難度レイドボス）
   * 4. 界域の試練（属性・種族縛りの編成パズル試練6種）
   * 5. 乱入カオス襲来（乱入敵ばかりが出現するレア周回4種）
   */

  const MAIN_AREAS = [
    {
      id: 'area1', index: 1, name: '蒸気忍者の里', icon: '♨️',
      theme: '和風 × スチームパンク',
      ruleId: 'steam_overheat',
      normalPool: ['e_a1_1', 'e_a1_2', 'e_a1_3', 'e_a1_4'],
      bossId: 'e_a1_boss',
      intruderPool: ['e_int_1', 'e_int_2'],
      dropPool: ['eq_w_01', 'eq_w_02', 'eq_w_03', 'eq_a_01', 'eq_a_02', 'eq_a_03', 'eq_c_01', 'eq_c_02', 'eq_c_03'],
      baseScale: 0.82, stepScale: 0.055, baseCoins: 110
    },
    {
      id: 'area2', index: 2, name: '魔法電子水族館', icon: '🌊',
      theme: '深海ファンタジー × サイバー',
      ruleId: 'aqua_resonance',
      normalPool: ['e_a2_1', 'e_a2_2', 'e_a2_3', 'e_a2_4'],
      bossId: 'e_a2_boss',
      intruderPool: ['e_int_2', 'e_int_3'],
      dropPool: ['eq_w_04', 'eq_w_05', 'eq_a_04', 'eq_a_05', 'eq_c_04', 'eq_c_05'],
      baseScale: 1.00, stepScale: 0.06, baseCoins: 190
    },
    {
      id: 'area3', index: 3, name: '妖精の大鉄工所', icon: '⚙️',
      theme: 'メルヘン童話 × 重工業',
      ruleId: 'fairy_carnival',
      normalPool: ['e_a3_1', 'e_a3_2', 'e_a3_3', 'e_a3_4'],
      bossId: 'e_a3_boss',
      intruderPool: ['e_int_3', 'e_int_4'],
      dropPool: ['eq_w_06', 'eq_w_07', 'eq_a_06', 'eq_a_07', 'eq_c_06', 'eq_c_07'],
      baseScale: 1.04, stepScale: 0.065, baseCoins: 290
    },
    {
      id: 'area4', index: 4, name: '竜神の大給食室', icon: '🍲',
      theme: '神話 × 学園グルメ',
      ruleId: 'dragon_cafeteria',
      normalPool: ['e_a4_1', 'e_a4_2', 'e_a4_3', 'e_a4_4'],
      bossId: 'e_a4_boss',
      intruderPool: ['e_int_4', 'e_int_5'],
      dropPool: ['eq_w_08', 'eq_w_09', 'eq_a_08', 'eq_a_09', 'eq_c_08', 'eq_c_09'],
      baseScale: 1.08, stepScale: 0.07, baseCoins: 420
    },
    {
      id: 'area5', index: 5, name: '霓虹の混沌終着駅', icon: '🚉',
      theme: '全ジャンル大混線',
      ruleId: 'sacred_neon',
      normalPool: ['e_a5_1', 'e_a5_2', 'e_a5_3', 'e_a5_4'],
      bossId: 'e_a5_boss',
      intruderPool: ['e_int_5', 'e_int_6'],
      dropPool: ['eq_w_10', 'eq_w_11', 'eq_a_10', 'eq_a_11', 'eq_c_10', 'eq_c_11'],
      baseScale: 1.12, stepScale: 0.075, baseCoins: 590
    }
  ];

  /* 1エリア10ステージ生成 */
  const MAIN_STAGES = [];
  const STAGE_MAP = {};

  MAIN_AREAS.forEach((area) => {
    for (let s = 1; s <= 10; s++) {
      const id = `${area.id}_s${s}`;
      const isAreaBossStage = s === 10;
      const stage = {
        id,
        mode: 'main',
        areaId: area.id,
        areaIndex: area.index,
        stageNum: s,
        name: `${area.index}-${s} ${area.name}`,
        shortName: `STAGE ${area.index}-${s}`,
        waves: 5,
        ruleId: area.ruleId,
        normalPool: area.normalPool,
        bossId: isAreaBossStage ? area.bossId : area.normalPool[(s - 1) % area.normalPool.length],
        bossIsElite: !isAreaBossStage,
        intruderPool: area.intruderPool,
        intruderChance: 0.24 + (s * 0.015),
        scale: +(area.baseScale + (s - 1) * area.stepScale).toFixed(3),
        coins: Math.round(area.baseCoins * (1 + (s - 1) * 0.14)),
        crystals: Math.max(1, Math.round(area.index + s * 0.25)),
        scrolls: s >= 5 ? Math.max(1, Math.floor((area.index + 1) / 2)) : 0,
        fragments: isAreaBossStage ? area.index : 0,
        dropPool: area.dropPool,
        dropChance: 0.62 + (isAreaBossStage ? 0.35 : 0),
        minQuality: Math.min(70, (area.index - 1) * 10 + s * 2)
      };
      MAIN_STAGES.push(stage);
      STAGE_MAP[id] = stage;
    }
  });

  /* 異界大ボス討伐（5種） */
  const RAID_BOSSES = [
    {
      id: 'raid_1', mode: 'raid', name: '灼熱機関竜イフリート', shortName: '大ボス I',
      waves: 1, ruleId: 'steam_overheat', bossId: 'e_rb_1', normalPool: ['e_a1_1', 'e_a1_2'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 550, crystals: 6, scrolls: 3, fragments: 3,
      dropPool: ['eq_w_03', 'eq_w_08', 'eq_a_03', 'eq_a_08', 'eq_c_02', 'eq_c_08'],
      dropChance: 1.0, minQuality: 74, recHint: '水属性・火傷解除が有効'
    },
    {
      id: 'raid_2', mode: 'raid', name: '深淵水帝クラーケン', shortName: '大ボス II',
      waves: 1, ruleId: 'aqua_resonance', bossId: 'e_rb_2', normalPool: ['e_a2_1', 'e_a2_2'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 720, crystals: 8, scrolls: 4, fragments: 4,
      dropPool: ['eq_w_05', 'eq_a_13', 'eq_a_05', 'eq_c_05', 'eq_c_13'],
      dropChance: 1.0, minQuality: 78, recHint: '風属性・凍結対策が有効'
    },
    {
      id: 'raid_3', mode: 'raid', name: '蒼穹要塞シルフィード', shortName: '大ボス III',
      waves: 1, ruleId: 'fairy_carnival', bossId: 'e_rb_3', normalPool: ['e_a3_1', 'e_a3_4'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 920, crystals: 10, scrolls: 5, fragments: 5,
      dropPool: ['eq_w_07', 'eq_a_07', 'eq_c_07', 'eq_c_13'],
      dropChance: 1.0, minQuality: 80, recHint: '炎属性・速度強化が有効'
    },
    {
      id: 'raid_4', mode: 'raid', name: '星界審判官メタトロン', shortName: '大ボス IV',
      waves: 1, ruleId: 'sacred_neon', bossId: 'e_rb_4', normalPool: ['e_a4_1', 'e_a4_2'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 1180, crystals: 12, scrolls: 6, fragments: 6,
      dropPool: ['eq_w_13', 'eq_a_09', 'eq_c_09', 'eq_c_11'],
      dropChance: 1.0, minQuality: 83, recHint: '闇属性・障壁維持が有効'
    },
    {
      id: 'raid_5', mode: 'raid', name: '万界混線王カオス', shortName: '大ボス V',
      waves: 1, ruleId: 'chaos_vortex', bossId: 'e_rb_5', normalPool: ['e_a5_2', 'e_a5_3'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 1550, crystals: 16, scrolls: 8, fragments: 8,
      dropPool: ['eq_w_14', 'eq_a_14', 'eq_c_14', 'eq_w_13', 'eq_a_13'],
      dropChance: 1.0, minQuality: 86, recHint: '複数共鳴チェイン連発が有効'
    }
  ];

  /* 界域の試練（属性・種族縛りコンテンツ：控えキャラ育成が活きる） */
  const TRIAL_STAGES = [
    {
      id: 'trial_fire_water', mode: 'trial', name: '炎水の試練', shortName: '試練 I',
      ruleId: 'steam_overheat', waves: 5, scale: 1.05,
      normalPool: ['e_a1_1', 'e_a2_2', 'e_a1_2', 'e_a2_1'], bossId: 'e_a1_boss',
      intruderPool: ['e_int_1', 'e_int_3'], intruderChance: 0.28,
      restriction: { type: 'elements', allowed: ['fire', 'water'], label: '出撃条件：炎・水属性のみ' },
      coins: 640, crystals: 10, scrolls: 4, fragments: 3,
      dropPool: ['eq_w_04', 'eq_a_04', 'eq_c_04', 'eq_w_03'], dropChance: 0.9, minQuality: 74
    },
    {
      id: 'trial_wind_light', mode: 'trial', name: '風光の試練', shortName: '試練 II',
      ruleId: 'fairy_carnival', waves: 5, scale: 1.12,
      normalPool: ['e_a3_1', 'e_a3_4', 'e_a4_1', 'e_a4_2'], bossId: 'e_a3_boss',
      intruderPool: ['e_int_2', 'e_int_4'], intruderChance: 0.28,
      restriction: { type: 'elements', allowed: ['wind', 'light'], label: '出撃条件：風・光属性のみ' },
      coins: 780, crystals: 12, scrolls: 5, fragments: 4,
      dropPool: ['eq_w_07', 'eq_a_07', 'eq_c_07', 'eq_w_09'], dropChance: 0.92, minQuality: 78
    },
    {
      id: 'trial_dark_none', mode: 'trial', name: '闇無の試練', shortName: '試練 III',
      ruleId: 'midnight_feast', waves: 5, scale: 1.18,
      normalPool: ['e_a4_4', 'e_a5_1', 'e_a5_3', 'e_a5_4'], bossId: 'e_a5_boss',
      intruderPool: ['e_int_5', 'e_int_6'], intruderChance: 0.30,
      restriction: { type: 'elements', allowed: ['dark', 'none'], label: '出撃条件：闇・無属性のみ' },
      coins: 960, crystals: 14, scrolls: 6, fragments: 5,
      dropPool: ['eq_w_11', 'eq_a_11', 'eq_c_11', 'eq_w_10'], dropChance: 0.95, minQuality: 82
    },
    {
      id: 'trial_human_machine', mode: 'trial', name: '人機の試練', shortName: '試練 IV',
      ruleId: 'iron_bastion', waves: 5, scale: 1.08,
      normalPool: ['e_a1_1', 'e_a2_3', 'e_a3_2', 'e_a5_1'], bossId: 'e_a2_boss',
      intruderPool: ['e_int_1', 'e_int_4'], intruderChance: 0.28,
      restriction: { type: 'races', allowed: ['human', 'machine'], label: '出撃条件：人間または機械種族' },
      coins: 740, crystals: 11, scrolls: 5, fragments: 4,
      dropPool: ['eq_w_06', 'eq_a_06', 'eq_c_06', 'eq_a_10'], dropChance: 0.92, minQuality: 78
    },
    {
      id: 'trial_dragon_god', mode: 'trial', name: '竜神の試練', shortName: '試練 V',
      ruleId: 'divine_tempo', waves: 5, scale: 1.16,
      normalPool: ['e_a4_1', 'e_a4_2', 'e_a5_2', 'e_a5_3'], bossId: 'e_a4_boss',
      intruderPool: ['e_int_3', 'e_int_6'], intruderChance: 0.30,
      restriction: { type: 'races', allowed: ['dragon', 'god'], label: '出撃条件：竜または神種族' },
      coins: 940, crystals: 14, scrolls: 6, fragments: 5,
      dropPool: ['eq_w_08', 'eq_a_08', 'eq_c_08', 'eq_w_13'], dropChance: 0.95, minQuality: 82
    },
    {
      id: 'trial_monster_fairy_beast', mode: 'trial', name: '魔妖獣の試練', shortName: '試練 VI',
      ruleId: 'chaos_vortex', waves: 5, scale: 1.14,
      normalPool: ['e_a1_3', 'e_a2_2', 'e_a3_1', 'e_a4_3'], bossId: 'e_a3_boss',
      intruderPool: ['e_int_2', 'e_int_5'], intruderChance: 0.32,
      restriction: { type: 'races', allowed: ['monster', 'fairy', 'beast'], label: '出撃条件：魔物・妖精・獣種族' },
      coins: 880, crystals: 13, scrolls: 6, fragments: 5,
      dropPool: ['eq_w_12', 'eq_a_12', 'eq_c_12', 'eq_c_13'], dropChance: 0.95, minQuality: 80
    }
  ];

  /* 乱入カオス襲来（乱入敵連続出現の稀少掘りコンテンツ） */
  const CHAOS_RUSH_STAGES = [
    {
      id: 'chaos_1', mode: 'chaos', name: '深夜の屋台乱入祭', shortName: '襲来 I',
      ruleId: 'steam_overheat', waves: 5, scale: 0.96,
      normalPool: ['e_int_1', 'e_int_2', 'e_a1_1'], bossId: 'e_int_1',
      intruderPool: ['e_int_1', 'e_int_2'], intruderChance: 0.65,
      coins: 580, crystals: 7, scrolls: 3, fragments: 3,
      dropPool: ['eq_w_12', 'eq_c_12', 'eq_w_03', 'eq_a_03', 'eq_c_03'], dropChance: 1.0, minQuality: 76
    },
    {
      id: 'chaos_2', mode: 'chaos', name: '迷子星海の乱入渦', shortName: '襲来 II',
      ruleId: 'cyber_gravity', waves: 5, scale: 1.15,
      normalPool: ['e_int_2', 'e_int_3', 'e_int_4'], bossId: 'e_int_3',
      intruderPool: ['e_int_3', 'e_int_4'], intruderChance: 0.72,
      coins: 780, crystals: 9, scrolls: 4, fragments: 4,
      dropPool: ['eq_a_12', 'eq_c_12', 'eq_w_06', 'eq_a_06', 'eq_c_06'], dropChance: 1.0, minQuality: 80
    },
    {
      id: 'chaos_3', mode: 'chaos', name: '道化と清掃神の乱戦', shortName: '襲来 III',
      ruleId: 'midnight_feast', waves: 5, scale: 1.32,
      normalPool: ['e_int_4', 'e_int_5', 'e_int_6'], bossId: 'e_int_5',
      intruderPool: ['e_int_4', 'e_int_5', 'e_int_6'], intruderChance: 0.78,
      coins: 1020, crystals: 12, scrolls: 6, fragments: 6,
      dropPool: ['eq_w_12', 'eq_a_12', 'eq_c_12', 'eq_w_11', 'eq_c_11'], dropChance: 1.0, minQuality: 84
    },
    {
      id: 'chaos_4', mode: 'chaos', name: '次元配達の大混線', shortName: '襲来 IV',
      ruleId: 'chaos_vortex', waves: 5, scale: 1.50,
      normalPool: ['e_int_1', 'e_int_3', 'e_int_5', 'e_int_6'], bossId: 'e_int_6',
      intruderPool: ['e_int_2', 'e_int_4', 'e_int_6'], intruderChance: 0.85,
      coins: 1380, crystals: 15, scrolls: 8, fragments: 8,
      dropPool: ['eq_w_14', 'eq_a_14', 'eq_c_14', 'eq_w_12', 'eq_a_12', 'eq_c_12'], dropChance: 1.0, minQuality: 87
    }
  ];

  /* 混沌の無限塔：階層に応じたステージを動的生成 */
  const TOWER_RULE_CYCLE = Object.keys(Hacha.data.WORLD_RULES);
  const TOWER_BOSS_CYCLE = ['e_a1_boss', 'e_a2_boss', 'e_a3_boss', 'e_a4_boss', 'e_a5_boss', 'e_rb_1', 'e_rb_2', 'e_rb_3', 'e_rb_4', 'e_rb_5'];
  const ALL_NORMAL_ENEMIES = [
    'e_a1_1', 'e_a1_2', 'e_a1_3', 'e_a1_4',
    'e_a2_1', 'e_a2_2', 'e_a2_3', 'e_a2_4',
    'e_a3_1', 'e_a3_2', 'e_a3_3', 'e_a3_4',
    'e_a4_1', 'e_a4_2', 'e_a4_3', 'e_a4_4',
    'e_a5_1', 'e_a5_2', 'e_a5_3', 'e_a5_4'
  ];

  function buildTowerStage(floor) {
    const f = Math.max(1, Math.floor(floor || 1));
    const ruleId = TOWER_RULE_CYCLE[(f - 1) % TOWER_RULE_CYCLE.length];
    const isMilestone = f % 5 === 0;
    const band = Math.min(4, Math.floor((f - 1) / 4));
    const poolStart = band * 4;
    const normalPool = ALL_NORMAL_ENEMIES.slice(poolStart, poolStart + 4);
    const bossId = isMilestone
      ? TOWER_BOSS_CYCLE[Math.min(TOWER_BOSS_CYCLE.length - 1, Math.floor(f / 5) - 1)]
      : normalPool[f % normalPool.length];
    const allEqIds = Hacha.data.EQUIPMENT.filter((e) => e.tier <= Math.min(5, band + 2)).map((e) => e.id);

    return {
      id: `tower_f${f}`,
      mode: 'tower',
      floor: f,
      name: `混沌の無限塔 ${f}階`,
      shortName: `無限塔 ${f}F`,
      waves: 5,
      ruleId,
      normalPool,
      bossId,
      bossIsElite: !isMilestone,
      intruderPool: ['e_int_1', 'e_int_2', 'e_int_3', 'e_int_4', 'e_int_5', 'e_int_6'],
      intruderChance: 0.30,
      scale: +(0.90 + (f - 1) * 0.085).toFixed(3),
      coins: 220 + f * 65,
      crystals: 3 + Math.floor(f * 0.6),
      scrolls: 1 + Math.floor(f / 3),
      fragments: isMilestone ? 2 + Math.floor(f / 5) : (f >= 4 ? 1 : 0),
      dropPool: allEqIds,
      dropChance: isMilestone ? 1.0 : 0.80,
      minQuality: Math.min(90, 56 + f * 2)
    };
  }

  RAID_BOSSES.forEach((s) => { STAGE_MAP[s.id] = s; });
  TRIAL_STAGES.forEach((s) => { STAGE_MAP[s.id] = s; });
  CHAOS_RUSH_STAGES.forEach((s) => { STAGE_MAP[s.id] = s; });

  Hacha.data.MAIN_AREAS = MAIN_AREAS;
  Hacha.data.MAIN_STAGES = MAIN_STAGES;
  Hacha.data.RAID_BOSSES = RAID_BOSSES;
  Hacha.data.TRIAL_STAGES = TRIAL_STAGES;
  Hacha.data.CHAOS_RUSH_STAGES = CHAOS_RUSH_STAGES;
  Hacha.data.STAGE_MAP = STAGE_MAP;
  Hacha.data.buildTowerStage = buildTowerStage;
})();
