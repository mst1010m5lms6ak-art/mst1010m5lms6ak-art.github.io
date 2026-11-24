(function () {
  'use strict';

  const Hacha = window.Hacha;

  /*
   * 敵全36種（エリア通常20・エリアボス5・乱入専用6・異界大ボス5）
   * すべての敵が固有の技（単体/範囲/全体明記）と紹介文を持つ
   */
  const ENEMIES = [
    /* ========== エリア1：蒸気忍者の里（和風×スチームパンク） ========== */
    {
      id: 'e_a1_1', name: '歯車下忍', kana: 'はぐるまげにん', icon: '🥷', category: 'normal',
      element: 'fire', races: ['human', 'machine'], role: 'dealer',
      base: { hp: 560, atk: 122, def: 62, spd: 102 },
      desc: 'ゼンマイ仕掛けの苦無を投げる蒸気里の見習い忍者。動きは軽快だが油を差し忘れると軋み音が響く。',
      skills: [
        { name: '歯車手裏剣', scope: 'single', cd: 0, mult: 1.0 },
        { name: '煙玉スチーム', scope: 'area', cd: 2, mult: 1.15, status: { id: 'burn', chance: 0.35, turns: 2 } }
      ]
    },
    {
      id: 'e_a1_2', name: 'ボイラー鬼火', kana: 'ぼいらーおにび', icon: '🔥', category: 'normal',
      element: 'fire', races: ['monster'], role: 'supporter',
      base: { hp: 520, atk: 118, def: 58, spd: 108 },
      desc: '銭湯の釜戸から逃げ出した陽気な怪火。周囲の温度を一気に上げて味方の士気を焚き付ける。',
      skills: [
        { name: '火の粉弾', scope: 'single', cd: 0, mult: 0.96, status: { id: 'burn', chance: 0.45, turns: 2 } },
        { name: '熱気ドラム', scope: 'ally_all', cd: 3, mult: 0, allyBuff: [{ id: 'atk_up', turns: 2 }] }
      ]
    },
    {
      id: 'e_a1_3', name: '鉄鍋たぬき兵', kana: 'てつなべたぬきへい', icon: '🦝', category: 'normal',
      element: 'wind', races: ['beast', 'machine'], role: 'tank',
      base: { hp: 720, atk: 106, def: 88, spd: 86 },
      desc: '分厚い鉄鍋を兜にした頑丈な狸の番兵。叩くと良い音が鳴るうえ意外と硬い。',
      skills: [
        { name: '鍋蓋タックル', scope: 'single', cd: 0, mult: 1.0 },
        { name: '鉄壁の蓋閉め', scope: 'self', cd: 3, mult: 0, selfBuff: [{ id: 'def_up', turns: 2 }, { id: 'taunt', turns: 2 }] }
      ]
    },
    {
      id: 'e_a1_4', name: '提灯ドローン', kana: 'ちょうちんどろーん', icon: '🏮', category: 'normal',
      element: 'light', races: ['machine'], role: 'healer',
      base: { hp: 540, atk: 108, def: 66, spd: 105 },
      desc: '和紙とプロペラで宙に浮く巡回用からくり提灯。傷ついた仲間へ温かい光を照射する。',
      skills: [
        { name: '閃光フラッシュ', scope: 'single', cd: 0, mult: 0.94 },
        { name: '温光メンテナンス', scope: 'ally_single', cd: 3, healMult: 1.35 }
      ]
    },
    {
      id: 'e_a1_boss', name: '大蒸気将軍', kana: 'だいじょうきしょうぐん', icon: '👹', category: 'boss',
      element: 'fire', races: ['dragon', 'machine'], role: 'tank',
      base: { hp: 2350, atk: 182, def: 112, spd: 104 },
      desc: '巨大な煙突兜を戴く蒸気忍者の里の総大将。炉心が赤熱すると里ごと揺れる大号令を轟かせる。',
      skills: [
        { name: '紅蓮大太刀', scope: 'single', cd: 0, mult: 1.15, status: { id: 'burn', chance: 0.45, turns: 2 } },
        { name: '高圧蒸気放散', scope: 'area', cd: 2, mult: 1.32, status: { id: 'def_down', chance: 0.50, turns: 2 } },
        { name: '天下布武ボイラー砲', scope: 'all', cd: 3, mult: 1.48, status: { id: 'burn', chance: 0.60, turns: 2 } }
      ]
    },

    /* ========== エリア2：魔法電子水族館（深海×サイバー） ========== */
    {
      id: 'e_a2_1', name: '電脳クラゲ', kana: 'でんのうくらげ', icon: '🪼', category: 'normal',
      element: 'water', races: ['monster', 'machine'], role: 'supporter',
      base: { hp: 820, atk: 158, def: 86, spd: 112 },
      desc: '光ファイバーの触手で漂う電子海月。触れると痺れるデータ波を水槽じゅうへ拡散する。',
      skills: [
        { name: '感電触手', scope: 'single', cd: 0, mult: 1.0, status: { id: 'spd_down', chance: 0.45, turns: 2 } },
        { name: '帯電プロトコル', scope: 'area', cd: 2, mult: 1.20, status: { id: 'stun', chance: 0.25, turns: 1 } }
      ]
    },
    {
      id: 'e_a2_2', name: '魔導ペンギン隊', kana: 'まどうぺんぎんたい', icon: '🐧', category: 'normal',
      element: 'water', races: ['beast'], role: 'dealer',
      base: { hp: 860, atk: 174, def: 84, spd: 116 },
      desc: '魔導杖を嘴にくわえて腹滑り突撃してくる南極の精鋭。整列の美しさは水族館随一。',
      skills: [
        { name: '氷雪スライディング', scope: 'single', cd: 0, mult: 1.12 },
        { name: 'ブリザード行進', scope: 'area', cd: 2, mult: 1.30, status: { id: 'freeze', chance: 0.28, turns: 1 } }
      ]
    },
    {
      id: 'e_a2_3', name: '自動販売ゴーレム', kana: 'じどうはんばいごーれむ', icon: '🧊', category: 'normal',
      element: 'none', races: ['machine'], role: 'tank',
      base: { hp: 1120, atk: 152, def: 122, spd: 88 },
      desc: '冷たい飲料を放出しながら行進する四角い番人。売り切れランプが点くと急に暴れ出す。',
      skills: [
        { name: '氷缶バズーカ', scope: 'single', cd: 0, mult: 1.04 },
        { name: '超冷却ボディ', scope: 'self', cd: 3, mult: 0, shieldPct: 0.20, selfBuff: [{ id: 'taunt', turns: 2 }] }
      ]
    },
    {
      id: 'e_a2_4', name: '珊瑚フェアリー', kana: 'さんごふぇありー', icon: '🪸', category: 'normal',
      element: 'water', races: ['fairy'], role: 'healer',
      base: { hp: 800, atk: 150, def: 90, spd: 114 },
      desc: 'ネオン珊瑚の光を宿す水中妖精。繊細な歌声で味方の水膜を張り直す。',
      skills: [
        { name: '泡の矢', scope: 'single', cd: 0, mult: 0.96 },
        { name: '蒼波の癒し歌', scope: 'ally_all', cd: 3, healMult: 1.25 }
      ]
    },
    {
      id: 'e_a2_boss', name: '電脳海竜リヴァイア', kana: 'でんのうかいりゅうりゔぁいあ', icon: '🐋', category: 'boss',
      element: 'water', races: ['dragon', 'machine'], role: 'dealer',
      base: { hp: 3650, atk: 248, def: 144, spd: 115 },
      desc: '巨大ホログラム水槽を泳ぎ回る機械化海竜。サーバー冷却水を高圧噴射して侵入者を押し流す。',
      skills: [
        { name: '水圧レーザー牙', scope: 'single', cd: 0, mult: 1.18, status: { id: 'def_down', chance: 0.45, turns: 2 } },
        { name: 'データ津波', scope: 'area', cd: 2, mult: 1.40, status: { id: 'spd_down', chance: 0.55, turns: 2 } },
        { name: '絶対零度オーバーフロー', scope: 'all', cd: 3, mult: 1.56, status: { id: 'freeze', chance: 0.35, turns: 1 } }
      ]
    },

    /* ========== エリア3：妖精の大鉄工所（メルヘン×重工業） ========== */
    {
      id: 'e_a3_1', name: 'スパナ小妖精', kana: 'すぱなこようせい', icon: '🔧', category: 'normal',
      element: 'wind', races: ['fairy'], role: 'dealer',
      base: { hp: 1160, atk: 222, def: 112, spd: 128 },
      desc: '自分の身長より大きなスパナを軽々振り回す現場の妖精。ボルトを締める要領で敵の関節を狙う。',
      skills: [
        { name: '高速スパナ投げ', scope: 'single', cd: 0, mult: 1.14 },
        { name: '妖精旋風レンチ', scope: 'area', cd: 2, mult: 1.34, status: { id: 'vuln', chance: 0.45, turns: 2 } }
      ]
    },
    {
      id: 'e_a3_2', name: '風車ナイト', kana: 'ふうしゃないと', icon: '🌀', category: 'normal',
      element: 'wind', races: ['human', 'machine'], role: 'tank',
      base: { hp: 1520, atk: 205, def: 152, spd: 102 },
      desc: '背中に巨大な風力タービンを背負った工場警備騎士。向かい風を受けるほど鎧が硬くなる。',
      skills: [
        { name: 'タービン突き', scope: 'single', cd: 0, mult: 1.05 },
        { name: '暴風バリア', scope: 'ally_all', cd: 3, mult: 0, shieldPct: 0.16, selfBuff: [{ id: 'taunt', turns: 2 }] }
      ]
    },
    {
      id: 'e_a3_3', name: 'お菓子の起重機', kana: 'おかしのきじゅうき', icon: '🏗️', category: 'normal',
      element: 'fire', races: ['fairy', 'machine'], role: 'supporter',
      base: { hp: 1240, atk: 210, def: 120, spd: 116 },
      desc: 'キャンディ塗装のクレーン車に妖精の魂が宿った珍奇な重機。甘い香りで仲間の速度を底上げする。',
      skills: [
        { name: '角砂糖ドロップ', scope: 'single', cd: 0, mult: 1.0 },
        { name: 'シュガーブースト', scope: 'ally_all', cd: 2, mult: 0, allyBuff: [{ id: 'spd_up', turns: 2 }, { id: 'atk_up', turns: 2 }] }
      ]
    },
    {
      id: 'e_a3_4', name: '鉄羽フクロウ', kana: 'てつばねふくろう', icon: '🦉', category: 'normal',
      element: 'wind', races: ['beast'], role: 'dealer',
      base: { hp: 1140, atk: 234, def: 106, spd: 132 },
      desc: '金属の羽根を擦り合わせて超音波を放つ夜勤の梟。沈黙の風で詠唱を封じるのが得意。',
      skills: [
        { name: '鋼羽ダイブ', scope: 'single', cd: 0, mult: 1.15 },
        { name: '無音の羽ばたき', scope: 'area', cd: 3, mult: 1.28, status: { id: 'silence', chance: 0.40, turns: 1 } }
      ]
    },
    {
      id: 'e_a3_boss', name: '妖精女王ギアベル', kana: 'ようせいじょおうぎあべる', icon: '👑', category: 'boss',
      element: 'wind', races: ['fairy', 'god'], role: 'supporter',
      base: { hp: 5200, atk: 308, def: 176, spd: 132 },
      desc: '鉄工所の最上階でタクト代わりの溶接棒を振るう女王。可愛らしい笑顔のまま超高圧の風嵐を巻き起こす。',
      skills: [
        { name: '星屑プレス打', scope: 'single', cd: 0, mult: 1.18 },
        { name: '工場総動員マーチ', scope: 'ally_all', cd: 2, mult: 0, allyBuff: [{ id: 'spd_up', turns: 2 }, { id: 'crit_up', turns: 2 }] },
        { name: 'フェアリー・タイフーン', scope: 'all', cd: 3, mult: 1.62, status: { id: 'silence', chance: 0.35, turns: 1 } }
      ]
    },

    /* ========== エリア4：竜神の大給食室（神話×学園×グルメ） ========== */
    {
      id: 'e_a4_1', name: '給食エプロン竜', kana: 'きゅうしょくえぷろんりゅう', icon: '🦖', category: 'normal',
      element: 'light', races: ['dragon'], role: 'dealer',
      base: { hp: 1620, atk: 282, def: 146, spd: 118 },
      desc: '白い三角巾と割烹着を着こなす真面目な小竜。配膳の列を乱す者には熱いおたまが飛ぶ。',
      skills: [
        { name: '盛り付けスイング', scope: 'single', cd: 0, mult: 1.16 },
        { name: '黄金カレー波', scope: 'area', cd: 2, mult: 1.38, status: { id: 'burn', chance: 0.45, turns: 2 } }
      ]
    },
    {
      id: 'e_a4_2', name: '牛乳パック神官', kana: 'ぎゅうにゅうぱっくしんかん', icon: '🥛', category: 'normal',
      element: 'light', races: ['god'], role: 'healer',
      base: { hp: 1560, atk: 256, def: 152, spd: 120 },
      desc: 'カルシウムの加護を説く不思議な神官。濃厚な聖乳シャワーで仲間の骨も傷も頑丈にする。',
      skills: [
        { name: 'カルシウム光線', scope: 'single', cd: 0, mult: 1.0 },
        { name: '特濃ミルクの祝福', scope: 'ally_all', cd: 2, healMult: 1.45, allyBuff: [{ id: 'def_up', turns: 2 }] }
      ]
    },
    {
      id: 'e_a4_3', name: '揚げパン犬騎士', kana: 'あげぱんいぬきし', icon: '🥖', category: 'normal',
      element: 'fire', races: ['beast'], role: 'tank',
      base: { hp: 2050, atk: 260, def: 184, spd: 108 },
      desc: 'きなこを纏った香ばしい番犬騎士。人気メニューを守るためならどんな猛攻も噛み止める。',
      skills: [
        { name: 'カリカリ噛みつき', scope: 'single', cd: 0, mult: 1.08 },
        { name: 'きなこ煙幕ガード', scope: 'self', cd: 3, mult: 0, selfBuff: [{ id: 'taunt', turns: 2 }, { id: 'regen', turns: 2 }] }
      ]
    },
    {
      id: 'e_a4_4', name: '黒板消し魔導師', kana: 'こくばんけしまどうし', icon: '🧽', category: 'normal',
      element: 'dark', races: ['monster'], role: 'supporter',
      base: { hp: 1580, atk: 274, def: 138, spd: 124 },
      desc: 'チョークの粉で幻惑魔法を編むイタズラ魔導師。味方の防御を削ぐ粉塵を撒き散らす。',
      skills: [
        { name: 'チョーク粉弾', scope: 'single', cd: 0, mult: 1.04, status: { id: 'def_down', chance: 0.55, turns: 2 } },
        { name: '白煙デバフ嵐', scope: 'all', cd: 3, mult: 1.24, status: { id: 'atk_down', chance: 0.50, turns: 2 } }
      ]
    },
    {
      id: 'e_a4_boss', name: '料理長バハムート', kana: 'りょうりちょうばはむーと', icon: '🐉', category: 'boss',
      element: 'light', races: ['dragon', 'god'], role: 'dealer',
      base: { hp: 7200, atk: 378, def: 215, spd: 124 },
      desc: '三つ星コック帽を被った伝説の聖竜王。空腹の者には優しく、無礼な闖入者には極上の極太ブレスを振る舞う。',
      skills: [
        { name: '神鉄フライパン打', scope: 'single', cd: 0, mult: 1.22, status: { id: 'stun', chance: 0.25, turns: 1 } },
        { name: 'フランベ光輪焼き', scope: 'area', cd: 2, mult: 1.52, status: { id: 'vuln', chance: 0.60, turns: 2 } },
        { name: 'フルコース・メガフレア', scope: 'all', cd: 3, mult: 1.74, status: { id: 'burn', chance: 0.55, turns: 2 } }
      ]
    },

    /* ========== エリア5：霓虹の混沌終着駅（全ジャンル大混線） ========== */
    {
      id: 'e_a5_1', name: '改札デーモン', kana: 'かいさつでーもん', icon: '🎫', category: 'normal',
      element: 'dark', races: ['monster', 'machine'], role: 'tank',
      base: { hp: 2560, atk: 326, def: 224, spd: 116 },
      desc: '切符を持たない異世界人を即座に弾き返す自動改札の悪魔。扉の開閉速度は音速を超える。',
      skills: [
        { name: '自動扉ピンチ挟み', scope: 'single', cd: 0, mult: 1.15, status: { id: 'stun', chance: 0.28, turns: 1 } },
        { name: '不正乗車ロック', scope: 'self', cd: 3, mult: 0, shieldPct: 0.22, selfBuff: [{ id: 'taunt', turns: 2 }, { id: 'def_up', turns: 2 }] }
      ]
    },
    {
      id: 'e_a5_2', name: '終電ワルキューレ', kana: 'しゅうでんわるきゅーれ', icon: '🚃', category: 'normal',
      element: 'light', races: ['human', 'god'], role: 'dealer',
      base: { hp: 2020, atk: 356, def: 176, spd: 136 },
      desc: '時刻表を戦槍に変えて戦う終着駅の戦乙女。一秒の遅延も許さぬ苛烈な連撃を叩き込む。',
      skills: [
        { name: '定刻ランス', scope: 'single', cd: 0, mult: 1.20 },
        { name: '快速エクスプレス斬', scope: 'area', cd: 2, mult: 1.50, status: { id: 'vuln', chance: 0.50, turns: 2 } }
      ]
    },
    {
      id: 'e_a5_3', name: '異界ネオン九尾', kana: 'いかいねおんきゅうび', icon: '🦊', category: 'normal',
      element: 'dark', races: ['god', 'beast'], role: 'supporter',
      base: { hp: 2080, atk: 338, def: 180, spd: 134 },
      desc: '九本の尻尾がネオン看板のように明滅する妖狐神。幻術と毒霧で戦場の理をかき乱す。',
      skills: [
        { name: '霓虹の狐火', scope: 'single', cd: 0, mult: 1.08, status: { id: 'poison', chance: 0.55, turns: 2 } },
        { name: '九尾ネオン幻惑', scope: 'all', cd: 3, mult: 1.32, status: { id: 'atk_down', chance: 0.55, turns: 2 } }
      ]
    },
    {
      id: 'e_a5_4', name: '銀河車掌フェアリー', kana: 'ぎんがしゃしょうふぇありー', icon: '🌌', category: 'normal',
      element: 'none', races: ['fairy', 'machine'], role: 'healer',
      base: { hp: 2150, atk: 316, def: 186, spd: 128 },
      desc: '星屑の改札鋏を持つ小さな車掌妖精。車両ごと時間を少し巻き戻して味方を修復する。',
      skills: [
        { name: '星屑パンチ', scope: 'single', cd: 0, mult: 1.05 },
        { name: '時刻巻き戻し回復', scope: 'ally_all', cd: 3, healMult: 1.55, allyBuff: [{ id: 'spd_up', turns: 2 }] }
      ]
    },
    {
      id: 'e_a5_boss', name: '混沌駅長クロノス', kana: 'こんとんえきちょうくろのす', icon: '🕰️', category: 'boss',
      element: 'dark', races: ['god', 'machine'], role: 'dealer',
      base: { hp: 9800, atk: 446, def: 256, spd: 134 },
      desc: 'あらゆる異世界の路線が交わる終着駅の絶対駅長。巨大な懐中時計を掲げると、複数の世界法則が同時に暴走する。',
      skills: [
        { name: '時針スラッシュ', scope: 'single', cd: 0, mult: 1.24, status: { id: 'spd_down', chance: 0.55, turns: 2 } },
        { name: 'ダイヤ乱れ衝撃波', scope: 'area', cd: 2, mult: 1.58, status: { id: 'silence', chance: 0.40, turns: 1 } },
        { name: '万界終点エクスプレス', scope: 'all', cd: 3, mult: 1.85, status: { id: 'vuln', chance: 0.65, turns: 2 } }
      ]
    },

    /* ========== 乱入専用敵（6種：ボスWAVE以外で突如乱入！） ========== */
    {
      id: 'e_int_1', name: '爆走ラーメン屋台', kana: 'ばくそうらーめんやたい', icon: '🍜', category: 'intruder',
      element: 'fire', races: ['human', 'machine'], role: 'dealer',
      base: { hp: 1320, atk: 215, def: 118, spd: 132 },
      desc: '異世界の路地裏を時速百キロでドリフトする謎のラーメン屋台。湯気とチャーシューの香りを撒き散らし乱入する。',
      skills: [
        { name: '熱々スープ噴射', scope: 'area', cd: 0, mult: 1.08, status: { id: 'burn', chance: 0.50, turns: 2 } },
        { name: '替え玉ターボ突撃', scope: 'all', cd: 2, mult: 1.38 }
      ]
    },
    {
      id: 'e_int_2', name: '黄金招き猫商人', kana: 'おうごんまねきねこしょうにん', icon: '🐱', category: 'intruder',
      element: 'light', races: ['beast', 'fairy'], role: 'supporter',
      base: { hp: 1480, atk: 205, def: 134, spd: 138 },
      desc: '財宝の詰まった風呂敷を背負い戦場を横切る神出鬼没の招き猫。倒せば大量の資金と高品質な掘り出し物を落とす。',
      skills: [
        { name: '小判シャワー', scope: 'area', cd: 0, mult: 1.02 },
        { name: '商売繁盛ステップ', scope: 'self', cd: 2, mult: 0, selfBuff: [{ id: 'spd_up', turns: 2 }, { id: 'def_up', turns: 2 }] }
      ]
    },
    {
      id: 'e_int_3', name: '迷子の宇宙クジラ', kana: 'まいごのうちゅうくじら', icon: '🐳', category: 'intruder',
      element: 'water', races: ['dragon', 'beast'], role: 'tank',
      base: { hp: 1960, atk: 224, def: 148, spd: 108 },
      desc: '星間航路を間違えて戦場のど真ん中へ落ちてきた巨大な宇宙鯨。本人に悪気はないが尻尾の一振りが強烈。',
      skills: [
        { name: '星海テール', scope: 'area', cd: 0, mult: 1.12 },
        { name: '銀河潮吹き', scope: 'all', cd: 2, mult: 1.36, status: { id: 'spd_down', chance: 0.55, turns: 2 } }
      ]
    },
    {
      id: 'e_int_4', name: '暴走掃除ロボ神', kana: 'ぼうそうそうじろぼしん', icon: '🛸', category: 'intruder',
      element: 'wind', races: ['god', 'machine'], role: 'dealer',
      base: { hp: 1580, atk: 248, def: 136, spd: 136 },
      desc: 'ゴミひとつ残さぬ強い信念が神格化した円盤型清掃機。戦闘中のパーティごと綺麗に吸い込もうと突進する。',
      skills: [
        { name: 'サイクロン吸引', scope: 'area', cd: 0, mult: 1.16, status: { id: 'vuln', chance: 0.45, turns: 2 } },
        { name: '強モード全域清掃', scope: 'all', cd: 2, mult: 1.48 }
      ]
    },
    {
      id: 'e_int_5', name: '真夜中ピエロ伯', kana: 'まよなかぴえろはく', icon: '🃏', category: 'intruder',
      element: 'dark', races: ['monster', 'fairy'], role: 'supporter',
      base: { hp: 1640, atk: 242, def: 130, spd: 135 },
      desc: '戦場の空気が落ち着いた瞬間に飛び出してくる道化の怪人。毒トランプと奇術で陣形をひっくり返す。',
      skills: [
        { name: '毒トランプ乱舞', scope: 'area', cd: 0, mult: 1.12, status: { id: 'poison', chance: 0.55, turns: 2 } },
        { name: 'びっくり箱の大爆発', scope: 'all', cd: 2, mult: 1.44, status: { id: 'silence', chance: 0.35, turns: 1 } }
      ]
    },
    {
      id: 'e_int_6', name: '次元配達ドラゴン', kana: 'じげんはいたつどらごん', icon: '📦', category: 'intruder',
      element: 'none', races: ['dragon', 'machine'], role: 'dealer',
      base: { hp: 1850, atk: 262, def: 152, spd: 140 },
      desc: '極品質の秘宝を運ぶ最速の宅配竜。配達ルート上の邪魔者を排除するため、突如として上空から舞い降りる。',
      skills: [
        { name: '時間指定急降下', scope: 'single', cd: 0, mult: 1.32 },
        { name: '段ボール衝撃波', scope: 'all', cd: 2, mult: 1.52, status: { id: 'def_down', chance: 0.55, turns: 2 } }
      ]
    },

    /* ========== 異界大ボス（5種：エンドコンテンツ高難度レイド） ========== */
    {
      id: 'e_rb_1', name: '灼熱機関竜イフリート', kana: 'しゃくねつきかんりゅういふりーと', icon: '🌋', category: 'raid',
      element: 'fire', races: ['dragon', 'machine'], role: 'dealer',
      base: { hp: 11800, atk: 345, def: 196, spd: 122 },
      desc: '火山そのものをボイラーに改造した超巨大機関竜。継続火傷と全体熱波を耐え抜く水・回復編成が攻略の鍵。',
      skills: [
        { name: '溶岩ピストン拳', scope: 'single', cd: 0, mult: 1.25, status: { id: 'burn', chance: 0.65, turns: 2 } },
        { name: '紅蓮スチーム圧', scope: 'area', cd: 2, mult: 1.52, status: { id: 'def_down', chance: 0.60, turns: 2 } },
        { name: '噴火炉心メルトダウン', scope: 'all', cd: 3, mult: 1.82, status: { id: 'burn', chance: 0.75, turns: 3 } }
      ]
    },
    {
      id: 'e_rb_2', name: '深淵水帝クラーケン', kana: 'しんえんすいていくらーけん', icon: '🐙', category: 'raid',
      element: 'water', races: ['god', 'monster'], role: 'tank',
      base: { hp: 14200, atk: 360, def: 235, spd: 118 },
      desc: '海底都市ごと背負って歩く古の触手皇帝。硬い障壁と凍結攻撃を風属性の速攻で打ち崩す必要がある。',
      skills: [
        { name: '深海大触手', scope: 'area', cd: 0, mult: 1.15, status: { id: 'spd_down', chance: 0.55, turns: 2 } },
        { name: '海帝の氷結障壁', scope: 'self', cd: 2, mult: 0, shieldPct: 0.16, selfBuff: [{ id: 'def_up', turns: 2 }] },
        { name: 'アビス・メイルストロム', scope: 'all', cd: 3, mult: 1.78, status: { id: 'freeze', chance: 0.42, turns: 1 } }
      ]
    },
    {
      id: 'e_rb_3', name: '蒼穹要塞シルフィード', kana: 'そうきゅうようさいしるふぃーど', icon: '🌪️', category: 'raid',
      element: 'wind', races: ['fairy', 'machine'], role: 'supporter',
      base: { hp: 15800, atk: 405, def: 220, spd: 144 },
      desc: '成層圏を周回する妖精動力式の空中要塞。圧倒的な行動速度と沈黙暴風に対し、炎火力と異常対策が試される。',
      skills: [
        { name: '成層圏カッター', scope: 'single', cd: 0, mult: 1.24, status: { id: 'vuln', chance: 0.55, turns: 2 } },
        { name: 'ジェット気流加速', scope: 'self', cd: 2, mult: 0, selfBuff: [{ id: 'spd_up', turns: 2 }, { id: 'atk_up', turns: 2 }] },
        { name: 'テンペスト・キャノン', scope: 'all', cd: 3, mult: 1.88, status: { id: 'silence', chance: 0.45, turns: 1 } }
      ]
    },
    {
      id: 'e_rb_4', name: '星界審判官メタトロン', kana: 'せいかいしんぱんかんめたとろん', icon: '⚖️', category: 'raid',
      element: 'light', races: ['god', 'machine'], role: 'dealer',
      base: { hp: 18500, atk: 448, def: 252, spd: 132 },
      desc: '天秤と量子演算機で万界の秩序を測る光の審判者。闇属性の爆発力と強固な障壁管理が勝敗を分ける。',
      skills: [
        { name: '秩序の閃槍', scope: 'single', cd: 0, mult: 1.28, status: { id: 'stun', chance: 0.30, turns: 1 } },
        { name: '審判プリズム連射', scope: 'area', cd: 2, mult: 1.62, status: { id: 'def_down', chance: 0.65, turns: 2 } },
        { name: '銀河法廷ジャッジメント', scope: 'all', cd: 3, mult: 1.96, status: { id: 'vuln', chance: 0.65, turns: 2 } }
      ]
    },
    {
      id: 'e_rb_5', name: '万界混線王カオス', kana: 'ばんかいこんせんおうかおす', icon: '👾', category: 'raid',
      element: 'dark', races: ['dragon', 'god'], role: 'dealer',
      base: { hp: 22800, atk: 495, def: 274, spd: 138 },
      desc: '和風もSFも神話も丸ごとミキサーにかけた究極の混沌王。すべての育成と共鳴パズルを総動員して挑む頂点の大ボス。',
      skills: [
        { name: '境界断裂クロー', scope: 'single', cd: 0, mult: 1.30, status: { id: 'poison', chance: 0.65, turns: 2 } },
        { name: '世界法則シャッフル', scope: 'area', cd: 2, mult: 1.66, status: { id: 'atk_down', chance: 0.55, turns: 2 } },
        { name: 'はちゃめちゃビッグバン', scope: 'all', cd: 3, mult: 2.08, status: { id: 'burn', chance: 0.55, turns: 2 } }
      ]
    }
  ];

  const ENEMY_MAP = {};
  ENEMIES.forEach((e) => { ENEMY_MAP[e.id] = e; });

  Hacha.data.ENEMIES = ENEMIES;
  Hacha.data.ENEMY_MAP = ENEMY_MAP;
})();
