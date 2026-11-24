(function () {
  'use strict';

  const Hacha = window.Hacha;

  /*
   * 全5種PvEコンテンツ定義
   * 1. メイン：はちゃめちゃ大陸（5エリア × 各10ステージ ＝ 50ステージ、各5WAVE、通常WAVE 0.3%乱入あり）
   * 2. 混沌の異界塔（エンドレス階層、階層ごとに世界法則が変化、乱入なし）
   * 3. 異界レイド討伐（5種の単体高難度レイドボス、乱入なし）
   * 4. 界域の試練（属性・種族縛りの編成パズル試練6種、乱入なし）
   * 5. 異界闘技場（階級別6段階の4vs4 NPC模擬戦トーナメント、完全ソロPvE・自動周回可、乱入なし）
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

  /* 1エリア10ステージ生成（乱入は大陸の通常WAVEのみ・厳密0.3%） */
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
        intruderChance: 0.003,
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

  /* 異界レイド討伐（5種・乱入なし） */
  const RAID_BOSSES = [
    {
      id: 'raid_1', mode: 'raid', name: '灼熱機関竜イフリート', shortName: 'レイド I',
      waves: 1, ruleId: 'steam_overheat', bossId: 'e_rb_1', normalPool: ['e_a1_1', 'e_a1_2'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 550, crystals: 6, scrolls: 3, fragments: 3,
      dropPool: ['eq_w_03', 'eq_w_08', 'eq_a_03', 'eq_a_08', 'eq_c_02', 'eq_c_08'],
      dropChance: 1.0, minQuality: 74, recHint: '水属性・火傷解除が有効'
    },
    {
      id: 'raid_2', mode: 'raid', name: '深淵水帝クラーケン', shortName: 'レイド II',
      waves: 1, ruleId: 'aqua_resonance', bossId: 'e_rb_2', normalPool: ['e_a2_1', 'e_a2_2'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 720, crystals: 8, scrolls: 4, fragments: 4,
      dropPool: ['eq_w_05', 'eq_a_13', 'eq_a_05', 'eq_c_05', 'eq_c_13'],
      dropChance: 1.0, minQuality: 78, recHint: '風属性・凍結対策が有効'
    },
    {
      id: 'raid_3', mode: 'raid', name: '蒼穹要塞シルフィード', shortName: 'レイド III',
      waves: 1, ruleId: 'fairy_carnival', bossId: 'e_rb_3', normalPool: ['e_a3_1', 'e_a3_4'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 920, crystals: 10, scrolls: 5, fragments: 5,
      dropPool: ['eq_w_07', 'eq_a_07', 'eq_c_07', 'eq_c_13'],
      dropChance: 1.0, minQuality: 80, recHint: '炎属性・速度強化が有効'
    },
    {
      id: 'raid_4', mode: 'raid', name: '星界審判官メタトロン', shortName: 'レイド IV',
      waves: 1, ruleId: 'sacred_neon', bossId: 'e_rb_4', normalPool: ['e_a4_1', 'e_a4_2'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 1180, crystals: 12, scrolls: 6, fragments: 6,
      dropPool: ['eq_w_13', 'eq_a_09', 'eq_c_09', 'eq_c_11'],
      dropChance: 1.0, minQuality: 83, recHint: '闇属性・障壁維持が有効'
    },
    {
      id: 'raid_5', mode: 'raid', name: '万界混線王カオス', shortName: 'レイド V',
      waves: 1, ruleId: 'chaos_vortex', bossId: 'e_rb_5', normalPool: ['e_a5_2', 'e_a5_3'],
      intruderPool: [], intruderChance: 0, scale: 1.0,
      coins: 1550, crystals: 16, scrolls: 8, fragments: 8,
      dropPool: ['eq_w_14', 'eq_a_14', 'eq_c_14', 'eq_w_13', 'eq_a_13'],
      dropChance: 1.0, minQuality: 86, recHint: '複数共鳴チェイン連発が有効'
    }
  ];

  /* 界域の試練（属性・種族縛りコンテンツ：乱入なし） */
  const TRIAL_STAGES = [
    {
      id: 'trial_fire_water', mode: 'trial', name: '炎水の試練', shortName: '試練 I',
      ruleId: 'steam_overheat', waves: 5, scale: 1.05,
      normalPool: ['e_a1_1', 'e_a2_2', 'e_a1_2', 'e_a2_1'], bossId: 'e_a1_boss',
      intruderPool: [], intruderChance: 0,
      restriction: { type: 'elements', allowed: ['fire', 'water'], label: '出撃条件：炎・水属性のみ' },
      coins: 640, crystals: 10, scrolls: 4, fragments: 3,
      dropPool: ['eq_w_04', 'eq_a_04', 'eq_c_04', 'eq_w_03'], dropChance: 0.9, minQuality: 74
    },
    {
      id: 'trial_wind_light', mode: 'trial', name: '風光の試練', shortName: '試練 II',
      ruleId: 'fairy_carnival', waves: 5, scale: 1.12,
      normalPool: ['e_a3_1', 'e_a3_4', 'e_a4_1', 'e_a4_2'], bossId: 'e_a3_boss',
      intruderPool: [], intruderChance: 0,
      restriction: { type: 'elements', allowed: ['wind', 'light'], label: '出撃条件：風・光属性のみ' },
      coins: 780, crystals: 12, scrolls: 5, fragments: 4,
      dropPool: ['eq_w_07', 'eq_a_07', 'eq_c_07', 'eq_w_09'], dropChance: 0.92, minQuality: 78
    },
    {
      id: 'trial_dark_none', mode: 'trial', name: '闇無の試練', shortName: '試練 III',
      ruleId: 'midnight_feast', waves: 5, scale: 1.18,
      normalPool: ['e_a4_4', 'e_a5_1', 'e_a5_3', 'e_a5_4'], bossId: 'e_a5_boss',
      intruderPool: [], intruderChance: 0,
      restriction: { type: 'elements', allowed: ['dark', 'none'], label: '出撃条件：闇・無属性のみ' },
      coins: 960, crystals: 14, scrolls: 6, fragments: 5,
      dropPool: ['eq_w_11', 'eq_a_11', 'eq_c_11', 'eq_w_10'], dropChance: 0.95, minQuality: 82
    },
    {
      id: 'trial_human_machine', mode: 'trial', name: '人機の試練', shortName: '試練 IV',
      ruleId: 'iron_bastion', waves: 5, scale: 1.08,
      normalPool: ['e_a1_1', 'e_a2_3', 'e_a3_2', 'e_a5_1'], bossId: 'e_a2_boss',
      intruderPool: [], intruderChance: 0,
      restriction: { type: 'races', allowed: ['human', 'machine'], label: '出撃条件：人間または機械種族' },
      coins: 740, crystals: 11, scrolls: 5, fragments: 4,
      dropPool: ['eq_w_06', 'eq_a_06', 'eq_c_06', 'eq_a_10'], dropChance: 0.92, minQuality: 78
    },
    {
      id: 'trial_dragon_god', mode: 'trial', name: '竜神の試練', shortName: '試練 V',
      ruleId: 'divine_tempo', waves: 5, scale: 1.16,
      normalPool: ['e_a4_1', 'e_a4_2', 'e_a5_2', 'e_a5_3'], bossId: 'e_a4_boss',
      intruderPool: [], intruderChance: 0,
      restriction: { type: 'races', allowed: ['dragon', 'god'], label: '出撃条件：竜または神種族' },
      coins: 940, crystals: 14, scrolls: 6, fragments: 5,
      dropPool: ['eq_w_08', 'eq_a_08', 'eq_c_08', 'eq_w_13'], dropChance: 0.95, minQuality: 82
    },
    {
      id: 'trial_monster_fairy_beast', mode: 'trial', name: '魔妖獣の試練', shortName: '試練 VI',
      ruleId: 'chaos_vortex', waves: 5, scale: 1.14,
      normalPool: ['e_a1_3', 'e_a2_2', 'e_a3_1', 'e_a4_3'], bossId: 'e_a3_boss',
      intruderPool: [], intruderChance: 0,
      restriction: { type: 'races', allowed: ['monster', 'fairy', 'beast'], label: '出撃条件：魔物・妖精・獣種族' },
      coins: 880, crystals: 13, scrolls: 6, fragments: 5,
      dropPool: ['eq_w_12', 'eq_a_12', 'eq_c_12', 'eq_c_13'], dropChance: 0.95, minQuality: 80
    }
  ];

  /* 異界闘技場（完全ソロPvE・階級別6段階の4vs4 NPC模擬戦・3回戦トーナメント） */
  const ARENA_STAGES = [
    {
      id: 'arena_bronze', mode: 'arena', rankIcon: '🥉', rankLabel: 'ブロンズ級',
      name: '闘技場・ブロンズ級', shortName: 'ブロンズ級',
      ruleId: 'steam_overheat', waves: 3, scale: 0.72,
      intruderPool: [], intruderChance: 0,
      arenaWaves: [
        { teamName: '新鋭特攻隊', charIds: ['c_fire_tank', 'c_water_dealer', 'c_wind_supporter', 'c_light_healer'] },
        { teamName: '蒼炎スクワッド', charIds: ['c_water_tank', 'c_fire_dealer', 'c_water_supporter', 'c_fire_healer'] },
        { teamName: '紅蓮の関門組', charIds: ['c_fire_tank', 'c_fire_dealer', 'c_fire_supporter', 'c_fire_healer'] }
      ],
      recHint: '初級4vs4模擬戦。回復と盾の維持で安定突破',
      coins: 520, crystals: 7, scrolls: 3, fragments: 2,
      dropPool: ['eq_w_03', 'eq_a_03', 'eq_c_03', 'eq_w_12', 'eq_c_12'], dropChance: 1.0, minQuality: 74
    },
    {
      id: 'arena_silver', mode: 'arena', rankIcon: '🥈', rankLabel: 'シルバー級',
      name: '闘技場・シルバー級', shortName: 'シルバー級',
      ruleId: 'aqua_resonance', waves: 3, scale: 0.88,
      intruderPool: [], intruderChance: 0,
      arenaWaves: [
        { teamName: '深海ガード隊', charIds: ['c_water_tank', 'c_water_dealer', 'c_water_supporter', 'c_water_healer'] },
        { teamName: '疾風奇襲団', charIds: ['c_wind_tank', 'c_wind_dealer', 'c_wind_supporter', 'c_wind_healer'] },
        { teamName: '水風連環陣', charIds: ['c_water_tank', 'c_wind_dealer', 'c_wind_supporter', 'c_water_healer'] }
      ],
      recHint: '速度バフと凍結が厄介。異常解除か高火力で速攻',
      coins: 720, crystals: 9, scrolls: 4, fragments: 3,
      dropPool: ['eq_w_05', 'eq_a_05', 'eq_c_05', 'eq_a_12', 'eq_c_12'], dropChance: 1.0, minQuality: 78
    },
    {
      id: 'arena_gold', mode: 'arena', rankIcon: '🥇', rankLabel: 'ゴールド級',
      name: '闘技場・ゴールド級', shortName: 'ゴールド級',
      ruleId: 'iron_bastion', waves: 3, scale: 1.04,
      intruderPool: [], intruderChance: 0,
      arenaWaves: [
        { teamName: '鋼鉄機甲班', charIds: ['c_none_tank', 'c_fire_tank', 'c_light_supporter', 'c_water_healer'] },
        { teamName: '暁光聖騎団', charIds: ['c_light_tank', 'c_light_dealer', 'c_light_supporter', 'c_light_healer'] },
        { teamName: '白銀の鉄壁隊', charIds: ['c_none_tank', 'c_light_dealer', 'c_none_supporter', 'c_light_healer'] }
      ],
      recHint: '厚い障壁と高防御編成。防御貫通や防御低下が有効',
      coins: 940, crystals: 11, scrolls: 5, fragments: 5,
      dropPool: ['eq_w_07', 'eq_a_07', 'eq_c_07', 'eq_w_12', 'eq_a_12'], dropChance: 1.0, minQuality: 82
    },
    {
      id: 'arena_platinum', mode: 'arena', rankIcon: '💠', rankLabel: 'プラチナ級',
      name: '闘技場・プラチナ級', shortName: 'プラチナ級',
      ruleId: 'midnight_feast', waves: 3, scale: 1.20,
      intruderPool: [], intruderChance: 0,
      arenaWaves: [
        { teamName: '夜霧の刺客団', charIds: ['c_dark_tank', 'c_dark_dealer', 'c_dark_supporter', 'c_dark_healer'] },
        { teamName: '魔獣狂宴隊', charIds: ['c_wind_tank', 'c_dark_dealer', 'c_dark_supporter', 'c_fire_healer'] },
        { teamName: '宵闇の呪縛陣', charIds: ['c_dark_tank', 'c_none_dealer', 'c_dark_supporter', 'c_dark_healer'] }
      ],
      recHint: '毒と弱体の重ね掛けに注意。回復役の異常解除が鍵',
      coins: 1180, crystals: 13, scrolls: 6, fragments: 6,
      dropPool: ['eq_w_09', 'eq_a_09', 'eq_c_09', 'eq_w_13', 'eq_c_13'], dropChance: 1.0, minQuality: 85
    },
    {
      id: 'arena_master', mode: 'arena', rankIcon: '👑', rankLabel: 'マスター級',
      name: '闘技場・マスター級', shortName: 'マスター級',
      ruleId: 'divine_tempo', waves: 3, scale: 1.36,
      intruderPool: [], intruderChance: 0,
      arenaWaves: [
        { teamName: '古竜咆哮隊', charIds: ['c_water_tank', 'c_fire_dealer', 'c_dark_supporter', 'c_none_healer'] },
        { teamName: '神域奏楽団', charIds: ['c_light_tank', 'c_light_dealer', 'c_fire_supporter', 'c_wind_healer'] },
        { teamName: '竜神覇王陣', charIds: ['c_light_tank', 'c_none_dealer', 'c_none_supporter', 'c_none_healer'] }
      ],
      recHint: '高速行動と全体奥義の連打戦。支援リンクと共鳴が必須',
      coins: 1460, crystals: 16, scrolls: 8, fragments: 8,
      dropPool: ['eq_w_11', 'eq_a_11', 'eq_c_11', 'eq_w_13', 'eq_a_13'], dropChance: 1.0, minQuality: 88
    },
    {
      id: 'arena_legend', mode: 'arena', rankIcon: '🌟', rankLabel: 'レジェンド級',
      name: '闘技場・レジェンド級', shortName: 'レジェンド級',
      ruleId: 'chaos_vortex', waves: 3, scale: 1.54,
      intruderPool: [], intruderChance: 0,
      arenaWaves: [
        { teamName: '時空疾走団', charIds: ['c_none_tank', 'c_wind_dealer', 'c_none_supporter', 'c_wind_healer'] },
        { teamName: '光闇双璧陣', charIds: ['c_dark_tank', 'c_light_dealer', 'c_light_supporter', 'c_dark_healer'] },
        { teamName: '万界頂上決戦隊', charIds: ['c_light_tank', 'c_none_dealer', 'c_fire_supporter', 'c_none_healer'] }
      ],
      recHint: '極品質装備と異界覚醒を揃えて挑む最高峰4vs4',
      coins: 1850, crystals: 20, scrolls: 10, fragments: 10,
      dropPool: ['eq_w_14', 'eq_a_14', 'eq_c_14', 'eq_w_13', 'eq_a_13', 'eq_c_13'], dropChance: 1.0, minQuality: 90
    }
  ];

  /* 混沌の異界塔：階層に応じたステージを動的生成（乱入なし） */
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
      name: `混沌の異界塔 ${f}階`,
      shortName: `異界塔 ${f}F`,
      waves: 5,
      ruleId,
      normalPool,
      bossId,
      bossIsElite: !isMilestone,
      intruderPool: [],
      intruderChance: 0,
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
  ARENA_STAGES.forEach((s) => { STAGE_MAP[s.id] = s; });

  Hacha.data.MAIN_AREAS = MAIN_AREAS;
  Hacha.data.MAIN_STAGES = MAIN_STAGES;
  Hacha.data.RAID_BOSSES = RAID_BOSSES;
  Hacha.data.TRIAL_STAGES = TRIAL_STAGES;
  Hacha.data.ARENA_STAGES = ARENA_STAGES;
  Hacha.data.STAGE_MAP = STAGE_MAP;
  Hacha.data.buildTowerStage = buildTowerStage;
})();
