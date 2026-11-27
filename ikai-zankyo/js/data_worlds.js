/* 6異界・36メインステージ・敵/ボス/乱入データ（技2枠・図鑑紹介文つき）・常設PvE5種 */
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

  const WORLDS = [
    {
      id: 'w1',
      name: '蒼穹の廃都',
      theme: '古代王国の幻想廃墟',
      mainEl: 'wind',
      drops: ['s_sky', 's_oath'],
      intruderId: 'int_w1',
      stages: [
        { num: 1, name: '風渡る外門', power: 1.0,  isBoss: false },
        { num: 2, name: '白石の回廊', power: 1.16, isBoss: false },
        { num: 3, name: '蒼天の鐘楼', power: 1.38, isBoss: true,  bossId: 'boss_w1_3' },
        { num: 4, name: '崩れた書庫', power: 1.56, isBoss: false },
        { num: 5, name: '星見の中庭', power: 1.75, isBoss: false },
        { num: 6, name: '王座の残跡', power: 2.05, isBoss: true,  bossId: 'boss_w1_6' }
      ]
    },
    {
      id: 'w2',
      name: '紅蓮の溶鉄炉',
      theme: '蒸気と火山の機工要塞',
      mainEl: 'fire',
      drops: ['s_forge', 's_oath'],
      intruderId: 'int_w2',
      stages: [
        { num: 1, name: '灰煙の坑道', power: 2.25, isBoss: false },
        { num: 2, name: '赤熱の配管', power: 2.50, isBoss: false },
        { num: 3, name: '鍛冶の炉心', power: 2.85, isBoss: true,  bossId: 'boss_w2_3' },
        { num: 4, name: '熔岩の水門', power: 3.15, isBoss: false },
        { num: 5, name: '鉄槌の回廊', power: 3.50, isBoss: false },
        { num: 6, name: '紅蓮の大窯', power: 4.00, isBoss: true,  bossId: 'boss_w2_6' }
      ]
    },
    {
      id: 'w3',
      name: '幽玄の桜京',
      theme: '夜桜と妖気が漂う古都',
      mainEl: 'dark',
      drops: ['s_sakura', 's_veil'],
      intruderId: 'int_w3',
      stages: [
        { num: 1, name: '薄紅の鳥居', power: 4.35, isBoss: false },
        { num: 2, name: '燈籠の小路', power: 4.75, isBoss: false },
        { num: 3, name: '月影の舞台', power: 5.30, isBoss: true,  bossId: 'boss_w3_3' },
        { num: 4, name: '霧深き竹林', power: 5.80, isBoss: false },
        { num: 5, name: '鏡池の離宮', power: 6.35, isBoss: false },
        { num: 6, name: '千本桜の本殿', power: 7.15, isBoss: true, bossId: 'boss_w3_6' }
      ]
    },
    {
      id: 'w4',
      name: '深海の沈黙神殿',
      theme: '瑠璃の光を宿す海底遺跡',
      mainEl: 'water',
      drops: ['s_abyss', 's_tide'],
      intruderId: 'int_w4',
      stages: [
        { num: 1, name: '珊瑚の裂け目', power: 7.70, isBoss: false },
        { num: 2, name: '泡立つ回廊', power: 8.35, isBoss: false },
        { num: 3, name: '海流の祭壇', power: 9.20, isBoss: true,  bossId: 'boss_w4_3' },
        { num: 4, name: '沈黙の書庫', power: 10.0, isBoss: false },
        { num: 5, name: '真珠の玉座道', power: 10.9, isBoss: false },
        { num: 6, name: '深淵の聖堂', power: 12.2, isBoss: true,  bossId: 'boss_w4_6' }
      ]
    },
    {
      id: 'w5',
      name: '白銀の星刻機構',
      theme: '歯車と光脈が巡る天球都市',
      mainEl: 'light',
      drops: ['s_clock', 's_tide'],
      intruderId: 'int_w5',
      stages: [
        { num: 1, name: '白金の外輪', power: 13.1, isBoss: false },
        { num: 2, name: '秒針の通路', power: 14.2, isBoss: false },
        { num: 3, name: '天球儀の広間', power: 15.6, isBoss: true, bossId: 'boss_w5_3' },
        { num: 4, name: '光脈の制御室', power: 17.0, isBoss: false },
        { num: 5, name: '白銀の螺旋塔', power: 18.5, isBoss: false },
        { num: 6, name: '永劫の時針殿', power: 20.6, isBoss: true, bossId: 'boss_w5_6' }
      ]
    },
    {
      id: 'w6',
      name: '虚無の星間回廊',
      theme: '星雲と残響が交わる終焉境界',
      mainEl: 'none',
      drops: ['s_void', 's_veil'],
      intruderId: 'int_w6',
      stages: [
        { num: 1, name: '星屑の縁', power: 22.0, isBoss: false },
        { num: 2, name: '残響の渡り廊', power: 23.8, isBoss: false },
        { num: 3, name: '無音の観測門', power: 26.2, isBoss: true,  bossId: 'boss_w6_3' },
        { num: 4, name: '星雲の分岐点', power: 28.5, isBoss: false },
        { num: 5, name: '記憶の断層', power: 31.0, isBoss: false },
        { num: 6, name: '境界の零点', power: 35.0, isBoss: true,  bossId: 'boss_w6_6' }
      ]
    }
  ];

  /* 敵データ（全員に技2つ・単体/範囲/全体・図鑑紹介文つき） */
  const ENEMIES = {
    /* 通常敵（各異界3種） */
    m_w1_1: {
      id: 'm_w1_1', name: '蒼風の斥候', world: 'w1', el: 'wind', kind: 'normal',
      hp: 460, atk: 68, def: 28, spd: 108,
      skills: [
        { name: '疾風斬り', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に風属性ダメージ' },
        { name: 'つむじ薙ぎ', scope: 'area2', mult: 1.25, ct: 3, desc: '敵2体にダメージ＋自身の速度上昇', selfBuff: { type: 'spdUp', val: 0.15, turns: 2 } }
      ],
      lore: '崩壊した王都の城壁を今も巡回し続ける風の幻影兵。主を失っても任務だけは忘れていない。'
    },
    m_w1_2: {
      id: 'm_w1_2', name: '石像の衛兵', world: 'w1', el: 'none', kind: 'normal',
      hp: 620, atk: 58, def: 46, spd: 86,
      skills: [
        { name: '重盾打ち', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '堅城の構え', scope: 'single', mult: 1.15, ct: 3, desc: '敵単体にダメージ＋自身の防御上昇', selfBuff: { type: 'defUp', val: 0.25, turns: 2 } }
      ],
      lore: '蒼穹の廃都の門を守るため刻まれた石造の守護者。風雨に削られながらも揺るがぬ盾を構える。'
    },
    m_w1_3: {
      id: 'm_w1_3', name: '光羽の詠唱者', world: 'w1', el: 'light', kind: 'normal',
      hp: 430, atk: 74, def: 24, spd: 102,
      skills: [
        { name: '光の矢', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: '白光の波紋', scope: 'all', mult: 0.85, ct: 3, desc: '敵全体に光属性ダメージ' }
      ],
      lore: '王都の鐘楼に宿った光の残滓。祈りの旋律を刃に変えて侵入者を退ける。'
    },

    m_w2_1: {
      id: 'm_w2_1', name: '炭火の機兵', world: 'w2', el: 'fire', kind: 'normal',
      hp: 520, atk: 76, def: 34, spd: 98,
      skills: [
        { name: '灼鉄打撃', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に炎属性ダメージ' },
        { name: '火粉噴射', scope: 'area2', mult: 1.2, ct: 3, desc: '敵2体にダメージ＋火傷付与', debuff: { type: 'burn', val: 0.06, turns: 2 } }
      ],
      lore: '溶鉄炉の高温に耐えるよう鍛えられた自動機兵。炉心が冷えるまで稼働を止めない。'
    },
    m_w2_2: {
      id: 'm_w2_2', name: '蒸気の砲手', world: 'w2', el: 'fire', kind: 'normal',
      hp: 450, atk: 84, def: 26, spd: 105,
      skills: [
        { name: '高圧弾', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に炎属性ダメージ' },
        { name: '広域掃射', scope: 'all', mult: 0.9, ct: 3, desc: '敵全体に炎属性ダメージ' }
      ],
      lore: '配管の合間から高圧の蒸気弾を撃ち出す機工射手。轟音とともに敵陣を焼き払う。'
    },
    m_w2_3: {
      id: 'm_w2_3', name: '黒鉄の防壁機', world: 'w2', el: 'none', kind: 'normal',
      hp: 680, atk: 60, def: 52, spd: 82,
      skills: [
        { name: '鉄板押し', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '防熱展開', scope: 'area2', mult: 1.1, ct: 3, desc: '敵2体にダメージ＋自身の防御上昇', selfBuff: { type: 'defUp', val: 0.25, turns: 2 } }
      ],
      lore: '熔岩の氾濫から炉心を守る重装甲機体。分厚い黒鉄は並の刃を弾き返す。'
    },

    m_w3_1: {
      id: 'm_w3_1', name: '夜桜の剣鬼', world: 'w3', el: 'dark', kind: 'normal',
      hp: 480, atk: 85, def: 28, spd: 112,
      skills: [
        { name: '花散らし', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に闇属性ダメージ' },
        { name: '桜吹雪の斬', scope: 'area2', mult: 1.3, ct: 3, desc: '敵2体にダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.15, turns: 2 } }
      ],
      lore: '散りゆく桜の下で永遠に剣を振るい続ける影の武人。その一太刀には艶やかな妖気が宿る。'
    },
    m_w3_2: {
      id: 'm_w3_2', name: '狐火の灯守', world: 'w3', el: 'fire', kind: 'normal',
      hp: 440, atk: 80, def: 26, spd: 108,
      skills: [
        { name: '青炎投げ', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に炎属性ダメージ' },
        { name: '鬼火の輪', scope: 'all', mult: 0.9, ct: 3, desc: '敵全体に炎ダメージ＋火傷', debuff: { type: 'burn', val: 0.06, turns: 2 } }
      ],
      lore: '古都の燈籠に灯をともして歩く妖狐の幻。迷い込んだ旅人を妖しい炎で惑わせる。'
    },
    m_w3_3: {
      id: 'm_w3_3', name: '霧面の陰陽人形', world: 'w3', el: 'wind', kind: 'normal',
      hp: 530, atk: 72, def: 36, spd: 99,
      skills: [
        { name: '式札飛ばし', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に風属性ダメージ' },
        { name: '呪縛の風', scope: 'area2', mult: 1.2, ct: 3, desc: '敵2体にダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.15, turns: 2 } }
      ],
      lore: 'かつて都を守護した陰陽師が残した絡繰人形。霧深い竹林で今も結界を張り続ける。'
    },

    m_w4_1: {
      id: 'm_w4_1', name: '珊瑚の槍兵', world: 'w4', el: 'water', kind: 'normal',
      hp: 560, atk: 76, def: 38, spd: 96,
      skills: [
        { name: '潮槍突き', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水属性ダメージ' },
        { name: '渦潮突き', scope: 'area2', mult: 1.28, ct: 3, desc: '敵2体にダメージ＋防御低下', debuff: { type: 'defDown', val: 0.18, turns: 2 } }
      ],
      lore: '硬質な紅珊瑚を穂先に削り出した海底神殿の衛兵。水圧をまとった突きは鎧を穿つ。'
    },
    m_w4_2: {
      id: 'm_w4_2', name: '蒼泡の巫女影', world: 'w4', el: 'water', kind: 'normal',
      hp: 470, atk: 78, def: 30, spd: 106,
      skills: [
        { name: '水球弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水属性ダメージ' },
        { name: '静寂の潮波', scope: 'all', mult: 0.92, ct: 3, desc: '敵全体に水属性ダメージ' }
      ],
      lore: '沈んだ聖堂の祈りを記憶する水の残響。静かな泡の奥に深海の高圧を秘めている。'
    },
    m_w4_3: {
      id: 'm_w4_3', name: '深淵の貝甲獣', world: 'w4', el: 'dark', kind: 'normal',
      hp: 660, atk: 68, def: 48, spd: 86,
      skills: [
        { name: '重殻打ち', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇属性ダメージ' },
        { name: '闇潮の鎧', scope: 'single', mult: 1.25, ct: 3, desc: '敵単体にダメージ＋自身の防御上昇', selfBuff: { type: 'defUp', val: 0.28, turns: 2 } }
      ],
      lore: '海底の暗がりで永い年月を過ごした甲殻の異界獣。真珠色の殻は光すら吸い込む。'
    },

    m_w5_1: {
      id: 'm_w5_1', name: '白銀の秒針衛', world: 'w5', el: 'light', kind: 'normal',
      hp: 520, atk: 84, def: 34, spd: 114,
      skills: [
        { name: '光針の一閃', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: '刻限の連撃', scope: 'area2', mult: 1.32, ct: 3, desc: '敵2体に光属性ダメージ＋速度上昇', selfBuff: { type: 'spdUp', val: 0.18, turns: 2 } }
      ],
      lore: '星刻機構の規律を保つ高速警備機。狂いのない歩調で異分子を排除する。'
    },
    m_w5_2: {
      id: 'm_w5_2', name: '天球の観測機', world: 'w5', el: 'none', kind: 'normal',
      hp: 490, atk: 82, def: 32, spd: 104,
      skills: [
        { name: '収束光線', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '星脈掃射', scope: 'all', mult: 0.94, ct: 3, desc: '敵全体に無属性ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.15, turns: 2 } }
      ],
      lore: '星々の軌道を記録し続ける浮遊球体。危険を検知すると観測用の光脈を兵器へと転用する。'
    },
    m_w5_3: {
      id: 'm_w5_3', name: '歯車の重盾機', world: 'w5', el: 'light', kind: 'normal',
      hp: 690, atk: 66, def: 52, spd: 88,
      skills: [
        { name: '白金破砕', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光属性ダメージ' },
        { name: '電磁結界', scope: 'area2', mult: 1.15, ct: 3, desc: '敵2体にダメージ＋自身の防御上昇', selfBuff: { type: 'defUp', val: 0.28, turns: 2 } }
      ],
      lore: '螺旋塔の要所を封鎖する白金製の防衛機。精密な歯車がかみ合う音だけが響く。'
    },

    m_w6_1: {
      id: 'm_w6_1', name: '星塵の彷徨者', world: 'w6', el: 'dark', kind: 'normal',
      hp: 540, atk: 88, def: 34, spd: 112,
      skills: [
        { name: '虚空裂き', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に闇属性ダメージ' },
        { name: '星影の侵食', scope: 'area2', mult: 1.34, ct: 3, desc: '敵2体にダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.18, turns: 2 } }
      ],
      lore: '滅びた異界の記憶が星屑に溶けて形を成した存在。境界を漂い、近づく者の光を奪う。'
    },
    m_w6_2: {
      id: 'm_w6_2', name: '零点の監視影', world: 'w6', el: 'none', kind: 'normal',
      hp: 520, atk: 86, def: 36, spd: 108,
      skills: [
        { name: '無音衝', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '残響崩壊', scope: 'all', mult: 0.96, ct: 3, desc: '敵全体に無属性ダメージ' }
      ],
      lore: '音も光も届かぬ回廊を見張る無形の残響。静寂を乱す者に容赦のない衝撃を放つ。'
    },
    m_w6_3: {
      id: 'm_w6_3', name: '星雲の防殻体', world: 'w6', el: 'dark', kind: 'normal',
      hp: 700, atk: 74, def: 50, spd: 90,
      skills: [
        { name: '重力圧', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇属性ダメージ' },
        { name: '虚無の収縮', scope: 'area3', mult: 1.12, ct: 3, desc: '敵3体にダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.16, turns: 2 } }
      ],
      lore: '星雲の欠片を殻のように纏った重厚な異界体。周囲の空間ごと引き寄せて押し潰す。'
    },

    /* ステージ3・6 単独ボス12体 */
    boss_w1_3: {
      id: 'boss_w1_3', name: '蒼鐘の翼騎士', world: 'w1', el: 'wind', kind: 'boss',
      hp: 2150, atk: 98, def: 40, spd: 106,
      skills: [
        { name: '蒼風連槍', scope: 'single', mult: 1.15, ct: 0, desc: '敵単体に鋭い風属性ダメージ' },
        { name: '鐘楼の嵐翼', scope: 'all', mult: 1.18, ct: 3, desc: '敵全体に強風ダメージ＋自身の速度上昇', selfBuff: { type: 'spdUp', val: 0.2, turns: 2 } }
      ],
      lore: '蒼穹の廃都で空を統べていた近衛騎士長。鐘の音が鳴り響くたび、風の翼で空を裂く。'
    },
    boss_w1_6: {
      id: 'boss_w1_6', name: '廃都の白王', world: 'w1', el: 'light', kind: 'boss',
      hp: 2650, atk: 106, def: 46, spd: 104,
      skills: [
        { name: '王剣の裁き', scope: 'area2', mult: 1.1, ct: 0, desc: '敵2体に光属性ダメージ' },
        { name: '蒼穹の聖冠', scope: 'all', mult: 1.32, ct: 3, desc: '敵全体に光属性大ダメージ＋攻撃上昇', selfBuff: { type: 'atkUp', val: 0.22, turns: 2 } }
      ],
      lore: 'かつて天空の都を治めた白銀の王の残響。滅びの後も王座に座し、資格ある挑戦者を待つ。'
    },
    boss_w2_3: {
      id: 'boss_w2_3', name: '熔鉄の鍛冶巨兵', world: 'w2', el: 'fire', kind: 'boss',
      hp: 2450, atk: 105, def: 48, spd: 94,
      skills: [
        { name: '大鉄槌', scope: 'single', mult: 1.2, ct: 0, desc: '敵単体に炎属性ダメージ' },
        { name: '炉心噴火', scope: 'all', mult: 1.22, ct: 3, desc: '敵全体に炎ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.08, turns: 2 } }
      ],
      lore: '巨大な鉄槌を振るい無数の機兵を鍛え上げた炉心の番人。一撃ごとに火花が天井を焦がす。'
    },
    boss_w2_6: {
      id: 'boss_w2_6', name: '紅蓮の炉王機', world: 'w2', el: 'fire', kind: 'boss',
      hp: 2900, atk: 114, def: 52, spd: 98,
      skills: [
        { name: '業火の鉄腕', scope: 'area2', mult: 1.12, ct: 0, desc: '敵2体に炎属性ダメージ' },
        { name: '紅蓮熔解波', scope: 'all', mult: 1.36, ct: 3, desc: '敵全体に極熱ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.2, turns: 2 } }
      ],
      lore: '溶鉄炉の中枢そのものが意志を宿した紅蓮の王機。全てを溶かし再鋳造せんとする。'
    },
    boss_w3_3: {
      id: 'boss_w3_3', name: '月影の舞姫', world: 'w3', el: 'dark', kind: 'boss',
      hp: 2300, atk: 112, def: 40, spd: 114,
      skills: [
        { name: '扇刃乱舞', scope: 'area2', mult: 1.05, ct: 0, desc: '敵2体に闇属性ダメージ' },
        { name: '月下の幻桜陣', scope: 'all', mult: 1.26, ct: 3, desc: '敵全体に闇ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } }
      ],
      lore: '月明かりの舞台で永遠に舞い続ける妖艶な幻影。舞の余韻に触れた者は力を奪われる。'
    },
    boss_w3_6: {
      id: 'boss_w3_6', name: '千本桜の大妖', world: 'w3', el: 'dark', kind: 'boss',
      hp: 2850, atk: 120, def: 46, spd: 112,
      skills: [
        { name: '妖桜の太刀', scope: 'single', mult: 1.25, ct: 0, desc: '敵単体に高威力闇ダメージ' },
        { name: '幽玄花嵐', scope: 'all', mult: 1.4, ct: 3, desc: '敵全体に闇属性大ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.2, turns: 2 } }
      ],
      lore: '幽玄の桜京を統べる古の大妖。散ることのない千本桜の奥底で悠久の時を眺めている。'
    },
    boss_w4_3: {
      id: 'boss_w4_3', name: '海流の守護龍', world: 'w4', el: 'water', kind: 'boss',
      hp: 2550, atk: 108, def: 48, spd: 102,
      skills: [
        { name: '激流の尾撃', scope: 'area2', mult: 1.1, ct: 0, desc: '敵2体に水属性ダメージ' },
        { name: '大渦の抱擁', scope: 'all', mult: 1.28, ct: 3, desc: '敵全体に水ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.2, turns: 2 } }
      ],
      lore: '神殿の祭壇を巡る潮流そのものを操る水龍。穏やかな海を一瞬で渦潮へと変える。'
    },
    boss_w4_6: {
      id: 'boss_w4_6', name: '深海聖堂の主', world: 'w4', el: 'water', kind: 'boss',
      hp: 3050, atk: 116, def: 54, spd: 100,
      skills: [
        { name: '水圧の裁槍', scope: 'single', mult: 1.28, ct: 0, desc: '敵単体に水属性大ダメージ' },
        { name: '沈黙の海嘯', scope: 'all', mult: 1.42, ct: 3, desc: '敵全体に水属性大ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } }
      ],
      lore: '光の届かぬ聖堂の奥で眠り続けていた深海の古神。静寂を破る者へ容赦なき水圧を下す。'
    },
    boss_w5_3: {
      id: 'boss_w5_3', name: '天球の審判機', world: 'w5', el: 'light', kind: 'boss',
      hp: 2600, atk: 116, def: 46, spd: 114,
      skills: [
        { name: '光輪断罪', scope: 'area2', mult: 1.12, ct: 0, desc: '敵2体に光属性ダメージ' },
        { name: '天球収束砲', scope: 'all', mult: 1.32, ct: 3, desc: '敵全体に光ダメージ＋自身の攻撃上昇', selfBuff: { type: 'atkUp', val: 0.24, turns: 2 } }
      ],
      lore: '天球儀の広間を司る白銀の裁定者。星暦の誤差を許さず、異常値とみなした存在を浄化する。'
    },
    boss_w5_6: {
      id: 'boss_w5_6', name: '永劫の刻王', world: 'w5', el: 'light', kind: 'boss',
      hp: 3150, atk: 122, def: 52, spd: 116,
      skills: [
        { name: '時針の斬撃', scope: 'single', mult: 1.28, ct: 0, desc: '敵単体に光属性大ダメージ' },
        { name: '白銀の星刻', scope: 'all', mult: 1.45, ct: 3, desc: '敵全体に光属性大ダメージ＋速度上昇', selfBuff: { type: 'spdUp', val: 0.22, turns: 2 } }
      ],
      lore: '星刻機構の頂点に座す時の番人。白銀の時針が十二を差す瞬間、万象の歩みが止まる。'
    },
    boss_w6_3: {
      id: 'boss_w6_3', name: '無音の観測者', world: 'w6', el: 'none', kind: 'boss',
      hp: 2750, atk: 120, def: 48, spd: 112,
      skills: [
        { name: '虚無の眼差し', scope: 'area2', mult: 1.15, ct: 0, desc: '敵2体に無属性ダメージ' },
        { name: '零域の波動', scope: 'all', mult: 1.36, ct: 3, desc: '敵全体に無属性大ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.22, turns: 2 } }
      ],
      lore: '異界の境界をただ見守り続ける無音の観測体。均衡を崩すほど強い残響にのみ刃を向ける。'
    },
    boss_w6_6: {
      id: 'boss_w6_6', name: '境界の零皇', world: 'w6', el: 'dark', kind: 'boss',
      hp: 3400, atk: 130, def: 56, spd: 114,
      skills: [
        { name: '星喰みの剣', scope: 'area2', mult: 1.18, ct: 0, desc: '敵2体に闇属性ダメージ' },
        { name: '終焉の残響', scope: 'all', mult: 1.52, ct: 3, desc: '敵全体に極大闇ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.24, turns: 2 } }
      ],
      lore: '数多の異界が重なり合う零点に君臨する終焉の王。全ての世界の記憶を静かに抱き続ける。'
    },

    /* 乱入枠の敵6体（ボスWAVE以外で単独出現・超分かりやすく豪華報酬！） */
    int_w1: {
      id: 'int_w1', name: '蒼穹の白銀狼', world: 'w1', el: 'wind', kind: 'intruder',
      hp: 1900, atk: 96, def: 36, spd: 120,
      skills: [
        { name: '疾風牙', scope: 'single', mult: 1.18, ct: 0, desc: '敵単体に高速の風属性ダメージ' },
        { name: '蒼嵐の遠吠え', scope: 'all', mult: 1.15, ct: 3, desc: '敵全体に風ダメージ＋自身の速度上昇', selfBuff: { type: 'spdUp', val: 0.25, turns: 2 } }
      ],
      lore: '廃都の空を駆ける伝説の白銀狼。気まぐれに戦場へ乱入し、撃退した者へ希少な残響石をもたらす。'
    },
    int_w2: {
      id: 'int_w2', name: '黄金の熔岩龍', world: 'w2', el: 'fire', kind: 'intruder',
      hp: 2200, atk: 104, def: 44, spd: 110,
      skills: [
        { name: '黄金火球', scope: 'single', mult: 1.2, ct: 0, desc: '敵単体に炎属性ダメージ' },
        { name: '灼熱の金鱗', scope: 'all', mult: 1.22, ct: 3, desc: '敵全体に炎ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.08, turns: 2 } }
      ],
      lore: '純金の鱗を纏い溶鉄の河を泳ぐ希少な異界龍。その鱗には至宝級の鉱脈が宿るという。'
    },
    int_w3: {
      id: 'int_w3', name: '白狐の影法師', world: 'w3', el: 'light', kind: 'intruder',
      hp: 2050, atk: 108, def: 38, spd: 122,
      skills: [
        { name: '白炎の刃', scope: 'area2', mult: 1.05, ct: 0, desc: '敵2体に光属性ダメージ' },
        { name: '神隠しの霞', scope: 'all', mult: 1.2, ct: 3, desc: '敵全体に光ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } }
      ],
      lore: '桜京の路地に突如現れる白狐の化身。試練を乗り越えた者には古都の秘宝を残して去る。'
    },
    int_w4: {
      id: 'int_w4', name: '真珠の深海姫', world: 'w4', el: 'water', kind: 'intruder',
      hp: 2250, atk: 106, def: 44, spd: 112,
      skills: [
        { name: '真珠の飛沫', scope: 'area2', mult: 1.08, ct: 0, desc: '敵2体に水属性ダメージ' },
        { name: '蒼海の詠唱', scope: 'all', mult: 1.25, ct: 3, desc: '敵全体に水ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.2, turns: 2 } }
      ],
      lore: '海底神殿の奥を気ままに遊泳する蒼光の幻。美しい歌声の直後に激しい水圧が押し寄せる。'
    },
    int_w5: {
      id: 'int_w5', name: '零秒の銀翼機', world: 'w5', el: 'none', kind: 'intruder',
      hp: 2350, atk: 114, def: 46, spd: 126,
      skills: [
        { name: '光速穿刺', scope: 'single', mult: 1.25, ct: 0, desc: '敵単体に無属性ダメージ' },
        { name: '位相跳躍斬', scope: 'all', mult: 1.28, ct: 3, desc: '敵全体に無属性ダメージ＋速度上昇', selfBuff: { type: 'spdUp', val: 0.24, turns: 2 } }
      ],
      lore: '星刻機構の設計図に存在しない謎の銀翼機。時の隙間から乱入し瞬く間に戦場を駆け抜ける。'
    },
    int_w6: {
      id: 'int_w6', name: '星喰みの白影', world: 'w6', el: 'dark', kind: 'intruder',
      hp: 2550, atk: 120, def: 48, spd: 120,
      skills: [
        { name: '虚星の一撃', scope: 'area2', mult: 1.12, ct: 0, desc: '敵2体に闇属性ダメージ' },
        { name: '星雲崩壊波', scope: 'all', mult: 1.36, ct: 3, desc: '敵全体に闇属性大ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.2, turns: 2 } }
      ],
      lore: '星間回廊の裂け目から現れる白銀の異端体。撃破すれば膨大な残響石と高品質装備がこぼれ落ちる。'
    },

    /* 異界討伐専用 単独巨大ボス6体（通常装備なし・限定装備素材＆限定キャラ報酬） */
    raid_1: {
      id: 'raid_1', name: '嵐帝ヴァルキリア', world: 'w1', el: 'wind', kind: 'boss',
      hp: 4200, atk: 124, def: 52, spd: 118,
      skills: [
        { name: '烈風の断罪', scope: 'area2', mult: 1.18, ct: 0, desc: '敵2体に烈風ダメージ' },
        { name: '蒼天破滅嵐', scope: 'all', mult: 1.48, ct: 3, desc: '敵全体に極大風ダメージ＋自身の速度上昇', selfBuff: { type: 'spdUp', val: 0.24, turns: 2 } }
      ],
      lore: '蒼穹の果てに君臨する古の嵐帝。討伐すれば限定装備の素材と蒼風の限定英雄を呼び覚ます鍵を得る。'
    },
    raid_2: {
      id: 'raid_2', name: '炎魔機イグニス', world: 'w2', el: 'fire', kind: 'boss',
      hp: 4900, atk: 134, def: 58, spd: 106,
      skills: [
        { name: '溶鉄の鉄槌', scope: 'single', mult: 1.35, ct: 0, desc: '敵単体に超高威力炎ダメージ' },
        { name: '焦土の炉心解放', scope: 'all', mult: 1.52, ct: 3, desc: '敵全体に炎大ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.1, turns: 2 } }
      ],
      lore: '紅蓮の地下深部で封印されていた禁断の炎魔機。膨大な熱量で全てを焼き尽くす。'
    },
    raid_3: {
      id: 'raid_3', name: '妖桜帝クチナワ', world: 'w3', el: 'dark', kind: 'boss',
      hp: 5400, atk: 142, def: 56, spd: 120,
      skills: [
        { name: '夜桜の大蛇牙', scope: 'area2', mult: 1.22, ct: 0, desc: '敵2体に闇ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } },
        { name: '常闇の千花葬', scope: 'all', mult: 1.56, ct: 3, desc: '敵全体に闇大ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.22, turns: 2 } }
      ],
      lore: '桜京の根底に横たわる古の大妖。その鱗は散らぬ夜桜の花弁で覆われている。'
    },
    raid_4: {
      id: 'raid_4', name: '海皇レヴィア', world: 'w4', el: 'water', kind: 'boss',
      hp: 6200, atk: 148, def: 64, spd: 112,
      skills: [
        { name: '深海圧壊槍', scope: 'single', mult: 1.38, ct: 0, desc: '敵単体に水属性大ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } },
        { name: '蒼淵の大津波', scope: 'all', mult: 1.6, ct: 3, desc: '敵全体に極大水ダメージ' }
      ],
      lore: '七つの異界の海を統べると伝えられる深海皇。目覚めれば海流そのものが武器と化す。'
    },
    raid_5: {
      id: 'raid_5', name: '星刻神クロノア', world: 'w5', el: 'light', kind: 'boss',
      hp: 7100, atk: 158, def: 66, spd: 124,
      skills: [
        { name: '白金裁定線', scope: 'area2', mult: 1.26, ct: 0, desc: '敵2体に光属性ダメージ' },
        { name: '永劫の時盤崩壊', scope: 'all', mult: 1.66, ct: 3, desc: '敵全体に光極大ダメージ＋自身の攻撃上昇', selfBuff: { type: 'atkUp', val: 0.25, turns: 2 } }
      ],
      lore: '星刻機構を創造した最古の天球神機。あらゆる刻を司り、揺らぎなき光で戦場を貫く。'
    },
    raid_6: {
      id: 'raid_6', name: '終焉残響オメガ', world: 'w6', el: 'none', kind: 'boss',
      hp: 8400, atk: 172, def: 72, spd: 122,
      skills: [
        { name: '零点破断', scope: 'area3', mult: 1.24, ct: 0, desc: '敵3体に無属性ダメージ' },
        { name: '異界収束砲', scope: 'all', mult: 1.75, ct: 3, desc: '敵全体に極大無属性ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.25, turns: 2 } }
      ],
      lore: 'あらゆる異界の終焉が結晶化した究極の残響体。これを制した者こそ真の異界踏破者である。'
    }
  };

  /* 常設PvE②：異界討伐（通常装備ドロップなし・限定装備素材＆限定キャラ報酬） */
  const RAIDS = [
    { id: 'r1', name: '嵐帝の試練',   world: 'w1', bossId: 'raid_1', matId: 'mat_storm',  matName: '嵐帝の羽核',   charId: 'c_ur_1',  power: 2.6,  desc: '限定素材「嵐帝の羽核」と限定UR解放の鍵を獲得' },
    { id: 'r2', name: '炎魔の炉心戦', world: 'w2', bossId: 'raid_2', matId: 'mat_flame',  matName: '炎魔の炉核',   charId: 'c_ssr_2', power: 4.8,  desc: '限定素材「炎魔の炉核」と限定SSR解放の鍵を獲得' },
    { id: 'r3', name: '妖桜帝討伐',   world: 'w3', bossId: 'raid_3', matId: 'mat_sakura', matName: '妖桜の霊核',   charId: 'c_ur_2',  power: 8.2,  desc: '限定素材「妖桜の霊核」と限定UR解放の鍵を獲得' },
    { id: 'r4', name: '深海皇討伐',   world: 'w4', bossId: 'raid_4', matId: 'mat_abyss',  matName: '深海の真珠核', charId: 'c_ssr_5', power: 13.5, desc: '限定素材「深海の真珠核」と限定SSR解放の鍵を獲得' },
    { id: 'r5', name: '星刻神機戦',   world: 'w5', bossId: 'raid_5', matId: 'mat_clock',  matName: '星刻の白金核', charId: 'c_ur_3',  power: 22.0, desc: '限定素材「星刻の白金核」と限定UR解放の鍵を獲得' },
    { id: 'r6', name: '終焉残響戦',   world: 'w6', bossId: 'raid_6', matId: 'mat_omega',  matName: '終焉の零核',   charId: 'c_ur_4',  power: 36.0, desc: '限定素材「終焉の零核」と限定UR解放の鍵を獲得' }
  ];

  /* 常設PvE③：総力連戦「残響回廊」（最大3パーティ12人・重複なし） */
  const GAUNTLETS = [
    {
      id: 'g1', name: '第一回廊・黎明', world: 'w1', power: 2.2, rewardStone: 450, rewardMat: 'mat_storm',
      stages: [
        { label: '第1戦', bossId: 'boss_w1_3', mult: 0.9 },
        { label: '第2戦', bossId: 'boss_w2_3', mult: 1.05 },
        { label: '第3戦', bossId: 'boss_w1_6', mult: 1.2 }
      ]
    },
    {
      id: 'g2', name: '第二回廊・幽海', world: 'w3', power: 7.5, rewardStone: 850, rewardMat: 'mat_sakura',
      stages: [
        { label: '第1戦', bossId: 'boss_w3_3', mult: 0.95 },
        { label: '第2戦', bossId: 'boss_w4_3', mult: 1.1 },
        { label: '第3戦', bossId: 'boss_w4_6', mult: 1.25 }
      ]
    },
    {
      id: 'g3', name: '第三回廊・終焉', world: 'w6', power: 20.0, rewardStone: 1500, rewardMat: 'mat_omega',
      stages: [
        { label: '第1戦', bossId: 'boss_w5_6', mult: 1.0 },
        { label: '第2戦', bossId: 'boss_w6_3', mult: 1.15 },
        { label: '第3戦', bossId: 'boss_w6_6', mult: 1.3 }
      ]
    }
  ];

  /* 常設PvE④：深淵の塔（30階層・5層ごと単独ボス） */
  const TOWER_MAX_FLOOR = 30;
  function getTowerFloor(floor) {
    const f = Math.max(1, Math.min(TOWER_MAX_FLOOR, floor));
    const worldIdx = Math.min(5, Math.floor((f - 1) / 5));
    const world = WORLDS[worldIdx];
    const isBoss = f % 5 === 0;
    const bossPool = ['boss_w1_6', 'boss_w2_6', 'boss_w3_6', 'boss_w4_6', 'boss_w5_6', 'boss_w6_6'];
    const power = Number((1.15 * Math.pow(1.135, f - 1)).toFixed(2));
    return {
      floor: f,
      name: `深淵の塔 第${f}層`,
      world: world.id,
      isBoss,
      bossId: isBoss ? bossPool[worldIdx] : null,
      power,
      firstStone: isBoss ? 400 + f * 25 : 140 + f * 12,
      abilityReward: isBoss ? `ab_tower_${f}` : null
    };
  }

  /* 常設PvE⑤：試練の狭間（属性・ロール・低レア条件チャレンジ） */
  const TRIALS = [
    { id: 't1', name: '紅蓮の証明',   world: 'w2', ruleText: '炎属性キャラのみで編成',     ruleType: 'el',       ruleVal: 'fire',  bossId: 'boss_w2_3', power: 2.5,  rewardAbility: 'ab_fire_master', rewardStone: 400 },
    { id: 't2', name: '蒼海の証明',   world: 'w4', ruleText: '水属性キャラのみで編成',     ruleType: 'el',       ruleVal: 'water', bossId: 'boss_w4_3', power: 4.5,  rewardAbility: 'ab_water_master', rewardStone: 450 },
    { id: 't3', name: '翠風の証明',   world: 'w1', ruleText: '風属性キャラのみで編成',     ruleType: 'el',       ruleVal: 'wind',  bossId: 'boss_w1_6', power: 2.8,  rewardAbility: 'ab_wind_master', rewardStone: 400 },
    { id: 't4', name: '光闇の交差',   world: 'w5', ruleText: '光または闇属性のみで編成',   ruleType: 'elPair',   ruleVal: ['light', 'dark'], bossId: 'boss_w5_3', power: 7.5, rewardAbility: 'ab_ld_master', rewardStone: 600 },
    { id: 't5', name: '無垢なる誇り', world: 'w6', ruleText: '無属性キャラのみで編成',     ruleType: 'el',       ruleVal: 'none',  bossId: 'boss_w6_3', power: 10.0, rewardAbility: 'ab_none_master', rewardStone: 700 },
    { id: 't6', name: '鉄壁と癒し',   world: 'w4', ruleText: 'タンクとヒーラーを各1人以上', ruleType: 'rolesReq', ruleVal: ['tank', 'healer'], bossId: 'boss_w4_6', power: 6.5, rewardAbility: 'ab_iron_wall', rewardStone: 550 },
    { id: 't7', name: '凡才の極致',   world: 'w3', ruleText: 'N〜SRレアのみで編成',       ruleType: 'maxRar',   ruleVal: 'SR',    bossId: 'boss_w3_3', power: 4.0,  rewardAbility: 'ab_underdog', rewardStone: 600 },
    { id: 't8', name: '三傑の突破',   world: 'w6', ruleText: '3人以下のパーティで出撃',   ruleType: 'maxCount', ruleVal: 3,       bossId: 'boss_w5_6', power: 14.0, rewardAbility: 'ab_trio_pride', rewardStone: 900 }
  ];

  function getWorldNormalEnemies(worldId) {
    return Object.values(ENEMIES).filter((e) => e.world === worldId && e.kind === 'normal');
  }

  Object.defineProperty(window, '__IZ_WORLDS__', {
    value: Object.freeze({
      ELEMENTS,
      ROLES,
      RARITIES,
      WORLDS,
      ENEMIES,
      RAIDS,
      GAUNTLETS,
      TOWER_MAX_FLOOR,
      TRIALS,
      getTowerFloor,
      getWorldNormalEnemies
    }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
