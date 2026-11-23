(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  const ENEMY_TEMPLATES = {
    slime_f:   { name: "爆熱スライム",   element: "fire",  races: ["demon"],            role: "dealer",    hp: 420,  atk: 78,  def: 36, spd: 94 },
    knight_f:  { name: "焦熱鉄兵",       element: "fire",  races: ["human", "machine"], role: "tank",      hp: 620,  atk: 72,  def: 62, spd: 86 },
    drake_f:   { name: "紅蓮ワイバーン", element: "fire",  races: ["dragon"],           role: "dealer",    hp: 760,  atk: 112, def: 52, spd: 106, boss: true },
    jelly_w:   { name: "渦潮クラゲ",     element: "water", races: ["fairy"],            role: "healer",    hp: 460,  atk: 74,  def: 44, spd: 100 },
    golem_w:   { name: "氷晶ゴーレム",   element: "water", races: ["machine"],          role: "tank",      hp: 700,  atk: 82,  def: 76, spd: 82 },
    levi_w:    { name: "深海魔竜",       element: "water", races: ["dragon", "demon"],  role: "dealer",    hp: 940,  atk: 128, def: 64, spd: 108, boss: true },
    imp_g:     { name: "旋風グレムリン", element: "wind",  races: ["demon", "fairy"],   role: "supporter", hp: 480,  atk: 88,  def: 42, spd: 118 },
    drone_g:   { name: "暴風ドローン",   element: "wind",  races: ["machine"],          role: "dealer",    hp: 540,  atk: 102, def: 56, spd: 116 },
    roc_g:     { name: "翠嵐怪鳥",       element: "wind",  races: ["dragon", "fairy"],  role: "dealer",    hp: 1050, atk: 142, def: 68, spd: 124, boss: true },
    paladin_l: { name: "白光巡察機",     element: "light", races: ["human", "machine"], role: "tank",      hp: 840,  atk: 108, def: 88, spd: 98 },
    angel_l:   { name: "閃光熾天使",     element: "light", races: ["fairy"],            role: "healer",    hp: 680,  atk: 116, def: 62, spd: 114 },
    sol_l:     { name: "聖陽オーバーロード", element: "light", races: ["dragon"],       role: "dealer",    hp: 1320, atk: 162, def: 82, spd: 116, boss: true },
    shade_d:   { name: "虚影アサシン",   element: "dark",  races: ["human", "demon"],   role: "dealer",    hp: 640,  atk: 136, def: 54, spd: 122 },
    cursed_d:  { name: "呪術道化師",     element: "dark",  races: ["demon", "fairy"],   role: "supporter", hp: 720,  atk: 124, def: 60, spd: 116 },
    abyss_d:   { name: "漆黒混沌皇",     element: "dark",  races: ["demon", "machine"], role: "dealer",    hp: 1580, atk: 184, def: 96, spd: 114, boss: true },
    glitch_n:  { name: "無律の断片",     element: "none",  races: ["machine"],          role: "supporter", hp: 780,  atk: 132, def: 78, spd: 116 },
    omega_n:   { name: "はちゃめちゃ創造核", element: "none", races: ["dragon", "machine"], role: "dealer", hp: 2050, atk: 215, def: 108, spd: 120, boss: true }
  };

  // Build 25 main journey stages (5 areas x 5 stages)
  const AREA_NAMES = [
    { area: 1, name: "第1域：灼熱スクランブル", el: "fire",  pool: ["slime_f", "knight_f", "imp_g"], boss: "drake_f" },
    { area: 2, name: "第2域：蒼海メイル渦",     el: "water", pool: ["jelly_w", "golem_w", "slime_f"], boss: "levi_w" },
    { area: 3, name: "第3域：暴風ギア天空",     el: "wind",  pool: ["imp_g", "drone_g", "jelly_w"], boss: "roc_g" },
    { area: 4, name: "第4域：光闇パラドクス",   el: "light", pool: ["paladin_l", "angel_l", "shade_d", "cursed_d"], boss: "sol_l" },
    { area: 5, name: "第5域：はちゃめちゃ中枢", el: "none",  pool: ["shade_d", "cursed_d", "glitch_n", "paladin_l"], boss: "omega_n" }
  ];

  const JOURNEY_STAGES = [];
  AREA_NAMES.forEach((a) => {
    for (let s = 1; s <= 5; s++) {
      const idx = (a.area - 1) * 5 + s;
      const isBoss = s === 5;
      const scale = Number((0.72 + idx * 0.22 + (isBoss ? 0.28 : 0)).toFixed(2));
      const waves = [];
      const waveCount = isBoss ? 3 : 2;
      for (let w = 0; w < waveCount; w++) {
        if (w === waveCount - 1 && isBoss) {
          waves.push([a.pool[0], a.boss, a.pool[1], a.pool[a.pool.length - 1]]);
        } else {
          const count = w === 0 ? 3 : 4;
          const arr = [];
          for (let k = 0; k < count; k++) {
            arr.push(a.pool[(idx + w + k) % a.pool.length]);
          }
          waves.push(arr);
        }
      }
      JOURNEY_STAGES.push({
        id: "j_" + a.area + "_" + s,
        mode: "journey",
        area: a.area,
        areaName: a.name,
        order: idx,
        name: a.area + "-" + s + (isBoss ? " 【領域ボス】" : " 混沌戦線"),
        element: a.el,
        scale,
        recPower: Math.round(900 + idx * 420 + (isBoss ? 500 : 0)),
        waves,
        fixedLaw: isBoss ? HS.CONST.CHAOS_LAWS[(a.area - 1) % HS.CONST.CHAOS_LAWS.length].id : null,
        rewards: {
          gold: Math.round(140 + idx * 75 + (isBoss ? 220 : 0)),
          exp: Math.round(60 + idx * 34 + (isBoss ? 90 : 0)),
          crystal: isBoss ? 14 + a.area * 4 : 3 + Math.floor(idx / 3),
          core: isBoss ? 2 + Math.floor(a.area / 2) : (idx >= 8 ? 1 : 0),
          equipCount: isBoss ? 2 : 1,
          minTier: Math.min(4, Math.floor((idx - 1) / 6))
        }
      });
    }
  });

  // Trial stages (Dedicated weapon core farming & element/race strategy bosses)
  const TRIAL_STAGES = [
    {
      id: "t_fire", mode: "trial", name: "異端試練・紅蓮の竜巣", element: "fire", scale: 2.1, recPower: 3200,
      fixedLaw: "elem_surge",
      waves: [["knight_f", "drake_f", "slime_f"], ["knight_f", "drake_f", "drake_f", "knight_f"]],
      rewards: { gold: 650, exp: 260, crystal: 14, core: 4, equipCount: 2, minTier: 1 }
    },
    {
      id: "t_water", mode: "trial", name: "異端試練・氷海の深淵", element: "water", scale: 2.5, recPower: 4200,
      fixedLaw: "reverse_hp",
      waves: [["golem_w", "jelly_w", "levi_w"], ["golem_w", "levi_w", "jelly_w", "golem_w"]],
      rewards: { gold: 820, exp: 320, crystal: 16, core: 5, equipCount: 2, minTier: 2 }
    },
    {
      id: "t_wind", mode: "trial", name: "異端試練・狂風の歯車", element: "wind", scale: 3.0, recPower: 5400,
      fixedLaw: "overdrive",
      waves: [["drone_g", "imp_g", "roc_g"], ["imp_g", "roc_g", "drone_g", "roc_g"]],
      rewards: { gold: 1050, exp: 400, crystal: 20, core: 6, equipCount: 2, minTier: 2 }
    },
    {
      id: "t_ld", mode: "trial", name: "異端試練・光闇双極界", element: "dark", scale: 3.8, recPower: 7200,
      fixedLaw: "crit_storm",
      waves: [["paladin_l", "angel_l", "shade_d", "cursed_d"], ["sol_l", "abyss_d", "angel_l", "cursed_d"]],
      rewards: { gold: 1450, exp: 520, crystal: 26, core: 8, equipCount: 3, minTier: 3 }
    },
    {
      id: "t_chaos", mode: "trial", name: "異端試練・無律創造核", element: "none", scale: 4.8, recPower: 9800,
      fixedLaw: "glass_war",
      waves: [["glitch_n", "sol_l", "abyss_d"], ["glitch_n", "omega_n", "abyss_d", "sol_l"]],
      rewards: { gold: 2100, exp: 720, crystal: 36, core: 11, equipCount: 3, minTier: 3 }
    }
  ];

  // Boss Rush stages (High-yield equipment hack-and-slash farming)
  const RUSH_STAGES = [
    {
      id: "r_1", mode: "rush", name: "カオス乱闘・初級三連星", element: "fire", scale: 1.75, recPower: 2500,
      fixedLaw: "meteor",
      waves: [["slime_f", "drake_f", "slime_f"], ["jelly_w", "levi_w", "jelly_w"], ["imp_g", "roc_g", "imp_g"]],
      rewards: { gold: 780, exp: 280, crystal: 12, core: 2, equipCount: 4, minTier: 1 }
    },
    {
      id: "r_2", mode: "rush", name: "カオス乱闘・上級五連王", element: "dark", scale: 3.1, recPower: 5800,
      fixedLaw: "vamp_feast",
      waves: [
        ["drake_f", "levi_w", "knight_f"],
        ["roc_g", "drone_g", "imp_g"],
        ["sol_l", "paladin_l", "angel_l"],
        ["abyss_d", "shade_d", "cursed_d"]
      ],
      rewards: { gold: 1650, exp: 560, crystal: 24, core: 5, equipCount: 6, minTier: 2 }
    },
    {
      id: "r_3", mode: "rush", name: "カオス乱闘・極限無限祭", element: "none", scale: 4.6, recPower: 9400,
      fixedLaw: "overdrive",
      waves: [
        ["drake_f", "levi_w", "roc_g", "glitch_n"],
        ["sol_l", "abyss_d", "angel_l", "cursed_d"],
        ["omega_n", "sol_l", "abyss_d", "omega_n"]
      ],
      rewards: { gold: 2800, exp: 920, crystal: 38, core: 8, equipCount: 8, minTier: 3 }
    }
  ];

  // Dynamic Infinite Abyss Tower generator (1F to Infinity)
  function buildAbyssStage(floor) {
    const f = Math.max(1, Math.floor(floor));
    const keys = Object.keys(ENEMY_TEMPLATES);
    const bossKeys = keys.filter((k) => ENEMY_TEMPLATES[k].boss);
    const mobKeys = keys.filter((k) => !ENEMY_TEMPLATES[k].boss);
    const isBossFloor = f % 5 === 0;
    const scale = Number((1.05 + f * 0.28 + Math.pow(f, 1.18) * 0.06).toFixed(2));
    const w1 = [
      mobKeys[(f * 3) % mobKeys.length],
      mobKeys[(f * 5 + 1) % mobKeys.length],
      mobKeys[(f * 7 + 2) % mobKeys.length],
      mobKeys[(f * 2 + 3) % mobKeys.length]
    ];
    const w2 = isBossFloor
      ? [
          mobKeys[f % mobKeys.length],
          bossKeys[(f / 5 - 1) % bossKeys.length],
          bossKeys[(f / 5) % bossKeys.length],
          mobKeys[(f + 3) % mobKeys.length]
        ]
      : [
          mobKeys[(f + 1) % mobKeys.length],
          bossKeys[f % bossKeys.length],
          mobKeys[(f + 4) % mobKeys.length],
          mobKeys[(f + 6) % mobKeys.length]
        ];
    const law = HS.CONST.CHAOS_LAWS[(f - 1) % HS.CONST.CHAOS_LAWS.length];
    return {
      id: "abyss_" + f,
      mode: "abyss",
      floor: f,
      name: "カオス深淵 " + f + "F" + (isBossFloor ? " 【階層主】" : ""),
      element: ENEMY_TEMPLATES[w2[1]].element,
      scale,
      recPower: Math.round(1400 + f * 620 + (isBossFloor ? 800 : 0)),
      fixedLaw: law.id,
      waves: [w1, w2],
      rewards: {
        gold: Math.round(280 + f * 120 + (isBossFloor ? 450 : 0)),
        exp: Math.round(110 + f * 48),
        crystal: 8 + Math.floor(f * 1.4) + (isBossFloor ? 12 : 0),
        core: isBossFloor ? 3 + Math.floor(f / 5) : (f >= 3 ? 1 : 0),
        equipCount: isBossFloor ? 4 : 2,
        minTier: Math.min(4, Math.floor(f / 7))
      }
    };
  }

  function getStageById(id) {
    if (String(id).startsWith("abyss_")) {
      return buildAbyssStage(Number(String(id).replace("abyss_", "")) || 1);
    }
    return (
      JOURNEY_STAGES.find((s) => s.id === id) ||
      TRIAL_STAGES.find((s) => s.id === id) ||
      RUSH_STAGES.find((s) => s.id === id) ||
      JOURNEY_STAGES[0]
    );
  }

  HS.STAGES = {
    ENEMY_TEMPLATES,
    JOURNEY: JOURNEY_STAGES,
    TRIAL: TRIAL_STAGES,
    RUSH: RUSH_STAGES,
    buildAbyssStage,
    getStageById
  };
})(window);
