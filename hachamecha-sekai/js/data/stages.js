/* ==========================================================================
   stages.js - 冒険20ステージ・属性ボス6体・異界塔(1〜100F)・5WAVE生成・敵図鑑
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});
  const TOTAL_WAVES = 5;
  const TOWER_MAX_FLOOR = 100;

  const WORLDS = [
    { id: 1, name: '崩壊商店街',       attr: 'fire' },
    { id: 2, name: '逆さま竜の巣',     attr: 'water' },
    { id: 3, name: '歯車妖精工場',     attr: 'wind' },
    { id: 4, name: '虚無ネオン神殿',   attr: 'light' },
    { id: 5, name: 'はちゃめちゃ特異点', attr: 'dark' }
  ];

  function mkEnemy(name, attr, role, hp, atk, def, spd, isBoss) {
    return { name, attr, role, hp, atk, def, spd, isBoss: !!isBoss };
  }

  const STORY_STAGES = [
    // World 1: 崩壊商店街
    {
      id: 'w1-1', mode: 'story', world: 1, code: '1-1', name: '暴走自販機通り', recPower: 1400,
      attr: 'wind', gold: 180, exp: 95, shards: 3, coreChance: 0.08, unlockUnit: 'homura',
      enemies: [
        mkEnemy('暴走自販機', 'wind', 'tank', 420, 44, 18, 86),
        mkEnemy('野良スライム缶', 'fire', 'dealer', 320, 52, 12, 95)
      ]
    },
    {
      id: 'w1-2', mode: 'story', world: 1, code: '1-2', name: '空飛ぶコロッケ広場', recPower: 1850,
      attr: 'fire', gold: 240, exp: 130, shards: 4, coreChance: 0.10, unlockUnit: 'mechako',
      enemies: [
        mkEnemy('熱々コロッケ兵', 'fire', 'dealer', 480, 58, 18, 96),
        mkEnemy('油ハネ小鬼', 'fire', 'supporter', 410, 50, 16, 102),
        mkEnemy('鉄板ガード', 'water', 'tank', 580, 46, 26, 84)
      ]
    },
    {
      id: 'w1-3', mode: 'story', world: 1, code: '1-3', name: 'シャッター迷宮', recPower: 2400,
      attr: 'wind', gold: 310, exp: 170, shards: 5, coreChance: 0.14, unlockUnit: 'rex',
      enemies: [
        mkEnemy('回転シャッター', 'wind', 'tank', 760, 56, 30, 88),
        mkEnemy('突風チラシ魔', 'wind', 'dealer', 540, 72, 18, 108),
        mkEnemy('迷子ドローン', 'light', 'healer', 520, 55, 22, 100)
      ]
    },
    {
      id: 'w1-4', mode: 'story', world: 1, code: '1-4', name: '特売タイムの覇王', recPower: 3200,
      attr: 'dark', gold: 440, exp: 230, shards: 6, coreChance: 0.22, unlockUnit: 'crow',
      enemies: [
        mkEnemy('闇の割引シール', 'dark', 'supporter', 620, 68, 24, 106),
        mkEnemy('特売覇王ゴブリン', 'fire', 'dealer', 1480, 92, 34, 102, true),
        mkEnemy('カゴ持ち番犬', 'water', 'tank', 720, 62, 32, 92)
      ]
    },

    // World 2: 逆さま竜の巣
    {
      id: 'w2-1', mode: 'story', world: 2, code: '2-1', name: '天井の滝つぼ', recPower: 4100,
      attr: 'water', gold: 560, exp: 310, shards: 6, coreChance: 0.22,
      enemies: [
        mkEnemy('逆流ウナギ', 'water', 'dealer', 920, 98, 32, 108),
        mkEnemy('泡まみれ幼竜', 'water', 'tank', 1240, 84, 46, 94),
        mkEnemy('霧吹きインプ', 'wind', 'healer', 860, 80, 32, 106)
      ]
    },
    {
      id: 'w2-2', mode: 'story', world: 2, code: '2-2', name: 'さかさま鱗回廊', recPower: 5100,
      attr: 'water', gold: 690, exp: 390, shards: 7, coreChance: 0.25, unlockUnit: 'val',
      enemies: [
        mkEnemy('水鏡の竜衛', 'water', 'tank', 1620, 98, 56, 94),
        mkEnemy('氷牙ワイバーン', 'water', 'dealer', 1220, 124, 38, 114),
        mkEnemy('氷牙ワイバーン', 'fire', 'dealer', 1180, 120, 38, 112)
      ]
    },
    {
      id: 'w2-3', mode: 'story', world: 2, code: '2-3', name: '湯けむり竜温泉', recPower: 6300,
      attr: 'fire', gold: 840, exp: 480, shards: 8, coreChance: 0.28, unlockUnit: 'azami',
      enemies: [
        mkEnemy('硫黄スライム', 'fire', 'healer', 1400, 110, 44, 108),
        mkEnemy('のぼせ火竜', 'fire', 'dealer', 1680, 146, 48, 114),
        mkEnemy('温泉タマゴ兵', 'null', 'supporter', 1420, 118, 48, 118)
      ]
    },
    {
      id: 'w2-4', mode: 'story', world: 2, code: '2-4', name: '逆転海竜王の間', recPower: 7800,
      attr: 'water', gold: 1120, exp: 620, shards: 10, coreChance: 0.38, unlockUnit: 'gearmaru',
      enemies: [
        mkEnemy('深海タレット', 'water', 'dealer', 1600, 152, 54, 114),
        mkEnemy('逆転海竜リヴァイア', 'water', 'tank', 3850, 178, 72, 108, true),
        mkEnemy('泡沫ヒーラー魚', 'water', 'healer', 1550, 130, 50, 110)
      ]
    },

    // World 3: 歯車妖精工場
    {
      id: 'w3-1', mode: 'story', world: 3, code: '3-1', name: '暴走ベルトコンベア', recPower: 9400,
      attr: 'wind', gold: 1320, exp: 760, shards: 10, coreChance: 0.38, unlockUnit: 'mare',
      enemies: [
        mkEnemy('ネジ巻き妖精', 'wind', 'supporter', 1950, 168, 60, 126),
        mkEnemy('プレス機ゴーレム', 'wind', 'tank', 2800, 160, 86, 96),
        mkEnemy('火花スパーク', 'fire', 'dealer', 2050, 196, 58, 122)
      ]
    },
    {
      id: 'w3-2', mode: 'story', world: 3, code: '3-2', name: '風力タービン塔', recPower: 11200,
      attr: 'wind', gold: 1580, exp: 910, shards: 11, coreChance: 0.42, unlockUnit: 'zephyra',
      enemies: [
        mkEnemy('プロペラ精霊', 'wind', 'healer', 2350, 178, 66, 122),
        mkEnemy('疾風カッター機', 'wind', 'dealer', 2550, 224, 68, 132),
        mkEnemy('疾風カッター機', 'wind', 'dealer', 2550, 224, 68, 128)
      ]
    },
    {
      id: 'w3-3', mode: 'story', world: 3, code: '3-3', name: 'ぜんまい時計庫', recPower: 13500,
      attr: 'light', gold: 1880, exp: 1100, shards: 12, coreChance: 0.46,
      enemies: [
        mkEnemy('秒針ナイト', 'light', 'dealer', 2950, 248, 78, 130),
        mkEnemy('振り子ガード', 'light', 'tank', 3950, 198, 108, 102),
        mkEnemy('悪戯クロック精', 'dark', 'supporter', 2700, 210, 72, 134)
      ]
    },
    {
      id: 'w3-4', mode: 'story', world: 3, code: '3-4', name: '大工場長ギアフェアリー', recPower: 16200,
      attr: 'wind', gold: 2350, exp: 1380, shards: 14, coreChance: 0.56, unlockUnit: 'solaris',
      enemies: [
        mkEnemy('補助ドローンA', 'light', 'healer', 2950, 224, 82, 122),
        mkEnemy('大工場長ギアフェアリー', 'wind', 'dealer', 7400, 296, 105, 128, true),
        mkEnemy('補助ドローンB', 'wind', 'supporter', 2850, 235, 82, 134)
      ]
    },

    // World 4: 虚無ネオン神殿
    {
      id: 'w4-1', mode: 'story', world: 4, code: '4-1', name: 'ネオン鳥居の参道', recPower: 19500,
      attr: 'light', gold: 2800, exp: 1680, shards: 14, coreChance: 0.58,
      enemies: [
        mkEnemy('蛍光キツネ', 'light', 'dealer', 3900, 320, 96, 134),
        mkEnemy('レーザー狛犬', 'light', 'tank', 5200, 275, 132, 108),
        mkEnemy('影ネオン巫女', 'dark', 'healer', 3850, 290, 96, 126)
      ]
    },
    {
      id: 'w4-2', mode: 'story', world: 4, code: '4-2', name: 'ホログラム祭壇', recPower: 23200,
      attr: 'light', gold: 3350, exp: 2040, shards: 15, coreChance: 0.62, unlockUnit: 'aurora',
      enemies: [
        mkEnemy('残像パラディン', 'light', 'tank', 6100, 315, 152, 112),
        mkEnemy('光子スナイパー', 'light', 'dealer', 4450, 375, 105, 138),
        mkEnemy('虚無プリズム', 'null', 'supporter', 4600, 330, 116, 134)
      ]
    },
    {
      id: 'w4-3', mode: 'story', world: 4, code: '4-3', name: '反転モザイク回廊', recPower: 27800,
      attr: 'dark', gold: 4050, exp: 2480, shards: 16, coreChance: 0.66,
      enemies: [
        mkEnemy('ノイズドラゴン', 'dark', 'dealer', 5800, 425, 126, 132),
        mkEnemy('バグヒーラー', 'dark', 'healer', 5100, 355, 118, 128),
        mkEnemy('グリッチナイト', 'fire', 'tank', 7100, 360, 166, 114)
      ]
    },
    {
      id: 'w4-4', mode: 'story', world: 4, code: '4-4', name: '神殿主ネオンセラフ', recPower: 33500,
      attr: 'light', gold: 5100, exp: 3100, shards: 18, coreChance: 0.78, unlockUnit: 'mikoto',
      enemies: [
        mkEnemy('光翼タレット', 'light', 'supporter', 5800, 410, 134, 138),
        mkEnemy('ネオンセラフΩ', 'light', 'dealer', 14800, 510, 168, 134, true),
        mkEnemy('闇翼タレット', 'dark', 'dealer', 5900, 460, 128, 136)
      ]
    },

    // World 5: はちゃめちゃ特異点
    {
      id: 'w5-1', mode: 'story', world: 5, code: '5-1', name: '重力が横向きな坂', recPower: 40500,
      attr: 'dark', gold: 6100, exp: 3800, shards: 18, coreChance: 0.80,
      enemies: [
        mkEnemy('横倒しゴーレム', 'dark', 'tank', 9800, 495, 215, 116),
        mkEnemy('カオス流星群', 'fire', 'dealer', 7600, 585, 155, 142),
        mkEnemy('逆再生妖精', 'wind', 'healer', 7400, 490, 160, 136)
      ]
    },
    {
      id: 'w5-2', mode: 'story', world: 5, code: '5-2', name: '時空パスタ広場', recPower: 49000,
      attr: 'null', gold: 7400, exp: 4650, shards: 20, coreChance: 0.85,
      enemies: [
        mkEnemy('次元フォーク兵', 'null', 'dealer', 9200, 660, 188, 144),
        mkEnemy('渦巻ドラゴン', 'water', 'tank', 12400, 560, 250, 122),
        mkEnemy('混沌ソース精', 'dark', 'supporter', 8800, 580, 185, 146)
      ]
    },
    {
      id: 'w5-3', mode: 'story', world: 5, code: '5-3', name: '無限ループ交差点', recPower: 59000,
      attr: 'dark', gold: 9000, exp: 5700, shards: 22, coreChance: 0.90,
      enemies: [
        mkEnemy('赤信号タイタン', 'fire', 'tank', 14800, 680, 290, 124),
        mkEnemy('青信号アサシン', 'water', 'dealer', 11200, 790, 210, 152),
        mkEnemy('黄信号クロック', 'light', 'supporter', 10800, 690, 220, 150)
      ]
    },
    {
      id: 'w5-4', mode: 'story', world: 5, code: '5-4', name: 'はちゃめちゃ大帝', recPower: 72000,
      attr: 'null', gold: 12000, exp: 7500, shards: 26, coreChance: 1.0, unlockUnit: 'zeroone',
      enemies: [
        mkEnemy('混沌の右手', 'fire', 'dealer', 13500, 820, 240, 144),
        mkEnemy('はちゃめちゃ大帝', 'null', 'dealer', 31000, 960, 310, 140, true),
        mkEnemy('秩序の左手', 'light', 'healer', 13200, 740, 260, 138)
      ]
    }
  ];

  const BOSS_STAGES = [
    {
      id: 'boss-fire', mode: 'boss', code: '炎獄', name: '灼熱釜の大魔王', recPower: 5500,
      attr: 'fire', gold: 1200, exp: 650, shards: 12, coreChance: 1.0, coreCount: 2, rarityBias: 1.2, unlockUnit: 'igna',
      enemies: [
        mkEnemy('火の玉子分', 'fire', 'supporter', 1100, 110, 38, 114),
        mkEnemy('灼熱釜の大魔王', 'fire', 'dealer', 4200, 175, 62, 112, true)
      ]
    },
    {
      id: 'boss-water', mode: 'boss', code: '深海', name: '渦潮クラーケン帝', recPower: 11500,
      attr: 'water', gold: 2200, exp: 1200, shards: 16, coreChance: 1.0, coreCount: 3, rarityBias: 1.6, unlockUnit: 'mio',
      enemies: [
        mkEnemy('大触手A', 'water', 'tank', 2900, 185, 86, 102),
        mkEnemy('渦潮クラーケン帝', 'water', 'dealer', 8600, 275, 98, 118, true),
        mkEnemy('大触手B', 'water', 'healer', 2600, 195, 76, 114)
      ]
    },
    {
      id: 'boss-wind', mode: 'boss', code: '暴風', name: '音速タイフーン竜', recPower: 18500,
      attr: 'wind', gold: 3400, exp: 1900, shards: 18, coreChance: 1.0, coreCount: 4, rarityBias: 2.0,
      enemies: [
        mkEnemy('竜巻ウィング', 'wind', 'supporter', 4100, 280, 96, 136),
        mkEnemy('音速タイフーン竜', 'wind', 'dealer', 13800, 395, 128, 138, true)
      ]
    },
    {
      id: 'boss-light', mode: 'boss', code: '閃光', name: '万華鏡ソーラー機神', recPower: 28000,
      attr: 'light', gold: 4900, exp: 2850, shards: 22, coreChance: 1.0, coreCount: 5, rarityBias: 2.5, unlockUnit: 'luminous',
      enemies: [
        mkEnemy('プリズム盾', 'light', 'tank', 7200, 370, 180, 116),
        mkEnemy('万華鏡ソーラー機神', 'light', 'dealer', 20500, 520, 175, 136, true),
        mkEnemy('回復コア', 'light', 'healer', 6200, 380, 148, 128)
      ]
    },
    {
      id: 'boss-dark', mode: 'boss', code: '深闇', name: '終焉イーター・ゼロ', recPower: 42000,
      attr: 'dark', gold: 7200, exp: 4300, shards: 26, coreChance: 1.0, coreCount: 6, rarityBias: 3.1, unlockUnit: 'nox',
      enemies: [
        mkEnemy('影の従者', 'dark', 'supporter', 9400, 560, 190, 142),
        mkEnemy('終焉イーター・ゼロ', 'dark', 'dealer', 31000, 740, 240, 142, true),
        mkEnemy('呪いの従者', 'dark', 'dealer', 9600, 640, 185, 140)
      ]
    },
    {
      id: 'boss-null', mode: 'boss', code: '混沌', name: '真・はちゃめちゃ創世機', recPower: 68000,
      attr: 'null', gold: 12500, exp: 7800, shards: 34, coreChance: 1.0, coreCount: 9, rarityBias: 4.0,
      enemies: [
        mkEnemy('混沌ビットα', 'fire', 'dealer', 14000, 820, 250, 146),
        mkEnemy('真・はちゃめちゃ創世機', 'null', 'dealer', 48000, 1080, 340, 148, true),
        mkEnemy('混沌ビットβ', 'water', 'healer', 14000, 760, 260, 142)
      ]
    }
  ];

  function buildTowerStage(floor) {
    const f = Math.max(1, Math.min(TOWER_MAX_FLOOR, Math.floor(floor || 1)));
    const scale = Math.pow(1.042, f - 1) * (1 + (f - 1) * 0.006);
    const attrs = ['fire', 'water', 'wind', 'light', 'dark', 'null'];
    const mainAttr = attrs[(f - 1) % attrs.length];
    const isFinalFloor = f === TOWER_MAX_FLOOR;
    const isBossFloor = f % 5 === 0;
    const baseHp = Math.round(720 * scale);
    const baseAtk = Math.round(68 * scale);
    const baseDef = Math.round(26 * scale);
    const baseSpd = Math.min(185, 96 + Math.floor(f * 0.9));

    const enemies = isFinalFloor
      ? [
          mkEnemy('異界の守護機', 'light', 'tank', Math.round(baseHp * 1.25), Math.round(baseAtk * 0.95), Math.round(baseDef * 1.3), baseSpd - 4),
          mkEnemy('異界覇主・終焉の門番', 'null', 'dealer', Math.round(baseHp * 2.85), Math.round(baseAtk * 1.4), Math.round(baseDef * 1.25), baseSpd + 8, true),
          mkEnemy('異界の癒精', 'dark', 'healer', Math.round(baseHp * 1.05), Math.round(baseAtk * 0.96), baseDef, baseSpd + 4)
        ]
      : isBossFloor
        ? [
            mkEnemy('異界の守護機', attrs[(f + 1) % 6], 'tank', Math.round(baseHp * 1.15), Math.round(baseAtk * 0.9), Math.round(baseDef * 1.25), baseSpd - 6),
            mkEnemy('異界塔の大層主', mainAttr, 'dealer', Math.round(baseHp * 2.45), Math.round(baseAtk * 1.32), Math.round(baseDef * 1.18), baseSpd + 6, true),
            mkEnemy('異界の癒精', attrs[(f + 3) % 6], 'healer', Math.round(baseHp * 0.95), Math.round(baseAtk * 0.92), baseDef, baseSpd + 2)
          ]
        : [
            mkEnemy('異界塔の番兵', mainAttr, 'tank', Math.round(baseHp * 1.2), Math.round(baseAtk * 0.92), Math.round(baseDef * 1.2), baseSpd - 4),
            mkEnemy('異界の混沌兵', attrs[(f + 2) % 6], 'dealer', Math.round(baseHp * 0.98), Math.round(baseAtk * 1.18), baseDef, baseSpd + 4),
            mkEnemy('異界の変異体', attrs[(f + 4) % 6], 'supporter', Math.round(baseHp * 0.92), baseAtk, baseDef, baseSpd + 8)
          ];

    return {
      id: `tower-${f}`,
      mode: 'tower',
      floor: f,
      code: `${f}F`,
      name: isFinalFloor ? `異界塔 ${f}階【異界覇主】` : isBossFloor ? `異界塔 ${f}階【大層主】` : `異界塔 ${f}階`,
      oneTimeOnly: true,
      recPower: Math.round(2200 * scale),
      attr: mainAttr,
      gold: Math.round((650 + f * 180) * Math.pow(1.032, f - 1)),
      exp: Math.round((380 + f * 95) * Math.pow(1.032, f - 1)),
      shards: isFinalFloor ? 80 : isBossFloor ? Math.min(60, 12 + Math.floor(f * 0.55)) : Math.min(35, 6 + Math.floor(f * 0.35)),
      coreChance: isBossFloor ? 1.0 : Math.min(1.0, 0.35 + f * 0.01),
      coreCount: isFinalFloor ? 20 : isBossFloor ? Math.min(12, 2 + Math.floor(f / 10)) : 1,
      rarityBias: 1.0 + f * 0.065,
      enemies
    };
  }

  function scaleEnemy(template, hpMult, atkMult, defMult, spdDelta, forceNormal) {
    return {
      name: template.name,
      attr: template.attr,
      role: template.role,
      hp: Math.max(40, Math.round(template.hp * hpMult)),
      atk: Math.max(8, Math.round(template.atk * atkMult)),
      def: Math.max(4, Math.round(template.def * defMult)),
      spd: Math.max(60, Math.round(template.spd + (spdDelta || 0))),
      isBoss: forceNormal ? false : !!template.isBoss
    };
  }

  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  /**
   * 任意のステージから全5WAVE分の敵編成を生成する
   * WAVE 1〜4: 前哨〜終盤戦 / WAVE 5: 本ステージの主力・ボス編成
   */
  function buildStageWaves(stage) {
    const waveConfigs = [
      { count: 2, hpM: 0.34, atkM: 0.78, defM: 0.82, spdD: -4 },
      { count: 2, hpM: 0.42, atkM: 0.84, defM: 0.86, spdD: -2 },
      { count: 3, hpM: 0.50, atkM: 0.90, defM: 0.92, spdD: 0 },
      { count: 3, hpM: 0.58, atkM: 0.95, defM: 0.96, spdD: 2 }
    ];

    // WAVE 1〜4用の雑魚・前衛候補プールを構築
    let pool = stage.enemies.filter((e) => !e.isBoss);
    if (stage.mode === 'story') {
      const worldNonBoss = STORY_STAGES
        .filter((s) => s.world === stage.world)
        .flatMap((s) => s.enemies.filter((e) => !e.isBoss));
      // ステージ固有の非ボス敵を優先しつつ同ワールドの敵も混ぜる（ステータスは当該ステージ水準へ正規化）
      const avgHp = stage.enemies.reduce((sum, e) => sum + (e.isBoss ? e.hp * 0.48 : e.hp), 0) / stage.enemies.length;
      const avgAtk = stage.enemies.reduce((sum, e) => sum + e.atk, 0) / stage.enemies.length;
      const avgDef = stage.enemies.reduce((sum, e) => sum + e.def, 0) / stage.enemies.length;
      const avgSpd = stage.enemies.reduce((sum, e) => sum + e.spd, 0) / stage.enemies.length;
      const seenNames = new Set(pool.map((e) => e.name));
      for (const e of worldNonBoss) {
        if (!seenNames.has(e.name)) {
          seenNames.add(e.name);
          pool.push(mkEnemy(e.name, e.attr, e.role, Math.round(avgHp), Math.round(avgAtk), Math.round(avgDef), Math.round(avgSpd), false));
        }
      }
    } else if (stage.mode === 'boss') {
      const ref = pool[0] || stage.enemies[0];
      const baseHp = ref.isBoss ? Math.round(ref.hp * 0.32) : ref.hp;
      const baseAtk = ref.isBoss ? Math.round(ref.atk * 0.72) : ref.atk;
      const baseDef = ref.isBoss ? Math.round(ref.def * 0.78) : ref.def;
      const baseSpd = ref.spd;
      const sameAttr = STORY_STAGES
        .flatMap((s) => s.enemies)
        .filter((e) => !e.isBoss && e.attr === stage.attr);
      const seenNames = new Set(pool.map((e) => e.name));
      for (const e of sameAttr.slice(0, 4)) {
        if (!seenNames.has(e.name)) {
          seenNames.add(e.name);
          pool.push(mkEnemy(e.name, e.attr, e.role, baseHp, baseAtk, baseDef, baseSpd, false));
        }
      }
    } else if (stage.mode === 'tower') {
      const f = stage.floor || 1;
      const scale = Math.pow(1.042, f - 1) * (1 + (f - 1) * 0.006);
      const attrs = ['fire', 'water', 'wind', 'light', 'dark', 'null'];
      const baseHp = Math.round(720 * scale);
      const baseAtk = Math.round(68 * scale);
      const baseDef = Math.round(26 * scale);
      const baseSpd = Math.min(185, 96 + Math.floor(f * 0.9));
      pool = [
        mkEnemy('異界塔の番兵', attrs[(f - 1) % 6], 'tank', Math.round(baseHp * 1.1), Math.round(baseAtk * 0.92), Math.round(baseDef * 1.15), baseSpd - 4),
        mkEnemy('異界の混沌兵', attrs[(f + 1) % 6], 'dealer', Math.round(baseHp * 0.95), Math.round(baseAtk * 1.12), baseDef, baseSpd + 3),
        mkEnemy('異界の変異体', attrs[(f + 3) % 6], 'supporter', Math.round(baseHp * 0.9), baseAtk, baseDef, baseSpd + 6),
        mkEnemy('異界の守護機', attrs[(f + 2) % 6], 'tank', Math.round(baseHp * 1.12), Math.round(baseAtk * 0.9), Math.round(baseDef * 1.2), baseSpd - 5),
        mkEnemy('異界の癒精', attrs[(f + 4) % 6], 'healer', Math.round(baseHp * 0.88), Math.round(baseAtk * 0.9), baseDef, baseSpd + 2)
      ];
    }

    if (!pool.length) pool = stage.enemies.slice();

    const seed = hashSeed(stage.id);
    const waves = [];

    for (let w = 0; w < TOTAL_WAVES - 1; w++) {
      const cfg = waveConfigs[w];
      const list = [];
      for (let i = 0; i < cfg.count; i++) {
        const tmpl = pool[(seed + w * 2 + i) % pool.length];
        list.push(scaleEnemy(tmpl, cfg.hpM, cfg.atkM, cfg.defM, cfg.spdD, true));
      }
      waves.push(list);
    }

    // WAVE 5: 本番の主力・ボス編成
    const hasBoss = stage.enemies.some((e) => e.isBoss);
    const finalWave = stage.enemies.map((e) =>
      scaleEnemy(e, hasBoss ? (e.isBoss ? 0.92 : 0.62) : 0.76, 1.0, 1.0, 0, false)
    );
    waves.push(finalWave);

    return waves;
  }

  const ALL_FIXED_STAGES = [...STORY_STAGES, ...BOSS_STAGES];
  const STAGE_MAP = Object.fromEntries(ALL_FIXED_STAGES.map((s) => [s.id, s]));

  function getStage(stageId, towerFloor) {
    if (stageId && stageId.startsWith('tower-')) {
      const f = Number(stageId.split('-')[1]) || towerFloor || 1;
      return buildTowerStage(f);
    }
    return STAGE_MAP[stageId] || STORY_STAGES[0];
  }

  // 敵図鑑用の全エネミーカタログを生成・キャッシュ
  let enemyCatalogCache = null;
  function getEnemyCatalog() {
    if (enemyCatalogCache) return enemyCatalogCache;
    const map = new Map();

    function reg(enemy, sourceLabel) {
      const existing = map.get(enemy.name);
      if (!existing) {
        map.set(enemy.name, {
          name: enemy.name,
          attr: enemy.attr,
          role: enemy.role,
          isBoss: !!enemy.isBoss,
          hp: enemy.hp,
          atk: enemy.atk,
          def: enemy.def,
          spd: enemy.spd,
          sources: [sourceLabel]
        });
      } else {
        if (enemy.isBoss) existing.isBoss = true;
        if (enemy.hp > existing.hp) {
          existing.hp = enemy.hp;
          existing.atk = enemy.atk;
          existing.def = enemy.def;
          existing.spd = enemy.spd;
        }
        if (!existing.sources.includes(sourceLabel)) existing.sources.push(sourceLabel);
      }
    }

    for (const s of STORY_STAGES) {
      for (const e of s.enemies) reg(e, `冒険 ${s.code}`);
    }
    for (const s of BOSS_STAGES) {
      for (const e of s.enemies) reg(e, `属性ボス ${s.code}`);
    }
    // 異界塔の代表エネミー7種
    const towerSamples = [
      { stage: buildTowerStage(1), label: '異界塔 1F〜99F' },
      { stage: buildTowerStage(5), label: '異界塔 5F毎大層主' },
      { stage: buildTowerStage(100), label: '異界塔 100F' }
    ];
    for (const ts of towerSamples) {
      for (const e of ts.stage.enemies) reg(e, ts.label);
    }

    const attrMap = HS.CONST.ATTR_MAP;
    enemyCatalogCache = [...map.values()].sort((a, b) => {
      if (a.isBoss !== b.isBoss) return a.isBoss ? 1 : -1;
      const ai = attrMap[a.attr]?.idx ?? 99;
      const bi = attrMap[b.attr]?.idx ?? 99;
      if (ai !== bi) return ai - bi;
      return HS.CONST.toKanaSortKey(a.name).localeCompare(HS.CONST.toKanaSortKey(b.name), 'ja');
    });
    return enemyCatalogCache;
  }

  HS.STAGES = {
    TOTAL_WAVES,
    TOWER_MAX_FLOOR,
    WORLDS,
    STORY_STAGES,
    BOSS_STAGES,
    STAGE_MAP,
    buildTowerStage,
    buildStageWaves,
    getStage,
    getEnemyCatalog
  };
})(window);
