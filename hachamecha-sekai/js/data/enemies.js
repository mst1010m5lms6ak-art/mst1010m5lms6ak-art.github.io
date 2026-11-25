(function () {
  'use strict';

  const HS = window.HS;

  // All Enemies with Skills & Lore (Normal Mobs, Intruders, Area Bosses, Tower Guardians, Raid Bosses, Constraint Bosses)
  const ENEMIES = [
    // ===== Area 1: 境界の廃都市 (Normal + Intruder + Boss) =====
    {
      id: 'e_a1_slime', name: 'アスファルト魔泥', kana: 'あすふぁるとまでい', category: 'normal',
      element: 'none', races: ['demon'], role: 'tank',
      base: { hp: 460, atk: 74, def: 46, spd: 86 },
      skills: [
        { name: '粘着体当たり', target: 'single', ct: 0, kind: 'dmg', power: 1.00 },
        { name: '舗装硬化', target: 'self', ct: 3, kind: 'buff', effects: [{ stat: 'defUp', chance: 1.0, dur: 2 }] }
      ],
      lore: '割れた道路から滲み出た魔力とアスファルトが混ざり合った泥状の魔物。意外に硬い。'
    },
    {
      id: 'e_a1_drone', name: '暴走信号ドローン', kana: 'ぼうそうしんごうどろーん', category: 'normal',
      element: 'wind', races: ['machine'], role: 'dealer',
      base: { hp: 380, atk: 90, def: 36, spd: 108 },
      skills: [
        { name: '警告レーザー', target: 'single', ct: 0, kind: 'dmg', power: 1.04 },
        { name: '赤信号フラッシュ', target: 'range', ct: 3, kind: 'dmg', power: 1.18, effects: [{ stat: 'blind', chance: 0.40, dur: 2 }] }
      ],
      lore: '交通整理AIが異界ノイズを受信して暴走した飛行ドローン。点滅しながら体当たりしてくる。'
    },
    {
      id: 'e_a1_hound', name: '廃都の野良魔犬', kana: 'はいとののらまけん', category: 'normal',
      element: 'fire', races: ['beast'], role: 'dealer',
      base: { hp: 420, atk: 94, def: 40, spd: 102 },
      skills: [
        { name: '焦げ牙噛み', target: 'single', ct: 0, kind: 'dmg', power: 1.08 },
        { name: '廃街の遠吠え', target: 'allyAll', ct: 4, kind: 'buff', effects: [{ stat: 'atkUp', chance: 1.0, dur: 2 }] }
      ],
      lore: '廃ビルの隙間に縄張りを持つ魔獣犬。火花を散らしながら群れで襲いかかる。'
    },
    {
      id: 'e_a1_boss', name: '境界番人クロノギア', kana: 'きょうかいばんにんくろのぎあ', category: 'boss',
      element: 'none', races: ['machine'], role: 'tank',
      base: { hp: 1680, atk: 128, def: 82, spd: 100 },
      skills: [
        { name: '歯車重撃', target: 'single', ct: 0, kind: 'dmg', power: 1.10 },
        { name: '検問レーザー網', target: 'range', ct: 3, kind: 'dmg', power: 1.32, effects: [{ stat: 'spdDown', chance: 0.65, dur: 2 }] },
        { name: '境界封鎖砲', target: 'all', ct: 4, kind: 'dmg', power: 1.55, effects: [{ stat: 'defDown', chance: 0.60, dur: 2 }] }
      ],
      lore: '廃都市の中央ゲートを守護する巨大な時計仕掛けの自動警備機。通過者を容赦なく排除する。'
    },

    // ===== Area 2: 紅蓮機甲溶炉 =====
    {
      id: 'e_a2_imp', name: '溶炉の小炎魔', kana: 'ようろのしょうえんま', category: 'normal',
      element: 'fire', races: ['demon'], role: 'dealer',
      base: { hp: 620, atk: 128, def: 58, spd: 106 },
      skills: [
        { name: '火の粉投げ', target: 'single', ct: 0, kind: 'dmg', power: 1.06, effects: [{ stat: 'burn', chance: 0.35, dur: 2 }] },
        { name: '炉内爆破', target: 'range', ct: 3, kind: 'dmg', power: 1.32, effects: [{ stat: 'burn', chance: 0.65, dur: 2 }] }
      ],
      lore: '溶鉱炉の熱気を浴びて生まれた陽気な小悪魔。スパナと火球を交互に投げてくる。'
    },
    {
      id: 'e_a2_golem', name: '赤熱プレス機兵', kana: 'せきねつぷれすきへい', category: 'normal',
      element: 'fire', races: ['machine'], role: 'tank',
      base: { hp: 820, atk: 112, def: 84, spd: 88 },
      skills: [
        { name: '油圧ハンマー', target: 'single', ct: 0, kind: 'dmg', power: 1.08 },
        { name: '蒸気隔壁', target: 'allyAll', ct: 3, kind: 'shield', shieldPct: 0.14 }
      ],
      lore: '高温鍛造用の作業ロボットが魔力を帯びて自立稼働した姿。装甲が常に真っ赤に熱せられている。'
    },
    {
      id: 'e_a2_drake', name: '火炉の幼竜', kana: 'かろのようりゅう', category: 'normal',
      element: 'fire', races: ['dragon'], role: 'dealer',
      base: { hp: 700, atk: 136, def: 68, spd: 104 },
      skills: [
        { name: '灼熱噛み', target: 'single', ct: 0, kind: 'dmg', power: 1.12 },
        { name: '紅炎ブレス', target: 'all', ct: 4, kind: 'dmg', power: 1.28, effects: [{ stat: 'burn', chance: 0.55, dur: 2 }] }
      ],
      lore: '溶炉の排熱ダクトを巣にする幼竜。まだ小柄だが吐息の火力は工業バーナーを上回る。'
    },
    {
      id: 'e_a2_boss', name: '溶炉覇機ヴァルカン', kana: 'ようろはきヴぁるかん', category: 'boss',
      element: 'fire', races: ['dragon', 'machine'], role: 'dealer',
      base: { hp: 2850, atk: 186, def: 112, spd: 106 },
      skills: [
        { name: '溶鉄爪撃', target: 'single', ct: 0, kind: 'dmg', power: 1.14, effects: [{ stat: 'burn', chance: 0.50, dur: 2 }] },
        { name: '超高熱掃射', target: 'range', ct: 3, kind: 'dmg', power: 1.48, effects: [{ stat: 'burn', chance: 0.80, dur: 2 }] },
        { name: 'メルトダウン砲', target: 'all', ct: 4, kind: 'dmg', power: 1.76, effects: [{ stat: 'defDown', chance: 0.70, dur: 2 }] }
      ],
      lore: '紅蓮機甲溶炉の主炉心を背負う竜型重機。稼働音が響くだけで工場区画全体が揺れる。'
    },

    // ===== Area 3: 蒼穹の水晶海 =====
    {
      id: 'e_a3_nymph', name: '水晶海の迷妖精', kana: 'すいしょうかいのにんふ', category: 'normal',
      element: 'water', races: ['fairy'], role: 'healer',
      base: { hp: 820, atk: 144, def: 82, spd: 112 },
      skills: [
        { name: '水晶の雫', target: 'single', ct: 0, kind: 'dmg', power: 1.02 },
        { name: '蒼海の癒波', target: 'allyAll', ct: 3, kind: 'heal', power: 1.25 }
      ],
      lore: '透き通る水晶の海面を漂う妖精。仲間が傷つくと透き通った歌声で回復を行う。'
    },
    {
      id: 'e_a3_serpent', name: '碧鱗の海蛇竜', kana: 'へきりんのうみへびりゅう', category: 'normal',
      element: 'water', races: ['dragon'], role: 'dealer',
      base: { hp: 960, atk: 168, def: 90, spd: 108 },
      skills: [
        { name: '氷牙噛み', target: 'single', ct: 0, kind: 'dmg', power: 1.10 },
        { name: '凍結潮波', target: 'range', ct: 3, kind: 'dmg', power: 1.38, effects: [{ stat: 'freeze', chance: 0.45, dur: 1 }] }
      ],
      lore: '神殿の柱に巻きついて眠る細長い海竜。冷水ブレスで侵入者の動きを凍らせる。'
    },
    {
      id: 'e_a3_crab', name: '結晶甲殻魔獣', kana: 'けっしょうこうかくまじゅう', category: 'normal',
      element: 'water', races: ['beast'], role: 'tank',
      base: { hp: 1120, atk: 152, def: 114, spd: 92 },
      skills: [
        { name: '水晶挟み', target: 'single', ct: 0, kind: 'dmg', power: 1.12 },
        { name: '蒼甲ガード', target: 'self', ct: 3, kind: 'shield', shieldPct: 0.22, effects: [{ stat: 'taunt', chance: 1.0, dur: 2 }] }
      ],
      lore: '背中に巨大な青水晶を背負った大蟹。ハサミの衝撃波だけで岩盤を割り砕く。'
    },
    {
      id: 'e_a3_boss', name: '海神殿の蒼竜姫', kana: 'かいしんでんのそうりゅうひめ', category: 'boss',
      element: 'water', races: ['dragon', 'fairy'], role: 'supporter',
      base: { hp: 4200, atk: 224, def: 142, spd: 112 },
      skills: [
        { name: '蒼槍突き', target: 'single', ct: 0, kind: 'dmg', power: 1.14 },
        { name: '深海氷結陣', target: 'range', ct: 3, kind: 'dmg', power: 1.50, effects: [{ stat: 'freeze', chance: 0.65, dur: 1 }, { stat: 'spdDown', chance: 0.75, dur: 2 }] },
        { name: '水晶大津波', target: 'all', ct: 4, kind: 'dmg', power: 1.82, selfHealPct: 0.08 }
      ],
      lore: '沈没神殿の玉座を守る蒼水晶の化身。凍てつく大波で侵入者を静かに海底へ誘う。'
    },

    // ===== Area 4: 翠嵐の獣王峡 =====
    {
      id: 'e_a4_wolf', name: '疾風の峡谷狼', kana: 'しっぷうのきょうこくろう', category: 'normal',
      element: 'wind', races: ['beast'], role: 'dealer',
      base: { hp: 1180, atk: 214, def: 102, spd: 126 },
      skills: [
        { name: '旋風噛み', target: 'single', ct: 0, kind: 'dmg', power: 1.14 },
        { name: '連牙急襲', target: 'range', ct: 3, kind: 'dmg', power: 1.48, effects: [{ stat: 'vuln', chance: 0.55, dur: 2 }] }
      ],
      lore: '切り立った峡谷を風に乗って駆ける白緑の狼。驚異的な速度で先手を奪う。'
    },
    {
      id: 'e_a4_shaman', name: '古代遺跡の風術士', kana: 'こだいいせきのふうじゅつし', category: 'normal',
      element: 'wind', races: ['human'], role: 'supporter',
      base: { hp: 1120, atk: 196, def: 108, spd: 122 },
      skills: [
        { name: '風呪弾', target: 'single', ct: 0, kind: 'dmg', power: 1.04 },
        { name: '嵐の戦太鼓', target: 'allyAll', ct: 3, kind: 'buff', effects: [{ stat: 'spdUp', chance: 1.0, dur: 2 }, { stat: 'atkUp', chance: 1.0, dur: 2 }] }
      ],
      lore: '獣王峡の石碑を守る風の術士。太鼓のリズムで味方の魔獣を狂気的な速度へ加速させる。'
    },
    {
      id: 'e_a4_golem', name: '遺跡の風車巨兵', kana: 'いせきのふうしゃきょへい', category: 'normal',
      element: 'wind', races: ['machine'], role: 'tank',
      base: { hp: 1460, atk: 198, def: 136, spd: 102 },
      skills: [
        { name: '回転翼打撃', target: 'single', ct: 0, kind: 'dmg', power: 1.10 },
        { name: '竜巻防壁', target: 'all', ct: 4, kind: 'dmg', power: 1.32, effects: [{ stat: 'blind', chance: 0.50, dur: 2 }] }
      ],
      lore: '背中の巨大風車で魔力を発電する古代機械兵。砂塵を巻き上げて視界を奪う。'
    },
    {
      id: 'e_a4_boss', name: '翠嵐獣王ガイオン', kana: 'すいらんじゅうおうがいおん', category: 'boss',
      element: 'wind', races: ['beast'], role: 'dealer',
      base: { hp: 5900, atk: 276, def: 168, spd: 124 },
      skills: [
        { name: '嵐王拳', target: 'single', ct: 0, kind: 'dmg', power: 1.18 },
        { name: '裂空咆哮波', target: 'all', ct: 3, kind: 'dmg', power: 1.56, effects: [{ stat: 'spdDown', chance: 0.70, dur: 2 }, { stat: 'atkUp', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '翠嵐絶界斬', target: 'range', ct: 4, kind: 'dmg', power: 2.10, effects: [{ stat: 'vuln', chance: 0.75, dur: 2 }] }
      ],
      lore: '獣王峡を千年にわたり治める嵐の大獅子。その一喝は谷底の岩山を真っ二つに引き裂く。'
    },

    // ===== Area 5: 閃光の天界回廊 =====
    {
      id: 'e_a5_valk', name: '星間回廊の白翼衛', kana: 'せいかんかいろうのはくよくえい', category: 'normal',
      element: 'light', races: ['god'], role: 'dealer',
      base: { hp: 1520, atk: 266, def: 146, spd: 120 },
      skills: [
        { name: '光槍突き', target: 'single', ct: 0, kind: 'dmg', power: 1.14 },
        { name: '閃光十字斬', target: 'range', ct: 3, kind: 'dmg', power: 1.58, effects: [{ stat: 'blind', chance: 0.50, dur: 2 }] }
      ],
      lore: '星間要塞の白亜回廊を巡回する神族の槍兵。秩序を乱す侵入者へ精密な光槍を振るう。'
    },
    {
      id: 'e_a5_turret', name: '恒星集光タレット', kana: 'こうせいしゅうこうたれっと', category: 'normal',
      element: 'light', races: ['machine'], role: 'supporter',
      base: { hp: 1480, atk: 248, def: 154, spd: 112 },
      skills: [
        { name: '集光パルス', target: 'single', ct: 0, kind: 'dmg', power: 1.08 },
        { name: '光幕照射', target: 'allyAll', ct: 3, kind: 'shield', shieldPct: 0.16, effects: [{ stat: 'critUp', chance: 1.0, dur: 2 }] }
      ],
      lore: '星光を集めてエネルギーへ変換する浮遊砲台。周囲の天界兵へ強固な光学シールドを供給する。'
    },
    {
      id: 'e_a5_seraph', name: '光輪の聖歌妖精', kana: 'こうりんのせいかようせい', category: 'normal',
      element: 'light', races: ['fairy'], role: 'healer',
      base: { hp: 1420, atk: 238, def: 138, spd: 122 },
      skills: [
        { name: '星粒の光弾', target: 'single', ct: 0, kind: 'dmg', power: 1.04 },
        { name: '天界の聖歌', target: 'allyAll', ct: 3, kind: 'heal', power: 1.42, effects: [{ stat: 'defUp', chance: 1.0, dur: 2 }] }
      ],
      lore: '天界の鐘楼に住む光輪の妖精。澄み渡る和音で味方の損傷を瞬く間に修復する。'
    },
    {
      id: 'e_a5_boss', name: '天穹熾天使メトロン', kana: 'てんきゅうしてんしめとろん', category: 'boss',
      element: 'light', races: ['god', 'machine'], role: 'supporter',
      base: { hp: 8200, atk: 332, def: 204, spd: 122 },
      skills: [
        { name: '審判光刃', target: 'single', ct: 0, kind: 'dmg', power: 1.18 },
        { name: '星界結界展開', target: 'allyAll', ct: 3, kind: 'shield', shieldPct: 0.18, effects: [{ stat: 'atkUp', chance: 1.0, dur: 2 }, { stat: 'defUp', chance: 1.0, dur: 2 }] },
        { name: '天穹審判砲', target: 'all', ct: 4, kind: 'dmg', power: 2.02, effects: [{ stat: 'blind', chance: 0.65, dur: 2 }] }
      ],
      lore: '神の翼と星間兵装を兼ね備えた天界回廊の総司令官。白光の奔流で異分子を浄化する。'
    },

    // ===== Area 6: 終焉の混沌深淵 =====
    {
      id: 'e_a6_reaper', name: '深淵の虚無鎌魔', kana: 'しんえんのきょむかまま', category: 'normal',
      element: 'dark', races: ['demon'], role: 'dealer',
      base: { hp: 1960, atk: 326, def: 172, spd: 124 },
      skills: [
        { name: '黒鎌一閃', target: 'single', ct: 0, kind: 'dmg', power: 1.18, effects: [{ stat: 'poison', chance: 0.45, dur: 2 }] },
        { name: '魂刈り旋斬', target: 'range', ct: 3, kind: 'dmg', power: 1.66, effects: [{ stat: 'defDown', chance: 0.65, dur: 2 }] }
      ],
      lore: '混沌の裂け目を徘徊する死神風の魔物。異世界の残骸を刈り取り続けて力を増している。'
    },
    {
      id: 'e_a6_dragon', name: '蝕界の黒魔竜', kana: 'しょっかいのこくまりゅう', category: 'normal',
      element: 'dark', races: ['dragon', 'demon'], role: 'tank',
      base: { hp: 2380, atk: 304, def: 198, spd: 110 },
      skills: [
        { name: '黒竜尾撃', target: 'single', ct: 0, kind: 'dmg', power: 1.14 },
        { name: '深淵瘴気波', target: 'all', ct: 4, kind: 'dmg', power: 1.54, effects: [{ stat: 'atkDown', chance: 0.65, dur: 2 }, { stat: 'poison', chance: 0.65, dur: 2 }] }
      ],
      lore: '闇に呑まれた古竜の成れの果て。鱗から滴る瘴気が周囲の空間ごと腐食させる。'
    },
    {
      id: 'e_a6_oracle', name: '混沌詠唱者ノクト', kana: 'こんとんえいしょうしゃのくと', category: 'normal',
      element: 'dark', races: ['human', 'demon'], role: 'supporter',
      base: { hp: 1840, atk: 312, def: 162, spd: 128 },
      skills: [
        { name: '闇の呪弾', target: 'single', ct: 0, kind: 'dmg', power: 1.10 },
        { name: '沈黙の深淵鐘', target: 'all', ct: 3, kind: 'dmg', power: 1.46, effects: [{ stat: 'silence', chance: 0.50, dur: 1 }, { stat: 'vuln', chance: 0.70, dur: 2 }] }
      ],
      lore: '混沌深淵の囁きを書き写す魔導士。禍々しい詠唱で敵の技を封じ込める。'
    },
    {
      id: 'e_a6_boss', name: '終焉混沌主カオス', kana: 'しゅうえんこんとんしゅかおす', category: 'boss',
      element: 'dark', races: ['god', 'demon'], role: 'dealer',
      base: { hp: 11800, atk: 398, def: 236, spd: 126 },
      skills: [
        { name: '混沌裂斬', target: 'range', ct: 0, kind: 'dmg', power: 1.15 },
        { name: '異界崩壊波', target: 'all', ct: 3, kind: 'dmg', power: 1.78, effects: [{ stat: 'defDown', chance: 0.75, dur: 2 }, { stat: 'poison', chance: 0.75, dur: 2 }] },
        { name: '終焉ブラックホール', target: 'all', ct: 4, kind: 'dmg', power: 2.30, effects: [{ stat: 'vuln', chance: 0.85, dur: 2 }, { stat: 'stun', chance: 0.30, dur: 1 }] }
      ],
      lore: 'あらゆる異世界を混ぜ合わせた張本人とされる混沌の主。笑いながら法則を捻じ曲げて遊ぶ。'
    },

    // ===== INTRUDER ENEMIES (乱入敵 — 非ボスWAVEで出現・高品質ドロップ枠) =====
    {
      id: 'e_int_gold', name: '黄金次元スライム', kana: 'おうごんじげんすらいむ', category: 'intruder',
      element: 'light', races: ['demon'], role: 'supporter',
      base: { hp: 920, atk: 122, def: 96, spd: 132 },
      skills: [
        { name: '黄金コイン投げ', target: 'single', ct: 0, kind: 'dmg', power: 1.05 },
        { name: '眩惑ゴールド波', target: 'all', ct: 3, kind: 'dmg', power: 1.24, effects: [{ stat: 'blind', chance: 0.50, dur: 1 }] }
      ],
      lore: '世界の狭間から突然転がり込んでくる黄金色の珍魔物。倒すと莫大な世界貨と良質な装備を落とす。'
    },
    {
      id: 'e_int_knight', name: '次元乱入者ブレイド', kana: 'じげんらんにゅうしゃぶれいど', category: 'intruder',
      element: 'none', races: ['human', 'machine'], role: 'dealer',
      base: { hp: 1340, atk: 196, def: 110, spd: 134 },
      skills: [
        { name: '次元居合', target: 'single', ct: 0, kind: 'dmg', power: 1.24 },
        { name: '空間連斬', target: 'range', ct: 3, kind: 'dmg', power: 1.68, effects: [{ stat: 'defDown', chance: 0.60, dur: 2 }] }
      ],
      lore: '強者を求めて次元の裂け目から飛び込んでくる謎の機甲剣士。戦利品として異界乱入者装備を残す。'
    },
    {
      id: 'e_int_dragon', name: '虹彩の迷子星竜', kana: 'こうさいのまいごせいりゅう', category: 'intruder',
      element: 'fire', races: ['dragon', 'fairy'], role: 'dealer',
      base: { hp: 1520, atk: 204, def: 118, spd: 128 },
      skills: [
        { name: '虹炎ブレス', target: 'range', ct: 0, kind: 'dmg', power: 1.12 },
        { name: '星屑乱舞', target: 'all', ct: 3, kind: 'dmg', power: 1.56, effects: [{ stat: 'burn', chance: 0.65, dur: 2 }] }
      ],
      lore: '散歩の途中で別の世界へ迷い込んでしまった七色の星竜。落とす鱗は極上品質の装備へと姿を変える。'
    },

    // ===== TOWER GUARDIANS & APEX BOSSES =====
    {
      id: 'e_tw_guard1', name: '塔守の白銀巨神', kana: 'とうしゅのはくぎんきょしん', category: 'tower',
      element: 'light', races: ['god', 'machine'], role: 'tank',
      base: { hp: 3600, atk: 225, def: 168, spd: 112 },
      skills: [
        { name: '巨神光拳', target: 'single', ct: 0, kind: 'dmg', power: 1.16 },
        { name: '試練の聖盾', target: 'allyAll', ct: 3, kind: 'shield', shieldPct: 0.20, effects: [{ stat: 'defUp', chance: 1.0, dur: 2 }] },
        { name: '天罰衝撃波', target: 'all', ct: 4, kind: 'dmg', power: 1.88 }
      ],
      lore: '異界塔の節目階層を守護する白銀の機械巨神。半端な編成では傷ひとつ付けられない。'
    },
    {
      id: 'e_tw_guard2', name: '塔守の双頭魔竜', kana: 'とうしゅのそうとうまりゅう', category: 'tower',
      element: 'dark', races: ['dragon', 'demon'], role: 'dealer',
      base: { hp: 3900, atk: 256, def: 154, spd: 118 },
      skills: [
        { name: '双頭咬撃', target: 'range', ct: 0, kind: 'dmg', power: 1.14 },
        { name: '炎闇二重ブレス', target: 'all', ct: 3, kind: 'dmg', power: 1.72, effects: [{ stat: 'burn', chance: 0.70, dur: 2 }, { stat: 'poison', chance: 0.70, dur: 2 }] },
        { name: '破滅の咆哮', target: 'all', ct: 4, kind: 'dmg', power: 2.18, effects: [{ stat: 'vuln', chance: 0.80, dur: 2 }] }
      ],
      lore: '異界塔の深層に棲む双頭の魔竜。二つの頭が間髪入れず異常と破壊を浴びせてくる。'
    },
    {
      id: 'e_tw1_100', name: '天竜神アウレリア・真', kana: 'てんりゅうしんあうれりあしん', category: 'tower',
      element: 'light', races: ['dragon', 'god'], role: 'dealer',
      base: { hp: 34000, atk: 620, def: 340, spd: 132 },
      skills: [
        { name: '天竜閃光刃', target: 'range', ct: 0, kind: 'dmg', power: 1.24 },
        { name: '黄金聖域展開', target: 'self', ct: 3, kind: 'shield', shieldPct: 0.14, effects: [{ stat: 'atkUp', chance: 1.0, dur: 2 }, { stat: 'defUp', chance: 1.0, dur: 2 }] },
        { name: '創世天竜破・極', target: 'all', ct: 4, kind: 'dmg', power: 2.45, effects: [{ stat: 'defDown', chance: 0.80, dur: 2 }] }
      ],
      lore: '異界塔Ⅰの100階に座す白金の天竜神。すべての試練を突破した者のみが対峙を許される。'
    },
    {
      id: 'e_tw2_100', name: '終焉機構オメガ・零', kana: 'しゅうえんきこうおめがぜろ', category: 'tower',
      element: 'dark', races: ['demon', 'machine'], role: 'dealer',
      base: { hp: 62000, atk: 880, def: 460, spd: 138 },
      skills: [
        { name: '虚無演算斬', target: 'range', ct: 0, kind: 'dmg', power: 1.30, effects: [{ stat: 'vuln', chance: 0.65, dur: 2 }] },
        { name: '法則初期化', target: 'all', ct: 3, kind: 'dmg', power: 2.10, effects: [{ stat: 'silence', chance: 0.60, dur: 1 }, { stat: 'atkDown', chance: 0.80, dur: 2 }] },
        { name: '終末消去砲・零', target: 'all', ct: 4, kind: 'dmg', power: 2.80, effects: [{ stat: 'poison', chance: 0.90, dur: 2 }, { stat: 'burn', chance: 0.90, dur: 2 }] }
      ],
      lore: '異界塔Ⅱの100階で稼働し続ける終焉の演算機。その全砲門を乗り越えた時、新たな伝説が始まる。'
    },

    // ===== 6 ELEMENT RAID BOSSES (High HP, Raid-Exclusive Set Drops) =====
    {
      id: 'e_raid_fire', name: '業火覇竜イグニオン', kana: 'ごうかはりゅういぐにおん', category: 'raid',
      element: 'fire', races: ['dragon'], role: 'dealer',
      base: { hp: 22000, atk: 245, def: 130, spd: 110 },
      skills: [
        { name: '業火の竜爪', target: 'range', ct: 0, kind: 'dmg', power: 1.15, effects: [{ stat: 'burn', chance: 0.55, dur: 2 }] },
        { name: '紅蓮焦土ブレス', target: 'all', ct: 3, kind: 'dmg', power: 1.68, effects: [{ stat: 'burn', chance: 0.90, dur: 3 }, { stat: 'defDown', chance: 0.70, dur: 2 }] },
        { name: '覇竜業火獄', target: 'all', ct: 4, kind: 'dmg', power: 2.25, effects: [{ stat: 'atkUp', chance: 1.0, dur: 2, onSelf: true }] }
      ],
      lore: '炎界の深淵から現れた巨大な業火覇竜。桁外れの耐久力と焼き尽くす火傷で挑戦者を試す。'
    },
    {
      id: 'e_raid_water', name: '深海覇皇リヴァイア', kana: 'しんかいはおうりヴぁいあ', category: 'raid',
      element: 'water', races: ['dragon', 'god'], role: 'tank',
      base: { hp: 26000, atk: 220, def: 155, spd: 106 },
      skills: [
        { name: '深海渦潮撃', target: 'range', ct: 0, kind: 'dmg', power: 1.12 },
        { name: '氷結大海嘯', target: 'all', ct: 3, kind: 'dmg', power: 1.62, effects: [{ stat: 'freeze', chance: 0.55, dur: 1 }, { stat: 'spdDown', chance: 0.80, dur: 2 }] },
        { name: '海皇再生壁', target: 'self', ct: 4, kind: 'shield', shieldPct: 0.12, selfHealPct: 0.06, effects: [{ stat: 'defUp', chance: 1.0, dur: 2 }] }
      ],
      lore: '七つの異界海を統べる深海の覇皇。凍てつく大波と強固な海流障壁を突破する火力が求められる。'
    },
    {
      id: 'e_raid_wind', name: '神風天翔ゼフィロス', kana: 'かみかぜてんしょうぜふぃろす', category: 'raid',
      element: 'wind', races: ['beast', 'god'], role: 'dealer',
      base: { hp: 21000, atk: 242, def: 122, spd: 132 },
      skills: [
        { name: '神風翼刃', target: 'single', ct: 0, kind: 'dmg', power: 1.20, selfAtb: 0.18 },
        { name: '大旋風ストーム', target: 'all', ct: 3, kind: 'dmg', power: 1.66, effects: [{ stat: 'blind', chance: 0.60, dur: 2 }, { stat: 'spdUp', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '天翔絶嵐波', target: 'all', ct: 4, kind: 'dmg', power: 2.15, effects: [{ stat: 'vuln', chance: 0.75, dur: 2 }] }
      ],
      lore: '成層圏を駆け巡る神風の巨翼獣。凄まじい行動速度で連続攻撃を仕掛けてくる。'
    },
    {
      id: 'e_raid_light', name: '天穹審判セラフィム', kana: 'てんきゅうしんぱんせらふぃむ', category: 'raid',
      element: 'light', races: ['god', 'machine'], role: 'supporter',
      base: { hp: 24500, atk: 248, def: 152, spd: 116 },
      skills: [
        { name: '熾天光槍', target: 'range', ct: 0, kind: 'dmg', power: 1.14 },
        { name: '聖域光輪陣', target: 'self', ct: 3, kind: 'shield', shieldPct: 0.11, effects: [{ stat: 'atkUp', chance: 1.0, dur: 2 }, { stat: 'critUp', chance: 1.0, dur: 2 }] },
        { name: '天穹最終審判', target: 'all', ct: 4, kind: 'dmg', power: 2.24, effects: [{ stat: 'blind', chance: 0.70, dur: 2 }] }
      ],
      lore: '六枚の光翼を展開する星間審判天使。眩い光輪障壁と全体光砲で挑戦者を裁く。'
    },
    {
      id: 'e_raid_dark', name: '永劫虚無アビスロード', kana: 'えいごうきょむあびすろーど', category: 'raid',
      element: 'dark', races: ['demon'], role: 'dealer',
      base: { hp: 24000, atk: 262, def: 138, spd: 118 },
      skills: [
        { name: '虚無魔斬', target: 'range', ct: 0, kind: 'dmg', power: 1.18, effects: [{ stat: 'poison', chance: 0.65, dur: 2 }] },
        { name: '冥界呪縛波動', target: 'all', ct: 3, kind: 'dmg', power: 1.65, effects: [{ stat: 'atkDown', chance: 0.75, dur: 2 }, { stat: 'silence', chance: 0.45, dur: 1 }] },
        { name: '永劫虚無崩壊', target: 'all', ct: 4, kind: 'dmg', power: 2.32, lifesteal: 0.18, effects: [{ stat: 'vuln', chance: 0.80, dur: 2 }] }
      ],
      lore: '虚無の深淵から這い出た冥王。毒・沈黙・吸血を織り交ぜ、長期戦ほど牙を研ぎ澄ます。'
    },
    {
      id: 'e_raid_none', name: '無垢原初アークゼロ', kana: 'むくげんしょあーくぜろ', category: 'raid',
      element: 'none', races: ['god', 'machine'], role: 'dealer',
      base: { hp: 27000, atk: 268, def: 158, spd: 122 },
      skills: [
        { name: '原初収束波', target: 'range', ct: 0, kind: 'dmg', power: 1.18 },
        { name: '零点構造解析', target: 'all', ct: 3, kind: 'dmg', power: 1.74, effects: [{ stat: 'defDown', chance: 0.75, dur: 2 }, { stat: 'spdDown', chance: 0.75, dur: 2 }] },
        { name: '創世無垢砲', target: 'all', ct: 4, kind: 'dmg', power: 2.38, defPen: 0.20 }
      ],
      lore: 'すべての異世界の設計図を内包する白銀の原初体。弱点を持たず、純粋な戦闘力で立ち塞がる。'
    },

    // ===== CONSTRAINT REALM BOSSES =====
    {
      id: 'e_con_warden', name: '制約の裁定者リブラ', kana: 'せいやくのさいていしゃりぶら', category: 'constraint',
      element: 'none', races: ['god'], role: 'supporter',
      base: { hp: 9600, atk: 320, def: 196, spd: 120 },
      skills: [
        { name: '均衡の天秤打', target: 'range', ct: 0, kind: 'dmg', power: 1.16 },
        { name: '誓約の重圧', target: 'all', ct: 3, kind: 'dmg', power: 1.68, effects: [{ stat: 'atkDown', chance: 0.70, dur: 2 }, { stat: 'defDown', chance: 0.70, dur: 2 }] },
        { name: '絶対裁定光', target: 'all', ct: 4, kind: 'dmg', power: 2.15 }
      ],
      lore: '制約異界の門番を務める天秤の裁定者。定められた条件のもとで挑む者の真価を見極める。'
    }
  ];

  // Canonical sort for Enemy Encyclopedia
  ENEMIES.sort(HS.CONST.compareUnits);
  const ENEMY_MAP = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

  HS.Data.ENEMIES = ENEMIES;
  HS.Data.ENEMY_MAP = ENEMY_MAP;
})();
