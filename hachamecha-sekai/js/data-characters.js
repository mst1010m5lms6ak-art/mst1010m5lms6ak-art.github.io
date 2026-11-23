(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  /**
   * 24 unique characters spanning all 6 elements, all 5 races (including dual-race),
   * and all 4 roles. Every character has 3 skills and 1 exclusive weapon.
   */
  const RAW_CHARACTERS = [
    // ================= FIRE =================
    {
      id: "f_hum_tank",
      name: "ブレイズ鉄壁",
      title: "灼熱の盾守",
      element: "fire",
      races: ["human"],
      role: "tank",
      starter: true,
      unlock: { type: "starter" },
      base: { hp: 1480, atk: 122, def: 138, spd: 96, crit: 12 },
      skills: [
        { name: "紅蓮打ち", ct: 0, kind: "atk", target: "single", power: 1.05, chaos: 7, desc: "単体攻撃＋小障壁" , selfShield: 0.08 },
        { name: "焦熱要塞", ct: 3, kind: "buff", target: "self", power: 0, chaos: 12, shieldPct: 0.28, taunt: 2, defUp: 2, desc: "大障壁＋挑発＋防御UP" },
        { name: "爆炎反射陣", ct: 4, kind: "atk", target: "all", power: 1.45, chaos: 16, teamShield: 0.16, burn: 2, desc: "全体炎撃＋味方障壁＋火傷" }
      ],
      exWeapon: { name: "焦土の巨盾『イグニス』", costCore: 6, costGold: 1200, hpPct: 24, defPct: 26, bonusDesc: "障壁倍率+35%・反撃炎上" }
    },
    {
      id: "f_hum_dra_dlr",
      name: "カグラ竜炎",
      title: "混血の紅刃",
      element: "fire",
      races: ["human", "dragon"],
      role: "dealer",
      starter: true,
      unlock: { type: "starter" },
      base: { hp: 1020, atk: 184, def: 82, spd: 112, crit: 24 },
      skills: [
        { name: "竜爪斬", ct: 0, kind: "atk", target: "single", power: 1.18, chaos: 8, desc: "鋭い火炎斬撃" },
        { name: "双血連舞", ct: 2, kind: "atk", target: "multi", hits: 3, power: 0.72, chaos: 12, burn: 2, desc: "ランダム3連撃＋火傷" },
        { name: "業火滅界斬", ct: 4, kind: "atk", target: "all", power: 2.05, chaos: 20, critBonus: 25, desc: "全体超火力・会心率上昇" }
      ],
      exWeapon: { name: "紅竜断刀『カグツチ』", costCore: 6, costGold: 1200, atkPct: 28, critAdd: 12, bonusDesc: "火傷相手へ与ダメ+35%" }
    },
    {
      id: "f_dra_dem_dlr",
      name: "マグマ暴君",
      title: "溶岩の双角",
      element: "fire",
      races: ["dragon", "demon"],
      role: "dealer",
      starter: false,
      unlock: { type: "cost", crystal: 40, gold: 900, stage: "j_1_5" },
      base: { hp: 1120, atk: 198, def: 86, spd: 104, crit: 26 },
      skills: [
        { name: "熔岩砕き", ct: 0, kind: "atk", target: "single", power: 1.22, chaos: 9, desc: "防御を削る重打撃", defDown: 2 },
        { name: "混沌噴火", ct: 3, kind: "atk", target: "all", power: 1.55, chaos: 16, burn: 2, desc: "全体炎撃＋火傷付与" },
        { name: "終焉メテオ", ct: 5, kind: "atk", target: "single", power: 3.15, chaos: 24, ignoreDef: 0.35, desc: "防御貫通の単体極大砲" }
      ],
      exWeapon: { name: "火山核槌『ヴェスヴィオ』", costCore: 10, costGold: 2200, atkPct: 34, critAdd: 10, bonusDesc: "奥義時さらに全体余波追撃" }
    },
    {
      id: "f_fai_sup",
      name: "フレア舞姫",
      title: "火の粉の祝祭",
      element: "fire",
      races: ["fairy"],
      role: "supporter",
      starter: false,
      unlock: { type: "cost", crystal: 30, gold: 650 },
      base: { hp: 980, atk: 136, def: 88, spd: 126, crit: 15 },
      skills: [
        { name: "火花弾", ct: 0, kind: "atk", target: "single", power: 1.0, chaos: 10, desc: "高速炎弾＋カオス加速" },
        { name: "熱狂リズム", ct: 3, kind: "buff", target: "allies", power: 0, chaos: 15, atkUp: 2, spdUp: 2, desc: "味方全員の攻撃＆速度UP" },
        { name: "カーニバル炎舞", ct: 4, kind: "atk", target: "all", power: 1.4, chaos: 22, atkUpAll: 2, atbBoost: 22, desc: "全体炎撃＋味方行動加速" }
      ],
      exWeapon: { name: "祝祭炎扇『サラマンダ』", costCore: 8, costGold: 1600, spdAdd: 18, atkPct: 18, bonusDesc: "バフ発動時に味方カオス+12" }
    },

    // ================= WATER =================
    {
      id: "w_hum_fai_hlr",
      name: "アクア雫",
      title: "蒼泉の双翼",
      element: "water",
      races: ["human", "fairy"],
      role: "healer",
      starter: true,
      unlock: { type: "starter" },
      base: { hp: 1180, atk: 134, def: 96, spd: 118, crit: 10 },
      skills: [
        { name: "水滴弾", ct: 0, kind: "atk", target: "single", power: 0.98, chaos: 7, healLowest: 0.65, desc: "攻撃しつつ最小HP味方を回復" },
        { name: "湧水の癒し", ct: 2, kind: "heal", target: "allies", power: 1.25, chaos: 11, cleanse: 1, desc: "味方全体回復＋弱体解除" },
        { name: "蒼海オーロラ", ct: 4, kind: "heal", target: "allies", power: 1.85, chaos: 16, defUpAll: 2, desc: "大回復＋味方防御UP" }
      ],
      exWeapon: { name: "蒼泉の聖杯『ウンディーネ』", costCore: 6, costGold: 1200, hpPct: 22, healPct: 30, bonusDesc: "回復時に味方行動ゲージ+10%" }
    },
    {
      id: "w_dra_tank",
      name: "グラシア鱗鎧",
      title: "氷河の巨竜",
      element: "water",
      races: ["dragon"],
      role: "tank",
      starter: false,
      unlock: { type: "cost", crystal: 35, gold: 800 },
      base: { hp: 1560, atk: 128, def: 144, spd: 94, crit: 12 },
      skills: [
        { name: "氷尾撃", ct: 0, kind: "atk", target: "single", power: 1.05, chaos: 7, atkDown: 2, desc: "単体氷撃＋敵攻撃DOWN" },
        { name: "絶対零壁", ct: 3, kind: "buff", target: "self", power: 0, chaos: 12, shieldPct: 0.34, taunt: 2, teamShield: 0.14, desc: "強固障壁＋全体小障壁" },
        { name: "ブリザード封鎖", ct: 4, kind: "atk", target: "all", power: 1.48, chaos: 17, atkDown: 2, slow: 2, desc: "全体氷結＋攻撃・速度DOWN" }
      ],
      exWeapon: { name: "氷竜殻盾『レヴィア』", costCore: 9, costGold: 1800, hpPct: 28, defPct: 24, bonusDesc: "被弾時に攻撃者の速度を低下" }
    },
    {
      id: "w_dem_dlr",
      name: "クラーケン渦",
      title: "深海の触腕魔",
      element: "water",
      races: ["demon"],
      role: "dealer",
      starter: true,
      unlock: { type: "starter" },
      base: { hp: 1080, atk: 176, def: 86, spd: 110, crit: 22 },
      skills: [
        { name: "渦潮鞭", ct: 0, kind: "atk", target: "single", power: 1.14, chaos: 8, desc: "水圧の一閃" },
        { name: "深淵引き込み", ct: 3, kind: "atk", target: "all", power: 1.48, chaos: 14, defDown: 2, desc: "全体水撃＋防御DOWN" },
        { name: "メイルシュトローム", ct: 4, kind: "atk", target: "multi", hits: 4, power: 0.8, chaos: 20, vamp: 0.25, desc: "4連渦撃＋HP吸収" }
      ],
      exWeapon: { name: "深海触刃『アビス』", costCore: 8, costGold: 1500, atkPct: 28, critAdd: 10, bonusDesc: "防御DOWN敵へダメージ+30%" }
    },
    {
      id: "w_mac_sup",
      name: "ハイドロ機関",
      title: "水圧制御コア",
      element: "water",
      races: ["machine"],
      role: "supporter",
      starter: false,
      unlock: { type: "cost", crystal: 45, gold: 1000, stage: "j_2_3" },
      base: { hp: 1240, atk: 132, def: 122, spd: 116, crit: 14 },
      skills: [
        { name: "高圧ジェット", ct: 0, kind: "atk", target: "single", power: 1.05, chaos: 9, desc: "高圧水撃＋カオス増加" },
        { name: "冷却オーバークロック", ct: 3, kind: "buff", target: "allies", power: 0, chaos: 15, spdUp: 2, teamShield: 0.16, desc: "味方速度UP＋全体障壁" },
        { name: "流体演算波", ct: 4, kind: "atk", target: "all", power: 1.45, chaos: 19, defDown: 2, atbBoost: 24, desc: "全体防御DOWN＋味方加速" }
      ],
      exWeapon: { name: "水圧制御盤『ネプチューン』", costCore: 10, costGold: 2200, defPct: 22, spdAdd: 16, bonusDesc: "開幕味方全員にHP15%障壁" }
    },

    // ================= WIND =================
    {
      id: "g_hum_sup",
      name: "ゼファー笛師",
      title: "疾風の指揮者",
      element: "wind",
      races: ["human"],
      role: "supporter",
      starter: true,
      unlock: { type: "starter" },
      base: { hp: 1040, atk: 140, def: 90, spd: 130, crit: 18 },
      skills: [
        { name: "風切り矢", ct: 0, kind: "atk", target: "single", power: 1.04, chaos: 9, desc: "最速の風撃" },
        { name: "追い風行進", ct: 2, kind: "buff", target: "allies", power: 0, chaos: 14, spdUp: 2, atkUp: 2, atbBoost: 18, desc: "全体速度＆攻撃UP＋加速" },
        { name: "テンペスト交響", ct: 4, kind: "atk", target: "all", power: 1.52, chaos: 20, critUpAll: 2, desc: "全体暴風＋味方会心UP" }
      ],
      exWeapon: { name: "疾風長笛『シルフィード』", costCore: 6, costGold: 1200, spdAdd: 22, atkPct: 16, bonusDesc: "追い風行進の行動加速+12%" }
    },
    {
      id: "g_dra_fai_dlr",
      name: "エメラルド翔",
      title: "翠風の妖竜",
      element: "wind",
      races: ["dragon", "fairy"],
      role: "dealer",
      starter: false,
      unlock: { type: "cost", crystal: 50, gold: 1200, stage: "j_2_5" },
      base: { hp: 1010, atk: 186, def: 80, spd: 134, crit: 28 },
      skills: [
        { name: "翠鱗連斬", ct: 0, kind: "atk", target: "multi", hits: 2, power: 0.62, chaos: 9, desc: "高速2連風撃" },
        { name: "竜巻ステップ", ct: 2, kind: "atk", target: "single", power: 1.85, chaos: 13, selfAtb: 35, desc: "高威力単体＋自身行動+35%" },
        { name: "翠嵐乱舞", ct: 4, kind: "atk", target: "multi", hits: 5, power: 0.68, chaos: 22, critBonus: 20, desc: "超高速ランダム5連撃" }
      ],
      exWeapon: { name: "翠風双翼『ガルーダ』", costCore: 10, costGold: 2400, atkPct: 26, spdAdd: 20, critAdd: 12, bonusDesc: "会心発生時に自身行動+15%" }
    },
    {
      id: "g_fai_mac_hlr",
      name: "エアロ整備精",
      title: "風車仕掛けの癒手",
      element: "wind",
      races: ["fairy", "machine"],
      role: "healer",
      starter: false,
      unlock: { type: "cost", crystal: 40, gold: 950 },
      base: { hp: 1160, atk: 128, def: 114, spd: 122, crit: 10 },
      skills: [
        { name: "微風リペア", ct: 0, kind: "heal", target: "lowest", power: 1.15, chaos: 8, desc: "最小HP味方を素早く修復" },
        { name: "ナノミスト風", ct: 3, kind: "heal", target: "allies", power: 1.35, chaos: 12, teamShield: 0.14, desc: "全体回復＋保護膜展開" },
        { name: "サイクロン再起動", ct: 4, kind: "heal", target: "allies", power: 1.7, chaos: 18, cleanse: 2, atbBoost: 20, desc: "全体大修復＋浄化＋加速" }
      ],
      exWeapon: { name: "風車修復炉『エオルス』", costCore: 9, costGold: 1900, healPct: 28, defPct: 20, bonusDesc: "回復対象に防御UP1T付与" }
    },
    {
      id: "g_mac_tank",
      name: "タービン重装",
      title: "暴風装甲機",
      element: "wind",
      races: ["machine"],
      role: "tank",
      starter: false,
      unlock: { type: "cost", crystal: 45, gold: 1050 },
      base: { hp: 1520, atk: 124, def: 148, spd: 106, crit: 12 },
      skills: [
        { name: "送風タックル", ct: 0, kind: "atk", target: "single", power: 1.04, chaos: 8, slow: 2, desc: "体当たり＋敵速度DOWN" },
        { name: "エアバリア展開", ct: 3, kind: "buff", target: "self", power: 0, chaos: 12, shieldPct: 0.32, taunt: 2, spdUpSelf: 2, desc: "高耐久障壁＋挑発＋加速" },
        { name: "真空パージ", ct: 4, kind: "atk", target: "all", power: 1.5, chaos: 17, teamShield: 0.18, desc: "全体衝撃波＋全体障壁" }
      ],
      exWeapon: { name: "暴風装甲板『タイフーン』", costCore: 9, costGold: 2000, hpPct: 26, defPct: 26, bonusDesc: "障壁維持中、被ダメ-20%" }
    },

    // ================= LIGHT =================
    {
      id: "l_hum_mac_tank",
      name: "ソラリス機甲",
      title: "白光の聖騎士",
      element: "light",
      races: ["human", "machine"],
      role: "tank",
      starter: false,
      unlock: { type: "cost", crystal: 55, gold: 1300, stage: "j_3_3" },
      base: { hp: 1620, atk: 132, def: 154, spd: 100, crit: 14 },
      skills: [
        { name: "光盾強打", ct: 0, kind: "atk", target: "single", power: 1.1, chaos: 8, selfShield: 0.1, desc: "閃光打撃＋自身障壁" },
        { name: "聖光ドーム", ct: 3, kind: "buff", target: "allies", power: 0, chaos: 14, teamShield: 0.24, taunt: 2, defUpAll: 2, desc: "味方全体障壁＋挑発＋防御UP" },
        { name: "プリズム審判", ct: 4, kind: "atk", target: "all", power: 1.68, chaos: 19, healAll: 0.75, desc: "全体光撃＋味方全体小回復" }
      ],
      exWeapon: { name: "聖光機盾『ヘリオス』", costCore: 12, costGold: 2600, hpPct: 30, defPct: 28, bonusDesc: "聖光ドーム時に弱体も全解除" }
    },
    {
      id: "l_dra_dlr",
      name: "ルミナス星竜",
      title: "天穹の煌鱗",
      element: "light",
      races: ["dragon"],
      role: "dealer",
      starter: false,
      unlock: { type: "cost", crystal: 65, gold: 1600, stage: "j_3_5" },
      base: { hp: 1140, atk: 204, def: 92, spd: 116, crit: 26 },
      skills: [
        { name: "星光ブレス", ct: 0, kind: "atk", target: "single", power: 1.24, chaos: 9, desc: "貫通する閃光吐息" },
        { name: "天輪連射", ct: 2, kind: "atk", target: "multi", hits: 3, power: 0.78, chaos: 14, desc: "光輪3連撃" },
        { name: "スーパーノヴァ", ct: 5, kind: "atk", target: "all", power: 2.38, chaos: 24, ignoreDef: 0.3, desc: "防御貫通の全体超新星" }
      ],
      exWeapon: { name: "天穹竜角『アルタイル』", costCore: 12, costGold: 2800, atkPct: 34, critAdd: 14, bonusDesc: "HP70%以上で与ダメージ+25%" }
    },
    {
      id: "l_fai_hlr",
      name: "セラフ光精",
      title: "祝福の羽根",
      element: "light",
      races: ["fairy"],
      role: "healer",
      starter: false,
      unlock: { type: "cost", crystal: 50, gold: 1100 },
      base: { hp: 1200, atk: 142, def: 98, spd: 124, crit: 12 },
      skills: [
        { name: "光粒シャワー", ct: 0, kind: "atk", target: "single", power: 1.0, chaos: 8, healLowest: 0.75, desc: "光撃＋負傷味方を回復" },
        { name: "聖域コーラス", ct: 2, kind: "heal", target: "allies", power: 1.48, chaos: 13, atkUpAll: 2, desc: "全体回復＋味方攻撃UP" },
        { name: "リザレクション光", ct: 5, kind: "heal", target: "allies", power: 2.2, chaos: 18, revive: true, cleanse: 2, desc: "全体超回復＋戦闘不能を蘇生" }
      ],
      exWeapon: { name: "天羽の聖杖『セラフィム』", costCore: 11, costGold: 2400, healPct: 36, spdAdd: 14, bonusDesc: "全体回復時に会心UPも付与" }
    },
    {
      id: "l_hum_sup",
      name: "クロノ司祭",
      title: "秒針の調律者",
      element: "light",
      races: ["human"],
      role: "supporter",
      starter: true,
      unlock: { type: "starter" },
      base: { hp: 1080, atk: 144, def: 96, spd: 124, crit: 16 },
      skills: [
        { name: "光針投擲", ct: 0, kind: "atk", target: "single", power: 1.06, chaos: 9, desc: "光の針で穿つ" },
        { name: "時間加速陣", ct: 3, kind: "buff", target: "allies", power: 0, chaos: 16, atbBoost: 30, critUpAll: 2, desc: "味方全体ゲージ+30%＆会心UP" },
        { name: "白銀クロック", ct: 4, kind: "atk", target: "all", power: 1.58, chaos: 20, slow: 2, atkUpAll: 2, desc: "全体光撃＋敵鈍足＋味方攻撃UP" }
      ],
      exWeapon: { name: "永遠懐中時計『クロノス』", costCore: 8, costGold: 1800, spdAdd: 20, hpPct: 18, bonusDesc: "味方行動ゲージ加速量さらに+12%" }
    },

    // ================= DARK =================
    {
      id: "d_hum_dem_dlr",
      name: "ノクス影刃",
      title: "夜魔の双影",
      element: "dark",
      races: ["human", "demon"],
      role: "dealer",
      starter: false,
      unlock: { type: "cost", crystal: 60, gold: 1400, stage: "j_4_2" },
      base: { hp: 1040, atk: 208, def: 78, spd: 126, crit: 32 },
      skills: [
        { name: "影縫い刃", ct: 0, kind: "atk", target: "single", power: 1.2, chaos: 9, critBonus: 15, desc: "高会心の暗黒斬" },
        { name: "夜霧連閃", ct: 2, kind: "atk", target: "multi", hits: 3, power: 0.78, chaos: 14, vamp: 0.2, desc: "吸収付き3連闇撃" },
        { name: "黒蝕処刑", ct: 4, kind: "atk", target: "single", power: 3.35, chaos: 22, execute: true, desc: "低HP敵へ特大ダメージ処刑" }
      ],
      exWeapon: { name: "夜魔双短剣『エレボス』", costCore: 12, costGold: 2600, atkPct: 32, critAdd: 16, bonusDesc: "会心ダメージ+40%・常時吸血10%" }
    },
    {
      id: "d_dem_fai_sup",
      name: "ミスティ呪精",
      title: "悪戯の黒霧",
      element: "dark",
      races: ["demon", "fairy"],
      role: "supporter",
      starter: false,
      unlock: { type: "cost", crystal: 55, gold: 1300 },
      base: { hp: 1020, atk: 154, def: 86, spd: 128, crit: 18 },
      skills: [
        { name: "呪弾ぽいっ", ct: 0, kind: "atk", target: "single", power: 1.05, chaos: 11, defDown: 2, desc: "防御DOWN＆カオス加速" },
        { name: "はちゃめちゃ呪詛", ct: 3, kind: "atk", target: "all", power: 1.32, chaos: 18, atkDown: 2, defDown: 2, burn: 2, desc: "全体弱体3種ばら撒き" },
        { name: "カオス狂宴", ct: 4, kind: "buff", target: "allies", power: 0, chaos: 30, atkUp: 2, critUpAll: 2, spdUp: 2, desc: "カオス大幅蓄積＋味方全強化" }
      ],
      exWeapon: { name: "黒霧の道化杖『ロキ』", costCore: 11, costGold: 2400, spdAdd: 18, atkPct: 24, bonusDesc: "弱体中の敵への味方全体与ダメ+18%" }
    },
    {
      id: "d_dem_mac_tank",
      name: "ドレッド骸機",
      title: "呪鋼の要塞",
      element: "dark",
      races: ["demon", "machine"],
      role: "tank",
      starter: false,
      unlock: { type: "cost", crystal: 65, gold: 1500, stage: "j_4_5" },
      base: { hp: 1680, atk: 138, def: 150, spd: 92, crit: 14 },
      skills: [
        { name: "呪鉄プレス", ct: 0, kind: "atk", target: "single", power: 1.12, chaos: 9, vamp: 0.3, desc: "吸収付き重圧撃" },
        { name: "冥鋼ガード", ct: 3, kind: "buff", target: "self", power: 0, chaos: 15, shieldPct: 0.36, taunt: 2, defUp: 2, desc: "超厚障壁＋挑発＋防御UP" },
        { name: "アビス吸収波", ct: 4, kind: "atk", target: "all", power: 1.65, chaos: 20, vamp: 0.35, atkDown: 2, desc: "全体闇撃＋大吸収＋敵弱体" }
      ],
      exWeapon: { name: "冥鉄外骨格『タルタロス』", costCore: 13, costGold: 2900, hpPct: 32, defPct: 26, bonusDesc: "被弾時カオスさらに+6・自己再生" }
    },
    {
      id: "d_dem_hlr",
      name: "ブラッド聖女",
      title: "紅月の逆癒",
      element: "dark",
      races: ["demon"],
      role: "healer",
      starter: false,
      unlock: { type: "cost", crystal: 60, gold: 1450 },
      base: { hp: 1220, atk: 156, def: 94, spd: 118, crit: 16 },
      skills: [
        { name: "紅月ドレイン", ct: 0, kind: "atk", target: "single", power: 1.08, chaos: 9, healAll: 0.45, desc: "敵を削り味方全員を微回復" },
        { name: "闇血の輸癒", ct: 2, kind: "heal", target: "allies", power: 1.45, chaos: 13, critUpAll: 2, desc: "全体回復＋会心UP付与" },
        { name: "深紅サバト", ct: 4, kind: "atk", target: "all", power: 1.72, chaos: 20, healAll: 1.35, desc: "全体闇攻撃＋味方全体大回復" }
      ],
      exWeapon: { name: "紅月血盃『カーミラ』", costCore: 12, costGold: 2600, atkPct: 24, healPct: 32, bonusDesc: "攻撃連動回復量が+40%強化" }
    },

    // ================= NONE (VOID / CHAOS) =================
    {
      id: "n_hum_dlr",
      name: "ゼロ無頼",
      title: "無属性の異端剣",
      element: "none",
      races: ["human"],
      role: "dealer",
      starter: false,
      unlock: { type: "cost", crystal: 45, gold: 1000 },
      base: { hp: 1140, atk: 192, def: 92, spd: 120, crit: 28 },
      skills: [
        { name: "無拍子斬", ct: 0, kind: "atk", target: "single", power: 1.2, chaos: 10, desc: "相性に左右されない斬撃" },
        { name: "無我三段", ct: 2, kind: "atk", target: "multi", hits: 3, power: 0.78, chaos: 14, ignoreDef: 0.25, desc: "防御一部無視の3連斬" },
        { name: "虚無一閃・極", ct: 4, kind: "atk", target: "all", power: 2.18, chaos: 22, ignoreDef: 0.35, desc: "全体防御貫通の極限斬" }
      ],
      exWeapon: { name: "無銘白刀『ゼロ式』", costCore: 10, costGold: 2200, atkPct: 30, critAdd: 14, bonusDesc: "カオス法則発動中、与ダメ+30%" }
    },
    {
      id: "n_dra_mac_dlr",
      name: "オメガ機竜",
      title: "究極混沌兵器",
      element: "none",
      races: ["dragon", "machine"],
      role: "dealer",
      starter: false,
      unlock: { type: "cost", crystal: 90, gold: 2400, stage: "j_5_5" },
      base: { hp: 1280, atk: 218, def: 112, spd: 114, crit: 30 },
      skills: [
        { name: "粒子レーザー", ct: 0, kind: "atk", target: "single", power: 1.26, chaos: 10, ignoreDef: 0.2, desc: "防御貫通レーザー" },
        { name: "全弾ミサイル嵐", ct: 3, kind: "atk", target: "multi", hits: 5, power: 0.72, chaos: 18, burn: 2, desc: "5連ミサイル＋火傷" },
        { name: "はちゃめちゃ砲Ω", ct: 5, kind: "atk", target: "all", power: 2.62, chaos: 28, ignoreDef: 0.4, defDown: 2, desc: "世界を揺らす極大混沌砲" }
      ],
      exWeapon: { name: "混沌炉心『オメガドライブ』", costCore: 16, costGold: 3800, atkPct: 38, critAdd: 15, spdAdd: 12, bonusDesc: "全ての技でカオス蓄積2倍" }
    },
    {
      id: "n_fai_sup",
      name: "パズル道化",
      title: "法則書き換え精",
      element: "none",
      races: ["fairy"],
      role: "supporter",
      starter: false,
      unlock: { type: "cost", crystal: 70, gold: 1800, stage: "j_4_5" },
      base: { hp: 1080, atk: 152, def: 96, spd: 136, crit: 20 },
      skills: [
        { name: "ダイス投げ", ct: 0, kind: "atk", target: "single", power: 1.15, chaos: 14, desc: "ランダム高カオス弾" },
        { name: "ルールシャッフル", ct: 3, kind: "buff", target: "allies", power: 0, chaos: 26, atkUp: 2, spdUp: 2, atbBoost: 24, desc: "全体強化＋カオス大加速" },
        { name: "カオスルーレット", ct: 4, kind: "atk", target: "all", power: 1.75, chaos: 35, triggerLaw: true, desc: "全体攻撃＋即座にカオス法則発動" }
      ],
      exWeapon: { name: "無限サイコロ『パラドクス』", costCore: 14, costGold: 3200, spdAdd: 24, hpPct: 20, bonusDesc: "カオス法則の持続ターン+2" }
    },
    {
      id: "n_mac_hlr",
      name: "ユニティ母艦",
      title: "万能修復コア",
      element: "none",
      races: ["machine"],
      role: "healer",
      starter: false,
      unlock: { type: "cost", crystal: 75, gold: 1900, stage: "j_5_2" },
      base: { hp: 1340, atk: 142, def: 132, spd: 116, crit: 12 },
      skills: [
        { name: "ドローン支援", ct: 0, kind: "heal", target: "lowest", power: 1.2, chaos: 9, selfShield: 0.08, desc: "最小HP回復＋自身障壁" },
        { name: "全艦フィールド", ct: 3, kind: "heal", target: "allies", power: 1.48, chaos: 14, teamShield: 0.2, cleanse: 1, desc: "全体回復＋全体障壁＋浄化" },
        { name: "オーバーホールΩ", ct: 5, kind: "heal", target: "allies", power: 2.35, chaos: 20, revive: true, defUpAll: 2, atkUpAll: 2, desc: "蘇生＋超回復＋攻防UP" }
      ],
      exWeapon: { name: "母艦中枢『ユニティコア』", costCore: 15, costGold: 3400, healPct: 38, defPct: 26, bonusDesc: "超過回復の障壁変換率1.5倍" }
    }
  ];

  // Ensure canonical order immediately via CONST.sortCharacters
  const CHARACTERS = HS.CONST.sortCharacters(RAW_CHARACTERS);
  const CHAR_MAP = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

  HS.CHARS = {
    LIST: CHARACTERS,
    MAP: CHAR_MAP,
    get(id) {
      return CHAR_MAP[id] || null;
    }
  };
})(window);
