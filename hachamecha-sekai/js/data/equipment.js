(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  var D = HS.Data = HS.Data || {};

  D.EQUIP_SETS = [
    {
      id: 'set_frontier',
      name: '境界旅団',
      kana: 'きょうかいりょだん',
      world: 'frontier',
      element: 'none',
      races: ['human'],
      icon: '⚜️',
      desc: '境界平原の冒険者ギルドが標準採用する万能装具。',
      bonus2: { desc: 'HP+8%・攻撃+8%', mod: { hpPct: 0.08, atkPct: 0.08 } },
      bonus4: { desc: 'HP・攻撃・防御+10%・初期ゲージ+15%', mod: { hpPct: 0.10, atkPct: 0.10, defPct: 0.10, initGauge: 0.15 } }
    },
    {
      id: 'set_steam',
      name: '機巧蒸気',
      kana: 'きこうじょうき',
      world: 'mechcity',
      element: 'none',
      races: ['mech'],
      icon: '⚙️',
      desc: '蒸気圧と精密歯車で衝撃を跳ね返す機巧都市の鋼装。',
      bonus2: { desc: '防御+14%', mod: { defPct: 0.14 } },
      bonus4: { desc: '開幕防護壁20%・反撃率+20%', mod: { startShieldPct: 0.20, counterRate: 0.20 } }
    },
    {
      id: 'set_crimson',
      name: '紅蓮竜鱗',
      kana: 'ぐれんりゅうりん',
      world: 'dragonpeak',
      element: 'fire',
      races: ['dragon'],
      icon: '🔥',
      desc: '紅蓮竜峰の溶岩で鍛え上げられた灼熱の竜鱗武具。',
      bonus2: { desc: '攻撃+14%', mod: { atkPct: 0.14 } },
      bonus4: { desc: '会心率+12%・会心ダメ+28%', mod: { crit: 0.12, critDmg: 0.28 } }
    },
    {
      id: 'set_starlight',
      name: '星霧精霊',
      kana: 'ほしぎりせいれい',
      world: 'fairyvale',
      element: 'wind',
      races: ['fairy'],
      icon: '🌿',
      desc: '星霧妖精郷の朝露と風を織り込んだ軽やかな霊装。',
      bonus2: { desc: '速度+10%', mod: { spdPct: 0.10 } },
      bonus4: { desc: '与回復量+22%・WAVE開始HP回復+15%', mod: { healDealtPct: 0.22, waveHealPct: 0.15 } }
    },
    {
      id: 'set_abyss',
      name: '深淵呪紋',
      kana: 'しんえんじゅもん',
      world: 'abyss',
      element: 'dark',
      races: ['demon'],
      icon: '🌒',
      desc: '深淵魔界の紅月を封じた魔紋装具。弱った獲物を逃さない。',
      bonus2: { desc: '状態異常付与率+18%', mod: { ailmentRate: 0.18 } },
      bonus4: { desc: '異常特攻+30%・与ダメ+12%', mod: { ailmentDmgPct: 0.30, dmgDealtPct: 0.12 } }
    },
    {
      id: 'set_wild',
      name: '極彩猛獣',
      kana: 'ごくさいもうじゅう',
      world: 'wilds',
      element: 'wind',
      races: ['beast'],
      icon: '🐾',
      desc: '極彩獣域の猛者たちが誇りとする躍動の狩装束。',
      bonus2: { desc: '会心率+10%', mod: { crit: 0.10 } },
      bonus4: { desc: '追撃率+22%・撃破時ゲージ+20%', mod: { followUpRate: 0.22, gaugeOnKill: 0.20 } }
    },
    {
      id: 'set_sanctum',
      name: '白銀神装',
      kana: 'しろがねしんそう',
      world: 'sanctum',
      element: 'light',
      races: ['god'],
      icon: '☀️',
      desc: '白銀神域の儀礼庫に眠る清浄な白金の神具一式。',
      bonus2: { desc: '耐性+18%・HP+10%', mod: { res: 0.18, hpPct: 0.10 } },
      bonus4: { desc: '被ダメ-14%・開幕防護壁18%', mod: { dmgTakenPct: -0.14, startShieldPct: 0.18 } }
    },
    {
      id: 'set_aqua',
      name: '蒼海氷晶',
      kana: 'そうかいひょうしょう',
      world: 'fairyvale',
      element: 'water',
      races: ['dragon'],
      icon: '💧',
      desc: '古の水竜が守る清泉の結晶から削り出された蒼氷装。',
      bonus2: { desc: 'HP+14%', mod: { hpPct: 0.14 } },
      bonus4: { desc: '行動開始HP8%回復・被回復+20%', mod: { turnRegenPct: 0.08, healTakenPct: 0.20 } }
    },
    {
      id: 'set_intruder',
      name: '乱入覇者',
      kana: 'らんにゅうはしゃ',
      world: 'abyss',
      element: 'dark',
      races: ['human', 'demon'],
      icon: '⚡',
      desc: '異界の乱入者たちから奪い取った規格外の奇襲装具。',
      bonus2: { desc: '初期ゲージ+20%', mod: { initGauge: 0.20 } },
      bonus4: { desc: '攻撃+18%・速度+12%・会心+10%', mod: { atkPct: 0.18, spdPct: 0.12, crit: 0.10 } }
    },
    {
      id: 'set_chaos',
      name: '万象交差',
      kana: 'ばんしょうこうさ',
      world: 'sanctum',
      element: 'light',
      races: ['god', 'mech'],
      icon: '👑',
      desc: '七つの世界の理が一点に結晶化した伝説の融合神機装。',
      bonus2: { desc: 'HP・攻撃・防御+10%', mod: { hpPct: 0.10, atkPct: 0.10, defPct: 0.10 } },
      bonus4: { desc: '与ダメ+18%・スキル与ダメ+18%・開幕防護壁15%', mod: { dmgDealtPct: 0.18, skillDmgPct: 0.18, startShieldPct: 0.15 } }
    }
  ];

  // 10セット × 4部位 = 40装備定義 (ランダムオプション無し・品質1〜100で基礎値が変動)
  D.EQUIP_DEFS = [
    // 1. 境界旅団
    {
      id: 'eq_frontier_weapon', setId: 'set_frontier', slot: 'weapon',
      name: '境界の旅剣', kana: 'きょうかいのたびけん', element: 'none', races: ['human'],
      baseStats: { atk: 44, crit: 0.04 },
      lore: 'どの異界の通貨でも研ぎ直せる丈夫な片手剣。旅の始まりの相棒。'
    },
    {
      id: 'eq_frontier_armor', setId: 'set_frontier', slot: 'armor',
      name: '旅団の革外套', kana: 'りょだんのかわがいとう', element: 'none', races: ['human'],
      baseStats: { hp: 220, def: 28 },
      lore: '雨風も魔霧も弾く厚手の外套。内ポケットには各地の地図がぎっしり。'
    },
    {
      id: 'eq_frontier_accessory', setId: 'set_frontier', slot: 'accessory',
      name: '交差羅針盤', kana: 'こうさらしんばん', element: 'none', races: ['human'],
      baseStats: { spd: 12, crit: 0.04 },
      lore: '北ではなく「一番面白そうな異界」を指す困った羅針盤。'
    },
    {
      id: 'eq_frontier_core', setId: 'set_frontier', slot: 'core',
      name: '境界の原石核', kana: 'きょうかいのげんせきかく', element: 'none', races: ['human'],
      baseStats: { hp: 150, atk: 22, def: 16 },
      lore: '七界の魔力を穏やかに調和させる素朴な結晶核。'
    },

    // 2. 機巧蒸気
    {
      id: 'eq_steam_weapon', setId: 'set_steam', slot: 'weapon',
      name: '蒸気パイル槍', kana: 'じょうきぱいるやり', element: 'none', races: ['mech'],
      baseStats: { atk: 46, def: 16 },
      lore: '着弾と同時に高圧蒸気を噴射する重厚な機巧槍。'
    },
    {
      id: 'eq_steam_armor', setId: 'set_steam', slot: 'armor',
      name: '歯車重装甲', kana: 'はぐるまじゅうそうこう', element: 'none', races: ['mech'],
      baseStats: { hp: 260, def: 42 },
      lore: '噛み合う歯車が衝撃を分散させる機巧都市自慢の分厚い鋼鎧。'
    },
    {
      id: 'eq_steam_accessory', setId: 'set_steam', slot: 'accessory',
      name: '調圧バルブ環', kana: 'ちょうあつばるぶかん', element: 'none', races: ['mech'],
      baseStats: { def: 24, res: 0.08 },
      lore: '過剰な魔力も蒸気として逃がす安全な圧力弁型リング。'
    },
    {
      id: 'eq_steam_core', setId: 'set_steam', slot: 'core',
      name: '零式蒸気炉心', kana: 'れいしきじょうきろしん', element: 'none', races: ['mech'],
      baseStats: { hp: 210, def: 26, spd: 6 },
      lore: '心地よい駆動音を奏で続ける永久機関の試作炉心。'
    },

    // 3. 紅蓮竜鱗
    {
      id: 'eq_crimson_weapon', setId: 'set_crimson', slot: 'weapon',
      name: '紅蓮の竜牙剣', kana: 'ぐれんのりゅうがけん', element: 'fire', races: ['dragon'],
      baseStats: { atk: 62, crit: 0.06 },
      lore: '古竜の抜け牙を溶岩で鍛えた大剣。振るうたび火の粉が舞う。'
    },
    {
      id: 'eq_crimson_armor', setId: 'set_crimson', slot: 'armor',
      name: '灼熱竜鱗鎧', kana: 'しゃくねつりゅうりんがい', element: 'fire', races: ['dragon'],
      baseStats: { hp: 250, def: 32, atk: 16 },
      lore: '火山の熱気すら心地よく感じる真紅の鱗鎧。'
    },
    {
      id: 'eq_crimson_accessory', setId: 'set_crimson', slot: 'accessory',
      name: '炎竜の逆鱗飾', kana: 'えんりゅうのげきりんかざり', element: 'fire', races: ['dragon'],
      baseStats: { atk: 28, crit: 0.07, critDmg: 0.10 },
      lore: '怒れる竜の闘気を秘めた首飾り。装着者の闘志を燃え上がらせる。'
    },
    {
      id: 'eq_crimson_core', setId: 'set_crimson', slot: 'core',
      name: '溶岩竜の心臓', kana: 'ようがんりゅうのしんぞう', element: 'fire', races: ['dragon'],
      baseStats: { hp: 170, atk: 36, critDmg: 0.08 },
      lore: '絶えず脈打つ灼熱の魔石。冬のキャンプでは暖房代わりにもなる。'
    },

    // 4. 星霧精霊
    {
      id: 'eq_starlight_weapon', setId: 'set_starlight', slot: 'weapon',
      name: '星霧の風笛杖', kana: 'ほしぎりのかぜぶえづえ', element: 'wind', races: ['fairy'],
      baseStats: { atk: 48, spd: 12 },
      lore: 'そよ風が通るだけで癒やしの音色を奏でる妖精細工の杖。'
    },
    {
      id: 'eq_starlight_armor', setId: 'set_starlight', slot: 'armor',
      name: '花霧の羽衣', kana: 'はなぎりのはごろも', element: 'wind', races: ['fairy'],
      baseStats: { hp: 230, def: 26, spd: 10 },
      lore: '羽のように軽く、星屑の光をまとって厄災をすり抜ける衣。'
    },
    {
      id: 'eq_starlight_accessory', setId: 'set_starlight', slot: 'accessory',
      name: '妖精の露耳飾', kana: 'ようせいのつゆみみかざり', element: 'wind', races: ['fairy'],
      baseStats: { spd: 18, res: 0.08 },
      lore: '決して乾かない朝露を閉じ込めた雫型の耳飾り。'
    },
    {
      id: 'eq_starlight_core', setId: 'set_starlight', slot: 'core',
      name: '星屑の精霊核', kana: 'ほしくずのせいれいかく', element: 'wind', races: ['fairy'],
      baseStats: { hp: 180, atk: 24, spd: 12 },
      lore: '小さな妖精たちが輪になって踊る光景が映る透明な宝玉。'
    },

    // 5. 深淵呪紋
    {
      id: 'eq_abyss_weapon', setId: 'set_abyss', slot: 'weapon',
      name: '深淵の黒鎌', kana: 'しんえんのくろがま', element: 'dark', races: ['demon'],
      baseStats: { atk: 60, crit: 0.05 },
      lore: '紅月の影を刃に宿した大鎌。傷口からじわじわ魔力を奪う。'
    },
    {
      id: 'eq_abyss_armor', setId: 'set_abyss', slot: 'armor',
      name: '魔紋の夜外套', kana: 'まもんのよるがいとう', element: 'dark', races: ['demon'],
      baseStats: { hp: 240, def: 30, atk: 18 },
      lore: '深淵の貴族が好む漆黒の礼装。裾から紫の燐光がこぼれる。'
    },
    {
      id: 'eq_abyss_accessory', setId: 'set_abyss', slot: 'accessory',
      name: '紅月の呪印環', kana: 'こうげつのじゅいんかん', element: 'dark', races: ['demon'],
      baseStats: { atk: 26, spd: 12, critDmg: 0.12 },
      lore: '魔界の契約紋が刻まれた指輪。呪いも使いようだと魔族は笑う。'
    },
    {
      id: 'eq_abyss_core', setId: 'set_abyss', slot: 'core',
      name: '深淵の紫水晶', kana: 'しんえんのむらさきすいしょう', element: 'dark', races: ['demon'],
      baseStats: { hp: 165, atk: 34, crit: 0.06 },
      lore: '覗き込むと別の世界が見えると言われる妖しい魔核。'
    },

    // 6. 極彩猛獣
    {
      id: 'eq_wild_weapon', setId: 'set_wild', slot: 'weapon',
      name: '極彩の双獣爪', kana: 'ごくさいのそうじゅうそう', element: 'wind', races: ['beast'],
      baseStats: { atk: 58, spd: 10, crit: 0.06 },
      lore: '風を裂くほど鋭い双爪。連続で獲物を切り裂く狩人の誇り。'
    },
    {
      id: 'eq_wild_armor', setId: 'set_wild', slot: 'armor',
      name: '猛獣の彩毛皮', kana: 'もうじゅうのさいけがわ', element: 'wind', races: ['beast'],
      baseStats: { hp: 245, def: 28, spd: 12 },
      lore: '極彩獣域の鮮やかな毛皮で仕立てた軽装鎧。動きやすさ抜群。'
    },
    {
      id: 'eq_wild_accessory', setId: 'set_wild', slot: 'accessory',
      name: '百獣の牙首飾', kana: 'ひゃくじゅうのきばくびかざり', element: 'wind', races: ['beast'],
      baseStats: { spd: 15, crit: 0.09 },
      lore: '強敵と渡り合った証の牙を連ねた首飾り。野性の勘が冴え渡る。'
    },
    {
      id: 'eq_wild_core', setId: 'set_wild', slot: 'core',
      name: '疾風獣の魂核', kana: 'しっぷうじゅうのこんかく', element: 'wind', races: ['beast'],
      baseStats: { hp: 170, atk: 30, spd: 14 },
      lore: '大草原を駆ける風の記憶が詰まった琥珀色の獣核。'
    },

    // 7. 白銀神装
    {
      id: 'eq_sanctum_weapon', setId: 'set_sanctum', slot: 'weapon',
      name: '白銀の天槍', kana: 'しろがねのてんそう', element: 'light', races: ['god'],
      baseStats: { atk: 56, def: 18, res: 0.06 },
      lore: '雲上の鍛冶神が打ち出した純白の槍。迷いを晴らす光を放つ。'
    },
    {
      id: 'eq_sanctum_armor', setId: 'set_sanctum', slot: 'armor',
      name: '白金の神儀鎧', kana: 'はっきんのしんぎがい', element: 'light', races: ['god'],
      baseStats: { hp: 310, def: 46, res: 0.08 },
      lore: '白銀神域の守護者に授けられる神聖鎧。一切の汚れを寄せ付けない。'
    },
    {
      id: 'eq_sanctum_accessory', setId: 'set_sanctum', slot: 'accessory',
      name: '光輪の聖徽章', kana: 'こうりんのせいきしょう', element: 'light', races: ['god'],
      baseStats: { hp: 180, def: 24, res: 0.12 },
      lore: '小さな光の輪が浮かぶ胸飾り。危機の際に淡く輝いて身を守る。'
    },
    {
      id: 'eq_sanctum_core', setId: 'set_sanctum', slot: 'core',
      name: '天界の白銀核', kana: 'てんかいのはくぎんかく', element: 'light', races: ['god'],
      baseStats: { hp: 230, atk: 24, def: 26 },
      lore: '澄み切った鐘の音のように清らかな魔力を循環させる神核。'
    },

    // 8. 蒼海氷晶
    {
      id: 'eq_aqua_weapon', setId: 'set_aqua', slot: 'weapon',
      name: '蒼氷の竜杖', kana: 'そうひょうのりゅうづえ', element: 'water', races: ['dragon'],
      baseStats: { atk: 52, hp: 120 },
      lore: '万年氷の結晶を先端に冠した杖。癒やしにも凍撃にも応える。'
    },
    {
      id: 'eq_aqua_armor', setId: 'set_aqua', slot: 'armor',
      name: '水竜の蒼鱗衣', kana: 'すいりゅうのそうりんい', element: 'water', races: ['dragon'],
      baseStats: { hp: 320, def: 38 },
      lore: '清らかな水の膜を常時まとう蒼鱗の衣。熱波も毒霧も洗い流す。'
    },
    {
      id: 'eq_aqua_accessory', setId: 'set_aqua', slot: 'accessory',
      name: '清泉の氷雫飾', kana: 'せいせんのひょうしずくかざり', element: 'water', races: ['dragon'],
      baseStats: { hp: 210, spd: 10, res: 0.10 },
      lore: 'ひんやりと心地よい水滴の首飾り。長旅の疲れを和らげる。'
    },
    {
      id: 'eq_aqua_core', setId: 'set_aqua', slot: 'core',
      name: '蒼海竜の宝珠', kana: 'そうかいりゅうのほうじゅ', element: 'water', races: ['dragon'],
      baseStats: { hp: 260, def: 22, atk: 20 },
      lore: '満ち引きする潮の韻律を秘めた深い蒼の宝珠。'
    },

    // 9. 乱入覇者 (指名手配・乱入限定セット)
    {
      id: 'eq_intruder_weapon', setId: 'set_intruder', slot: 'weapon',
      name: '乱入者の奇刃', kana: 'らんにゅうしゃのきじん', element: 'dark', races: ['human', 'demon'],
      baseStats: { atk: 68, spd: 10, crit: 0.07 },
      lore: 'どこからともなく戦場に割り込む乱入者たちが愛用する変幻自在の刃。'
    },
    {
      id: 'eq_intruder_armor', setId: 'set_intruder', slot: 'armor',
      name: '異界渡りの外套', kana: 'いかいわたりのがいとう', element: 'dark', races: ['human', 'demon'],
      baseStats: { hp: 270, def: 34, spd: 12 },
      lore: '次元の裂け目をくぐり抜けても破れない漆黒のロングコート。'
    },
    {
      id: 'eq_intruder_accessory', setId: 'set_intruder', slot: 'accessory',
      name: '指名手配の印章', kana: 'しめいてはいのいんしょう', element: 'dark', races: ['human', 'demon'],
      baseStats: { atk: 30, spd: 16, crit: 0.08 },
      lore: '手配書に押される赤い封蝋をそのまま飾りにした大胆な徽章。'
    },
    {
      id: 'eq_intruder_core', setId: 'set_intruder', slot: 'core',
      name: '次元跳躍コア', kana: 'じげんちょうやくこあ', element: 'dark', races: ['human', 'demon'],
      baseStats: { hp: 190, atk: 38, spd: 14 },
      lore: '予想外のタイミングで起動し先手必勝をもたらす異界製コア。'
    },

    // 10. 万象交差 (エンドコンテンツ最高峰セット)
    {
      id: 'eq_chaos_weapon', setId: 'set_chaos', slot: 'weapon',
      name: '万象交差の神剣', kana: 'ばんしょうこうさのしんけん', element: 'light', races: ['god', 'mech'],
      baseStats: { atk: 74, spd: 10, crit: 0.08 },
      lore: '神の星光と機巧の精密構造が融合した白金の大剣。七界を繋ぐ鍵。'
    },
    {
      id: 'eq_chaos_armor', setId: 'set_chaos', slot: 'armor',
      name: '七界融合の神鎧', kana: 'ななかいゆうごうのしんがい', element: 'light', races: ['god', 'mech'],
      baseStats: { hp: 340, def: 48, res: 0.10 },
      lore: '炎も氷も歯車も星霧もすべて調和して纏う究極の白銀機神鎧。'
    },
    {
      id: 'eq_chaos_accessory', setId: 'set_chaos', slot: 'accessory',
      name: '星環の交差冠', kana: 'せいかんのこうさかん', element: 'light', races: ['god', 'mech'],
      baseStats: { atk: 32, spd: 16, crit: 0.08, critDmg: 0.14 },
      lore: '七つの小さな光環がゆっくり回転する王冠型の装飾品。'
    },
    {
      id: 'eq_chaos_core', setId: 'set_chaos', slot: 'core',
      name: 'はちゃめちゃ神核', kana: 'はちゃめちゃしんかく', element: 'light', races: ['god', 'mech'],
      baseStats: { hp: 250, atk: 40, def: 30, spd: 12 },
      lore: '矛盾するはずの世界の力が仲良く同居する奇跡の結晶核。'
    }
  ];

  D.EQUIP_SET_BY_ID = {};
  D.EQUIP_SETS.forEach(function (s) { D.EQUIP_SET_BY_ID[s.id] = s; });

  D.EQUIP_DEF_BY_ID = {};
  D.EQUIP_DEFS.forEach(function (e) { D.EQUIP_DEF_BY_ID[e.id] = e; });
})(typeof window !== 'undefined' ? window : globalThis);
