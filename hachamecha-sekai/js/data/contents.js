(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /* ==================== 1. 通常エリア：5エリア × 10ステージ ＝ 50ステージ ==================== */
  const AREA_THEMES = [
    {
      area: 1,
      name: 'ネオン商店街ディメンション',
      sub: 'サイバー路地と剣と魔法が交差する入口世界',
      color: '#ff5744',
      mobs: ['e_slime_bot', 'e_gob_punk', 'e_wind_drone', 'e_stray_cat'],
      boss: 'b_area1',
      sets: ['set_crimson', 'set_aegis'],
      shardPool: ['c_kagura', 'c_suiren', 'c_zephyr', 'c_lumina', 'c_piro'],
      matPool: ['mat_spark', 'mat_gear'],
      unlockForm: 'form_blitz'
    },
    {
      area: 2,
      name: '深海竜宮オービタル',
      sub: '海底神殿と宇宙エレベーターが直結する蒼界',
      color: '#2cb5ff',
      mobs: ['e_coral_guard', 'e_laser_squid', 'e_aqua_pixie', 'e_abyss_wyrm'],
      boss: 'b_area2',
      sets: ['set_gale', 'set_blossom'],
      shardPool: ['c_mizuchi', 'c_kurage', 'c_shizuku', 'c_homura'],
      matPool: ['mat_gear', 'mat_scale'],
      unlockForm: 'form_citadel'
    },
    {
      area: 3,
      name: '妖精遊園地・戦国要塞',
      sub: '天守閣に観覧車が回る極彩色の乱世パーク',
      color: '#35e58f',
      mobs: ['e_samurai_bear', 'e_clown_imp', 'e_ninja_bot', 'e_candy_witch'],
      boss: 'b_area3',
      sets: ['set_photon', 'set_vamp'],
      shardPool: ['c_garuda', 'c_bambo', 'c_aria', 'c_paladin'],
      matPool: ['mat_scale', 'mat_petal'],
      unlockForm: 'form_sanctuary'
    },
    {
      area: 4,
      name: '古代神殿サイバースペース',
      sub: '神々の石柱と電子回路が溶け合う光輝領域',
      color: '#ffd54a',
      mobs: ['e_valkyrie_ai', 'e_sphinx_cpu', 'e_virus_drake', 'e_oracle_bug'],
      boss: 'b_area4',
      sets: ['set_abyss', 'set_chrono'],
      shardPool: ['c_ray', 'c_lilith', 'c_dullahan', 'c_nyx'],
      matPool: ['mat_petal', 'mat_orb'],
      unlockForm: null
    },
    {
      area: 5,
      name: '万象交差点カオスコア',
      sub: 'あらゆる異世界が渦巻くはちゃめちゃ最深部',
      color: '#c084fc',
      mobs: ['e_chaos_knight', 'e_astral_titan', 'e_mirage_queen', 'e_genesis_angel'],
      boss: 'b_area5',
      sets: ['set_crimson', 'set_aegis', 'set_gale', 'set_photon', 'set_blossom', 'set_abyss', 'set_vamp', 'set_chrono'],
      shardPool: ['c_zero_mk', 'c_musashi', 'c_chronos', 'c_kagura', 'c_ray'],
      matPool: ['mat_orb', 'mat_core'],
      unlockForm: null
    }
  ];

  HW.AREAS = AREA_THEMES.map((a) => {
    const stages = [];
    for (let s = 1; s <= 10; s++) {
      const idx = (a.area - 1) * 10 + s;
      const scale = Number((0.72 + (idx - 1) * 0.085 + (s === 10 ? 0.16 : 0)).toFixed(2));
      const shardTarget = a.shardPool[(s - 1) % a.shardPool.length];
      stages.push({
        id: 'st_' + a.area + '_' + s,
        area: a.area,
        stageNum: s,
        code: a.area + '-' + s,
        name: a.area + '-' + s + (s === 10 ? ' エリア決戦' : s === 5 ? ' 中間関門' : ' 異界路'),
        waves: 5,
        scale: scale,
        mobs: a.mobs,
        bossId: a.boss,
        isAreaBoss: s === 10,
        equipSets: a.sets,
        shardCharId: shardTarget,
        matIds: a.matPool,
        goldBase: Math.round(120 + idx * 38),
        minQuality: Math.min(72, 18 + a.area * 9 + s),
        intruderChance: 0.035 // 通常エリア限定・WAVE1〜4での超低確率乱入
      });
    }
    return Object.assign({}, a, { stages: stages });
  });

  HW.getStageDef = function (stageId) {
    for (let i = 0; i < HW.AREAS.length; i++) {
      const found = HW.AREAS[i].stages.find((st) => st.id === stageId);
      if (found) return found;
    }
    return HW.AREAS[0].stages[0];
  };

  /* ==================== 2. 異界塔：100F式（塔Ⅰ, 塔Ⅱ…増設対応、各F初回報酬） ==================== */
  HW.TOWERS = [
    { id: 'tower_1', roman: 'Ⅰ', name: '異界塔Ⅰ・創世の螺旋', maxFloor: 100, baseScale: 1.0, stepScale: 0.055 },
    { id: 'tower_2', roman: 'Ⅱ', name: '異界塔Ⅱ・混沌の尖塔', maxFloor: 100, baseScale: 5.8, stepScale: 0.075 }
  ];

  HW.getTowerFloorDef = function (towerId, floor) {
    const tower = HW.TOWERS.find((t) => t.id === towerId) || HW.TOWERS[0];
    const f = Math.max(1, Math.min(tower.maxFloor, floor));
    const areaIdx = (Math.floor((f - 1) / 5) + (tower.id === 'tower_2' ? 2 : 0)) % HW.AREAS.length;
    const area = HW.AREAS[areaIdx];
    const isMilestone = f % 5 === 0;
    const scale = Number((tower.baseScale + (f - 1) * tower.stepScale + (isMilestone ? 0.25 : 0)).toFixed(2));
    const rewardOmni = isMilestone ? (f % 10 === 0 ? 15 : 8) : 2;
    const rewardGold = Math.round(300 + f * 65 * (tower.id === 'tower_2' ? 1.8 : 1));
    let unlockForm = null;
    if (tower.id === 'tower_1' && f === 10) unlockForm = 'form_dragon';
    if (tower.id === 'tower_1' && f === 25) unlockForm = 'form_hex';
    if (tower.id === 'tower_1' && f === 50) unlockForm = 'form_chaos';
    return {
      towerId: tower.id,
      roman: tower.roman,
      floor: f,
      name: '異界塔' + tower.roman + ' ' + f + 'F' + (isMilestone ? ' 守護階層' : ''),
      waves: isMilestone ? 3 : 2,
      scale: scale,
      mobs: area.mobs,
      bossId: area.boss,
      isMilestone: isMilestone,
      equipSets: area.sets,
      rewardOmni: rewardOmni,
      rewardGold: rewardGold,
      rewardMat: area.matPool[f % area.matPool.length],
      unlockForm: unlockForm,
      minQuality: Math.min(88, 45 + Math.floor(f * 0.4) + (tower.id === 'tower_2' ? 18 : 0))
    };
  };

  /* ==================== 3. 異界総力戦：6属性レイドボス（複数部隊リレー） ==================== */
  HW.RAIDS = [
    { id: 'raid_fire', enemyId: 'r_fire', element: 'fire', name: '紅蓮機神レイド', sub: '炎属性・火傷猛攻', scale: 1.15, matId: 'mat_scale', gold: 900, omni: 5, equipSet: 'set_crimson' },
    { id: 'raid_water', enemyId: 'r_water', element: 'water', name: '深淵海竜レイド', sub: '水属性・氷壁凍結', scale: 1.25, matId: 'mat_gear', gold: 1050, omni: 5, equipSet: 'set_aegis' },
    { id: 'raid_wind', enemyId: 'r_wind', element: 'wind', name: '暴風妖王レイド', sub: '風属性・超速見切', scale: 1.35, matId: 'mat_petal', gold: 1200, omni: 6, equipSet: 'set_gale' },
    { id: 'raid_light', enemyId: 'r_light', element: 'light', name: '審判天機レイド', sub: '光属性・修復光線', scale: 1.48, matId: 'mat_orb', gold: 1380, omni: 6, equipSet: 'set_photon' },
    { id: 'raid_dark', enemyId: 'r_dark', element: 'dark', name: '虚無魔皇帝レイド', sub: '闇属性・多重異常', scale: 1.62, matId: 'mat_core', gold: 1550, omni: 7, equipSet: 'set_abyss' },
    { id: 'raid_none', enemyId: 'r_none', element: 'none', name: '万象星竜レイド', sub: '無属性・総力決戦', scale: 1.80, matId: 'mat_core', gold: 1850, omni: 8, equipSet: 'set_chrono' }
  ];

  /* ==================== 4. 制約異界：属性・種族・ロール縛り 8試練 ==================== */
  HW.RESTRICTIONS = [
    {
      id: 'res_fire_water', name: '紅蒼の試練', ruleText: '炎・水属性のみ出撃可',
      check: (c) => c.element === 'fire' || c.element === 'water',
      areaIdx: 0, scale: 1.6, shardPool: ['c_kagura', 'c_piro', 'c_homura', 'c_suiren', 'c_mizuchi', 'c_kurage', 'c_shizuku'],
      matId: 'mat_spark', equipSets: ['set_crimson', 'set_aegis']
    },
    {
      id: 'res_wind_light', name: '翠光の試練', ruleText: '風・光属性のみ出撃可',
      check: (c) => c.element === 'wind' || c.element === 'light',
      areaIdx: 2, scale: 1.9, shardPool: ['c_zephyr', 'c_garuda', 'c_bambo', 'c_aria', 'c_lumina', 'c_paladin', 'c_ray'],
      matId: 'mat_petal', equipSets: ['set_gale', 'set_photon']
    },
    {
      id: 'res_dark_none', name: '虚無の試練', ruleText: '闇・無属性のみ出撃可',
      check: (c) => c.element === 'dark' || c.element === 'none',
      areaIdx: 3, scale: 2.2, shardPool: ['c_lilith', 'c_dullahan', 'c_nyx', 'c_zero_mk', 'c_musashi', 'c_chronos'],
      matId: 'mat_orb', equipSets: ['set_abyss', 'set_chrono']
    },
    {
      id: 'res_human_dragon', name: '人竜共闘の試練', ruleText: '人間または竜種族を含むキャラのみ',
      check: (c) => c.races.includes('human') || c.races.includes('dragon'),
      areaIdx: 1, scale: 2.0, shardPool: ['c_kagura', 'c_suiren', 'c_mizuchi', 'c_zephyr', 'c_aria', 'c_lumina', 'c_ray', 'c_lilith', 'c_musashi', 'c_chronos'],
      matId: 'mat_scale', equipSets: ['set_crimson', 'set_vamp']
    },
    {
      id: 'res_god_fairy', name: '神話妖精の試練', ruleText: '神または妖精種族を含むキャラのみ',
      check: (c) => c.races.includes('god') || c.races.includes('fairy'),
      areaIdx: 3, scale: 2.3, shardPool: ['c_piro', 'c_shizuku', 'c_zephyr', 'c_garuda', 'c_aria', 'c_lumina', 'c_nyx', 'c_chronos'],
      matId: 'mat_orb', equipSets: ['set_blossom', 'set_photon']
    },
    {
      id: 'res_monster_machine', name: '魔機融合の試練', ruleText: '魔物または機械種族を含むキャラのみ',
      check: (c) => c.races.includes('monster') || c.races.includes('machine'),
      areaIdx: 4, scale: 2.5, shardPool: ['c_piro', 'c_kurage', 'c_bambo', 'c_ray', 'c_lilith', 'c_dullahan', 'c_zero_mk'],
      matId: 'mat_gear', equipSets: ['set_aegis', 'set_abyss']
    },
    {
      id: 'res_beast', name: '百獣夜行の試練', ruleText: '獣種族を含むキャラのみ',
      check: (c) => c.races.includes('beast'),
      areaIdx: 2, scale: 2.1, shardPool: ['c_homura', 'c_garuda', 'c_bambo', 'c_paladin', 'c_musashi'],
      matId: 'mat_scale', equipSets: ['set_vamp', 'set_gale']
    },
    {
      id: 'res_no_healer', name: '背水無癒の試練', ruleText: 'ヒーラー編成不可（吸血・盾で攻略）',
      check: (c) => c.role !== 'healer',
      areaIdx: 4, scale: 2.7, shardPool: ['c_kagura', 'c_mizuchi', 'c_garuda', 'c_ray', 'c_musashi', 'c_chronos'],
      matId: 'mat_core', equipSets: ['set_vamp', 'set_chrono']
    }
  ];

  /* ==================== 5. 異界闘技場：順位変動制(100位→1位) AI4vs4完全生成 ==================== */
  const RIVAL_PREFIXES = ['紅蓮の', '蒼穹の', '疾風の', '閃光の', '漆黒の', '混沌の', '星屑の', '鉄壁の', '神速の', '伝説の'];
  const RIVAL_SUFFIXES = ['旅団', '討伐隊', '防衛軍', '特務班', '商会', '連合', '騎士団', '学園組', '電脳隊', '覇者組'];

  function seededRand(seed) {
    let x = seed >>> 0;
    return function () {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
  }

  HW.getArenaOpponent = function (rank) {
    const r = Math.max(1, Math.min(100, Math.round(rank)));
    const rng = seededRand(r * 7919 + 104729);
    const tier = 101 - r; // 1 (100位) -> 100 (1位)
    const star = Math.min(6, 1 + Math.floor(tier / 18));
    const charRank = Math.min(10, 1 + Math.floor(tier / 11));
    const qualityBase = Math.min(100, 35 + Math.floor(tier * 0.65));

    // ロールバランスまたは特色編成を決定
    const pool = HW.CHARACTERS.slice();
    const chosen = [];
    const roleWant = r % 3 === 0 ? ['tank', 'dealer', 'dealer', 'supporter'] : ['tank', 'dealer', 'supporter', 'healer'];
    roleWant.forEach((role) => {
      const cands = pool.filter((c) => c.role === role && !chosen.includes(c));
      const pick = cands[Math.floor(rng() * cands.length)] || pool[Math.floor(rng() * pool.length)];
      if (pick && !chosen.includes(pick)) chosen.push(pick);
    });
    while (chosen.length < 4) {
      const pick = pool[Math.floor(rng() * pool.length)];
      if (!chosen.includes(pick)) chosen.push(pick);
    }

    const form = HW.FORMATIONS[Math.floor(rng() * HW.FORMATIONS.length)];
    const allSets = HW.EQUIP_SETS;

    const members = chosen.map((c) => {
      const setA = allSets[Math.floor(rng() * (r <= 25 ? allSets.length : 8))];
      const setB = rng() > 0.5 ? setA : allSets[Math.floor(rng() * 8)];
      const equips = {
        weapon: { tplId: setA.id + '_weapon', quality: Math.min(100, qualityBase + Math.floor(rng() * 12)) },
        armor: { tplId: setA.id + '_armor', quality: Math.min(100, qualityBase + Math.floor(rng() * 12)) },
        accessory: { tplId: setB.id + '_accessory', quality: Math.min(100, qualityBase + Math.floor(rng() * 12)) },
        core: { tplId: setB.id + '_core', quality: Math.min(100, qualityBase + Math.floor(rng() * 12)) }
      };
      const unlockedTiers = Math.min(5, 1 + Math.floor(tier / 20));
      const abilities = [];
      for (let t = 0; t < 5; t++) {
        abilities.push(t < unlockedTiers ? Math.floor(rng() * 5) : -1);
      }
      return {
        charId: c.id,
        star: star,
        rank: charRank,
        rankSlots: [true, true, true, false, false, false],
        favoriteUnlocked: star >= 4,
        relicUnlocked: star >= 5,
        masteryCount: Math.floor(tier / 12),
        abilities: abilities,
        equips: equips
      };
    });

    const teamName =
      r === 1
        ? '異界頂点・万象覇王隊'
        : RIVAL_PREFIXES[r % RIVAL_PREFIXES.length] + RIVAL_SUFFIXES[Math.floor(r / 7) % RIVAL_SUFFIXES.length];

    return {
      rank: r,
      teamName: teamName,
      formationId: form.id,
      members: members,
      medalReward: Math.round(28 + tier * 1.4),
      goldReward: Math.round(240 + tier * 22)
    };
  };

  /* ==================== 6. 探索派遣（余剰キャラ自由派遣・オフライン＋勝利連動） ==================== */
  HW.DISPATCH_MISSIONS = [
    {
      id: 'disp_shard', name: '欠片発掘ルート', sub: '派遣キャラ自身の欠片＆万能欠片を回収',
      durationSec: 180, battleCutSec: 30, slots: 4,
      rewards: { gold: 320, omni: 4, selfShards: 4, matId: 'mat_spark', matCount: 3 }
    },
    {
      id: 'disp_rank', name: '階位パーツ採取路', sub: 'RANK昇格用の各種階位素材を大量回収',
      durationSec: 240, battleCutSec: 35, slots: 4,
      rewards: { gold: 450, omni: 3, selfShards: 2, matAll: 2 }
    },
    {
      id: 'disp_equip', name: '秘宝品質探索行', sub: '高品質寄り(60%〜100%)の装備を複数持ち帰る',
      durationSec: 300, battleCutSec: 40, slots: 4,
      rewards: { gold: 520, omni: 3, selfShards: 2, equipCount: 2, minQuality: 62 }
    },
    {
      id: 'disp_arena', name: '闘技場偵察任務', sub: '闘技場メダルと万能欠片をじっくり回収',
      durationSec: 360, battleCutSec: 45, slots: 4,
      rewards: { gold: 600, omni: 5, selfShards: 2, medal: 35 }
    }
  ];

  /* ==================== 7. 交換所（闘技場メダル限定＆通貨交換） ==================== */
  HW.SHOP_ITEMS = [
    // 闘技場メダル限定キャラ（欠片10個ずつ交換／30個で解放）
    { id: 'sh_ignis', currency: 'medal', cost: 160, kind: 'shard', charId: 'c_ignis_rex', amount: 10, name: 'バルカノスの欠片×10', tag: '闘技場限定' },
    { id: 'sh_sol', currency: 'medal', cost: 160, kind: 'shard', charId: 'c_sol_knight', amount: 10, name: 'アポロン零の欠片×10', tag: '闘技場限定' },
    { id: 'sh_noctis', currency: 'medal', cost: 160, kind: 'shard', charId: 'c_noctis', amount: 10, name: 'ノクティスの欠片×10', tag: '闘技場限定' },
    { id: 'sh_mille', currency: 'medal', cost: 160, kind: 'shard', charId: 'c_mille', amount: 10, name: 'ミルフィーの欠片×10', tag: '闘技場限定' },
    // 闘技場メダル限定装備セット（品質70〜100%で抽選！）
    { id: 'sh_eq_glad', currency: 'medal', cost: 120, kind: 'equipSet', setId: 'set_gladiator', minQuality: 72, name: '覇王闘神装備BOX', tag: '闘技場限定' },
    { id: 'sh_eq_para', currency: 'medal', cost: 120, kind: 'equipSet', setId: 'set_paradox', minQuality: 72, name: '万象混沌装備BOX', tag: '闘技場限定' },
    // 万能欠片＆階位素材（ゴールド・メダル両対応）
    { id: 'sh_omni_m', currency: 'medal', cost: 80, kind: 'omni', amount: 10, name: '万能欠片×10', tag: '育成' },
    { id: 'sh_omni_g', currency: 'gold', cost: 1500, kind: 'omni', amount: 5, name: '万能欠片×5', tag: '育成' },
    { id: 'sh_mats_g', currency: 'gold', cost: 1200, kind: 'matPack', amount: 3, name: '全階位素材セット×3', tag: 'RANK' }
  ];
})();
