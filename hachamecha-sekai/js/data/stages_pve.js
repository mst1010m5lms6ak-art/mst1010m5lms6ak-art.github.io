(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  var D = HS.Data = HS.Data || {};

  // ==================== 素材・通貨定義 ====================
  D.MATERIALS = {
    gold:         { id: 'gold',         name: 'ゴールド',     icon: '🪙', desc: '七界共通で使える輝く金貨。酒場加入や各種育成に使用。' },
    chaosShard:   { id: 'chaosShard',   name: '混沌の欠片',   icon: '💎', desc: '異界の境界から採れる虹色の欠片。異界共鳴や酒場勧誘に必要。' },
    mat_a1:       { id: 'mat_a1',       name: '境界の歯車石', icon: '⚙️', desc: 'エリア1「境界平原×機巧前線」で手に入る魔導歯車石。' },
    mat_a2:       { id: 'mat_a2',       name: '紅霧の竜鱗晶', icon: '🐉', desc: 'エリア2「紅蓮竜峰×星霧妖精郷」で採れる炎と霧の結晶。' },
    mat_a3:       { id: 'mat_a3',       name: '深淵の獣魔核', icon: '🌒', desc: 'エリア3「深淵魔界×極彩獣域」に宿る濃密な魔獣核。' },
    mat_a4:       { id: 'mat_a4',       name: '白銀の星環片', icon: '✨', desc: 'エリア4「白銀神域×はちゃめちゃ交差線」の白金結晶片。' },
    mat_intruder: { id: 'mat_intruder', name: '乱入者の証',   icon: '⚡', desc: '乱入敵・指名手配の討伐で獲得できる規格外の証。' },
    mat_tower:    { id: 'mat_tower',    name: '混線塔の鍵石', icon: '🗼', desc: '異界混線タワーの攻略で得られる星銀の鍵石。' },
    mat_boss:     { id: 'mat_boss',     name: '超巨兵の炉心', icon: '🔥', desc: '超ボス計測戦の到達報酬として授けられる超高出力炉心。' },
    mat_relay:    { id: 'mat_relay',    name: '総力戦の勲章', icon: '🎖️', desc: '多部隊リレー総力戦の制覇を称える栄誉の勲章。' }
  };

  D.MATERIAL_LIST = Object.keys(D.MATERIALS).map(function (k) { return D.MATERIALS[k]; });

  // ==================== メイン冒険: 4エリア × 10ステージ = 40ステージ ====================
  var AREA_CONFIGS = [
    {
      id: 'area1', idx: 1, name: '境界平原×機巧前線', shortName: '境界平原',
      world: 'frontier', subWorld: 'mechcity',
      desc: '草原のど真ん中に蒸気パイプが突き刺さる、はちゃめちゃ旅の出発点。',
      unlockStageId: null,
      matId: 'mat_a1',
      dropSets: ['set_frontier', 'set_steam'],
      enemyPool: ['en_gear_slime', 'en_steam_gob', 'en_wild_wolf', 'en_clock_owl', 'en_scrap_dog', 'en_volt_bat'],
      intruderPool: ['int_joker', 'int_gold_mimic', 'int_piko'],
      bossId: 'boss_a1',
      bossEscorts: ['en_clock_owl', 'en_scrap_dog'],
      stageNames: [
        '旅立ちの歯車草原', '蒸気パイプの街道', '野狼と時計塔', '鉄屑の橋頭堡', '荒野狼の挑戦',
        '放電トンネル抜道', '機巧前線ゲート', '蒸気兵団の検問', '零式防衛ライン', '蒸気巨兵ガラン戦'
      ],
      stageShortNames: [
        '歯車草原', '蒸気街道', '時計塔', '鉄屑の橋', '荒野狼',
        '放電抜道', '前線門', '蒸気検問', '零式防衛', '蒸気巨兵'
      ],
      stage5Char: 'ch_garudo',
      stage10Char: 'ch_volt',
      stage10Relic: 'rel_1',
      baseScale: 0.78, scaleStep: 0.065,
      baseGold: 130, goldStep: 28,
      qMin: 18, qMax: 68
    },
    {
      id: 'area2', idx: 2, name: '紅蓮竜峰×星霧妖精郷', shortName: '紅蓮竜峰',
      world: 'dragonpeak', subWorld: 'fairyvale',
      desc: '灼熱の火山と星屑の霧森が真っ二つに隣り合う、熱くて涼しい不思議地帯。',
      unlockStageId: 'a1_s10',
      matId: 'mat_a2',
      dropSets: ['set_crimson', 'set_starlight', 'set_aqua'],
      enemyPool: ['en_flame_kobold', 'en_magma_drake', 'en_star_pixie', 'en_dew_sprite', 'en_cinder_wyrm', 'en_petal_moth'],
      intruderPool: ['int_raiga', 'int_lunaria', 'int_gold_mimic', 'int_frost_fenrir'],
      bossId: 'boss_a2',
      bossEscorts: ['en_magma_drake', 'en_dew_sprite'],
      stageNames: [
        '火の粉舞う霧入口', '溶岩と朝露の渓谷', '星霧ピクシーの森', 'コボルト採掘坑道', '紅蓮幼竜姫の試練',
        '花弁の風吹く崖道', '清泉と火口の境目', '幼竜の巣の回廊', '星霧の火炎祭壇', '紅蓮妖竜ファフナ戦'
      ],
      stageShortNames: [
        '霧の入口', '溶岩渓谷', '星霧の森', '採掘坑道', '幼竜姫',
        '花弁崖道', '清泉火口', '幼竜回廊', '火炎祭壇', '紅蓮妖竜'
      ],
      stage5Char: 'ch_ignis',
      stage10Char: 'ch_fiora',
      stage10Relic: 'rel_2',
      baseScale: 1.22, scaleStep: 0.085,
      baseGold: 260, goldStep: 42,
      qMin: 35, qMax: 84
    },
    {
      id: 'area3', idx: 3, name: '深淵魔界×極彩獣域', shortName: '深淵魔界',
      world: 'abyss', subWorld: 'wilds',
      desc: '紅月が照らす魔都と極彩色の大草原がぶつかり合う、牙と魔力の激戦区。',
      unlockStageId: 'a2_s10',
      matId: 'mat_a3',
      dropSets: ['set_abyss', 'set_wild', 'set_aqua'],
      enemyPool: ['en_shadow_imp', 'en_venom_spider', 'en_prism_tiger', 'en_abyss_knight', 'en_horn_rhino', 'en_curse_wisp'],
      intruderPool: ['int_joker', 'int_raiga', 'int_frost_fenrir', 'int_blaze_hydra'],
      bossId: 'boss_a3',
      bossEscorts: ['en_abyss_knight', 'en_curse_wisp'],
      stageNames: [
        '紅月の極彩サバンナ', '毒糸と巨樹の迷宮', '深淵インプの夜街', '極彩トラの狩り場', '深淵の影剣客',
        '剛角サイの突撃路', '漆黒城門の前哨', '呪炎揺らめく闘技場', '獣魔軍団の玉座前', '獣魔公ベヘモット戦'
      ],
      stageShortNames: [
        '紅月草原', '毒糸迷宮', '夜街路', '極彩狩場', '影剣客',
        '剛角突路', '漆黒城門', '呪炎闘場', '玉座前', '獣魔公'
      ],
      stage5Char: 'ch_nox',
      stage10Char: 'ch_barga',
      stage10Relic: 'rel_3',
      baseScale: 1.72, scaleStep: 0.10,
      baseGold: 420, goldStep: 60,
      qMin: 50, qMax: 94
    },
    {
      id: 'area4', idx: 4, name: '白銀神域×はちゃめちゃ交差線', shortName: '白銀神域',
      world: 'sanctum', subWorld: 'frontier',
      desc: '七つの世界が渦巻く雲上の白銀回廊。あらゆる異界の猛者が集う最終前線！',
      unlockStageId: 'a3_s10',
      matId: 'mat_a4',
      dropSets: ['set_sanctum', 'set_chaos', 'set_crimson', 'set_starlight'],
      enemyPool: ['en_silver_golem', 'en_halo_bird', 'en_chrono_doll', 'en_astral_drake', 'en_chaos_hound', 'en_aether_squid'],
      intruderPool: ['int_piko', 'int_lunaria', 'int_blaze_hydra', 'int_prism_seraph', 'int_gold_mimic'],
      bossId: 'boss_a4',
      bossEscorts: ['en_silver_golem', 'en_aether_squid'],
      stageNames: [
        '雲上の白銀参道', '光輪バードの回廊', '時計塔の歯車階段', '星界飛竜の滑走路', '白銀の光巫女',
        '虚空イカ泳ぐ星海', '混沌ハウンドの門', '七界交差の大広場', '天界最終防衛陣', '境界機神クロノス戦'
      ],
      stageShortNames: [
        '白銀参道', '光輪回廊', '時計階段', '飛竜走路', '光巫女',
        '虚空星海', '混沌の門', '交差広場', '最終防衛', '境界機神'
      ],
      stage5Char: 'ch_seraphi',
      stage10Char: 'ch_mikoto',
      stage10Relic: 'rel_4',
      baseScale: 2.30, scaleStep: 0.12,
      baseGold: 640, goldStep: 85,
      qMin: 64, qMax: 100
    }
  ];

  D.AREAS = [];
  D.STAGE_BY_ID = {};

  AREA_CONFIGS.forEach(function (ac) {
    var stages = [];
    for (var s = 1; s <= 10; s++) {
      var sid = 'a' + ac.idx + '_s' + s;
      var isMid = (s === 5);
      var isEnd = (s === 10);
      var stageWorld = (s % 2 === 1) ? ac.world : ac.subWorld;
      if (isEnd) stageWorld = ac.world;

      var qMin = Math.min(95, Math.round(ac.qMin + (s - 1) * 2.2));
      var qMax = Math.min(100, Math.round(ac.qMax + (s - 1) * 2.0));
      if (ac.idx === 4 && s >= 7) qMax = 100;
      if (ac.idx === 3 && s === 10) qMax = 100;

      var firstClear = {
        gold: Math.round((ac.baseGold + (s - 1) * ac.goldStep) * 2.2),
        chaosShard: isEnd ? 5 : (isMid ? 3 : 1),
        matId: ac.matId,
        matQty: isEnd ? 8 : (isMid ? 5 : 3)
      };
      if (isMid && ac.stage5Char) firstClear.unlockCharId = ac.stage5Char;
      if (isEnd && ac.stage10Char) firstClear.unlockCharId = ac.stage10Char;
      if (isEnd && ac.stage10Relic) firstClear.unlockRelicId = ac.stage10Relic;

      var waveBossId = isEnd
        ? ac.bossId
        : (isMid ? ac.enemyPool[ac.enemyPool.length - 1] : ac.enemyPool[(s - 1) % ac.enemyPool.length]);

      var stageObj = {
        id: sid,
        areaId: ac.id,
        areaIdx: ac.idx,
        stageNum: s,
        code: ac.idx + '-' + s,
        name: ac.stageNames[s - 1],
        shortName: ac.stageShortNames[s - 1],
        world: stageWorld,
        waves: 5,
        powerScale: Number((ac.baseScale + (s - 1) * ac.scaleStep).toFixed(2)),
        enemyPool: ac.enemyPool.slice(),
        bossId: waveBossId,
        isAreaBoss: isEnd,
        bossEscorts: isEnd ? ac.bossEscorts.slice() : [ac.enemyPool[s % ac.enemyPool.length]],
        intruderPool: ac.intruderPool.slice(),
        intruderChance: isEnd ? 0.28 : 0.22,
        goldReward: Math.round(ac.baseGold + (s - 1) * ac.goldStep),
        matId: ac.matId,
        matQty: isEnd ? 4 : (s >= 6 ? 3 : 2),
        dropSets: ac.dropSets.slice(),
        qualityRange: [qMin, qMax],
        firstClear: firstClear
      };
      stages.push(stageObj);
      D.STAGE_BY_ID[sid] = stageObj;
    }

    D.AREAS.push({
      id: ac.id,
      idx: ac.idx,
      name: ac.name,
      shortName: ac.shortName,
      world: ac.world,
      subWorld: ac.subWorld,
      desc: ac.desc,
      unlockStageId: ac.unlockStageId,
      matId: ac.matId,
      dropSets: ac.dropSets.slice(),
      stages: stages
    });
  });

  // ==================== 異界混線タワー (20階層・階層別特殊ルール) ====================
  var TOWER_RULES = [
    { name: '疾風加速域', desc: '全ユニットの速度+20%', mod: { spdPct: 0.20 } },
    { name: '紅蓮過熱域', desc: '炎属性ユニットの与ダメ+30%', mod: { elementBoost: 'fire', elementBoostPct: 0.30 } },
    { name: '蒼氷護衛域', desc: '味方全体が開幕防護壁20%を獲得', mod: { startShieldPct: 0.20 } },
    { name: '極会心戦場', desc: '会心率+20%・会心ダメ+30%', mod: { crit: 0.20, critDmg: 0.30 } },
    { name: '異常増幅域', desc: '状態異常の付与率+25%・特攻+25%', mod: { ailmentRate: 0.25, ailmentDmgPct: 0.25 } },
    { name: '星霧癒し域', desc: '与回復量+35%・WAVE回復+15%', mod: { healDealtPct: 0.35, waveHealPct: 0.15 } },
    { name: '白銀光輝域', desc: '光・闇属性の与ダメ+25%', mod: { lightDarkBoostPct: 0.25 } },
    { name: '連撃共鳴域', desc: '追撃率+20%・反撃率+20%', mod: { followUpRate: 0.20, counterRate: 0.20 } }
  ];

  var TOWER_WORLDS = ['frontier', 'mechcity', 'dragonpeak', 'fairyvale', 'abyss', 'wilds', 'sanctum'];
  var TOWER_POOLS = [
    ['en_gear_slime', 'en_steam_gob', 'en_wild_wolf', 'en_clock_owl'],
    ['en_flame_kobold', 'en_magma_drake', 'en_star_pixie', 'en_dew_sprite'],
    ['en_shadow_imp', 'en_venom_spider', 'en_prism_tiger', 'en_abyss_knight'],
    ['en_silver_golem', 'en_halo_bird', 'en_chrono_doll', 'en_astral_drake', 'en_chaos_hound']
  ];

  var TOWER_FLOOR_NAMES = [
    '境界の入口', '歯車の踊り場', '紅霧の回廊', '星風の小径', '鋼鉄番人の門',
    '溶岩の階段', '朝露の泉間', '炎翼の広間', '星霧の展望台', '蒼銀戦乙女の試練',
    '深淵の回廊', '極彩の闘技間', '紅月の書庫', '獣牙の通路', '夢幻女王の庭園',
    '白銀の鐘楼', '星海の橋廊', '時針の間', '七界交差室', '黎明女神の頂'
  ];

  D.TOWER_FLOORS = [];
  D.TOWER_BY_ID = {};
  for (var f = 1; f <= 20; f++) {
    var tid = 'tw_' + f;
    var rule = TOWER_RULES[(f - 1) % TOWER_RULES.length];
    var tierIdx = Math.min(3, Math.floor((f - 1) / 5));
    var pool = TOWER_POOLS[tierIdx];
    var bossId = pool[(f - 1) % pool.length];
    var escorts = [pool[f % pool.length], pool[(f + 1) % pool.length]];
    var world = TOWER_WORLDS[(f - 1) % TOWER_WORLDS.length];
    var floorTitle = TOWER_FLOOR_NAMES[f - 1];

    if (f === 5)  { bossId = 'el_t5';  world = 'mechcity'; }
    if (f === 10) { bossId = 'el_t10'; world = 'sanctum'; }
    if (f === 15) { bossId = 'el_t15'; world = 'fairyvale'; }
    if (f === 20) { bossId = 'el_t20'; world = 'sanctum'; }

    var fc = {
      gold: 350 + f * 180,
      chaosShard: (f % 5 === 0) ? 6 : 2,
      matId: 'mat_tower',
      matQty: (f % 5 === 0) ? 8 : 3
    };
    if (f === 5)  fc.unlockRelicId = 'rel_5';
    if (f === 10) { fc.unlockCharId = 'ch_valkyr'; fc.unlockRelicId = 'rel_6'; }
    if (f === 15) fc.unlockRelicId = 'rel_7';
    if (f === 20) { fc.unlockCharId = 'ch_celestia'; fc.unlockRelicId = 'rel_8'; }

    var floorObj = {
      id: tid,
      floor: f,
      name: floorTitle,
      world: world,
      ruleName: rule.name,
      ruleDesc: rule.desc,
      ruleMod: rule.mod,
      waves: 3,
      powerScale: Number((0.95 + (f - 1) * 0.145).toFixed(2)),
      enemyPool: pool.slice(),
      bossId: bossId,
      bossEscorts: escorts,
      dropSets: f >= 15 ? ['set_chaos', 'set_sanctum', 'set_abyss'] : (f >= 8 ? ['set_crimson', 'set_starlight', 'set_wild'] : ['set_frontier', 'set_steam', 'set_aqua']),
      qualityRange: [Math.min(92, 42 + f * 2), Math.min(100, 74 + Math.floor(f * 1.4))],
      firstClear: fc,
      repeatReward: { gold: 180 + f * 45, matId: 'mat_tower', matQty: 2 }
    };
    D.TOWER_FLOORS.push(floorObj);
    D.TOWER_BY_ID[tid] = floorObj;
  }

  // ==================== 超ボス計測戦 (3体・50行動リミット・累計ダメージマイルストーン) ====================
  D.SUPERBOSSES = [
    {
      id: 'sb_1',
      name: '機竜帝オメガ計測戦',
      world: 'mechcity',
      enemyId: 'sb_omega',
      maxActions: 50,
      powerScale: 1.0,
      dropSets: ['set_steam', 'set_crimson', 'set_chaos'],
      qualityRange: [65, 100],
      desc: '50行動のあいだ超巨兵オメガへ総攻撃！累計ダメージ到達で機装竜ドレイクや世界遺物を獲得。',
      milestones: [
        { id: 'sb1_m1', dmg: 12000,  label: '1.2万ダメ到達', reward: { gold: 1000, chaosShard: 3, matId: 'mat_boss', matQty: 4 } },
        { id: 'sb1_m2', dmg: 35000,  label: '3.5万ダメ到達', reward: { gold: 2200, chaosShard: 5, matId: 'mat_boss', matQty: 8, unlockCharId: 'ch_drake' } },
        { id: 'sb1_m3', dmg: 80000,  label: '8万ダメ到達',   reward: { gold: 4500, chaosShard: 8, matId: 'mat_boss', matQty: 14, unlockRelicId: 'rel_9' } }
      ]
    },
    {
      id: 'sb_2',
      name: '蒼穹海竜リヴァイア計測戦',
      world: 'fairyvale',
      enemyId: 'sb_leviathan',
      maxActions: 50,
      powerScale: 1.15,
      dropSets: ['set_aqua', 'set_starlight', 'set_chaos'],
      qualityRange: [72, 100],
      desc: '凍結と大渦を凌ぎながら神竜リヴァイアへ極大ダメージを叩き込め！',
      milestones: [
        { id: 'sb2_m1', dmg: 20000,  label: '2万ダメ到達',   reward: { gold: 1600, chaosShard: 4, matId: 'mat_boss', matQty: 6 } },
        { id: 'sb2_m2', dmg: 55000,  label: '5.5万ダメ到達', reward: { gold: 3400, chaosShard: 7, matId: 'mat_boss', matQty: 10 } },
        { id: 'sb2_m3', dmg: 120000, label: '12万ダメ到達',  reward: { gold: 6500, chaosShard: 12, matId: 'mat_boss', matQty: 18, unlockRelicId: 'rel_10' } }
      ]
    },
    {
      id: 'sb_3',
      name: '混沌神カオスギア計測戦',
      world: 'abyss',
      enemyId: 'sb_chaos',
      maxActions: 50,
      powerScale: 1.30,
      dropSets: ['set_abyss', 'set_sanctum', 'set_chaos'],
      qualityRange: [80, 100],
      desc: '七界最大の怪物カオスギアとの限界計測戦！最強ビルドとシナジーの真価を見せつけろ。',
      milestones: [
        { id: 'sb3_m1', dmg: 30000,  label: '3万ダメ到達',   reward: { gold: 2400, chaosShard: 6, matId: 'mat_boss', matQty: 8 } },
        { id: 'sb3_m2', dmg: 85000,  label: '8.5万ダメ到達', reward: { gold: 5000, chaosShard: 10, matId: 'mat_boss', matQty: 14 } },
        { id: 'sb3_m3', dmg: 180000, label: '18万ダメ到達',  reward: { gold: 9000, chaosShard: 16, matId: 'mat_boss', matQty: 24, unlockRelicId: 'rel_11' } }
      ]
    }
  ];

  D.SUPERBOSS_BY_ID = {};
  D.SUPERBOSSES.forEach(function (sb) { D.SUPERBOSS_BY_ID[sb.id] = sb; });

  // ==================== 多部隊リレー総力戦 (3難度・1軍→2軍→3軍リレー) ====================
  D.RELAY_RAIDS = [
    {
      id: 'rl_1',
      name: '境界防衛リレー総力戦',
      world: 'frontier',
      squadsRequired: 3,
      dropSets: ['set_frontier', 'set_steam', 'set_intruder'],
      qualityRange: [60, 96],
      desc: '最大3部隊でバトンを繋ぎ3連ボスを撃破せよ！初制覇で終焉の魔神王アビスが加入。',
      phases: [
        { phase: 1, name: '第1陣・境界番竜', enemyId: 'el_r1_p1', escorts: ['en_wild_wolf', 'en_clock_owl'], powerScale: 1.05 },
        { phase: 2, name: '第2陣・紅蓮妖竜', enemyId: 'boss_a2',  escorts: ['en_magma_drake'], powerScale: 1.25 },
        { phase: 3, name: '最終陣・魔神王アビス', enemyId: 'el_r1_p2', escorts: ['en_abyss_knight', 'en_curse_wisp'], powerScale: 1.40 }
      ],
      firstClear: { gold: 3200, chaosShard: 8, matId: 'mat_relay', matQty: 10, unlockCharId: 'ch_abyssal' },
      repeatReward: { gold: 900, matId: 'mat_relay', matQty: 4 }
    },
    {
      id: 'rl_2',
      name: '獣機激突リレー総力戦',
      world: 'wilds',
      squadsRequired: 3,
      dropSets: ['set_wild', 'set_aqua', 'set_abyss', 'set_chaos'],
      qualityRange: [72, 100],
      desc: '暴風獣帝と蒼氷機皇が連なる中級総力戦。属性相性を部隊ごとに組むのが鍵！',
      phases: [
        { phase: 1, name: '第1陣・暴風獣帝', enemyId: 'el_r2_p1', escorts: ['en_prism_tiger', 'en_horn_rhino'], powerScale: 1.45 },
        { phase: 2, name: '第2陣・獣魔公',   enemyId: 'boss_a3',  escorts: ['en_venom_spider', 'en_shadow_imp'], powerScale: 1.65 },
        { phase: 3, name: '最終陣・蒼氷機皇', enemyId: 'el_r2_p2', escorts: ['en_silver_golem'], powerScale: 1.80 }
      ],
      firstClear: { gold: 5200, chaosShard: 12, matId: 'mat_relay', matQty: 15, unlockRelicId: 'rel_12' },
      repeatReward: { gold: 1500, matId: 'mat_relay', matQty: 6 }
    },
    {
      id: 'rl_3',
      name: '七界融合リレー総力戦',
      world: 'sanctum',
      squadsRequired: 3,
      dropSets: ['set_chaos', 'set_sanctum', 'set_intruder'],
      qualityRange: [82, 100],
      desc: '七界の頂点が総出で待ち構える最高難度の三部隊リレー総力戦。極品質の万象交差装備を狙え！',
      phases: [
        { phase: 1, name: '第1陣・境界機神', enemyId: 'boss_a4',  escorts: ['en_halo_bird', 'en_chrono_doll'], powerScale: 1.95 },
        { phase: 2, name: '第2陣・虹翼熾天使', enemyId: 'int_prism_seraph', escorts: ['en_astral_drake', 'en_aether_squid'], powerScale: 2.15 },
        { phase: 3, name: '最終陣・七界融合体', enemyId: 'el_r3_p3', escorts: ['en_silver_golem', 'en_chaos_hound'], powerScale: 2.35 }
      ],
      firstClear: { gold: 8500, chaosShard: 18, matId: 'mat_relay', matQty: 24 },
      repeatReward: { gold: 2400, matId: 'mat_relay', matQty: 9 }
    }
  ];

  D.RELAY_BY_ID = {};
  D.RELAY_RAIDS.forEach(function (rl) { D.RELAY_BY_ID[rl.id] = rl; });

  // ==================== 独立モード：乱入指名手配 (8件) ====================
  D.BOUNTIES = [
    {
      id: 'bty_joker', name: '手配：異界道化ジョーカー', world: 'abyss',
      intruderId: 'int_joker', escorts: ['en_shadow_imp', 'en_clock_owl'],
      waves: 3, powerScale: 1.00,
      dropSets: ['set_intruder', 'set_frontier'], qualityRange: [48, 88],
      goldReward: 420, matId: 'mat_intruder', matQty: 3,
      recruitCharId: 'ch_joker', killsToRecruit: 3,
      firstClear: { gold: 900, chaosShard: 3, matId: 'mat_intruder', matQty: 5 },
      desc: '各地の戦場に現れるお調子者の道化師。3回討伐すれば約束どおり仲間になる！'
    },
    {
      id: 'bty_mimic', name: '手配：黄金大ミミック', world: 'frontier',
      intruderId: 'int_gold_mimic', escorts: ['en_gear_slime', 'en_scrap_dog'],
      waves: 3, powerScale: 1.15,
      dropSets: ['set_frontier', 'set_steam', 'set_intruder'], qualityRange: [56, 94],
      goldReward: 950, matId: 'mat_intruder', matQty: 3,
      firstClear: { gold: 1800, chaosShard: 3, matId: 'mat_intruder', matQty: 5 },
      desc: '大量のゴールドと高品質装備を溜め込んだ豪華な宝箱魔物。金策の絶好の標的！'
    },
    {
      id: 'bty_piko', name: '手配：暴走星機ピコット', world: 'mechcity',
      intruderId: 'int_piko', escorts: ['en_volt_bat', 'en_clock_owl'],
      waves: 3, powerScale: 1.35,
      dropSets: ['set_intruder', 'set_steam'], qualityRange: [56, 92],
      goldReward: 580, matId: 'mat_intruder', matQty: 4,
      recruitCharId: 'ch_piko', killsToRecruit: 3,
      firstClear: { gold: 1200, chaosShard: 4, matId: 'mat_intruder', matQty: 6 },
      desc: '超高速で飛び回る迷子衛星機。3回捕獲（討伐）すれば加速サポーターとして加入！'
    },
    {
      id: 'bty_raiga', name: '手配：紅炎武者ライガ', world: 'dragonpeak',
      intruderId: 'int_raiga', escorts: ['en_flame_kobold', 'en_magma_drake'],
      waves: 3, powerScale: 1.55,
      dropSets: ['set_intruder', 'set_crimson'], qualityRange: [62, 95],
      goldReward: 700, matId: 'mat_intruder', matQty: 4,
      recruitCharId: 'ch_raiga', killsToRecruit: 3,
      firstClear: { gold: 1500, chaosShard: 4, matId: 'mat_intruder', matQty: 6 },
      desc: '強者を求めて乱入を繰り返す竜人武者。3度打ち勝てば背水アタッカーとして仲間になる！'
    },
    {
      id: 'bty_fenrir', name: '手配：氷牙フェンリル', world: 'wilds',
      intruderId: 'int_frost_fenrir', escorts: ['en_prism_tiger', 'en_dew_sprite'],
      waves: 3, powerScale: 1.75,
      dropSets: ['set_aqua', 'set_wild', 'set_intruder'], qualityRange: [68, 98],
      goldReward: 840, matId: 'mat_intruder', matQty: 5,
      firstClear: { gold: 1900, chaosShard: 5, matId: 'mat_intruder', matQty: 7 },
      desc: '凍てつく吹雪を纏う銀狼の乱入者。蒼海氷晶・極彩猛獣セットの高品質品を狙える。'
    },
    {
      id: 'bty_lunaria', name: '手配：月蝕妖精ルナリア', world: 'fairyvale',
      intruderId: 'int_lunaria', escorts: ['en_star_pixie', 'en_petal_moth'],
      waves: 3, powerScale: 1.95,
      dropSets: ['set_intruder', 'set_starlight', 'set_abyss'], qualityRange: [70, 98],
      goldReward: 940, matId: 'mat_intruder', matQty: 5,
      recruitCharId: 'ch_lunaria', killsToRecruit: 3,
      firstClear: { gold: 2200, chaosShard: 5, matId: 'mat_intruder', matQty: 8 },
      desc: '夜更かし好きの神格黒妖精。3回勝負に勝てば攻防一体の闇ヒーラーとして仲間に！'
    },
    {
      id: 'bty_hydra', name: '手配：灼熱ヒュドラ', world: 'dragonpeak',
      intruderId: 'int_blaze_hydra', escorts: ['en_cinder_wyrm', 'en_horn_rhino'],
      waves: 3, powerScale: 2.25,
      dropSets: ['set_crimson', 'set_abyss', 'set_intruder'], qualityRange: [76, 100],
      goldReward: 1180, matId: 'mat_intruder', matQty: 6,
      firstClear: { gold: 2800, chaosShard: 6, matId: 'mat_intruder', matQty: 10 },
      desc: '再生する三頭溶岩竜の指名手配。最高品質「極」の紅蓮竜鱗・乱入覇者装備を落とす！'
    },
    {
      id: 'bty_seraph', name: '手配：虹翼の熾天使', world: 'sanctum',
      intruderId: 'int_prism_seraph', escorts: ['en_halo_bird', 'en_silver_golem'],
      waves: 3, powerScale: 2.55,
      dropSets: ['set_intruder', 'set_sanctum', 'set_chaos'], qualityRange: [80, 100],
      goldReward: 1500, matId: 'mat_intruder', matQty: 8,
      firstClear: { gold: 3800, chaosShard: 8, matId: 'mat_intruder', matQty: 12 },
      desc: '境界監査に現れる最強格の乱入熾天使。極品質の万象交差・乱入覇者セットが狙える！'
    }
  ];

  D.BOUNTY_BY_ID = {};
  D.BOUNTIES.forEach(function (b) { D.BOUNTY_BY_ID[b.id] = b; });

  // ==================== 別働隊・遠征ルート (6ルート・戦闘勝利回数連動・実時間待ちゼロ!) ====================
  D.EXPEDITIONS = [
    {
      id: 'exp_1', name: '境界平原の資材調達', world: 'frontier',
      battlesRequired: 5,
      prefElements: ['fire', 'none'], prefRaces: ['human', 'mech'], prefRole: 'tank',
      desc: '5勝ごとに帰還！境界の歯車石とゴールドを手軽に集める基本ルート。',
      rewards: { gold: 520, matId: 'mat_a1', matQty: 5, chaosShard: 1, dropSets: ['set_frontier', 'set_steam'], qualityRange: [40, 82] }
    },
    {
      id: 'exp_2', name: '竜峰と霧森の採掘行', world: 'dragonpeak',
      battlesRequired: 8,
      prefElements: ['fire', 'wind'], prefRaces: ['dragon', 'fairy'], prefRole: 'dealer',
      desc: '8勝ごとに帰還！紅霧の竜鱗晶と紅蓮・星霧セット装備を持ち帰る。',
      rewards: { gold: 980, matId: 'mat_a2', matQty: 6, chaosShard: 2, dropSets: ['set_crimson', 'set_starlight', 'set_aqua'], qualityRange: [52, 90] }
    },
    {
      id: 'exp_3', name: '深淵獣域の秘宝探索', world: 'abyss',
      battlesRequired: 8,
      prefElements: ['dark', 'wind'], prefRaces: ['demon', 'beast'], prefRole: 'supporter',
      desc: '8勝ごとに帰還！深淵の獣魔核と深淵・極彩セット装備をたっぷり回収。',
      rewards: { gold: 1350, matId: 'mat_a3', matQty: 7, chaosShard: 3, dropSets: ['set_abyss', 'set_wild'], qualityRange: [60, 95] }
    },
    {
      id: 'exp_4', name: '白銀神域の星環調査', world: 'sanctum',
      battlesRequired: 10,
      prefElements: ['light', 'water'], prefRaces: ['god', 'mech'], prefRole: 'healer',
      desc: '10勝ごとに帰還！白銀の星環片と最高峰セット装備を狙う神域遠征。',
      rewards: { gold: 1950, matId: 'mat_a4', matQty: 8, chaosShard: 4, dropSets: ['set_sanctum', 'set_chaos'], qualityRange: [70, 100] }
    },
    {
      id: 'exp_5', name: '乱入者の足跡追跡', world: 'mechcity',
      battlesRequired: 10,
      prefElements: ['none', 'dark'], prefRaces: ['human', 'demon'], prefRole: 'supporter',
      desc: '10勝ごとに帰還！乱入者の証と乱入覇者セット装備を探し出す特務班。',
      rewards: { gold: 1680, matId: 'mat_intruder', matQty: 7, chaosShard: 3, dropSets: ['set_intruder', 'set_steam'], qualityRange: [66, 98] }
    },
    {
      id: 'exp_6', name: '七界交差の混沌採掘', world: 'sanctum',
      battlesRequired: 12,
      prefElements: ['light', 'dark'], prefRaces: ['dragon', 'god'], prefRole: 'dealer',
      desc: '12勝ごとに帰還！大量の混沌の欠片と極品質チャンスの伝説装備を獲得。',
      rewards: { gold: 2600, matId: 'mat_a4', matQty: 10, chaosShard: 6, dropSets: ['set_chaos', 'set_intruder', 'set_sanctum'], qualityRange: [76, 100] }
    }
  ];

  D.EXPEDITION_BY_ID = {};
  D.EXPEDITIONS.forEach(function (ex) { D.EXPEDITION_BY_ID[ex.id] = ex; });

  // ==================== 世界遺物 (12種・最大3つまでパーティ全体装備!) ====================
  D.RELICS = [
    {
      id: 'rel_1', name: '境界の黄金羅針', kana: 'きょうかいのおうごんらしん', world: 'frontier', icon: '🧭',
      desc: 'パーティ全体のHP+10%・獲得ゴールド+20%。',
      sourceLabel: 'エリア1-10 初回クリア',
      mod: { hpPct: 0.10, dropGoldPct: 0.20 }
    },
    {
      id: 'rel_2', name: '紅蓮星霧の双花', kana: 'ぐれんほしぎりのそうか', world: 'dragonpeak', icon: '🌺',
      desc: 'パーティ全体の攻撃+12%・WAVE開始HP回復+10%。',
      sourceLabel: 'エリア2-10 初回クリア',
      mod: { atkPct: 0.12, waveHealPct: 0.10 }
    },
    {
      id: 'rel_3', name: '獣魔の紅月角笛', kana: 'じゅうまのこうげつつのぶえ', world: 'abyss', icon: '📯',
      desc: 'パーティ全体の会心率+8%・異常特攻+18%。',
      sourceLabel: 'エリア3-10 初回クリア',
      mod: { crit: 0.08, ailmentDmgPct: 0.18 }
    },
    {
      id: 'rel_4', name: '白銀の星刻時計', kana: 'しろがねのほしどけい', world: 'sanctum', icon: '⏳',
      desc: 'パーティ全体の速度+10%・初期ゲージ+18%。',
      sourceLabel: 'エリア4-10 初回クリア',
      mod: { spdPct: 0.10, initGauge: 0.18 }
    },
    {
      id: 'rel_5', name: '鋼鉄番人の歯車盾', kana: 'こうてつばんにんのはぐるまたて', world: 'mechcity', icon: '🛡️',
      desc: 'パーティ全体の防御+14%・開幕防護壁14%。',
      sourceLabel: '混線タワー 5階クリア',
      mod: { defPct: 0.14, startShieldPct: 0.14 }
    },
    {
      id: 'rel_6', name: '戦乙女の蒼銀翼章', kana: 'いくさおとめのそうぎんよくしょう', world: 'sanctum', icon: '🪽',
      desc: 'パーティ全体の被ダメ-8%・反撃率+12%。',
      sourceLabel: '混線タワー 10階クリア',
      mod: { dmgTakenPct: -0.08, counterRate: 0.12 }
    },
    {
      id: 'rel_7', name: '夢幻女王の星霧冠', kana: 'むげんじょおうのほしぎりかん', world: 'fairyvale', icon: '👑',
      desc: 'パーティ全体の与回復+22%・状態異常耐性+16%。',
      sourceLabel: '混線タワー 15階クリア',
      mod: { healDealtPct: 0.22, res: 0.16 }
    },
    {
      id: 'rel_8', name: '黎明女神の創世杯', kana: 'れいめいめがみのそうせいはい', world: 'sanctum', icon: '🏆',
      desc: 'パーティ全体の全能力+10%・ドロップ装備品質期待値+4。',
      sourceLabel: '混線タワー 20階踏破',
      mod: { hpPct: 0.10, atkPct: 0.10, defPct: 0.10, dropQualityBonus: 4 }
    },
    {
      id: 'rel_9', name: 'オメガの超圧縮炉', kana: 'おめがのちょうあっしゅくろ', world: 'mechcity', icon: '⚛️',
      desc: 'パーティ全体の攻撃+15%・追撃率+12%。',
      sourceLabel: '超ボス「機竜帝オメガ」8万ダメ到達',
      mod: { atkPct: 0.15, followUpRate: 0.12 }
    },
    {
      id: 'rel_10', name: 'リヴァイアの蒼海珠', kana: 'りゔぁいあのそうかいじゅ', world: 'fairyvale', icon: '🔮',
      desc: 'パーティ全体のスキル与ダメ+16%・行動開始HP5%回復。',
      sourceLabel: '超ボス「蒼穹海竜」12万ダメ到達',
      mod: { skillDmgPct: 0.16, turnRegenPct: 0.05 }
    },
    {
      id: 'rel_11', name: '混沌神の七界歯車', kana: 'こんとんしんのななかいはぐるま', world: 'abyss', icon: '🌀',
      desc: 'パーティ全体の与ダメ+16%・会心ダメ+24%・ドロップ品質+5。',
      sourceLabel: '超ボス「混沌神カオスギア」18万ダメ到達',
      mod: { dmgDealtPct: 0.16, critDmg: 0.24, dropQualityBonus: 5 }
    },
    {
      id: 'rel_12', name: '総力戦の大団旗', kana: 'そうりょくせんのだいだんき', world: 'wilds', icon: '🚩',
      desc: 'パーティ全体のHP+14%・攻撃+14%・開幕味方攻撃上昇1T。',
      sourceLabel: 'リレー総力戦「獣機激突」初制覇',
      mod: { hpPct: 0.14, atkPct: 0.14, allyStartAtkUp: 1 }
    }
  ];

  D.RELIC_BY_ID = {};
  D.RELICS.forEach(function (r) { D.RELIC_BY_ID[r.id] = r; });
})(typeof window !== 'undefined' ? window : globalThis);
