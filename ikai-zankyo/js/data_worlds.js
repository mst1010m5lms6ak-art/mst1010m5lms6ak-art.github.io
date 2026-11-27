/* 10異界・100メインステージ・敵66種（属性→種別→五十音ソート・出現場所付）・常設PvE5種（塔100F・討伐属性順） */
(function () {
  'use strict';

  const ELEMENTS = Object.freeze({
    fire:  { id: 'fire',  name: '炎', order: 0 },
    water: { id: 'water', name: '水', order: 1 },
    wind:  { id: 'wind',  name: '風', order: 2 },
    light: { id: 'light', name: '光', order: 3 },
    dark:  { id: 'dark',  name: '闇', order: 4 },
    none:  { id: 'none',  name: '無', order: 5 }
  });

  const ROLES = Object.freeze({
    tank:    { id: 'tank',    name: 'タンク',     short: '盾', order: 0 },
    dealer:  { id: 'dealer',  name: 'ディーラー', short: '攻', order: 1 },
    support: { id: 'support', name: 'サポーター', short: '援', order: 2 },
    healer:  { id: 'healer',  name: 'ヒーラー',   short: '癒', order: 3 }
  });

  const RARITIES = Object.freeze({
    UR:  { id: 'UR',  order: 0, mult: 1.32, rate: 0.03 },
    SSR: { id: 'SSR', order: 1, mult: 1.18, rate: 0.10 },
    SR:  { id: 'SR',  order: 2, mult: 1.06, rate: 0.25 },
    R:   { id: 'R',   order: 3, mult: 0.96, rate: 0.34 },
    N:   { id: 'N',   order: 4, mult: 0.88, rate: 0.28 }
  });

  const ENEMY_KIND_ORDER = Object.freeze({
    normal: 0,
    intruder: 1,
    boss: 2,
    raid: 3
  });

  /* 10異界（情景名 × 多彩なジャンル振り幅・各10ステージ・5と10に単独ボス） */
  const WORLDS = [
    {
      id: 'w1', shortName: '1.蒼穹遺跡', name: '蒼穹の天空遺跡',
      theme: '白雲と古石柱が浮かぶ王都跡', mainEl: 'wind',
      drops: ['s_sky', 's_oath'], intruderId: 'int_w1',
      stages: [
        { num: 1,  name: '風渡る白門',   power: 1.00, isBoss: false },
        { num: 2,  name: '雲海の石橋',   power: 1.12, isBoss: false },
        { num: 3,  name: '碧風の回廊',   power: 1.24, isBoss: false },
        { num: 4,  name: '崩れた書庫',   power: 1.36, isBoss: false },
        { num: 5,  name: '蒼天の鐘楼',   power: 1.54, isBoss: true, bossId: 'boss_w1_5' },
        { num: 6,  name: '星見の庭園',   power: 1.66, isBoss: false },
        { num: 7,  name: '白翼の礼拝堂', power: 1.78, isBoss: false },
        { num: 8,  name: '嵐呼ぶ大階段', power: 1.92, isBoss: false },
        { num: 9,  name: '雲頂の近衛道', power: 2.06, isBoss: false },
        { num: 10, name: '白王の天空座', power: 2.28, isBoss: true, bossId: 'boss_w1_10' }
      ]
    },
    {
      id: 'w2', shortName: '2.紅蓮鍛炉', name: '紅蓮の蒸気鍛炉',
      theme: '赤熱の歯車と溶鉄が脈打つ機工要塞', mainEl: 'fire',
      drops: ['s_forge', 's_oath'], intruderId: 'int_w2',
      stages: [
        { num: 1,  name: '灰煙の搬入口', power: 2.45, isBoss: false },
        { num: 2,  name: '高圧蒸気管',   power: 2.62, isBoss: false },
        { num: 3,  name: '赤鉄の鋳造場', power: 2.80, isBoss: false },
        { num: 4,  name: '熔岩の運河',   power: 2.98, isBoss: false },
        { num: 5,  name: '鉄槌の第一炉', power: 3.24, isBoss: true, bossId: 'boss_w2_5' },
        { num: 6,  name: '黒鋼の歯車室', power: 3.44, isBoss: false },
        { num: 7,  name: '灼熱の動力橋', power: 3.65, isBoss: false },
        { num: 8,  name: '炎塵の昇降機', power: 3.88, isBoss: false },
        { num: 9,  name: '炉心制御回廊', power: 4.12, isBoss: false },
        { num: 10, name: '紅蓮の超大窯', power: 4.48, isBoss: true, bossId: 'boss_w2_10' }
      ]
    },
    {
      id: 'w3', shortName: '3.夜桜古都', name: '幽玄の夜桜古都',
      theme: '紅灯と妖桜が舞い散る月下の和都', mainEl: 'dark',
      drops: ['s_sakura', 's_veil'], intruderId: 'int_w3',
      stages: [
        { num: 1,  name: '薄紅の大鳥居', power: 4.75, isBoss: false },
        { num: 2,  name: '狐火の参道',   power: 5.02, isBoss: false },
        { num: 3,  name: '燈籠の橋詰',   power: 5.30, isBoss: false },
        { num: 4,  name: '霧深き竹林',   power: 5.60, isBoss: false },
        { num: 5,  name: '月影の能舞台', power: 6.00, isBoss: true, bossId: 'boss_w3_5' },
        { num: 6,  name: '鏡池の離宮',   power: 6.32, isBoss: false },
        { num: 7,  name: '朱塗りの千廊', power: 6.66, isBoss: false },
        { num: 8,  name: '花吹雪の庭園', power: 7.02, isBoss: false },
        { num: 9,  name: '妖桜の石段',   power: 7.40, isBoss: false },
        { num: 10, name: '千本桜の本殿', power: 7.95, isBoss: true, bossId: 'boss_w3_10' }
      ]
    },
    {
      id: 'w4', shortName: '4.瑠璃深海', name: '瑠璃の深海神殿',
      theme: '蒼い海光が静かに揺れる海底聖域', mainEl: 'water',
      drops: ['s_abyss', 's_tide'], intruderId: 'int_w4',
      stages: [
        { num: 1,  name: '珊瑚の裂け目', power: 8.35, isBoss: false },
        { num: 2,  name: '泡沫の水回廊', power: 8.78, isBoss: false },
        { num: 3,  name: '蒼貝の柱列',   power: 9.22, isBoss: false },
        { num: 4,  name: '沈黙の海書庫', power: 9.68, isBoss: false },
        { num: 5,  name: '海流の大祭壇', power: 10.30, isBoss: true, bossId: 'boss_w4_5' },
        { num: 6,  name: '真珠の玉座道', power: 10.80, isBoss: false },
        { num: 7,  name: '深藍の鐘堂',   power: 11.35, isBoss: false },
        { num: 8,  name: '渦潮の宝物庫', power: 11.90, isBoss: false },
        { num: 9,  name: '海淵の祈祷橋', power: 12.50, isBoss: false },
        { num: 10, name: '深海の蒼聖堂', power: 13.40, isBoss: true, bossId: 'boss_w4_10' }
      ]
    },
    {
      id: 'w5', shortName: '5.白銀時計', name: '白銀の星刻時計塔',
      theme: '巨大な歯車と黄金光脈が巡る天球都市', mainEl: 'light',
      drops: ['s_clock', 's_tide'], intruderId: 'int_w5',
      stages: [
        { num: 1,  name: '白金の外輪門', power: 14.0, isBoss: false },
        { num: 2,  name: '秒針の連絡橋', power: 14.7, isBoss: false },
        { num: 3,  name: '振子の大広間', power: 15.4, isBoss: false },
        { num: 4,  name: '光脈の調律室', power: 16.1, isBoss: false },
        { num: 5,  name: '天球儀の円堂', power: 17.1, isBoss: true, bossId: 'boss_w5_5' },
        { num: 6,  name: '白銀の螺旋塔', power: 17.9, isBoss: false },
        { num: 7,  name: '星図の観測廊', power: 18.7, isBoss: false },
        { num: 8,  name: '時律の鐘突堂', power: 19.6, isBoss: false },
        { num: 9,  name: '純白の歯車殿', power: 20.5, isBoss: false },
        { num: 10, name: '永劫の時針殿', power: 21.8, isBoss: true, bossId: 'boss_w5_10' }
      ]
    },
    {
      id: 'w6', shortName: '6.翠玉聖樹', name: '翠玉の世界樹森域',
      theme: '天空を貫く大樹と精霊霧が満ちる原始聖森', mainEl: 'wind',
      drops: ['s_verdant', 's_sky'], intruderId: 'int_w6',
      stages: [
        { num: 1,  name: '木漏れ日の小径', power: 22.8, isBoss: false },
        { num: 2,  name: '苔むす巨根橋', power: 23.8, isBoss: false },
        { num: 3,  name: '精霊霧の泉',   power: 24.9, isBoss: false },
        { num: 4,  name: '翡翠の樹海道', power: 26.0, isBoss: false },
        { num: 5,  name: '古樹の守護壇', power: 27.5, isBoss: true, bossId: 'boss_w6_5' },
        { num: 6,  name: '大幹の螺旋路', power: 28.7, isBoss: false },
        { num: 7,  name: '光胞子の空洞', power: 29.9, isBoss: false },
        { num: 8,  name: '翠冠の吊り橋', power: 31.2, isBoss: false },
        { num: 9,  name: '聖葉の祈り場', power: 32.6, isBoss: false },
        { num: 10, name: '世界樹の樹冠座', power: 34.6, isBoss: true, bossId: 'boss_w6_10' }
      ]
    },
    {
      id: 'w7', shortName: '7.黄昏砂都', name: '黄昏の太陽砂都',
      theme: '黄金の尖塔と太陽碑が沈む古代砂漠王国', mainEl: 'fire',
      drops: ['s_sun', 's_forge'], intruderId: 'int_w7',
      stages: [
        { num: 1,  name: '熱砂の隊商門', power: 36.0, isBoss: false },
        { num: 2,  name: '陽炎のオアシス', power: 37.5, isBoss: false },
        { num: 3,  name: '黄金碑の回廊', power: 39.0, isBoss: false },
        { num: 4,  name: '砂嵐の石柱群', power: 40.6, isBoss: false },
        { num: 5,  name: '太陽神の参門', power: 42.8, isBoss: true, bossId: 'boss_w7_5' },
        { num: 6,  name: '王墓の玄室道', power: 44.5, isBoss: false },
        { num: 7,  name: '琥珀の星盤室', power: 46.3, isBoss: false },
        { num: 8,  name: '灼陽の尖塔廊', power: 48.2, isBoss: false },
        { num: 9,  name: '黄金王の宝廊', power: 50.2, isBoss: false },
        { num: 10, name: '紅陽の大ピラミッド', power: 53.0, isBoss: true, bossId: 'boss_w7_10' }
      ]
    },
    {
      id: 'w8', shortName: '8.氷晶凍城', name: '氷晶の極光凍城',
      theme: 'オーロラが反射する永久氷結の白銀城塞', mainEl: 'water',
      drops: ['s_frost', 's_abyss'], intruderId: 'int_w8',
      stages: [
        { num: 1,  name: '雪原の氷門',   power: 55.0, isBoss: false },
        { num: 2,  name: '凍てつく濠橋', power: 57.2, isBoss: false },
        { num: 3,  name: '水晶の騎士廊', power: 59.4, isBoss: false },
        { num: 4,  name: '氷柱の大広間', power: 61.8, isBoss: false },
        { num: 5,  name: '白銀の氷鏡殿', power: 65.0, isBoss: true, bossId: 'boss_w8_5' },
        { num: 6,  name: '吹雪の城壁路', power: 67.6, isBoss: false },
        { num: 7,  name: '蒼氷の礼拝堂', power: 70.3, isBoss: false },
        { num: 8,  name: '極光の天守階', power: 73.1, isBoss: false },
        { num: 9,  name: '永久凍土の廊', power: 76.0, isBoss: false },
        { num: 10, name: '氷女王の玉座', power: 80.2, isBoss: true, bossId: 'boss_w8_10' }
      ]
    },
    {
      id: 'w9', shortName: '9.雷鳴尖塔', name: '雷鳴の電脳尖塔',
      theme: 'ネオン光脈と雷撃が交錯する超高度機甲都市', mainEl: 'light',
      drops: ['s_volt', 's_clock'], intruderId: 'int_w9',
      stages: [
        { num: 1,  name: '電光の外周区', power: 83.0, isBoss: false },
        { num: 2,  name: '磁気浮上回廊', power: 86.2, isBoss: false },
        { num: 3,  name: '高圧変電層',   power: 89.5, isBoss: false },
        { num: 4,  name: '霓虹の情報街', power: 93.0, isBoss: false },
        { num: 5,  name: '雷装の防衛門', power: 97.6, isBoss: true, bossId: 'boss_w9_5' },
        { num: 6,  name: '光繊維の螺旋', power: 101.5, isBoss: false },
        { num: 7,  name: '蓄電コア区画', power: 105.5, isBoss: false },
        { num: 8,  name: '成層圏の歩廊', power: 109.8, isBoss: false },
        { num: 9,  name: '中枢演算室',   power: 114.2, isBoss: false },
        { num: 10, name: '天雷の主電塔', power: 120.5, isBoss: true, bossId: 'boss_w9_10' }
      ]
    },
    {
      id: 'w10', shortName: '10.終焉星海', name: '終焉の星海回廊',
      theme: '星雲と記憶の残響が融け合う万象の果て', mainEl: 'none',
      drops: ['s_void', 's_astral'], intruderId: 'int_w10',
      stages: [
        { num: 1,  name: '星屑の境界縁', power: 125.0, isBoss: false },
        { num: 2,  name: '残響の渡り廊', power: 130.0, isBoss: false },
        { num: 3,  name: '無音の観測門', power: 135.2, isBoss: false },
        { num: 4,  name: '銀河流の分水', power: 140.6, isBoss: false },
        { num: 5,  name: '虚星の大円環', power: 148.0, isBoss: true, bossId: 'boss_w10_5' },
        { num: 6,  name: '記憶の断層域', power: 154.0, isBoss: false },
        { num: 7,  name: '光年の回廊橋', power: 160.2, isBoss: false },
        { num: 8,  name: '終極の残響殿', power: 166.8, isBoss: false },
        { num: 9,  name: '万象収束の門', power: 173.6, isBoss: false },
        { num: 10, name: '星海の零点座', power: 185.0, isBoss: true, bossId: 'boss_w10_10' }
      ]
    }
  ];

  /* 全66種の敵データ（通常30・乱入10・エリアボス20・異界討伐ボス6） */
  const ENEMIES = {
    /* ===== 通常敵 30種（各異界3種） ===== */
    en_w1_1: {
      id: 'en_w1_1', name: '蒼風の斥候', kana: 'そうふうのせっこう', world: 'w1', el: 'wind', kind: 'normal',
      spawnText: '蒼穹の天空遺跡（通常出現）',
      hp: 440, atk: 68, def: 28, spd: 108,
      skills: [
        { name: '風刃切り', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に風属性ダメージ' },
        { name: '突風連撃', scope: 'area2', mult: 1.15, ct: 3, desc: '敵2体に風ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.18, turns: 2 } }
      ],
      lore: '天空遺跡の外壁を疾走する風の哨兵。軽装ながら俊敏な動きで侵入者を翻弄する。'
    },
    en_w1_2: {
      id: 'en_w1_2', name: '白石の衛兵', kana: 'しろいしのえいへい', world: 'w1', el: 'none', kind: 'normal',
      spawnText: '蒼穹の天空遺跡（通常出現）',
      hp: 590, atk: 62, def: 44, spd: 86,
      skills: [
        { name: '重盾打ち', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '白石の構え', scope: 'single', mult: 1.25, ct: 3, desc: '敵単体に大ダメージ＋自身防御上昇', selfBuff: { type: 'defUp', val: 0.25, turns: 2 } }
      ],
      lore: '王都の回廊を今も無言で守り続ける白大理石の自律人形。堅牢な盾であらゆる衝撃を受け止める。'
    },
    en_w1_3: {
      id: 'en_w1_3', name: '光羽の詠唱者', kana: 'こううのえいしょうしゃ', world: 'w1', el: 'light', kind: 'normal',
      spawnText: '蒼穹の天空遺跡（通常出現）',
      hp: 410, atk: 74, def: 26, spd: 100,
      skills: [
        { name: '光の矢', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: '星光の斉唱', scope: 'all', mult: 0.92, ct: 3, desc: '敵全体に光属性ダメージ' }
      ],
      lore: '古代の賛美歌を反復する光の残響体。澄んだ詠唱と共に光の矢を降り注ぐ。'
    },
    en_w2_1: {
      id: 'en_w2_1', name: '赤熱の機兵', kana: 'せきねつのきへい', world: 'w2', el: 'fire', kind: 'normal',
      spawnText: '紅蓮の蒸気鍛炉（通常出現）',
      hp: 520, atk: 76, def: 36, spd: 94,
      skills: [
        { name: '熔鉄パンチ', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に炎属性ダメージ' },
        { name: '高熱排気', scope: 'area2', mult: 1.18, ct: 3, desc: '敵2体に炎ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.06, turns: 2 } }
      ],
      lore: '炉の熱源を動力とする蒸気機兵。赤く焼けた装甲そのものが強力な武器となる。'
    },
    en_w2_2: {
      id: 'en_w2_2', name: '火花の砲手', kana: 'ひばなのほうしゅ', world: 'w2', el: 'fire', kind: 'normal',
      spawnText: '紅蓮の蒸気鍛炉（通常出現）',
      hp: 440, atk: 84, def: 28, spd: 104,
      skills: [
        { name: '火薬弾', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に炎属性ダメージ' },
        { name: '拡散焼夷弾', scope: 'area3', mult: 1.05, ct: 3, desc: '敵3体に炎属性ダメージ' }
      ],
      lore: '溶鉄の配管上に陣取る自律砲台。広範囲への焼夷射撃で侵入者の進軍を阻む。'
    },
    en_w2_3: {
      id: 'en_w2_3', name: '黒煙の鍛冶霊', kana: 'こくえんのかじれい', world: 'w2', el: 'dark', kind: 'normal',
      spawnText: '紅蓮の蒸気鍛炉（通常出現）',
      hp: 490, atk: 78, def: 34, spd: 98,
      skills: [
        { name: '煤の鞭', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇属性ダメージ' },
        { name: '暗黒鍛造波', scope: 'all', mult: 0.94, ct: 3, desc: '敵全体に闇ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.16, turns: 2 } }
      ],
      lore: '絶えぬ煙と炉の執念が形を成した残響霊。鉄をも腐食させる黒煙を操る。'
    },
    en_w3_1: {
      id: 'en_w3_1', name: '夜桜の忍び', kana: 'よざくらのしのび', world: 'w3', el: 'dark', kind: 'normal',
      spawnText: '幽玄の夜桜古都（通常出現）',
      hp: 460, atk: 84, def: 28, spd: 116,
      skills: [
        { name: '桜吹雪苦無', scope: 'single', mult: 1.04, ct: 0, desc: '敵単体に闇属性ダメージ' },
        { name: '影分身連斬', scope: 'area2', mult: 1.22, ct: 3, desc: '敵2体に闇ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.16, turns: 2 } }
      ],
      lore: '花弁に紛れて気配を絶つ古都の影。音もなく近づき、相手の歩みを鈍らせる。'
    },
    en_w3_2: {
      id: 'en_w3_2', name: '紅提灯の妖', kana: 'あかちょうちんのあやかし', world: 'w3', el: 'fire', kind: 'normal',
      spawnText: '幽玄の夜桜古都（通常出現）',
      hp: 500, atk: 80, def: 32, spd: 102,
      skills: [
        { name: '鬼火飛ばし', scope: 'single', mult: 1.02, ct: 0, desc: '敵単体に炎属性ダメージ' },
        { name: '百鬼灯火', scope: 'all', mult: 0.96, ct: 3, desc: '敵全体に炎ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.06, turns: 2 } }
      ],
      lore: '夜の参道を漂う古提灯の妖怪。柔らかな紅灯の裏に激しい鬼火を秘めている。'
    },
    en_w3_3: {
      id: 'en_w3_3', name: '竹林の剣客', kana: 'ちくりんのけんかく', world: 'w3', el: 'wind', kind: 'normal',
      spawnText: '幽玄の夜桜古都（通常出現）',
      hp: 540, atk: 88, def: 36, spd: 110,
      skills: [
        { name: '竹割り一閃', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に風属性ダメージ' },
        { name: '疾風居合', scope: 'single', mult: 1.55, ct: 3, desc: '敵単体に高威力風ダメージ' }
      ],
      lore: '霧深い竹林で腕を磨き続ける無念の剣士。抜刀の一撃は鋭く一切の迷いがない。'
    },
    en_w4_1: {
      id: 'en_w4_1', name: '珊瑚の槍兵', kana: 'さんごのそうへい', world: 'w4', el: 'water', kind: 'normal',
      spawnText: '瑠璃の深海神殿（通常出現）',
      hp: 560, atk: 84, def: 40, spd: 100,
      skills: [
        { name: '水槍突き', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に水属性ダメージ' },
        { name: '潮流二連撃', scope: 'area2', mult: 1.24, ct: 3, desc: '敵2体に水属性ダメージ' }
      ],
      lore: '硬質な珊瑚の鎧を纏う海底神殿の衛士。激しい海流を槍先に纏わせて突き進む。'
    },
    en_w4_2: {
      id: 'en_w4_2', name: '瑠璃の水母霊', kana: 'るりのくらげれい', world: 'w4', el: 'water', kind: 'normal',
      spawnText: '瑠璃の深海神殿（通常出現）',
      hp: 500, atk: 82, def: 34, spd: 108,
      skills: [
        { name: '蒼電触手', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水属性ダメージ' },
        { name: '沈黙の蒼波', scope: 'all', mult: 0.98, ct: 3, desc: '敵全体に水ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.16, turns: 2 } }
      ],
      lore: '淡い瑠璃色に輝く深海の浮遊霊。静かな波動で敵の気力をじわじわと奪う。'
    },
    en_w4_3: {
      id: 'en_w4_3', name: '真珠の守護蟹', kana: 'しんじゅのしゅごがに', world: 'w4', el: 'none', kind: 'normal',
      spawnText: '瑠璃の深海神殿（通常出現）',
      hp: 680, atk: 78, def: 52, spd: 86,
      skills: [
        { name: '大鋏砕き', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '硬殻防壁', scope: 'single', mult: 1.28, ct: 3, desc: '敵単体に大ダメージ＋自身防御上昇', selfBuff: { type: 'defUp', val: 0.28, turns: 2 } }
      ],
      lore: '巨大な真珠を甲羅に抱いた神殿の番人。並の斬撃では傷一つ付かない硬殻を誇る。'
    },
    en_w5_1: {
      id: 'en_w5_1', name: '白金の歯車機', kana: 'はっきんのはぐるまき', world: 'w5', el: 'light', kind: 'normal',
      spawnText: '白銀の星刻時計塔（通常出現）',
      hp: 580, atk: 90, def: 44, spd: 112,
      skills: [
        { name: '回転刃', scope: 'single', mult: 1.06, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: '星刻連鋸', scope: 'area2', mult: 1.26, ct: 3, desc: '敵2体に光属性ダメージ' }
      ],
      lore: '天球都市の機構を巡回する精密自動機。規則正しい回転音と共に侵入者を排除する。'
    },
    en_w5_2: {
      id: 'en_w5_2', name: '光脈の狙撃機', kana: 'こうみゃくのそげきき', world: 'w5', el: 'light', kind: 'normal',
      spawnText: '白銀の星刻時計塔（通常出現）',
      hp: 500, atk: 98, def: 34, spd: 118,
      skills: [
        { name: '白光照射', scope: 'single', mult: 1.1, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: '集束レーザー', scope: 'single', mult: 1.65, ct: 3, desc: '敵単体に極大光ダメージ' }
      ],
      lore: '光脈エネルギーを一点に集束させて放つ狙撃ドローン。誤差なき照準で急所を射抜く。'
    },
    en_w5_3: {
      id: 'en_w5_3', name: '時針の番兵', kana: 'じしんのばんぺい', world: 'w5', el: 'none', kind: 'normal',
      spawnText: '白銀の星刻時計塔（通常出現）',
      hp: 650, atk: 88, def: 48, spd: 104,
      skills: [
        { name: '長針突き', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '刻律波動', scope: 'all', mult: 1.02, ct: 3, desc: '敵全体に無ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.18, turns: 2 } }
      ],
      lore: '時計塔の針を武器に振るう白銀の番兵。正確なリズムで敵の行動周期を乱す。'
    },
    en_w6_1: {
      id: 'en_w6_1', name: '翠葉の精霊狼', kana: 'すいようのせいれいろう', world: 'w6', el: 'wind', kind: 'normal',
      spawnText: '翠玉の世界樹森域（通常出現）',
      hp: 560, atk: 94, def: 38, spd: 120,
      skills: [
        { name: '疾風牙', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に風属性ダメージ' },
        { name: '翠嵐の連咬', scope: 'area2', mult: 1.28, ct: 3, desc: '敵2体に風ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.2, turns: 2 } }
      ],
      lore: '世界樹の根元を群れで駆ける翠玉の狼霊。風のように現れ一瞬で距離を詰める。'
    },
    en_w6_2: {
      id: 'en_w6_2', name: '古樹の守護木', kana: 'こじゅのしゅごぼく', world: 'w6', el: 'none', kind: 'normal',
      spawnText: '翠玉の世界樹森域（通常出現）',
      hp: 760, atk: 84, def: 58, spd: 86,
      skills: [
        { name: '巨根薙ぎ', scope: 'single', mult: 1.06, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '大樹の障壁', scope: 'area2', mult: 1.18, ct: 3, desc: '敵2体に無ダメージ＋自身防御上昇', selfBuff: { type: 'defUp', val: 0.28, turns: 2 } }
      ],
      lore: '数千年の時を生き抜いた大樹の番人。厚い樹皮と太い根で聖森への侵入を阻む。'
    },
    en_w6_3: {
      id: 'en_w6_3', name: '光胞子の妖精', kana: 'こうほうしのようせい', world: 'w6', el: 'light', kind: 'normal',
      spawnText: '翠玉の世界樹森域（通常出現）',
      hp: 520, atk: 96, def: 36, spd: 114,
      skills: [
        { name: '光粉撒き', scope: 'single', mult: 1.04, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: '森霧の幻光', scope: 'all', mult: 1.04, ct: 3, desc: '敵全体に光ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.18, turns: 2 } }
      ],
      lore: '樹冠の光を宿した微細な精霊。淡く舞う胞子は美しくも強烈な魔力を秘める。'
    },
    en_w7_1: {
      id: 'en_w7_1', name: '砂塵の豺狼兵', kana: 'さじんのさいろうへい', world: 'w7', el: 'fire', kind: 'normal',
      spawnText: '黄昏の太陽砂都（通常出現）',
      hp: 610, atk: 102, def: 42, spd: 114,
      skills: [
        { name: '曲刀一閃', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に炎属性ダメージ' },
        { name: '熱砂二連斬', scope: 'area2', mult: 1.30, ct: 3, desc: '敵2体に炎ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.07, turns: 2 } }
      ],
      lore: '黄金の仮面を被る砂都の近衛兵。灼熱の曲刀を振るい王墓の静寂を守り続ける。'
    },
    en_w7_2: {
      id: 'en_w7_2', name: '黄金碑の石獣', kana: 'おうごんひのせきじゅう', world: 'w7', el: 'none', kind: 'normal',
      spawnText: '黄昏の太陽砂都（通常出現）',
      hp: 780, atk: 94, def: 60, spd: 90,
      skills: [
        { name: '砂岩強打', scope: 'single', mult: 1.1, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '王墓の重圧', scope: 'area3', mult: 1.15, ct: 3, desc: '敵3体に無ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.18, turns: 2 } }
      ],
      lore: '太陽碑の魔力で動き出した古代石像。圧倒的な重量の一撃が大地を震わせる。'
    },
    en_w7_3: {
      id: 'en_w7_3', name: '陽炎の魔導師', kana: 'かげろうのまどうし', world: 'w7', el: 'dark', kind: 'normal',
      spawnText: '黄昏の太陽砂都（通常出現）',
      hp: 550, atk: 108, def: 38, spd: 112,
      skills: [
        { name: '呪砂の弾', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に闇属性ダメージ' },
        { name: '黄昏の砂嵐', scope: 'all', mult: 1.08, ct: 3, desc: '敵全体に闇ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.18, turns: 2 } }
      ],
      lore: '沈みゆく太陽と影の狭間を司る砂漠の術師。熱風と呪言で旅人の体力を奪う。'
    },
    en_w8_1: {
      id: 'en_w8_1', name: '氷槍の凍騎士', kana: 'ひょうそうのとうきし', world: 'w8', el: 'water', kind: 'normal',
      spawnText: '氷晶の極光凍城（通常出現）',
      hp: 660, atk: 106, def: 48, spd: 110,
      skills: [
        { name: '氷槍貫き', scope: 'single', mult: 1.1, ct: 0, desc: '敵単体に水属性ダメージ' },
        { name: '凍槍乱舞', scope: 'area2', mult: 1.32, ct: 3, desc: '敵2体に水ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.2, turns: 2 } }
      ],
      lore: '透き通る氷鎧を纏った凍城の騎士。永久凍土から削り出した長槍で敵を貫く。'
    },
    en_w8_2: {
      id: 'en_w8_2', name: '吹雪の氷精霊', kana: 'ふぶきのこおりせいれい', world: 'w8', el: 'water', kind: 'normal',
      spawnText: '氷晶の極光凍城（通常出現）',
      hp: 590, atk: 112, def: 40, spd: 118,
      skills: [
        { name: '氷礫飛ばし', scope: 'single', mult: 1.06, ct: 0, desc: '敵単体に水属性ダメージ' },
        { name: '極寒の吹雪', scope: 'all', mult: 1.1, ct: 3, desc: '敵全体に水ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.2, turns: 2 } }
      ],
      lore: '凍城の塔頂に集う冷気の結晶霊。鋭い吹雪を巻き起こし、熱と動きを奪い去る。'
    },
    en_w8_3: {
      id: 'en_w8_3', name: '極光の鏡兵', kana: 'きょっこうのきょうへい', world: 'w8', el: 'light', kind: 'normal',
      spawnText: '氷晶の極光凍城（通常出現）',
      hp: 690, atk: 104, def: 52, spd: 106,
      skills: [
        { name: '鏡光斬り', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: 'オーロラ反射', scope: 'area2', mult: 1.24, ct: 3, desc: '敵2体に光ダメージ＋自身防御上昇', selfBuff: { type: 'defUp', val: 0.24, turns: 2 } }
      ],
      lore: '氷鏡の盾にオーロラを宿した白銀兵。眩い反射光と共に冷徹な斬撃を浴びせる。'
    },
    en_w9_1: {
      id: 'en_w9_1', name: '電光サイバー兵', kana: 'でんこうさいばーへい', world: 'w9', el: 'light', kind: 'normal',
      spawnText: '雷鳴の電脳尖塔（通常出現）',
      hp: 680, atk: 116, def: 46, spd: 124,
      skills: [
        { name: 'プラズマ刃', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: '電磁ブレード', scope: 'area2', mult: 1.34, ct: 3, desc: '敵2体に光ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.2, turns: 2 } }
      ],
      lore: '高圧光脈を武装化した電脳尖塔の機動兵。光の残像を残す超高速剣術を繰り出す。'
    },
    en_w9_2: {
      id: 'en_w9_2', name: '高圧放電ドローン', kana: 'こうあつほうでんどろーん', world: 'w9', el: 'wind', kind: 'normal',
      spawnText: '雷鳴の電脳尖塔（通常出現）',
      hp: 610, atk: 120, def: 42, spd: 122,
      skills: [
        { name: '電撃パルス', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に風属性ダメージ' },
        { name: '雷雲フィールド', scope: 'all', mult: 1.12, ct: 3, desc: '敵全体に風ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.2, turns: 2 } }
      ],
      lore: '磁気浮上回廊を監視する自律雷撃機。放電網を広げて侵入者の装甲を焼き切る。'
    },
    en_w9_3: {
      id: 'en_w9_3', name: '機甲重装ガード', kana: 'きこうじゅうそうがーど', world: 'w9', el: 'none', kind: 'normal',
      spawnText: '雷鳴の電脳尖塔（通常出現）',
      hp: 840, atk: 108, def: 64, spd: 96,
      skills: [
        { name: '電磁パイル', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '衝撃バリア波', scope: 'area3', mult: 1.2, ct: 3, desc: '敵3体に無ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.18, turns: 2 } }
      ],
      lore: '中枢演算室を死守する重装甲セキュリティ機体。厚い電磁障壁が火力を大きく減衰させる。'
    },
    en_w10_1: {
      id: 'en_w10_1', name: '星屑の漂流者', kana: 'ほしくずのひょうりゅうしゃ', world: 'w10', el: 'none', kind: 'normal',
      spawnText: '終焉の星海回廊（通常出現）',
      hp: 740, atk: 120, def: 52, spd: 118,
      skills: [
        { name: '星片撃', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '星雲の渦', scope: 'area3', mult: 1.24, ct: 3, desc: '敵3体に無属性ダメージ' }
      ],
      lore: '滅びた異界の欠片を纏って漂う星間の残響体。属性の垣根を超えた純粋な力を放つ。'
    },
    en_w10_2: {
      id: 'en_w10_2', name: '虚無の観測者', kana: 'きょむのかんそくしゃ', world: 'w10', el: 'dark', kind: 'normal',
      spawnText: '終焉の星海回廊（通常出現）',
      hp: 690, atk: 126, def: 48, spd: 122,
      skills: [
        { name: '虚光眼', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に闇属性ダメージ' },
        { name: '忘却の波紋', scope: 'all', mult: 1.15, ct: 3, desc: '敵全体に闇ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } }
      ],
      lore: '星海回廊を無音で監視する黒衣の異形。見つめられた者の防備を音もなく削ぎ落とす。'
    },
    en_w10_3: {
      id: 'en_w10_3', name: '残響の双星機', kana: 'ざんきょうのそうせいき', world: 'w10', el: 'light', kind: 'normal',
      spawnText: '終焉の星海回廊（通常出現）',
      hp: 760, atk: 124, def: 54, spd: 120,
      skills: [
        { name: '双星弾', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: '収束星光', scope: 'area2', mult: 1.42, ct: 3, desc: '敵2体に極大光ダメージ' }
      ],
      lore: '二つの光球が対になって共鳴する古の守護機体。二点同時照射で獲物を逃さない。'
    },

    /* ===== 単独乱入敵 10種（各異界1種） ===== */
    int_w1: {
      id: 'int_w1', name: '蒼穹の白銀狼', kana: 'そうきゅうのはくぎんろう', world: 'w1', el: 'wind', kind: 'intruder',
      spawnText: '蒼穹の天空遺跡（乱入出現）',
      hp: 1550, atk: 108, def: 42, spd: 132,
      skills: [
        { name: '白銀疾風牙', scope: 'single', mult: 1.22, ct: 0, desc: '敵単体に高速風ダメージ' },
        { name: '蒼穹の遠吠え', scope: 'all', mult: 1.24, ct: 3, desc: '敵全体に風大ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.25, turns: 2 } }
      ],
      lore: '雲海の裂け目から突如現れる伝説の白銀狼。撃破した者には上質な財宝がもたらされる。'
    },
    int_w2: {
      id: 'int_w2', name: '黄金の炉心獣', kana: 'おうごんのろしんじゅう', world: 'w2', el: 'fire', kind: 'intruder',
      spawnText: '紅蓮の蒸気鍛炉（乱入出現）',
      hp: 1750, atk: 114, def: 46, spd: 122,
      skills: [
        { name: '金炎突進', scope: 'area2', mult: 1.18, ct: 0, desc: '敵2体に炎ダメージ' },
        { name: '灼熱炉心解放', scope: 'all', mult: 1.28, ct: 3, desc: '敵全体に炎大ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.08, turns: 2 } }
      ],
      lore: '稀少な黄金鉱石を取り込んだ異形の炉心獣。圧倒的な熱波と共に戦場へ乱入する。'
    },
    int_w3: {
      id: 'int_w3', name: '妖狐・紅玉', kana: 'ようここうぎょく', world: 'w3', el: 'dark', kind: 'intruder',
      spawnText: '幽玄の夜桜古都（乱入出現）',
      hp: 1680, atk: 120, def: 42, spd: 134,
      skills: [
        { name: '紅玉狐火', scope: 'area2', mult: 1.18, ct: 0, desc: '敵2体に闇ダメージ' },
        { name: '幻桜の妖術', scope: 'all', mult: 1.3, ct: 3, desc: '敵全体に闇大ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } }
      ],
      lore: '月夜の古都を気まぐれに彷徨う九尾の幻妖狐。いたずらに戦場へ飛び込み腕試しを挑む。'
    },
    int_w4: {
      id: 'int_w4', name: '深海の蒼星鯨', kana: 'しんかいのそうせいげい', world: 'w4', el: 'water', kind: 'intruder',
      spawnText: '瑠璃の深海神殿（乱入出現）',
      hp: 2050, atk: 118, def: 52, spd: 118,
      skills: [
        { name: '蒼波体当たり', scope: 'area2', mult: 1.2, ct: 0, desc: '敵2体に水ダメージ' },
        { name: '星海の残響歌', scope: 'all', mult: 1.32, ct: 3, desc: '敵全体に水大ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.2, turns: 2 } }
      ],
      lore: '星のような光点を背に宿す幻の深海鯨。その通り道には高純度の瑠璃結晶が残される。'
    },
    int_w5: {
      id: 'int_w5', name: '白金の時喰い鳥', kana: 'はっきんのときくいどり', world: 'w5', el: 'light', kind: 'intruder',
      spawnText: '白銀の星刻時計塔（乱入出現）',
      hp: 1920, atk: 126, def: 48, spd: 138,
      skills: [
        { name: '白金翼撃', scope: 'area2', mult: 1.22, ct: 0, desc: '敵2体に光ダメージ' },
        { name: '星刻加速羽', scope: 'all', mult: 1.34, ct: 3, desc: '敵全体に光大ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.28, turns: 2 } }
      ],
      lore: '時の綻びから現れる白銀の機械怪鳥。驚異的な速度で戦場を駆け抜ける。'
    },
    int_w6: {
      id: 'int_w6', name: '翡翠の一角獣', kana: 'ひすいのいっかくじゅう', world: 'w6', el: 'wind', kind: 'intruder',
      spawnText: '翠玉の世界樹森域（乱入出現）',
      hp: 2020, atk: 128, def: 50, spd: 136,
      skills: [
        { name: '翠角貫通', scope: 'single', mult: 1.32, ct: 0, desc: '敵単体に高威力風ダメージ' },
        { name: '精霊森の疾駆', scope: 'all', mult: 1.34, ct: 3, desc: '敵全体に風大ダメージ＋自身攻撃上昇', selfBuff: { type: 'atkUp', val: 0.22, turns: 2 } }
      ],
      lore: '深い霧の向こうから姿を見せる聖森の幻獣。清冽な風の角は一切の淀みを許さない。'
    },
    int_w7: {
      id: 'int_w7', name: '砂金のスカラベ王', kana: 'さきんのすからべおう', world: 'w7', el: 'fire', kind: 'intruder',
      spawnText: '黄昏の太陽砂都（乱入出現）',
      hp: 2180, atk: 132, def: 58, spd: 126,
      skills: [
        { name: '太陽玉衝突', scope: 'area2', mult: 1.24, ct: 0, desc: '敵2体に炎ダメージ' },
        { name: '黄金熱砂波', scope: 'all', mult: 1.38, ct: 3, desc: '敵全体に炎大ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } }
      ],
      lore: '黄金の甲殻を煌めかせる砂都の秘宝守護虫。倒せば上質な装備と石をもたらす。'
    },
    int_w8: {
      id: 'int_w8', name: '極光の白銀狐', kana: 'きょっこうのはくぎんぎつね', world: 'w8', el: 'water', kind: 'intruder',
      spawnText: '氷晶の極光凍城（乱入出現）',
      hp: 2160, atk: 136, def: 52, spd: 138,
      skills: [
        { name: '氷晶閃爪', scope: 'area2', mult: 1.24, ct: 0, desc: '敵2体に水ダメージ' },
        { name: 'オーロラ氷嵐', scope: 'all', mult: 1.40, ct: 3, desc: '敵全体に水大ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.22, turns: 2 } }
      ],
      lore: 'オーロラの夜にだけ凍城へ舞い降りる銀白の霊狐。踏みしめた足跡が氷の花へ変わる。'
    },
    int_w9: {
      id: 'int_w9', name: '蒼雷のファントム機', kana: 'そうらいのふぁんとむき', world: 'w9', el: 'light', kind: 'intruder',
      spawnText: '雷鳴の電脳尖塔（乱入出現）',
      hp: 2240, atk: 142, def: 54, spd: 142,
      skills: [
        { name: '光速プラズマ斬', scope: 'area2', mult: 1.26, ct: 0, desc: '敵2体に光ダメージ' },
        { name: 'オーバークロック雷', scope: 'all', mult: 1.44, ct: 3, desc: '敵全体に光大ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.26, turns: 2 } }
      ],
      lore: '電脳網の奥底から突如実体化する謎の試作機体。規格外の演算速度で敵を圧倒する。'
    },
    int_w10: {
      id: 'int_w10', name: '星間を駆ける銀竜', kana: 'せいかんをかけるぎんりゅう', world: 'w10', el: 'none', kind: 'intruder',
      spawnText: '終焉の星海回廊（乱入出現）',
      hp: 2480, atk: 148, def: 58, spd: 136,
      skills: [
        { name: '星尾掃討', scope: 'area3', mult: 1.22, ct: 0, desc: '敵3体に無属性ダメージ' },
        { name: '銀星収束息吹', scope: 'all', mult: 1.48, ct: 3, desc: '敵全体に極大無属性ダメージ' }
      ],
      lore: '異界と異界の狭間を遊泳する銀色の星竜。その鱗は全異界の記憶を映し出す。'
    },

    /* ===== エリアボス 20種（各異界 ステージ5・ステージ10単独ボス） ===== */
    boss_w1_5: {
      id: 'boss_w1_5', name: '鐘楼の風騎士', kana: 'しょうろうのかぜきし', world: 'w1', el: 'wind', kind: 'boss',
      spawnText: '蒼穹の天空遺跡（ステージ5 ボス）',
      hp: 1950, atk: 98, def: 42, spd: 112,
      skills: [
        { name: '蒼風突き', scope: 'single', mult: 1.15, ct: 0, desc: '敵単体に風属性ダメージ' },
        { name: '鐘楼の烈風陣', scope: 'all', mult: 1.22, ct: 3, desc: '敵全体に風大ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.2, turns: 2 } }
      ],
      lore: '蒼天の鐘楼を守り抜いた風騎士の残響。鐘の音と共に戦場全体を吹き飛ばす嵐を呼ぶ。'
    },
    boss_w1_10: {
      id: 'boss_w1_10', name: '蒼穹の白王残影', kana: 'そうきゅうのはくおうざんえい', world: 'w1', el: 'light', kind: 'boss',
      spawnText: '蒼穹の天空遺跡（ステージ10 ボス）',
      hp: 2550, atk: 108, def: 48, spd: 108,
      skills: [
        { name: '王剣一閃', scope: 'area2', mult: 1.12, ct: 0, desc: '敵2体に光属性ダメージ' },
        { name: '白王の裁定光', scope: 'all', mult: 1.32, ct: 3, desc: '敵全体に光極大ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.2, turns: 2 } }
      ],
      lore: 'かつて天空王国を統べた白王の記憶が具現化した姿。威厳に満ちた剣光が挑戦者を試す。'
    },
    boss_w2_5: {
      id: 'boss_w2_5', name: '炉心守衛バルカン', kana: 'ろしんしゅえいばるかん', world: 'w2', el: 'fire', kind: 'boss',
      spawnText: '紅蓮の蒸気鍛炉（ステージ5 ボス）',
      hp: 2350, atk: 108, def: 50, spd: 98,
      skills: [
        { name: '重鉄ハンマー', scope: 'single', mult: 1.22, ct: 0, desc: '敵単体に高威力炎ダメージ' },
        { name: '炉心噴火', scope: 'area3', mult: 1.26, ct: 3, desc: '敵3体に炎大ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.08, turns: 2 } }
      ],
      lore: '鍛冶の炉心を守る重装甲機神。巨大な鉄槌が振り下ろされるたび溶鉄の火柱が上がる。'
    },
    boss_w2_10: {
      id: 'boss_w2_10', name: '紅蓮の巨神機', kana: 'ぐれんのきょしんき', world: 'w2', el: 'fire', kind: 'boss',
      spawnText: '紅蓮の蒸気鍛炉（ステージ10 ボス）',
      hp: 2950, atk: 118, def: 54, spd: 102,
      skills: [
        { name: '溶鉄砲撃', scope: 'area2', mult: 1.18, ct: 0, desc: '敵2体に炎属性ダメージ' },
        { name: '大窯メルトダウン', scope: 'all', mult: 1.38, ct: 3, desc: '敵全体に極大炎ダメージ＋自身攻撃上昇', selfBuff: { type: 'atkUp', val: 0.22, turns: 2 } }
      ],
      lore: '鍛炉の最奥に鎮座する超大型蒸気兵器。凄まじい熱量で周囲の空間すら歪ませる。'
    },
    boss_w3_5: {
      id: 'boss_w3_5', name: '月影の剣舞姫', kana: 'つきかげのけんぶひめ', world: 'w3', el: 'dark', kind: 'boss',
      spawnText: '幽玄の夜桜古都（ステージ5 ボス）',
      hp: 2500, atk: 118, def: 46, spd: 120,
      skills: [
        { name: '月下双刀', scope: 'area2', mult: 1.15, ct: 0, desc: '敵2体に闇属性ダメージ' },
        { name: '桜月夜・乱れ舞', scope: 'all', mult: 1.32, ct: 3, desc: '敵全体に闇大ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.2, turns: 2 } }
      ],
      lore: '能舞台で永遠の舞を続ける妖艶な剣姫。華麗な舞の軌道がそのまま必殺の斬撃となる。'
    },
    boss_w3_10: {
      id: 'boss_w3_10', name: '千本桜の大天狗', kana: 'せんぼんざくらのおおてんぐ', world: 'w3', el: 'wind', kind: 'boss',
      spawnText: '幽玄の夜桜古都（ステージ10 ボス）',
      hp: 3150, atk: 126, def: 50, spd: 122,
      skills: [
        { name: '葉団扇の嵐', scope: 'area2', mult: 1.2, ct: 0, desc: '敵2体に風ダメージ' },
        { name: '桜嵐天狗おろし', scope: 'all', mult: 1.4, ct: 3, desc: '敵全体に極大風ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } }
      ],
      lore: '千本桜の本殿を司る古の大天狗。一煽りで舞い上がる花吹雪が嵐となって襲いかかる。'
    },
    boss_w4_5: {
      id: 'boss_w4_5', name: '海流の蒼騎士', kana: 'かいりゅうのそうきし', world: 'w4', el: 'water', kind: 'boss',
      spawnText: '瑠璃の深海神殿（ステージ5 ボス）',
      hp: 2950, atk: 122, def: 56, spd: 110,
      skills: [
        { name: '激流槍', scope: 'single', mult: 1.28, ct: 0, desc: '敵単体に高威力水ダメージ' },
        { name: '渦潮の裁き', scope: 'area3', mult: 1.3, ct: 3, desc: '敵3体に水大ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } }
      ],
      lore: '海流の祭壇を統べる深海騎士団の筆頭。水圧を纏った槍撃は重装甲すら易々と貫く。'
    },
    boss_w4_10: {
      id: 'boss_w4_10', name: '深淵の海竜王', kana: 'しんえんのかいりゅうおう', world: 'w4', el: 'water', kind: 'boss',
      spawnText: '瑠璃の深海神殿（ステージ10 ボス）',
      hp: 3650, atk: 132, def: 60, spd: 112,
      skills: [
        { name: '深海咬砕', scope: 'area2', mult: 1.22, ct: 0, desc: '敵2体に水ダメージ' },
        { name: '瑠璃の大津波', scope: 'all', mult: 1.44, ct: 3, desc: '敵全体に極大水ダメージ' }
      ],
      lore: '沈黙神殿の最深部に眠る古の海竜。目覚めたとき海底そのものが鳴動する。'
    },
    boss_w5_5: {
      id: 'boss_w5_5', name: '天球の守護審判機', kana: 'てんきゅうのしゅごしんぱんき', world: 'w5', el: 'light', kind: 'boss',
      spawnText: '白銀の星刻時計塔（ステージ5 ボス）',
      hp: 3250, atk: 132, def: 58, spd: 120,
      skills: [
        { name: '白金光輪', scope: 'area2', mult: 1.22, ct: 0, desc: '敵2体に光属性ダメージ' },
        { name: '天球審判砲', scope: 'all', mult: 1.42, ct: 3, desc: '敵全体に光大ダメージ＋自身攻撃上昇', selfBuff: { type: 'atkUp', val: 0.22, turns: 2 } }
      ],
      lore: '天球儀の円堂を守る白金の審判機体。精密な軌道計算で逃れられぬ光線を放つ。'
    },
    boss_w5_10: {
      id: 'boss_w5_10', name: '永劫の白銀時計神', kana: 'えいごうのはくぎんとけいしん', world: 'w5', el: 'light', kind: 'boss',
      spawnText: '白銀の星刻時計塔（ステージ10 ボス）',
      hp: 3950, atk: 142, def: 64, spd: 124,
      skills: [
        { name: '秒針断罪', scope: 'single', mult: 1.34, ct: 0, desc: '敵単体に超高威力光ダメージ' },
        { name: '星刻停止波', scope: 'all', mult: 1.48, ct: 3, desc: '敵全体に極大光ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.22, turns: 2 } }
      ],
      lore: '時計塔の心臓部を司る神造機械。時を刻む鐘音と共に無慈悲な光嵐を呼び起こす。'
    },
    boss_w6_5: {
      id: 'boss_w6_5', name: '翠森の大鹿王', kana: 'すいしんのおおじかおう', world: 'w6', el: 'wind', kind: 'boss',
      spawnText: '翠玉の世界樹森域（ステージ5 ボス）',
      hp: 3500, atk: 136, def: 60, spd: 122,
      skills: [
        { name: '翠玉角撃', scope: 'area2', mult: 1.24, ct: 0, desc: '敵2体に風ダメージ' },
        { name: '聖森の翠嵐', scope: 'all', mult: 1.45, ct: 3, desc: '敵全体に風大ダメージ＋自身防御上昇', selfBuff: { type: 'defUp', val: 0.24, turns: 2 } }
      ],
      lore: '古樹の守護壇に君臨する翡翠角の鹿王。清らかな風が森の侵攻者を吹き払う。'
    },
    boss_w6_10: {
      id: 'boss_w6_10', name: '世界樹の精霊竜', kana: 'せかいじゅのせいれいりゅう', world: 'w6', el: 'wind', kind: 'boss',
      spawnText: '翠玉の世界樹森域（ステージ10 ボス）',
      hp: 4250, atk: 146, def: 66, spd: 124,
      skills: [
        { name: '翠鱗の翼嵐', scope: 'area3', mult: 1.24, ct: 0, desc: '敵3体に風属性ダメージ' },
        { name: '生命樹の裁き', scope: 'all', mult: 1.52, ct: 3, desc: '敵全体に極大風ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.22, turns: 2 } }
      ],
      lore: '世界樹の樹冠に棲まう太古の精霊竜。翼を広げるたび生命の緑光が天を覆う。'
    },
    boss_w7_5: {
      id: 'boss_w7_5', name: '砂漠の黄金スフィンクス', kana: 'さばくのおうごんすふぃんくす', world: 'w7', el: 'fire', kind: 'boss',
      spawnText: '黄昏の太陽砂都（ステージ5 ボス）',
      hp: 3800, atk: 144, def: 64, spd: 116,
      skills: [
        { name: '灼熱の獅爪', scope: 'area2', mult: 1.26, ct: 0, desc: '敵2体に炎ダメージ' },
        { name: '太陽の試練光', scope: 'all', mult: 1.48, ct: 3, desc: '敵全体に炎大ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } }
      ],
      lore: '太陽神の参門を守る黄金の守護獣。王墓へ挑む者の資格を烈火の眼光で測る。'
    },
    boss_w7_10: {
      id: 'boss_w7_10', name: '太陽王ファラオ残響', kana: 'たいようおうふぁらおざんきょう', world: 'w7', el: 'fire', kind: 'boss',
      spawnText: '黄昏の太陽砂都（ステージ10 ボス）',
      hp: 4550, atk: 156, def: 68, spd: 118,
      skills: [
        { name: '黄金笏の閃炎', scope: 'area2', mult: 1.28, ct: 0, desc: '敵2体に炎ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.08, turns: 2 } },
        { name: '紅陽崩壊波', scope: 'all', mult: 1.56, ct: 3, desc: '敵全体に極大炎ダメージ＋自身攻撃上昇', selfBuff: { type: 'atkUp', val: 0.24, turns: 2 } }
      ],
      lore: '紅陽の大ピラミッド最奥に座す古代砂漠王。沈まぬ太陽の威光を纏って顕現する。'
    },
    boss_w8_5: {
      id: 'boss_w8_5', name: '氷鏡の白銀騎士長', kana: 'ひょうきょうのはくぎんきしちょう', world: 'w8', el: 'water', kind: 'boss',
      spawnText: '氷晶の極光凍城（ステージ5 ボス）',
      hp: 4050, atk: 150, def: 70, spd: 118,
      skills: [
        { name: '蒼氷連槍', scope: 'area2', mult: 1.26, ct: 0, desc: '敵2体に水ダメージ' },
        { name: '氷鏡結界斬', scope: 'all', mult: 1.50, ct: 3, desc: '敵全体に水大ダメージ＋自身防御上昇', selfBuff: { type: 'defUp', val: 0.26, turns: 2 } }
      ],
      lore: '氷鏡殿を統べる冷徹なる騎士団長。澄み渡る刃筋が相手の動きごと凍りつかせる。'
    },
    boss_w8_10: {
      id: 'boss_w8_10', name: '極光の氷女王', kana: 'きょっこうのこおりじょおう', world: 'w8', el: 'water', kind: 'boss',
      spawnText: '氷晶の極光凍城（ステージ10 ボス）',
      hp: 4850, atk: 162, def: 72, spd: 124,
      skills: [
        { name: '結晶氷柱雨', scope: 'area3', mult: 1.26, ct: 0, desc: '敵3体に水ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.2, turns: 2 } },
        { name: '絶対零度オーロラ', scope: 'all', mult: 1.60, ct: 3, desc: '敵全体に極大水ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.22, turns: 2 } }
      ],
      lore: '永久凍土の城塞を統治する孤高の氷女王。美しい極光の下ですべてを静寂の氷へ封じる。'
    },
    boss_w9_5: {
      id: 'boss_w9_5', name: '雷装機神ヴァルト', kana: 'らいそうきしんゔぁると', world: 'w9', el: 'light', kind: 'boss',
      spawnText: '雷鳴の電脳尖塔（ステージ5 ボス）',
      hp: 4300, atk: 160, def: 68, spd: 128,
      skills: [
        { name: '電磁大剣', scope: 'area2', mult: 1.28, ct: 0, desc: '敵2体に光属性ダメージ' },
        { name: '高圧プラズマ嵐', scope: 'all', mult: 1.54, ct: 3, desc: '敵全体に光大ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.24, turns: 2 } }
      ],
      lore: '電脳尖塔の中層防衛を司る雷装機神。光速の斬撃と高圧放電で侵入者を圧倒する。'
    },
    boss_w9_10: {
      id: 'boss_w9_10', name: '電脳統治機ゼウス', kana: 'でんのうとうちきぜうす', world: 'w9', el: 'light', kind: 'boss',
      spawnText: '雷鳴の電脳尖塔（ステージ10 ボス）',
      hp: 5200, atk: 172, def: 74, spd: 130,
      skills: [
        { name: '天雷の裁き線', scope: 'area3', mult: 1.28, ct: 0, desc: '敵3体に光属性ダメージ' },
        { name: '超電磁オーバーロード', scope: 'all', mult: 1.66, ct: 3, desc: '敵全体に極大光ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.24, turns: 2 } }
      ],
      lore: '尖塔頂上で都市全体の電力を統御する至高AI機体。天を裂く雷撃を自在に降らせる。'
    },
    boss_w10_5: {
      id: 'boss_w10_5', name: '虚無の門番アビス', kana: 'きょむのもんばんあびす', world: 'w10', el: 'dark', kind: 'boss',
      spawnText: '終焉の星海回廊（ステージ5 ボス）',
      hp: 4700, atk: 168, def: 72, spd: 126,
      skills: [
        { name: '虚無裂断', scope: 'area2', mult: 1.30, ct: 0, desc: '敵2体に闇ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } },
        { name: '深淵の星呑み', scope: 'all', mult: 1.60, ct: 3, desc: '敵全体に闇極大ダメージ' }
      ],
      lore: '虚星の大円環を護る漆黒の門番。境界を越えようとする者の意志を闇の奔流で試す。'
    },
    boss_w10_10: {
      id: 'boss_w10_10', name: '境界の零皇残響', kana: 'きょうかいのれいこうざんきょう', world: 'w10', el: 'none', kind: 'boss',
      spawnText: '終焉の星海回廊（ステージ10 ボス）',
      hp: 5800, atk: 184, def: 78, spd: 128,
      skills: [
        { name: '零点星槍', scope: 'area3', mult: 1.30, ct: 0, desc: '敵3体に無属性ダメージ' },
        { name: '星海終焉の残響', scope: 'all', mult: 1.72, ct: 3, desc: '敵全体に極大無属性ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.24, turns: 2 } }
      ],
      lore: '星海回廊の零点に座す万象の残響王。全異界の記憶と力を収束させた究極の試練。'
    },

    /* ===== 異界討伐専用 単独巨大ボス6体（kind: 'raid'・属性順：炎→水→風→光→闇→無） ===== */
    raid_2: {
      id: 'raid_2', name: '炎魔機イグニス', kana: 'えんまきいぐにす', world: 'w2', el: 'fire', kind: 'raid',
      spawnText: '異界討伐・炎魔の炉心戦',
      hp: 4900, atk: 134, def: 58, spd: 108,
      skills: [
        { name: '溶鉄の鉄槌', scope: 'single', mult: 1.35, ct: 0, desc: '敵単体に超高威力炎ダメージ' },
        { name: '焦土の炉心解放', scope: 'all', mult: 1.52, ct: 3, desc: '敵全体に炎大ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.1, turns: 2 } }
      ],
      lore: '紅蓮の地下深部で封印されていた禁断の炎魔機。膨大な熱量で全てを焼き尽くす。'
    },
    raid_4: {
      id: 'raid_4', name: '海皇レヴィア', kana: 'かいおうれゔぃあ', world: 'w4', el: 'water', kind: 'raid',
      spawnText: '異界討伐・深海皇討伐',
      hp: 5600, atk: 142, def: 62, spd: 112,
      skills: [
        { name: '深海圧壊槍', scope: 'single', mult: 1.38, ct: 0, desc: '敵単体に水属性大ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } },
        { name: '蒼淵の大津波', scope: 'all', mult: 1.58, ct: 3, desc: '敵全体に極大水ダメージ' }
      ],
      lore: '七つの異界の海を統べると伝えられる深海皇。目覚めれば海流そのものが武器と化す。'
    },
    raid_1: {
      id: 'raid_1', name: '嵐帝ヴァルキリア', kana: 'らんていゔぁるきりあ', world: 'w1', el: 'wind', kind: 'raid',
      spawnText: '異界討伐・嵐帝の試練',
      hp: 6200, atk: 148, def: 60, spd: 120,
      skills: [
        { name: '烈風の断罪', scope: 'area2', mult: 1.22, ct: 0, desc: '敵2体に風属性ダメージ' },
        { name: '蒼天破滅嵐', scope: 'all', mult: 1.54, ct: 3, desc: '敵全体に極大風ダメージ＋自身の速度上昇', selfBuff: { type: 'spdUp', val: 0.24, turns: 2 } }
      ],
      lore: '蒼穹の果てに君臨する古の嵐帝。討伐すれば限定装備の素材と蒼風の英雄の鍵を得る。'
    },
    raid_5: {
      id: 'raid_5', name: '星刻神クロノア', kana: 'せいこくしんくろのあ', world: 'w5', el: 'light', kind: 'raid',
      spawnText: '異界討伐・星刻神機戦',
      hp: 7100, atk: 158, def: 66, spd: 124,
      skills: [
        { name: '白金裁定線', scope: 'area2', mult: 1.26, ct: 0, desc: '敵2体に光属性ダメージ' },
        { name: '永劫の時盤崩壊', scope: 'all', mult: 1.66, ct: 3, desc: '敵全体に光極大ダメージ＋自身の攻撃上昇', selfBuff: { type: 'atkUp', val: 0.25, turns: 2 } }
      ],
      lore: '時計塔を創造した最古の天球神機。あらゆる刻を司り、揺らぎなき光で戦場を貫く。'
    },
    raid_3: {
      id: 'raid_3', name: '妖桜帝クチナワ', kana: 'ようおうていくちなわ', world: 'w3', el: 'dark', kind: 'raid',
      spawnText: '異界討伐・妖桜帝討伐',
      hp: 7800, atk: 164, def: 68, spd: 122,
      skills: [
        { name: '夜桜の大蛇牙', scope: 'area2', mult: 1.28, ct: 0, desc: '敵2体に闇ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } },
        { name: '常闇の千花葬', scope: 'all', mult: 1.68, ct: 3, desc: '敵全体に闇大ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.22, turns: 2 } }
      ],
      lore: '桜京の根底に横たわる古の大妖。その鱗は散らぬ夜桜の花弁で覆われている。'
    },
    raid_6: {
      id: 'raid_6', name: '終焉残響オメガ', kana: 'しゅうえんざんきょうおめが', world: 'w10', el: 'none', kind: 'raid',
      spawnText: '異界討伐・終焉残響戦',
      hp: 9200, atk: 180, def: 76, spd: 124,
      skills: [
        { name: '零点破断', scope: 'area3', mult: 1.28, ct: 0, desc: '敵3体に無属性ダメージ' },
        { name: '異界収束砲', scope: 'all', mult: 1.78, ct: 3, desc: '敵全体に極大無属性ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.25, turns: 2 } }
      ],
      lore: 'あらゆる異界の終焉が結晶化した究極の残響体。これを制した者こそ真の異界踏破者である。'
    }
  };

  /* 常設PvE②：異界討伐（属性順：炎→水→風→光→闇→無・各ボスUR解放用の覇王の印つき） */
  const RAIDS = [
    {
      id: 'r2', name: '炎魔の炉心戦', world: 'w2', el: 'fire', bossId: 'raid_2',
      matId: 'mat_flame', matName: '炎魔の炉核',
      charId: 'c_ssr_2', bossCharId: 'c_ur_ignis', bossMarkName: '炎魔の覇印',
      power: 3.0, desc: '炎魔の炉核・ヴァルの鍵・炎魔の覇印を獲得'
    },
    {
      id: 'r4', name: '深海皇討伐', world: 'w4', el: 'water', bossId: 'raid_4',
      matId: 'mat_abyss', matName: '深海の真珠核',
      charId: 'c_ssr_5', bossCharId: 'c_ur_levia', bossMarkName: '海皇の覇印',
      power: 6.2, desc: '深海の真珠核・ネレイアの鍵・海皇の覇印を獲得'
    },
    {
      id: 'r1', name: '嵐帝の試練', world: 'w1', el: 'wind', bossId: 'raid_1',
      matId: 'mat_storm', matName: '嵐帝の羽核',
      charId: 'c_ur_1', bossCharId: 'c_ur_valk', bossMarkName: '嵐帝の覇印',
      power: 11.5, desc: '嵐帝の羽核・セラフィナの鍵・嵐帝の覇印を獲得'
    },
    {
      id: 'r5', name: '星刻神機戦', world: 'w5', el: 'light', bossId: 'raid_5',
      matId: 'mat_clock', matName: '星刻の白金核',
      charId: 'c_ur_3', bossCharId: 'c_ur_chrono', bossMarkName: '星刻の覇印',
      power: 21.0, desc: '星刻の白金核・アルテミシアの鍵・星刻の覇印を獲得'
    },
    {
      id: 'r3', name: '妖桜帝討伐', world: 'w3', el: 'dark', bossId: 'raid_3',
      matId: 'mat_sakura', matName: '妖桜の霊核',
      charId: 'c_ur_2', bossCharId: 'c_ur_kuchi', bossMarkName: '妖桜の覇印',
      power: 36.0, desc: '妖桜の霊核・カグヤの鍵・妖桜の覇印を獲得'
    },
    {
      id: 'r6', name: '終焉残響戦', world: 'w10', el: 'none', bossId: 'raid_6',
      matId: 'mat_omega', matName: '終焉の零核',
      charId: 'c_ur_4', bossCharId: 'c_ur_omega', bossMarkName: '終焉の覇印',
      power: 64.0, desc: '終焉の零核・ノヴァの鍵・終焉の覇印を獲得'
    }
  ];

  /* 常設PvE③：総力連戦「残響回廊」（最大3部隊12人・重複不可） */
  const GAUNTLETS = [
    {
      id: 'g1', name: '第一回廊・黎明', world: 'w1', power: 2.5, rewardStone: 450, rewardMat: 'mat_storm',
      stages: [
        { label: '第1戦', bossId: 'boss_w1_5',  mult: 0.9 },
        { label: '第2戦', bossId: 'boss_w2_5',  mult: 1.05 },
        { label: '第3戦', bossId: 'boss_w1_10', mult: 1.2 }
      ]
    },
    {
      id: 'g2', name: '第二回廊・幽海', world: 'w4', power: 9.0, rewardStone: 850, rewardMat: 'mat_abyss',
      stages: [
        { label: '第1戦', bossId: 'boss_w3_5',  mult: 0.95 },
        { label: '第2戦', bossId: 'boss_w4_5',  mult: 1.1 },
        { label: '第3戦', bossId: 'boss_w4_10', mult: 1.25 }
      ]
    },
    {
      id: 'g3', name: '第三回廊・聖砂', world: 'w7', power: 30.0, rewardStone: 1400, rewardMat: 'mat_clock',
      stages: [
        { label: '第1戦', bossId: 'boss_w5_10', mult: 0.95 },
        { label: '第2戦', bossId: 'boss_w6_10', mult: 1.1 },
        { label: '第3戦', bossId: 'boss_w7_10', mult: 1.25 }
      ]
    },
    {
      id: 'g4', name: '第四回廊・終焉', world: 'w10', power: 88.0, rewardStone: 2200, rewardMat: 'mat_omega',
      stages: [
        { label: '第1戦', bossId: 'boss_w8_10',  mult: 1.0 },
        { label: '第2戦', bossId: 'boss_w9_10',  mult: 1.12 },
        { label: '第3戦', bossId: 'boss_w10_10', mult: 1.28 }
      ]
    }
  ];

  /* 常設PvE④：深淵の塔（100階層・5層ごと単独ボス・25/50/75/100Fに塔限定キャラ4体！） */
  const TOWER_MAX_FLOOR = 100;
  const TOWER_MILESTONES = Object.freeze({
    10:  { kind: 'ability', id: 'ab_tower_10',  label: '第10層：自由アビリティ「深淵踏破の証」' },
    25:  { kind: 'char',    id: 'c_tw_25',      label: '第25層：塔限定SR「フレア」仲間加入' },
    40:  { kind: 'ability', id: 'ab_tower_40',  label: '第40層：自由アビリティ「深淵覇者の印」' },
    50:  { kind: 'char',    id: 'c_tw_50',      label: '第50層：塔限定SSR「グレイス」仲間加入' },
    65:  { kind: 'ability', id: 'ab_tower_65',  label: '第65層：自由アビリティ「星淵の極意」' },
    75:  { kind: 'char',    id: 'c_tw_75',      label: '第75層：塔限定SSR「ライデン」仲間加入' },
    90:  { kind: 'ability', id: 'ab_tower_90',  label: '第90層：自由アビリティ「奈落制覇の魂」' },
    100: { kind: 'char',    id: 'c_tw_100',     label: '第100層：塔限定UR「アストレア」仲間加入' }
  });

  function getTowerFloor(floor) {
    const f = Math.max(1, Math.min(TOWER_MAX_FLOOR, floor));
    const worldIdx = Math.min(WORLDS.length - 1, Math.floor((f - 1) / 10));
    const world = WORLDS[worldIdx];
    const isBoss = f % 5 === 0;
    const bossId = isBoss ? (f % 10 === 0 ? `boss_${world.id}_10` : `boss_${world.id}_5`) : null;
    const power = Number((1.10 * Math.pow(1.052, f - 1)).toFixed(2));
    const milestone = TOWER_MILESTONES[f] || null;
    return {
      floor: f,
      name: `深淵の塔 第${f}層`,
      world: world.id,
      isBoss,
      bossId,
      power,
      firstStone: isBoss ? 300 + f * 8 : 100 + f * 4,
      milestone
    };
  }

  /* 常設PvE⑤：試練の狭間（属性・ロール・低レア条件チャレンジ） */
  const TRIALS = [
    { id: 't1', name: '紅蓮の証明',   world: 'w2',  ruleText: '炎属性キャラのみで編成',     ruleType: 'el',       ruleVal: 'fire',  bossId: 'boss_w2_5',  power: 3.0,  rewardAbility: 'ab_fire_master',  rewardStone: 400 },
    { id: 't2', name: '蒼海の証明',   world: 'w4',  ruleText: '水属性キャラのみで編成',     ruleType: 'el',       ruleVal: 'water', bossId: 'boss_w4_5',  power: 6.5,  rewardAbility: 'ab_water_master', rewardStone: 450 },
    { id: 't3', name: '翠風の証明',   world: 'w1',  ruleText: '風属性キャラのみで編成',     ruleType: 'el',       ruleVal: 'wind',  bossId: 'boss_w1_10', power: 2.8,  rewardAbility: 'ab_wind_master',  rewardStone: 400 },
    { id: 't4', name: '光闇の交差',   world: 'w5',  ruleText: '光または闇属性のみで編成',   ruleType: 'elPair',   ruleVal: ['light', 'dark'], bossId: 'boss_w5_5', power: 12.0, rewardAbility: 'ab_ld_master', rewardStone: 600 },
    { id: 't5', name: '無垢なる誇り', world: 'w10', ruleText: '無属性キャラのみで編成',     ruleType: 'el',       ruleVal: 'none',  bossId: 'boss_w10_5', power: 45.0, rewardAbility: 'ab_none_master',  rewardStone: 800 },
    { id: 't6', name: '鉄壁と癒し',   world: 'w4',  ruleText: 'タンクとヒーラーを各1人以上', ruleType: 'rolesReq', ruleVal: ['tank', 'healer'], bossId: 'boss_w4_10', power: 9.5, rewardAbility: 'ab_iron_wall', rewardStone: 550 },
    { id: 't7', name: '凡才の極致',   world: 'w3',  ruleText: 'N〜SRレアのみで編成',       ruleType: 'maxRar',   ruleVal: 'SR',    bossId: 'boss_w3_5',  power: 4.8,  rewardAbility: 'ab_underdog',     rewardStone: 600 },
    { id: 't8', name: '三傑の突破',   world: 'w8',  ruleText: '3人以下のパーティで出撃',   ruleType: 'maxCount', ruleVal: 3,       bossId: 'boss_w8_5',  power: 28.0, rewardAbility: 'ab_trio_pride',   rewardStone: 900 }
  ];

  function getWorldNormalEnemies(worldId) {
    return Object.values(ENEMIES).filter((e) => e.world === worldId && e.kind === 'normal');
  }

  /* 敵の公式ソート：属性順（炎→水→風→光→闇→無）→ 種別順（通常敵→乱入→エリアボス→異界討伐ボス）→ 五十音順 */
  function compareEnemy(a, b) {
    const eDiff = (ELEMENTS[a.el] ? ELEMENTS[a.el].order : 9) - (ELEMENTS[b.el] ? ELEMENTS[b.el].order : 9);
    if (eDiff !== 0) return eDiff;
    const kDiff = (ENEMY_KIND_ORDER[a.kind] ?? 9) - (ENEMY_KIND_ORDER[b.kind] ?? 9);
    if (kDiff !== 0) return kDiff;
    return (a.kana || a.name).localeCompare(b.kana || b.name, 'ja');
  }

  function getAllEnemiesSorted() {
    return Object.values(ENEMIES).sort(compareEnemy);
  }

  Object.defineProperty(window, '__IZ_WORLDS__', {
    value: Object.freeze({
      ELEMENTS,
      ROLES,
      RARITIES,
      ENEMY_KIND_ORDER,
      WORLDS,
      ENEMIES,
      RAIDS,
      GAUNTLETS,
      TOWER_MAX_FLOOR,
      TOWER_MILESTONES,
      TRIALS,
      getTowerFloor,
      getWorldNormalEnemies,
      compareEnemy,
      getAllEnemiesSorted
    }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
