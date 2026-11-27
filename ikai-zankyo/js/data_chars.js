/* プレイアブルキャラ52体（全名短縮統一・通常召喚UR＆討伐ボスUR6体＆塔限定4体含む・共鳴盤・図鑑紹介文） */
(function () {
  'use strict';

  /* キャラ別 共鳴盤の共通6ノード定義（Lvなし・自由順解放） */
  const BOARD_TEMPLATES = [
    { key: 'hp',    name: '生命の刻印',   desc: '最大HP +18%',        stat: 'hpPct',   val: 0.18, cost: 120 },
    { key: 'atk',   name: '鋭刃の刻印',   desc: '攻撃力 +18%',        stat: 'atkPct',  val: 0.18, cost: 120 },
    { key: 'def',   name: '堅壁の刻印',   desc: '防御力 +20%',        stat: 'defPct',  val: 0.20, cost: 120 },
    { key: 'spd',   name: '迅雷の刻印',   desc: '速度 +12',           stat: 'spdFlat', val: 12,   cost: 160 },
    { key: 'crit',  name: '見切りの刻印', desc: '会心+12%・会心ダメ+20%', stat: 'critPack', val: 0.12, cost: 200 },
    { key: 'skill', name: '奥義の極み',   desc: '全技の威力・回復量 +22%', stat: 'skillPct', val: 0.22, cost: 260 }
  ];

  /*
   * 全52体：
   * - source: 'summon'（通常召喚） / 'raid'（異界討伐・鍵解放） / 'raidBoss'（異界討伐・覇王の印解放） / 'tower'（深淵の塔限定）
   * - すべて肩書きなしの自然な名前へ統一（kana は五十音順ソート用）
   */
  const CHARS = [
    /* ========== UR (13体：異界討伐限定4 / 異界討伐ボス6 / 深淵の塔100F限定1 / 通常召喚2) ========== */
    {
      id: 'c_ur_ignis', name: 'イグニス', kana: 'いぐにす', rarity: 'UR', el: 'fire', role: 'dealer', world: 'w2', source: 'raidBoss',
      hp: 1180, atk: 262, def: 96, spd: 116, crit: 0.24,
      skills: [
        { slot: 1, name: '溶鉄の鉄槌', scope: 'single', mult: 1.24, ct: 0, desc: '敵単体に高威力炎ダメージ' },
        { slot: 2, name: '灼熱炉心波', scope: 'area3',  mult: 1.66, ct: 2, desc: '敵3体に炎ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.09, turns: 2 } },
        { slot: 3, name: '焦土の炉心解放', scope: 'all', mult: 2.18, ct: 4, desc: '敵全体に極大炎ダメージ＋自身攻撃上昇', selfBuff: { type: 'atkUp', val: 0.28, turns: 2 } }
      ],
      innate: { name: '業火の魔炉', desc: '火傷状態の敵への与ダメージ+25%・攻撃力+12%' },
      linkBonus: { stat: 'atk', val: 16, text: '共鳴先の攻撃+16%' },
      lore: '紅蓮の鍛炉最奥に封印されていた炎魔機が、戦いの果てに共鳴を受け入れて顕現した姿。'
    },
    {
      id: 'c_ur_levia', name: 'レヴィア', kana: 'れゔぃあ', rarity: 'UR', el: 'water', role: 'tank', world: 'w4', source: 'raidBoss',
      hp: 1680, atk: 184, def: 146, spd: 108, crit: 0.14,
      skills: [
        { slot: 1, name: '深海圧壊槍', scope: 'single', mult: 1.1, ct: 0, desc: '敵単体に水ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '海皇の水壁', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+34%＋自身HP回復＋挑発', buff: { type: 'defUp', val: 0.34, turns: 3 }, selfHeal: 0.24, selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 3, name: '蒼淵の大津波', scope: 'all', mult: 1.72, ct: 4, desc: '敵全体に水大ダメージ＋防御低下・攻撃低下', debuff: { type: 'defDown', val: 0.24, turns: 2 }, debuff2: { type: 'atkDown', val: 0.2, turns: 2 } }
      ],
      innate: { name: '七海の覇殻', desc: '常時被ダメージ-16%・被回復量+18%' },
      linkBonus: { stat: 'def', val: 18, text: '共鳴先の防御+18%' },
      lore: '七つの異界の海を統べる深海皇。その圧倒的な海流は味方を護る鉄壁の盾へと転じた。'
    },
    {
      id: 'c_ur_1', name: 'セラフィナ', kana: 'せらふいな', rarity: 'UR', el: 'wind', role: 'dealer', world: 'w1', source: 'raid',
      hp: 1080, atk: 242, def: 86, spd: 122, crit: 0.22,
      skills: [
        { slot: 1, name: '蒼翼の連閃', scope: 'single', mult: 1.15, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '烈風十字斬', scope: 'area2',  mult: 1.55, ct: 2, desc: '敵2体に風ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.2, turns: 2 } },
        { slot: 3, name: '蒼穹裁きの嵐', scope: 'all',  mult: 2.05, ct: 4, desc: '敵全体に極大風ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } }
      ],
      innate: { name: '天風の加護', desc: '会心率+10%・与ダメージ+12%' },
      linkBonus: { stat: 'spd', val: 8, text: '共鳴先の速度+8' },
      lore: '蒼穹の天空遺跡で語り継がれる白銀の翼を宿した剣姫。嵐を纏う剣筋は雲海すら断ち割る。'
    },
    {
      id: 'c_ur_valk', name: 'ヴァルキリア', kana: 'ゔぁるきりあ', rarity: 'UR', el: 'wind', role: 'dealer', world: 'w1', source: 'raidBoss',
      hp: 1140, atk: 258, def: 90, spd: 128, crit: 0.24,
      skills: [
        { slot: 1, name: '烈風の断罪', scope: 'area2', mult: 1.16, ct: 0, desc: '敵2体に風属性ダメージ' },
        { slot: 2, name: '蒼天破滅嵐', scope: 'all', mult: 2.02, ct: 3, desc: '敵全体に極大風ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.26, turns: 2 } },
        { slot: 3, name: '嵐帝の覇風', scope: 'passive', passiveType: 'critBoost', val: 0.30, desc: '常時会心率+12%・会心ダメージ+30%' }
      ],
      innate: { name: '蒼穹支配', desc: '開幕行動ゲージ+20%・与ダメージ+14%' },
      linkBonus: { stat: 'spd', val: 11, text: '共鳴先の速度+11' },
      lore: '蒼穹の果てに君臨した古の嵐帝。認め合った強者の号令に応え、疾風の翼を再び開く。'
    },
    {
      id: 'c_ur_6', name: 'ユグドラ', kana: 'ゆぐどら', rarity: 'UR', el: 'wind', role: 'healer', world: 'w6', source: 'summon',
      hp: 1320, atk: 204, def: 108, spd: 118, crit: 0.12,
      skills: [
        { slot: 1, name: '翠玉の風矢', scope: 'single', mult: 1.04, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '世界樹の慈雨', scope: 'all', kind: 'heal', mult: 1.78, ct: 3, desc: '味方全体を大回復＋デバフ解除＋速度上昇', cleanse: true, buff: { type: 'spdUp', val: 0.2, turns: 2 } },
        { slot: 3, name: '生命樹の息吹', scope: 'passive', passiveType: 'regenAura', val: 0.08, desc: '行動終了時、HP最低の味方を最大HPの16%回復' }
      ],
      innate: { name: '聖森の恵み', desc: '回復量+20%・味方全体の被回復量+14%' },
      linkBonus: { stat: 'hp', val: 16, text: '共鳴先の最大HP+16%' },
      lore: '翠玉の世界樹に宿る古の聖霊巫女。尽きることのない生命の息吹で仲間を癒やし続ける。'
    },
    {
      id: 'c_ur_3', name: 'アルテミシア', kana: 'あるてみしあ', rarity: 'UR', el: 'light', role: 'support', world: 'w5', source: 'raid',
      hp: 1180, atk: 196, def: 102, spd: 126, crit: 0.14,
      skills: [
        { slot: 1, name: '白金光針', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '星刻加速陣', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の行動ゲージ+25%＋速度上昇', buff: { type: 'spdUp', val: 0.24, turns: 2 }, gaugeUp: 25 },
        { slot: 3, name: '天球の聖律', scope: 'all', kind: 'allyBuff', ct: 4, desc: '味方全体の攻撃+30%・防御+25%＋HP回復', buff: { type: 'atkUp', val: 0.3, turns: 3 }, buff2: { type: 'defUp', val: 0.25, turns: 3 }, healMult: 0.55 }
      ],
      innate: { name: '永劫の時脈', desc: '開幕時、味方全体の行動ゲージ+15%' },
      linkBonus: { stat: 'spd', val: 10, text: '共鳴先の速度+10' },
      lore: '白銀の時計塔を設計した伝説の星詠み。光脈を操り、戦局の時の流れすら味方へ傾ける。'
    },
    {
      id: 'c_ur_5', name: 'エリュシオン', kana: 'えりゅしおん', rarity: 'UR', el: 'light', role: 'dealer', world: 'w9', source: 'summon',
      hp: 1120, atk: 252, def: 88, spd: 124, crit: 0.24,
      skills: [
        { slot: 1, name: '光刃ドライブ', scope: 'single', mult: 1.18, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '天雷リニア斬', scope: 'area2', mult: 1.62, ct: 2, desc: '敵2体に光ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } },
        { slot: 3, name: '星輝オーバーレイ', scope: 'all', mult: 2.12, ct: 4, desc: '敵全体に極大光ダメージ＋自身攻撃上昇', selfBuff: { type: 'atkUp', val: 0.26, turns: 2 } }
      ],
      innate: { name: '電光一閃', desc: '闇属性・ボスへの与ダメージ+18%・速度+6' },
      linkBonus: { stat: 'atk', val: 14, text: '共鳴先の攻撃+14%' },
      lore: '雷鳴の電脳尖塔で極光の演算刃を振るう次世代の剣士。閃光のごとき速度で敵陣を貫く。'
    },
    {
      id: 'c_ur_chrono', name: 'クロノア', kana: 'くろのあ', rarity: 'UR', el: 'light', role: 'support', world: 'w5', source: 'raidBoss',
      hp: 1280, atk: 214, def: 112, spd: 130, crit: 0.16,
      skills: [
        { slot: 1, name: '白金裁定線', scope: 'area2', mult: 1.12, ct: 0, desc: '敵2体に光ダメージ' },
        { slot: 2, name: '時盤再編', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の行動ゲージ+30%＋攻撃+28%・速度+22%', buff: { type: 'atkUp', val: 0.28, turns: 2 }, buff2: { type: 'spdUp', val: 0.22, turns: 2 }, gaugeUp: 30 },
        { slot: 3, name: '永劫の時盤崩壊', scope: 'all', mult: 1.88, ct: 4, desc: '敵全体に極大光ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.24, turns: 2 } }
      ],
      innate: { name: '時神の律動', desc: '生存中、味方全体の速度+10・開幕ゲージ+12%' },
      linkBonus: { stat: 'spd', val: 12, text: '共鳴先の速度+12' },
      lore: '天球都市を創造した最古の星刻神機。新たな未来を見届けるため、英雄の傍らへ降り立った。'
    },
    {
      id: 'c_ur_2', name: 'カグヤ', kana: 'かぐや', rarity: 'UR', el: 'dark', role: 'dealer', world: 'w3', source: 'raid',
      hp: 1040, atk: 254, def: 80, spd: 118, crit: 0.25,
      skills: [
        { slot: 1, name: '黒桜一閃', scope: 'single', mult: 1.2, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '朧月夜叉舞', scope: 'area3', mult: 1.95, ct: 3, desc: '敵3体に極大闇ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.18, turns: 2 } },
        { slot: 3, name: '常闇の開花', scope: 'passive', passiveType: 'critBoost', val: 0.32, desc: '常時会心ダメージ+32%・敵撃破時に行動ゲージ+35%' }
      ],
      innate: { name: '妖桜の残香', desc: 'HP70%以上の敵に対して与ダメージ+20%' },
      linkBonus: { stat: 'atk', val: 14, text: '共鳴先の攻撃+14%' },
      lore: '千本桜の最奥に封じられていた古の剣豪姫。満月の夜に黒き花弁を纏って戦場に降臨する。'
    },
    {
      id: 'c_ur_kuchi', name: 'クチナワ', kana: 'くちなわ', rarity: 'UR', el: 'dark', role: 'dealer', world: 'w3', source: 'raidBoss',
      hp: 1220, atk: 260, def: 94, spd: 124, crit: 0.24,
      skills: [
        { slot: 1, name: '夜桜の大蛇牙', scope: 'area2', mult: 1.18, ct: 0, desc: '敵2体に闇ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.18, turns: 2 } },
        { slot: 2, name: '妖鱗の呪縛', scope: 'area3', mult: 1.64, ct: 2, desc: '敵3体に闇ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.24, turns: 2 } },
        { slot: 3, name: '常闇の千花葬', scope: 'all', mult: 2.16, ct: 4, desc: '敵全体に極大闇ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.24, turns: 2 } }
      ],
      innate: { name: '古大妖の威光', desc: 'デバフ状態の敵への与ダメージ+24%・吸血+8%' },
      linkBonus: { stat: 'atk', val: 15, text: '共鳴先の攻撃+15%' },
      lore: '夜桜古都の根底を統べていた古の大妖。散らぬ夜桜の鱗を纏い、今は選ばれし主へ力を貸す。'
    },
    {
      id: 'c_tw_100', name: 'アストレア', kana: 'あすとれあ', rarity: 'UR', el: 'none', role: 'support', world: 'w10', source: 'tower',
      hp: 1300, atk: 218, def: 110, spd: 128, crit: 0.18,
      skills: [
        { slot: 1, name: '星秤の光刃', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に無属性ダメージ' },
        { slot: 2, name: '深淵の星律', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+32%・防御+28%・回復＋ゲージ+20%', buff: { type: 'atkUp', val: 0.32, turns: 3 }, buff2: { type: 'defUp', val: 0.28, turns: 3 }, healMult: 0.65, gaugeUp: 20 },
        { slot: 3, name: '星海の導き手', scope: 'passive', passiveType: 'teamAtk', val: 0.18, desc: '生存中、味方全体の攻撃力+18%' }
      ],
      innate: { name: '深淵踏破の栄冠', desc: '全基礎性能+10%・開幕味方全体ゲージ+12%' },
      linkBonus: { stat: 'atk', val: 16, text: '共鳴先の攻撃+16%' },
      lore: '深淵の塔最上層にて幾多の挑戦者を見守り続けた星海の裁定女神。百層制覇の証として共鳴する。'
    },
    {
      id: 'c_ur_omega', name: 'オメガ', kana: 'おめが', rarity: 'UR', el: 'none', role: 'dealer', world: 'w10', source: 'raidBoss',
      hp: 1340, atk: 274, def: 106, spd: 126, crit: 0.26,
      skills: [
        { slot: 1, name: '零点破断', scope: 'area2', mult: 1.24, ct: 0, desc: '敵2体に無属性大ダメージ' },
        { slot: 2, name: '万象収束刃', scope: 'area3', mult: 1.74, ct: 2, desc: '敵3体に極大無属性ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.25, turns: 2 } },
        { slot: 3, name: '異界収束砲', scope: 'all', mult: 2.32, ct: 4, desc: '敵全体に究極の無属性ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.22, turns: 2 } }
      ],
      innate: { name: '終焉の結晶核', desc: '全ダメージ+18%・ボスへの与ダメージ+18%' },
      linkBonus: { stat: 'atk', val: 18, text: '共鳴先の攻撃+18%' },
      lore: '全異界の終焉が結晶化した究極の残響体。極限を超えた者の前にのみ真の力を解放する。'
    },
    {
      id: 'c_ur_4', name: 'ノヴァ', kana: 'のゔぁ', rarity: 'UR', el: 'none', role: 'tank', world: 'w10', source: 'raid',
      hp: 1620, atk: 174, def: 138, spd: 104, crit: 0.12,
      skills: [
        { slot: 1, name: '星盾衝撃', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に無ダメージ＋自身に挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '零域障壁', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+32%＋自身HP回復＋挑発', buff: { type: 'defUp', val: 0.32, turns: 3 }, selfHeal: 0.22, selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 3, name: '虚無の守護殻', scope: 'passive', passiveType: 'dmgCut', val: 0.2, desc: '常時自身の被ダメージ-20%・被弾時に味方全体の行動ゲージ+5%' }
      ],
      innate: { name: '境界の盾', desc: '開幕時に自身へ挑発と防御上昇を付与' },
      linkBonus: { stat: 'hp', val: 18, text: '共鳴先の最大HP+18%' },
      lore: '星海回廊の零点で目覚めた白銀の守護騎士。崩れゆく異界の衝撃を一身に受け止め仲間を守り抜く。'
    },

    /* ========== SSR (12体：通常召喚8 / 異界討伐限定2 / 深淵の塔限定2) ========== */
    {
      id: 'c_ssr_9', name: 'アヌビス', kana: 'あぬびす', rarity: 'SSR', el: 'fire', role: 'tank', world: 'w7', source: 'summon',
      hp: 1540, atk: 164, def: 130, spd: 102, crit: 0.12,
      skills: [
        { slot: 1, name: '黄金槍撃', scope: 'single', mult: 1.04, ct: 0, desc: '敵単体に炎ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '太陽の聖壁', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+28%＋自身回復＋挑発', buff: { type: 'defUp', val: 0.28, turns: 2 }, selfHeal: 0.2, selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 3, name: '砂漠の審判炎', scope: 'area3', mult: 1.54, ct: 4, desc: '敵3体に炎大ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } }
      ],
      innate: { name: '王墓の守護者', desc: '最大HP+12%・被ダメージ-10%' },
      linkBonus: { stat: 'def', val: 14, text: '共鳴先の防御+14%' },
      lore: '黄昏の太陽砂都で王墓を守護する黄金の槍盾騎士。灼熱の砂嵐の中でも微動だにしない。'
    },
    {
      id: 'c_ssr_2', name: 'ヴァル', kana: 'ゔぁる', rarity: 'SSR', el: 'fire', role: 'dealer', world: 'w2', source: 'raid',
      hp: 1020, atk: 234, def: 78, spd: 110, crit: 0.2,
      skills: [
        { slot: 1, name: '灼熱斬', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '熔鉄連破', scope: 'area2', mult: 1.52, ct: 2, desc: '敵2体に炎ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.08, turns: 2 } },
        { slot: 3, name: '紅蓮爆砕陣', scope: 'all', mult: 1.92, ct: 4, desc: '敵全体に極大炎ダメージ＋自身攻撃上昇', selfBuff: { type: 'atkUp', val: 0.25, turns: 2 } }
      ],
      innate: { name: '炉心の闘志', desc: '火傷状態の敵への与ダメージ+22%' },
      linkBonus: { stat: 'atk', val: 12, text: '共鳴先の攻撃+12%' },
      lore: '鍛炉の最深部で生まれ変わった炎の機工剣士。赤熱する大剣の一振りは鋼鉄すら断つ。'
    },
    {
      id: 'c_ssr_4', name: 'ホムラ', kana: 'ほむら', rarity: 'SSR', el: 'fire', role: 'dealer', world: 'w3', source: 'summon',
      hp: 990, atk: 238, def: 74, spd: 118, crit: 0.22,
      skills: [
        { slot: 1, name: '炎刀抜き', scope: 'single', mult: 1.15, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '紅蓮居合', scope: 'single', mult: 2.15, ct: 3, desc: '敵単体に超高威力炎ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } },
        { slot: 3, name: '業火の見切り', scope: 'passive', passiveType: 'critBoost', val: 0.2, desc: '常時会心率+15%・単体攻撃の与ダメージ+20%' }
      ],
      innate: { name: '一刀必殺', desc: 'ボス・乱入敵への与ダメージ+16%' },
      linkBonus: { stat: 'atk', val: 12, text: '共鳴先の攻撃+12%' },
      lore: '古都の闇に潜み悪鬼を断つ孤高の火炎剣士。鞘から刃が閃く瞬間にはすでに勝負が決している。'
    },
    {
      id: 'c_tw_50', name: 'グレイス', kana: 'ぐれいす', rarity: 'SSR', el: 'water', role: 'dealer', world: 'w8', source: 'tower',
      hp: 1080, atk: 238, def: 84, spd: 118, crit: 0.22,
      skills: [
        { slot: 1, name: '氷晶剣', scope: 'single', mult: 1.14, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '白銀の氷華', scope: 'area2', mult: 1.58, ct: 2, desc: '敵2体に水ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.2, turns: 2 } },
        { slot: 3, name: '極光零度斬', scope: 'all', mult: 1.96, ct: 4, desc: '敵全体に極大水ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } }
      ],
      innate: { name: '氷城の麗剣', desc: '与ダメージ+14%・会心率+8%' },
      linkBonus: { stat: 'atk', val: 13, text: '共鳴先の攻撃+13%' },
      lore: '深淵の塔五十層で氷剣を振るう凍城の女剣士。澄み切った一閃が敵の戦意を凍らせる。'
    },
    {
      id: 'c_ssr_3', name: 'サクラ', kana: 'さくら', rarity: 'SSR', el: 'water', role: 'healer', world: 'w3', source: 'summon',
      hp: 1160, atk: 184, def: 94, spd: 112, crit: 0.1,
      skills: [
        { slot: 1, name: '清流の札', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '桜雫の癒し', scope: 'area2', kind: 'heal', mult: 1.35, ct: 2, desc: 'HPの低い味方2体を中回復' },
        { slot: 3, name: '幽玄の霊泉', scope: 'all', kind: 'heal', mult: 1.75, ct: 4, desc: '味方全体を大回復＋デバフ解除＋防御上昇', cleanse: true, buff: { type: 'defUp', val: 0.2, turns: 2 } }
      ],
      innate: { name: '清らかな祈り', desc: '自身の回復量+15%' },
      linkBonus: { stat: 'hp', val: 14, text: '共鳴先の最大HP+14%' },
      lore: '夜桜古都で霊泉を守り続けてきた白衣の巫女。花弁を浮かべた清水はあらゆる傷と穢れを洗い流す。'
    },
    {
      id: 'c_ssr_10', name: 'スノウ', kana: 'すのう', rarity: 'SSR', el: 'water', role: 'support', world: 'w8', source: 'summon',
      hp: 1150, atk: 192, def: 96, spd: 118, crit: 0.14,
      skills: [
        { slot: 1, name: '氷雪の雫', scope: 'single', mult: 1.04, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '極光の調べ', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+22%・防御+22%＋行動ゲージ+16%', buff: { type: 'atkUp', val: 0.22, turns: 2 }, buff2: { type: 'defUp', val: 0.22, turns: 2 }, gaugeUp: 16 },
        { slot: 3, name: '凍城の静謐', scope: 'passive', passiveType: 'teamSpd', val: 9, desc: '生存中、味方全体の速度+9' }
      ],
      innate: { name: 'オーロラの祝福', desc: '開幕時自身のゲージ+18%・速度+6' },
      linkBonus: { stat: 'spd', val: 9, text: '共鳴先の速度+9' },
      lore: '氷晶凍城の観測塔でオーロラを詠む雪の楽師。静謐な調べが仲間の呼吸を整える。'
    },
    {
      id: 'c_ssr_5', name: 'ネレイア', kana: 'ねれいあ', rarity: 'SSR', el: 'water', role: 'support', world: 'w4', source: 'raid',
      hp: 1140, atk: 194, def: 96, spd: 116, crit: 0.14,
      skills: [
        { slot: 1, name: '蒼波の弾', scope: 'single', mult: 1.02, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '海流の加護', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+24%＋速度+16%', buff: { type: 'atkUp', val: 0.24, turns: 2 }, buff2: { type: 'spdUp', val: 0.16, turns: 2 } },
        { slot: 3, name: '沈黙の大渦', scope: 'all', mult: 1.62, ct: 4, desc: '敵全体に水大ダメージ＋防御低下・速度低下', debuff: { type: 'defDown', val: 0.2, turns: 2 }, debuff2: { type: 'spdDown', val: 0.18, turns: 2 } }
      ],
      innate: { name: '真珠の共鳴', desc: '水属性味方の与ダメージ+12%' },
      linkBonus: { stat: 'spd', val: 8, text: '共鳴先の速度+8' },
      lore: '瑠璃の深海神殿で古の海流を読み解く王女。透き通る歌声で味方を鼓舞し、敵の歩みを奪う。'
    },
    {
      id: 'c_ssr_8', name: 'アリア', kana: 'ありあ', rarity: 'SSR', el: 'light', role: 'healer', world: 'w5', source: 'summon',
      hp: 1190, atk: 186, def: 98, spd: 110, crit: 0.1,
      skills: [
        { slot: 1, name: '光輪弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '白光の慈雨', scope: 'all', kind: 'heal', mult: 1.48, ct: 3, desc: '味方全体を中回復＋攻撃上昇', buff: { type: 'atkUp', val: 0.18, turns: 2 } },
        { slot: 3, name: '不滅の聖脈', scope: 'passive', passiveType: 'regenAura', val: 0.06, desc: '行動終了時、最もHP割合が低い味方を最大HPの12%回復' }
      ],
      innate: { name: '聖脈の守護', desc: '味方全体の被回復量+14%' },
      linkBonus: { stat: 'hp', val: 14, text: '共鳴先の最大HP+14%' },
      lore: '時計塔の光脈炉を癒しの術式へ転用した聖職技師。柔らかな白光が仲間の生命力を支え続ける。'
    },
    {
      id: 'c_tw_75', name: 'ライデン', kana: 'らいでん', rarity: 'SSR', el: 'light', role: 'dealer', world: 'w9', source: 'tower',
      hp: 1050, atk: 244, def: 82, spd: 124, crit: 0.24,
      skills: [
        { slot: 1, name: '雷閃刀', scope: 'single', mult: 1.16, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '迅雷二連抜刀', scope: 'area2', mult: 1.62, ct: 2, desc: '敵2体に光ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.22, turns: 2 } },
        { slot: 3, name: '紫電天雷陣', scope: 'all', mult: 2.02, ct: 4, desc: '敵全体に極大光ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.2, turns: 2 } }
      ],
      innate: { name: '迅雷の極み', desc: '速度+8・会心ダメージ+20%' },
      linkBonus: { stat: 'spd', val: 10, text: '共鳴先の速度+10' },
      lore: '深淵の塔七十五層を駆ける雷鳴尖塔の電光剣豪。雷鳴よりも速く抜かれる太刀は誰にも捉えられない。'
    },
    {
      id: 'c_ssr_1', name: 'レオンハルト', kana: 'れおんはると', rarity: 'SSR', el: 'light', role: 'tank', world: 'w1', source: 'summon',
      hp: 1480, atk: 158, def: 126, spd: 100, crit: 0.1,
      skills: [
        { slot: 1, name: '白銀の盾撃', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '王家の誓い', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+26%＋自身回復', buff: { type: 'defUp', val: 0.26, turns: 2 }, selfHeal: 0.2 },
        { slot: 3, name: '蒼穹の聖壁', scope: 'area2', mult: 1.6, ct: 4, desc: '敵2体に光大ダメージ＋味方全体防御上昇', buffAll: { type: 'defUp', val: 0.24, turns: 3 } }
      ],
      innate: { name: '騎士団長の矜持', desc: '挑発中、自身の防御力+20%' },
      linkBonus: { stat: 'def', val: 15, text: '共鳴先の防御+15%' },
      lore: '蒼穹の遺跡で最後まで王民を逃がし続けた近衛騎士団長。折れぬ白銀の大盾が今も誇りを物語る。'
    },
    {
      id: 'c_ssr_7', name: 'ルナ', kana: 'るな', rarity: 'SSR', el: 'dark', role: 'support', world: 'w10', source: 'summon',
      hp: 1100, atk: 198, def: 90, spd: 120, crit: 0.15,
      skills: [
        { slot: 1, name: '星影の矢', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '虚無の呪印', scope: 'all', mult: 1.38, ct: 3, desc: '敵全体に闇ダメージ＋防御低下・攻撃低下', debuff: { type: 'defDown', val: 0.22, turns: 2 }, debuff2: { type: 'atkDown', val: 0.18, turns: 2 } },
        { slot: 3, name: '星間導きの光', scope: 'passive', passiveType: 'teamAtk', val: 0.14, desc: '生存中、味方全体の攻撃力+14%・会心率+8%' }
      ],
      innate: { name: '星雲の観測', desc: 'デバフ状態の敵への味方全体ダメージ+10%' },
      linkBonus: { stat: 'atk', val: 10, text: '共鳴先の攻撃+10%' },
      lore: '星海回廊で滅びた星々の記録を綴る観測者。闇の向こうにある微かな星光を道標として掲げる。'
    },
    {
      id: 'c_ssr_6', name: 'ゼクス', kana: 'ぜくす', rarity: 'SSR', el: 'none', role: 'dealer', world: 'w5', source: 'summon',
      hp: 1060, atk: 226, def: 88, spd: 116, crit: 0.18,
      skills: [
        { slot: 1, name: '白金穿ち', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に無ダメージ' },
        { slot: 2, name: '双針連撃', scope: 'area2', mult: 1.54, ct: 2, desc: '敵2体に無ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.18, turns: 2 } },
        { slot: 3, name: '零秒殲滅砲', scope: 'all', mult: 1.88, ct: 4, desc: '敵全体に無属性極大ダメージ' }
      ],
      innate: { name: '精密照準', desc: '全属性の敵へ安定した高威力を発揮（与ダメ+12%）' },
      linkBonus: { stat: 'atk', val: 11, text: '共鳴先の攻撃+11%' },
      lore: '時計塔の精鋭部隊に所属する白銀の機甲騎士。一切の無駄がない動きで戦場を制御する。'
    },

    /* ========== SR (13体：通常召喚12 / 深淵の塔25F限定1) ========== */
    {
      id: 'c_sr_2', name: 'ガルド', kana: 'がるど', rarity: 'SR', el: 'fire', role: 'tank', world: 'w2', source: 'summon',
      hp: 1380, atk: 146, def: 118, spd: 94, crit: 0.09,
      skills: [
        { slot: 1, name: '鍛鉄の盾打ち', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に炎ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '耐熱装甲', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+22%＋自身回復', buff: { type: 'defUp', val: 0.22, turns: 2 }, selfHeal: 0.18 },
        { slot: 3, name: '鋼鉄の意地', scope: 'passive', passiveType: 'dmgCut', val: 0.14, desc: '常時自身の被ダメージ-14%' }
      ],
      innate: { name: '炉守の誇り', desc: '最大HP+10%' },
      linkBonus: { stat: 'def', val: 12, text: '共鳴先の防御+12%' },
      lore: '紅蓮の鍛炉で重装甲を自ら鍛え上げたベテラン鍛冶師。どんな猛火の中でも一歩も退かない。'
    },
    {
      id: 'c_sr_3', name: 'ミオ', kana: 'みお', rarity: 'SR', el: 'fire', role: 'dealer', world: 'w2', source: 'summon',
      hp: 940, atk: 206, def: 72, spd: 112, crit: 0.18,
      skills: [
        { slot: 1, name: '赤熱弾', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '連装蒸気弾', scope: 'area2', mult: 1.44, ct: 2, desc: '敵2体に炎ダメージ＋火傷', debuff: { type: 'burn', val: 0.07, turns: 2 } },
        { slot: 3, name: '爆圧キャノン', scope: 'all', mult: 1.72, ct: 4, desc: '敵全体に炎大ダメージ' }
      ],
      innate: { name: '高圧装填', desc: '与ダメージ+10%' },
      linkBonus: { stat: 'atk', val: 9, text: '共鳴先の攻撃+9%' },
      lore: '自作の蒸気式連発銃を愛する快活な機工技師。煙の晴れた先には狙い通りの穴が空いている。'
    },
    {
      id: 'c_tw_25', name: 'フレア', kana: 'ふれあ', rarity: 'SR', el: 'fire', role: 'healer', world: 'w7', source: 'tower',
      hp: 1090, atk: 176, def: 88, spd: 110, crit: 0.11,
      skills: [
        { slot: 1, name: '陽光の火球', scope: 'single', mult: 1.02, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '温陽の癒し', scope: 'area2', kind: 'heal', mult: 1.32, ct: 2, desc: 'HPの低い味方2体を回復＋攻撃上昇', buff: { type: 'atkUp', val: 0.16, turns: 2 } },
        { slot: 3, name: '太陽の聖炎', scope: 'all', kind: 'heal', mult: 1.62, ct: 4, desc: '味方全体を回復＋デバフ解除', cleanse: true }
      ],
      innate: { name: '砂都の灯火', desc: '回復量+12%・炎属性味方の攻撃+8%' },
      linkBonus: { stat: 'hp', val: 12, text: '共鳴先の最大HP+12%' },
      lore: '深淵の塔二十五層で旅人を迎え入れる太陽砂都の癒し手。暖かな炎の祈りが心身を再生させる。'
    },
    {
      id: 'c_sr_6', name: 'イリス', kana: 'いりす', rarity: 'SR', el: 'water', role: 'tank', world: 'w4', source: 'summon',
      hp: 1360, atk: 142, def: 120, spd: 96, crit: 0.08,
      skills: [
        { slot: 1, name: '水壁の打撃', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '真珠の結界', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+24%＋自身回復', buff: { type: 'defUp', val: 0.24, turns: 2 }, selfHeal: 0.16 },
        { slot: 3, name: '蒼海波濤盾', scope: 'all', mult: 1.4, ct: 4, desc: '敵全体に水ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.18, turns: 2 } }
      ],
      innate: { name: '静水守護', desc: '被回復量+15%' },
      linkBonus: { stat: 'hp', val: 12, text: '共鳴先の最大HP+12%' },
      lore: '海底遺跡の聖域を守る蒼鎧の女騎士。水の膜で衝撃を逃がす独特の盾術を修めている。'
    },
    {
      id: 'c_sr_5', name: 'カイ', kana: 'かい', rarity: 'SR', el: 'water', role: 'dealer', world: 'w4', source: 'summon',
      hp: 980, atk: 204, def: 78, spd: 108, crit: 0.16,
      skills: [
        { slot: 1, name: '蒼槍突き', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '渦流二連槍', scope: 'area2', mult: 1.45, ct: 2, desc: '敵2体に水ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.16, turns: 2 } },
        { slot: 3, name: '激流穿孔', scope: 'area3', mult: 1.76, ct: 4, desc: '敵3体に水大ダメージ' }
      ],
      innate: { name: '海流の勘', desc: '水属性攻撃の威力+12%' },
      linkBonus: { stat: 'atk', val: 9, text: '共鳴先の攻撃+9%' },
      lore: '深海神殿を探索する若き蒼槍の使い手。荒れ狂う潮流を読み切り、槍先一つで道を開く。'
    },
    {
      id: 'c_sr_8', name: 'シルフ', kana: 'しるふ', rarity: 'SR', el: 'wind', role: 'support', world: 'w1', source: 'summon',
      hp: 1020, atk: 174, def: 82, spd: 118, crit: 0.12,
      skills: [
        { slot: 1, name: '風刃の調べ', scope: 'single', mult: 1.02, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '追い風の歌', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+22%＋速度+14%', buff: { type: 'atkUp', val: 0.22, turns: 2 }, buff2: { type: 'spdUp', val: 0.14, turns: 2 } },
        { slot: 3, name: '烈風弱体陣', scope: 'all', mult: 1.48, ct: 4, desc: '敵全体に風ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.18, turns: 2 } }
      ],
      innate: { name: '蒼風の旋律', desc: '開幕時、自身の行動ゲージ+20%' },
      linkBonus: { stat: 'spd', val: 6, text: '共鳴先の速度+6' },
      lore: '遺跡の風に乗って古の歌を紡ぐ吟遊詩人。その旋律は味方の士気を高め、敵の陣容を乱す。'
    },
    {
      id: 'c_sr_12', name: 'フェイ', kana: 'ふぇい', rarity: 'SR', el: 'wind', role: 'support', world: 'w6', source: 'summon',
      hp: 1030, atk: 178, def: 84, spd: 116, crit: 0.13,
      skills: [
        { slot: 1, name: '翠葉の矢', scope: 'single', mult: 1.02, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '精霊の追い風', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の速度+18%＋防御+18%＋ゲージ+12%', buff: { type: 'spdUp', val: 0.18, turns: 2 }, buff2: { type: 'defUp', val: 0.18, turns: 2 }, gaugeUp: 12 },
        { slot: 3, name: '森霧の護り', scope: 'passive', passiveType: 'dmgCut', val: 0.12, desc: '常時自身の被ダメージ-12%' }
      ],
      innate: { name: '森霊の導き', desc: '速度+6・開幕ゲージ+12%' },
      linkBonus: { stat: 'spd', val: 7, text: '共鳴先の速度+7' },
      lore: '翠玉の世界樹を案内する精霊使いの少女。森の風と語り合い、仲間の足取りを軽やかにする。'
    },
    {
      id: 'c_sr_1', name: 'エルナ', kana: 'えるな', rarity: 'SR', el: 'wind', role: 'healer', world: 'w1', source: 'summon',
      hp: 1060, atk: 168, def: 86, spd: 112, crit: 0.1,
      skills: [
        { slot: 1, name: '翠風の矢', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '癒しの微風', scope: 'area2', kind: 'heal', mult: 1.25, ct: 2, desc: '味方2体を回復' },
        { slot: 3, name: '蒼穹の恵風', scope: 'all', kind: 'heal', mult: 1.55, ct: 4, desc: '味方全体を回復＋速度上昇', buff: { type: 'spdUp', val: 0.16, turns: 2 } }
      ],
      innate: { name: '風の癒し手', desc: '回復量+10%' },
      linkBonus: { stat: 'hp', val: 10, text: '共鳴先の最大HP+10%' },
      lore: '蒼穹の遺跡で旅人の傷を手当てし続ける若き風の聖女。優しい風音が仲間の疲れを解きほぐす。'
    },
    {
      id: 'c_sr_11', name: 'ボルト', kana: 'ぼると', rarity: 'SR', el: 'light', role: 'dealer', world: 'w9', source: 'summon',
      hp: 960, atk: 210, def: 74, spd: 120, crit: 0.19,
      skills: [
        { slot: 1, name: '電撃弾', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: 'チェーンボルト', scope: 'area3', mult: 1.42, ct: 2, desc: '敵3体に光ダメージ' },
        { slot: 3, name: '雷鳴バースト', scope: 'single', mult: 2.04, ct: 4, desc: '敵単体に高威力光ダメージ＋速度低下', debuff: { type: 'spdDown', val: 0.18, turns: 2 } }
      ],
      innate: { name: '高速蓄電', desc: '速度+6・会心率+8%' },
      linkBonus: { stat: 'spd', val: 7, text: '共鳴先の速度+7' },
      lore: '雷鳴の電脳尖塔で最新型の放電ライフルを操る若きハンター。軽快な身のこなしが持ち味。'
    },
    {
      id: 'c_sr_7', name: 'ノア', kana: 'のあ', rarity: 'SR', el: 'light', role: 'support', world: 'w5', source: 'summon',
      hp: 1040, atk: 176, def: 86, spd: 116, crit: 0.12,
      skills: [
        { slot: 1, name: '光脈射撃', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '時律ブースト', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の速度+20%＋行動ゲージ+15%', buff: { type: 'spdUp', val: 0.2, turns: 2 }, gaugeUp: 15 },
        { slot: 3, name: '白金の鼓舞', scope: 'passive', passiveType: 'teamSpd', val: 8, desc: '生存中、味方全体の速度+8' }
      ],
      innate: { name: '精密調整', desc: '行動速度+6' },
      linkBonus: { stat: 'spd', val: 7, text: '共鳴先の速度+7' },
      lore: '時計塔を保守する若き天才技師。仲間の装備を瞬時に最適化し動きを加速させる。'
    },
    {
      id: 'c_sr_4', name: 'ジン', kana: 'じん', rarity: 'SR', el: 'dark', role: 'dealer', world: 'w3', source: 'summon',
      hp: 920, atk: 212, def: 70, spd: 118, crit: 0.2,
      skills: [
        { slot: 1, name: '影縫い', scope: 'single', mult: 1.1, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '双刃闇閃', scope: 'area2', mult: 1.48, ct: 2, desc: '敵2体に闇ダメージ' },
        { slot: 3, name: '無月必殺剣', scope: 'single', mult: 2.1, ct: 4, desc: '敵単体に極大闇ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.2, turns: 2 } }
      ],
      innate: { name: '夜目の冴え', desc: '会心率+10%' },
      linkBonus: { stat: 'atk', val: 10, text: '共鳴先の攻撃+10%' },
      lore: '夜桜古都の屋根を音もなく駆け抜ける若き忍び。主命を果たすため月影に身を溶かす。'
    },
    {
      id: 'c_sr_10', name: 'ミラ', kana: 'みら', rarity: 'SR', el: 'dark', role: 'healer', world: 'w10', source: 'summon',
      hp: 1080, atk: 172, def: 88, spd: 108, crit: 0.1,
      skills: [
        { slot: 1, name: '闇星の雫', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '星雲の癒光', scope: 'all', kind: 'heal', mult: 1.42, ct: 3, desc: '味方全体を回復＋デバフ解除', cleanse: true },
        { slot: 3, name: '静寂の再生', scope: 'passive', passiveType: 'regenAura', val: 0.05, desc: '行動終了時、HP最低の味方を最大HPの10%回復' }
      ],
      innate: { name: '星屑の慈愛', desc: '回復量+12%' },
      linkBonus: { stat: 'hp', val: 11, text: '共鳴先の最大HP+11%' },
      lore: '星海回廊で迷い人の魂を癒やす星詠みの救護者。暗闇の中だからこそ優しい光が際立つ。'
    },
    {
      id: 'c_sr_9', name: 'ゼノ', kana: 'ぜの', rarity: 'SR', el: 'none', role: 'tank', world: 'w10', source: 'summon',
      hp: 1400, atk: 150, def: 122, spd: 96, crit: 0.1,
      skills: [
        { slot: 1, name: '重力盾撃', scope: 'single', mult: 1.02, ct: 0, desc: '敵単体に無ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '星壁展開', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+24%＋挑発', buff: { type: 'defUp', val: 0.24, turns: 2 }, selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 3, name: '無音の圧壊', scope: 'area2', mult: 1.56, ct: 4, desc: '敵2体に無ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } }
      ],
      innate: { name: '星間装甲', desc: '防御力+12%' },
      linkBonus: { stat: 'def', val: 12, text: '共鳴先の防御+12%' },
      lore: '星海回廊を巡る無口な重装旅人。属性に左右されぬ重盾であらゆる異界の脅威を受け止める。'
    },

    /* ========== R (8体) ========== */
    {
      id: 'c_r_2', name: 'テツ', kana: 'てつ', rarity: 'R', el: 'fire', role: 'support', world: 'w2', source: 'summon',
      hp: 960, atk: 162, def: 82, spd: 102, crit: 0.1,
      skills: [
        { slot: 1, name: '鉄槌打ち', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '武器研磨', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+22%', buff: { type: 'atkUp', val: 0.22, turns: 2 } },
        { slot: 3, name: '炉火の熱気', scope: 'passive', passiveType: 'teamAtk', val: 0.1, desc: '生存中、味方全体の攻撃力+10%' }
      ],
      innate: { name: '職人の目利き', desc: '炎属性味方の攻撃+8%' },
      linkBonus: { stat: 'atk', val: 8, text: '共鳴先の攻撃+8%' },
      lore: '戦いの合間に仲間の武具を瞬時に研ぎ直す実直な鍛冶職人。彼の整備を受けた刃は切れ味が違う。'
    },
    {
      id: 'c_r_4', name: 'ミナ', kana: 'みな', rarity: 'R', el: 'water', role: 'healer', world: 'w4', source: 'summon',
      hp: 980, atk: 158, def: 80, spd: 106, crit: 0.09,
      skills: [
        { slot: 1, name: '水滴弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '潤いの雫', scope: 'area2', kind: 'heal', mult: 1.2, ct: 2, desc: '味方2体を回復' },
        { slot: 3, name: '清浄の潮風', scope: 'all', kind: 'heal', mult: 1.45, ct: 4, desc: '味方全体を回復' }
      ],
      innate: { name: '穏やかな波', desc: '回復量+8%' },
      linkBonus: { stat: 'hp', val: 8, text: '共鳴先の最大HP+8%' },
      lore: '深海神殿の澄んだ湧水を操る癒し手。どんな戦況でも冷静に仲間の傷を塞ぐ。'
    },
    {
      id: 'c_r_1', name: 'カイト', kana: 'かいと', rarity: 'R', el: 'wind', role: 'dealer', world: 'w1', source: 'summon',
      hp: 880, atk: 186, def: 68, spd: 112, crit: 0.16,
      skills: [
        { slot: 1, name: '疾風一閃', scope: 'single', mult: 1.06, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '二連旋風', scope: 'area2', mult: 1.38, ct: 2, desc: '敵2体に風ダメージ' },
        { slot: 3, name: '蒼空連斬', scope: 'single', mult: 1.9, ct: 4, desc: '敵単体に高威力風ダメージ' }
      ],
      innate: { name: '軽やかな歩法', desc: '速度+5' },
      linkBonus: { stat: 'spd', val: 5, text: '共鳴先の速度+5' },
      lore: '蒼穹の遺跡を駆け巡る若き風剣士。軽装を活かした手数で敵を圧倒する。'
    },
    {
      id: 'c_r_5', name: 'セシル', kana: 'せしる', rarity: 'R', el: 'light', role: 'dealer', world: 'w5', source: 'summon',
      hp: 900, atk: 190, def: 72, spd: 108, crit: 0.16,
      skills: [
        { slot: 1, name: '白光突き', scope: 'single', mult: 1.06, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '閃光貫通', scope: 'area2', mult: 1.42, ct: 2, desc: '敵2体に光ダメージ' },
        { slot: 3, name: '星光の槍雨', scope: 'all', mult: 1.62, ct: 4, desc: '敵全体に光ダメージ' }
      ],
      innate: { name: 'まっすぐな穂先', desc: '闇属性への与ダメージ+12%' },
      linkBonus: { stat: 'atk', val: 8, text: '共鳴先の攻撃+8%' },
      lore: '時計塔の儀仗隊に籍を置く光槍使い。華麗な槍さばきは実戦でも高い威力を誇る。'
    },
    {
      id: 'c_r_7', name: 'リオ', kana: 'りお', rarity: 'R', el: 'light', role: 'support', world: 'w1', source: 'summon',
      hp: 940, atk: 160, def: 78, spd: 112, crit: 0.1,
      skills: [
        { slot: 1, name: '星光弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '光の指針', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+18%・速度+12%', buff: { type: 'atkUp', val: 0.18, turns: 2 }, buff2: { type: 'spdUp', val: 0.12, turns: 2 } },
        { slot: 3, name: '星見の加護', scope: 'passive', passiveType: 'teamSpd', val: 6, desc: '生存中、味方全体の速度+6' }
      ],
      innate: { name: '星図の知識', desc: '速度+4' },
      linkBonus: { stat: 'spd', val: 5, text: '共鳴先の速度+5' },
      lore: '遺跡の星見台で旅人に方角を示す若き案内人。仲間の歩調を合わせる術に長けている。'
    },
    {
      id: 'c_r_3', name: 'シオン', kana: 'しおん', rarity: 'R', el: 'dark', role: 'tank', world: 'w3', source: 'summon',
      hp: 1260, atk: 136, def: 110, spd: 96, crit: 0.08,
      skills: [
        { slot: 1, name: '薙刀払い', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '夜桜の構え', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+20%＋自身回復', buff: { type: 'defUp', val: 0.2, turns: 2 }, selfHeal: 0.15 },
        { slot: 3, name: '影花の円舞', scope: 'area2', mult: 1.44, ct: 4, desc: '敵2体に闇ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.16, turns: 2 } }
      ],
      innate: { name: '古都の守り手', desc: '防御力+10%' },
      linkBonus: { stat: 'def', val: 9, text: '共鳴先の防御+9%' },
      lore: '夜桜古都の鳥居を代々守り続ける薙刀使い。静かな佇まいの中に揺るがぬ覚悟を秘める。'
    },
    {
      id: 'c_r_8', name: 'ヤエ', kana: 'やえ', rarity: 'R', el: 'dark', role: 'support', world: 'w3', source: 'summon',
      hp: 930, atk: 164, def: 76, spd: 114, crit: 0.12,
      skills: [
        { slot: 1, name: '霧札投げ', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '弱化の霧', scope: 'all', mult: 1.24, ct: 3, desc: '敵全体に闇ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.18, turns: 2 } },
        { slot: 3, name: '妖霧の帳', scope: 'all', mult: 1.38, ct: 4, desc: '敵全体に闇ダメージ＋攻撃低下・速度低下', debuff: { type: 'atkDown', val: 0.16, turns: 2 }, debuff2: { type: 'spdDown', val: 0.14, turns: 2 } }
      ],
      innate: { name: '霧の術式', desc: '与ダメージ+8%' },
      linkBonus: { stat: 'atk', val: 7, text: '共鳴先の攻撃+7%' },
      lore: '竹林の霧を操り敵の視界を奪う陰陽術師。直接の火力よりも戦場を崩す搦め手を好む。'
    },
    {
      id: 'c_r_6', name: 'ソウ', kana: 'そう', rarity: 'R', el: 'none', role: 'dealer', world: 'w10', source: 'summon',
      hp: 890, atk: 188, def: 72, spd: 114, crit: 0.18,
      skills: [
        { slot: 1, name: '無音斬り', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に無ダメージ' },
        { slot: 2, name: '残像連撃', scope: 'area2', mult: 1.48, ct: 3, desc: '敵2体に無ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.16, turns: 2 } },
        { slot: 3, name: '無心の極み', scope: 'passive', passiveType: 'critBoost', val: 0.15, desc: '常時会心率+12%' }
      ],
      innate: { name: '静寂の歩み', desc: '速度+6' },
      linkBonus: { stat: 'spd', val: 6, text: '共鳴先の速度+6' },
      lore: 'どの異界にも属さず己の剣のみを磨く無銘の剣客。癖のない太刀筋はどんな相手にも通じる。'
    },

    /* ========== N (6体：初期戦力＆共鳴・試練で活躍) ========== */
    {
      id: 'c_n_2', name: 'レン', kana: 'れん', rarity: 'N', el: 'fire', role: 'dealer', world: 'w2', source: 'summon',
      hp: 840, atk: 174, def: 64, spd: 106, crit: 0.15,
      skills: [
        { slot: 1, name: '火花斬り', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '熱風払い', scope: 'area2', mult: 1.32, ct: 2, desc: '敵2体に炎ダメージ' },
        { slot: 3, name: '赤熱の一太刀', scope: 'single', mult: 1.78, ct: 4, desc: '敵単体に炎大ダメージ＋火傷', debuff: { type: 'burn', val: 0.06, turns: 2 } }
      ],
      innate: { name: '熱血の刃', desc: '攻撃力+8%' },
      linkBonus: { stat: 'atk', val: 7, text: '共鳴先の攻撃+7%' },
      lore: '紅蓮の鍛炉の工房で育った情熱的な若き剣士。まだ荒削りだが一撃の勢いは侮れない。'
    },
    {
      id: 'c_n_4', name: 'スズ', kana: 'すず', rarity: 'N', el: 'water', role: 'healer', world: 'w4', source: 'summon',
      hp: 920, atk: 148, def: 74, spd: 104, crit: 0.08,
      skills: [
        { slot: 1, name: '水脈弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '清水の恵み', scope: 'area2', kind: 'heal', mult: 1.15, ct: 2, desc: '味方2体を回復' },
        { slot: 3, name: '癒しの潮波', scope: 'all', kind: 'heal', mult: 1.38, ct: 4, desc: '味方全体を回復' }
      ],
      innate: { name: '優しい手当て', desc: '回復量+8%' },
      linkBonus: { stat: 'hp', val: 7, text: '共鳴先の最大HP+7%' },
      lore: '海辺の村から深海神殿の調査隊に加わった心優しい見習い癒し手。どんな傷にも真摯に向き合う。'
    },
    {
      id: 'c_n_3', name: 'リナ', kana: 'りな', rarity: 'N', el: 'wind', role: 'dealer', world: 'w1', source: 'summon',
      hp: 820, atk: 172, def: 62, spd: 112, crit: 0.16,
      skills: [
        { slot: 1, name: '速射の矢', scope: 'single', mult: 1.04, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '二本矢射ち', scope: 'area2', mult: 1.34, ct: 2, desc: '敵2体に風ダメージ' },
        { slot: 3, name: '風雨の斉射', scope: 'all', mult: 1.52, ct: 4, desc: '敵全体に風ダメージ' }
      ],
      innate: { name: '風読みの目', desc: '速度+5' },
      linkBonus: { stat: 'spd', val: 5, text: '共鳴先の速度+5' },
      lore: '風向きを読む才能に恵まれた遺跡の弓手。素早い連射で通常戦の露払いを担う。'
    },
    {
      id: 'c_n_5', name: 'ハル', kana: 'はる', rarity: 'N', el: 'light', role: 'support', world: 'w5', source: 'summon',
      hp: 900, atk: 150, def: 74, spd: 108, crit: 0.1,
      skills: [
        { slot: 1, name: '響きの音弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '励ましの鐘', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+18%', buff: { type: 'atkUp', val: 0.18, turns: 2 } },
        { slot: 3, name: '調和の音色', scope: 'passive', passiveType: 'teamAtk', val: 0.08, desc: '生存中、味方全体の攻撃力+8%' }
      ],
      innate: { name: '澄んだ音階', desc: '速度+4' },
      linkBonus: { stat: 'atk', val: 6, text: '共鳴先の攻撃+6%' },
      lore: '時計塔の鐘を模した手鈴を鳴らす旅の楽師。軽やかな音色が戦場の緊張を和らげる。'
    },
    {
      id: 'c_n_6', name: 'クロ', kana: 'くろ', rarity: 'N', el: 'dark', role: 'tank', world: 'w3', source: 'summon',
      hp: 1160, atk: 132, def: 100, spd: 98, crit: 0.09,
      skills: [
        { slot: 1, name: '闇受けの一撃', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '黒衣の構え', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+18%＋自身回復', buff: { type: 'defUp', val: 0.18, turns: 2 }, selfHeal: 0.14 },
        { slot: 3, name: '影払いの斬', scope: 'area2', mult: 1.36, ct: 4, desc: '敵2体に闇ダメージ' }
      ],
      innate: { name: '忍耐の構え', desc: '防御力+8%' },
      linkBonus: { stat: 'def', val: 8, text: '共鳴先の防御+8%' },
      lore: '夜桜古都の門番を務める無口な青年剣士。華やかさはなくとも背後を預けられる頼もしさがある。'
    },
    {
      id: 'c_n_1', name: 'ロイ', kana: 'ろい', rarity: 'N', el: 'none', role: 'tank', world: 'w1', source: 'summon',
      hp: 1180, atk: 126, def: 102, spd: 94, crit: 0.08,
      skills: [
        { slot: 1, name: '堅実な盾打ち', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に無ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '防衛の号令', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+18%', buff: { type: 'defUp', val: 0.18, turns: 2 } },
        { slot: 3, name: '不屈の構え', scope: 'passive', passiveType: 'dmgCut', val: 0.12, desc: '常時自身の被ダメージ-12%' }
      ],
      innate: { name: '真面目な守り', desc: '最大HP+8%' },
      linkBonus: { stat: 'hp', val: 8, text: '共鳴先の最大HP+8%' },
      lore: '蒼穹の遺跡を守る騎士を夢見る実直な盾兵。基礎に忠実な防御術はベテランにも劣らない。'
    }
  ];

  const CHAR_MAP = {};
  CHARS.forEach((c) => { CHAR_MAP[c.id] = c; });

  Object.defineProperty(window, '__IZ_CHARS__', {
    value: Object.freeze({
      CHARS,
      CHAR_MAP,
      BOARD_TEMPLATES
    }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
