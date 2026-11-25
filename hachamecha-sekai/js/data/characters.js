(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /*
   * プレイアブル24キャラ（全6属性 × 4ロール完全網羅・全7種族＋2種族持ち10体）
   * 技は基本3種(1<2<3)、うち6体は「技2つ＋パッシブ1つ」構成。
   * 紹介文(lore)は図鑑画面でのみ表示する。
   */
  HW.CHARACTERS = [
    // ==================== 炎属性 (4体) ====================
    {
      id: 'c_kagura',
      name: 'カグラ',
      kana: 'かぐら',
      element: 'fire',
      races: ['human', 'dragon'],
      role: 'dealer',
      starter: true,
      arenaOnly: false,
      base: { hp: 2380, atk: 430, def: 155, spd: 112, crit: 0.16, critDmg: 1.55, eva: 0.05, res: 0.10, effHit: 0.12 },
      skills: [
        { slot: 1, name: '焔薙ぎ', target: 'single', ct: 0, mult: 1.05, ailment: { id: 'burn', chance: 0.25, dur: 2 }, desc: '単体炎斬撃＋確率で火傷' },
        { slot: 2, name: '竜焔連牙', target: 'splash', ct: 3, mult: 1.48, ailment: { id: 'burn', chance: 0.45, dur: 2 }, desc: '範囲炎連撃＋高確率で火傷' },
        { slot: 3, name: '紅蓮超新星', target: 'all', ct: 5, mult: 2.05, bonusIfAilment: 0.35, buffSelf: { id: 'atkUp', dur: 2 }, desc: '全体極大炎撃＋異常特効＆自身攻UP' }
      ],
      favorite: { name: '耐熱マイ箸', desc: '攻撃+12%、技1の火傷確率+25%', mod: { atkPct: 0.12, effHit: 0.15 } },
      relic: { name: '炎竜刀・カグツチ改', desc: '技3威力+28%、会心率+12%', mod: { s3Dmg: 0.28, crit: 0.12 } },
      linkBonus: { name: '竜火継承', desc: '主力の攻撃+8%・会心ダメ+12%', mod: { atkPct: 0.08, critDmg: 0.12 } },
      lore: '古竜の血を引く商店街の看板剣士。必殺の炎斬撃で魔物を焼き払うが、その火力で毎朝焼き魚定食も完璧に仕上げる。'
    },
    {
      id: 'c_ignis_rex',
      name: 'バルカノス',
      kana: 'ばるかのす',
      element: 'fire',
      races: ['god'],
      role: 'tank',
      starter: false,
      arenaOnly: true,
      arenaCost: 600,
      base: { hp: 3450, atk: 270, def: 280, spd: 96, crit: 0.08, critDmg: 1.45, eva: 0.03, res: 0.20, effHit: 0.14 },
      skills: [
        { slot: 1, name: '溶岩の拳', target: 'single', ct: 0, mult: 1.00, debuff: { id: 'atkDown', chance: 0.35, dur: 2 }, desc: '単体打撃＋確率で攻DN' },
        { slot: 2, name: '神火の防壁', target: 'allyAll', ct: 3, shieldPct: 0.24, buffSelf: { id: 'taunt', dur: 2 }, buffAlly: { id: 'defUp', dur: 2 }, desc: '味方全体盾＆防UP＋自身挑発' },
        { slot: 3, name: '不滅の鍛冶神', target: 'passive', ct: 0, passiveMod: { dmgRed: 0.16, counterDef: 0.65, startTaunt: 2 }, desc: '常時被ダメ-16%、被弾時防御反撃＆開戦挑発' }
      ],
      favorite: { name: 'マグマ湯呑み', desc: 'HP+14%、防御+12%', mod: { hpPct: 0.14, defPct: 0.12 } },
      relic: { name: '神炉の大盾アグニ', desc: '被ダメ-12%、WAVE開始盾+18%', mod: { dmgRed: 0.12, waveShieldPct: 0.18 } },
      linkBonus: { name: '神炉加護', desc: '主力の防御+12%・HP+8%', mod: { defPct: 0.12, hpPct: 0.08 } },
      lore: '異界闘技場に君臨する鍛冶の炎神。闘技場の鉄柵が壊れるたびに無償で溶接してくれるため運営スタッフからの信頼が厚い。'
    },
    {
      id: 'c_piro',
      name: 'ピロロ',
      kana: 'ぴろろ',
      element: 'fire',
      races: ['fairy', 'machine'],
      role: 'supporter',
      starter: false,
      arenaOnly: false,
      base: { hp: 2420, atk: 325, def: 175, spd: 124, crit: 0.12, critDmg: 1.50, eva: 0.10, res: 0.14, effHit: 0.20 },
      skills: [
        { slot: 1, name: 'スパーク弾', target: 'single', ct: 0, mult: 0.98, debuff: { id: 'defDown', chance: 0.35, dur: 2 }, desc: '単体射撃＋確率で防DN' },
        { slot: 2, name: '熱血クロック', target: 'allyAll', ct: 3, buffAlly: { id: 'atkUp', dur: 2 }, gaugeAlly: 0.16, desc: '味方全体攻UP＆行動ゲージ+16%' },
        { slot: 3, name: '花火オーバーロード', target: 'all', ct: 4, mult: 1.55, ailment: { id: 'burn', chance: 0.60, dur: 2 }, buffAlly: { id: 'critUp', dur: 2 }, desc: '全体炎爆撃＋火傷＆味方全体会心UP' }
      ],
      favorite: { name: '極小スパナ', desc: '速度+12、効果命中+18%', mod: { spdFlat: 12, effHit: 0.18 } },
      relic: { name: '太陽電池ウィング', desc: '開戦ゲージ+20%、味方攻撃+10%', mod: { startGauge: 0.20, teamAtkPct: 0.10 } },
      linkBonus: { name: '発熱ブースト', desc: '主力の速度+10・攻撃+6%', mod: { spdFlat: 10, atkPct: 0.06 } },
      lore: '火の精霊が中古のドローンに引っ越して誕生した妖精機械。テンションが上がると排気口から極彩色の打ち上げ花火が噴き出る。'
    },
    {
      id: 'c_homura',
      name: 'ホムラ',
      kana: 'ほむら',
      element: 'fire',
      races: ['beast'],
      role: 'healer',
      starter: false,
      arenaOnly: false,
      base: { hp: 2680, atk: 315, def: 195, spd: 108, crit: 0.08, critDmg: 1.45, eva: 0.06, res: 0.18, effHit: 0.10 },
      skills: [
        { slot: 1, name: '陽だまり爪', target: 'single', ct: 0, mult: 0.95, healLowest: 0.45, desc: '単体攻撃＋瀕死の味方1体を小回復' },
        { slot: 2, name: '湯けむり回復陣', target: 'allyAll', ct: 3, healMult: 1.25, buffAlly: { id: 'regen', dur: 2 }, desc: '味方全体回復＋再生付与' },
        { slot: 3, name: '不死鳥の湯治', target: 'allyAll', ct: 5, healMult: 1.85, cleanse: 2, buffAlly: { id: 'atkUp', dur: 2 }, desc: '味方全体大回復＋異常2解除＆攻UP' }
      ],
      favorite: { name: '秘湯の手ぬぐい', desc: '与回復+18%、HP+10%', mod: { healOutPct: 0.18, hpPct: 0.10 } },
      relic: { name: '紅狐の温泉瓢箪', desc: '与回復+24%、超過回復の50%盾化', mod: { healOutPct: 0.24, overhealShield: 0.50 } },
      linkBonus: { name: '温泉療養', desc: '主力のHP+10%・被回復+15%', mod: { hpPct: 0.10, healInPct: 0.15 } },
      lore: '火山帯で温泉宿を営む赤狐の獣人女将。どんな重傷でも自家製温泉水を浴びせれば湯気とともに治ってしまうという謎理論の持ち主。'
    },

    // ==================== 水属性 (4体) ====================
    {
      id: 'c_suiren',
      name: 'スイレン',
      kana: 'すいれん',
      element: 'water',
      races: ['human'],
      role: 'tank',
      starter: true,
      arenaOnly: false,
      base: { hp: 3320, atk: 245, def: 270, spd: 100, crit: 0.06, critDmg: 1.45, eva: 0.06, res: 0.20, effHit: 0.14 },
      skills: [
        { slot: 1, name: '水鏡突き', target: 'single', ct: 0, mult: 0.98, buffSelf: { id: 'defUp', dur: 2 }, desc: '単体水撃＋自身に防UP' },
        { slot: 2, name: '蒼波バリア', target: 'allyAll', ct: 3, shieldPct: 0.22, buffSelf: { id: 'taunt', dur: 2 }, desc: '味方全体シールド＋自身に挑発' },
        { slot: 3, name: '絶対零度防壁', target: 'all', ct: 5, mult: 1.40, ailment: { id: 'freeze', chance: 0.40, dur: 1 }, buffSelf: { id: 'taunt', dur: 2 }, shieldSelfPct: 0.30, desc: '全体氷撃＋凍結＆自身大盾＋挑発' }
      ],
      favorite: { name: '防水スマホケース', desc: 'HP+14%、異常耐性+18%', mod: { hpPct: 0.14, res: 0.18 } },
      relic: { name: '氷海楯・リヴァイア', desc: '被ダメ-14%、防御+18%', mod: { dmgRed: 0.14, defPct: 0.18 } },
      linkBonus: { name: '蒼盾守護', desc: '主力のHP+10%・防御+10%', mod: { hpPct: 0.10, defPct: 0.10 } },
      lore: '水族館の警備員から異界防衛隊へスカウトされた真面目な盾役。どんな巨獣の突進も「はい並んでくださーい」と交通整理の要領で受け止める。'
    },
    {
      id: 'c_mizuchi',
      name: 'ミヅチ',
      kana: 'みづち',
      element: 'water',
      races: ['dragon'],
      role: 'dealer',
      starter: false,
      arenaOnly: false,
      base: { hp: 2460, atk: 420, def: 165, spd: 116, crit: 0.18, critDmg: 1.60, eva: 0.06, res: 0.12, effHit: 0.16 },
      skills: [
        { slot: 1, name: '氷牙貫き', target: 'single', ct: 0, mult: 1.08, desc: '鋭い単体氷撃' },
        { slot: 2, name: '激流スプラッシュ', target: 'splash', ct: 3, mult: 1.56, debuff: { id: 'spdDown', chance: 0.50, dur: 2 }, desc: '範囲激流＋高確率で鈍化' },
        { slot: 3, name: '深海竜圧', target: 'single', ct: 4, mult: 2.55, defPen: 0.30, ailment: { id: 'freeze', chance: 0.55, dur: 1 }, desc: '単体貫通極大撃＋高確率凍結' }
      ],
      favorite: { name: 'かき氷シロップ全種', desc: '会心率+12%、攻撃+10%', mod: { crit: 0.12, atkPct: 0.10 } },
      relic: { name: '蒼竜槍・海神の牙', desc: '単体与ダメ+22%、貫通+15%', mod: { singleDmg: 0.22, defPen: 0.15 } },
      linkBonus: { name: '氷牙追撃', desc: '主力の会心率+8%・攻撃+8%', mod: { crit: 0.08, atkPct: 0.08 } },
      lore: '深海神殿から都会のプールへバカンスに来た水竜。真面目な顔で巨大ウォータースライダーのタイムアタック世界記録を狙っている。'
    },
    {
      id: 'c_kurage',
      name: 'クラゲール',
      kana: 'くらげーる',
      element: 'water',
      races: ['monster'],
      role: 'supporter',
      starter: false,
      arenaOnly: false,
      base: { hp: 2560, atk: 310, def: 185, spd: 118, crit: 0.09, critDmg: 1.45, eva: 0.10, res: 0.18, effHit: 0.26 },
      skills: [
        { slot: 1, name: 'しびれ触手', target: 'single', ct: 0, mult: 0.96, ailment: { id: 'paralyze', chance: 0.28, dur: 1 }, desc: '単体攻撃＋確率で麻痺' },
        { slot: 2, name: '深海ジャミング', target: 'all', ct: 3, mult: 1.15, debuff: { id: 'atkDown', chance: 0.65, dur: 2 }, debuff2: { id: 'spdDown', chance: 0.65, dur: 2 }, desc: '全体水波＋攻DN＆鈍化' },
        { slot: 3, name: 'ネオン海月の舞', target: 'passive', ct: 0, passiveMod: { effHit: 0.28, startEnemyBreak: 2, teamRes: 0.16 }, desc: '常時命中+28%、開戦時敵攻防DN、味方耐性+16%' }
      ],
      favorite: { name: '光る蛍光グラス', desc: '効果命中+22%、速度+10', mod: { effHit: 0.22, spdFlat: 10 } },
      relic: { name: '深海DJミキサー', desc: '味方速度+10、デバフ期間+1T', mod: { teamSpdFlat: 10, debuffExt: 1 } },
      linkBonus: { name: '電気干渉', desc: '主力の効果命中+18%・速度+8', mod: { effHit: 0.18, spdFlat: 8 } },
      lore: 'ネオン色に発光する深海クラゲの魔物DJ。海底クラブで流す重低音ビートは敵の三半規管だけをピンポイントで揺さぶる。'
    },
    {
      id: 'c_shizuku',
      name: 'シズク',
      kana: 'しずく',
      element: 'water',
      races: ['fairy'],
      role: 'healer',
      starter: false,
      arenaOnly: false,
      base: { hp: 2620, atk: 305, def: 185, spd: 114, crit: 0.07, critDmg: 1.45, eva: 0.09, res: 0.22, effHit: 0.10 },
      skills: [
        { slot: 1, name: '雫の粒弾', target: 'single', ct: 0, mult: 0.94, buffAllyLowest: { id: 'regen', dur: 2 }, desc: '単体水弾＋瀕死の味方に再生' },
        { slot: 2, name: '清流の癒し', target: 'allySplash', ct: 2, healMult: 1.55, cleanse: 1, desc: '味方範囲中回復＋異常1解除' },
        { slot: 3, name: '世界樹の慈雨', target: 'allyAll', ct: 4, healMult: 1.95, cleanse: 2, shieldPct: 0.15, desc: '味方全体大回復＋異常2解除＆全体盾' }
      ],
      favorite: { name: '虹色のじょうろ', desc: '与回復+20%、速度+8', mod: { healOutPct: 0.20, spdFlat: 8 } },
      relic: { name: '純水クリスタル杖', desc: '与回復+24%、回復時ゲージ+10%', mod: { healOutPct: 0.24, healGauge: 0.10 } },
      linkBonus: { name: '清流の雫', desc: '主力の被回復+18%・異常耐性+14%', mod: { healInPct: 0.18, res: 0.14 } },
      lore: '雨粒から生まれた几帳面な水妖精。どんな大乱戦でも戦場の泥汚れまで綺麗に洗い流してから回復魔法をかけてくれる。'
    },

    // ==================== 風属性 (4体) ====================
    {
      id: 'c_zephyr',
      name: 'ゼフィル',
      kana: 'ぜふぃる',
      element: 'wind',
      races: ['human', 'fairy'],
      role: 'supporter',
      starter: true,
      arenaOnly: false,
      base: { hp: 2500, atk: 330, def: 175, spd: 128, crit: 0.13, critDmg: 1.50, eva: 0.12, res: 0.15, effHit: 0.18 },
      skills: [
        { slot: 1, name: '追い風シュート', target: 'single', ct: 0, mult: 0.98, gaugeAllyLowest: 0.12, desc: '単体風撃＋味方1体ゲージ+12%' },
        { slot: 2, name: '疾風アンサンブル', target: 'allyAll', ct: 3, buffAlly: { id: 'spdUp', dur: 2 }, buffAlly2: { id: 'atkUp', dur: 2 }, gaugeAlly: 0.15, desc: '味方全体速UP・攻UP＆ゲージ+15%' },
        { slot: 3, name: '大嵐シンフォニー', target: 'all', ct: 5, mult: 1.62, debuff: { id: 'defDown', chance: 0.70, dur: 2 }, gaugeAlly: 0.20, desc: '全体竜巻＋防DN＆味方全体ゲージ+20%' }
      ],
      favorite: { name: '超軽量スニーカー', desc: '速度+15、回避+8%', mod: { spdFlat: 15, eva: 0.08 } },
      relic: { name: '風神のスケート翼', desc: '開戦味方全体ゲージ+16%、速度+12', mod: { startTeamGauge: 0.16, spdFlat: 12 } },
      linkBonus: { name: '追い風共振', desc: '主力の速度+12・回避+6%', mod: { spdFlat: 12, eva: 0.06 } },
      lore: '配達バイトと風使いを兼業するハーフ妖精。時速180キロの追い風でラーメンを出前してもスープ一滴こぼさない伝説を持つ。'
    },
    {
      id: 'c_garuda',
      name: 'ガルダイン',
      kana: 'がるだいん',
      element: 'wind',
      races: ['beast', 'god'],
      role: 'dealer',
      starter: false,
      arenaOnly: false,
      base: { hp: 2340, atk: 425, def: 150, spd: 130, crit: 0.20, critDmg: 1.60, eva: 0.12, res: 0.10, effHit: 0.12 },
      skills: [
        { slot: 1, name: '烈風爪', target: 'single', ct: 0, mult: 1.06, desc: '超高速の単体連斬' },
        { slot: 2, name: '真空ダイブ', target: 'splash', ct: 3, mult: 1.60, buffSelf: { id: 'spdUp', dur: 2 }, desc: '範囲真空撃＋自身に速UP' },
        { slot: 3, name: '天翔ける神風', target: 'passive', ct: 0, passiveMod: { spdFlat: 18, extraHitChance: 0.30, crit: 0.14 }, desc: '常時速度+18、追撃率+30%、会心率+14%' }
      ],
      favorite: { name: '風切りゴーグル', desc: '速度+12、会心率+10%', mod: { spdFlat: 12, crit: 0.10 } },
      relic: { name: '神鳥双翼・ガルーダ', desc: '追撃率+20%、攻撃+16%', mod: { extraHitChance: 0.20, atkPct: 0.16 } },
      linkBonus: { name: '神鳥の疾走', desc: '主力の速度+10・会心率+8%', mod: { spdFlat: 10, crit: 0.08 } },
      lore: '神話世界から飛来した超音速の鳥神獣。速すぎて移動中に自分の残像とじゃんけんして遊ぶのが趣味。'
    },
    {
      id: 'c_bambo',
      name: 'バンブオー',
      kana: 'ばんぶおー',
      element: 'wind',
      races: ['monster', 'beast'],
      role: 'tank',
      starter: false,
      arenaOnly: false,
      base: { hp: 3380, atk: 255, def: 265, spd: 102, crit: 0.08, critDmg: 1.45, eva: 0.14, res: 0.16, effHit: 0.12 },
      skills: [
        { slot: 1, name: '竹槍ガード', target: 'single', ct: 0, mult: 0.98, buffSelf: { id: 'evade', dur: 1 }, desc: '単体突き＋自身に見切り(1T)' },
        { slot: 2, name: '竹林の構え', target: 'self', ct: 3, buffSelf: { id: 'taunt', dur: 2 }, buffSelf2: { id: 'regen', dur: 2 }, shieldSelfPct: 0.28, desc: '自身に挑発・再生・大シールド' },
        { slot: 3, name: '大旋風カウンター', target: 'all', ct: 4, mult: 1.48, debuff: { id: 'atkDown', chance: 0.55, dur: 2 }, buffAlly: { id: 'defUp', dur: 2 }, desc: '全体旋風＋敵攻DN＆味方防UP' }
      ],
      favorite: { name: '特上メンマ缶', desc: '回避+12%、HP+12%', mod: { eva: 0.12, hpPct: 0.12 } },
      relic: { name: '千年竹の剛盾', desc: '回避時HP14%回復、反撃率+20%', mod: { evaHeal: 0.14, counterChance: 0.20 } },
      linkBonus: { name: 'しなやか体幹', desc: '主力の回避+8%・HP+10%', mod: { eva: 0.08, hpPct: 0.10 } },
      lore: '竹林の精気を吸いすぎたパンダ型魔物武道家。どんな剛撃もしなやかに受け流し、合間にタケノコご飯を頬張る。'
    },
    {
      id: 'c_aria',
      name: 'アリアナ',
      kana: 'ありあな',
      element: 'wind',
      races: ['dragon', 'fairy'],
      role: 'healer',
      starter: false,
      arenaOnly: false,
      base: { hp: 2660, atk: 315, def: 190, spd: 120, crit: 0.09, critDmg: 1.45, eva: 0.10, res: 0.20, effHit: 0.10 },
      skills: [
        { slot: 1, name: '翡翠の調べ', target: 'single', ct: 0, mult: 0.96, healLowest: 0.42, desc: '単体風音撃＋瀕死味方小回復' },
        { slot: 2, name: '翠風のハープ', target: 'allyAll', ct: 3, healMult: 1.32, buffAlly: { id: 'spdUp', dur: 2 }, desc: '味方全体回復＋速UP' },
        { slot: 3, name: '竜精霊の讃美歌', target: 'allyAll', ct: 5, healMult: 1.80, reviveOne: 0.50, buffAlly: { id: 'regen', dur: 2 }, desc: '全体大回復＋倒れた味方1体蘇生＆再生' }
      ],
      favorite: { name: '風鈴イヤリング', desc: '与回復+16%、速度+10', mod: { healOutPct: 0.16, spdFlat: 10 } },
      relic: { name: '翠竜の風琴ハープ', desc: '与回復+22%、味方全体速度+8', mod: { healOutPct: 0.22, teamSpdFlat: 8 } },
      linkBonus: { name: '緑風の癒し', desc: '主力の与回復+12%・速度+8', mod: { healOutPct: 0.12, spdFlat: 8 } },
      lore: '翠竜と音楽妖精の血を引く旅の竪琴奏者。彼女の即興メロディを聴くと傷口がリズムに合わせて勝手にふさがる。'
    },

    // ==================== 光属性 (4体) ====================
    {
      id: 'c_lumina',
      name: 'ルミナ',
      kana: 'るみな',
      element: 'light',
      races: ['human', 'god'],
      role: 'healer',
      starter: true,
      arenaOnly: false,
      base: { hp: 2740, atk: 320, def: 195, spd: 112, crit: 0.08, critDmg: 1.45, eva: 0.05, res: 0.24, effHit: 0.10 },
      skills: [
        { slot: 1, name: '聖光ショット', target: 'single', ct: 0, mult: 0.96, healLowest: 0.48, desc: '単体光弾＋瀕死味方回復' },
        { slot: 2, name: 'ブライトヒール', target: 'allyAll', ct: 3, healMult: 1.38, cleanse: 1, desc: '味方全体回復＋異常1解除' },
        { slot: 3, name: '天界フルリカバー', target: 'allyAll', ct: 5, healMult: 2.05, shieldPct: 0.18, buffAlly: { id: 'defUp', dur: 2 }, desc: '味方全体特大回復＋全体盾＆防UP' }
      ],
      favorite: { name: '星型ペンライト', desc: '与回復+20%、HP+10%', mod: { healOutPct: 0.20, hpPct: 0.10 } },
      relic: { name: '天輪杖・ソラリス', desc: '与回復+25%、自動蘇生1回獲得', mod: { healOutPct: 0.25, autoRevive: 0.45 } },
      linkBonus: { name: '聖光保護', desc: '主力のHP+10%・異常耐性+14%', mod: { hpPct: 0.10, res: 0.14 } },
      lore: '光神の加護を受けた元アイドル見習いの聖職者。ライブ感覚で回復魔法を放つため戦場のテンションとHPが同時に満タンになる。'
    },
    {
      id: 'c_sol_knight',
      name: 'アポロン零',
      kana: 'あぽろんぜろ',
      element: 'light',
      races: ['god', 'machine'],
      role: 'supporter',
      starter: false,
      arenaOnly: true,
      arenaCost: 600,
      base: { hp: 2680, atk: 350, def: 210, spd: 125, crit: 0.12, critDmg: 1.50, eva: 0.08, res: 0.22, effHit: 0.20 },
      skills: [
        { slot: 1, name: '光子パルス', target: 'single', ct: 0, mult: 1.02, debuff: { id: 'defDown', chance: 0.45, dur: 2 }, desc: '単体光子撃＋確率で防DN' },
        { slot: 2, name: '天界リンク展開', target: 'allyAll', ct: 3, buffAlly: { id: 'atkUp', dur: 2 }, buffAlly2: { id: 'critUp', dur: 2 }, shieldPct: 0.16, desc: '味方全体攻UP・会心UP＆盾' },
        { slot: 3, name: 'ソーラーオーケストラ', target: 'all', ct: 5, mult: 1.72, gaugeAlly: 0.22, buffAlly: { id: 'spdUp', dur: 2 }, desc: '全体光線＋味方全体速UP＆ゲージ+22%' }
      ],
      favorite: { name: '黄金SDカード', desc: '速度+14、味方攻撃+10%', mod: { spdFlat: 14, teamAtkPct: 0.10 } },
      relic: { name: '太陽衛星ユニット', desc: '開戦ゲージ+20%、味方与ダメ+14%', mod: { startGauge: 0.20, teamDmgUp: 0.14 } },
      linkBonus: { name: '衛星照準', desc: '主力の会心率+10%・速度+8', mod: { crit: 0.10, spdFlat: 8 } },
      lore: '古代神話の太陽神を最新AIサーバーへ移植した異界闘技場の司令塔。神託を0.002秒で演算しグラフ付きで教えてくれる。'
    },
    {
      id: 'c_paladin',
      name: 'レオハルト',
      kana: 'れおはると',
      element: 'light',
      races: ['beast'],
      role: 'tank',
      starter: false,
      arenaOnly: false,
      base: { hp: 3400, atk: 275, def: 268, spd: 101, crit: 0.09, critDmg: 1.48, eva: 0.05, res: 0.20, effHit: 0.14 },
      skills: [
        { slot: 1, name: '獅子王の一撃', target: 'single', ct: 0, mult: 1.02, shieldSelfPct: 0.10, desc: '単体斬撃＋自身小シールド' },
        { slot: 2, name: '黄金の咆哮', target: 'all', ct: 3, mult: 1.15, debuff: { id: 'atkDown', chance: 0.55, dur: 2 }, buffSelf: { id: 'taunt', dur: 2 }, desc: '全体咆哮＋攻DN＆自身挑発' },
        { slot: 3, name: '聖獅子の聖域', target: 'allyAll', ct: 5, shieldPct: 0.28, buffAlly: { id: 'defUp', dur: 2 }, cleanse: 1, desc: '味方全体大盾＋防UP＆異常1解除' }
      ],
      favorite: { name: 'たてがみ用ブラシ', desc: 'HP+14%、防御+14%', mod: { hpPct: 0.14, defPct: 0.14 } },
      relic: { name: '聖獅子盾レグルス', desc: '被ダメ-14%、味方全体防御+12%', mod: { dmgRed: 0.14, teamDefPct: 0.12 } },
      linkBonus: { name: '王者の盾', desc: '主力の防御+12%・被ダメ-6%', mod: { defPct: 0.12, dmgRed: 0.06 } },
      lore: '黄金のたてがみを誇る騎士団長ライオン獣人。気品あふれる立ち振る舞いだが、レーザーポインターの赤い点だけは目で追ってしまう。'
    },
    {
      id: 'c_ray',
      name: 'レイヴン',
      kana: 'れいゔん',
      element: 'light',
      races: ['human', 'machine'],
      role: 'dealer',
      starter: false,
      arenaOnly: false,
      base: { hp: 2350, atk: 440, def: 155, spd: 120, crit: 0.20, critDmg: 1.62, eva: 0.07, res: 0.12, effHit: 0.12 },
      skills: [
        { slot: 1, name: 'レーザー斬', target: 'single', ct: 0, mult: 1.08, desc: '高出力単体ビーム斬撃' },
        { slot: 2, name: 'プリズム斉射', target: 'splash', ct: 3, mult: 1.62, defPen: 0.20, desc: '範囲貫通レーザー斉射' },
        { slot: 3, name: 'ハイパーノヴァ砲', target: 'all', ct: 5, mult: 2.15, critBonus: 0.25, desc: '全体超高会心光線砲' }
      ],
      favorite: { name: '予備バッテリーパック', desc: '攻撃+12%、会心ダメ+18%', mod: { atkPct: 0.12, critDmg: 0.18 } },
      relic: { name: '光子連装砲・極光', desc: '会心率+16%、技3威力+25%', mod: { crit: 0.16, s3Dmg: 0.25 } },
      linkBonus: { name: '光学照準', desc: '主力の攻撃+8%・会心率+8%', mod: { atkPct: 0.08, crit: 0.08 } },
      lore: '義肢に最新光学兵器を詰め込んだフリーランス狙撃手。省エネ志向のため普段はLED懐中電灯モードで夜道を照らしている。'
    },

    // ==================== 闇属性 (4体) ====================
    {
      id: 'c_noctis',
      name: 'ノクティス',
      kana: 'のくてぃす',
      element: 'dark',
      races: ['dragon'],
      role: 'dealer',
      starter: false,
      arenaOnly: true,
      arenaCost: 600,
      base: { hp: 2480, atk: 455, def: 165, spd: 118, crit: 0.20, critDmg: 1.65, eva: 0.07, res: 0.14, effHit: 0.20 },
      skills: [
        { slot: 1, name: '虚無爪', target: 'single', ct: 0, mult: 1.12, ailment: { id: 'curse', chance: 0.30, dur: 2 }, desc: '単体闇撃＋確率で呪い' },
        { slot: 2, name: '終焉ブレス', target: 'all', ct: 3, mult: 1.65, ailment: { id: 'bleed', chance: 0.50, dur: 2 }, desc: '全体闇ブレス＋出血' },
        { slot: 3, name: 'アビスメテオ', target: 'single', ct: 4, mult: 2.75, defPen: 0.35, lifestealBonus: 0.25, desc: '単体貫通超極大撃＋高吸血' }
      ],
      favorite: { name: '漆黒の珈琲豆', desc: '攻撃+15%、会心ダメ+20%', mod: { atkPct: 0.15, critDmg: 0.20 } },
      relic: { name: '黒竜翼・エクリプス', desc: '貫通+20%、与ダメ+18%', mod: { defPen: 0.20, dmgUp: 0.18 } },
      linkBonus: { name: '漆黒覇気', desc: '主力の攻撃+10%・貫通+10%', mod: { atkPct: 0.10, defPen: 0.10 } },
      lore: '異界闘技場で無敗記録を塗り替え続ける黒竜。威厳たっぷりの見た目だが甘いモンブランを前にすると尻尾が高速で揺れる。'
    },
    {
      id: 'c_lilith',
      name: 'リリスベル',
      kana: 'りりすべる',
      element: 'dark',
      races: ['human', 'monster'],
      role: 'supporter',
      starter: false,
      arenaOnly: false,
      base: { hp: 2480, atk: 340, def: 170, spd: 122, crit: 0.12, critDmg: 1.50, eva: 0.09, res: 0.16, effHit: 0.28 },
      skills: [
        { slot: 1, name: '悪夢の針', target: 'single', ct: 0, mult: 0.98, ailment: { id: 'poison', chance: 0.45, dur: 2 }, desc: '単体闇撃＋高確率で毒' },
        { slot: 2, name: '呪縛の鐘', target: 'all', ct: 3, mult: 1.25, ailment: { id: 'curse', chance: 0.60, dur: 2 }, debuff: { id: 'defDown', chance: 0.65, dur: 2 }, desc: '全体呪い＆防DN' },
        { slot: 3, name: 'ナイトメアフェス', target: 'all', ct: 5, mult: 1.75, ailment: { id: 'silence', chance: 0.50, dur: 1 }, debuff: { id: 'healDown', chance: 0.70, dur: 2 }, desc: '全体闇撃＋沈黙＆治癒低下' }
      ],
      favorite: { name: 'ゴシック傘', desc: '効果命中+25%、速度+10', mod: { effHit: 0.25, spdFlat: 10 } },
      relic: { name: '悪魔の音響ベル', desc: '敵継続ダメ+40%、異常延長+1T', mod: { teamDotBonus: 0.40, debuffExt: 1 } },
      linkBonus: { name: '呪詛増幅', desc: '主力の効果命中+18%・異常特効+12%', mod: { effHit: 0.18, ailmentBonus: 0.12 } },
      lore: '魔族の血を引くオカルト系動画配信者。戦場で呪いの儀式を実演しつつもコンプライアンスには意外と厳しい。'
    },
    {
      id: 'c_dullahan',
      name: 'デュラハーン',
      kana: 'でゅらはーん',
      element: 'dark',
      races: ['monster', 'machine'],
      role: 'tank',
      starter: false,
      arenaOnly: false,
      base: { hp: 3360, atk: 280, def: 272, spd: 98, crit: 0.09, critDmg: 1.48, eva: 0.05, res: 0.20, effHit: 0.18 },
      skills: [
        { slot: 1, name: '怨念シールド打', target: 'single', ct: 0, mult: 1.00, ailment: { id: 'bleed', chance: 0.35, dur: 2 }, desc: '単体打撃＋確率で出血' },
        { slot: 2, name: '首なし挑発ドライブ', target: 'splash', ct: 3, mult: 1.25, buffSelf: { id: 'taunt', dur: 2 }, lifestealBonus: 0.35, desc: '範囲吸収撃＋自身挑発' },
        { slot: 3, name: '不死鋼鉄ボディ', target: 'passive', ct: 0, passiveMod: { guts: 0.30, hpPct: 0.18, onHitAtkDown: 0.45 }, desc: '常時HP+18%、不屈1回(HP30%)、被弾時敵攻DN' }
      ],
      favorite: { name: '予備の頭ヘルメット', desc: 'HP+16%、防御+12%', mod: { hpPct: 0.16, defPct: 0.12 } },
      relic: { name: '冥界バイク装甲', desc: '被ダメ-14%、吸血+15%', mod: { dmgRed: 0.14, lifesteal: 0.15 } },
      linkBonus: { name: '不死装甲', desc: '主力のHP+12%・吸血+8%', mod: { hpPct: 0.12, lifesteal: 0.08 } },
      lore: '首なし騎士の鎧に改造バイクのエンジンを搭載した異色の魔物機械。頭部はワイヤレス通信で空中に浮いている。'
    },
    {
      id: 'c_nyx',
      name: 'ニュクス',
      kana: 'にゅくす',
      element: 'dark',
      races: ['god'],
      role: 'healer',
      starter: false,
      arenaOnly: false,
      base: { hp: 2640, atk: 335, def: 185, spd: 114, crit: 0.10, critDmg: 1.50, eva: 0.07, res: 0.22, effHit: 0.14 },
      skills: [
        { slot: 1, name: '星影ドレイン', target: 'single', ct: 0, mult: 1.02, healLowest: 0.52, desc: '単体闇撃＋瀕死味方を吸収回復' },
        { slot: 2, name: '夜帳の安息', target: 'allyAll', ct: 3, healMult: 1.35, buffAlly: { id: 'critUp', dur: 2 }, desc: '味方全体回復＋会心UP' },
        { slot: 3, name: '常夜の輪廻', target: 'passive', ct: 0, passiveMod: { turnTeamHeal: 0.07, healOutPct: 0.22, healReflectDmg: 0.50 }, desc: '常時回復+22%、毎行動全体HP7%癒、回復時敵へ反響撃' }
      ],
      favorite: { name: '安眠アイマスク', desc: '与回復+18%、攻撃+12%', mod: { healOutPct: 0.18, atkPct: 0.12 } },
      relic: { name: '夜神の三日月杯', desc: '与回復+24%、味方吸血+10%', mod: { healOutPct: 0.24, teamLifesteal: 0.10 } },
      linkBonus: { name: '夜神の夢路', desc: '主力の与回復+14%・吸血+6%', mod: { healOutPct: 0.14, lifesteal: 0.06 } },
      lore: '常に眠たげな夜の女神。敵から奪った活力で味方を癒やすエコなスタイルを好み、戦闘が終わると3秒でうたた寝に入る。'
    },

    // ==================== 無属性 (4体) ====================
    {
      id: 'c_zero_mk',
      name: 'ゼロギア',
      kana: 'ぜろぎあ',
      element: 'none',
      races: ['machine'],
      role: 'tank',
      starter: false,
      arenaOnly: false,
      base: { hp: 3420, atk: 265, def: 278, spd: 103, crit: 0.08, critDmg: 1.45, eva: 0.05, res: 0.24, effHit: 0.12 },
      skills: [
        { slot: 1, name: 'パイルバンカー', target: 'single', ct: 0, mult: 1.02, debuff: { id: 'defDown', chance: 0.35, dur: 2 }, desc: '単体物理撃＋確率で防DN' },
        { slot: 2, name: 'イージス起動', target: 'allyAll', ct: 3, shieldPct: 0.25, buffSelf: { id: 'taunt', dur: 2 }, desc: '味方全体大シールド＋自身挑発' },
        { slot: 3, name: '完全装甲展開', target: 'all', ct: 5, mult: 1.45, buffAlly: { id: 'defUp', dur: 2 }, shieldSelfPct: 0.35, desc: '全体衝撃波＋味方防UP＆自身特大盾' }
      ],
      favorite: { name: '高級潤滑オイル', desc: '防御+16%、HP+12%', mod: { defPct: 0.16, hpPct: 0.12 } },
      relic: { name: '超合金コア・零式', desc: '被ダメ-15%、WAVE開始全体盾14%', mod: { dmgRed: 0.15, teamWaveShield: 0.14 } },
      linkBonus: { name: '零式フレーム', desc: '主力の防御+14%・異常耐性+12%', mod: { defPct: 0.14, res: 0.12 } },
      lore: '工場のラインからなぜか自我を持って歩き出した万能ガードロボ。無属性ゆえ弱点が存在せず、猫を撫でるときだけ出力を0.01%にする。'
    },
    {
      id: 'c_musashi',
      name: 'ムサシ丸',
      kana: 'むさしまる',
      element: 'none',
      races: ['human', 'beast'],
      role: 'dealer',
      starter: false,
      arenaOnly: false,
      base: { hp: 2440, atk: 438, def: 165, spd: 118, crit: 0.22, critDmg: 1.62, eva: 0.09, res: 0.12, effHit: 0.12 },
      skills: [
        { slot: 1, name: '二天連斬', target: 'single', ct: 0, mult: 1.12, desc: '鋭い無属性二連斬' },
        { slot: 2, name: '乱れ桜吹雪', target: 'splash', ct: 3, mult: 1.64, ailment: { id: 'bleed', chance: 0.45, dur: 2 }, desc: '範囲斬撃＋出血付与' },
        { slot: 3, name: '無想剣・燕返し', target: 'single', ct: 4, mult: 2.68, critBonus: 0.30, defPen: 0.28, desc: '単体超高会心・貫通の必殺剣' }
      ],
      favorite: { name: '手彫り木刀', desc: '会心率+14%、攻撃+12%', mod: { crit: 0.14, atkPct: 0.12 } },
      relic: { name: '名刀・二天一文字', desc: '追撃率+20%、会心ダメ+30%', mod: { extraHitChance: 0.20, critDmg: 0.30 } },
      linkBonus: { name: '剣豪の極意', desc: '主力の攻撃+9%・会心ダメ+14%', mod: { atkPct: 0.09, critDmg: 0.14 } },
      lore: '犬耳を持つ現代サムライ剣豪。属性相性に一切左右されない純粋な剣技を極め、戦わない日は縁側でせんべいをかじっている。'
    },
    {
      id: 'c_chronos',
      name: 'クロノア',
      kana: 'くろのあ',
      element: 'none',
      races: ['dragon', 'god'],
      role: 'supporter',
      starter: false,
      arenaOnly: false,
      base: { hp: 2620, atk: 345, def: 195, spd: 126, crit: 0.12, critDmg: 1.50, eva: 0.08, res: 0.22, effHit: 0.18 },
      skills: [
        { slot: 1, name: '秒針エッジ', target: 'single', ct: 0, mult: 1.00, debuff: { id: 'spdDown', chance: 0.40, dur: 2 }, desc: '単体時空斬＋確率で鈍化' },
        { slot: 2, name: '時間加速領域', target: 'allyAll', ct: 3, gaugeAlly: 0.22, buffAlly: { id: 'spdUp', dur: 2 }, desc: '味方全体ゲージ+22%＆速UP' },
        { slot: 3, name: '時空竜の調律', target: 'passive', ct: 0, passiveMod: { startTeamGauge: 0.20, teamAtkPct: 0.12, extraCtChance: 0.35 }, desc: '開戦味方ゲージ+20%、味方攻撃+12%、高回転CT短縮' }
      ],
      favorite: { name: '砂時計キーホルダー', desc: '速度+14、HP+10%', mod: { spdFlat: 14, hpPct: 0.10 } },
      relic: { name: '万象の懐中時計', desc: '味方速度+12、味方与ダメ+12%', mod: { teamSpdFlat: 12, teamDmgUp: 0.12 } },
      linkBonus: { name: '時空同調', desc: '主力の速度+12・与ダメ+6%', mod: { spdFlat: 12, dmgUp: 0.06 } },
      lore: '時間の狭間に住む神竜。歴史の重大事件を監視しているはずが、たいていタイムセールの開始時刻ばかり気にしている。'
    },
    {
      id: 'c_mille',
      name: 'ミルフィー',
      kana: 'みるふぃー',
      element: 'none',
      races: ['god', 'fairy'],
      role: 'healer',
      starter: false,
      arenaOnly: true,
      arenaCost: 600,
      base: { hp: 2760, atk: 330, def: 205, spd: 120, crit: 0.10, critDmg: 1.50, eva: 0.10, res: 0.26, effHit: 0.12 },
      skills: [
        { slot: 1, name: '虹星ドロップ', target: 'single', ct: 0, mult: 0.98, healLowest: 0.55, desc: '単体星弾＋瀕死味方を回復' },
        { slot: 2, name: '夢色ミルフィーユ', target: 'allyAll', ct: 3, healMult: 1.48, buffAlly: { id: 'atkUp', dur: 2 }, cleanse: 1, desc: '味方全体大回復＋攻UP＆異常1解除' },
        { slot: 3, name: 'はちゃめちゃ祝福', target: 'allyAll', ct: 5, healMult: 2.10, reviveOne: 0.65, shieldPct: 0.22, buffAlly: { id: 'spdUp', dur: 2 }, desc: '全体特大回復＋蘇生＋大盾＋速UP' }
      ],
      favorite: { name: '七色マカロン箱', desc: '与回復+22%、速度+10', mod: { healOutPct: 0.22, spdFlat: 10 } },
      relic: { name: '奇跡のホイップ杖', desc: '与回復+26%、超過回復70%盾＆味方与ダメ+10%', mod: { healOutPct: 0.26, overhealShield: 0.70, teamDmgUp: 0.10 } },
      linkBonus: { name: '奇跡の甘味', desc: '主力の与回復+14%・全基礎ステ+5%', mod: { healOutPct: 0.14, hpPct: 0.05, atkPct: 0.05, defPct: 0.05 } },
      lore: '異界闘技場の伝説的パティシエ妖精女神。戦場に巨大なケーキを召喚して味方を全快させる、文字通りはちゃめちゃな奇跡の体現者。'
    }
  ];

  // 厳密4段階ソート済み配列も事前提供
  HW.CHARACTERS_SORTED = HW.CHARACTERS.slice().sort(HW.compareCharacters);

  HW.getCharDef = function (id) {
    return HW.CHARACTERS.find((c) => c.id === id) || null;
  };
})();
