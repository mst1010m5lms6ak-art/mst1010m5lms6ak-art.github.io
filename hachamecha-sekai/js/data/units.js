/* ==========================================================================
   units.js - 全20キャラクター定義（属性6×種族5[2種族含む]×ロール4・技3種・専用武器）
   ※キャライラストは一切使用せず、属性×種族×ロールの紋章で表現
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  const RAW_UNITS = [
    // ================= 炎属性 (fire) =================
    {
      id: 'kagura',
      name: 'カグラ',
      title: '紅蓮の盾番長',
      attr: 'fire',
      races: ['human'],
      role: 'tank',
      unlock: { type: 'starter', label: '初期加入' },
      base: { hp: 560, atk: 58, def: 62, spd: 96, crit: 0.10 },
      skills: [
        { id: 's1', name: '鉄鍋スマッシュ', cd: 0, type: 'dmg', mult: 1.05, chaos: 7, desc: '単体攻撃＋自身に小障壁(HP8%)' , selfShieldPct: 0.08 },
        { id: 's2', name: '炎壁挑発', cd: 2, type: 'taunt', mult: 0, chaos: 12, shieldPct: 0.24, desc: '2T挑発＋味方全体へ障壁(HP24%)' },
        { id: 's3', name: '爆熱カウンター陣', cd: 3, type: 'aoe', mult: 1.45, chaos: 18, selfShieldPct: 0.28, debuff: 'atkDown', desc: '敵全体攻撃＋ATK低下＋自身に厚い障壁' }
      ],
      exWeapon: {
        name: '紅蓮の鍋蓋シールド',
        stats: { hp: 220, atk: 24, def: 44, spd: 4, crit: 2 },
        passiveId: 'reflect_burn',
        desc: '被弾時に敵へDEF×85%の炎反撃＆自身HP4%回復'
      }
    },
    {
      id: 'homura',
      name: 'ホムラ',
      title: '爆走花火師',
      attr: 'fire',
      races: ['human'],
      role: 'dealer',
      unlock: { type: 'stage', stageId: 'w1-1', label: '1-1 初回クリア' },
      base: { hp: 360, atk: 96, def: 34, spd: 112, crit: 0.18 },
      skills: [
        { id: 's1', name: '火種スナップ', cd: 0, type: 'dmg', mult: 1.15, chaos: 8, desc: '素早い炎単体攻撃' },
        { id: 's2', name: '乱れロケット花火', cd: 2, type: 'multi', hits: 3, mult: 0.62, chaos: 14, desc: 'ランダムな敵へ3連射' },
        { id: 's3', name: '超新星どっかーん', cd: 3, type: 'aoe', mult: 2.05, chaos: 20, desc: '敵全体へ特大炎ダメージ' }
      ],
      exWeapon: {
        name: '特大尺玉ランチャー',
        stats: { hp: 90, atk: 68, def: 12, spd: 8, crit: 8 },
        passiveId: 'crit_splash',
        desc: '会心発生時、敵全体へATK×45%の炎爆風を追撃'
      }
    },
    {
      id: 'rex',
      name: 'レックス',
      title: '双角の竜剣士',
      attr: 'fire',
      races: ['human', 'dragon'],
      role: 'dealer',
      unlock: { type: 'stage', stageId: 'w1-3', label: '1-3 初回クリア' },
      base: { hp: 410, atk: 102, def: 40, spd: 108, crit: 0.20 },
      skills: [
        { id: 's1', name: '竜爪斬り', cd: 0, type: 'dmg', mult: 1.20, chaos: 8, desc: '鋭い単体斬撃' },
        { id: 's2', name: 'ブレイズファング', cd: 2, type: 'dmg', mult: 2.15, chaos: 14, debuff: 'defDown', desc: '単体強撃＋防御低下2T' },
        { id: 's3', name: '紅蓮竜王乱舞', cd: 3, type: 'multi', hits: 4, mult: 0.72, chaos: 22, desc: '4連撃＋各撃に高会心補正' }
      ],
      exWeapon: {
        name: '爆熱双竜ブレード',
        stats: { hp: 120, atk: 76, def: 18, spd: 6, crit: 10 },
        passiveId: 'dragon_execute',
        desc: 'HP50%以下の敵への与ダメージ+35%＆カオス蓄積+3'
      }
    },
    {
      id: 'azami',
      name: 'アザミ',
      title: '鬼火の薬師',
      attr: 'fire',
      races: ['human', 'monster'],
      role: 'healer',
      unlock: { type: 'stage', stageId: 'w2-3', label: '2-3 初回クリア' },
      base: { hp: 430, atk: 74, def: 42, spd: 106, crit: 0.12 },
      skills: [
        { id: 's1', name: '温熱の灸撃', cd: 0, type: 'dmg', mult: 1.0, chaos: 7, healLowest: 0.65, desc: '単体攻撃＋HP最少の味方を回復' },
        { id: 's2', name: '紅の薬湯シャワー', cd: 2, type: 'healAll', mult: 1.45, chaos: 12, desc: '味方全体回復＋ATK上昇2T', buff: 'atkUp' },
        { id: 's3', name: '不死鳥の大釜', cd: 3, type: 'healAll', mult: 2.15, chaos: 18, shieldPct: 0.14, desc: '味方全体大回復＋障壁付与' }
      ],
      exWeapon: {
        name: '煮えたぎる魂釜',
        stats: { hp: 165, atk: 46, def: 26, spd: 7, crit: 4 },
        passiveId: 'heal_ignite',
        desc: '回復スキル発動時、最もHPの高い敵へATK×90%の炎追撃'
      }
    },
    {
      id: 'igna',
      name: 'イグナ',
      title: 'いたずら鬼火精',
      attr: 'fire',
      races: ['monster', 'fairy'],
      role: 'supporter',
      unlock: { type: 'boss', stageId: 'boss-fire', label: '炎獄ボス初討伐' },
      base: { hp: 390, atk: 78, def: 38, spd: 124, crit: 0.15 },
      skills: [
        { id: 's1', name: 'ウィスプ弾', cd: 0, type: 'dmg', mult: 1.05, chaos: 9, pushGauge: 10, desc: '単体攻撃＋味方最少ゲージ+10%' },
        { id: 's2', name: 'お祭りヒートアップ', cd: 2, type: 'buffAll', buff: 'atkUp', chaos: 15, pushGauge: 18, desc: '味方全体ATK上昇＋行動ゲージ+18%' },
        { id: 's3', name: '万灯カオス花火', cd: 3, type: 'debuffAll', debuff: 'defDown', mult: 1.35, chaos: 24, desc: '敵全体攻撃＋防御低下＋カオス大幅蓄積' }
      ],
      exWeapon: {
        name: 'いたずら鬼火ランタン',
        stats: { hp: 130, atk: 50, def: 20, spd: 14, crit: 6 },
        passiveId: 'chaos_spark',
        desc: '行動終了ごとにカオス値+6＆味方全体SPD小上昇'
      }
    },

    // ================= 水属性 (water) =================
    {
      id: 'shizuku',
      name: 'シズク',
      title: '泡沫の癒し手',
      attr: 'water',
      races: ['human'],
      role: 'healer',
      unlock: { type: 'starter', label: '初期加入' },
      base: { hp: 440, atk: 72, def: 44, spd: 104, crit: 0.10 },
      skills: [
        { id: 's1', name: '水滴ショット', cd: 0, type: 'dmg', mult: 0.95, chaos: 7, healLowest: 0.70, desc: '単体攻撃＋味方1体を回復' },
        { id: 's2', name: '清流の雫', cd: 2, type: 'heal', mult: 2.35, chaos: 11, desc: 'HP最少の味方を特大回復＋障壁', shieldPct: 0.15 },
        { id: 's3', name: 'アクアオアシス', cd: 3, type: 'healAll', mult: 1.95, chaos: 16, buff: 'defUp', desc: '味方全体大回復＋防御上昇2T' }
      ],
      exWeapon: {
        name: '泡沫の聖水フラスコ',
        stats: { hp: 180, atk: 44, def: 28, spd: 8, crit: 3 },
        passiveId: 'overheal_gauge',
        desc: '回復発動時、対象の味方の行動ゲージを+14%加速'
      }
    },
    {
      id: 'val',
      name: 'ヴァル',
      title: '深海の大鎧竜',
      attr: 'water',
      races: ['dragon'],
      role: 'tank',
      unlock: { type: 'stage', stageId: 'w2-2', label: '2-2 初回クリア' },
      base: { hp: 620, atk: 54, def: 68, spd: 90, crit: 0.08 },
      skills: [
        { id: 's1', name: 'タイダルバッシュ', cd: 0, type: 'dmg', mult: 1.05, chaos: 7, debuff: 'atkDown', desc: '単体攻撃＋ATK低下' },
        { id: 's2', name: '大津波ウォール', cd: 2, type: 'taunt', shieldPct: 0.28, chaos: 12, desc: '2T挑発＋味方全体大障壁(HP28%)' },
        { id: 's3', name: '深淵メイルシュトローム', cd: 3, type: 'aoe', mult: 1.55, chaos: 18, pushBack: 22, desc: '敵全体攻撃＋敵行動ゲージ-22%後退' }
      ],
      exWeapon: {
        name: '深海竜鱗の防壁',
        stats: { hp: 260, atk: 20, def: 52, spd: 3, crit: 2 },
        passiveId: 'tide_guard',
        desc: '障壁維持中の被ダメージさらに-15%＆毎行動HP5%回復'
      }
    },
    {
      id: 'gearmaru',
      name: 'ギアマル',
      title: '高圧洗浄ロボ',
      attr: 'water',
      races: ['machine'],
      role: 'dealer',
      unlock: { type: 'stage', stageId: 'w2-4', label: '2-4 初回クリア' },
      base: { hp: 385, atk: 98, def: 46, spd: 116, crit: 0.19 },
      skills: [
        { id: 's1', name: 'ジェットノズル', cd: 0, type: 'dmg', mult: 1.15, chaos: 8, desc: '貫通水圧単体攻撃' },
        { id: 's2', name: 'サイクロン洗浄', cd: 2, type: 'aoe', mult: 1.55, chaos: 14, debuff: 'spdDown', desc: '敵全体攻撃＋速度低下2T' },
        { id: 's3', name: '超高圧ハイドロ砲', cd: 3, type: 'dmg', mult: 2.95, chaos: 20, desc: '単体へ防御無視寄りの超火力砲撃' }
      ],
      exWeapon: {
        name: '高圧水流キャノンMK-IX',
        stats: { hp: 110, atk: 74, def: 24, spd: 10, crit: 9 },
        passiveId: 'pierce_surge',
        desc: '敵の防御力を25%無視し、スキル発動時に自身の行動ゲージ+15%'
      }
    },
    {
      id: 'mio',
      name: 'ミオ',
      title: '潮風の氷精',
      attr: 'water',
      races: ['fairy'],
      role: 'supporter',
      unlock: { type: 'boss', stageId: 'boss-water', label: '深海ボス初討伐' },
      base: { hp: 400, atk: 76, def: 40, spd: 122, crit: 0.14 },
      skills: [
        { id: 's1', name: 'フロストチャイム', cd: 0, type: 'dmg', mult: 1.0, chaos: 8, debuff: 'spdDown', desc: '単体攻撃＋速度低下' },
        { id: 's2', name: 'クリスタルミスト', cd: 2, type: 'buffAll', buff: 'spdUp', chaos: 14, shieldPct: 0.14, desc: '味方全体SPD上昇＋小障壁' },
        { id: 's3', name: '絶対零度ディレイ', cd: 3, type: 'aoe', mult: 1.40, chaos: 20, pushBack: 35, desc: '敵全体攻撃＋行動ゲージ-35%遅延' }
      ],
      exWeapon: {
        name: '氷晶の風鈴ロッド',
        stats: { hp: 140, atk: 48, def: 22, spd: 15, crit: 5 },
        passiveId: 'chill_delay',
        desc: '攻撃命中時、対象の行動ゲージをさらに-12%後退させる'
      }
    },

    // ================= 風属性 (wind) =================
    {
      id: 'hayate',
      name: 'ハヤテ',
      title: '音速サイボーグ侍',
      attr: 'wind',
      races: ['human', 'machine'],
      role: 'dealer',
      unlock: { type: 'starter', label: '初期加入' },
      base: { hp: 370, atk: 95, def: 36, spd: 126, crit: 0.22 },
      skills: [
        { id: 's1', name: '真空一閃', cd: 0, type: 'dmg', mult: 1.15, chaos: 8, desc: '超高速の風斬撃' },
        { id: 's2', name: 'ターボ連斬', cd: 2, type: 'multi', hits: 3, mult: 0.66, chaos: 14, desc: 'ランダム3連斬＋自身SPD上昇', buffSelf: 'spdUp' },
        { id: 's3', name: '神速ストームブレイク', cd: 3, type: 'aoe', mult: 1.95, chaos: 20, desc: '敵全体を薙ぎ払う疾風奥義' }
      ],
      exWeapon: {
        name: '音速ジェットブレード',
        stats: { hp: 95, atk: 72, def: 14, spd: 16, crit: 10 },
        passiveId: 'speed_scaling',
        desc: '自身のSPDに応じた追加ダメージ(SPD×1.8倍)を全攻撃に上乗せ'
      }
    },
    {
      id: 'zephyra',
      name: 'ゼフィラ',
      title: '翡翠翼の風竜精',
      attr: 'wind',
      races: ['dragon', 'fairy'],
      role: 'healer',
      unlock: { type: 'stage', stageId: 'w3-2', label: '3-2 初回クリア' },
      base: { hp: 425, atk: 76, def: 40, spd: 118, crit: 0.12 },
      skills: [
        { id: 's1', name: '翠風フェザー', cd: 0, type: 'dmg', mult: 1.0, chaos: 8, healLowest: 0.72, desc: '単体攻撃＋味方1体回復' },
        { id: 's2', name: '追い風ブリーズ', cd: 2, type: 'healAll', mult: 1.40, chaos: 13, pushGauge: 16, desc: '味方全体回復＋行動ゲージ+16%' },
        { id: 's3', name: '大嵐の聖域', cd: 3, type: 'healAll', mult: 2.10, chaos: 18, buff: 'spdUp', desc: '味方全体大回復＋SPD上昇2T' }
      ],
      exWeapon: {
        name: '翡翠翼の癒し羽根',
        stats: { hp: 160, atk: 48, def: 24, spd: 13, crit: 4 },
        passiveId: 'wind_regen',
        desc: '自身行動ごとに味方全員のHPを5%自動再生'
      }
    },
    {
      id: 'lill',
      name: 'リル',
      title: '突風の笛吹き妖精',
      attr: 'wind',
      races: ['fairy'],
      role: 'supporter',
      unlock: { type: 'starter', label: '初期加入' },
      base: { hp: 380, atk: 70, def: 36, spd: 128, crit: 0.14 },
      skills: [
        { id: 's1', name: 'つむじノート', cd: 0, type: 'dmg', mult: 1.0, chaos: 8, pushGauge: 12, desc: '単体攻撃＋味方1体ゲージ加速' },
        { id: 's2', name: 'はやてマーチ', cd: 2, type: 'buffAll', buff: 'spdUp', chaos: 15, pushGauge: 22, desc: '味方全体SPD上昇＋行動ゲージ+22%' },
        { id: 's3', name: '万華鏡トルネード', cd: 3, type: 'aoe', mult: 1.45, chaos: 22, buff: 'atkUp', desc: '敵全体攻撃＋味方全体ATK上昇' }
      ],
      exWeapon: {
        name: '疾風万華鏡フルート',
        stats: { hp: 125, atk: 46, def: 18, spd: 18, crit: 5 },
        passiveId: 'haste_aura',
        desc: '味方全体の行動ゲージ加速効果+40%＆戦闘開始時全員ゲージ+20%'
      }
    },

    // ================= 光属性 (light) =================
    {
      id: 'solaris',
      name: 'ソラリス',
      title: '星詠みの光巫女',
      attr: 'light',
      races: ['human', 'fairy'],
      role: 'healer',
      unlock: { type: 'stage', stageId: 'w3-4', label: '3-4 初回クリア' },
      base: { hp: 445, atk: 80, def: 44, spd: 112, crit: 0.14 },
      skills: [
        { id: 's1', name: 'スターライト', cd: 0, type: 'dmg', mult: 1.05, chaos: 8, healLowest: 0.78, desc: '光攻撃＋HP最少の味方を回復' },
        { id: 's2', name: 'プリズムベール', cd: 2, type: 'shieldAll', shieldPct: 0.25, healAllMult: 1.15, chaos: 14, desc: '味方全体へ回復＋障壁(HP25%)' },
        { id: 's3', name: '天界スーパーノヴァ', cd: 3, type: 'healAll', mult: 2.35, chaos: 20, buff: 'atkUp', desc: '味方全体特大回復＋ATK上昇2T' }
      ],
      exWeapon: {
        name: '星屑プリズムスタッフ',
        stats: { hp: 185, atk: 54, def: 28, spd: 9, crit: 5 },
        passiveId: 'prism_bless',
        desc: '障壁付与量+35%＆障壁を持つ味方の与ダメージ+15%'
      }
    },
    {
      id: 'aurora',
      name: 'オーロラ',
      title: '光子装甲の機竜',
      attr: 'light',
      races: ['dragon', 'machine'],
      role: 'tank',
      unlock: { type: 'stage', stageId: 'w4-2', label: '4-2 初回クリア' },
      base: { hp: 600, atk: 64, def: 70, spd: 102, crit: 0.12 },
      skills: [
        { id: 's1', name: 'フォトンタックル', cd: 0, type: 'dmg', mult: 1.10, chaos: 8, selfShieldPct: 0.10, desc: '単体光撃＋自身障壁' },
        { id: 's2', name: 'イージス展開', cd: 2, type: 'taunt', shieldPct: 0.30, chaos: 14, buff: 'defUp', desc: '2T挑発＋全体障壁＋防御上昇' },
        { id: 's3', name: 'オーロラ粒子砲', cd: 3, type: 'aoe', mult: 1.65, chaos: 20, debuff: 'atkDown', desc: '敵全体光砲＋ATK低下2T' }
      ],
      exWeapon: {
        name: '光子装甲イージス',
        stats: { hp: 250, atk: 32, def: 56, spd: 7, crit: 3 },
        passiveId: 'photon_nova',
        desc: '戦闘開始時に全体障壁(HP18%)＋挑発発動時に敵全体へ光衝撃'
      }
    },
    {
      id: 'luminous',
      name: 'ルミナス',
      title: '量子時計の妖精機',
      attr: 'light',
      races: ['fairy', 'machine'],
      role: 'supporter',
      unlock: { type: 'boss', stageId: 'boss-light', label: '閃光ボス初討伐' },
      base: { hp: 410, atk: 82, def: 42, spd: 130, crit: 0.16 },
      skills: [
        { id: 's1', name: 'クォンタム針', cd: 0, type: 'dmg', mult: 1.05, chaos: 10, pushGauge: 14, desc: '単体攻撃＋味方加速＋高カオス' },
        { id: 's2', name: 'クロックオーバー', cd: 2, type: 'buffAll', buff: 'spdUp', chaos: 16, pushGauge: 26, desc: '味方全体SPD上昇＋全員ゲージ+26%' },
        { id: 's3', name: '時空サンライズ', cd: 3, type: 'aoe', mult: 1.60, chaos: 24, buff: 'atkUp', pushGauge: 18, desc: '敵全体光撃＋全体ATK上昇＋ゲージ加速' }
      ],
      exWeapon: {
        name: '量子歯車クロック',
        stats: { hp: 145, atk: 52, def: 24, spd: 20, crit: 6 },
        passiveId: 'cd_rewind',
        desc: 'スキル2・3使用時、味方全体のクールタイムを1短縮'
      }
    },

    // ================= 闇属性 (dark) =================
    {
      id: 'crow',
      name: 'クロウ',
      title: '呪鋏の影狩人',
      attr: 'dark',
      races: ['human', 'monster'],
      role: 'dealer',
      unlock: { type: 'stage', stageId: 'w1-4', label: '1-4 初回クリア' },
      base: { hp: 380, atk: 104, def: 34, spd: 118, crit: 0.24 },
      skills: [
        { id: 's1', name: 'シャドウスニップ', cd: 0, type: 'dmg', mult: 1.20, chaos: 8, desc: '高会心の闇単体攻撃' },
        { id: 's2', name: 'ブラッドシザーズ', cd: 2, type: 'dmg', mult: 2.25, chaos: 14, lifestealBonus: 0.35, desc: '単体強撃＋与ダメ35%吸血' },
        { id: 's3', name: '絶望ブラックチョップ', cd: 3, type: 'multi', hits: 4, mult: 0.74, chaos: 22, desc: '敵ランダム4連撃＋出血追加' }
      ],
      exWeapon: {
        name: '呪喰らいの黒鋏',
        stats: { hp: 105, atk: 78, def: 15, spd: 10, crit: 12 },
        passiveId: 'dark_vamp',
        desc: '常時吸血+12%＆会心発生で自身のATK+8%（重複可）'
      }
    },
    {
      id: 'nox',
      name: 'ノクス',
      title: '終焉の災厄竜',
      attr: 'dark',
      races: ['dragon', 'monster'],
      role: 'dealer',
      unlock: { type: 'boss', stageId: 'boss-dark', label: '深闇ボス初討伐' },
      base: { hp: 430, atk: 112, def: 40, spd: 110, crit: 0.23 },
      skills: [
        { id: 's1', name: '災厄の爪', cd: 0, type: 'dmg', mult: 1.24, chaos: 9, desc: '闇の重単体攻撃' },
        { id: 's2', name: 'アビスブレス', cd: 2, type: 'aoe', mult: 1.75, chaos: 16, debuff: 'defDown', desc: '敵全体闇ブレス＋防御低下' },
        { id: 's3', name: 'メテオ・カタストロフ', cd: 3, type: 'aoe', mult: 2.45, chaos: 25, desc: '敵全体へ壊滅的闇ダメージ' }
      ],
      exWeapon: {
        name: '終焉竜の黒牙',
        stats: { hp: 135, atk: 88, def: 20, spd: 8, crit: 12 },
        passiveId: 'abyss_echo',
        desc: '弱体状態の敵に対する与ダメージ+40%＆撃破時に再行動ゲージ+50%'
      }
    },
    {
      id: 'mare',
      name: 'メア',
      title: '悪夢オルゴール魔',
      attr: 'dark',
      races: ['monster'],
      role: 'supporter',
      unlock: { type: 'stage', stageId: 'w3-1', label: '3-1 初回クリア' },
      base: { hp: 405, atk: 80, def: 38, spd: 120, crit: 0.16 },
      skills: [
        { id: 's1', name: '不協和音', cd: 0, type: 'dmg', mult: 1.0, chaos: 9, debuff: 'atkDown', desc: '単体攻撃＋ATK低下' },
        { id: 's2', name: 'カースララバイ', cd: 2, type: 'debuffAll', debuff: 'defDown', mult: 1.20, chaos: 16, pushBack: 18, desc: '敵全体防御低下＋ゲージ-18%' },
        { id: 's3', name: 'ナイトメア交響曲', cd: 3, type: 'debuffAll', debuff: 'atkDown', mult: 1.65, chaos: 24, buff: 'atkUp', desc: '敵全体弱体＋味方全体ATK上昇' }
      ],
      exWeapon: {
        name: '悪夢のぜんまいオルゴール',
        stats: { hp: 140, atk: 54, def: 22, spd: 14, crit: 7 },
        passiveId: 'curse_amp',
        desc: '敵に付与する全弱体の効果量+30%＆敵の行動ごとに闇の呪いダメージ'
      }
    },

    // ================= 無属性 (null) =================
    {
      id: 'mikoto',
      name: 'ミコト',
      title: '因果律のダイス使い',
      attr: 'null',
      races: ['human'],
      role: 'supporter',
      unlock: { type: 'stage', stageId: 'w4-4', label: '4-4 初回クリア' },
      base: { hp: 420, atk: 84, def: 44, spd: 124, crit: 0.18 },
      skills: [
        { id: 's1', name: 'ラッキーロール', cd: 0, type: 'chaos', mult: 1.15, chaos: 14, desc: 'ランダム倍率の無属性撃＋カオス大幅増加' },
        { id: 's2', name: '運命書き換え', cd: 2, type: 'buffAll', buff: 'atkUp', chaos: 22, pushGauge: 20, desc: '味方全体ATK上昇＋ゲージ加速＋カオス+22' },
        { id: 's3', name: '万象カオスダイス', cd: 3, type: 'chaos', mult: 2.0, chaos: 36, desc: '敵全体へランダム大爆発＋即座にカオス急加速' }
      ],
      exWeapon: {
        name: '因果律の万象ダイス',
        stats: { hp: 150, atk: 58, def: 26, spd: 15, crit: 9 },
        passiveId: 'chaos_master',
        desc: 'はちゃめちゃ異変の効果時間+3秒＆異変中の味方全ダメージ+25%'
      }
    },
    {
      id: 'mechako',
      name: 'メチャコ',
      title: '混沌マスコット魔機',
      attr: 'null',
      races: ['monster', 'machine'],
      role: 'dealer',
      unlock: { type: 'stage', stageId: 'w1-2', label: '1-2 初回クリア' },
      base: { hp: 400, atk: 100, def: 42, spd: 116, crit: 0.21 },
      skills: [
        { id: 's1', name: 'どたばたスパナ', cd: 0, type: 'dmg', mult: 1.18, chaos: 11, desc: '無属性スマッシュ＋カオス蓄積' },
        { id: 's2', name: 'はちゃめちゃ連打', cd: 2, type: 'multi', hits: 4, mult: 0.58, chaos: 18, desc: 'ランダムな敵へ4連打＋毎回属性変化' },
        { id: 's3', name: 'カオスビッグバン', cd: 3, type: 'aoe', mult: 2.20, chaos: 30, desc: '敵全体へカオス倍率で爆裂ダメージ' }
      ],
      exWeapon: {
        name: 'はちゃめちゃレンチ∞',
        stats: { hp: 120, atk: 80, def: 22, spd: 11, crit: 11 },
        passiveId: 'chaos_overdrive',
        desc: 'はちゃめちゃ異変中、自身の攻撃回数が1回追加され与ダメ+30%'
      }
    },
    {
      id: 'zeroone',
      name: 'ゼロワン',
      title: '特異点キューブ機',
      attr: 'null',
      races: ['machine'],
      role: 'tank',
      unlock: { type: 'stage', stageId: 'w5-4', label: '5-4 初回クリア' },
      base: { hp: 650, atk: 68, def: 74, spd: 100, crit: 0.14 },
      skills: [
        { id: 's1', name: 'キューブクラッシュ', cd: 0, type: 'dmg', mult: 1.12, chaos: 10, selfShieldPct: 0.12, desc: '無属性攻撃＋自身障壁＋カオス蓄積' },
        { id: 's2', name: '絶対領域フィールド', cd: 2, type: 'taunt', shieldPct: 0.34, chaos: 18, buff: 'defUp', desc: '2T挑発＋味方全体特大障壁＋防御上昇' },
        { id: 's3', name: '特異点リセット砲', cd: 3, type: 'aoe', mult: 1.85, chaos: 28, pushBack: 25, desc: '敵全体攻撃＋敵ゲージ後退＋カオス爆増' }
      ],
      exWeapon: {
        name: '特異点キューブΩ',
        stats: { hp: 280, atk: 38, def: 60, spd: 8, crit: 5 },
        passiveId: 'singularity_core',
        desc: 'はちゃめちゃ異変発動時、味方全体へ最大HP20%の障壁＆HP15%回復'
      }
    }
  ];

  // 常に厳格ソート順で保持（炎水風光闇無 -> 主種族 -> 第2種族 -> ロール）
  HS.UNITS = HS.CONST.sortUnitsCanonical(RAW_UNITS);
  HS.UNITS_MAP = Object.fromEntries(HS.UNITS.map((u) => [u.id, u]));
})(window);
