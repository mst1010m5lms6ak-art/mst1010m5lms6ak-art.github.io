(function () {
  'use strict';

  const Hacha = window.Hacha;

  /*
   * 全24キャラクター（6属性 × 4ロール完全網羅）
   * - 2種族持ちは canonical 順 (人間→竜→神→魔物→妖精→獣→機械)
   * - 基本技3種、一部(8体)は技2種＋固有パッシブ1種
   * - 全員に省略されない自然な4〜7文字の名前・読み仮名・固有紹介文
   */
  const CHARACTERS = [
    /* ==================== 炎属性 (4体) ==================== */
    {
      id: 'c_fire_tank', name: 'カグラ鉄心', kana: 'かぐらてっしん', icon: '🚒',
      element: 'fire', races: ['human', 'machine'], role: 'tank',
      base: { hp: 1620, atk: 195, def: 172, spd: 96, crit: 0.08 },
      unlockDesc: '初期加入',
      desc: '江戸の火消し纏と蒸気駆動装甲を合体させた熱血防災サイボーグ。どんな異界の火災も気合と高圧放水でねじ伏せる。',
      skills: [
        { name: '蒸気纏打ち', scope: 'single', cd: 0, mult: 1.05, status: { id: 'burn', chance: 0.45, turns: 2 }, desc: '単体攻撃＋火傷付与' },
        { name: '熱血火消し陣', scope: 'self', cd: 2, mult: 0, selfBuff: [{ id: 'taunt', turns: 2 }, { id: 'def_up', turns: 2 }], shieldPct: 0.22, desc: '自身へ挑発・防御上昇・障壁展開' },
        { name: '紅蓮ボイラー爆', scope: 'all', cd: 3, mult: 1.15, defScale: 0.55, status: { id: 'atk_down', chance: 0.65, turns: 2 }, desc: '全体防御依存攻撃＋攻撃低下' }
      ]
    },
    {
      id: 'c_fire_dealer', name: 'イグニス丸', kana: 'いぐにすまる', icon: '🐲',
      element: 'fire', races: ['dragon'], role: 'dealer',
      base: { hp: 1180, atk: 305, def: 110, spd: 118, crit: 0.16 },
      unlockDesc: 'エリア1-5クリアで加入',
      desc: '古代火竜の末裔だが趣味はたこ焼き屋台。強火のブレスで外はカリッと中はトロトロに敵陣ごと焼き上げる。',
      skills: [
        { name: '強火ブレス弾', scope: 'single', cd: 0, mult: 1.18, status: { id: 'burn', chance: 0.50, turns: 2 }, desc: '単体強攻撃＋火傷付与' },
        { name: '鉄板竜巻焼き', scope: 'area', cd: 2, mult: 1.48, status: { id: 'burn', chance: 0.65, turns: 2 }, desc: '敵2体へ範囲火炎＋火傷' },
        { name: '業火の竜王連撃', scope: 'all', cd: 3, mult: 1.72, bonusVsStatus: 'burn', desc: '全体灼熱攻撃（火傷中の敵へ威力増）' }
      ]
    },
    {
      id: 'c_fire_supporter', name: 'ヒノエ巫女', kana: 'ひのえみこ', icon: '🏮',
      element: 'fire', races: ['god', 'fairy'], role: 'supporter',
      base: { hp: 1240, atk: 215, def: 126, spd: 126, crit: 0.10 },
      unlockDesc: 'エリア1-10クリアで加入',
      desc: '神社とネオン商店街の境界を守る陽気な灯火の精霊神。祭囃子を鳴らすだけで味方の戦意が沸騰する。',
      skills: [
        { name: '提灯スパーク', scope: 'single', cd: 0, mult: 1.0, status: { id: 'def_down', chance: 0.55, turns: 2 }, desc: '単体攻撃＋防御低下' },
        { name: '祭囃子ブースト', scope: 'ally_all', cd: 2, mult: 0, allyBuff: [{ id: 'atk_up', turns: 2 }, { id: 'crit_up', turns: 2 }], chainAdd: 14, desc: '味方全体へ攻撃・会心上昇＋共鳴増加' },
        { name: '常世の篝火', scope: 'passive', passive: { partyAtkPct: 0.12, chainGain: 0.18 }, desc: '常時：味方全体の攻撃+12%・共鳴蓄積+18%' }
      ]
    },
    {
      id: 'c_fire_healer', name: 'ポカポカ鍋姫', kana: 'ぽかぽかなべひめ', icon: '🍲',
      element: 'fire', races: ['monster', 'beast'], role: 'healer',
      base: { hp: 1350, atk: 220, def: 134, spd: 108, crit: 0.08 },
      unlockDesc: '乱入敵を2回撃破で加入',
      desc: '魔界の大鍋を背負うもふもふの料理魔獣。具だくさん特製スープは傷も凍傷も一瞬で吹き飛ばす絶品。',
      skills: [
        { name: 'お玉アタック', scope: 'single', cd: 0, mult: 0.95, status: { id: 'atk_down', chance: 0.40, turns: 2 }, desc: '単体攻撃＋攻撃低下' },
        { name: '特製具沢山スープ', scope: 'ally_area', cd: 2, healMult: 1.45, allyBuff: [{ id: 'regen', turns: 2 }], desc: '味方2体を回復＋継続回復' },
        { name: '満腹大宴会鍋', scope: 'ally_all', cd: 3, healMult: 1.65, cleanse: 1, allyBuff: [{ id: 'atk_up', turns: 2 }], desc: '味方全体回復＋異常解除＋攻撃上昇' }
      ]
    },

    /* ==================== 水属性 (4体) ==================== */
    {
      id: 'c_water_tank', name: 'セイリュウ丸', kana: 'せいりゅうまる', icon: '🦈',
      element: 'water', races: ['dragon', 'machine'], role: 'tank',
      base: { hp: 1680, atk: 188, def: 180, spd: 94, crit: 0.08 },
      unlockDesc: 'エリア2-5クリアで加入',
      desc: '深海潜水艦と蒼竜の魂が融合した鋼鉄の海守。水圧バリヤーで仲間の前面を静かに覆い尽くす。',
      skills: [
        { name: '水圧ラム突撃', scope: 'single', cd: 0, mult: 1.02, status: { id: 'spd_down', chance: 0.50, turns: 2 }, desc: '単体攻撃＋速度低下' },
        { name: '深海潜航シールド', scope: 'ally_all', cd: 2, mult: 0, shieldPct: 0.16, selfBuff: [{ id: 'taunt', turns: 2 }], desc: '味方全体へ障壁＋自身へ挑発' },
        { name: '重水装甲機構', scope: 'passive', passive: { defPct: 0.22, dmgTakenRed: 0.12 }, desc: '常時：自身の防御+22%・被ダメージ-12%' }
      ]
    },
    {
      id: 'c_water_dealer', name: 'ミナト斬流', kana: 'みなとざんりゅう', icon: '🌊',
      element: 'water', races: ['human'], role: 'dealer',
      base: { hp: 1140, atk: 292, def: 114, spd: 124, crit: 0.17 },
      unlockDesc: '初期加入',
      desc: 'サーフボードに日本刀を括り付けた現代の波乗り剣士。どんな荒波も異界の弾幕も涼しい顔で切り裂く。',
      skills: [
        { name: '波切りの太刀', scope: 'single', cd: 0, mult: 1.15, desc: '素早い単体水斬撃' },
        { name: '双波スラッシュ', scope: 'area', cd: 2, mult: 1.44, status: { id: 'def_down', chance: 0.55, turns: 2 }, desc: '敵2体へ範囲斬撃＋防御低下' },
        { name: '蒼海一閃・極波', scope: 'single', cd: 3, mult: 2.35, status: { id: 'freeze', chance: 0.45, turns: 1 }, desc: '超威力単体奥義＋凍結付与' }
      ]
    },
    {
      id: 'c_water_supporter', name: 'ミズチ姫子', kana: 'みずちひめこ', icon: '🫧',
      element: 'water', races: ['fairy'], role: 'supporter',
      base: { hp: 1200, atk: 210, def: 128, spd: 129, crit: 0.10 },
      unlockDesc: 'エリア2-10クリアで加入',
      desc: 'コインランドリーの泡から生まれた綺麗好きの水精霊。敵の強化も汚れもまるごと洗い流してしまう。',
      skills: [
        { name: 'シャボン弾', scope: 'single', cd: 0, mult: 0.98, status: { id: 'spd_down', chance: 0.50, turns: 2 }, desc: '単体攻撃＋速度低下' },
        { name: '泡沫リズム波', scope: 'ally_all', cd: 2, mult: 0, allyBuff: [{ id: 'spd_up', turns: 2 }, { id: 'def_up', turns: 2 }], desc: '味方全体へ速度・防御上昇' },
        { name: '氷結デトックス渦', scope: 'all', cd: 3, mult: 1.25, status: { id: 'freeze', chance: 0.42, turns: 1 }, desc: '全体冷気攻撃＋凍結付与' }
      ]
    },
    {
      id: 'c_water_healer', name: 'アザラシ博士', kana: 'あざらしはかせ', icon: '🦭',
      element: 'water', races: ['beast', 'machine'], role: 'healer',
      base: { hp: 1380, atk: 216, def: 142, spd: 106, crit: 0.08 },
      unlockDesc: '無限塔5階到達で加入',
      desc: '白衣と医療ドローンを操る極地出身の天才海獣医。氷点下でも凍らない特製点滴で部隊を支える。',
      skills: [
        { name: '冷却カプセル投擲', scope: 'single', cd: 0, mult: 0.96, status: { id: 'vuln', chance: 0.45, turns: 2 }, desc: '単体攻撃＋被ダメ増加' },
        { name: 'ナノミスト処置', scope: 'ally_single', cd: 2, healMult: 2.15, shieldPct: 0.16, cleanse: 1, desc: '味方単体を大回復＋障壁＋異常解除' },
        { name: '極地自動救護網', scope: 'passive', passive: { healPower: 0.24, turnPartyHeal: 0.05 }, desc: '常時：与回復量+24%・行動終了時に味方全体5%回復' }
      ]
    },

    /* ==================== 風属性 (4体) ==================== */
    {
      id: 'c_wind_tank', name: 'フウジン狸', kana: 'ふうじんたぬき', icon: '🍃',
      element: 'wind', races: ['monster', 'beast'], role: 'tank',
      base: { hp: 1560, atk: 205, def: 162, spd: 112, crit: 0.10 },
      unlockDesc: 'エリア3-5クリアで加入',
      desc: '大きな葉っぱ傘で台風ごと弾き返す古狸の親分。飄々とした態度で敵の猛攻を柳のように受け流す。',
      skills: [
        { name: '大葉っぱ払い', scope: 'area', cd: 0, mult: 0.85, status: { id: 'atk_down', chance: 0.40, turns: 2 }, desc: '敵2体へ範囲攻撃＋攻撃低下' },
        { name: '風袋の大見得', scope: 'self', cd: 2, mult: 0, selfBuff: [{ id: 'taunt', turns: 2 }, { id: 'spd_up', turns: 2 }, { id: 'def_up', turns: 2 }], desc: '自身へ挑発・速度・防御上昇' },
        { name: '化かし大旋風', scope: 'all', cd: 3, mult: 1.20, status: { id: 'silence', chance: 0.45, turns: 1 }, desc: '全体旋風攻撃＋沈黙付与' }
      ]
    },
    {
      id: 'c_wind_dealer', name: 'ハヤテ羽衣', kana: 'はやてはごろも', icon: '🪶',
      element: 'wind', races: ['human', 'fairy'], role: 'dealer',
      base: { hp: 1090, atk: 288, def: 104, spd: 138, crit: 0.20 },
      unlockDesc: 'エリア3-10クリアで加入',
      desc: '空飛ぶ宅配便の配達記録保持者にして天女の血を引く疾風ランナー。荷物も斬撃も注文より先に届く。',
      skills: [
        { name: '音速フェザー斬', scope: 'single', cd: 0, mult: 1.12, selfCtAdd: 120, desc: '単体高速斬撃＋自身の行動ゲージ加速' },
        { name: '旋風三連配達', scope: 'area', cd: 2, mult: 1.54, desc: '敵2体へ高会心の範囲連撃' },
        { name: '神速の追い風', scope: 'passive', passive: { spdPct: 0.22, critFlat: 0.14 }, desc: '常時：自身の速度+22%・会心率+14%' }
      ]
    },
    {
      id: 'c_wind_supporter', name: 'シルフ音頭', kana: 'しるふおんど', icon: '🎺',
      element: 'wind', races: ['fairy'], role: 'supporter',
      base: { hp: 1180, atk: 208, def: 120, spd: 134, crit: 0.11 },
      unlockDesc: '初期加入',
      desc: 'マーチングバンドの指揮杖を振り回す風の小妖精。軽快なリズムに乗った仲間は驚くほど手数が増える。',
      skills: [
        { name: 'そよ風フルート', scope: 'single', cd: 0, mult: 0.96, status: { id: 'vuln', chance: 0.45, turns: 2 }, desc: '単体攻撃＋被ダメ増加' },
        { name: '追い風マーチ', scope: 'ally_all', cd: 2, mult: 0, allyBuff: [{ id: 'spd_up', turns: 2 }, { id: 'atk_up', turns: 2 }], allyCtAdd: 120, desc: '味方全体へ速度・攻撃上昇＋行動ゲージ加速' },
        { name: '蒼穹ファンファーレ', scope: 'all', cd: 3, mult: 1.24, status: { id: 'spd_down', chance: 0.65, turns: 2 }, chainAdd: 18, desc: '全体衝撃波＋敵速度低下＋共鳴大幅増' }
      ]
    },
    {
      id: 'c_wind_healer', name: 'スズメ神楽', kana: 'すずめかぐら', icon: '🕊️',
      element: 'wind', races: ['god', 'beast'], role: 'healer',
      base: { hp: 1310, atk: 218, def: 130, spd: 122, crit: 0.09 },
      unlockDesc: '異界大ボスを1種撃破で加入',
      desc: '天空の茶屋を営む雀の風神。淹れたての薬草茶を強風で直送し、戦場じゅうの傷を爽やかに癒やす。',
      skills: [
        { name: '茶葉カッター', scope: 'single', cd: 0, mult: 0.98, status: { id: 'atk_down', chance: 0.45, turns: 2 }, desc: '単体攻撃＋攻撃低下' },
        { name: '薫風の癒し風', scope: 'ally_all', cd: 2, healMult: 1.28, allyBuff: [{ id: 'spd_up', turns: 2 }], desc: '味方全体回復＋速度上昇' },
        { name: '天翔ける薬香陣', scope: 'ally_all', cd: 3, healMult: 1.72, cleanse: 2, allyBuff: [{ id: 'regen', turns: 2 }], desc: '味方全体大回復＋異常2解除＋継続回復' }
      ]
    },

    /* ==================== 光属性 (4体) ==================== */
    {
      id: 'c_light_tank', name: 'ソラリス騎士', kana: 'そらりすきし', icon: '☀️',
      element: 'light', races: ['human', 'god'], role: 'tank',
      base: { hp: 1650, atk: 202, def: 176, spd: 102, crit: 0.10 },
      unlockDesc: 'エリア4-5クリアで加入',
      desc: '太陽電池パネルを大盾に改造した聖騎士。眩しすぎる反射光で敵の視線も必殺技も全部引き受ける。',
      skills: [
        { name: '閃光シールド打', scope: 'single', cd: 0, mult: 1.04, status: { id: 'stun', chance: 0.28, turns: 1 }, desc: '単体攻撃＋確率気絶' },
        { name: 'ソーラーイージス', scope: 'ally_all', cd: 2, mult: 0, shieldPct: 0.18, selfBuff: [{ id: 'taunt', turns: 2 }, { id: 'def_up', turns: 2 }], desc: '味方全体へ強障壁＋自身へ挑発・防御上昇' },
        { name: '暁光の審判壁', scope: 'all', cd: 3, mult: 1.22, defScale: 0.50, allyBuff: [{ id: 'def_up', turns: 2 }], desc: '全体光撃＋味方全体へ防御上昇' }
      ]
    },
    {
      id: 'c_light_dealer', name: 'ルミナ竜騎', kana: 'るみなりゅうき', icon: '⚡',
      element: 'light', races: ['dragon', 'god'], role: 'dealer',
      base: { hp: 1220, atk: 312, def: 122, spd: 121, crit: 0.18 },
      unlockDesc: 'エリア4-10クリアで加入',
      desc: '光速で配達と討伐を両立する天界の光竜騎士。黄金の槍が振るわれるたび虹色の閃光が戦場を貫く。',
      skills: [
        { name: '輝槍突き', scope: 'single', cd: 0, mult: 1.18, desc: '鋭い単体聖光攻撃' },
        { name: 'プリズム連槍', scope: 'area', cd: 2, mult: 1.56, status: { id: 'vuln', chance: 0.60, turns: 2 }, desc: '敵2体へ範囲聖槍＋被ダメ増加' },
        { name: '星界ドラグーン砲', scope: 'all', cd: 3, mult: 1.84, defPen: 0.25, desc: '防御一部貫通の全体光竜奥義' }
      ]
    },
    {
      id: 'c_light_supporter', name: 'アカリ電脳嬢', kana: 'あかりでんのうじょう', icon: '💡',
      element: 'light', races: ['machine'], role: 'supporter',
      base: { hp: 1230, atk: 214, def: 132, spd: 128, crit: 0.11 },
      unlockDesc: '縛り試練を1種クリアで加入',
      desc: '未来の交通整理AIが魔法回路を積んで自我を得た案内嬢。青信号を出すだけで味方の攻撃が全部急所に刺さる。',
      skills: [
        { name: '誘導レーザー', scope: 'single', cd: 0, mult: 1.0, status: { id: 'def_down', chance: 0.55, turns: 2 }, desc: '単体照射＋防御低下' },
        { name: '青信号オールグリーン', scope: 'ally_all', cd: 2, mult: 0, allyBuff: [{ id: 'crit_up', turns: 2 }, { id: 'spd_up', turns: 2 }], chainAdd: 16, desc: '味方全体へ会心・速度上昇＋共鳴増加' },
        { name: '最適航路演算', scope: 'passive', passive: { partyCritFlat: 0.14, partyWeakBonus: 0.18 }, desc: '常時：味方全体の会心率+14%・弱点威力+18%' }
      ]
    },
    {
      id: 'c_light_healer', name: 'ヒカリ天使長', kana: 'ひかりてんしちょう', icon: '👼',
      element: 'light', races: ['god'], role: 'healer',
      base: { hp: 1320, atk: 224, def: 134, spd: 114, crit: 0.09 },
      unlockDesc: '初期加入',
      desc: '保健室の先生も兼任するおっとり系の大天使。絆創膏と聖光魔法を組み合わせた手当ては驚異の治癒力。',
      skills: [
        { name: '聖光ショット', scope: 'single', cd: 0, mult: 0.98, desc: '単体へ清らかな光の弾' },
        { name: '保健室の光の処置', scope: 'ally_single', cd: 2, healMult: 2.05, allyBuff: [{ id: 'def_up', turns: 2 }], desc: '味方単体を大回復＋防御上昇' },
        { name: '天界の慈愛光輪', scope: 'ally_all', cd: 3, healMult: 1.58, shieldPct: 0.14, cleanse: 1, desc: '味方全体回復＋障壁＋異常解除' }
      ]
    },

    /* ==================== 闇属性 (4体) ==================== */
    {
      id: 'c_dark_tank', name: 'クロガネ魔王', kana: 'くろがねまおう', icon: '😈',
      element: 'dark', races: ['monster'], role: 'tank',
      base: { hp: 1700, atk: 212, def: 168, spd: 95, crit: 0.10 },
      unlockDesc: 'エリア5-5クリアで加入',
      desc: '商店街の自治会長を務める貫禄たっぷりの魔界大王。悪目立ちする巨体で敵のヘイトを一身に集め、呪いの鎧でやり返す。',
      skills: [
        { name: '魔王の鉄拳', scope: 'single', cd: 0, mult: 1.06, status: { id: 'poison', chance: 0.50, turns: 2 }, desc: '単体打撃＋毒付与' },
        { name: '宵闇マント展開', scope: 'self', cd: 2, mult: 0, selfBuff: [{ id: 'taunt', turns: 2 }, { id: 'regen', turns: 2 }], shieldPct: 0.24, desc: '自身へ挑発・継続回復・厚い障壁' },
        { name: '魔界の威圧波動', scope: 'all', cd: 3, mult: 1.24, status: { id: 'atk_down', chance: 0.70, turns: 2 }, desc: '全体暗黒波＋攻撃低下' }
      ]
    },
    {
      id: 'c_dark_dealer', name: 'ヨゾラ猫又', kana: 'よぞらねこまた', icon: '🐈‍⬛',
      element: 'dark', races: ['monster', 'beast'], role: 'dealer',
      base: { hp: 1120, atk: 304, def: 106, spd: 132, crit: 0.21 },
      unlockDesc: '初期加入',
      desc: '深夜のコンビニ屋根を縄張りにする二尾の怪盗猫又。音もなく忍び寄り、毒と会心の爪で標的を仕留める。',
      skills: [
        { name: '月影ネイル', scope: 'single', cd: 0, mult: 1.16, status: { id: 'poison', chance: 0.48, turns: 2 }, desc: '単体爪撃＋毒付与' },
        { name: '二尾の闇乱舞', scope: 'area', cd: 2, mult: 1.54, status: { id: 'vuln', chance: 0.55, turns: 2 }, desc: '敵2体へ連続斬撃＋被ダメ増加' },
        { name: '真夜中ファントム爪', scope: 'single', cd: 3, mult: 2.48, bonusVsStatus: 'poison', desc: '単体超威力必殺（毒中の敵へさらに増大）' }
      ]
    },
    {
      id: 'c_dark_supporter', name: 'ノクス伯爵', kana: 'のくすはくしゃく', icon: '🦇',
      element: 'dark', races: ['dragon', 'monster'], role: 'supporter',
      base: { hp: 1260, atk: 226, def: 128, spd: 124, crit: 0.12 },
      unlockDesc: 'エリア5-10クリアで加入',
      desc: '古びた洋館でボードゲーム会を開く竜魔の貴族。敵陣の足並みを崩し、デバフの罠で盤面を完全に支配する。',
      skills: [
        { name: 'ナイトメア札', scope: 'single', cd: 0, mult: 1.02, status: { id: 'poison', chance: 0.55, turns: 2 }, desc: '単体呪撃＋毒付与' },
        { name: '深淵の呪詛盤', scope: 'all', cd: 2, mult: 1.05, status: { id: 'def_down', chance: 0.72, turns: 2 }, status2: { id: 'vuln', chance: 0.55, turns: 2 }, desc: '敵全体へ防御低下＆被ダメ増加' },
        { name: '黒竜の策謀眼', scope: 'passive', passive: { debuffedDmgBonus: 0.16, partyAtkPct: 0.10 }, desc: '常時：味方全体の攻撃+10%・弱体中の敵への火力上昇' }
      ]
    },
    {
      id: 'c_dark_healer', name: 'ツクヨミ栞', kana: 'つくよみしおり', icon: '🌙',
      element: 'dark', races: ['human', 'fairy'], role: 'healer',
      base: { hp: 1300, atk: 228, def: 126, spd: 118, crit: 0.10 },
      unlockDesc: '乱入敵を5回撃破で加入',
      desc: '古書店の奥で月光のしおりを編む神秘的な司書。敵から奪った活力をそのまま味方の傷へ移し替える。',
      skills: [
        { name: '月読の吸収波', scope: 'single', cd: 0, mult: 1.08, drainPartyHeal: 0.35, desc: '単体攻撃＋与ダメの一部で味方最小HPを回復' },
        { name: '星夜の静養歌', scope: 'ally_all', cd: 2, healMult: 1.32, allyBuff: [{ id: 'regen', turns: 2 }], desc: '味方全体回復＋継続回復付与' },
        { name: '月影リバイバル', scope: 'ally_all', cd: 3, healMult: 1.76, cleanse: 1, allyBuff: [{ id: 'crit_up', turns: 2 }], desc: '味方全体大回復＋異常解除＋会心上昇' }
      ]
    },

    /* ==================== 無属性 (4体) ==================== */
    {
      id: 'c_none_tank', name: 'ガチャンコ号', kana: 'がちゃんこごう', icon: '🤖',
      element: 'none', races: ['machine'], role: 'tank',
      base: { hp: 1720, atk: 192, def: 184, spd: 92, crit: 0.08 },
      unlockDesc: '初期加入',
      desc: '自販機と工作機械と騎士鎧を溶接して誕生した無敵の汎用ガードロボ。弱点属性を持たず、どの戦場でも頼れる壁。',
      skills: [
        { name: '鋼鉄バンパー', scope: 'single', cd: 0, mult: 1.04, status: { id: 'stun', chance: 0.25, turns: 1 }, desc: '単体体当たり＋確率気絶' },
        { name: '全自動バリア展開', scope: 'ally_all', cd: 2, mult: 0, shieldPct: 0.17, selfBuff: [{ id: 'taunt', turns: 2 }], desc: '味方全体へ障壁＋自身へ挑発' },
        { name: '超硬質合金ボディ', scope: 'passive', passive: { hpPct: 0.18, defPct: 0.18 }, desc: '常時：自身の最大HP+18%・防御力+18%' }
      ]
    },
    {
      id: 'c_none_dealer', name: 'ムサシ犬神', kana: 'むさしいぬがみ', icon: '🐺',
      element: 'none', races: ['god', 'beast'], role: 'dealer',
      base: { hp: 1200, atk: 310, def: 118, spd: 126, crit: 0.19 },
      unlockDesc: '無限塔10階到達で加入',
      desc: '二本の竹刀と神剣を振るう誇り高き剣豪狼神。属性に縛られぬ無心の太刀筋はどんな異界法則も真っ二つにする。',
      skills: [
        { name: '無心の双剣', scope: 'single', cd: 0, mult: 1.22, desc: '属性相性に左右されない強力単体斬撃' },
        { name: '狼牙クロス斬', scope: 'area', cd: 2, mult: 1.62, defPen: 0.20, desc: '防御一部貫通の範囲二連撃' },
        { name: '天狼一刀両断', scope: 'single', cd: 3, mult: 2.55, defPen: 0.30, desc: '単体極大奥義（防御30%貫通）' }
      ]
    },
    {
      id: 'c_none_supporter', name: 'クロック博士', kana: 'くろっくはかせ', icon: '🕰️',
      element: 'none', races: ['human', 'machine'], role: 'supporter',
      base: { hp: 1250, atk: 215, def: 135, spd: 132, crit: 0.11 },
      unlockDesc: '異界大ボスを3種撃破で加入',
      desc: '懐中時計で時間の流れをちょっぴり早送りする陽気な発明家。味方の行動順を自由自在に操り戦闘の主導権を握る。',
      skills: [
        { name: '歯車スロー', scope: 'single', cd: 0, mult: 1.0, status: { id: 'spd_down', chance: 0.60, turns: 2 }, desc: '単体攻撃＋速度低下' },
        { name: 'タイムアクセル', scope: 'ally_all', cd: 2, mult: 0, allyCtAdd: 185, allyBuff: [{ id: 'spd_up', turns: 2 }], desc: '味方全体の行動ゲージ大幅加速＋速度上昇' },
        { name: 'クロノス同期機構', scope: 'passive', passive: { partySpdPct: 0.12, chainGain: 0.20 }, desc: '常時：味方全体の速度+12%・共鳴蓄積+20%' }
      ]
    },
    {
      id: 'c_none_healer', name: 'マシロ白竜', kana: 'ましろはくりゅう', icon: '🤍',
      element: 'none', races: ['dragon', 'fairy'], role: 'healer',
      base: { hp: 1410, atk: 226, def: 144, spd: 116, crit: 0.10 },
      unlockDesc: '乱入カオス襲来を2種クリアで加入',
      desc: '綿菓子のような鱗を持つ純白の小さな竜精。どんな世界から来た仲間にも分け隔てなく清らかな癒しを届ける。',
      skills: [
        { name: '白羽のそよ風', scope: 'single', cd: 0, mult: 0.98, desc: '単体へ穏やかな波動攻撃' },
        { name: '純白の鱗ガード', scope: 'ally_area', cd: 2, healMult: 1.52, shieldPct: 0.16, desc: '味方2体を回復＋障壁展開' },
        { name: '万象調和ブレス', scope: 'ally_all', cd: 3, healMult: 1.85, cleanse: 2, allyBuff: [{ id: 'atk_up', turns: 2 }, { id: 'def_up', turns: 2 }], desc: '味方全体大回復＋異常2解除＋攻防上昇' }
      ]
    }
  ];

  /* 規定ソート順で配列を整列 */
  CHARACTERS.sort(Hacha.util.compareRosterEntities);

  const CHARACTER_MAP = {};
  CHARACTERS.forEach((c) => { CHARACTER_MAP[c.id] = c; });

  Hacha.data.CHARACTERS = CHARACTERS;
  Hacha.data.CHARACTER_MAP = CHARACTER_MAP;
})();
