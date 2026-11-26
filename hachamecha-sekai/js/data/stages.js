'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});
  const Data = Kairo.data || (Kairo.data = {});

  // 15 Campaign Stages across 5 mixed realms (3 stages each)
  const CAMPAIGN_STAGES = [
    // Area 1: Arcadia
    {
      id: 'st_1_1', code: '1-1', name: '白銀の境界門', realm: 'arcadia', powerRec: 1800,
      relicSets: ['sky_blade', 'iron_bastion'], relicTier: 1,
      rewards: { gold: 180, exp: 120, gemFirst: 150, gemLoop: 12, dust: 15 },
      waves: [
        [{ name: '境界の魔狼', sigil: '狼', realm: 'arcadia', hp: 580, atk: 68, def: 32, spd: 96 }, { name: '鉄錆の歩兵', sigil: '兵', realm: 'arcadia', hp: 620, atk: 62, def: 42, spd: 92 }],
        [{ name: '境界の魔狼', sigil: '狼', realm: 'arcadia', hp: 620, atk: 72, def: 34, spd: 98 }, { name: '魔導見習い', sigil: '術', realm: 'arcadia', hp: 540, atk: 84, def: 28, spd: 102 }],
        [{ name: '白銀門番騎士', sigil: '守', realm: 'arcadia', hp: 1280, atk: 96, def: 58, spd: 98, isBoss: true, skillName: '重盾粉砕' }, { name: '境界の魔狼', sigil: '狼', realm: 'arcadia', hp: 640, atk: 74, def: 36, spd: 98 }]
      ]
    },
    {
      id: 'st_1_2', code: '1-2', name: '古竜の残響回廊', realm: 'arcadia', powerRec: 2900,
      relicSets: ['sky_blade', 'iron_bastion'], relicTier: 1,
      rewards: { gold: 260, exp: 180, gemFirst: 160, gemLoop: 15, dust: 22 },
      waves: [
        [{ name: '竜血の剣士', sigil: '剣', realm: 'arcadia', hp: 820, atk: 92, def: 46, spd: 100 }, { name: '竜血の剣士', sigil: '剣', realm: 'arcadia', hp: 820, atk: 92, def: 46, spd: 100 }],
        [{ name: '紅蓮飛竜', sigil: '竜', realm: 'arcadia', hp: 960, atk: 108, def: 52, spd: 104 }, { name: '古魔導士', sigil: '魔', realm: 'arcadia', hp: 780, atk: 112, def: 40, spd: 106 }],
        [{ name: '古竜の幼体', sigil: '龍', realm: 'arcadia', hp: 2050, atk: 132, def: 74, spd: 104, isBoss: true, skillName: '竜炎ブレス', aoe: true }, { name: '竜血の剣士', sigil: '剣', realm: 'arcadia', hp: 880, atk: 98, def: 50, spd: 100 }]
      ]
    },
    {
      id: 'st_1_3', code: '1-3', name: '王座の聖剣試練', realm: 'arcadia', powerRec: 4200,
      relicSets: ['sky_blade', 'cross_fusion'], relicTier: 2,
      rewards: { gold: 380, exp: 260, gemFirst: 220, gemLoop: 18, dust: 30 },
      waves: [
        [{ name: '近衛聖騎士', sigil: '騎', realm: 'arcadia', hp: 1150, atk: 118, def: 68, spd: 102 }, { name: '聖堂術師', sigil: '聖', realm: 'arcadia', hp: 980, atk: 132, def: 52, spd: 108 }],
        [{ name: '近衛聖騎士', sigil: '騎', realm: 'arcadia', hp: 1220, atk: 124, def: 72, spd: 104 }, { name: '白銀槍兵', sigil: '槍', realm: 'arcadia', hp: 1180, atk: 138, def: 62, spd: 106 }],
        [{ name: '影の王剣・模造体', sigil: '王', realm: 'arcadia', hp: 3100, atk: 168, def: 96, spd: 108, isBoss: true, skillName: '王剣裁定', aoe: true }, { name: '聖堂術師', sigil: '聖', realm: 'arcadia', hp: 1080, atk: 136, def: 58, spd: 108 }]
      ]
    },
    // Area 2: Cyber
    {
      id: 'st_2_1', code: '2-1', name: 'ネオン電網外縁', realm: 'cyber', powerRec: 5800,
      relicSets: ['quantum_overdrive', 'swift_gale'], relicTier: 2,
      rewards: { gold: 520, exp: 360, gemFirst: 180, gemLoop: 22, dust: 40 },
      waves: [
        [{ name: '警備ドローン', sigil: '機', realm: 'cyber', hp: 1450, atk: 154, def: 68, spd: 118 }, { name: '警備ドローン', sigil: '機', realm: 'cyber', hp: 1450, atk: 154, def: 68, spd: 118 }, { name: '電脳斥候', sigil: '索', realm: 'cyber', hp: 1320, atk: 168, def: 60, spd: 124 }],
        [{ name: '義体傭兵', sigil: '刃', realm: 'cyber', hp: 1680, atk: 178, def: 76, spd: 120 }, { name: 'ハッカー端末', sigil: '網', realm: 'cyber', hp: 1480, atk: 188, def: 66, spd: 122 }],
        [{ name: '保安局長ユニット', sigil: '統', realm: 'cyber', hp: 4200, atk: 215, def: 108, spd: 120, isBoss: true, skillName: '電磁制圧砲', aoe: true }, { name: '義体傭兵', sigil: '刃', realm: 'cyber', hp: 1750, atk: 182, def: 78, spd: 120 }]
      ]
    },
    {
      id: 'st_2_2', code: '2-2', name: '量子データ塔・中層', realm: 'cyber', powerRec: 7800,
      relicSets: ['quantum_overdrive', 'swift_gale'], relicTier: 2,
      rewards: { gold: 700, exp: 490, gemFirst: 200, gemLoop: 26, dust: 52 },
      waves: [
        [{ name: '防壁AIコア', sigil: '壁', realm: 'cyber', hp: 2150, atk: 175, def: 112, spd: 110 }, { name: '狙撃義体', sigil: '射', realm: 'cyber', hp: 1720, atk: 228, def: 74, spd: 128 }],
        [{ name: 'プラズマ猟犬', sigil: '猟', realm: 'cyber', hp: 1920, atk: 220, def: 82, spd: 126 }, { name: '狙撃義体', sigil: '射', realm: 'cyber', hp: 1780, atk: 234, def: 78, spd: 128 }],
        [{ name: '量子守護機・デルタ', sigil: 'Δ', realm: 'cyber', hp: 5600, atk: 268, def: 128, spd: 124, isBoss: true, skillName: '軌道レーザー掃射', aoe: true }, { name: '防壁AIコア', sigil: '壁', realm: 'cyber', hp: 2300, atk: 185, def: 120, spd: 112 }]
      ]
    },
    {
      id: 'st_2_3', code: '2-3', name: '電脳中枢・シオン核', realm: 'cyber', powerRec: 10500,
      relicSets: ['quantum_overdrive', 'cross_fusion'], relicTier: 3,
      rewards: { gold: 940, exp: 650, gemFirst: 280, gemLoop: 32, dust: 68 },
      waves: [
        [{ name: '処刑用義体', sigil: '斬', realm: 'cyber', hp: 2450, atk: 265, def: 102, spd: 128 }, { name: '高圧電磁塔', sigil: '雷', realm: 'cyber', hp: 2600, atk: 255, def: 118, spd: 116 }],
        [{ name: '処刑用義体', sigil: '斬', realm: 'cyber', hp: 2550, atk: 274, def: 108, spd: 130 }, { name: '異界混成機兵', sigil: '混', realm: 'arcadia', hp: 2800, atk: 250, def: 132, spd: 112 }],
        [{ name: '中枢AI・オーバーマインド', sigil: '核', realm: 'cyber', hp: 7800, atk: 325, def: 152, spd: 126, isBoss: true, skillName: 'システム完全消去', aoe: true }, { name: '高圧電磁塔', sigil: '雷', realm: 'cyber', hp: 2700, atk: 262, def: 122, spd: 118 }]
      ]
    },
    // Area 3: Yokai
    {
      id: 'st_3_1', code: '3-1', name: '逢魔の朱鳥居', realm: 'yokai', powerRec: 13800,
      relicSets: ['crimson_pact', 'swift_gale'], relicTier: 3,
      rewards: { gold: 1250, exp: 880, gemFirst: 220, gemLoop: 38, dust: 85 },
      waves: [
        [{ name: '提灯妖火', sigil: '火', realm: 'yokai', hp: 3100, atk: 310, def: 124, spd: 120 }, { name: '提灯妖火', sigil: '火', realm: 'yokai', hp: 3100, atk: 310, def: 124, spd: 120 }, { name: '鴉天狗', sigil: '鴉', realm: 'yokai', hp: 2950, atk: 335, def: 118, spd: 128 }],
        [{ name: '妖刀浪人', sigil: '刀', realm: 'yokai', hp: 3600, atk: 355, def: 136, spd: 122 }, { name: '式神・白虎', sigil: '虎', realm: 'yokai', hp: 3450, atk: 345, def: 142, spd: 124 }],
        [{ name: '大天狗・黒羽', sigil: '天', realm: 'yokai', hp: 10400, atk: 410, def: 175, spd: 128, isBoss: true, skillName: '暴風妖斬', aoe: true }, { name: '妖刀浪人', sigil: '刀', realm: 'yokai', hp: 3800, atk: 365, def: 140, spd: 122 }]
      ]
    },
    {
      id: 'st_3_2', code: '3-2', name: '紅蓮百鬼の大路', realm: 'yokai', powerRec: 18000,
      relicSets: ['crimson_pact', 'iron_bastion'], relicTier: 3,
      rewards: { gold: 1620, exp: 1150, gemFirst: 240, gemLoop: 44, dust: 105 },
      waves: [
        [{ name: '赤鬼武者', sigil: '鬼', realm: 'yokai', hp: 4600, atk: 390, def: 178, spd: 112 }, { name: '呪炎巫女', sigil: '呪', realm: 'yokai', hp: 3900, atk: 430, def: 148, spd: 124 }],
        [{ name: '赤鬼武者', sigil: '鬼', realm: 'yokai', hp: 4800, atk: 405, def: 184, spd: 114 }, { name: '電脳妖狐', sigil: '狐', realm: 'cyber', hp: 4100, atk: 440, def: 152, spd: 130 }],
        [{ name: '酒呑の幻影', sigil: '呑', realm: 'yokai', hp: 14200, atk: 505, def: 215, spd: 120, isBoss: true, skillName: '鬼哭紅蓮衝', aoe: true }, { name: '呪炎巫女', sigil: '呪', realm: 'yokai', hp: 4200, atk: 448, def: 156, spd: 124 }]
      ]
    },
    {
      id: 'st_3_3', code: '3-3', name: '常世ノ京・彼岸宮', realm: 'yokai', powerRec: 23500,
      relicSets: ['crimson_pact', 'cross_fusion'], relicTier: 4,
      rewards: { gold: 2150, exp: 1520, gemFirst: 340, gemLoop: 52, dust: 132 },
      waves: [
        [{ name: '陰陽傀儡', sigil: '傀', realm: 'yokai', hp: 5600, atk: 490, def: 205, spd: 122 }, { name: '陰陽傀儡', sigil: '傀', realm: 'yokai', hp: 5600, atk: 490, def: 205, spd: 122 }],
        [{ name: '羅刹剣鬼', sigil: '刹', realm: 'yokai', hp: 6200, atk: 545, def: 212, spd: 126 }, { name: '炎獄大蛇', sigil: '蛇', realm: 'yokai', hp: 6600, atk: 520, def: 232, spd: 118 }],
        [{ name: '常世陰陽主・安倍影', sigil: '陰', realm: 'yokai', hp: 19500, atk: 620, def: 255, spd: 126, isBoss: true, skillName: '泰山府君祭・業炎', aoe: true }, { name: '羅刹剣鬼', sigil: '刹', realm: 'yokai', hp: 6400, atk: 560, def: 218, spd: 126 }]
      ]
    },
    // Area 4: Steam
    {
      id: 'st_4_1', code: '4-1', name: '歯車要塞・外郭', realm: 'steam', powerRec: 30000,
      relicSets: ['eternal_gear', 'iron_bastion'], relicTier: 4,
      rewards: { gold: 2800, exp: 2050, gemFirst: 260, gemLoop: 60, dust: 165 },
      waves: [
        [{ name: '真鍮機甲兵', sigil: '甲', realm: 'steam', hp: 7800, atk: 580, def: 290, spd: 108 }, { name: '蒸気砲台', sigil: '砲', realm: 'steam', hp: 6800, atk: 645, def: 250, spd: 114 }],
        [{ name: '錬金術兵', sigil: '錬', realm: 'steam', hp: 7400, atk: 640, def: 265, spd: 118 }, { name: '真鍮機甲兵', sigil: '甲', realm: 'steam', hp: 8200, atk: 600, def: 305, spd: 108 }],
        [{ name: '要塞防衛機・ギアノス', sigil: '砦', realm: 'steam', hp: 26000, atk: 740, def: 345, spd: 114, isBoss: true, skillName: '高圧蒸気破砕砲', aoe: true }, { name: '蒸気砲台', sigil: '砲', realm: 'steam', hp: 7200, atk: 665, def: 260, spd: 114 }]
      ]
    },
    {
      id: 'st_4_2', code: '4-2', name: '大時計炉の深層', realm: 'steam', powerRec: 39000,
      relicSets: ['eternal_gear', 'sky_blade'], relicTier: 4,
      rewards: { gold: 3650, exp: 2700, gemFirst: 280, gemLoop: 68, dust: 205 },
      waves: [
        [{ name: '時計塔番兵', sigil: '秒', realm: 'steam', hp: 9600, atk: 720, def: 340, spd: 120 }, { name: '絡繰鬼兵', sigil: '絡', realm: 'yokai', hp: 9200, atk: 770, def: 310, spd: 124 }],
        [{ name: '炉心制御機', sigil: '炉', realm: 'steam', hp: 10800, atk: 750, def: 375, spd: 116 }, { name: '時計塔番兵', sigil: '秒', realm: 'steam', hp: 9900, atk: 740, def: 350, spd: 122 }],
        [{ name: '時律機関・クロノスMk2', sigil: '時', realm: 'steam', hp: 34500, atk: 880, def: 410, spd: 122, isBoss: true, skillName: '刻限崩壊インパクト', aoe: true }, { name: '炉心制御機', sigil: '炉', realm: 'steam', hp: 11200, atk: 775, def: 385, spd: 116 }]
      ]
    },
    {
      id: 'st_4_3', code: '4-3', name: '機巧帝国の黄金炉', realm: 'steam', powerRec: 50000,
      relicSets: ['eternal_gear', 'cross_fusion'], relicTier: 5,
      rewards: { gold: 4700, exp: 3500, gemFirst: 400, gemLoop: 78, dust: 255 },
      waves: [
        [{ name: '黄金蒸気騎士', sigil: '黄', realm: 'steam', hp: 12800, atk: 880, def: 430, spd: 118 }, { name: '魔導蒸気砲', sigil: '爆', realm: 'arcadia', hp: 11800, atk: 940, def: 385, spd: 120 }],
        [{ name: '黄金蒸気騎士', sigil: '黄', realm: 'steam', hp: 13200, atk: 900, def: 445, spd: 120 }, { name: '量子歯車兵', sigil: '歯', realm: 'cyber', hp: 12200, atk: 960, def: 390, spd: 130 }],
        [{ name: '蒸気皇帝機・デウス', sigil: '帝', realm: 'steam', hp: 46500, atk: 1080, def: 490, spd: 120, isBoss: true, skillName: '黄金炉臨界解放', aoe: true }, { name: '魔導蒸気砲', sigil: '爆', realm: 'arcadia', hp: 12400, atk: 960, def: 395, spd: 120 }]
      ]
    },
    // Area 5: Astral & Multiverse Finale
    {
      id: 'st_5_1', code: '5-1', name: '星海への昇天階梯', realm: 'astral', powerRec: 65000,
      relicSets: ['astral_echo', 'quantum_overdrive'], relicTier: 5,
      rewards: { gold: 6100, exp: 4600, gemFirst: 320, gemLoop: 90, dust: 315 },
      waves: [
        [{ name: '星界の使徒', sigil: '使', realm: 'astral', hp: 16200, atk: 1120, def: 485, spd: 126 }, { name: '星界の使徒', sigil: '使', realm: 'astral', hp: 16200, atk: 1120, def: 485, spd: 126 }],
        [{ name: '虚空の観測者', sigil: '虚', realm: 'astral', hp: 18400, atk: 1210, def: 520, spd: 128 }, { name: '星屑の守護者', sigil: '星', realm: 'astral', hp: 19600, atk: 1150, def: 560, spd: 122 }],
        [{ name: '堕天熾天使・ルシフェル影', sigil: '堕', realm: 'astral', hp: 62000, atk: 1380, def: 590, spd: 128, isBoss: true, skillName: '暁星崩落の裁き', aoe: true }, { name: '虚空の観測者', sigil: '虚', realm: 'astral', hp: 18800, atk: 1240, def: 530, spd: 128 }]
      ]
    },
    {
      id: 'st_5_2', code: '5-2', name: '五界交錯の狭間', realm: 'astral', powerRec: 85000,
      relicSets: ['astral_echo', 'cross_fusion'], relicTier: 5,
      rewards: { gold: 8000, exp: 6100, gemFirst: 360, gemLoop: 105, dust: 390 },
      waves: [
        [{ name: '幻想の幻影騎士', sigil: '剣', realm: 'arcadia', hp: 22500, atk: 1380, def: 620, spd: 122 }, { name: '電脳の幻影狙撃', sigil: '電', realm: 'cyber', hp: 20500, atk: 1520, def: 540, spd: 134 }],
        [{ name: '常世の幻影鬼神', sigil: '妖', realm: 'yokai', hp: 23200, atk: 1490, def: 580, spd: 128 }, { name: '機巧の幻影巨兵', sigil: '機', realm: 'steam', hp: 26800, atk: 1360, def: 710, spd: 116 }],
        [{ name: '五界統括体・キメラコア', sigil: '界', realm: 'astral', hp: 84000, atk: 1720, def: 690, spd: 128, isBoss: true, skillName: '五界収束崩壊', aoe: true }, { name: '星界の使徒', sigil: '星', realm: 'astral', hp: 22000, atk: 1450, def: 590, spd: 126 }]
      ]
    },
    {
      id: 'st_5_3', code: '5-3', name: '終極・クロノ回廊最奥', realm: 'astral', powerRec: 115000,
      relicSets: ['astral_echo', 'cross_fusion'], relicTier: 5,
      rewards: { gold: 10800, exp: 8400, gemFirst: 600, gemLoop: 125, dust: 500 },
      waves: [
        [{ name: '創世の番人・α', sigil: 'α', realm: 'astral', hp: 29500, atk: 1820, def: 750, spd: 130 }, { name: '創世の番人・Ω', sigil: 'Ω', realm: 'astral', hp: 29500, atk: 1820, def: 750, spd: 130 }],
        [{ name: '星海巨竜', sigil: '星', realm: 'astral', hp: 38000, atk: 1960, def: 840, spd: 126 }, { name: '虚空の審判者', sigil: '審', realm: 'astral', hp: 34000, atk: 2040, def: 780, spd: 132 }],
        [{ name: '境界の調律神・エテルナ', sigil: '神', realm: 'astral', hp: 125000, atk: 2280, def: 880, spd: 132, isBoss: true, skillName: 'クロノ・レゾナンス終焉', aoe: true }]
      ]
    }
  ];

  // 5 High-Difficulty Raid Bosses (always accessible, farmable for Mythic relics & awakening cores)
  const BOSS_RAIDS = [
    {
      id: 'boss_arc', code: '討伐I', name: '終末古竜・バハムート零', realm: 'arcadia', powerRec: 8500,
      relicSets: ['sky_blade', 'iron_bastion'], relicTier: 3, guaranteedMinRarity: 3,
      rewards: { gold: 1400, exp: 900, gemFirst: 300, gemLoop: 45, dust: 140, coreChance: 0.65 },
      gimmick: '高防御と全体竜炎ブレス。破甲デバフや貫通攻撃が極めて有効。',
      waves: [[
        { name: '終末古竜・バハムート零', sigil: '覇', realm: 'arcadia', hp: 14500, atk: 295, def: 195, spd: 112, isBoss: true, skillName: '終末の竜炎咆哮', aoe: true }
      ]]
    },
    {
      id: 'boss_cyb', code: '討伐II', name: '軌道衛星神・デウスネット', realm: 'cyber', powerRec: 22000,
      relicSets: ['quantum_overdrive', 'swift_gale'], relicTier: 4, guaranteedMinRarity: 3,
      rewards: { gold: 2900, exp: 1950, gemFirst: 350, gemLoop: 65, dust: 240, coreChance: 0.8 },
      gimmick: '超高速行動と感電付与。剣魔界編成や全体障壁で耐え抜け。',
      waves: [[
        { name: '軌道衛星神・デウスネット', sigil: '神', realm: 'cyber', hp: 38000, atk: 610, def: 260, spd: 136, isBoss: true, skillName: '衛星軌道焼却', aoe: true },
        { name: '衛星防壁ビット', sigil: '護', realm: 'cyber', hp: 11500, atk: 420, def: 240, spd: 124 }
      ]]
    },
    {
      id: 'boss_yok', code: '討伐III', name: '大妖魔・八岐紅蓮蛇', realm: 'yokai', powerRec: 45000,
      relicSets: ['crimson_pact', 'cross_fusion'], relicTier: 4, guaranteedMinRarity: 4,
      rewards: { gold: 5200, exp: 3600, gemFirst: 420, gemLoop: 88, dust: 380, coreChance: 1.0 },
      gimmick: '強烈な燃焼と自己再生。浄化回復か超高火力での短期決戦が鍵。',
      waves: [[
        { name: '大妖魔・八岐紅蓮蛇', sigil: '蛇', realm: 'yokai', hp: 78000, atk: 1040, def: 420, spd: 126, isBoss: true, skillName: '八岐紅蓮大災', aoe: true }
      ]]
    },
    {
      id: 'boss_stm', code: '討伐IV', name: '永久機関竜・メカリヴァイアサン', realm: 'steam', powerRec: 78000,
      relicSets: ['eternal_gear', 'iron_bastion'], relicTier: 5, guaranteedMinRarity: 4,
      rewards: { gold: 8800, exp: 6400, gemFirst: 500, gemLoop: 115, dust: 540, coreChance: 1.0 },
      gimmick: 'ターン経過で攻防が激増する鉄壁巨竜。電脳貫通部隊で一気に撃破せよ。',
      waves: [[
        { name: '永久機関竜・メカリヴァイアサン', sigil: '巨', realm: 'steam', hp: 142000, atk: 1580, def: 690, spd: 118, isBoss: true, skillName: '蒸気津波キャノン', aoe: true }
      ]]
    },
    {
      id: 'boss_ast', code: '討伐V', name: '虚空星獣・アザトース核', realm: 'astral', powerRec: 135000,
      relicSets: ['astral_echo', 'cross_fusion'], relicTier: 5, guaranteedMinRarity: 4,
      rewards: { gold: 14500, exp: 10500, gemFirst: 800, gemLoop: 160, dust: 780, coreChance: 1.0 },
      gimmick: '全属性と激突する最終討伐標的。星虹遺物の最高峰ドロップ率を誇る。',
      waves: [[
        { name: '虚空星獣・アザトース核', sigil: '虚', realm: 'astral', hp: 245000, atk: 2480, def: 920, spd: 134, isBoss: true, skillName: '銀河終焉パルス', aoe: true },
        { name: '星界の残滓', sigil: '残', realm: 'astral', hp: 58000, atk: 1720, def: 640, spd: 128 }
      ]]
    }
  ];

  // Infinite Corridor dynamic stage generator (Floor 1 to infinity)
  const REALM_ORDER = ['arcadia', 'cyber', 'yokai', 'steam', 'astral'];
  const FLOOR_TITLES = ['歪みの層', '交錯の層', '深淵の層', '星環の層', '極点の層'];

  function generateCorridorStage(floor) {
    const f = Math.max(1, Math.floor(floor));
    const realm = REALM_ORDER[(f - 1) % REALM_ORDER.length];
    const isBossFloor = f % 5 === 0;
    const scale = Math.pow(1.135, f - 1);
    const baseHp = Math.round(950 * scale * (isBossFloor ? 1.85 : 1.0));
    const baseAtk = Math.round(92 * Math.pow(1.115, f - 1) * (isBossFloor ? 1.2 : 1.0));
    const baseDef = Math.round(45 * Math.pow(1.105, f - 1));
    const baseSpd = Math.min(155, Math.round(102 + f * 0.9));

    const enemies = [];
    if (isBossFloor) {
      enemies.push({
        name: `回廊守護者・第${f}層主`,
        sigil: '主',
        realm,
        hp: baseHp * 2,
        atk: Math.round(baseAtk * 1.18),
        def: Math.round(baseDef * 1.25),
        spd: baseSpd + 4,
        isBoss: true,
        skillName: '次元崩壊波動',
        aoe: true
      });
      enemies.push({
        name: `境界従者・${Data.REALMS[realm].kanji}`,
        sigil: Data.REALMS[realm].kanji,
        realm: REALM_ORDER[f % REALM_ORDER.length],
        hp: Math.round(baseHp * 0.72),
        atk: Math.round(baseAtk * 0.88),
        def: baseDef,
        spd: baseSpd
      });
    } else {
      const count = f >= 12 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const r = REALM_ORDER[(f + i) % REALM_ORDER.length];
        enemies.push({
          name: `回廊尖兵・${Data.REALMS[r].name}`,
          sigil: Data.REALMS[r].kanji,
          realm: r,
          hp: Math.round(baseHp * (0.9 + i * 0.1)),
          atk: Math.round(baseAtk * (0.95 + i * 0.05)),
          def: baseDef,
          spd: baseSpd + i * 2
        });
      }
    }

    const tier = Math.min(5, Math.max(1, Math.ceil(f / 7)));
    return {
      id: `corridor_${f}`,
      code: `回廊${f}F`,
      name: `無限回廊 第${f}層【${FLOOR_TITLES[(f - 1) % FLOOR_TITLES.length]}】`,
      realm,
      isCorridor: true,
      floor: f,
      powerRec: Math.round(2400 * Math.pow(1.145, f - 1)),
      relicSets: ['cross_fusion', 'astral_echo', 'sky_blade', 'quantum_overdrive', 'crimson_pact', 'eternal_gear'],
      relicTier: tier,
      guaranteedMinRarity: isBossFloor ? Math.min(4, 2 + Math.floor(f / 10)) : 1,
      rewards: {
        gold: Math.round(260 * Math.pow(1.11, f - 1)),
        exp: Math.round(180 * Math.pow(1.10, f - 1)),
        gemFirst: isBossFloor ? 160 + f * 6 : 45 + f * 2,
        gemLoop: 18 + Math.min(140, f * 2),
        dust: Math.round(25 * Math.pow(1.09, f - 1)),
        coreChance: isBossFloor ? 0.5 : 0.08
      },
      waves: [enemies]
    };
  }

  const STAGE_MAP = Object.create(null);
  CAMPAIGN_STAGES.forEach((s) => { STAGE_MAP[s.id] = s; });
  BOSS_RAIDS.forEach((s) => { STAGE_MAP[s.id] = s; });

  function getStageById(id) {
    if (STAGE_MAP[id]) return STAGE_MAP[id];
    if (typeof id === 'string' && id.startsWith('corridor_')) {
      const f = parseInt(id.slice(9), 10);
      if (Number.isFinite(f) && f >= 1) return generateCorridorStage(f);
    }
    return CAMPAIGN_STAGES[0];
  }

  Data.CAMPAIGN_STAGES = CAMPAIGN_STAGES;
  Data.BOSS_RAIDS = BOSS_RAIDS;
  Data.generateCorridorStage = generateCorridorStage;
  Data.getStageById = getStageById;
})(window);
