/* 装備20シリーズ×4部位＝80種（部位別紹介文＆部位順ソート・品質5段階・限定6種）・自由アビリティ30種・3軸編成シナジー */
(function () {
  'use strict';

  /* 品質5段階（高品質ほど低確率） */
  const QUALITIES = [
    { id: 0, name: '標準', mult: 1.00, setMult: 1.00, sellVal: 40,   weight: 50 },
    { id: 1, name: '上質', mult: 1.18, setMult: 1.08, sellVal: 95,   weight: 28 },
    { id: 2, name: '精巧', mult: 1.40, setMult: 1.18, sellVal: 210,  weight: 14 },
    { id: 3, name: '逸品', mult: 1.68, setMult: 1.30, sellVal: 480,  weight: 6  },
    { id: 4, name: '至宝', mult: 2.05, setMult: 1.45, sellVal: 1100, weight: 2  }
  ];

  /* 装備4部位（図鑑＆一覧の厳密並び順：武器→防具→装飾→紋章） */
  const SLOTS = [
    { id: 'weapon',    name: '武器', order: 0, baseStat: 'atk', statLabel: '攻撃力', baseVal: 58 },
    { id: 'armor',     name: '防具', order: 1, baseStat: 'def', statLabel: '防御力', baseVal: 36 },
    { id: 'accessory', name: '装飾', order: 2, baseStat: 'hp',  statLabel: '最大HP', baseVal: 310 },
    { id: 'emblem',    name: '紋章', order: 3, baseStat: 'spd', statLabel: '速度',   baseVal: 12 }
  ];

  const SLOT_MAP = {};
  SLOTS.forEach((sl) => { SLOT_MAP[sl.id] = sl; });

  /* 全20シリーズ（異界探索14種 ＋ 異界討伐限定6種［属性順：炎→水→風→光→闇→無］） */
  const EQUIP_SERIES = [
    /* ===== 異界探索 14シリーズ ===== */
    {
      id: 's_sky', name: '蒼穹の羽装', limited: false, tier: 1.00, sourceText: '蒼穹の天空遺跡 / 翠玉の世界樹森域',
      partNames: { weapon: '蒼風の細剣', armor: '白羽の外套', accessory: '蒼天の首飾', emblem: '蒼穹の紋章' },
      partLores: {
        weapon: '空気抵抗を極限まで削いだ白銀の細剣。振り抜くだけで鋭い風刃が走る。',
        armor: '白鳥の羽織のように軽やかな蒼色の外套。風の加護により回避と初動を助ける。',
        accessory: '澄み渡る空の欠片を封じた首飾り。装着者の呼吸を整え疲れを遠ざける。',
        emblem: '天空王国の斥候隊が掲げた翼の紋章。戦場の先手を取る者の証。'
      },
      set2: { desc: '速度 +8', stat: 'spd', val: 8 },
      set4: { desc: '与ダメージ +16% / 開幕行動ゲージ +15%', dmgPct: 0.16, startGauge: 15 },
      lore: '蒼穹の遺跡で騎士団が身に纏った軽装武具。風を切るように素早い立ち回りを可能にする。'
    },
    {
      id: 's_oath', name: '白王の誓装', limited: false, tier: 1.05, sourceText: '蒼穹の天空遺跡 / 紅蓮の蒸気鍛炉',
      partNames: { weapon: '誓約の直剣', armor: '白石の重鎧', accessory: '王家の指輪', emblem: '誓約の紋章' },
      partLores: {
        weapon: '王民を護る誓いが刻まれた無骨な直剣。攻防の均衡に優れた王道の名剣。',
        armor: '白大理石を特殊な鍛造法で軽鋼化した重鎧。正面からの猛攻をびくともせず受け止める。',
        accessory: '古王家の家紋が彫られた白金の指輪。持ち主に揺るがぬ生命力をもたらす。',
        emblem: '近衛騎士団の誓いを象った盾形紋章。仲間を護る意志が守りをさらに固める。'
      },
      set2: { desc: '最大HP +14%', stat: 'hpPct', val: 0.14 },
      set4: { desc: '防御力 +22% / 被ダメージ -10%', defPct: 0.22, dmgCut: 0.10 },
      lore: '遺跡の白王へ忠誠を誓った近衛隊の礼装。堅牢な守りで前線の仲間を支え続ける。'
    },
    {
      id: 's_forge', name: '紅蓮の鍛装', limited: false, tier: 1.14, sourceText: '紅蓮の蒸気鍛炉 / 黄昏の太陽砂都',
      partNames: { weapon: '溶鉄の大剣', armor: '黒鉄の胸甲', accessory: '炉心の腕輪', emblem: '紅蓮の紋章' },
      partLores: {
        weapon: '溶鉄炉の高温で幾度も折り返された赤熱の大剣。重みと熱波が装甲ごと叩き割る。',
        armor: '煤に燻された分厚い黒鉄の胸甲。熱風も爆炎も寄せつけぬ頑強な造り。',
        accessory: '炉心の熱を小さく閉じ込めた鋼の腕輪。装着者の闘志と血潮を滾らせる。',
        emblem: '鍛炉の職人が魂を込めて打った紅蓮の刻印。一撃の破壊力を極限まで高める。'
      },
      set2: { desc: '攻撃力 +15%', stat: 'atkPct', val: 0.15 },
      set4: { desc: '会心率 +14% / 会心ダメージ +24%', crit: 0.14, critDmg: 0.24 },
      lore: '紅蓮の鍛炉で幾度も焼き入れられた攻撃特化の武具。振るうたび烈火のごとき威力を放つ。'
    },
    {
      id: 's_sakura', name: '幽玄の桜装', limited: false, tier: 1.22, sourceText: '幽玄の夜桜古都',
      partNames: { weapon: '夜桜の太刀', armor: '薄紅の羽織', accessory: '桜雫の根付', emblem: '夜桜の紋章' },
      partLores: {
        weapon: '刃文に桜花を宿した細身の太刀。鞘走りの閃光と共に花びらが舞い落ちる。',
        armor: '絹糸と霊糸を織り合わせた薄紅の戦羽織。軽やかでありながら刃を通さない。',
        accessory: '朝露を帯びた桜玉の根付。澄んだ霊気が持ち主の生命力を優しく補う。',
        emblem: '古都の雅を象徴する夜桜の紋。華麗な太刀筋と俊敏な歩法を導く。'
      },
      set2: { desc: '会心率 +10%', stat: 'crit', val: 0.10 },
      set4: { desc: '技威力 +20% / 速度 +8', skillPct: 0.20, spd: 8 },
      lore: '夜桜古都に伝わる雅な戦装束。優美な意匠の裏に鋭利な必殺の技が込められている。'
    },
    {
      id: 's_veil', name: '宵闇の紗装', limited: false, tier: 1.28, sourceText: '幽玄の夜桜古都',
      partNames: { weapon: '宵影の短剣', armor: '薄闇の羽衣', accessory: '月露の耳飾', emblem: '宵闇の紋章' },
      partLores: {
        weapon: '月光すら吸い込む漆黒の短剣。音もなく急所を突く暗殺術の極み。',
        armor: '宵闇の霧を織った柔らかな羽衣。視線を惑わせ致命傷を巧みに逸らす。',
        accessory: '満月の夜露が結晶化した蒼銀の耳飾り。澄んだ意識が会心の好機を見抜く。',
        emblem: '影に生きる者たちが密かに携える三日月紋。神速の連撃を支える。'
      },
      set2: { desc: '会心率 +12%', stat: 'crit', val: 0.12 },
      set4: { desc: '会心ダメージ +28% / 速度 +10', critDmg: 0.28, spd: 10 },
      lore: '夜桜の闇で織られた戦装束。影のように軽やかな歩みから必殺の一撃を放つ。'
    },
    {
      id: 's_abyss', name: '深海の瑠璃装', limited: false, tier: 1.34, sourceText: '瑠璃の深海神殿 / 氷晶の極光凍城',
      partNames: { weapon: '珊瑚の霊杖', armor: '瑠璃の法衣', accessory: '真珠の耳飾', emblem: '深海の紋章' },
      partLores: {
        weapon: '深海珊瑚から削り出された美しい霊杖。癒しの水脈を呼び起こす触媒となる。',
        armor: '瑠璃色の海光が滲む清浄な法衣。水の膜が衝撃を和らげ身を守る。',
        accessory: '深海の最奥で育まれた大粒の真珠飾り。穏やかな生命の波動を絶えず放つ。',
        emblem: '海神殿の巫女が受け継ぐ波紋の印。癒しの術式を戦場全体へ行き渡らせる。'
      },
      set2: { desc: '回復量 +16%', stat: 'healPct', val: 0.16 },
      set4: { desc: '最大HP +20% / 被回復量 +20%', hpPct: 0.20, healRcvPct: 0.20 },
      lore: '深海神殿で祈りを捧げる巫女が用いた瑠璃の装具。生命の水脈を穏やかに巡らせる。'
    },
    {
      id: 's_tide', name: '激流の蒼装', limited: false, tier: 1.38, sourceText: '瑠璃の深海神殿 / 白銀の星刻時計塔',
      partNames: { weapon: '渦潮の双槍', armor: '蒼鱗の軽鎧', accessory: '海流の護符', emblem: '蒼海の紋章' },
      partLores: {
        weapon: '水流を螺旋状に纏う二対の蒼槍。連撃のたびに敵陣全体を押し流す。',
        armor: '海竜の鱗を模した蒼色の軽鎧。高い機動性と耐圧性を両立している。',
        accessory: '止まらぬ潮流の力を封じた瑠璃護符。持久戦でも衰えない体力を与える。',
        emblem: '荒海を渡る探検隊が掲げた潮流紋。範囲技の勢いを飛躍的に押し上げる。'
      },
      set2: { desc: '攻撃力 +14% / 速度 +4', stat: 'atkPct', val: 0.14, extraSpd: 4 },
      set4: { desc: '範囲・全体技の与ダメージ +24%', aoePct: 0.24 },
      lore: '荒波を割る潮流の勢いを封じ込めた戦装具。複数の敵を一挙に押し流す連戦に適している。'
    },
    {
      id: 's_clock', name: '白銀の星刻装', limited: false, tier: 1.44, sourceText: '白銀の星刻時計塔 / 雷鳴の電脳尖塔',
      partNames: { weapon: '時針の光刃', armor: '白金の機甲', accessory: '天球の懐中', emblem: '星刻の紋章' },
      partLores: {
        weapon: '時計塔の長針を模した白金の光刃。刻の加速を乗せた斬撃は防ぐ間も与えない。',
        armor: '精密な歯車機構が組み込まれた白金機甲。衝撃を吸収し反動へ変える。',
        accessory: 'ミニチュアの天球儀が回る懐中時計。持ち主の行動周期を精密に最適化する。',
        emblem: '星刻技師団の誇りである歯車紋章。行動後のゲージ回収を加速させる。'
      },
      set2: { desc: '速度 +12', stat: 'spd', val: 12 },
      set4: { desc: '攻撃力 +18% / 行動時ゲージ回収 +10%', atkPct: 0.18, afterGauge: 10 },
      lore: '白銀の時計塔で製造された精密な機甲武具。刻の律動に同調し圧倒的な回転率を生む。'
    },
    {
      id: 's_verdant', name: '翠玉の樹装', limited: false, tier: 1.50, sourceText: '翠玉の世界樹森域',
      partNames: { weapon: '翠枝の霊弓', armor: '世界樹の衣', accessory: '翡翠の雫石', emblem: '聖樹の紋章' },
      partLores: {
        weapon: '世界樹の若枝から作られたしなやかな霊弓。風の精霊が矢を的確に導く。',
        armor: '光胞子を織り込んだ翠玉の戦衣。自然治癒の力が傷を緩やかに塞ぐ。',
        accessory: '樹冠の朝露が固まった翡翠の雫石。満ち溢れる生命力が体を包む。',
        emblem: '聖森の守護者に授けられる若葉の紋。攻守と癒しの均衡を整える。'
      },
      set2: { desc: '最大HP +18% / 速度 +6', stat: 'hpPct', val: 0.18, extraSpd: 6 },
      set4: { desc: '回復量 +22% / 被ダメージ -12%', healPct: 0.22, dmgCut: 0.12 },
      lore: '翠玉の世界樹森域に息づく生命の結晶で仕立てられた武具。長期戦で比類なき安定感を発揮する。'
    },
    {
      id: 's_sun', name: '黄昏の陽装', limited: false, tier: 1.56, sourceText: '黄昏の太陽砂都',
      partNames: { weapon: '太陽王の曲刀', armor: '黄金砂の鎧', accessory: '紅陽の護輪', emblem: '太陽の紋章' },
      partLores: {
        weapon: '沈まぬ太陽の輝きを宿す黄金の曲刀。振り抜く軌跡に灼熱の残光が燃える。',
        armor: '砂金を鍛え上げた眩い重鎧。太陽光の加護が敵の勢いを跳ね返す。',
        accessory: '紅琥珀が嵌め込まれた王墓の腕輪。烈日のごとき活力を宿す。',
        emblem: '太陽砂都の頂に刻まれた日輪紋。単体・強敵への決定力を引き上げる。'
      },
      set2: { desc: '攻撃力 +18% / 会心率 +6%', stat: 'atkPct', val: 0.18, extraCrit: 0.06 },
      set4: { desc: '与ダメージ +24% / ボスへの与ダメージ +18%', dmgPct: 0.24, bossPct: 0.18 },
      lore: '黄昏の太陽砂都に眠っていた黄金武具。王の威光さながらの苛烈な火力を発揮する。'
    },
    {
      id: 's_frost', name: '氷晶の凍装', limited: false, tier: 1.62, sourceText: '氷晶の極光凍城',
      partNames: { weapon: '極光の氷槍', armor: '白銀の氷鎧', accessory: '氷結晶の首輪', emblem: '極光の紋章' },
      partLores: {
        weapon: '永久凍土の氷核から削り出した透き通る長槍。貫いた相手の動きを瞬時に鈍らせる。',
        armor: 'オーロラの光を反射する硬質の氷鎧。強固な冷気層が衝撃を分散させる。',
        accessory: '六花の形を永遠に保つ氷晶の首飾り。冷静な判断力と強靭な体力をもたらす。',
        emblem: '凍城の騎士団が胸に掲げる氷星紋。鉄壁の守りと反撃の隙を生む。'
      },
      set2: { desc: '防御力 +22% / 最大HP +12%', stat: 'defPct', val: 0.22, extraHp: 0.12 },
      set4: { desc: '被ダメージ -16% / 被回復量 +22%', dmgCut: 0.16, healRcvPct: 0.22 },
      lore: '氷晶の極光凍城で鍛えられた永久氷結の武具。冷徹な堅守で強敵の猛攻を封じる。'
    },
    {
      id: 's_volt', name: '雷鳴の電装', limited: false, tier: 1.68, sourceText: '雷鳴の電脳尖塔',
      partNames: { weapon: '高圧プラズマ刃', armor: '電磁ナノ装甲', accessory: '蓄電コア環', emblem: '天雷の紋章' },
      partLores: {
        weapon: '超高圧のプラズマを刃先へ収束させた電脳剣。電光石火の連撃で敵を切り裂く。',
        armor: '極薄のナノ繊維で織られた電磁装甲。驚異的な軽さと対衝撃性能を誇る。',
        accessory: '尖塔の余剰電力を循環させる蓄電コア。行動エネルギーを高速で充填する。',
        emblem: '電脳尖塔の機動部隊が帯びる稲妻紋。極限の速度と会心の一撃を呼ぶ。'
      },
      set2: { desc: '速度 +15 / 会心率 +8%', stat: 'spd', val: 15, extraCrit: 0.08 },
      set4: { desc: '技威力 +26% / 行動時ゲージ回収 +14%', skillPct: 0.26, afterGauge: 14 },
      lore: '雷鳴の電脳尖塔で開発された最先端の雷装武具。規格外の回転力で戦場を制圧する。'
    },
    {
      id: 's_void', name: '虚無の星雲装', limited: false, tier: 1.74, sourceText: '終焉の星海回廊',
      partNames: { weapon: '零点の虚刃', armor: '星影の外套', accessory: '星雲の結晶', emblem: '虚無の紋章' },
      partLores: {
        weapon: '空間の歪みから削り出された無色の刃。属性を問わずあらゆる防御を切り裂く。',
        armor: '星影を織り込んだ漆黒のロングコート。虚無の層がダメージを静かに飲み込む。',
        accessory: '銀河の塵が凝縮された星雲結晶。果てしない耐久力と魔力を秘める。',
        emblem: '星海回廊の観測者にのみ許された零点紋。攻防一体の異次元の力を授ける。'
      },
      set2: { desc: '攻撃力 +20%', stat: 'atkPct', val: 0.20 },
      set4: { desc: '与ダメージ +24% / 被ダメージ -14%', dmgPct: 0.24, dmgCut: 0.14 },
      lore: '星海回廊の境界から削り出された終焉の装具。攻防の均衡を超えた異次元の力を宿す。'
    },
    {
      id: 's_astral', name: '星海の零装', limited: false, tier: 1.80, sourceText: '終焉の星海回廊',
      partNames: { weapon: '星河の残響剣', armor: '万象の星鎧', accessory: '記憶の星環', emblem: '星海の紋章' },
      partLores: {
        weapon: '無数の異界の記憶が共鳴する星河の剣。振るうたび星屑の斬光が空間を走る。',
        armor: '万象の残響を束ねた白銀と紫紺の星鎧。いかなる異界の法則下でも揺るがない。',
        accessory: '巡り会った異界の星々を繋ぐ光の環。仲間との共鳴を極限まで深める。',
        emblem: '十の異界を踏破した者へ贈られる星海紋。全能力を一段階引き上げる至高の印。'
      },
      set2: { desc: '全基礎ステータス +14%', stat: 'allPct', val: 0.14 },
      set4: { desc: '与ダメージ +28% / 会心ダメ +28% / 速度 +10', dmgPct: 0.28, critDmg: 0.28, spd: 10 },
      lore: '終焉の星海最奥で発見された万象の装具。異界を統べる者にふさわしい輝きを放つ。'
    },

    /* ===== 異界討伐限定クラフト 6シリーズ（属性順：炎→水→風→光→闇→無） ===== */
    {
      id: 's_lim_flame', name: '炎魔の業装', limited: true, el: 'fire', matId: 'mat_flame', matCost: 4, tier: 1.72, sourceText: '限定製作（炎魔の炉心戦）',
      partNames: { weapon: '炎魔の巨剣', armor: '炎魔の紅甲', accessory: '炎魔の核輪', emblem: '炎魔の業紋' },
      partLores: {
        weapon: '炎魔機イグニスの炉核を刀身へ組み込んだ超重量巨剣。強大な単体・ボスを焼き貫く。',
        armor: '紅蓮の炉心を模した耐熱重甲。纏うだけで周囲に烈火の威圧が広がる。',
        accessory: '脈打つ炉核の欠片を収めた紅炎の腕輪。限界を超えた膂力を引き出す。',
        emblem: '炎魔を制した覇者の業火紋。会心の一撃を圧倒的な破壊力へ変える。'
      },
      set2: { desc: '攻撃力 +22%', stat: 'atkPct', val: 0.22 },
      set4: { desc: 'ボスへの与ダメージ +32% / 会心ダメ +28%', bossPct: 0.32, critDmg: 0.28 },
      lore: '炎魔機イグニスの炉核を封じた限定武具。強大な単独ボスを打ち砕くために生まれ落ちた。'
    },
    {
      id: 's_lim_abyss', name: '海皇の蒼装', limited: true, el: 'water', matId: 'mat_abyss', matCost: 4, tier: 1.76, sourceText: '限定製作（深海皇討伐）',
      partNames: { weapon: '海皇の圧壊槍', armor: '海皇の蒼殻鎧', accessory: '海皇の真珠冠', emblem: '海皇の覇紋' },
      partLores: {
        weapon: '深海皇レヴィアの蒼槍を再現した覇槍。深海の凄まじい水圧で敵の守りを砕く。',
        armor: '海皇の外殻を鍛え上げた絶対防壁の蒼鎧。あらゆる属性の猛攻を静かに受け流す。',
        accessory: '深淵の真珠核が煌めく蒼の王冠飾り。桁違いの生命力と再生力を授ける。',
        emblem: '七海の覇者レヴィアを象った波涛紋。鉄壁の耐久と味方守護を極める。'
      },
      set2: { desc: '最大HP +22% / 防御力 +18%', stat: 'hpPct', val: 0.22, extraDef: 0.18 },
      set4: { desc: '被ダメージ -18% / 回復・被回復量 +26%', dmgCut: 0.18, healPct: 0.26, healRcvPct: 0.26 },
      lore: '海皇レヴィアの真珠核から創り上げられた限定重装。深海のごとき不動の守りを与える。'
    },
    {
      id: 's_lim_storm', name: '嵐帝の覇装', limited: true, el: 'wind', matId: 'mat_storm', matCost: 4, tier: 1.80, sourceText: '限定製作（嵐帝の試練）',
      partNames: { weapon: '嵐帝の翼槍', armor: '嵐帝の蒼鎧', accessory: '嵐帝の風環', emblem: '嵐帝の覇紋' },
      partLores: {
        weapon: '嵐帝ヴァルキリアの羽核を穂先へ宿した蒼銀の翼槍。疾風のごとく敵陣を貫通する。',
        armor: '暴風の障壁を常に纏う流線型の蒼鎧。動きを一切妨げず高速戦を支える。',
        accessory: '終わらぬ旋風が巡る蒼穹の風環。開幕から圧倒的な先制権を握る。',
        emblem: '嵐帝の翼を刻んだ覇者の紋章。速度と会心を極限まで研ぎ澄ます。'
      },
      set2: { desc: '速度 +16 / 会心率 +10%', stat: 'spd', val: 16, extraCrit: 0.10 },
      set4: { desc: '与ダメージ +28% / 開幕行動ゲージ +28%', dmgPct: 0.28, startGauge: 28 },
      lore: '嵐帝ヴァルキリアの羽核から鍛え上げた限定覇装。初動から戦場を支配する疾風を纏う。'
    },
    {
      id: 's_lim_clock', name: '星刻の聖装', limited: true, el: 'light', matId: 'mat_clock', matCost: 4, tier: 1.86, sourceText: '限定製作（星刻神機戦）',
      partNames: { weapon: '星刻の裁定杖', armor: '星刻の白金外套', accessory: '星刻の永劫盤', emblem: '星刻の聖紋' },
      partLores: {
        weapon: '星刻神クロノアの白金光脈を凝縮した裁定杖。光の律動で敵を撃ち味方を加速させる。',
        armor: '白金糸と時律回路が織り込まれた聖外套。あらゆる妨害から身を守り抜く。',
        accessory: '永遠に狂わぬ極小の時盤装飾。行動直後に再び時を早め連続行動を促す。',
        emblem: '星刻神の加護を刻む白金天球紋。技の威力と回転率を最高峰へ引き上げる。'
      },
      set2: { desc: '速度 +18 / 技威力 +16%', stat: 'spd', val: 18, extraSkill: 0.16 },
      set4: { desc: '攻撃力 +24% / 行動時ゲージ回収 +18%', atkPct: 0.24, afterGauge: 18 },
      lore: '星刻神クロノアの白金核から造られた神造聖装。戦場の時間の流れを意のままに操る。'
    },
    {
      id: 's_lim_sakura', name: '妖桜の神装', limited: true, el: 'dark', matId: 'mat_sakura', matCost: 4, tier: 1.92, sourceText: '限定製作（妖桜帝討伐）',
      partNames: { weapon: '妖桜の神刀', armor: '妖桜の霊衣', accessory: '妖桜の勾玉', emblem: '妖桜の神紋' },
      partLores: {
        weapon: '妖桜帝クチナワの霊核を鍛え込んだ妖艶なる神刀。花吹雪と共に敵の力を奪い去る。',
        armor: '散らぬ夜桜の花弁を編んだ清浄な霊衣。受ける衝撃を幻想のように霧散させる。',
        accessory: '古の大妖が宿した深紫の勾玉。尽きせぬ霊力と回復効率をもたらす。',
        emblem: '千年の妖桜を象徴する神紋。攻守と癒しのすべてを華麗に高める。'
      },
      set2: { desc: '最大HP +20% / 回復量 +20%', stat: 'hpPct', val: 0.20, extraHeal: 0.20 },
      set4: { desc: '技威力 +26% / 回復効率 +26% / 被ダメージ -15%', skillPct: 0.26, healPct: 0.26, dmgCut: 0.15 },
      lore: '妖桜帝クチナワの霊核を織り込んだ限定神装。揺るがぬ生命力と清浄な霊力で部隊を守り抜く。'
    },
    {
      id: 's_lim_omega', name: '終焉の零装', limited: true, el: 'none', matId: 'mat_omega', matCost: 4, tier: 2.02, sourceText: '限定製作（終焉残響戦）',
      partNames: { weapon: '零皇の断剣', armor: '零皇の星鎧', accessory: '零皇の星環', emblem: '零皇の終紋' },
      partLores: {
        weapon: '終焉残響オメガの零核から再構成された究極の断剣。異界の理ごと敵を断ち切る。',
        armor: '終焉の星光を凝結させた無敵の星鎧。あらゆる災厄から装着者を守護する。',
        accessory: '全異界の残響が収束する零皇の星環。万象の力を一身に宿らせる。',
        emblem: '終焉を制した唯一無二の覇者に与えられる零紋。全性能を至高の領域へ押し上げる。'
      },
      set2: { desc: '全基礎ステータス +18%', stat: 'allPct', val: 0.18 },
      set4: { desc: '与ダメージ +34% / 技威力 +24% / 被ダメージ -16%', dmgPct: 0.34, skillPct: 0.24, dmgCut: 0.16 },
      lore: '終焉残響オメガの零核から再構成された至高の限定装備。全異界の理を掌中に収める象徴。'
    }
  ];

  const SERIES_MAP = {};
  EQUIP_SERIES.forEach((s) => { SERIES_MAP[s.id] = s; });

  /* 図鑑用・全80部位リスト（厳密順：武器→防具→装飾→紋章、同一部位内は通常→限定・階級順） */
  const EQUIP_PARTS = [];
  SLOTS.forEach((sl) => {
    const normals = EQUIP_SERIES.filter((s) => !s.limited);
    const limiteds = EQUIP_SERIES.filter((s) => s.limited);
    normals.concat(limiteds).forEach((ser) => {
      EQUIP_PARTS.push({
        partKey: `${ser.id}:${sl.id}`,
        seriesId: ser.id,
        slotId: sl.id,
        slotOrder: sl.order,
        slotName: sl.name,
        partName: ser.partNames[sl.id],
        partLore: (ser.partLores && ser.partLores[sl.id]) || ser.lore,
        seriesName: ser.name,
        limited: ser.limited,
        tier: ser.tier,
        baseStat: sl.baseStat,
        statLabel: sl.statLabel,
        sourceText: ser.sourceText || (ser.limited ? '限定製作' : '異界探索')
      });
    });
  });

  const PART_MAP = {};
  EQUIP_PARTS.forEach((p) => { PART_MAP[p.partKey] = p; });

  /* 自由アビリティ30種（初期6 / 魂晶交換12 / 試練8 / 深淵の塔4） */
  const FREE_ABILITIES = [
    /* 初期所持6種 */
    { id: 'ab_atk1',    name: '剛力の心得',   desc: '攻撃力 +12%',                 unlockedByDefault: true,  effect: { atkPct: 0.12 } },
    { id: 'ab_hp1',     name: '生命の礎',     desc: '最大HP +14%',                 unlockedByDefault: true,  effect: { hpPct: 0.14 } },
    { id: 'ab_def1',    name: '鉄壁の構え',   desc: '防御力 +16%',                 unlockedByDefault: true,  effect: { defPct: 0.16 } },
    { id: 'ab_spd1',    name: '迅脚の歩法',   desc: '速度 +8',                     unlockedByDefault: true,  effect: { spd: 8 } },
    { id: 'ab_crit1',   name: '急所見切り',   desc: '会心率 +10%',                 unlockedByDefault: true,  effect: { crit: 0.10 } },
    { id: 'ab_heal1',   name: '慈愛の祈り',   desc: '回復量 +14%',                 unlockedByDefault: true,  effect: { healPct: 0.14 } },

    /* 魂晶交換12種 */
    { id: 'ab_atk2',    name: '覇道の刃',     desc: '攻撃力 +20%',                 costSoul: 120, effect: { atkPct: 0.20 } },
    { id: 'ab_hp2',     name: '不屈の生命脈', desc: '最大HP +24%',                 costSoul: 120, effect: { hpPct: 0.24 } },
    { id: 'ab_def2',    name: '金剛の城壁',   desc: '防御力 +26% / 被ダメージ -8%', costSoul: 140, effect: { defPct: 0.26, dmgCut: 0.08 } },
    { id: 'ab_spd2',    name: '神速の残像',   desc: '速度 +14 / 開幕ゲージ +12%',  costSoul: 160, effect: { spd: 14, startGauge: 12 } },
    { id: 'ab_crit2',   name: '必殺の極意',   desc: '会心率 +14% / 会心ダメ +25%', costSoul: 180, effect: { crit: 0.14, critDmg: 0.25 } },
    { id: 'ab_skill2',  name: '奥義共鳴',     desc: '全技威力 +20%',               costSoul: 180, effect: { skillPct: 0.20 } },
    { id: 'ab_boss',    name: '巨敵討ち',     desc: 'ボス・乱入への与ダメージ +24%', costSoul: 160, effect: { bossPct: 0.24 } },
    { id: 'ab_aoe',     name: '戦場掃討',     desc: '範囲・全体技の与ダメージ +22%', costSoul: 160, effect: { aoePct: 0.22 } },
    { id: 'ab_drain',   name: '紅の吸収刃',   desc: '与ダメージの10%をHP吸収',      costSoul: 180, effect: { lifesteal: 0.10 } },
    { id: 'ab_gauge',   name: '連撃の呼吸',   desc: '行動後ゲージ回収 +14%',       costSoul: 200, effect: { afterGauge: 14 } },
    { id: 'ab_guard',   name: '守護者の誓い', desc: '被ダメージ -14% / 被回復 +15%', costSoul: 180, effect: { dmgCut: 0.14, healRcvPct: 0.15 } },
    { id: 'ab_heal2',   name: '聖泉の祝福',   desc: '回復量 +24% / 速度 +6',       costSoul: 160, effect: { healPct: 0.24, spd: 6 } },

    /* 試練の狭間 報酬8種 */
    { id: 'ab_fire_master',  name: '紅蓮の極み',   desc: '攻撃力 +22% / 会心ダメ +18%',  source: 'trial', effect: { atkPct: 0.22, critDmg: 0.18 } },
    { id: 'ab_water_master', name: '蒼海の極み',   desc: '最大HP +22% / 回復量 +20%',    source: 'trial', effect: { hpPct: 0.22, healPct: 0.20 } },
    { id: 'ab_wind_master',  name: '翠風の極み',   desc: '速度 +16 / 与ダメージ +12%',   source: 'trial', effect: { spd: 16, dmgPct: 0.12 } },
    { id: 'ab_ld_master',    name: '光闇調和',     desc: '全技威力 +24% / 会心率 +10%',  source: 'trial', effect: { skillPct: 0.24, crit: 0.10 } },
    { id: 'ab_none_master',  name: '無垢なる覇気', desc: '全基礎ステータス +16%',         source: 'trial', effect: { allPct: 0.16 } },
    { id: 'ab_iron_wall',    name: '鉄壁と癒し',   desc: '防御力 +24% / 被回復量 +24%',   source: 'trial', effect: { defPct: 0.24, healRcvPct: 0.24 } },
    { id: 'ab_underdog',     name: '下剋上の魂',   desc: '与ダメージ +20% / 被ダメージ -10%', source: 'trial', effect: { dmgPct: 0.20, dmgCut: 0.10 } },
    { id: 'ab_trio_pride',   name: '三傑の誇り',   desc: '全基礎ステータス +18% / 速度 +10', source: 'trial', effect: { allPct: 0.18, spd: 10 } },

    /* 深淵の塔100F 節目報酬4種 */
    { id: 'ab_tower_10', name: '深淵踏破の証', desc: '攻撃力 +18% / 最大HP +18%',        source: 'tower', effect: { atkPct: 0.18, hpPct: 0.18 } },
    { id: 'ab_tower_40', name: '深淵覇者の印', desc: '与ダメージ +24% / 速度 +10',       source: 'tower', effect: { dmgPct: 0.24, spd: 10 } },
    { id: 'ab_tower_65', name: '星淵の極意',   desc: '会心率 +16% / 会心ダメ +30%',      source: 'tower', effect: { crit: 0.16, critDmg: 0.30 } },
    { id: 'ab_tower_90', name: '奈落制覇の魂', desc: '全基礎ステータス +22% / 被ダメージ -12%', source: 'tower', effect: { allPct: 0.22, dmgCut: 0.12 } }
  ];

  const ABILITY_MAP = {};
  FREE_ABILITIES.forEach((a) => { ABILITY_MAP[a.id] = a; });
  /* 旧セーブ互換エイリアス */
  ABILITY_MAP.ab_tower_5 = ABILITY_MAP.ab_tower_10;
  ABILITY_MAP.ab_tower_15 = ABILITY_MAP.ab_tower_40;

  /* 3軸編成シナジー計算（①属性軸 ②ロール軸 ③出身異界軸・全10異界対応） */
  function computePartySynergies(chars) {
    const valid = chars.filter(Boolean);
    const active = [];
    const totals = { hpPct: 0, atkPct: 0, defPct: 0, spd: 0, crit: 0, healPct: 0, dmgPct: 0, dmgCut: 0 };
    if (valid.length < 2) return { active, totals };

    /* ① 属性軸 */
    const elCounts = {};
    valid.forEach((c) => { elCounts[c.el] = (elCounts[c.el] || 0) + 1; });
    const uniqueEls = Object.keys(elCounts).length;
    const maxEl = Math.max(...Object.values(elCounts));
    if (maxEl >= 4) {
      active.push({ axis: '属性', name: '純属極鳴(4)', desc: '攻撃+24% / 与ダメージ+15%' });
      totals.atkPct += 0.24;
      totals.dmgPct += 0.15;
    } else if (maxEl >= 3) {
      active.push({ axis: '属性', name: '三属共鳴(3)', desc: '攻撃+16% / 会心+8%' });
      totals.atkPct += 0.16;
      totals.crit += 0.08;
    } else if (maxEl >= 2) {
      active.push({ axis: '属性', name: '二属同調(2)', desc: '攻撃+10%' });
      totals.atkPct += 0.10;
    }
    if (uniqueEls >= 4) {
      active.push({ axis: '属性', name: '四彩調和', desc: '全基礎+12% / 速度+6' });
      totals.hpPct += 0.12;
      totals.atkPct += 0.12;
      totals.defPct += 0.12;
      totals.spd += 6;
    }

    /* ② ロール軸 */
    const roleCounts = {};
    valid.forEach((c) => { roleCounts[c.role] = (roleCounts[c.role] || 0) + 1; });
    if (roleCounts.tank && roleCounts.dealer && roleCounts.support && roleCounts.healer) {
      active.push({ axis: 'ロール', name: '黄金均衡部隊', desc: 'HP+16% / 防御+16% / 回復+14%' });
      totals.hpPct += 0.16;
      totals.defPct += 0.16;
      totals.healPct += 0.14;
    } else if ((roleCounts.dealer || 0) >= 3) {
      active.push({ axis: 'ロール', name: '猛攻特化陣', desc: '攻撃+18% / 会心+10%' });
      totals.atkPct += 0.18;
      totals.crit += 0.10;
    } else if ((roleCounts.tank || 0) >= 1 && (roleCounts.healer || 0) >= 1) {
      active.push({ axis: 'ロール', name: '堅守再生隊', desc: '最大HP+12% / 被ダメージ-8%' });
      totals.hpPct += 0.12;
      totals.dmgCut += 0.08;
    }

    /* ③ 出身異界軸 */
    const wCounts = {};
    valid.forEach((c) => { wCounts[c.world] = (wCounts[c.world] || 0) + 1; });
    const maxW = Math.max(...Object.values(wCounts));
    if (maxW >= 3) {
      active.push({ axis: '異界', name: '同郷の絆(3+)', desc: '全基礎+14% / 速度+8' });
      totals.hpPct += 0.14;
      totals.atkPct += 0.14;
      totals.defPct += 0.14;
      totals.spd += 8;
    } else if (maxW >= 2) {
      active.push({ axis: '異界', name: '同郷の縁(2)', desc: 'HP+8% / 攻撃+8%' });
      totals.hpPct += 0.08;
      totals.atkPct += 0.08;
    }

    return { active, totals };
  }

  Object.defineProperty(window, '__IZ_EQUIP__', {
    value: Object.freeze({
      QUALITIES,
      SLOTS,
      SLOT_MAP,
      EQUIP_SERIES,
      SERIES_MAP,
      EQUIP_PARTS,
      PART_MAP,
      FREE_ABILITIES,
      ABILITY_MAP,
      computePartySynergies
    }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
