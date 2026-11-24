(function () {
  'use strict';

  const Hacha = window.Hacha;

  /*
   * 全42装備（武器14・防具14・装飾14）
   * - ランダムオプション一切なし、強化システムなし
   * - 品質(1〜100%)のみで基礎性能が良化（100%極品質は1.52倍＋虹金演出）
   * - 全装備に世界観混在の紹介文つき
   */
  const EQUIPMENT = [
    /* ==================== 武器 (14種) ==================== */
    { id: 'eq_w_01', name: '蒸気仕込み木刀', kana: 'じょうきじこみぼくとう', slot: 'weapon', icon: '🗡️', tier: 1, base: { atk: 42, spd: 4, crit: 0.02 }, sellBase: 85,
      desc: '握りのバルブをひねると熱い蒸気が噴き出して振り抜きが加速する職人製の木刀。' },
    { id: 'eq_w_02', name: 'ネオン十手ブレード', kana: 'ねおんじってぶれーど', slot: 'weapon', icon: '⚡', tier: 1, base: { atk: 48, def: 12, crit: 0.03 }, sellBase: 100,
      desc: '江戸の捕物道具に蛍光管を組み込んだ眩しい一振り。夜の商店街パトロールに最適。' },
    { id: 'eq_w_03', name: 'たこ焼き鉄串ランス', kana: 'たこやきてつぐしらんす', slot: 'weapon', icon: '🔥', tier: 1, base: { atk: 58, hp: 60, crit: 0.04 }, sellBase: 120,
      desc: '大竜の屋台で鍛えられた特大の鉄串。焼きたての香ばしい熱気がそのまま刃に宿る。' },
    { id: 'eq_w_04', name: '電脳サーフ太刀', kana: 'でんのうさーふたち', slot: 'weapon', icon: '🌊', tier: 2, base: { atk: 74, spd: 8, crit: 0.05 }, sellBase: 165,
      desc: '防水回路を内蔵した流線型の長刀。水飛沫を斬るだけで電撃の波紋が広がる。' },
    { id: 'eq_w_05', name: '冷却水圧キャノン', kana: 'れいきゃくすいあつきゃのん', slot: 'weapon', icon: '💧', tier: 2, base: { atk: 82, def: 18, hp: 90 }, sellBase: 185,
      desc: 'サーバー室の大型ポンプを小型化した高圧放水銃。分厚い装甲も水刀で切り裂く。' },
    { id: 'eq_w_06', name: '妖精製超合金スパナ', kana: 'ようせいせいちょうごうきんすぱな', slot: 'weapon', icon: '🔧', tier: 3, base: { atk: 98, spd: 10, crit: 0.06 }, sellBase: 230,
      desc: '羽根のように軽いのに鉄骨を真っ二つにできる魔法合金の特大工具。' },
    { id: 'eq_w_07', name: '疾風タービン大鎌', kana: 'しっぷうたーびんおおがま', slot: 'weapon', icon: '🌪️', tier: 3, base: { atk: 112, spd: 14, crit: 0.07 }, sellBase: 260,
      desc: '風力発電の羽根を鋭く研ぎ澄ませた大鎌。振るうたび周囲に真空の竜巻が生じる。' },
    { id: 'eq_w_08', name: '聖竜の三つ星包丁', kana: 'せいりゅうのみつぼしほうちょう', slot: 'weapon', icon: '🔪', tier: 4, base: { atk: 134, hp: 120, crit: 0.08 }, sellBase: 320,
      desc: '竜神の大給食室で受け継がれる伝説の料理刀。素材も敵の装甲も美しく切り分ける。' },
    { id: 'eq_w_09', name: 'ソーラー聖槍', kana: 'そーらーせいそう', slot: 'weapon', icon: '☀️', tier: 4, base: { atk: 146, def: 24, crit: 0.07 }, sellBase: 350,
      desc: '太陽光を集束して刃先へ流し込む光輝の長槍。晴天時は眩しすぎて直視できない。' },
    { id: 'eq_w_10', name: '時刻表バスター剣', kana: 'じこくひょうばすたーけん', slot: 'weapon', icon: '⚔️', tier: 5, base: { atk: 174, spd: 14, crit: 0.09 }, sellBase: 430,
      desc: '全路線のダイヤが刻まれた巨大な鉄剣。一振りごとに分刻みの斬撃が正確に刻まれる。' },
    { id: 'eq_w_11', name: '九尾ネオン双剣', kana: 'きゅうびねおんそうけん', slot: 'weapon', icon: '🌙', tier: 5, base: { atk: 186, spd: 18, crit: 0.11 }, sellBase: 470,
      desc: '妖艶な紫光を放つ二振りの電光短剣。幻惑の残像が敵の防御をすり抜ける。' },
    { id: 'eq_w_12', name: '屋台秘伝の湯切り棒', kana: 'やたいひでんのゆきりぼう', slot: 'weapon', icon: '🍜', tier: 4, base: { atk: 152, spd: 16, crit: 0.10 }, sellBase: 390,
      desc: '乱入ラーメン屋台の店主が愛用する伝説の調理棒。完璧な手首のスナップが会心を呼ぶ。' },
    { id: 'eq_w_13', name: '量子審判の大剣', kana: 'りょうししんぱんのたいけん', slot: 'weapon', icon: '⚖️', tier: 5, base: { atk: 205, def: 32, crit: 0.10 }, sellBase: 540,
      desc: '天界の法典と量子計算機を鍛造した大剣。重厚な一撃が異界の歪みごと裁き切る。' },
    { id: 'eq_w_14', name: '万界ミキサー神剣', kana: 'ばんかいみきさーしんけん', slot: 'weapon', icon: '🌌', tier: 5, base: { atk: 228, hp: 180, spd: 16, crit: 0.12 }, sellBase: 620,
      desc: '六属性の波動が渦を巻く究極のはちゃめちゃ神剣。振ればあらゆる世界法則が共鳴する。' },

    /* ==================== 防具 (14種) ==================== */
    { id: 'eq_a_01', name: '火消し刺子ベスト', kana: 'ひけしさしこべすと', slot: 'armor', icon: '🧥', tier: 1, base: { hp: 220, def: 34 }, sellBase: 85,
      desc: '水を含ませると炎も蒸気も弾く厚手の法被。裏地には小さな耐熱プレートが縫われている。' },
    { id: 'eq_a_02', name: '鉄鍋ハーフメイル', kana: 'てつなべはーふめいる', slot: 'armor', icon: '🛡️', tier: 1, base: { hp: 260, def: 42 }, sellBase: 105,
      desc: 'たぬき兵御用達の鋳鉄鎧。見た目は丸っこいが打撃の衝撃を綺麗に逸らす優れもの。' },
    { id: 'eq_a_03', name: '蒸気式からくり羽織', kana: 'じょうきしきからくりばおり', slot: 'armor', icon: '♨️', tier: 1, base: { hp: 245, def: 38, spd: 6 }, sellBase: 120,
      desc: '背中の排気弁から蒸気を噴いて軽快に動ける和洋折衷の防護羽織。' },
    { id: 'eq_a_04', name: '深海ダイバー外骨格', kana: 'しんかいだいばーがいこっかく', slot: 'armor', icon: '🤿', tier: 2, base: { hp: 360, def: 58 }, sellBase: 165,
      desc: '水圧にも魔導砲にも耐える強化潜水スーツ。関節に補助モーターが組み込まれている。' },
    { id: 'eq_a_05', name: '防水ネオンコート', kana: 'ぼうすいねおんこーと', slot: 'armor', icon: '🫧', tier: 2, base: { hp: 325, def: 52, spd: 10 }, sellBase: 185,
      desc: '光ファイバーを織り込んだ最新式の撥水コート。暗い海底でも鮮やかに発光する。' },
    { id: 'eq_a_06', name: '妖精鉄工の安全作業服', kana: 'ようせいてっこうのあんぜんさぎょうふく', slot: 'armor', icon: '🦺', tier: 3, base: { hp: 460, def: 72, spd: 8 }, sellBase: 230,
      desc: '星の粉で防刃加工を施した反射ライン付きつなぎ。現場の安全と可愛さを両立。' },
    { id: 'eq_a_07', name: '風車タービン重鎧', kana: 'ふうしゃたーびんじゅうがい', slot: 'armor', icon: '⚙️', tier: 3, base: { hp: 540, def: 86 }, sellBase: 265,
      desc: '小型の風力羽根で衝撃を回転エネルギーへ逃がす鉄工所自慢のフルプレート。' },
    { id: 'eq_a_08', name: '聖竜鱗の割烹着', kana: 'せいりゅうりんのかっぽうぎ', slot: 'armor', icon: '🥼', tier: 4, base: { hp: 640, def: 96, atk: 24 }, sellBase: 325,
      desc: '純白の竜鱗繊維で仕立てた究極のエプロン。油ハネも必殺ブレスも一切通さない。' },
    { id: 'eq_a_09', name: '太陽電池イージス鎧', kana: 'たいようでんちいーじすがい', slot: 'armor', icon: '🔆', tier: 4, base: { hp: 720, def: 112 }, sellBase: 355,
      desc: '敵の光撃を吸収して障壁電力に変えてしまうエコで頑強な黄金聖鎧。' },
    { id: 'eq_a_10', name: '自動改札プレート', kana: 'じどうかいさつぷれーと', slot: 'armor', icon: '🚧', tier: 5, base: { hp: 860, def: 134 }, sellBase: 435,
      desc: '分厚いステンレス扉をそのまま肩と胸へ装着した無骨な装甲。物理衝撃をガッチリ遮断。' },
    { id: 'eq_a_11', name: '終電戦乙女の礼装', kana: 'しゅうでんわるきゅーれのれいそう', slot: 'armor', icon: '🎖️', tier: 5, base: { hp: 780, def: 122, spd: 14, atk: 36 }, sellBase: 470,
      desc: '金モールが輝く駅員風バトルドレス。俊敏さと神域の加護を兼ね備える。' },
    { id: 'eq_a_12', name: '宇宙鯨の星海マント', kana: 'うちゅうくじらのせいかいまんと', slot: 'armor', icon: '🐳', tier: 4, base: { hp: 760, def: 108, spd: 10 }, sellBase: 395,
      desc: '迷子の宇宙鯨が落としていった星屑の皮膜外套。纏うだけで異空間の衝撃が和らぐ。' },
    { id: 'eq_a_13', name: '深淵水帝の氷殻鎧', kana: 'しんえんすいていのひょうかくがい', slot: 'armor', icon: '🧊', tier: 5, base: { hp: 960, def: 152 }, sellBase: 545,
      desc: '絶対に溶けない深海の永久氷で形作られた皇帝鎧。圧倒的な耐久力を誇る。' },
    { id: 'eq_a_14', name: '万界クロノス外殻', kana: 'ばんかいくろのすがいかく', slot: 'armor', icon: '👑', tier: 5, base: { hp: 1100, def: 168, spd: 12 }, sellBase: 625,
      desc: '複数世界の最硬素材を時間融合させた究極装甲。身に着ける者の運命すら守り抜く。' },

    /* ==================== 装飾 (14種) ==================== */
    { id: 'eq_c_01', name: 'からくり根付お守り', kana: 'からくりねつけおまもり', slot: 'charm', icon: '🎐', tier: 1, base: { hp: 110, spd: 8, crit: 0.03 }, sellBase: 85,
      desc: 'チリンと鳴るたび小さな歯車が回って持ち主の反射神経を研ぎ澄ますお守り。' },
    { id: 'eq_c_02', name: '銭湯の常連木札', kana: 'せんとうのじょうれんきふだ', slot: 'charm', icon: '♨️', tier: 1, base: { hp: 160, def: 20, atk: 16 }, sellBase: 105,
      desc: '蒸気里の温泉パワーが染み込んだ番台木札。持っているだけで体の芯までポカポカする。' },
    { id: 'eq_c_03', name: '祭囃子の鈴ブレス', kana: 'まつりばやしのすずぶれす', slot: 'charm', icon: '🔔', tier: 1, base: { atk: 24, spd: 10, crit: 0.04 }, sellBase: 120,
      desc: '歩くだけで陽気なリズムを刻む銅鈴の腕輪。自然と仲間との息が合ってくる。' },
    { id: 'eq_c_04', name: '光ファイバー珊瑚飾', kana: 'ひかりふぁいばーさんごかざり', slot: 'charm', icon: '🪸', tier: 2, base: { hp: 210, def: 30, spd: 10 }, sellBase: 165,
      desc: '水族館の深層で育った発光珊瑚のブローチ。柔らかな蒼光が精神を落ち着かせる。' },
    { id: 'eq_c_05', name: '極地ペンギンの勲章', kana: 'きょくちぺんぎんのくんしょう', slot: 'charm', icon: '🏅', tier: 2, base: { atk: 38, spd: 12, crit: 0.05 }, sellBase: 185,
      desc: '氷上行進を完遂した者に贈られる誇り高き銀メダル。寒さにも焦りにも強くなる。' },
    { id: 'eq_c_06', name: '星屑ボルトの指輪', kana: 'ほしくずぼるとのゆびわ', slot: 'charm', icon: '💍', tier: 3, base: { atk: 48, def: 32, crit: 0.06 }, sellBase: 230,
      desc: '妖精鉄工所の精密ボルトを宝石のように磨き上げた指輪。攻守の噛み合わせが劇的に向上。' },
    { id: 'eq_c_07', name: 'キャンディ歯車時計', kana: 'きゃんでぃはぐるまどけい', slot: 'charm', icon: '🍬', tier: 3, base: { hp: 260, spd: 18, crit: 0.05 }, sellBase: 265,
      desc: '甘い香りのする携帯時計。針が軽快に刻むリズムがそのまま行動速度に変わる。' },
    { id: 'eq_c_08', name: '特濃ミルクの聖杯', kana: 'とくのうみるくのせいはい', slot: 'charm', icon: '🏆', tier: 4, base: { hp: 380, def: 46, atk: 42 }, sellBase: 325,
      desc: '竜神の大給食室で厳選された黄金の杯。生命力と骨太な頑丈さをもたらす。' },
    { id: 'eq_c_09', name: 'チョーク粉の魔導眼鏡', kana: 'ちょーくこなのまどうめがね', slot: 'charm', icon: '👓', tier: 4, base: { atk: 68, spd: 16, crit: 0.09 }, sellBase: 355,
      desc: '掛けるだけで敵の弱点と行動予定が数式のように視える不思議な黒縁眼鏡。' },
    { id: 'eq_c_10', name: '異界フリーパス定期', kana: 'いかいふりーぱすていき', slot: 'charm', icon: '💳', tier: 5, base: { hp: 420, atk: 78, spd: 20 }, sellBase: 440,
      desc: 'すべての異世界路線を乗り降り自由になる伝説の定期券。時空の抵抗を軽々突破する。' },
    { id: 'eq_c_11', name: '終着駅の黄金懐中時計', kana: 'しゅうちゃくえきのおうごんかいちゅうどけい', slot: 'charm', icon: '⏱️', tier: 5, base: { atk: 86, def: 52, spd: 24, crit: 0.08 }, sellBase: 485,
      desc: '混沌駅長から受け継いだ精密懐中時計。戦場の主導権を完全に手元へ引き寄せる。' },
    { id: 'eq_c_12', name: '招き猫の純金小判', kana: 'まねきねこのじゅんきんこばん', slot: 'charm', icon: '🪙', tier: 4, base: { hp: 340, atk: 64, spd: 18, crit: 0.10 }, sellBase: 420,
      desc: '乱入してくる黄金招き猫が落とした縁起物。持つ者に不思議な豪運と会心の閃きを授ける。' },
    { id: 'eq_c_13', name: '成層圏の妖精コア', kana: 'せいそうけんのようせいこあ', slot: 'charm', icon: '💎', tier: 5, base: { hp: 460, atk: 92, spd: 26, crit: 0.10 }, sellBase: 550,
      desc: '空中要塞の中枢に据えられていた高出力の風精結晶。圧倒的な手数と火力を生む。' },
    { id: 'eq_c_14', name: 'はちゃめちゃ万華鏡', kana: 'はちゃめちゃまんげきょう', slot: 'charm', icon: '🔮', tier: 5, base: { hp: 560, atk: 108, def: 68, spd: 26, crit: 0.13 }, sellBase: 640,
      desc: '覗き込むたび和風・SF・神話・童話が混ざり合って煌めく至高の秘宝。全能力を極限まで引き上げる。' }
  ];

  const EQUIPMENT_MAP = {};
  EQUIPMENT.forEach((eq) => { EQUIPMENT_MAP[eq.id] = eq; });

  Hacha.data.EQUIPMENT = EQUIPMENT;
  Hacha.data.EQUIPMENT_MAP = EQUIPMENT_MAP;
})();
