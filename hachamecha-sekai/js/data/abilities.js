(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  var D = HS.Data = HS.Data || {};

  D.ABILITY_TIER_COSTS = {
    1: { gold: 0,    matId: null,     matQty: 0 },
    2: { gold: 600,  matId: 'mat_a1', matQty: 4 },
    3: { gold: 1500, matId: 'mat_a2', matQty: 6 },
    4: { gold: 3200, matId: 'mat_a3', matQty: 8 },
    5: { gold: 6000, matId: 'mat_a4', matQty: 10 }
  };

  // 各ロール 5段階 × 5択 = 計100種
  var ROLE_SPECS = {
    tank: {
      styles: [
        { tag: '鉄壁型', icon: '🛡️' },
        { tag: '反撃型', icon: '↺'  },
        { tag: '庇護型', icon: '🤝' },
        { tag: '妨害型', icon: '⛓️' },
        { tag: '再生型', icon: '💚' }
      ],
      tiers: [
        // Tier 1
        [
          { name: '鋼鉄の外殻', kana: 'こうてつのがいかく', desc: '防御力+12%、HP+6%。', mod: { defPct: 0.12, hpPct: 0.06 } },
          { name: '応酬の構え', kana: 'おうしゅうのかまえ', desc: '被弾時に18%で反撃する。', mod: { counterRate: 0.18, defPct: 0.05 } },
          { name: '前衛の盾役', kana: 'ぜんえいのたてやく', desc: '開幕に最大HP12%の防護壁を獲得。', mod: { startShieldPct: 0.12, hpPct: 0.05 } },
          { name: '威圧の眼光', kana: 'いあつのがんこう',   desc: '状態異常付与率+12%、防御+6%。', mod: { ailmentRate: 0.12, defPct: 0.06 } },
          { name: '不屈の呼吸', kana: 'ふくつのこきゅう',   desc: '行動開始時に最大HP4%回復、耐性+8%。', mod: { turnRegenPct: 0.04, res: 0.08 } }
        ],
        // Tier 2
        [
          { name: '重装の要塞', kana: 'じゅうそうのようさい', desc: '被ダメージ-8%、防御+12%。', mod: { dmgTakenPct: -0.08, defPct: 0.12 } },
          { name: '棘鎧の報復', kana: 'とげよろいのほうふく', desc: '反撃率+20%、反撃威力+20%。', mod: { counterRate: 0.20, counterPower: 0.20 } },
          { name: '守護者の誓い', kana: 'しゅごしゃのちかい', desc: '22%の確率で味方単体への攻撃を庇護。', mod: { coverRate: 0.22, startShieldPct: 0.10 } },
          { name: '足止めの鎖', kana: 'あしどめのくさり',   desc: '敵開幕防御低下1T、耐性+10%。', mod: { enemyStartDefDown: 1, res: 0.10, ailmentRate: 0.10 } },
          { name: '生命の鼓動', kana: 'せいめいのこどう',   desc: 'WAVE開始HP12%回復、被回復量+15%。', mod: { waveHealPct: 0.12, healTakenPct: 0.15 } }
        ],
        // Tier 3
        [
          { name: '不動明王陣', kana: 'ふどうみょうおうじん', desc: 'HP+16%、防御+16%、耐性+12%。', mod: { hpPct: 0.16, defPct: 0.16, res: 0.12 } },
          { name: '闘気の逆襲', kana: 'とうきのぎゃくしゅう', desc: '被弾時ゲージ+10%、反撃率+18%。', mod: { gaugeOnHit: 0.10, counterRate: 0.18, atkPct: 0.10 } },
          { name: '鉄壁の防陣', kana: 'てっぺきのぼうじん', desc: '開幕防護壁20%、庇護率+18%。', mod: { startShieldPct: 0.20, coverRate: 0.18 } },
          { name: '混沌の重圧', kana: 'こんとんのじゅうあつ', desc: '弱体持続+1ターン、被ダメ-6%。', mod: { debuffDuration: 1, dmgTakenPct: -0.06, ailmentRate: 0.14 } },
          { name: '竜血の再生', kana: 'りゅうけつのさいせい', desc: '行動開始HP7%回復、最大HP+14%。', mod: { turnRegenPct: 0.07, hpPct: 0.14 } }
        ],
        // Tier 4
        [
          { name: '絶対防壁式', kana: 'ぜったいぼうへきしき', desc: '被ダメージ-14%、防御+20%。', mod: { dmgTakenPct: -0.14, defPct: 0.20 } },
          { name: '雷鳴の反刃', kana: 'らいめいのはんじん', desc: '反撃率+24%、反撃威力+35%、攻撃+12%。', mod: { counterRate: 0.24, counterPower: 0.35, atkPct: 0.12 } },
          { name: '聖盾の加護', kana: 'せいじゅんのかご',   desc: '庇護率+25%、開幕防護壁24%、耐性+14%。', mod: { coverRate: 0.25, startShieldPct: 0.24, res: 0.14 } },
          { name: '覇王の縛陣', kana: 'はおうのばくじん',   desc: '敵開幕防御低下2T、状態異常付与+20%。', mod: { enemyStartDefDown: 2, ailmentRate: 0.20, defPct: 0.12 } },
          { name: '不死鳥の心', kana: 'ふしちょうのこころ', desc: '致死ダメージをHP1で1回耐える、被回復+22%。', mod: { gutsOnce: true, healTakenPct: 0.22, hpPct: 0.12 } }
        ],
        // Tier 5
        [
          { name: '金剛不壊極', kana: 'こんごうふえきょく', desc: '被ダメ-18%、HP+24%、防御+24%。', mod: { dmgTakenPct: -0.18, hpPct: 0.24, defPct: 0.24 } },
          { name: '修羅の返撃', kana: 'しゅらのへんげき',   desc: '反撃率+30%、反撃威力+50%、被弾ゲージ+12%。', mod: { counterRate: 0.30, counterPower: 0.50, gaugeOnHit: 0.12 } },
          { name: '天界の城塞', kana: 'てんかいのじょうさい', desc: '開幕防護壁35%、庇護率+30%、被ダメ-10%。', mod: { startShieldPct: 0.35, coverRate: 0.30, dmgTakenPct: -0.10 } },
          { name: '終焉の封鎖', kana: 'しゅうえんのふうさ', desc: '弱体持続+1T、異常付与+26%、耐性+22%。', mod: { debuffDuration: 1, ailmentRate: 0.26, res: 0.22, dmgTakenPct: -0.08 } },
          { name: '永劫の肉体', kana: 'えいごうのにくたい', desc: '行動開始HP10%回復、WAVE回復20%、HP+20%。', mod: { turnRegenPct: 0.10, waveHealPct: 0.20, hpPct: 0.20 } }
        ]
      ]
    },

    dealer: {
      styles: [
        { tag: '連撃型', icon: '⚡' },
        { tag: '会心型', icon: '✦'  },
        { tag: '異常特攻型', icon: '☠️' },
        { tag: '範囲殲滅型', icon: '💥' },
        { tag: '背水型', icon: '🔥' }
      ],
      tiers: [
        // Tier 1
        [
          { name: '追撃の心得', kana: 'ついげきのこころえ', desc: '攻撃時に16%で追加攻撃を行う。', mod: { followUpRate: 0.16, spdPct: 0.04 } },
          { name: '急所見切り', kana: 'きゅうしょみきり',   desc: '会心率+10%、会心ダメージ+12%。', mod: { crit: 0.10, critDmg: 0.12 } },
          { name: '弱点追い打ち', kana: 'じゃくてんおいうち', desc: '状態異常の敵へ与ダメ+16%。', mod: { ailmentDmgPct: 0.16, ailmentRate: 0.08 } },
          { name: '広域掃射術', kana: 'こういきそうしゃじゅつ', desc: '範囲・全体攻撃の与ダメ+12%。', mod: { aoeDmgPct: 0.12, atkPct: 0.05 } },
          { name: '闘争本能Ⅰ', kana: 'とうそうほんのういち', desc: 'HP減少に応じ与ダメ最大+20%、攻撃+6%。', mod: { lowHpDmgPct: 0.20, atkPct: 0.06 } }
        ],
        // Tier 2
        [
          { name: '迅雷の二連', kana: 'じんらいのにれん',   desc: '追撃率+18%、追撃威力+20%、速度+6%。', mod: { followUpRate: 0.18, followUpPower: 0.20, spdPct: 0.06 } },
          { name: '必殺の極意', kana: 'ひっさつのごくい',   desc: '会心率+12%、会心ダメージ+22%。', mod: { crit: 0.12, critDmg: 0.22 } },
          { name: '苛烈な追毒', kana: 'かれつなついどく',   desc: '異常特攻+22%、状態異常付与+12%。', mod: { ailmentDmgPct: 0.22, ailmentRate: 0.12 } },
          { name: '連鎖爆撃陣', kana: 'れんさばくげきじん', desc: '範囲・全体与ダメ+18%、撃破時ゲージ+15%。', mod: { aoeDmgPct: 0.18, gaugeOnKill: 0.15 } },
          { name: '逆境の牙',   kana: 'ぎゃっきょうのきば', desc: 'HP減少時与ダメ最大+30%、HP+10%。', mod: { lowHpDmgPct: 0.30, hpPct: 0.10, atkPct: 0.06 } }
        ],
        // Tier 3
        [
          { name: '疾風連撃舞', kana: 'しっぷうれんげきぶ', desc: '追撃率+22%、攻撃+12%、速度+8%。', mod: { followUpRate: 0.22, atkPct: 0.12, spdPct: 0.08 } },
          { name: '閃光の穿刃', kana: 'せんこうのせんじん', desc: '会心時ゲージ+12%、会心率+14%、会心ダメ+20%。', mod: { gaugeOnCrit: 0.12, crit: 0.14, critDmg: 0.20 } },
          { name: '災厄の狩人', kana: 'さいやくのかりうど', desc: '異常特攻+30%、攻撃+12%、異常付与+14%。', mod: { ailmentDmgPct: 0.30, atkPct: 0.12, ailmentRate: 0.14 } },
          { name: '殲滅砲火式', kana: 'せんめつほうかしき', desc: '範囲・全体与ダメ+24%、スキル与ダメ+12%。', mod: { aoeDmgPct: 0.24, skillDmgPct: 0.12 } },
          { name: '不退転の炎', kana: 'ふたいてんのほのお', desc: '致死1回耐え、HP減少与ダメ最大+35%。', mod: { gutsOnce: true, lowHpDmgPct: 0.35, atkPct: 0.08 } }
        ],
        // Tier 4
        [
          { name: '無影の連弾', kana: 'むえいのれんだん',   desc: '追撃率+26%、追撃威力+35%、与ダメ+10%。', mod: { followUpRate: 0.26, followUpPower: 0.35, dmgDealtPct: 0.10 } },
          { name: '神眼の一閃', kana: 'しんがんのいっせん', desc: '会心率+18%、会心ダメ+38%、単体与ダメ+12%。', mod: { crit: 0.18, critDmg: 0.38, singleDmgPct: 0.12 } },
          { name: '深淵の処刑', kana: 'しんえんのしょけい', desc: '異常特攻+38%、異常付与+18%、会心ダメ+20%。', mod: { ailmentDmgPct: 0.38, ailmentRate: 0.18, critDmg: 0.20 } },
          { name: '流星絨毯撃', kana: 'りゅうせいじゅうたん', desc: '範囲・全体与ダメ+30%、撃破ゲージ+25%。', mod: { aoeDmgPct: 0.30, gaugeOnKill: 0.25, atkPct: 0.12 } },
          { name: '獅子奮迅撃', kana: 'ししふんじんげき', desc: 'HP減少与ダメ最大+48%、攻撃+18%、被ダメ-8%。', mod: { lowHpDmgPct: 0.48, atkPct: 0.18, dmgTakenPct: -0.08 } }
        ],
        // Tier 5
        [
          { name: '千手迅雷極', kana: 'せんじゅじんらいきょく', desc: '追撃率+34%、追撃威力+50%、速度+14%。', mod: { followUpRate: 0.34, followUpPower: 0.50, spdPct: 0.14 } },
          { name: '天穿の極会心', kana: 'てんせんのきょくかいしん', desc: '会心率+24%、会心ダメ+55%、会心ゲージ+15%。', mod: { crit: 0.24, critDmg: 0.55, gaugeOnCrit: 0.15 } },
          { name: '終末の断罪', kana: 'しゅうまつのだんざい', desc: '異常特攻+52%、与ダメ+16%、異常付与+22%。', mod: { ailmentDmgPct: 0.52, dmgDealtPct: 0.16, ailmentRate: 0.22 } },
          { name: '星崩しの砲嵐', kana: 'ほしくずしのほうらん', desc: '範囲・全体与ダメ+40%、攻撃+22%、スキル+16%。', mod: { aoeDmgPct: 0.40, atkPct: 0.22, skillDmgPct: 0.16 } },
          { name: '鬼神背水陣', kana: 'きしんはいすいじん', desc: 'HP減少与ダメ最大+65%、攻撃+24%、被ダメ-10%。', mod: { lowHpDmgPct: 0.65, atkPct: 0.24, dmgTakenPct: -0.10 } }
        ]
      ]
    },

    supporter: {
      styles: [
        { tag: '加速型', icon: '⏩' },
        { tag: 'バフ延長型', icon: '📯' },
        { tag: '弱体特化型', icon: '🔻' },
        { tag: '属性共鳴型', icon: '🌈' },
        { tag: '初動制圧型', icon: '🚀' }
      ],
      tiers: [
        // Tier 1
        [
          { name: '疾風の合図', kana: 'しっぷうのあいず', desc: '速度+10%、初期ゲージ+12%。', mod: { spdPct: 0.10, initGauge: 0.12 } },
          { name: '鼓舞の余韻', kana: 'こぶのよいん',     desc: '付与バフ持続+1ターン、HP+6%。', mod: { buffDuration: 1, hpPct: 0.06 } },
          { name: '綻びの看破', kana: 'ほころびのかんぱ', desc: '状態異常・弱体付与率+14%、速度+5%。', mod: { ailmentRate: 0.14, spdPct: 0.05 } },
          { name: '属性導線術', kana: 'ぞくせいどうせんじゅつ', desc: '有利属性与ダメ+14%、攻撃+6%。', mod: { elementDmgPct: 0.14, atkPct: 0.06 } },
          { name: '先制の号砲', kana: 'せんせいのごうほう', desc: '初期ゲージ+24%、開幕防御+8%。', mod: { initGauge: 0.24, defPct: 0.08 } }
        ],
        // Tier 2
        [
          { name: '時針の早回し', kana: 'じしんのはやまわし', desc: '速度+14%、開幕味方速度上昇1T。', mod: { spdPct: 0.14, allyStartSpdUp: 1 } },
          { name: '栄光の行進', kana: 'えいこうのこうしん', desc: '開幕味方攻撃上昇1T、防御+10%。', mod: { allyStartAtkUp: 1, defPct: 0.10, hpPct: 0.08 } },
          { name: '弱体の鎖陣', kana: 'じゃくたいのさじん', desc: '弱体持続+1ターン、異常付与+14%。', mod: { debuffDuration: 1, ailmentRate: 0.14 } },
          { name: '元素共鳴波', kana: 'げんそきょうめいは', desc: '有利属性与ダメ+20%、与ダメ+8%。', mod: { elementDmgPct: 0.20, dmgDealtPct: 0.08 } },
          { name: '電光石火陣', kana: 'でんこうせっかじん', desc: '初期ゲージ+34%、開幕防護壁12%。', mod: { initGauge: 0.34, startShieldPct: 0.12 } }
        ],
        // Tier 3
        [
          { name: '音速の指揮杖', kana: 'おんそくのしきじょう', desc: '速度+18%、初期ゲージ+20%、被弾ゲージ+8%。', mod: { spdPct: 0.18, initGauge: 0.20, gaugeOnHit: 0.08 } },
          { name: '永遠の凱歌', kana: 'えいえんのがいか',   desc: '付与バフ持続+1T、開幕味方攻撃上昇2T。', mod: { buffDuration: 1, allyStartAtkUp: 2, hpPct: 0.10 } },
          { name: '破滅の刻印', kana: 'はめつのこくいん',   desc: '敵開幕防御低下2T、異常付与+18%。', mod: { enemyStartDefDown: 2, ailmentRate: 0.18, spdPct: 0.08 } },
          { name: '七界の魔導陣', kana: 'ななかいのまどうじん', desc: '有利属性与ダメ+26%、攻撃+12%、会心+8%。', mod: { elementDmgPct: 0.26, atkPct: 0.12, crit: 0.08 } },
          { name: '奇襲の狼煙', kana: 'きしゅうののろし',   desc: '初期ゲージ+45%、開幕味方速度上昇1T。', mod: { initGauge: 0.45, allyStartSpdUp: 1, atkPct: 0.08 } }
        ],
        // Tier 4
        [
          { name: '神速の拍動', kana: 'しんそくのはくどう', desc: '速度+24%、開幕味方速度上昇2T、追撃+12%。', mod: { spdPct: 0.24, allyStartSpdUp: 2, followUpRate: 0.12 } },
          { name: '覇者の讃美歌', kana: 'はしゃのさんびか', desc: 'バフ持続+1T、味方開幕攻撃UP2T、被ダメ-10%。', mod: { buffDuration: 1, allyStartAtkUp: 2, dmgTakenPct: -0.10, defPct: 0.12 } },
          { name: '深淵の呪縛', kana: 'しんえんのじゅばく', desc: '弱体持続+1T、異常付与+24%、異常特攻+20%。', mod: { debuffDuration: 1, ailmentRate: 0.24, ailmentDmgPct: 0.20 } },
          { name: '万象調和律', kana: 'ばんしょうちょうわりつ', desc: '有利属性与ダメ+34%、全能力+10%。', mod: { elementDmgPct: 0.34, hpPct: 0.10, atkPct: 0.10, defPct: 0.10 } },
          { name: '先陣制圧式', kana: 'せんじんせいあつしき', desc: '初期ゲージ+58%、敵開幕防御低下2T。', mod: { initGauge: 0.58, enemyStartDefDown: 2, spdPct: 0.10 } }
        ],
        // Tier 5
        [
          { name: '時空超越指揮', kana: 'じくうちょうえつしき', desc: '速度+30%、初期ゲージ+35%、味方開幕速度UP2T。', mod: { spdPct: 0.30, initGauge: 0.35, allyStartSpdUp: 2 } },
          { name: '神話の戦勝歌', kana: 'しんわのせんしょうか', desc: 'バフ持続+2T、開幕味方攻撃UP2T、HP+20%。', mod: { buffDuration: 2, allyStartAtkUp: 2, hpPct: 0.20 } },
          { name: '絶対零度弱体', kana: 'ぜったいれいどじゃくたい', desc: '弱体持続+2T、異常付与+30%、敵開幕防御低下2T。', mod: { debuffDuration: 2, ailmentRate: 0.30, enemyStartDefDown: 2 } },
          { name: '星界大共鳴', kana: 'せいかいだいきょうめい', desc: '有利属性与ダメ+45%、与ダメ+18%、会心+12%。', mod: { elementDmgPct: 0.45, dmgDealtPct: 0.18, crit: 0.12 } },
          { name: '開戦必勝陣', kana: 'かいせんひっしょうじん', desc: '初期ゲージ+75%、開幕防護壁25%、攻撃+16%。', mod: { initGauge: 0.75, startShieldPct: 0.25, atkPct: 0.16 } }
        ]
      ]
    },

    healer: {
      styles: [
        { tag: '大回復型', icon: '💖' },
        { tag: '継続再生型', icon: '🌿' },
        { tag: '浄化解除型', icon: '✨' },
        { tag: '予防障壁型', icon: '💠' },
        { tag: '蘇生保険型', icon: '🕊️' }
      ],
      tiers: [
        // Tier 1
        [
          { name: '慈愛の祈り', kana: 'じあいのいのり',   desc: '与回復量+16%、HP+6%。', mod: { healDealtPct: 0.16, hpPct: 0.06 } },
          { name: '芽吹きの泉', kana: 'めぶきのいずみ',   desc: '行動開始HP4%回復、WAVE回復+10%。', mod: { turnRegenPct: 0.04, waveHealPct: 0.10 } },
          { name: '清めの聖水', kana: 'きよめのせいすい', desc: '回復時に状態異常を1つ解除、耐性+10%。', mod: { cleanseOnHeal: 1, res: 0.10 } },
          { name: '光の予防膜', kana: 'ひかりのよぼうまく', desc: '超過回復の35%を防護壁に変換、防御+8%。', mod: { overhealShield: 0.35, defPct: 0.08 } },
          { name: '命の灯火Ⅰ', kana: 'いのちのともしびいち', desc: 'HP+12%、被ダメージ-6%。', mod: { hpPct: 0.12, dmgTakenPct: -0.06 } }
        ],
        // Tier 2
        [
          { name: '豊穣の癒し', kana: 'ほうじょうのいやし', desc: '与回復量+24%、速度+6%。', mod: { healDealtPct: 0.24, spdPct: 0.06 } },
          { name: '星露の恵み', kana: 'ほしつゆのめぐみ', desc: 'WAVE開始HP16%回復、バフ持続+1T。', mod: { waveHealPct: 0.16, buffDuration: 1 } },
          { name: '祓魔の鐘音', kana: 'ふつまのかねね',   desc: '耐性+20%、回復時状態異常1つ解除、速度+6%。', mod: { res: 0.20, cleanseOnHeal: 1, spdPct: 0.06 } },
          { name: '聖域の結界', kana: 'せいいきのけっかい', desc: '開幕防護壁18%、超過回復45%を防護壁化。', mod: { startShieldPct: 0.18, overhealShield: 0.45 } },
          { name: '天使の羽衣', kana: 'てんしのはごろも', desc: '戦闘中1回、味方戦闘不能時にHP30%で蘇生。', mod: { reviveOnce: 0.30, hpPct: 0.08 } }
        ],
        // Tier 3
        [
          { name: '大聖堂の祝福', kana: 'だいせいどうのしゅくふく', desc: '与回復量+34%、攻撃+12%、HP+12%。', mod: { healDealtPct: 0.34, atkPct: 0.12, hpPct: 0.12 } },
          { name: '常春の聖樹', kana: 'とこはるのせいじゅ', desc: '行動開始HP7%回復、WAVE回復+20%、被回復+15%。', mod: { turnRegenPct: 0.07, waveHealPct: 0.20, healTakenPct: 0.15 } },
          { name: '白銀の浄化波', kana: 'しろがねのじょうかは', desc: '回復時状態異常2つ解除、耐性+26%。', mod: { cleanseOnHeal: 2, res: 0.26, spdPct: 0.08 } },
          { name: '蒼穹の二重壁', kana: 'そうきゅうのにじゅうへき', desc: '超過回復60%を防護壁化、開幕防護壁24%。', mod: { overhealShield: 0.60, startShieldPct: 0.24 } },
          { name: '不屈の輪廻', kana: 'ふくつのりんね',   desc: '味方自動蘇生(HP45%)、自身致死1回耐え。', mod: { reviveOnce: 0.45, gutsOnce: true } }
        ],
        // Tier 4
        [
          { name: '生命賛歌極', kana: 'せいめいさんかきょく', desc: '与回復量+46%、速度+12%、HP+16%。', mod: { healDealtPct: 0.46, spdPct: 0.12, hpPct: 0.16 } },
          { name: '永世の癒し風', kana: 'えいせいのいやしかぜ', desc: '行動開始HP9%回復、WAVE回復+26%、バフ持続+1T。', mod: { turnRegenPct: 0.09, waveHealPct: 0.26, buffDuration: 1 } },
          { name: '聖女の絶対浄化', kana: 'せいじょのぜったいじょうか', desc: '回復時状態異常2つ解除、耐性+35%、被ダメ-10%。', mod: { cleanseOnHeal: 2, res: 0.35, dmgTakenPct: -0.10 } },
          { name: '星光の堅牢壁', kana: 'せいこうのけんろうへき', desc: '超過回復75%を防護壁化、開幕防護壁30%、防御+16%。', mod: { overhealShield: 0.75, startShieldPct: 0.30, defPct: 0.16 } },
          { name: '奇跡の再臨', kana: 'きせきのさいりん', desc: '味方自動蘇生(HP60%)、初期ゲージ+25%、HP+15%。', mod: { reviveOnce: 0.60, initGauge: 0.25, hpPct: 0.15 } }
        ],
        // Tier 5
        [
          { name: '神慈の満潮', kana: 'しんじのみちしお', desc: '与回復量+62%、攻撃+18%、速度+15%。', mod: { healDealtPct: 0.62, atkPct: 0.18, spdPct: 0.15 } },
          { name: '世界樹の息吹', kana: 'せかいじゅのいぶき', desc: '行動開始HP12%回復、WAVE回復+35%、HP+24%。', mod: { turnRegenPct: 0.12, waveHealPct: 0.35, hpPct: 0.24 } },
          { name: '天界浄化礼賛', kana: 'てんかいじょうからいさん', desc: '回復時状態異常3つ解除、耐性+48%、速度+14%。', mod: { cleanseOnHeal: 3, res: 0.48, spdPct: 0.14 } },
          { name: '絶対聖域障壁', kana: 'ぜったいせいいきしょうへき', desc: '超過回復100%を防護壁化、開幕防護壁40%、被ダメ-14%。', mod: { overhealShield: 1.00, startShieldPct: 0.40, dmgTakenPct: -0.14 } },
          { name: '不滅の聖翼', kana: 'ふめつのせいよく', desc: '味方自動蘇生(HP80%)、自身致死1回耐え、被ダメ-12%。', mod: { reviveOnce: 0.80, gutsOnce: true, dmgTakenPct: -0.12 } }
        ]
      ]
    }
  };

  var ABILITIES = [];
  var ABILITY_BY_ID = {};

  HS.CONST.ROLES.forEach(function (role) {
    var spec = ROLE_SPECS[role];
    spec.tiers.forEach(function (choices, tIdx) {
      var tier = tIdx + 1;
      var cost = D.ABILITY_TIER_COSTS[tier];
      choices.forEach(function (ch, cIdx) {
        var style = spec.styles[cIdx];
        var id = 'ab_' + role + '_t' + tier + '_' + (cIdx + 1);
        var entry = {
          id: id,
          role: role,
          tier: tier,
          idx: cIdx,
          styleTag: style.tag,
          icon: style.icon,
          name: ch.name,
          kana: ch.kana,
          desc: ch.desc,
          unlockCost: { gold: cost.gold, matId: cost.matId, matQty: cost.matQty },
          mod: ch.mod
        };
        ABILITIES.push(entry);
        ABILITY_BY_ID[id] = entry;
      });
    });
  });

  D.ABILITIES = ABILITIES;
  D.ABILITY_BY_ID = ABILITY_BY_ID;
})(typeof window !== 'undefined' ? window : globalThis);
