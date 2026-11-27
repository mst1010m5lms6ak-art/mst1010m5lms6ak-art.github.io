/* プレイアブルキャラ36体（N〜UR・6属性・4ロール・6異界・技3枠[一部技2+パッシブ]・共鳴盤・図鑑紹介文） */
(function () {
  'use strict';

  /* キャラ別 共鳴盤の共通6ノード定義（Lvなし！好きな順に解放してカスタマイズ） */
  const BOARD_TEMPLATES = [
    { key: 'hp',    name: '生命の刻印',   desc: '最大HP +18%',        stat: 'hpPct',   val: 0.18, cost: 120 },
    { key: 'atk',   name: '鋭刃の刻印',   desc: '攻撃力 +18%',        stat: 'atkPct',  val: 0.18, cost: 120 },
    { key: 'def',   name: '堅壁の刻印',   desc: '防御力 +20%',        stat: 'defPct',  val: 0.20, cost: 120 },
    { key: 'spd',   name: '迅雷の刻印',   desc: '速度 +12',           stat: 'spdFlat', val: 12,   cost: 160 },
    { key: 'crit',  name: '見切りの刻印', desc: '会心率 +12% / 会心ダメ +20%', stat: 'critPack', val: 0.12, cost: 200 },
    { key: 'skill', name: '奥義の極み',   desc: '全技の威力・回復量 +22%', stat: 'skillPct', val: 0.22, cost: 260 }
  ];

  /*
   * 全36体：
   * - 名前は自然で違和感ゼロ、3〜6文字で「…」省略一切なし
   * - kana は五十音順ソート用
   * - 技は必ず3枠（通常3技：強さ1<2<3、または技2つ＋パッシブ）
   * - source: 'summon'（通常召喚） or 'raid'（異界討伐限定解放＆確定交換可）
   */
  const CHARS = [
    /* ========== UR (4体：全て異界討伐限定または高レア特別枠) ========== */
    {
      id: 'c_ur_1', name: 'セラフィナ', kana: 'せらふいな', rarity: 'UR', el: 'wind', role: 'dealer', world: 'w1', source: 'raid',
      hp: 1080, atk: 242, def: 86, spd: 122, crit: 0.22,
      skills: [
        { slot: 1, name: '蒼翼の連閃', scope: 'single', mult: 1.15, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '烈風十字斬', scope: 'area2',  mult: 1.55, ct: 2, desc: '敵2体に風ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.2, turns: 2 } },
        { slot: 3, name: '蒼穹裁きの嵐', scope: 'all',  mult: 2.05, ct: 4, desc: '敵全体に極大風ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } }
      ],
      innate: { name: '天風の加護', desc: '行動時、自身の会心率+10%・与ダメージ+12%' },
      linkBonus: { stat: 'spd', val: 8, text: 'リンク先の速度+8・風与ダメ+10%' },
      lore: '蒼穹の廃都で語り継がれる白銀の翼を宿した剣姫。嵐を纏う剣筋は雲海すら真っ二つに断ち割る。'
    },
    {
      id: 'c_ur_2', name: '夜叉姫カグヤ', kana: 'やしゃひめかぐや', rarity: 'UR', el: 'dark', role: 'dealer', world: 'w3', source: 'raid',
      hp: 1040, atk: 254, def: 80, spd: 118, crit: 0.25,
      skills: [
        { slot: 1, name: '黒桜一閃', scope: 'single', mult: 1.2, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '朧月夜叉舞', scope: 'area3', mult: 1.95, ct: 3, desc: '敵3体に極大闇ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.18, turns: 2 } },
        { slot: 3, name: '常闇の開花', scope: 'passive', passiveType: 'critBoost', val: 0.28, desc: '【パッシブ】常時会心ダメージ+35%・敵撃破時に行動ゲージ+35%' }
      ],
      innate: { name: '妖桜の残香', desc: 'HP70%以上の敵に対して与ダメージ+20%' },
      linkBonus: { stat: 'atk', val: 14, text: 'リンク先の攻撃+14%・会心+6%' },
      lore: '千本桜の最奥に封じられていた古の剣豪姫。満月の夜にのみ黒き花弁を纏って戦場に降臨する。'
    },
    {
      id: 'c_ur_3', name: 'アルテミシア', kana: 'あるてみしあ', rarity: 'UR', el: 'light', role: 'support', world: 'w5', source: 'raid',
      hp: 1180, atk: 196, def: 102, spd: 126, crit: 0.14,
      skills: [
        { slot: 1, name: '白金光針', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '星刻加速陣', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の行動ゲージ+25%＋速度上昇', buff: { type: 'spdUp', val: 0.24, turns: 2 }, gaugeUp: 25 },
        { slot: 3, name: '天球の聖律', scope: 'all', kind: 'allyBuff', ct: 4, desc: '味方全体の攻撃+30%・防御+25%＋HP小回復', buff: { type: 'atkUp', val: 0.3, turns: 3 }, buff2: { type: 'defUp', val: 0.25, turns: 3 }, healMult: 0.55 }
      ],
      innate: { name: '永劫の時脈', desc: '開幕時、味方全体の行動ゲージ+15%' },
      linkBonus: { stat: 'spd', val: 10, text: 'リンク先の速度+10・開幕ゲージ+10%' },
      lore: '白銀の星刻機構を設計した伝説の星詠み。光脈を自在に操り、戦局の時の流れすら味方へ傾ける。'
    },
    {
      id: 'c_ur_4', name: '零翼ノヴァ', kana: 'れいよくのゔぁ', rarity: 'UR', el: 'none', role: 'tank', world: 'w6', source: 'raid',
      hp: 1620, atk: 174, def: 138, spd: 104, crit: 0.12,
      skills: [
        { slot: 1, name: '星盾衝撃', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に無ダメージ＋自身に挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '零域障壁', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+32%＋自身HP回復＋挑発', buff: { type: 'defUp', val: 0.32, turns: 3 }, selfHeal: 0.22, selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 3, name: '虚無の守護殻', scope: 'passive', passiveType: 'dmgCut', val: 0.2, desc: '【パッシブ】常時自身の被ダメージ-20%・被弾時に味方全体の行動ゲージ+5%' }
      ],
      innate: { name: '境界の盾', desc: '開幕時に自身へ挑発と防御上昇を付与' },
      linkBonus: { stat: 'hp', val: 18, text: 'リンク先の最大HP+18%・防御+10%' },
      lore: '星間回廊の零点で目覚めた白銀の守護騎士。崩れゆく異界の衝撃を一身に受け止め仲間を守り抜く。'
    },

    /* ========== SSR (8体) ========== */
    {
      id: 'c_ssr_1', name: 'レオンハルト', kana: 'れおんはると', rarity: 'SSR', el: 'light', role: 'tank', world: 'w1', source: 'summon',
      hp: 1480, atk: 158, def: 126, spd: 100, crit: 0.1,
      skills: [
        { slot: 1, name: '白銀の盾撃', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '王家の誓い', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+26%＋自身回復', buff: { type: 'defUp', val: 0.26, turns: 2 }, selfHeal: 0.2 },
        { slot: 3, name: '蒼穹の聖壁', scope: 'area2', mult: 1.6, ct: 4, desc: '敵2体に光大ダメージ＋味方全体防御上昇', buffAll: { type: 'defUp', val: 0.24, turns: 3 } }
      ],
      innate: { name: '騎士団長の矜持', desc: '挑発中、自身の防御力+20%' },
      linkBonus: { stat: 'def', val: 15, text: 'リンク先の防御+15%' },
      lore: '蒼穹の廃都で最後まで王民を逃がし続けた近衛騎士団長。折れぬ白銀の大盾が今も誇りを物語る。'
    },
    {
      id: 'c_ssr_2', name: '紅蓮のヴァル', kana: 'ぐれんのゔぁる', rarity: 'SSR', el: 'fire', role: 'dealer', world: 'w2', source: 'raid',
      hp: 1020, atk: 234, def: 78, spd: 110, crit: 0.2,
      skills: [
        { slot: 1, name: '灼熱斬', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '熔鉄連破', scope: 'area2', mult: 1.52, ct: 2, desc: '敵2体に炎ダメージ＋火傷付与', debuff: { type: 'burn', val: 0.08, turns: 2 } },
        { slot: 3, name: '紅蓮爆砕陣', scope: 'all', mult: 1.92, ct: 4, desc: '敵全体に極大炎ダメージ＋自身攻撃上昇', selfBuff: { type: 'atkUp', val: 0.25, turns: 2 } }
      ],
      innate: { name: '炉心の闘志', desc: '火傷状態の敵への与ダメージ+22%' },
      linkBonus: { stat: 'atk', val: 12, text: 'リンク先の攻撃+12%' },
      lore: '溶鉄炉の最深部で生まれ変わった炎の機工剣士。赤熱する大剣の一振りは鋼鉄すらバターのように断つ。'
    },
    {
      id: 'c_ssr_3', name: '白雪サクラ', kana: 'しらゆきさくら', rarity: 'SSR', el: 'water', role: 'healer', world: 'w3', source: 'summon',
      hp: 1160, atk: 184, def: 94, spd: 112, crit: 0.1,
      skills: [
        { slot: 1, name: '清流の札', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '桜雫の癒し', scope: 'area2', kind: 'heal', mult: 1.35, ct: 2, desc: 'HPの低い味方2体を中回復' },
        { slot: 3, name: '幽玄の霊泉', scope: 'all', kind: 'heal', mult: 1.75, ct: 4, desc: '味方全体を大回復＋デバフ解除＋防御上昇', cleanse: true, buff: { type: 'defUp', val: 0.2, turns: 2 } }
      ],
      innate: { name: '清らかな祈り', desc: '自身の回復量+15%' },
      linkBonus: { stat: 'hp', val: 14, text: 'リンク先の最大HP+14%・被回復+10%' },
      lore: '幽玄の桜京で霊泉を守り続けてきた白衣の巫女。花弁を浮かべた清水はあらゆる傷と穢れを洗い流す。'
    },
    {
      id: 'c_ssr_4', name: '影斬りホムラ', kana: 'かげきりほむら', rarity: 'SSR', el: 'fire', role: 'dealer', world: 'w3', source: 'summon',
      hp: 990, atk: 238, def: 74, spd: 118, crit: 0.22,
      skills: [
        { slot: 1, name: '炎刀抜き', scope: 'single', mult: 1.15, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '紅蓮居合', scope: 'single', mult: 2.15, ct: 3, desc: '敵単体に超高威力炎ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.22, turns: 2 } },
        { slot: 3, name: '業火の見切り', scope: 'passive', passiveType: 'critBoost', val: 0.2, desc: '【パッシブ】常時会心率+15%・単体攻撃の与ダメージ+20%' }
      ],
      innate: { name: '一刀必殺', desc: 'ボス・乱入敵への与ダメージ+16%' },
      linkBonus: { stat: 'atk', val: 12, text: 'リンク先の攻撃+12%・会心+5%' },
      lore: '古都の闇に潜み悪鬼を断つ孤高の火炎剣士。鞘から刃が閃く瞬間にはすでに勝負が決している。'
    },
    {
      id: 'c_ssr_5', name: '深海姫ネレイア', kana: 'しんかいひめねれいあ', rarity: 'SSR', el: 'water', role: 'support', world: 'w4', source: 'raid',
      hp: 1140, atk: 194, def: 96, spd: 116, crit: 0.14,
      skills: [
        { slot: 1, name: '蒼波の弾', scope: 'single', mult: 1.02, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '海流の加護', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+24%＋速度+16%', buff: { type: 'atkUp', val: 0.24, turns: 2 }, buff2: { type: 'spdUp', val: 0.16, turns: 2 } },
        { slot: 3, name: '沈黙の大渦', scope: 'all', mult: 1.62, ct: 4, desc: '敵全体に水大ダメージ＋防御低下・速度低下', debuff: { type: 'defDown', val: 0.2, turns: 2 }, debuff2: { type: 'spdDown', val: 0.18, turns: 2 } }
      ],
      innate: { name: '真珠の共鳴', desc: '水属性味方の与ダメージ+12%' },
      linkBonus: { stat: 'spd', val: 8, text: 'リンク先の速度+8' },
      lore: '深海の沈黙神殿で古の海流を読み解く王女。透き通る歌声で味方を鼓舞し、敵の歩みを奪う。'
    },
    {
      id: 'c_ssr_6', name: 'クロノス衛士', kana: 'くろのすえいし', rarity: 'SSR', el: 'none', role: 'dealer', world: 'w5', source: 'summon',
      hp: 1060, atk: 226, def: 88, spd: 116, crit: 0.18,
      skills: [
        { slot: 1, name: '白金穿ち', scope: 'single', mult: 1.12, ct: 0, desc: '敵単体に無ダメージ' },
        { slot: 2, name: '双針連撃', scope: 'area2', mult: 1.54, ct: 2, desc: '敵2体に無ダメージ＋自身速度上昇', selfBuff: { type: 'spdUp', val: 0.18, turns: 2 } },
        { slot: 3, name: '零秒殲滅砲', scope: 'all', mult: 1.88, ct: 4, desc: '敵全体に無属性極大ダメージ' }
      ],
      innate: { name: '精密照準', desc: '全属性の敵へ安定した高威力を発揮（与ダメ+12%）' },
      linkBonus: { stat: 'atk', val: 11, text: 'リンク先の攻撃+11%' },
      lore: '星刻機構の精鋭部隊に所属する白銀の機甲騎士。一切の無駄がない動きで戦場を制御する。'
    },
    {
      id: 'c_ssr_7', name: '星詠みルナ', kana: 'ほしよみるな', rarity: 'SSR', el: 'dark', role: 'support', world: 'w6', source: 'summon',
      hp: 1100, atk: 198, def: 90, spd: 120, crit: 0.15,
      skills: [
        { slot: 1, name: '星影の矢', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '虚無の呪印', scope: 'all', mult: 1.38, ct: 3, desc: '敵全体に闇ダメージ＋防御低下・攻撃低下', debuff: { type: 'defDown', val: 0.22, turns: 2 }, debuff2: { type: 'atkDown', val: 0.18, turns: 2 } },
        { slot: 3, name: '星間導きの光', scope: 'passive', passiveType: 'teamAtk', val: 0.14, desc: '【パッシブ】生存中、味方全体の攻撃力+14%・会心率+8%' }
      ],
      innate: { name: '星雲の観測', desc: 'デバフ状態の敵への味方全体ダメージ+10%' },
      linkBonus: { stat: 'atk', val: 10, text: 'リンク先の攻撃+10%・速度+5' },
      lore: '星間回廊で滅びた星々の記録を綴る観測者。闇の向こうにある微かな星光を道標として掲げる。'
    },
    {
      id: 'c_ssr_8', name: '聖泉のアリア', kana: 'せいせんのありあ', rarity: 'SSR', el: 'light', role: 'healer', world: 'w5', source: 'summon',
      hp: 1190, atk: 186, def: 98, spd: 110, crit: 0.1,
      skills: [
        { slot: 1, name: '光輪弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '白光の慈雨', scope: 'all', kind: 'heal', mult: 1.48, ct: 3, desc: '味方全体を中回復＋攻撃上昇', buff: { type: 'atkUp', val: 0.18, turns: 2 } },
        { slot: 3, name: '不滅の聖脈', scope: 'passive', passiveType: 'regenAura', val: 0.06, desc: '【パッシブ】行動終了時、最もHP割合が低い味方を最大HPの12%回復' }
      ],
      innate: { name: '聖脈の守護', desc: '味方全体の被回復量+14%' },
      linkBonus: { stat: 'hp', val: 14, text: 'リンク先の最大HP+14%' },
      lore: '星刻機構の光脈炉を癒しの術式へ転用した聖職技師。柔らかな白光が仲間の生命力を支え続ける。'
    },

    /* ========== SR (10体) ========== */
    {
      id: 'c_sr_1', name: '蒼風のエルナ', kana: 'そうふうのえるな', rarity: 'SR', el: 'wind', role: 'healer', world: 'w1', source: 'summon',
      hp: 1060, atk: 168, def: 86, spd: 112, crit: 0.1,
      skills: [
        { slot: 1, name: '翠風の矢', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '癒しの微風', scope: 'area2', kind: 'heal', mult: 1.25, ct: 2, desc: '味方2体を回復' },
        { slot: 3, name: '蒼穹の恵風', scope: 'all', kind: 'heal', mult: 1.55, ct: 4, desc: '味方全体を回復＋速度上昇', buff: { type: 'spdUp', val: 0.16, turns: 2 } }
      ],
      innate: { name: '風の癒し手', desc: '回復量+10%' },
      linkBonus: { stat: 'hp', val: 10, text: 'リンク先の最大HP+10%' },
      lore: '蒼穹の廃都で旅人の傷を手当てし続ける若き風の聖女。優しい風音が仲間の疲れを解きほぐす。'
    },
    {
      id: 'c_sr_2', name: '鉄壁のガルド', kana: 'てっぺきのがるど', rarity: 'SR', el: 'fire', role: 'tank', world: 'w2', source: 'summon',
      hp: 1380, atk: 146, def: 118, spd: 94, crit: 0.09,
      skills: [
        { slot: 1, name: '鍛鉄の盾打ち', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に炎ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '耐熱装甲', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+22%＋自身回復', buff: { type: 'defUp', val: 0.22, turns: 2 }, selfHeal: 0.18 },
        { slot: 3, name: '鋼鉄の意地', scope: 'passive', passiveType: 'dmgCut', val: 0.14, desc: '【パッシブ】常時自身の被ダメージ-14%' }
      ],
      innate: { name: '炉守の誇り', desc: '最大HP+10%' },
      linkBonus: { stat: 'def', val: 12, text: 'リンク先の防御+12%' },
      lore: '紅蓮の溶鉄炉で重装甲を自ら鍛え上げたベテラン鍛冶師。どんな猛火の中でも一歩も退かない。'
    },
    {
      id: 'c_sr_3', name: '蒸気射手ミオ', kana: 'じょうきしゃしゅみお', rarity: 'SR', el: 'fire', role: 'dealer', world: 'w2', source: 'summon',
      hp: 940, atk: 206, def: 72, spd: 112, crit: 0.18,
      skills: [
        { slot: 1, name: '赤熱弾', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '連装蒸気弾', scope: 'area2', mult: 1.44, ct: 2, desc: '敵2体に炎ダメージ＋火傷', debuff: { type: 'burn', val: 0.07, turns: 2 } },
        { slot: 3, name: '爆圧キャノン', scope: 'all', mult: 1.72, ct: 4, desc: '敵全体に炎大ダメージ' }
      ],
      innate: { name: '高圧装填', desc: '与ダメージ+10%' },
      linkBonus: { stat: 'atk', val: 9, text: 'リンク先の攻撃+9%' },
      lore: '自作の蒸気式連発銃を愛する快活な機工技師。煙の晴れた先には狙い通りの穴が空いている。'
    },
    {
      id: 'c_sr_4', name: '月影レン', kana: 'つきかげれん', rarity: 'SR', el: 'dark', role: 'dealer', world: 'w3', source: 'summon',
      hp: 920, atk: 212, def: 70, spd: 118, crit: 0.2,
      skills: [
        { slot: 1, name: '影縫い', scope: 'single', mult: 1.1, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '双刃闇閃', scope: 'area2', mult: 1.48, ct: 2, desc: '敵2体に闇ダメージ' },
        { slot: 3, name: '無月必殺剣', scope: 'single', mult: 2.1, ct: 4, desc: '敵単体に極大闇ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.2, turns: 2 } }
      ],
      innate: { name: '夜目の冴え', desc: '会心率+10%' },
      linkBonus: { stat: 'atk', val: 10, text: 'リンク先の攻撃+10%' },
      lore: '桜京の屋根を音もなく駆け抜ける若き忍び。主命を果たすため月影に身を溶かす。'
    },
    {
      id: 'c_sr_5', name: '潮騒のカイ', kana: 'しおさいのかい', rarity: 'SR', el: 'water', role: 'dealer', world: 'w4', source: 'summon',
      hp: 980, atk: 204, def: 78, spd: 108, crit: 0.16,
      skills: [
        { slot: 1, name: '蒼槍突き', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '渦流二連槍', scope: 'area2', mult: 1.45, ct: 2, desc: '敵2体に水ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.16, turns: 2 } },
        { slot: 3, name: '激流穿孔', scope: 'area3', mult: 1.76, ct: 4, desc: '敵3体に水大ダメージ' }
      ],
      innate: { name: '海流の勘', desc: '水属性攻撃の威力+12%' },
      linkBonus: { stat: 'atk', val: 9, text: 'リンク先の攻撃+9%' },
      lore: '深海神殿を探索する若き蒼槍の使い手。荒れ狂う潮流を読み切り、槍先一つで道を開く。'
    },
    {
      id: 'c_sr_6', name: '深海の盾イリス', kana: 'しんかいのたていりす', rarity: 'SR', el: 'water', role: 'tank', world: 'w4', source: 'summon',
      hp: 1360, atk: 142, def: 120, spd: 96, crit: 0.08,
      skills: [
        { slot: 1, name: '水壁の打撃', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '真珠の結界', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+24%＋自身回復', buff: { type: 'defUp', val: 0.24, turns: 2 }, selfHeal: 0.16 },
        { slot: 3, name: '蒼海波濤盾', scope: 'all', mult: 1.4, ct: 4, desc: '敵全体に水ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.18, turns: 2 } }
      ],
      innate: { name: '静水守護', desc: '被回復量+15%' },
      linkBonus: { stat: 'hp', val: 12, text: 'リンク先の最大HP+12%' },
      lore: '海底遺跡の聖域を守る蒼鎧の女騎士。水の膜で衝撃を逃がす独特の盾術を修めている。'
    },
    {
      id: 'c_sr_7', name: '白銀技師ノア', kana: 'しろがねぎしのあ', rarity: 'SR', el: 'light', role: 'support', world: 'w5', source: 'summon',
      hp: 1040, atk: 176, def: 86, spd: 116, crit: 0.12,
      skills: [
        { slot: 1, name: '光脈射撃', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '時律ブースト', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の速度+20%＋行動ゲージ+15%', buff: { type: 'spdUp', val: 0.2, turns: 2 }, gaugeUp: 15 },
        { slot: 3, name: '白金の鼓舞', scope: 'passive', passiveType: 'teamSpd', val: 8, desc: '【パッシブ】生存中、味方全体の速度+8' }
      ],
      innate: { name: '精密調整', desc: '味方へのバフ持続が安定し行動速度+6' },
      linkBonus: { stat: 'spd', val: 7, text: 'リンク先の速度+7' },
      lore: '星刻機構の時計塔を保守する若き天才技師。仲間の装備を瞬時に最適化し動きを加速させる。'
    },
    {
      id: 'c_sr_8', name: '風詠みシルフ', kana: 'かぜよみしるふ', rarity: 'SR', el: 'wind', role: 'support', world: 'w1', source: 'summon',
      hp: 1020, atk: 174, def: 82, spd: 118, crit: 0.12,
      skills: [
        { slot: 1, name: '風刃の調べ', scope: 'single', mult: 1.02, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '追い風の歌', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+22%＋速度+14%', buff: { type: 'atkUp', val: 0.22, turns: 2 }, buff2: { type: 'spdUp', val: 0.14, turns: 2 } },
        { slot: 3, name: '烈風弱体陣', scope: 'all', mult: 1.48, ct: 4, desc: '敵全体に風ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.18, turns: 2 } }
      ],
      innate: { name: '蒼風の旋律', desc: '開幕時、自身の行動ゲージ+20%' },
      linkBonus: { stat: 'spd', val: 6, text: 'リンク先の速度+6' },
      lore: '廃都の風に乗って古の歌を紡ぐ吟遊詩人。その旋律は味方の士気を高め、敵の陣容を乱す。'
    },
    {
      id: 'c_sr_9', name: '虚空の盾ゼノ', kana: 'こくうのたてぜの', rarity: 'SR', el: 'none', role: 'tank', world: 'w6', source: 'summon',
      hp: 1400, atk: 150, def: 122, spd: 96, crit: 0.1,
      skills: [
        { slot: 1, name: '重力盾撃', scope: 'single', mult: 1.02, ct: 0, desc: '敵単体に無ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '星壁展開', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+24%＋挑発', buff: { type: 'defUp', val: 0.24, turns: 2 }, selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 3, name: '無音の圧壊', scope: 'area2', mult: 1.56, ct: 4, desc: '敵2体に無ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.2, turns: 2 } }
      ],
      innate: { name: '星間装甲', desc: '防御力+12%' },
      linkBonus: { stat: 'def', val: 12, text: 'リンク先の防御+12%' },
      lore: '星間回廊を巡る無口な重装旅人。属性に左右されぬ重盾であらゆる異界の脅威を受け止める。'
    },
    {
      id: 'c_sr_10', name: '星光癒しミラ', kana: 'せいこういやしみら', rarity: 'SR', el: 'dark', role: 'healer', world: 'w6', source: 'summon',
      hp: 1080, atk: 172, def: 88, spd: 108, crit: 0.1,
      skills: [
        { slot: 1, name: '闇星の雫', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '星雲の癒光', scope: 'all', kind: 'heal', mult: 1.42, ct: 3, desc: '味方全体を回復＋デバフ解除', cleanse: true },
        { slot: 3, name: '静寂の再生', scope: 'passive', passiveType: 'regenAura', val: 0.05, desc: '【パッシブ】行動終了時、HP最低の味方を最大HPの10%回復' }
      ],
      innate: { name: '星屑の慈愛', desc: '回復量+12%' },
      linkBonus: { stat: 'hp', val: 11, text: 'リンク先の最大HP+11%' },
      lore: '終焉の回廊で迷い人の魂を癒やす星詠みの救護者。暗闇の中だからこそ優しい光が際立つ。'
    },

    /* ========== R (8体) ========== */
    {
      id: 'c_r_1', name: '風剣士カイト', kana: 'かぜけんしかいと', rarity: 'R', el: 'wind', role: 'dealer', world: 'w1', source: 'summon',
      hp: 880, atk: 186, def: 68, spd: 112, crit: 0.16,
      skills: [
        { slot: 1, name: '疾風一閃', scope: 'single', mult: 1.06, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '二連旋風', scope: 'area2', mult: 1.38, ct: 2, desc: '敵2体に風ダメージ' },
        { slot: 3, name: '蒼空連斬', scope: 'single', mult: 1.9, ct: 4, desc: '敵単体に高威力風ダメージ' }
      ],
      innate: { name: '軽やかな歩法', desc: '速度+5' },
      linkBonus: { stat: 'spd', val: 5, text: 'リンク先の速度+5' },
      lore: '蒼穹の廃都を駆け巡る若き風剣士。軽装を活かした手数で敵を圧倒する。'
    },
    {
      id: 'c_r_2', name: '炎鍛冶テツ', kana: 'ほのおだじいてつ', rarity: 'R', el: 'fire', role: 'support', world: 'w2', source: 'summon',
      hp: 960, atk: 162, def: 82, spd: 102, crit: 0.1,
      skills: [
        { slot: 1, name: '鉄槌打ち', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '武器研磨', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+22%', buff: { type: 'atkUp', val: 0.22, turns: 2 } },
        { slot: 3, name: '炉火の熱気', scope: 'passive', passiveType: 'teamAtk', val: 0.1, desc: '【パッシブ】生存中、味方全体の攻撃力+10%' }
      ],
      innate: { name: '職人の目利き', desc: '炎属性味方の攻撃+8%' },
      linkBonus: { stat: 'atk', val: 8, text: 'リンク先の攻撃+8%' },
      lore: '戦いの合間に仲間の武具を瞬時に研ぎ直す実直な鍛冶職人。彼の整備を受けた刃は切れ味が違う。'
    },
    {
      id: 'c_r_3', name: '桜守シオン', kana: 'さくらもりしおん', rarity: 'R', el: 'dark', role: 'tank', world: 'w3', source: 'summon',
      hp: 1260, atk: 136, def: 110, spd: 96, crit: 0.08,
      skills: [
        { slot: 1, name: '薙刀払い', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '夜桜の構え', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+20%＋自身回復', buff: { type: 'defUp', val: 0.2, turns: 2 }, selfHeal: 0.15 },
        { slot: 3, name: '影花の円舞', scope: 'area2', mult: 1.44, ct: 4, desc: '敵2体に闇ダメージ＋攻撃低下', debuff: { type: 'atkDown', val: 0.16, turns: 2 } }
      ],
      innate: { name: '古都の守り手', desc: '防御力+10%' },
      linkBonus: { stat: 'def', val: 9, text: 'リンク先の防御+9%' },
      lore: '桜京の鳥居を代々守り続ける薙刀使い。静かな佇まいの中に揺るがぬ覚悟を秘める。'
    },
    {
      id: 'c_r_4', name: '水術士ミナ', kana: 'みずじゅつしみな', rarity: 'R', el: 'water', role: 'healer', world: 'w4', source: 'summon',
      hp: 980, atk: 158, def: 80, spd: 106, crit: 0.09,
      skills: [
        { slot: 1, name: '水滴弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '潤いの雫', scope: 'area2', kind: 'heal', mult: 1.2, ct: 2, desc: '味方2体を回復' },
        { slot: 3, name: '清浄の潮風', scope: 'all', kind: 'heal', mult: 1.45, ct: 4, desc: '味方全体を回復' }
      ],
      innate: { name: '穏やかな波', desc: '回復量+8%' },
      linkBonus: { stat: 'hp', val: 8, text: 'リンク先の最大HP+8%' },
      lore: '深海神殿の澄んだ湧水を操る癒し手。どんな戦況でも冷静に仲間の傷を塞ぐ。'
    },
    {
      id: 'c_r_5', name: '光槍のセシル', kana: 'こうそうのせしる', rarity: 'R', el: 'light', role: 'dealer', world: 'w5', source: 'summon',
      hp: 900, atk: 190, def: 72, spd: 108, crit: 0.16,
      skills: [
        { slot: 1, name: '白光突き', scope: 'single', mult: 1.06, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '閃光貫通', scope: 'area2', mult: 1.42, ct: 2, desc: '敵2体に光ダメージ' },
        { slot: 3, name: '星光の槍雨', scope: 'all', mult: 1.62, ct: 4, desc: '敵全体に光ダメージ' }
      ],
      innate: { name: 'まっすぐな穂先', desc: '闇属性への与ダメージ+12%' },
      linkBonus: { stat: 'atk', val: 8, text: 'リンク先の攻撃+8%' },
      lore: '星刻機構の儀仗隊に籍を置く光槍使い。華麗な槍さばきは実戦でも高い威力を誇る。'
    },
    {
      id: 'c_r_6', name: '無影のソウ', kana: 'むえいのそう', rarity: 'R', el: 'none', role: 'dealer', world: 'w6', source: 'summon',
      hp: 890, atk: 188, def: 72, spd: 114, crit: 0.18,
      skills: [
        { slot: 1, name: '無音斬り', scope: 'single', mult: 1.08, ct: 0, desc: '敵単体に無ダメージ' },
        { slot: 2, name: '残像連撃', scope: 'area2', mult: 1.48, ct: 3, desc: '敵2体に無ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.16, turns: 2 } },
        { slot: 3, name: '無心の極み', scope: 'passive', passiveType: 'critBoost', val: 0.15, desc: '【パッシブ】常時会心率+12%' }
      ],
      innate: { name: '静寂の歩み', desc: '速度+6' },
      linkBonus: { stat: 'spd', val: 6, text: 'リンク先の速度+6' },
      lore: 'どの異界にも属さず己の剣のみを磨く無銘の剣客。癖のない太刀筋はどんな相手にも通じる。'
    },
    {
      id: 'c_r_7', name: '星導士リオ', kana: 'せいどうしりお', rarity: 'R', el: 'light', role: 'support', world: 'w1', source: 'summon',
      hp: 940, atk: 160, def: 78, spd: 112, crit: 0.1,
      skills: [
        { slot: 1, name: '星光弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '光の指針', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+18%・速度+12%', buff: { type: 'atkUp', val: 0.18, turns: 2 }, buff2: { type: 'spdUp', val: 0.12, turns: 2 } },
        { slot: 3, name: '星見の加護', scope: 'passive', passiveType: 'teamSpd', val: 6, desc: '【パッシブ】生存中、味方全体の速度+6' }
      ],
      innate: { name: '星図の知識', desc: '味方の行動テンポを整える' },
      linkBonus: { stat: 'spd', val: 5, text: 'リンク先の速度+5' },
      lore: '廃都の星見台で旅人に方角を示す若き案内人。仲間の歩調を合わせる術に長けている。'
    },
    {
      id: 'c_r_8', name: '霧隠れのヤエ', kana: 'きりがくれのやえ', rarity: 'R', el: 'dark', role: 'support', world: 'w3', source: 'summon',
      hp: 930, atk: 164, def: 76, spd: 114, crit: 0.12,
      skills: [
        { slot: 1, name: '霧札投げ', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇ダメージ' },
        { slot: 2, name: '弱化の霧', scope: 'all', mult: 1.24, ct: 3, desc: '敵全体に闇ダメージ＋防御低下', debuff: { type: 'defDown', val: 0.18, turns: 2 } },
        { slot: 3, name: '妖霧の帳', scope: 'all', mult: 1.38, ct: 4, desc: '敵全体に闇ダメージ＋攻撃低下・速度低下', debuff: { type: 'atkDown', val: 0.16, turns: 2 }, debuff2: { type: 'spdDown', val: 0.14, turns: 2 } }
      ],
      innate: { name: '霧の術式', desc: 'デバフ付与時の効果安定' },
      linkBonus: { stat: 'atk', val: 7, text: 'リンク先の攻撃+7%' },
      lore: '竹林の霧を操り敵の視界を奪う陰陽術師。直接の火力よりも戦場を崩す搦め手を好む。'
    },

    /* ========== N (6体：6属性×バランスロール・初期戦力＆共鳴リンク＆低レア試練で大活躍！) ========== */
    {
      id: 'c_n_1', name: '見習い盾ロイ', kana: 'みならいたてろい', rarity: 'N', el: 'none', role: 'tank', world: 'w1', source: 'summon',
      hp: 1180, atk: 126, def: 102, spd: 94, crit: 0.08,
      skills: [
        { slot: 1, name: '堅実な盾打ち', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に無ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '防衛の号令', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+18%', buff: { type: 'defUp', val: 0.18, turns: 2 } },
        { slot: 3, name: '不屈の構え', scope: 'passive', passiveType: 'dmgCut', val: 0.12, desc: '【パッシブ】常時自身の被ダメージ-12%' }
      ],
      innate: { name: '真面目な守り', desc: '覚醒しやすく前線を堅実に支える' },
      linkBonus: { stat: 'hp', val: 8, text: 'リンク先の最大HP+8%' },
      lore: '蒼穹の廃都を守る騎士を夢見る実直な盾兵。基礎に忠実な防御術はベテランにも劣らない。'
    },
    {
      id: 'c_n_2', name: '火花の剣士レン', kana: 'ひばなのけんしれん', rarity: 'N', el: 'fire', role: 'dealer', world: 'w2', source: 'summon',
      hp: 840, atk: 174, def: 64, spd: 106, crit: 0.15,
      skills: [
        { slot: 1, name: '火花斬り', scope: 'single', mult: 1.05, ct: 0, desc: '敵単体に炎ダメージ' },
        { slot: 2, name: '熱風払い', scope: 'area2', mult: 1.32, ct: 2, desc: '敵2体に炎ダメージ' },
        { slot: 3, name: '赤熱の一太刀', scope: 'single', mult: 1.78, ct: 4, desc: '敵単体に炎大ダメージ＋火傷', debuff: { type: 'burn', val: 0.06, turns: 2 } }
      ],
      innate: { name: '熱血の刃', desc: '攻撃力+8%' },
      linkBonus: { stat: 'atk', val: 7, text: 'リンク先の攻撃+7%' },
      lore: '溶鉄炉の工房で育った情熱的な若き剣士。まだ荒削りだが一撃の勢いは侮れない。'
    },
    {
      id: 'c_n_3', name: '翠風の弓手リナ', kana: 'すいふうのゆみてりな', rarity: 'N', el: 'wind', role: 'dealer', world: 'w1', source: 'summon',
      hp: 820, atk: 172, def: 62, spd: 112, crit: 0.16,
      skills: [
        { slot: 1, name: '速射の矢', scope: 'single', mult: 1.04, ct: 0, desc: '敵単体に風ダメージ' },
        { slot: 2, name: '二本矢射ち', scope: 'area2', mult: 1.34, ct: 2, desc: '敵2体に風ダメージ' },
        { slot: 3, name: '風雨の斉射', scope: 'all', mult: 1.52, ct: 4, desc: '敵全体に風ダメージ' }
      ],
      innate: { name: '風読みの目', desc: '速度+5' },
      linkBonus: { stat: 'spd', val: 5, text: 'リンク先の速度+5' },
      lore: '風向きを読む才能に恵まれた廃都の弓手。素早い連射で通常戦の露払いを担う。'
    },
    {
      id: 'c_n_4', name: '潮見の癒手スズ', kana: 'しおみのいやしてすず', rarity: 'N', el: 'water', role: 'healer', world: 'w4', source: 'summon',
      hp: 920, atk: 148, def: 74, spd: 104, crit: 0.08,
      skills: [
        { slot: 1, name: '水脈弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に水ダメージ' },
        { slot: 2, name: '清水の恵み', scope: 'area2', kind: 'heal', mult: 1.15, ct: 2, desc: '味方2体を回復' },
        { slot: 3, name: '癒しの潮波', scope: 'all', kind: 'heal', mult: 1.38, ct: 4, desc: '味方全体を回復' }
      ],
      innate: { name: '優しい手当て', desc: '回復量+8%' },
      linkBonus: { stat: 'hp', val: 7, text: 'リンク先の最大HP+7%' },
      lore: '海辺の村から神殿の調査隊に加わった心優しい見習い癒し手。どんな傷にも真摯に向き合う。'
    },
    {
      id: 'c_n_5', name: '光鐘の楽師ハル', kana: 'こうしょうのがくしはる', rarity: 'N', el: 'light', role: 'support', world: 'w5', source: 'summon',
      hp: 900, atk: 150, def: 74, spd: 108, crit: 0.1,
      skills: [
        { slot: 1, name: '響きの音弾', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に光ダメージ' },
        { slot: 2, name: '励ましの鐘', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の攻撃+18%', buff: { type: 'atkUp', val: 0.18, turns: 2 } },
        { slot: 3, name: '調和の音色', scope: 'passive', passiveType: 'teamAtk', val: 0.08, desc: '【パッシブ】生存中、味方全体の攻撃力+8%' }
      ],
      innate: { name: '澄んだ音階', desc: '味方全体の士気を底上げする' },
      linkBonus: { stat: 'atk', val: 6, text: 'リンク先の攻撃+6%' },
      lore: '星刻機構の鐘を模した手鈴を鳴らす旅の楽師。軽やかな音色が戦場の緊張を和らげる。'
    },
    {
      id: 'c_n_6', name: '影守の剣士クロ', kana: 'かげもりのけんしくろ', rarity: 'N', el: 'dark', role: 'tank', world: 'w3', source: 'summon',
      hp: 1160, atk: 132, def: 100, spd: 98, crit: 0.09,
      skills: [
        { slot: 1, name: '闇受けの一撃', scope: 'single', mult: 1.0, ct: 0, desc: '敵単体に闇ダメージ＋挑発', selfBuff: { type: 'taunt', val: 1, turns: 2 } },
        { slot: 2, name: '黒衣の構え', scope: 'all', kind: 'allyBuff', ct: 3, desc: '味方全体の防御+18%＋自身回復', buff: { type: 'defUp', val: 0.18, turns: 2 }, selfHeal: 0.14 },
        { slot: 3, name: '影払いの斬', scope: 'area2', mult: 1.36, ct: 4, desc: '敵2体に闇ダメージ' }
      ],
      innate: { name: '忍耐の構え', desc: '防御力+8%' },
      linkBonus: { stat: 'def', val: 8, text: 'リンク先の防御+8%' },
      lore: '桜京の門番を務める無口な青年剣士。華やかさはなくとも背後を預けられる頼もしさがある。'
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
