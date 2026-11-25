(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  var D = HS.Data = HS.Data || {};

  function makeAwaken(areaMat1, areaMat2, areaMat3, specs) {
    var costs = [
      { gold: 450,  matId: areaMat1, matQty: 3 },
      { gold: 1100, matId: areaMat2, matQty: 5 },
      { gold: 2400, matId: areaMat3, matQty: 7 }
    ];
    return specs.map(function (sp, idx) {
      return {
        stage: idx + 1,
        desc: sp.desc,
        cost: costs[idx],
        bonus: sp.bonus
      };
    });
  }

  function makeResonance(matEarly, matMid, matLate, trait4Desc, trait4Mod) {
    return [
      {
        stage: 1,
        desc: 'HP+8%・攻撃+8%',
        cost: { gold: 500, chaosShard: 2, matId: matEarly, matQty: 3 },
        mod: { hpPct: 0.08, atkPct: 0.08 }
      },
      {
        stage: 2,
        desc: '防御+10%・速度+6%・会心+5%',
        cost: { gold: 1100, chaosShard: 4, matId: matMid, matQty: 4 },
        mod: { defPct: 0.10, spdPct: 0.06, crit: 0.05 }
      },
      {
        stage: 3,
        desc: 'HP+10%・与ダメ+10%・回復+10%',
        cost: { gold: 2100, chaosShard: 6, matId: matMid, matQty: 6 },
        mod: { hpPct: 0.10, dmgDealtPct: 0.10, healDealtPct: 0.10 }
      },
      {
        stage: 4,
        desc: trait4Desc,
        cost: { gold: 3500, chaosShard: 9, matId: matLate, matQty: 8 },
        mod: trait4Mod
      },
      {
        stage: 5,
        desc: '異界極鳴：第1・第3段階ロールアビを2つ同時装備可能＆全能力+10%',
        cost: { gold: 5500, chaosShard: 14, matId: 'mat_a4', matQty: 12 },
        unlockExtraAbilitySlots: [1, 3],
        mod: { hpPct: 0.10, atkPct: 0.10, defPct: 0.10, spdPct: 0.06 }
      }
    ];
  }

  // 全28キャラクター
  // 初期4 / エリア攻略8 / 酒場加入8 / 乱入指名手配4 / PvE到達4
  // うち複合種族12体、パッシブ持ち(アクティブ2+パッシブ1)9体
  D.CHARACTERS = [
    // ==================== 初期加入 (4) ====================
    {
      id: 'ch_allen', name: 'アレン', kana: 'あれん', title: '境界の旅剣士',
      element: 'fire', races: ['human'], role: 'dealer', world: 'frontier',
      baseStats: { hp: 940, atk: 152, def: 82, spd: 112, crit: 0.15, critDmg: 1.50, res: 0.10 },
      unlock: { type: 'starter', label: '初期加入' },
      skills: [
        {
          id: 'sk_allen_1', tier: 1, type: 'active', name: '烈火の一閃', target: 'single',
          cd: 0, power: 1.05, hits: 1,
          desc: '炎を纏わせた斬撃で敵単体を斬り、35%で火傷を付与する。',
          effects: [{ type: 'status', status: 'burn', chance: 0.35, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '威力+15%・火傷付与+15%', bonus: { powerAdd: 0.15, chanceAdd: 0.15 } },
            { desc: '威力+20%・自身のゲージ+12%', bonus: { powerAdd: 0.20, selfGauge: 0.12 } },
            { desc: '威力+25%・状態異常の敵へ与ダメ+25%', bonus: { powerAdd: 0.25, bonusVsAilment: 0.25 } }
          ])
        },
        {
          id: 'sk_allen_2', tier: 2, type: 'active', name: '紅蓮薙ぎ払い', target: 'area',
          cd: 2, power: 1.35, hits: 1,
          desc: '弧を描く炎波で敵範囲を薙ぎ払い、55%で火傷を付与する。',
          effects: [{ type: 'status', status: 'burn', chance: 0.55, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '威力+20%・自身に攻撃上昇1T', bonus: { powerAdd: 0.20, extraEffect: { type: 'status', status: 'atk_up', chance: 1, turns: 1, target: 'self' } } },
            { desc: '威力+25%・火傷付与+20%', bonus: { powerAdd: 0.25, chanceAdd: 0.20 } },
            { desc: '威力+35%・防御20%無視', bonus: { powerAdd: 0.35, ignoreDef: 0.20 } }
          ])
        },
        {
          id: 'sk_allen_3', tier: 3, type: 'active', name: '境界突破斬', target: 'single',
          cd: 4, power: 2.30, hits: 2,
          desc: '異界の炎を一点に収束し敵単体へ二連撃。火傷の敵には威力上昇。',
          bonusVsAilment: 0.30,
          effects: [
            { type: 'status', status: 'burn', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+30%・会心率+15%', bonus: { powerAdd: 0.30, critAdd: 0.15 } },
            { desc: '威力+40%・防御25%無視', bonus: { powerAdd: 0.40, ignoreDef: 0.25 } },
            { desc: '威力+55%・撃破時ゲージ+35%', bonus: { powerAdd: 0.55, gaugeOnKill: 0.35 } }
          ])
        }
      ],
      resonance: makeResonance('mat_a1', 'mat_a2', 'mat_a3', '攻撃+16%・会心ダメ+22%', { atkPct: 0.16, critDmg: 0.22 }),
      lore: '気づけば七つの世界が混ざり合った境界平原に立っていた気さくな青年剣士。どんな異界の珍料理でも「うまい！」と平らげる胃袋が最大の才能らしい。'
    },

    {
      id: 'ch_kurogane', name: 'クロガネ', kana: 'くろがね', title: '零式蒸気機兵',
      element: 'none', races: ['mech'], role: 'tank', world: 'mechcity',
      baseStats: { hp: 1320, atk: 102, def: 138, spd: 94, crit: 0.08, critDmg: 1.50, res: 0.18 },
      unlock: { type: 'starter', label: '初期加入' },
      skills: [
        {
          id: 'sk_kurogane_1', tier: 1, type: 'active', name: '蒸気鉄拳打', target: 'single',
          cd: 0, power: 1.00, hits: 1,
          desc: '蒸気を噴き上げる鋼鉄の拳で殴り、45%で敵の攻撃を低下させる。',
          effects: [{ type: 'status', status: 'atk_down', chance: 0.45, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '威力+15%・攻撃低下率+20%', bonus: { powerAdd: 0.15, chanceAdd: 0.20 } },
            { desc: '威力+20%・自身にHP10%防護壁', bonus: { powerAdd: 0.20, extraEffect: { type: 'shield', hpPct: 0.10, turns: 2, target: 'self' } } },
            { desc: '威力+25%・30%で敵を気絶', bonus: { powerAdd: 0.25, extraEffect: { type: 'status', status: 'stun', chance: 0.30, turns: 1, target: 'target' } } }
          ])
        },
        {
          id: 'sk_kurogane_2', tier: 2, type: 'active', name: '零式防壁展開', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全体に防護壁を張り、自身に挑発と防御上昇・反撃構えを付与する。',
          effects: [
            { type: 'shield', hpPct: 0.22, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'taunt', chance: 1.0, turns: 2, target: 'self' },
            { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'self' },
            { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '防護壁量+8%', bonus: { shieldPctAdd: 0.08 } },
            { desc: '味方全体へ防御上昇2T追加', bonus: { extraEffect: { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'ally_all' } } },
            { desc: '防護壁量さらに+12%・自身HP15%回復', bonus: { shieldPctAdd: 0.12, extraEffect: { type: 'heal', hpPct: 0.15, target: 'self' } } }
          ])
        },
        {
          id: 'sk_kurogane_p', tier: 3, type: 'passive', name: '永久歯車装甲', target: 'self',
          cd: 0, power: 0,
          desc: '常時、防御力+16%・被ダメージ-10%。戦闘開始時に最大HP18%の防護壁を展開する。',
          mod: { defPct: 0.16, dmgTakenPct: -0.10, startShieldPct: 0.18 },
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '防御+10%・開幕防護壁+8%', bonus: { mod: { defPct: 0.10, startShieldPct: 0.08 } } },
            { desc: '被ダメ-6%・反撃率+20%', bonus: { mod: { dmgTakenPct: -0.06, counterRate: 0.20 } } },
            { desc: 'HP+16%・庇護率+22%', bonus: { mod: { hpPct: 0.16, coverRate: 0.22 } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a1', 'mat_a2', 'mat_a3', '防御+20%・被ダメ-10%', { defPct: 0.20, dmgTakenPct: -0.10 }),
      lore: '機巧都市の旧式倉庫で目を覚ました礼儀正しい蒸気ロボット。仲間を守るためなら火山にも深淵にも突っ込むが、定期的な油差しを褒められると蒸気を吹いて照れる。'
    },

    {
      id: 'ch_sylphie', name: 'シルフィ', kana: 'しるふぃ', title: '星霧の風奏者',
      element: 'wind', races: ['fairy'], role: 'supporter', world: 'fairyvale',
      baseStats: { hp: 880, atk: 120, def: 82, spd: 132, crit: 0.10, critDmg: 1.50, res: 0.16 },
      unlock: { type: 'starter', label: '初期加入' },
      skills: [
        {
          id: 'sk_sylphie_1', tier: 1, type: 'active', name: '風刃の調べ', target: 'single',
          cd: 0, power: 0.95, hits: 1,
          desc: '澄んだ風刃で敵単体を攻撃し、最もゲージの低い味方のゲージを15%進める。',
          effects: [{ type: 'gauge', amount: 0.15, target: 'ally_lowest_gauge' }],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '威力+15%・ゲージ加速+8%', bonus: { powerAdd: 0.15, gaugeAdd: 0.08 } },
            { desc: '50%で敵の速度低下2T', bonus: { extraEffect: { type: 'status', status: 'spd_down', chance: 0.50, turns: 2, target: 'target' } } },
            { desc: '威力+25%・ゲージ加速さらに+10%', bonus: { powerAdd: 0.25, gaugeAdd: 0.10 } }
          ])
        },
        {
          id: 'sk_sylphie_2', tier: 2, type: 'active', name: '星霧の追い風', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全体に速度上昇・攻撃上昇を2T付与し、行動ゲージを20%引き上げる。',
          effects: [
            { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'gauge', amount: 0.20, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: 'ゲージ引き上げ+8%', bonus: { gaugeAdd: 0.08 } },
            { desc: '会心上昇2Tを追加付与', bonus: { extraEffect: { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'ally_all' } } },
            { desc: 'ゲージ引き上げさらに+10%・弱体1つ解除', bonus: { gaugeAdd: 0.10, extraEffect: { type: 'cleanse', count: 1, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_sylphie_3', tier: 3, type: 'active', name: '妖精大輪舞曲', target: 'all',
          cd: 4, power: 1.45, hits: 1,
          desc: '星霧の竜巻で敵全体を攻撃し防御低下を付与。さらに味方全体のゲージを25%進める。',
          effects: [
            { type: 'status', status: 'def_down', chance: 0.80, turns: 2, target: 'target' },
            { type: 'gauge', amount: 0.25, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+25%・防御低下率+15%', bonus: { powerAdd: 0.25, chanceAdd: 0.15 } },
            { desc: '敵全体へ速度低下2T追加', bonus: { extraEffect: { type: 'status', status: 'spd_down', chance: 0.80, turns: 2, target: 'target' } } },
            { desc: '威力+35%・味方全体ゲージさらに+12%', bonus: { powerAdd: 0.35, gaugeAdd: 0.12 } }
          ])
        }
      ],
      resonance: makeResonance('mat_a1', 'mat_a2', 'mat_a3', '速度+15%・初期ゲージ+20%', { spdPct: 0.15, initGauge: 0.20 }),
      lore: '星霧妖精郷から飛び出してきた陽気な笛吹き妖精。気まぐれに吹く風笛が偶然戦況をひっくり返すことも多く、本人は「風さんが頑張った」と笑う。'
    },

    {
      id: 'ch_minato', name: 'ミナト', kana: 'みなと', title: '蒼雫の癒し手',
      element: 'water', races: ['human'], role: 'healer', world: 'frontier',
      baseStats: { hp: 1020, atk: 126, def: 96, spd: 108, crit: 0.08, critDmg: 1.50, res: 0.22 },
      unlock: { type: 'starter', label: '初期加入' },
      skills: [
        {
          id: 'sk_minato_1', tier: 1, type: 'active', name: '水球の浄打', target: 'single',
          cd: 0, power: 0.90, hits: 1,
          desc: '清らかな水弾を放ち敵単体を攻撃。HPが最も減った味方を少し回復する。',
          effects: [{ type: 'heal', mult: 0.65, target: 'ally_lowest' }],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '回復倍率+20%', bonus: { healMultAdd: 0.20 } },
            { desc: '対象の味方の状態異常を1つ解除', bonus: { extraEffect: { type: 'cleanse', count: 1, target: 'ally_lowest' } } },
            { desc: '威力+20%・回復倍率さらに+25%', bonus: { powerAdd: 0.20, healMultAdd: 0.25 } }
          ])
        },
        {
          id: 'sk_minato_2', tier: 2, type: 'active', name: '清泉の癒し雨', target: 'ally_all',
          cd: 2, power: 0, hits: 0,
          desc: '味方全体のHPを回復し、状態異常を1つ解除する。',
          effects: [
            { type: 'heal', mult: 1.35, hpPct: 0.14, target: 'ally_all' },
            { type: 'cleanse', count: 1, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '回復量+20%', bonus: { healMultAdd: 0.25 } },
            { desc: '味方全体に継続再生2Tを付与', bonus: { extraEffect: { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'ally_all' } } },
            { desc: '状態異常解除+1・HP割合回復+8%', bonus: { cleanseAdd: 1, healPctAdd: 0.08 } }
          ])
        },
        {
          id: 'sk_minato_3', tier: 3, type: 'active', name: '蒼穹の大慈雨', target: 'ally_all',
          cd: 4, power: 0, hits: 0,
          desc: '味方全体のHPを大きく回復し、防御上昇と防護壁を2T付与する。',
          effects: [
            { type: 'heal', mult: 1.90, hpPct: 0.24, target: 'ally_all' },
            { type: 'shield', hpPct: 0.18, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '回復量+30%・防護壁+6%', bonus: { healMultAdd: 0.35, shieldPctAdd: 0.06 } },
            { desc: '味方全体の状態異常を2つ解除', bonus: { extraEffect: { type: 'cleanse', count: 2, target: 'ally_all' } } },
            { desc: '味方全体ゲージ+15%・防護壁さらに+10%', bonus: { shieldPctAdd: 0.10, extraEffect: { type: 'gauge', amount: 0.15, target: 'ally_all' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a1', 'mat_a2', 'mat_a3', '与回復+22%・耐性+18%', { healDealtPct: 0.22, res: 0.18 }),
      lore: '境界平原の小さな診療所で薬草と水魔術を学んだ心優しい青年。竜の火傷から機械のサビ取りまで手際よく直すため、異界の住人たちから引っ張りだこ。'
    },

    // ==================== エリア攻略加入 (8) ====================
    {
      id: 'ch_garudo', name: 'ガルド', kana: 'がるど', title: '轟牙の荒野狼',
      element: 'wind', races: ['beast'], role: 'dealer', world: 'wilds',
      baseStats: { hp: 910, atk: 158, def: 74, spd: 124, crit: 0.22, critDmg: 1.60, res: 0.08 },
      unlock: { type: 'stage', stageId: 'a1_s5', label: 'エリア1-5クリアで加入' },
      skills: [
        {
          id: 'sk_garudo_1', tier: 1, type: 'active', name: '疾風二連牙', target: 'single',
          cd: 0, power: 1.08, hits: 2,
          desc: '目にも留まらぬ速さで敵単体を二連続で切り裂く。',
          effects: [{ type: 'gauge', amount: 0.10, target: 'self' }],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '威力+16%・会心率+10%', bonus: { powerAdd: 0.16, critAdd: 0.10 } },
            { desc: '威力+22%・自身のゲージ+10%', bonus: { powerAdd: 0.22, selfGauge: 0.10 } },
            { desc: '威力+28%・45%で脆弱2T付与', bonus: { powerAdd: 0.28, extraEffect: { type: 'status', status: 'vulnerable', chance: 0.45, turns: 2, target: 'target' } } }
          ])
        },
        {
          id: 'sk_garudo_2', tier: 2, type: 'active', name: '嵐狼の乱舞', target: 'area',
          cd: 3, power: 1.75, hits: 3,
          desc: '風の刃を纏って敵範囲を三連撃。会心発生時は追加で速度上昇を得る。',
          effects: [
            { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'self' },
            { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '威力+25%・会心率+15%', bonus: { powerAdd: 0.25, critAdd: 0.15 } },
            { desc: '威力+35%・防御20%無視', bonus: { powerAdd: 0.35, ignoreDef: 0.20 } },
            { desc: '威力+45%・撃破時ゲージ+30%', bonus: { powerAdd: 0.45, gaugeOnKill: 0.30 } }
          ])
        },
        {
          id: 'sk_garudo_p', tier: 3, type: 'passive', name: '狩人の追撃本能', target: 'self',
          cd: 0, power: 0,
          desc: '常時、追撃率+24%・会心率+12%。会心発生時に自身の行動ゲージ+10%。',
          mod: { followUpRate: 0.24, crit: 0.12, gaugeOnCrit: 0.10 },
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '追撃率+10%・速度+8%', bonus: { mod: { followUpRate: 0.10, spdPct: 0.08 } } },
            { desc: '会心ダメ+24%・追撃威力+25%', bonus: { mod: { critDmg: 0.24, followUpPower: 0.25 } } },
            { desc: '追撃率+12%・撃破時ゲージ+25%', bonus: { mod: { followUpRate: 0.12, gaugeOnKill: 0.25 } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a1', 'mat_a2', 'mat_a3', '追撃率+16%・会心+12%', { followUpRate: 0.16, crit: 0.12 }),
      lore: '極彩獣域の誇り高き狼人。強敵との勝負を何より愛する熱血漢だが、美味しい干し肉を差し出されると尻尾が隠しきれない。'
    },

    {
      id: 'ch_volt', name: 'ボルト', kana: 'ぼると', title: '電脳機巧技師',
      element: 'light', races: ['human', 'mech'], role: 'supporter', world: 'mechcity',
      baseStats: { hp: 950, atk: 128, def: 94, spd: 126, crit: 0.12, critDmg: 1.50, res: 0.18 },
      unlock: { type: 'stage', stageId: 'a1_s10', label: 'エリア1-10クリアで加入' },
      skills: [
        {
          id: 'sk_volt_1', tier: 1, type: 'active', name: 'プラズマスパナ', target: 'single',
          cd: 0, power: 0.98, hits: 1,
          desc: '帯電させた大型スパナで敵を叩き、50%で防御低下を付与する。',
          effects: [{ type: 'status', status: 'def_down', chance: 0.50, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '威力+15%・防御低下率+20%', bonus: { powerAdd: 0.15, chanceAdd: 0.20 } },
            { desc: '敵の行動ゲージを12%後退', bonus: { extraEffect: { type: 'gauge', amount: -0.12, target: 'target' } } },
            { desc: '威力+25%・30%で気絶付与', bonus: { powerAdd: 0.25, extraEffect: { type: 'status', status: 'stun', chance: 0.30, turns: 1, target: 'target' } } }
          ])
        },
        {
          id: 'sk_volt_2', tier: 2, type: 'active', name: '過給クロック起動', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全体に会心上昇・速度上昇を付与し、防護壁を展開する。',
          effects: [
            { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'shield', hpPct: 0.15, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '防護壁+8%・味方ゲージ+12%', bonus: { shieldPctAdd: 0.08, extraEffect: { type: 'gauge', amount: 0.12, target: 'ally_all' } } },
            { desc: '味方全体へ攻撃上昇2T追加', bonus: { extraEffect: { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' } } },
            { desc: '防護壁さらに+10%・ゲージさらに+10%', bonus: { shieldPctAdd: 0.10, gaugeAdd: 0.10 } }
          ])
        },
        {
          id: 'sk_volt_3', tier: 3, type: 'active', name: '電磁ジャミング砲', target: 'all',
          cd: 4, power: 1.50, hits: 1,
          desc: '敵全体へ雷撃を放ち、高確率で防御低下・脆弱・ゲージ後退を与える。',
          effects: [
            { type: 'status', status: 'def_down', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'vulnerable', chance: 0.70, turns: 2, target: 'target' },
            { type: 'gauge', amount: -0.18, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+25%・ゲージ後退さらに-8%', bonus: { powerAdd: 0.25, gaugeAdd: -0.08 } },
            { desc: '敵のバフを1つ解除', bonus: { extraEffect: { type: 'dispel', count: 1, target: 'target' } } },
            { desc: '威力+40%・脆弱付与率+20%', bonus: { powerAdd: 0.40, chanceAdd: 0.20 } }
          ])
        }
      ],
      resonance: makeResonance('mat_a1', 'mat_a2', 'mat_a3', '初期ゲージ+25%・異常付与+18%', { initGauge: 0.25, ailmentRate: 0.18 }),
      lore: '右腕を自作の機巧義手に改造した天才発明家。人間と機械の両方の理に通じ、クロガネの整備担当でもある。口癖は「爆発しなければ成功！」。'
    },

    {
      id: 'ch_ignis', name: 'イグニス', kana: 'いぐにす', title: '紅蓮の幼竜姫',
      element: 'fire', races: ['dragon'], role: 'dealer', world: 'dragonpeak',
      baseStats: { hp: 1000, atk: 168, def: 86, spd: 110, crit: 0.16, critDmg: 1.55, res: 0.12 },
      unlock: { type: 'stage', stageId: 'a2_s5', label: 'エリア2-5クリアで加入' },
      skills: [
        {
          id: 'sk_ignis_1', tier: 1, type: 'active', name: '火竜の爪撃', target: 'single',
          cd: 0, power: 1.08, hits: 1,
          desc: '灼熱の竜爪で敵単体を引き裂き、50%で火傷を付与する。',
          effects: [{ type: 'status', status: 'burn', chance: 0.50, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+18%・火傷付与+20%', bonus: { powerAdd: 0.18, chanceAdd: 0.20 } },
            { desc: '威力+22%・自身に会心上昇1T', bonus: { powerAdd: 0.22, extraEffect: { type: 'status', status: 'crit_up', chance: 1.0, turns: 1, target: 'self' } } },
            { desc: '威力+28%・異常特攻+30%', bonus: { powerAdd: 0.28, bonusVsAilment: 0.30 } }
          ])
        },
        {
          id: 'sk_ignis_2', tier: 2, type: 'active', name: '灼熱ブレス波', target: 'area',
          cd: 2, power: 1.50, hits: 1,
          desc: '紅蓮の炎息で敵範囲を焼き払い、高確率で火傷と防御低下を付与。',
          effects: [
            { type: 'status', status: 'burn', chance: 0.75, turns: 2, target: 'target' },
            { type: 'status', status: 'def_down', chance: 0.55, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+22%・防御低下率+20%', bonus: { powerAdd: 0.22, chanceAdd: 0.20 } },
            { desc: '威力+30%・自身ゲージ+15%', bonus: { powerAdd: 0.30, selfGauge: 0.15 } },
            { desc: '威力+38%・防御20%無視', bonus: { powerAdd: 0.38, ignoreDef: 0.20 } }
          ])
        },
        {
          id: 'sk_ignis_3', tier: 3, type: 'active', name: '紅蓮メテオ降臨', target: 'all',
          cd: 4, power: 2.05, hits: 2,
          desc: '空から紅蓮の隕石群を降り注がせ敵全体を焼き尽くす竜姫の大技。',
          bonusVsAilment: 0.35,
          effects: [
            { type: 'status', status: 'burn', chance: 0.90, turns: 3, target: 'target' },
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+30%・会心率+15%', bonus: { powerAdd: 0.30, critAdd: 0.15 } },
            { desc: '威力+40%・防御25%無視', bonus: { powerAdd: 0.40, ignoreDef: 0.25 } },
            { desc: '威力+55%・異常特攻さらに+25%', bonus: { powerAdd: 0.55, bonusVsAilment: 0.25 } }
          ])
        }
      ],
      resonance: makeResonance('mat_a2', 'mat_a3', 'mat_a4', '範囲与ダメ+22%・攻撃+14%', { aoeDmgPct: 0.22, atkPct: 0.14 }),
      lore: '紅蓮竜峰の王族でありながら「外の世界のお菓子が食べたい」と家出してきたお転婆竜姫。威厳ある口調を心がけているが、甘い物の前では即座に崩れる。'
    },

    {
      id: 'ch_fiora', name: 'フィオラ', kana: 'ふぃおら', title: '花冠の星精霊',
      element: 'wind', races: ['fairy'], role: 'healer', world: 'fairyvale',
      baseStats: { hp: 980, atk: 124, def: 88, spd: 122, crit: 0.08, critDmg: 1.50, res: 0.24 },
      unlock: { type: 'stage', stageId: 'a2_s10', label: 'エリア2-10クリアで加入' },
      skills: [
        {
          id: 'sk_fiora_1', tier: 1, type: 'active', name: '花びらの癒風', target: 'single',
          cd: 0, power: 0.92, hits: 1,
          desc: '花の魔力で敵単体を打ち、HPの低い味方に継続再生を2T付与する。',
          effects: [
            { type: 'heal', mult: 0.55, target: 'ally_lowest' },
            { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'ally_lowest' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '回復量+25%', bonus: { healMultAdd: 0.25 } },
            { desc: '対象味方のゲージ+15%', bonus: { extraEffect: { type: 'gauge', amount: 0.15, target: 'ally_lowest' } } },
            { desc: '対象味方の状態異常を1つ解除', bonus: { extraEffect: { type: 'cleanse', count: 1, target: 'ally_lowest' } } }
          ])
        },
        {
          id: 'sk_fiora_2', tier: 2, type: 'active', name: '星花の大祝祭', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全体のHPを回復し、継続再生と速度上昇を付与して状態異常を祓う。',
          effects: [
            { type: 'heal', mult: 1.60, hpPct: 0.18, target: 'ally_all' },
            { type: 'status', status: 'regen', chance: 1.0, turns: 3, target: 'ally_all' },
            { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'cleanse', count: 1, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '回復倍率+30%・HP割合回復+6%', bonus: { healMultAdd: 0.30, healPctAdd: 0.06 } },
            { desc: '状態異常解除+1・防護壁12%追加', bonus: { cleanseAdd: 1, extraEffect: { type: 'shield', hpPct: 0.12, turns: 2, target: 'ally_all' } } },
            { desc: '味方全体ゲージ+18%', bonus: { extraEffect: { type: 'gauge', amount: 0.18, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_fiora_p', tier: 3, type: 'passive', name: '常春の花園', target: 'self',
          cd: 0, power: 0,
          desc: '常時、与回復量+20%・WAVE開始時HP20%回復。行動開始時に自身HP6%回復。',
          mod: { healDealtPct: 0.20, waveHealPct: 0.20, turnRegenPct: 0.06 },
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '与回復+14%・速度+8%', bonus: { mod: { healDealtPct: 0.14, spdPct: 0.08 } } },
            { desc: 'WAVE回復+10%・回復時異常解除+1', bonus: { mod: { waveHealPct: 0.10, cleanseOnHeal: 1 } } },
            { desc: '超過回復40%を防護壁化・耐性+16%', bonus: { mod: { overhealShield: 0.40, res: 0.16 } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a2', 'mat_a3', 'mat_a4', '与回復+26%・速度+10%', { healDealtPct: 0.26, spdPct: 0.10 }),
      lore: '星霧妖精郷の庭園番を務めるおっとりした精霊。頭に載せた花冠は感情に合わせて咲き乱れ、機嫌が良いと周りに癒やしの花粉が舞う。'
    },

    {
      id: 'ch_nox', name: 'ノクス', kana: 'のくす', title: '深淵の影剣客',
      element: 'dark', races: ['demon'], role: 'dealer', world: 'abyss',
      baseStats: { hp: 910, atk: 172, def: 78, spd: 122, crit: 0.20, critDmg: 1.65, res: 0.12 },
      unlock: { type: 'stage', stageId: 'a3_s5', label: 'エリア3-5クリアで加入' },
      skills: [
        {
          id: 'sk_nox_1', tier: 1, type: 'active', name: '黒影の居合', target: 'single',
          cd: 0, power: 1.10, hits: 1,
          desc: '闇の抜刀術で敵単体を斬り、45%で猛毒を付与する。',
          effects: [{ type: 'status', status: 'poison', chance: 0.45, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+18%・猛毒率+20%', bonus: { powerAdd: 0.18, chanceAdd: 0.20 } },
            { desc: '威力+22%・異常敵へ与ダメ+30%', bonus: { powerAdd: 0.22, bonusVsAilment: 0.30 } },
            { desc: '威力+28%・会心率+15%', bonus: { powerAdd: 0.28, critAdd: 0.15 } }
          ])
        },
        {
          id: 'sk_nox_2', tier: 2, type: 'active', name: '月影の双斬', target: 'area',
          cd: 2, power: 1.55, hits: 2,
          desc: '紅月の残像と共に敵範囲を斬り裂き、脆弱と猛毒を付与する。',
          effects: [
            { type: 'status', status: 'vulnerable', chance: 0.70, turns: 2, target: 'target' },
            { type: 'status', status: 'poison', chance: 0.65, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+24%・防御20%無視', bonus: { powerAdd: 0.24, ignoreDef: 0.20 } },
            { desc: '威力+32%・自身に会心上昇2T', bonus: { powerAdd: 0.32, extraEffect: { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'self' } } },
            { desc: '威力+42%・異常敵へ与ダメ+35%', bonus: { powerAdd: 0.42, bonusVsAilment: 0.35 } }
          ])
        },
        {
          id: 'sk_nox_3', tier: 3, type: 'active', name: '深淵断罪剣', target: 'single',
          cd: 4, power: 2.65, hits: 2,
          desc: '闇の刃で敵単体を両断する必殺剣。状態異常中の敵へ絶大な特攻。',
          ignoreDef: 0.25,
          bonusVsAilment: 0.50,
          effects: [{ type: 'status', status: 'silence', chance: 0.75, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '威力+35%・防御無視さらに+15%', bonus: { powerAdd: 0.35, ignoreDef: 0.15 } },
            { desc: '威力+45%・異常特攻さらに+25%', bonus: { powerAdd: 0.45, bonusVsAilment: 0.25 } },
            { desc: '威力+60%・撃破時ゲージ+50%', bonus: { powerAdd: 0.60, gaugeOnKill: 0.50 } }
          ])
        }
      ],
      resonance: makeResonance('mat_a2', 'mat_a3', 'mat_a4', '異常特攻+30%・会心ダメ+25%', { ailmentDmgPct: 0.30, critDmg: 0.25 }),
      lore: '深淵魔界から流れ着いたクールな黒衣の剣客。中二めいた名乗りに並々ならぬこだわりがあり、誰も聞いていない所で台詞の練習をしている。'
    },

    {
      id: 'ch_barga', name: 'バルガ', kana: 'ばるが', title: '魔獣の鋼拳王',
      element: 'dark', races: ['demon', 'beast'], role: 'tank', world: 'wilds',
      baseStats: { hp: 1420, atk: 124, def: 132, spd: 98, crit: 0.12, critDmg: 1.50, res: 0.18 },
      unlock: { type: 'stage', stageId: 'a3_s10', label: 'エリア3-10クリアで加入' },
      skills: [
        {
          id: 'sk_barga_1', tier: 1, type: 'active', name: '魔獣砕岩拳', target: 'single',
          cd: 0, power: 1.05, hits: 1,
          desc: '魔力を込めた豪拳で叩き潰し、与ダメージの一部で自身を回復する。',
          drainPct: 0.25,
          effects: [{ type: 'status', status: 'atk_down', chance: 0.50, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+20%・吸収量+10%', bonus: { powerAdd: 0.20, drainAdd: 0.10 } },
            { desc: '35%で敵を気絶1T', bonus: { extraEffect: { type: 'status', status: 'stun', chance: 0.35, turns: 1, target: 'target' } } },
            { desc: '威力+30%・自身に防護壁12%', bonus: { powerAdd: 0.30, extraEffect: { type: 'shield', hpPct: 0.12, turns: 2, target: 'self' } } }
          ])
        },
        {
          id: 'sk_barga_2', tier: 2, type: 'active', name: '覇王の咆哮陣', target: 'all',
          cd: 3, power: 1.35, hits: 1,
          desc: '大地を揺らす咆哮で敵全体に攻撃低下を与え、自身に挑発・反撃構え・継続再生を付与。',
          effects: [
            { type: 'status', status: 'atk_down', chance: 0.80, turns: 2, target: 'target' },
            { type: 'status', status: 'taunt', chance: 1.0, turns: 2, target: 'self' },
            { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' },
            { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+25%・敵全体防御低下2T追加', bonus: { powerAdd: 0.25, extraEffect: { type: 'status', status: 'def_down', chance: 0.70, turns: 2, target: 'target' } } },
            { desc: '自身に最大HP22%防護壁', bonus: { extraEffect: { type: 'shield', hpPct: 0.22, turns: 2, target: 'self' } } },
            { desc: '威力+35%・味方全体へ防御上昇2T', bonus: { powerAdd: 0.35, extraEffect: { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_barga_p', tier: 3, type: 'passive', name: '百獣魔血の闘気', target: 'self',
          cd: 0, power: 0,
          desc: '常時、反撃率+28%・被弾時ゲージ+10%。致死ダメージを1度HP1で耐える。',
          mod: { counterRate: 0.28, gaugeOnHit: 0.10, gutsOnce: true },
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '反撃威力+30%・HP+14%', bonus: { mod: { counterPower: 0.30, hpPct: 0.14 } } },
            { desc: '被ダメ-10%・防御+16%', bonus: { mod: { dmgTakenPct: -0.10, defPct: 0.16 } } },
            { desc: '反撃率+18%・行動開始HP6%回復', bonus: { mod: { counterRate: 0.18, turnRegenPct: 0.06 } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a2', 'mat_a3', 'mat_a4', '反撃率+18%・HP+20%', { counterRate: 0.18, hpPct: 0.20 }),
      lore: '魔物と獣の血を併せ持つ豪快な巨漢拳士。喧嘩っ早い見た目とは裏腹に面倒見が良く、迷子の妖精を肩に乗せて案内してあげる優しい親分肌。'
    },

    {
      id: 'ch_seraphi', name: 'セラフィ', kana: 'せらふぃ', title: '白銀の光巫女',
      element: 'light', races: ['god'], role: 'healer', world: 'sanctum',
      baseStats: { hp: 1080, atk: 136, def: 106, spd: 114, crit: 0.10, critDmg: 1.50, res: 0.28 },
      unlock: { type: 'stage', stageId: 'a4_s5', label: 'エリア4-5クリアで加入' },
      skills: [
        {
          id: 'sk_seraphi_1', tier: 1, type: 'active', name: '白銀の聖光弾', target: 'single',
          cd: 0, power: 1.00, hits: 1,
          desc: '聖なる光弾で敵単体を撃ち、最もHPが低い味方を回復＆防護壁を付与。',
          effects: [
            { type: 'heal', mult: 0.70, target: 'ally_lowest' },
            { type: 'shield', hpPct: 0.10, turns: 2, target: 'ally_lowest' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '回復倍率+25%・防護壁+5%', bonus: { healMultAdd: 0.25, shieldPctAdd: 0.05 } },
            { desc: '敵のバフを1つ解除', bonus: { extraEffect: { type: 'dispel', count: 1, target: 'target' } } },
            { desc: '威力+25%・対象味方の異常を1つ解除', bonus: { powerAdd: 0.25, extraEffect: { type: 'cleanse', count: 1, target: 'ally_lowest' } } }
          ])
        },
        {
          id: 'sk_seraphi_2', tier: 2, type: 'active', name: '天界の浄化光', target: 'ally_all',
          cd: 2, power: 0, hits: 0,
          desc: '味方全体のHPを回復し、状態異常を2つ解除して攻撃上昇を付与する。',
          effects: [
            { type: 'heal', mult: 1.55, hpPct: 0.16, target: 'ally_all' },
            { type: 'cleanse', count: 2, target: 'ally_all' },
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '回復倍率+30%・HP割合回復+6%', bonus: { healMultAdd: 0.30, healPctAdd: 0.06 } },
            { desc: '味方全体へ防護壁14%付与', bonus: { extraEffect: { type: 'shield', hpPct: 0.14, turns: 2, target: 'ally_all' } } },
            { desc: '味方全体ゲージ+16%', bonus: { extraEffect: { type: 'gauge', amount: 0.16, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_seraphi_3', tier: 3, type: 'active', name: '白金聖域の奇跡', target: 'ally_all',
          cd: 4, power: 0, hits: 0,
          desc: '倒れた味方を1人蘇生し、味方全員を大回復＋厚い防護壁で包み込む。',
          effects: [
            { type: 'revive', hpPct: 0.50, target: 'ally_single' },
            { type: 'heal', mult: 2.00, hpPct: 0.24, target: 'ally_all' },
            { type: 'shield', hpPct: 0.24, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '蘇生HP+20%・防護壁+8%', bonus: { revivePctAdd: 0.20, shieldPctAdd: 0.08 } },
            { desc: '味方全体へ継続再生2T・防御上昇2T', bonus: { extraEffect: { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'ally_all' } } },
            { desc: '回復量+35%・味方全体状態異常全解除', bonus: { healMultAdd: 0.35, extraEffect: { type: 'cleanse', count: 5, target: 'ally_all' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a3', 'mat_a4', 'mat_a4', '開幕防護壁20%・与回復+25%', { startShieldPct: 0.20, healDealtPct: 0.25 }),
      lore: '白銀神域から下界の混乱を調査しに降りてきた真面目な光巫女。常識外れの異界人たちに毎日ツッコミを入れているうち、すっかり旅団のまとめ役に落ち着いた。'
    },

    {
      id: 'ch_mikoto', name: 'ミコト', kana: 'みこと', title: '天雷の竜神子',
      element: 'light', races: ['dragon', 'god'], role: 'dealer', world: 'sanctum',
      baseStats: { hp: 1040, atk: 180, def: 94, spd: 120, crit: 0.20, critDmg: 1.62, res: 0.20 },
      unlock: { type: 'stage', stageId: 'a4_s10', label: 'エリア4-10クリアで加入' },
      skills: [
        {
          id: 'sk_mikoto_1', tier: 1, type: 'active', name: '天雷の竜刃', target: 'single',
          cd: 0, power: 1.15, hits: 1,
          desc: '神雷を宿す竜刃で敵単体を貫き、自身のゲージを15%引き上げる。',
          effects: [{ type: 'gauge', amount: 0.15, target: 'self' }],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '威力+20%・会心率+12%', bonus: { powerAdd: 0.20, critAdd: 0.12 } },
            { desc: '威力+25%・敵防御低下2T(60%)', bonus: { powerAdd: 0.25, extraEffect: { type: 'status', status: 'def_down', chance: 0.60, turns: 2, target: 'target' } } },
            { desc: '威力+30%・防御20%無視', bonus: { powerAdd: 0.30, ignoreDef: 0.20 } }
          ])
        },
        {
          id: 'sk_mikoto_2', tier: 2, type: 'active', name: '白金雷竜波', target: 'area',
          cd: 2, power: 1.65, hits: 2,
          desc: '神域の雷竜を呼び出し敵範囲を二連撃。敵のバフを1つ解除する。',
          effects: [
            { type: 'dispel', count: 1, target: 'target' },
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '威力+25%・会心上昇2T付与', bonus: { powerAdd: 0.25, extraEffect: { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'self' } } },
            { desc: '威力+35%・防御25%無視', bonus: { powerAdd: 0.35, ignoreDef: 0.25 } },
            { desc: '威力+45%・35%で気絶付与', bonus: { powerAdd: 0.45, extraEffect: { type: 'status', status: 'stun', chance: 0.35, turns: 1, target: 'target' } } }
          ])
        },
        {
          id: 'sk_mikoto_3', tier: 3, type: 'active', name: '神竜天罰雷', target: 'all',
          cd: 4, power: 2.35, hits: 3,
          desc: '天と竜の力を解放し敵全体へ白銀の神雷を三連降下させる究極技。',
          ignoreDef: 0.25,
          effects: [
            { type: 'status', status: 'vulnerable', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '威力+35%・会心率+18%', bonus: { powerAdd: 0.35, critAdd: 0.18 } },
            { desc: '威力+45%・防御無視さらに+15%', bonus: { powerAdd: 0.45, ignoreDef: 0.15 } },
            { desc: '威力+60%・撃破時ゲージ+40%', bonus: { powerAdd: 0.60, gaugeOnKill: 0.40 } }
          ])
        }
      ],
      resonance: makeResonance('mat_a3', 'mat_a4', 'mat_a4', '攻撃+18%・スキル与ダメ+22%', { atkPct: 0.18, skillDmgPct: 0.22 }),
      lore: '古竜と天空神の双方の祝福を受けて生まれた凛々しき竜神子。雷を操る荘厳な佇まいだが、猫や小動物を見ると頬が緩んで止まらなくなる。'
    },

    // ==================== 酒場加入 (8 — 確定スカウト、ガチャ一切なし!) ====================
    {
      id: 'ch_levia', name: 'レヴィア', kana: 'れびあ', title: '蒼鱗の水竜盾',
      element: 'water', races: ['dragon'], role: 'tank', world: 'dragonpeak',
      baseStats: { hp: 1380, atk: 108, def: 134, spd: 98, crit: 0.08, critDmg: 1.50, res: 0.22 },
      unlock: { type: 'tavern', cost: { gold: 900, chaosShard: 2, matId: 'mat_a1', matQty: 4 }, label: '酒場で確定加入' },
      skills: [
        {
          id: 'sk_levia_1', tier: 1, type: 'active', name: '蒼氷の尾撃', target: 'single',
          cd: 0, power: 1.00, hits: 1,
          desc: '冷気を纏う尻尾で敵単体を薙ぎ、35%で凍結を付与する。',
          effects: [{ type: 'status', status: 'freeze', chance: 0.35, turns: 1, target: 'target' }],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '威力+15%・凍結率+15%', bonus: { powerAdd: 0.15, chanceAdd: 0.15 } },
            { desc: '自身に最大HP12%の防護壁', bonus: { extraEffect: { type: 'shield', hpPct: 0.12, turns: 2, target: 'self' } } },
            { desc: '威力+25%・敵速度低下2T(65%)', bonus: { powerAdd: 0.25, extraEffect: { type: 'status', status: 'spd_down', chance: 0.65, turns: 2, target: 'target' } } }
          ])
        },
        {
          id: 'sk_levia_2', tier: 2, type: 'active', name: '氷鱗の守護陣', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全体に防護壁と継続再生を付与し、自身に挑発を張る。',
          effects: [
            { type: 'shield', hpPct: 0.22, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'taunt', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '防護壁+8%・自身に防御上昇2T', bonus: { shieldPctAdd: 0.08, extraEffect: { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'self' } } },
            { desc: '味方全体の状態異常を1つ解除', bonus: { extraEffect: { type: 'cleanse', count: 1, target: 'ally_all' } } },
            { desc: '防護壁さらに+10%・自身反撃構え2T', bonus: { shieldPctAdd: 0.10, extraEffect: { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' } } }
          ])
        },
        {
          id: 'sk_levia_3', tier: 3, type: 'active', name: '蒼海大津波', target: 'all',
          cd: 4, power: 1.55, hits: 1,
          desc: '凍てつく大波で敵全体を押し流し、攻撃低下と凍結を狙う。',
          effects: [
            { type: 'status', status: 'atk_down', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'freeze', chance: 0.45, turns: 1, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+25%・凍結率+15%', bonus: { powerAdd: 0.25, chanceAdd: 0.15 } },
            { desc: '自身HP20%回復', bonus: { extraEffect: { type: 'heal', hpPct: 0.20, target: 'self' } } },
            { desc: '威力+35%・味方全体へ防護壁16%', bonus: { powerAdd: 0.35, extraEffect: { type: 'shield', hpPct: 0.16, turns: 2, target: 'ally_all' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a1', 'mat_a2', 'mat_a3', 'HP+20%・行動開始HP6%回復', { hpPct: 0.20, turnRegenPct: 0.06 }),
      lore: '紅蓮竜峰の冷泉を守る穏やかな水竜の守護者。イグニスの暴走を涼しい顔で水かけして鎮めるのが日課で、酒場の氷作りも手伝っている。'
    },

    {
      id: 'ch_kagura', name: 'カグラ', kana: 'かぐら', title: '炎舞の紅狐姫',
      element: 'fire', races: ['beast'], role: 'supporter', world: 'wilds',
      baseStats: { hp: 910, atk: 134, def: 84, spd: 128, crit: 0.14, critDmg: 1.50, res: 0.16 },
      unlock: { type: 'tavern', cost: { gold: 1000, chaosShard: 2, matId: 'mat_a1', matQty: 5 }, label: '酒場で確定加入' },
      skills: [
        {
          id: 'sk_kagura_1', tier: 1, type: 'active', name: '狐火の扇舞', target: 'single',
          cd: 0, power: 1.00, hits: 1,
          desc: '舞い散る狐火で敵を焦がし、50%で火傷と脆弱を付与する。',
          effects: [
            { type: 'status', status: 'burn', chance: 0.50, turns: 2, target: 'target' },
            { type: 'status', status: 'vulnerable', chance: 0.45, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '威力+16%・付与率+18%', bonus: { powerAdd: 0.16, chanceAdd: 0.18 } },
            { desc: '自身ゲージ+15%', bonus: { selfGauge: 0.15 } },
            { desc: '威力+24%・敵のバフを1つ解除', bonus: { powerAdd: 0.24, extraEffect: { type: 'dispel', count: 1, target: 'target' } } }
          ])
        },
        {
          id: 'sk_kagura_2', tier: 2, type: 'active', name: '紅蓮祝詞の舞', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '華麗な神楽舞で味方全体に攻撃上昇・会心上昇を2T付与しゲージ+18%。',
          effects: [
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'gauge', amount: 0.18, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: 'ゲージ+8%', bonus: { gaugeAdd: 0.08 } },
            { desc: '味方全体に速度上昇2T追加', bonus: { extraEffect: { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' } } },
            { desc: '味方全体HP12%回復', bonus: { extraEffect: { type: 'heal', hpPct: 0.12, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_kagura_3', tier: 3, type: 'active', name: '百狐紅蓮祭', target: 'all',
          cd: 4, power: 1.60, hits: 2,
          desc: '百の狐火で敵全体を包み、火傷・防御低下・脆弱を同時に刻む大舞踏。',
          effects: [
            { type: 'status', status: 'burn', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'def_down', chance: 0.80, turns: 2, target: 'target' },
            { type: 'status', status: 'vulnerable', chance: 0.70, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+25%・付与率+15%', bonus: { powerAdd: 0.25, chanceAdd: 0.15 } },
            { desc: '味方全体ゲージ+20%', bonus: { extraEffect: { type: 'gauge', amount: 0.20, target: 'ally_all' } } },
            { desc: '威力+40%・火傷敵へ与ダメ+30%', bonus: { powerAdd: 0.40, bonusVsAilment: 0.30 } }
          ])
        }
      ],
      resonance: makeResonance('mat_a1', 'mat_a2', 'mat_a3', 'バフ持続+1T・速度+12%', { buffDuration: 1, spdPct: 0.12 }),
      lore: '極彩獣域の祭りを取り仕切る紅い尾の狐娘。賑やかな戦場が大好物で、仲間を応援するたびに鈴の音と炎の花びらが宙を舞う。'
    },

    {
      id: 'ch_lily', name: 'リリィ', kana: 'りりぃ', title: '機巧の森妖精',
      element: 'water', races: ['fairy', 'mech'], role: 'healer', world: 'mechcity',
      baseStats: { hp: 1000, atk: 126, def: 102, spd: 118, crit: 0.08, critDmg: 1.50, res: 0.24 },
      unlock: { type: 'tavern', cost: { gold: 1200, chaosShard: 3, matId: 'mat_a1', matQty: 6 }, label: '酒場で確定加入' },
      skills: [
        {
          id: 'sk_lily_1', tier: 1, type: 'active', name: 'ナノミスト噴霧', target: 'single',
          cd: 0, power: 0.90, hits: 1,
          desc: '微細水霧で敵を撃ちつつ、最も傷ついた味方を回復し防護壁を張る。',
          effects: [
            { type: 'heal', mult: 0.65, target: 'ally_lowest' },
            { type: 'shield', hpPct: 0.10, turns: 2, target: 'ally_lowest' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '回復量+25%・防護壁+5%', bonus: { healMultAdd: 0.25, shieldPctAdd: 0.05 } },
            { desc: '対象味方の状態異常を1つ解除', bonus: { extraEffect: { type: 'cleanse', count: 1, target: 'ally_lowest' } } },
            { desc: '対象味方に防御上昇2T追加', bonus: { extraEffect: { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'ally_lowest' } } }
          ])
        },
        {
          id: 'sk_lily_2', tier: 2, type: 'active', name: '精霊機巧バリア', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全員を回復し、厚い機巧防護壁と継続再生を同時展開する。',
          effects: [
            { type: 'heal', mult: 1.50, hpPct: 0.16, target: 'ally_all' },
            { type: 'shield', hpPct: 0.22, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a1', 'mat_a2', 'mat_a3', [
            { desc: '防護壁+8%・回復+25%', bonus: { shieldPctAdd: 0.08, healMultAdd: 0.25 } },
            { desc: '状態異常を2つ解除追加', bonus: { extraEffect: { type: 'cleanse', count: 2, target: 'ally_all' } } },
            { desc: '防護壁さらに+10%・味方ゲージ+14%', bonus: { shieldPctAdd: 0.10, extraEffect: { type: 'gauge', amount: 0.14, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_lily_p', tier: 3, type: 'passive', name: '自動修復ドローン', target: 'self',
          cd: 0, power: 0,
          desc: '常時、超過回復の55%を防護壁に変換、回復時に状態異常を1つ解除、開幕防護壁15%。',
          mod: { overhealShield: 0.55, cleanseOnHeal: 1, startShieldPct: 0.15 },
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '超過防護壁変換+20%・耐性+14%', bonus: { mod: { overhealShield: 0.20, res: 0.14 } } },
            { desc: '与回復+20%・WAVE回復+12%', bonus: { mod: { healDealtPct: 0.20, waveHealPct: 0.12 } } },
            { desc: '戦闘中1回味方自動蘇生(HP45%)', bonus: { mod: { reviveOnce: 0.45 } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a1', 'mat_a2', 'mat_a3', '開幕防護壁20%・与回復+22%', { startShieldPct: 0.20, healDealtPct: 0.22 }),
      lore: '機巧都市の医療ドローンに妖精の精霊核が宿って誕生した不思議な回復役。機械語と花言葉を混ぜて話すため、たまに会話が詩的にバグる。'
    },

    {
      id: 'ch_zephyr', name: 'ゼファー', kana: 'ぜふぁー', title: '蒼穹の双刃風',
      element: 'wind', races: ['human'], role: 'dealer', world: 'frontier',
      baseStats: { hp: 900, atk: 162, def: 76, spd: 134, crit: 0.22, critDmg: 1.58, res: 0.10 },
      unlock: { type: 'tavern', cost: { gold: 1500, chaosShard: 3, matId: 'mat_a2', matQty: 5 }, label: '酒場で確定加入' },
      skills: [
        {
          id: 'sk_zephyr_1', tier: 1, type: 'active', name: '旋風双剣斬', target: 'single',
          cd: 0, power: 1.06, hits: 2,
          desc: '二振りの短剣で敵単体を素早く連撃し、自身の速度を上げる。',
          effects: [{ type: 'status', status: 'spd_up', chance: 0.55, turns: 2, target: 'self' }],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+18%・速度上昇確定化', bonus: { powerAdd: 0.18, chanceAdd: 0.45 } },
            { desc: '威力+22%・自身ゲージ+15%', bonus: { powerAdd: 0.22, selfGauge: 0.15 } },
            { desc: '威力+28%・会心率+15%', bonus: { powerAdd: 0.28, critAdd: 0.15 } }
          ])
        },
        {
          id: 'sk_zephyr_2', tier: 2, type: 'active', name: '蒼穹ストーム刃', target: 'all',
          cd: 3, power: 1.65, hits: 3,
          desc: '戦場全体を縦横無尽に駆け抜け、敵全体に三連の風刃を浴びせる。',
          effects: [{ type: 'status', status: 'spd_down', chance: 0.65, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+25%・会心率+15%', bonus: { powerAdd: 0.25, critAdd: 0.15 } },
            { desc: '威力+35%・防御20%無視', bonus: { powerAdd: 0.35, ignoreDef: 0.20 } },
            { desc: '威力+45%・撃破時ゲージ+35%', bonus: { powerAdd: 0.45, gaugeOnKill: 0.35 } }
          ])
        },
        {
          id: 'sk_zephyr_p', tier: 3, type: 'passive', name: '音速の見切り', target: 'self',
          cd: 0, power: 0,
          desc: '常時、速度+16%・初期ゲージ+25%・追撃率+20%。',
          mod: { spdPct: 0.16, initGauge: 0.25, followUpRate: 0.20 },
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '追撃率+12%・会心+10%', bonus: { mod: { followUpRate: 0.12, crit: 0.10 } } },
            { desc: '会心ダメ+28%・攻撃+12%', bonus: { mod: { critDmg: 0.28, atkPct: 0.12 } } },
            { desc: '追撃威力+40%・会心時ゲージ+14%', bonus: { mod: { followUpPower: 0.40, gaugeOnCrit: 0.14 } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a2', 'mat_a3', 'mat_a4', '速度+18%・追撃率+18%', { spdPct: 0.18, followUpRate: 0.18 }),
      lore: '境界平原の飛脚ギルドで「最速の男」と呼ばれた双剣使い。手紙を届けた足で魔物も片付ける軽やかさだが、じっと座って会議するのが一番苦手。'
    },

    {
      id: 'ch_morgan', name: 'モルガン', kana: 'もるがん', title: '冥府の毒薬師',
      element: 'dark', races: ['demon'], role: 'supporter', world: 'abyss',
      baseStats: { hp: 940, atk: 138, def: 86, spd: 120, crit: 0.12, critDmg: 1.50, res: 0.20 },
      unlock: { type: 'tavern', cost: { gold: 1800, chaosShard: 4, matId: 'mat_a2', matQty: 6 }, label: '酒場で確定加入' },
      skills: [
        {
          id: 'sk_morgan_1', tier: 1, type: 'active', name: '紫霧フラスコ', target: 'single',
          cd: 0, power: 0.96, hits: 1,
          desc: '特製薬瓶を投げつけ敵単体に猛毒と攻撃低下を付与する。',
          effects: [
            { type: 'status', status: 'poison', chance: 0.70, turns: 2, target: 'target' },
            { type: 'status', status: 'atk_down', chance: 0.50, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+16%・付与率+20%', bonus: { powerAdd: 0.16, chanceAdd: 0.20 } },
            { desc: '対象へ防御低下2T追加(60%)', bonus: { extraEffect: { type: 'status', status: 'def_down', chance: 0.60, turns: 2, target: 'target' } } },
            { desc: '威力+25%・敵バフ1つ解除', bonus: { powerAdd: 0.25, extraEffect: { type: 'dispel', count: 1, target: 'target' } } }
          ])
        },
        {
          id: 'sk_morgan_2', tier: 2, type: 'active', name: '劇薬ミスト散布', target: 'area',
          cd: 2, power: 1.30, hits: 1,
          desc: '敵範囲を怪しい紫霧で包み、猛毒・防御低下・沈黙を撒き散らす。',
          effects: [
            { type: 'status', status: 'poison', chance: 0.85, turns: 3, target: 'target' },
            { type: 'status', status: 'def_down', chance: 0.75, turns: 2, target: 'target' },
            { type: 'status', status: 'silence', chance: 0.55, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+22%・沈黙率+20%', bonus: { powerAdd: 0.22, chanceAdd: 0.20 } },
            { desc: '敵範囲へ脆弱2T追加(75%)', bonus: { extraEffect: { type: 'status', status: 'vulnerable', chance: 0.75, turns: 2, target: 'target' } } },
            { desc: '威力+35%・異常敵へ与ダメ+35%', bonus: { powerAdd: 0.35, bonusVsAilment: 0.35 } }
          ])
        },
        {
          id: 'sk_morgan_3', tier: 3, type: 'active', name: '深淵大調合爆弾', target: 'all',
          cd: 4, power: 1.70, hits: 1,
          desc: '秘蔵の大瓶を炸裂させ敵全体に猛毒・火傷・脆弱を同時付与。異常中の敵には追撃効果。',
          bonusVsAilment: 0.45,
          effects: [
            { type: 'status', status: 'poison', chance: 0.90, turns: 3, target: 'target' },
            { type: 'status', status: 'burn', chance: 0.80, turns: 2, target: 'target' },
            { type: 'status', status: 'vulnerable', chance: 0.80, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '威力+30%・敵ゲージ-18%', bonus: { powerAdd: 0.30, extraEffect: { type: 'gauge', amount: -0.18, target: 'target' } } },
            { desc: '敵全体バフ2つ解除', bonus: { extraEffect: { type: 'dispel', count: 2, target: 'target' } } },
            { desc: '威力+45%・異常特攻さらに+30%', bonus: { powerAdd: 0.45, bonusVsAilment: 0.30 } }
          ])
        }
      ],
      resonance: makeResonance('mat_a2', 'mat_a3', 'mat_a4', '弱体持続+1T・異常付与+25%', { debuffDuration: 1, ailmentRate: 0.25 }),
      lore: '深淵魔界で「よく効く（ただし色がすごい）薬」を売っていた魔女風の調合師。味方用の滋養強壮ドリンクは紫に光るが驚くほど美味しい。'
    },

    {
      id: 'ch_aegis', name: 'イージス', kana: 'いーじす', title: '聖域の白金盾',
      element: 'light', races: ['god'], role: 'tank', world: 'sanctum',
      baseStats: { hp: 1460, atk: 112, def: 148, spd: 96, crit: 0.08, critDmg: 1.50, res: 0.28 },
      unlock: { type: 'tavern', cost: { gold: 2400, chaosShard: 5, matId: 'mat_a3', matQty: 6 }, label: '酒場で確定加入' },
      skills: [
        {
          id: 'sk_aegis_1', tier: 1, type: 'active', name: '白金盾の一撃', target: 'single',
          cd: 0, power: 1.00, hits: 1,
          desc: '重厚な神盾で敵単体を打ち据え、40%で気絶を付与する。',
          effects: [{ type: 'status', status: 'stun', chance: 0.40, turns: 1, target: 'target' }],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+18%・気絶率+15%', bonus: { powerAdd: 0.18, chanceAdd: 0.15 } },
            { desc: '自身HP12%回復', bonus: { extraEffect: { type: 'heal', hpPct: 0.12, target: 'self' } } },
            { desc: '味方全体へ防護壁10%', bonus: { extraEffect: { type: 'shield', hpPct: 0.10, turns: 2, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_aegis_2', tier: 2, type: 'active', name: '聖盾アブソリュート', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全体へ厚い防護壁と防御上昇を付与し、自身に挑発を張る。',
          effects: [
            { type: 'shield', hpPct: 0.28, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'taunt', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '防護壁+8%・状態異常1つ解除', bonus: { shieldPctAdd: 0.08, extraEffect: { type: 'cleanse', count: 1, target: 'ally_all' } } },
            { desc: '自身に反撃構え2T・継続再生2T', bonus: { extraEffect: { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' } } },
            { desc: '防護壁さらに+12%', bonus: { shieldPctAdd: 0.12 } }
          ])
        },
        {
          id: 'sk_aegis_3', tier: 3, type: 'active', name: '天界光輪審判', target: 'all',
          cd: 4, power: 1.55, hits: 1,
          desc: '神盾から眩い審判光を放ち敵全体を攻撃＋攻撃低下。味方全体へ防護壁を展開。',
          effects: [
            { type: 'status', status: 'atk_down', chance: 0.85, turns: 2, target: 'target' },
            { type: 'shield', hpPct: 0.20, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '威力+25%・防護壁+8%', bonus: { powerAdd: 0.25, shieldPctAdd: 0.08 } },
            { desc: '敵全体バフ1つ解除', bonus: { extraEffect: { type: 'dispel', count: 1, target: 'target' } } },
            { desc: '威力+35%・味方全体HP18%回復', bonus: { powerAdd: 0.35, extraEffect: { type: 'heal', hpPct: 0.18, target: 'ally_all' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a2', 'mat_a3', 'mat_a4', '被ダメ-14%・開幕防護壁25%', { dmgTakenPct: -0.14, startShieldPct: 0.25 }),
      lore: '白銀神域の正門を千年守り続けた堅物の神騎士。門ごと異界に飛ばされたのをきっかけに「ならば旅団ごと守る！」と決意した頼もしき大盾。'
    },

    {
      id: 'ch_tetsuo', name: 'テツオ', kana: 'てつお', title: '蒸気鍛冶職人',
      element: 'fire', races: ['human', 'mech'], role: 'tank', world: 'mechcity',
      baseStats: { hp: 1350, atk: 126, def: 130, spd: 100, crit: 0.12, critDmg: 1.50, res: 0.16 },
      unlock: { type: 'tavern', cost: { gold: 2000, chaosShard: 4, matId: 'mat_a2', matQty: 7 }, label: '酒場で確定加入' },
      skills: [
        {
          id: 'sk_tetsuo_1', tier: 1, type: 'active', name: '灼熱ハンマー打', target: 'single',
          cd: 0, power: 1.05, hits: 1,
          desc: '赤熱した蒸気鎚で敵を叩き、火傷と防御低下を狙う。',
          effects: [
            { type: 'status', status: 'burn', chance: 0.50, turns: 2, target: 'target' },
            { type: 'status', status: 'def_down', chance: 0.45, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+18%・付与率+20%', bonus: { powerAdd: 0.18, chanceAdd: 0.20 } },
            { desc: '自身に防護壁14%', bonus: { extraEffect: { type: 'shield', hpPct: 0.14, turns: 2, target: 'self' } } },
            { desc: '威力+28%・35%で気絶1T', bonus: { powerAdd: 0.28, extraEffect: { type: 'status', status: 'stun', chance: 0.35, turns: 1, target: 'target' } } }
          ])
        },
        {
          id: 'sk_tetsuo_2', tier: 2, type: 'active', name: '炉心フルバースト', target: 'area',
          cd: 3, power: 1.50, hits: 1,
          desc: '蒸気炉の熱波で敵範囲を焼き、自身に挑発・反撃構え・防護壁を展開。',
          effects: [
            { type: 'status', status: 'burn', chance: 0.75, turns: 2, target: 'target' },
            { type: 'status', status: 'taunt', chance: 1.0, turns: 2, target: 'self' },
            { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' },
            { type: 'shield', hpPct: 0.24, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+25%・防護壁+10%', bonus: { powerAdd: 0.25, shieldPctAdd: 0.10 } },
            { desc: '味方全体へ攻撃上昇2T付与', bonus: { extraEffect: { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' } } },
            { desc: '威力+35%・味方全体へ防護壁15%', bonus: { powerAdd: 0.35, extraEffect: { type: 'shield', hpPct: 0.15, turns: 2, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_tetsuo_p', tier: 3, type: 'passive', name: '職人の鋼鉄魂', target: 'self',
          cd: 0, power: 0,
          desc: '常時、反撃率+26%・反撃威力+25%・防御+14%。',
          mod: { counterRate: 0.26, counterPower: 0.25, defPct: 0.14 },
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '反撃率+12%・HP+14%', bonus: { mod: { counterRate: 0.12, hpPct: 0.14 } } },
            { desc: '庇護率+25%・開幕防護壁15%', bonus: { mod: { coverRate: 0.25, startShieldPct: 0.15 } } },
            { desc: '被ダメ-12%・被弾ゲージ+10%', bonus: { mod: { dmgTakenPct: -0.12, gaugeOnHit: 0.10 } } }
          ])
        }
      ],
      resonance: makeResonance('mat_a2', 'mat_a3', 'mat_a4', '反撃威力+35%・防御+18%', { counterPower: 0.35, defPct: 0.18 }),
      lore: '機巧都市一番の鍛冶屋にして義装職人。どんな異界の素材を見ても「こいつでいい鍋が作れるな」と目を輝かせる熱いおやっさん。'
    },

    {
      id: 'ch_shizuku', name: 'シズク', kana: 'しずく', title: '氷鏡の星詠み',
      element: 'water', races: ['human', 'god'], role: 'dealer', world: 'sanctum',
      baseStats: { hp: 940, atk: 170, def: 86, spd: 118, crit: 0.18, critDmg: 1.60, res: 0.18 },
      unlock: { type: 'tavern', cost: { gold: 2800, chaosShard: 6, matId: 'mat_a3', matQty: 7 }, label: '酒場で確定加入' },
      skills: [
        {
          id: 'sk_shizuku_1', tier: 1, type: 'active', name: '氷晶の星矢', target: 'single',
          cd: 0, power: 1.08, hits: 1,
          desc: '澄み渡る氷の矢で敵単体を射抜き、35%で凍結を付与する。',
          effects: [{ type: 'status', status: 'freeze', chance: 0.35, turns: 1, target: 'target' }],
          awakenings: makeAwaken('mat_a2', 'mat_a3', 'mat_a4', [
            { desc: '威力+18%・凍結率+15%', bonus: { powerAdd: 0.18, chanceAdd: 0.15 } },
            { desc: '威力+22%・異常敵へ与ダメ+30%', bonus: { powerAdd: 0.22, bonusVsAilment: 0.30 } },
            { desc: '威力+28%・自身ゲージ+15%', bonus: { powerAdd: 0.28, selfGauge: 0.15 } }
          ])
        },
        {
          id: 'sk_shizuku_2', tier: 2, type: 'active', name: '星鏡ブリザード', target: 'area',
          cd: 2, power: 1.55, hits: 2,
          desc: '氷の鏡面から吹雪を放ち敵範囲を攻撃。速度低下と凍結を与える。',
          effects: [
            { type: 'status', status: 'spd_down', chance: 0.75, turns: 2, target: 'target' },
            { type: 'status', status: 'freeze', chance: 0.45, turns: 1, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '威力+25%・凍結率+15%', bonus: { powerAdd: 0.25, chanceAdd: 0.15 } },
            { desc: '威力+32%・防御20%無視', bonus: { powerAdd: 0.32, ignoreDef: 0.20 } },
            { desc: '威力+42%・自身に会心上昇2T', bonus: { powerAdd: 0.42, extraEffect: { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'self' } } }
          ])
        },
        {
          id: 'sk_shizuku_3', tier: 3, type: 'active', name: '蒼天氷星墜とし', target: 'all',
          cd: 4, power: 2.15, hits: 2,
          desc: '星降る夜空を凍らせた氷星群で敵全体を穿つ奥義。凍結・弱体中の敵に大ダメージ。',
          bonusVsAilment: 0.40,
          effects: [
            { type: 'status', status: 'freeze', chance: 0.55, turns: 1, target: 'target' },
            { type: 'status', status: 'def_down', chance: 0.80, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_a3', 'mat_a4', 'mat_a4', [
            { desc: '威力+32%・防御20%無視', bonus: { powerAdd: 0.32, ignoreDef: 0.20 } },
            { desc: '威力+42%・凍結率+15%', bonus: { powerAdd: 0.42, chanceAdd: 0.15 } },
            { desc: '威力+55%・異常特攻さらに+25%', bonus: { powerAdd: 0.55, bonusVsAilment: 0.25 } }
          ])
        }
      ],
      resonance: makeResonance('mat_a2', 'mat_a3', 'mat_a4', '会心+14%・異常特攻+25%', { crit: 0.14, ailmentDmgPct: 0.25 }),
      lore: '白銀神域の天文台で星を詠んでいた神秘的な少女。神の雫を宿す瞳は冷静だが、実はかき氷のシロップ全種制覇を夢見ている。'
    },

    // ==================== 乱入指名手配加入 (4) ====================
    {
      id: 'ch_joker', name: 'ジョーカー', kana: 'じょーかー', title: '異界の道化師',
      element: 'none', races: ['demon'], role: 'supporter', world: 'abyss',
      baseStats: { hp: 960, atk: 142, def: 88, spd: 136, crit: 0.18, critDmg: 1.55, res: 0.18 },
      unlock: { type: 'bounty', bountyId: 'bty_joker', killsRequired: 3, label: '指名手配「異界道化」3勝で加入' },
      skills: [
        {
          id: 'sk_joker_1', tier: 1, type: 'active', name: 'びっくりトランプ', target: 'single',
          cd: 0, power: 1.05, hits: 1,
          desc: '鋭いカードを弾き飛ばし、敵のバフを1つ解除して脆弱を付与。',
          effects: [
            { type: 'dispel', count: 1, target: 'target' },
            { type: 'status', status: 'vulnerable', chance: 0.55, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_intruder', 'mat_a2', 'mat_a3', [
            { desc: '威力+18%・脆弱率+20%', bonus: { powerAdd: 0.18, chanceAdd: 0.20 } },
            { desc: '敵ゲージ-15%・自身ゲージ+15%', bonus: { selfGauge: 0.15, extraEffect: { type: 'gauge', amount: -0.15, target: 'target' } } },
            { desc: '威力+25%・50%で沈黙2T', bonus: { powerAdd: 0.25, extraEffect: { type: 'status', status: 'silence', chance: 0.50, turns: 2, target: 'target' } } }
          ])
        },
        {
          id: 'sk_joker_2', tier: 2, type: 'active', name: 'はちゃめちゃ手品', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全体へ攻撃・速度・会心上昇を一気に配り、ゲージを22%加速させる。',
          effects: [
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'gauge', amount: 0.22, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_intruder', 'mat_a3', 'mat_a4', [
            { desc: 'ゲージ加速+8%', bonus: { gaugeAdd: 0.08 } },
            { desc: '味方全体の状態異常を1つ解除', bonus: { extraEffect: { type: 'cleanse', count: 1, target: 'ally_all' } } },
            { desc: '味方全体へ防護壁16%付与', bonus: { extraEffect: { type: 'shield', hpPct: 0.16, turns: 2, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_joker_3', tier: 3, type: 'active', name: 'カーテンコール爆弾', target: 'all',
          cd: 4, power: 1.70, hits: 2,
          desc: '派手な紙吹雪と共に敵全体へ爆撃！防御低下・速度低下・ゲージ後退を押し付ける。',
          effects: [
            { type: 'status', status: 'def_down', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'spd_down', chance: 0.85, turns: 2, target: 'target' },
            { type: 'gauge', amount: -0.22, target: 'target' }
          ],
          awakenings: makeAwaken('mat_intruder', 'mat_a3', 'mat_a4', [
            { desc: '威力+28%・敵バフ1つ解除', bonus: { powerAdd: 0.28, extraEffect: { type: 'dispel', count: 1, target: 'target' } } },
            { desc: '威力+35%・ゲージ後退さらに-10%', bonus: { powerAdd: 0.35, gaugeAdd: -0.10 } },
            { desc: '威力+45%・味方全体ゲージ+20%', bonus: { powerAdd: 0.45, extraEffect: { type: 'gauge', amount: 0.20, target: 'ally_all' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_intruder', 'mat_a3', 'mat_a4', '初期ゲージ+35%・速度+15%', { initGauge: 0.35, spdPct: 0.15 }),
      lore: '戦場の一番いい場面に必ず割り込んでくる神出鬼没の道化師。「三度捕まえたら仲間になってやるよ」と約束し、律儀に本当に仲間になってくれた。'
    },

    {
      id: 'ch_raiga', name: 'ライガ', kana: 'らいが', title: '紅炎の竜人武者',
      element: 'fire', races: ['human', 'dragon'], role: 'dealer', world: 'dragonpeak',
      baseStats: { hp: 1080, atk: 176, def: 96, spd: 114, crit: 0.19, critDmg: 1.62, res: 0.14 },
      unlock: { type: 'bounty', bountyId: 'bty_raiga', killsRequired: 3, label: '指名手配「紅炎武者」3勝で加入' },
      skills: [
        {
          id: 'sk_raiga_1', tier: 1, type: 'active', name: '竜炎抜刀斬', target: 'single',
          cd: 0, power: 1.15, hits: 1,
          desc: '灼熱の太刀筋で敵単体を両断し、火傷を付与する。',
          effects: [{ type: 'status', status: 'burn', chance: 0.55, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_intruder', 'mat_a2', 'mat_a3', [
            { desc: '威力+18%・防御15%無視', bonus: { powerAdd: 0.18, ignoreDef: 0.15 } },
            { desc: '威力+24%・自身に攻撃上昇1T', bonus: { powerAdd: 0.24, extraEffect: { type: 'status', status: 'atk_up', chance: 1.0, turns: 1, target: 'self' } } },
            { desc: '威力+30%・会心率+18%', bonus: { powerAdd: 0.30, critAdd: 0.18 } }
          ])
        },
        {
          id: 'sk_raiga_2', tier: 2, type: 'active', name: '紅蓮覇竜閃', target: 'area',
          cd: 3, power: 2.05, hits: 2,
          desc: '竜の闘気を刃に纏わせ敵範囲を焼き切る剛剣。自身に反撃構えを付与。',
          ignoreDef: 0.20,
          effects: [
            { type: 'status', status: 'burn', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_intruder', 'mat_a3', 'mat_a4', [
            { desc: '威力+30%・防御無視+10%', bonus: { powerAdd: 0.30, ignoreDef: 0.10 } },
            { desc: '威力+40%・自身HP20%吸収', bonus: { powerAdd: 0.40, drainAdd: 0.20 } },
            { desc: '威力+55%・撃破時ゲージ+40%', bonus: { powerAdd: 0.55, gaugeOnKill: 0.40 } }
          ])
        },
        {
          id: 'sk_raiga_p', tier: 3, type: 'passive', name: '不退転の竜血', target: 'self',
          cd: 0, power: 0,
          desc: 'HPが減るほど与ダメ最大+45%。致死ダメージを1回耐え、反撃率+22%。',
          mod: { lowHpDmgPct: 0.45, gutsOnce: true, counterRate: 0.22 },
          awakenings: makeAwaken('mat_intruder', 'mat_a3', 'mat_a4', [
            { desc: '背水与ダメさらに+20%・攻撃+12%', bonus: { mod: { lowHpDmgPct: 0.20, atkPct: 0.12 } } },
            { desc: '会心+14%・会心ダメ+24%', bonus: { mod: { crit: 0.14, critDmg: 0.24 } } },
            { desc: '反撃率+16%・与ダメ+14%', bonus: { mod: { counterRate: 0.16, dmgDealtPct: 0.14 } } }
          ])
        }
      ],
      resonance: makeResonance('mat_intruder', 'mat_a3', 'mat_a4', '攻撃+18%・背水与ダメ+25%', { atkPct: 0.18, lowHpDmgPct: 0.25 }),
      lore: '強者を求めて各地の戦場に乱入していた竜人の流浪武者。一本気な性格で、一度認めた仲間には背中を丸ごと預ける熱い侍魂の持ち主。'
    },

    {
      id: 'ch_piko', name: 'ピコット', kana: 'ぴこっと', title: '暴走の星屑機',
      element: 'wind', races: ['mech'], role: 'supporter', world: 'mechcity',
      baseStats: { hp: 920, atk: 132, def: 96, spd: 138, crit: 0.12, critDmg: 1.50, res: 0.18 },
      unlock: { type: 'bounty', bountyId: 'bty_piko', killsRequired: 3, label: '指名手配「暴走星機」3勝で加入' },
      skills: [
        {
          id: 'sk_piko_1', tier: 1, type: 'active', name: '星屑ビーム弾', target: 'single',
          cd: 0, power: 1.00, hits: 2,
          desc: '軽快な二連レーザーで敵を撃ち、50%で速度低下を付与する。',
          effects: [{ type: 'status', status: 'spd_down', chance: 0.50, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_intruder', 'mat_a2', 'mat_a3', [
            { desc: '威力+16%・速度低下率+20%', bonus: { powerAdd: 0.16, chanceAdd: 0.20 } },
            { desc: '最もゲージの低い味方のゲージ+20%', bonus: { extraEffect: { type: 'gauge', amount: 0.20, target: 'ally_lowest_gauge' } } },
            { desc: '威力+25%・30%で気絶付与', bonus: { powerAdd: 0.25, extraEffect: { type: 'status', status: 'stun', chance: 0.30, turns: 1, target: 'target' } } }
          ])
        },
        {
          id: 'sk_piko_2', tier: 2, type: 'active', name: 'ターボ星屑ブースト', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全体の行動ゲージを30%押し上げ、速度上昇を2T付与する超加速支援。',
          effects: [
            { type: 'gauge', amount: 0.30, target: 'ally_all' },
            { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_intruder', 'mat_a3', 'mat_a4', [
            { desc: 'ゲージ加速+10%', bonus: { gaugeAdd: 0.10 } },
            { desc: '味方全体へ会心上昇2T付与', bonus: { extraEffect: { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'ally_all' } } },
            { desc: '味方全体へ防護壁14%追加', bonus: { extraEffect: { type: 'shield', hpPct: 0.14, turns: 2, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_piko_3', tier: 3, type: 'active', name: 'スターライト暴走砲', target: 'all',
          cd: 4, power: 1.65, hits: 3,
          desc: '星屑エネルギーを敵全体へ乱射！防御低下と敵ゲージ後退を叩き込む。',
          effects: [
            { type: 'status', status: 'def_down', chance: 0.80, turns: 2, target: 'target' },
            { type: 'gauge', amount: -0.20, target: 'target' }
          ],
          awakenings: makeAwaken('mat_intruder', 'mat_a3', 'mat_a4', [
            { desc: '威力+28%・ゲージ後退さらに-10%', bonus: { powerAdd: 0.28, gaugeAdd: -0.10 } },
            { desc: '味方全体へ攻撃上昇2T', bonus: { extraEffect: { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' } } },
            { desc: '威力+40%・敵全体35%気絶', bonus: { powerAdd: 0.40, extraEffect: { type: 'status', status: 'stun', chance: 0.35, turns: 1, target: 'target' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_intruder', 'mat_a3', 'mat_a4', '速度+20%・初期ゲージ+30%', { spdPct: 0.20, initGauge: 0.30 }),
      lore: '機巧都市の天文衛星が地上に落ちて動き出した元気いっぱいの小型機。テンションが上がると語尾に「ピコ！」がつき、味方まで超高速にしてしまう。'
    },

    {
      id: 'ch_lunaria', name: 'ルナリア', kana: 'るなりあ', title: '月蝕の黒妖精',
      element: 'dark', races: ['god', 'fairy'], role: 'healer', world: 'fairyvale',
      baseStats: { hp: 1050, atk: 142, def: 96, spd: 120, crit: 0.12, critDmg: 1.50, res: 0.26 },
      unlock: { type: 'bounty', bountyId: 'bty_lunaria', killsRequired: 3, label: '指名手配「月蝕妖精」3勝で加入' },
      skills: [
        {
          id: 'sk_lunaria_1', tier: 1, type: 'active', name: '月影の吸魂光', target: 'single',
          cd: 0, power: 1.02, hits: 1,
          desc: '妖しい月光で敵を打ちつつ、奪った魔力でHP最低の味方を癒やす。',
          effects: [
            { type: 'heal', mult: 0.80, target: 'ally_lowest' },
            { type: 'status', status: 'atk_down', chance: 0.45, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_intruder', 'mat_a3', 'mat_a4', [
            { desc: '回復倍率+25%・威力+15%', bonus: { healMultAdd: 0.25, powerAdd: 0.15 } },
            { desc: '対象味方の異常を1つ解除', bonus: { extraEffect: { type: 'cleanse', count: 1, target: 'ally_lowest' } } },
            { desc: '敵へ猛毒2T(65%)追加', bonus: { extraEffect: { type: 'status', status: 'poison', chance: 0.65, turns: 2, target: 'target' } } }
          ])
        },
        {
          id: 'sk_lunaria_2', tier: 2, type: 'active', name: '黒月の癒し帳', target: 'ally_all',
          cd: 2, power: 0, hits: 0,
          desc: '静謐な月光で味方全員を回復し、継続再生と会心上昇を付与する。',
          effects: [
            { type: 'heal', mult: 1.60, hpPct: 0.18, target: 'ally_all' },
            { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_intruder', 'mat_a3', 'mat_a4', [
            { desc: '回復量+28%・状態異常1つ解除', bonus: { healMultAdd: 0.28, extraEffect: { type: 'cleanse', count: 1, target: 'ally_all' } } },
            { desc: '味方全体へ防護壁15%', bonus: { extraEffect: { type: 'shield', hpPct: 0.15, turns: 2, target: 'ally_all' } } },
            { desc: '回復量さらに+30%・味方ゲージ+15%', bonus: { healMultAdd: 0.30, extraEffect: { type: 'gauge', amount: 0.15, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_lunaria_3', tier: 3, type: 'active', name: '月蝕レクイエム', target: 'all',
          cd: 4, power: 1.60, hits: 1,
          desc: '敵全体へ月蝕の呪光を降らせて攻撃低下＋沈黙を与え、同時に味方全員を大回復！',
          effects: [
            { type: 'status', status: 'atk_down', chance: 0.80, turns: 2, target: 'target' },
            { type: 'status', status: 'silence', chance: 0.65, turns: 2, target: 'target' },
            { type: 'heal', mult: 1.65, hpPct: 0.20, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_intruder', 'mat_a3', 'mat_a4', [
            { desc: '威力+25%・回復量+30%', bonus: { powerAdd: 0.25, healMultAdd: 0.30 } },
            { desc: '味方全体異常2つ解除', bonus: { extraEffect: { type: 'cleanse', count: 2, target: 'ally_all' } } },
            { desc: '味方戦闘不能1人蘇生(HP45%)追加', bonus: { extraEffect: { type: 'revive', hpPct: 0.45, target: 'ally_single' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_intruder', 'mat_a3', 'mat_a4', '与回復+26%・異常付与+20%', { healDealtPct: 0.26, ailmentRate: 0.20 }),
      lore: '新月の夜だけ現れると噂された神格妖精。実は朝が弱く昼間は大きな花のつぼみで寝ていただけ。夜食のハーブティーに目が無い。'
    },

    // ==================== PvE到達加入 (4 — 強力な複合種族キャラ!) ====================
    {
      id: 'ch_valkyr', name: 'ヴァルキア', kana: 'ばるきあ', title: '蒼銀の戦乙女',
      element: 'water', races: ['god', 'mech'], role: 'tank', world: 'sanctum',
      baseStats: { hp: 1480, atk: 132, def: 146, spd: 108, crit: 0.12, critDmg: 1.52, res: 0.24 },
      unlock: { type: 'pve', mode: 'tower', targetId: 'tw_10', label: '混線タワー10階クリアで加入' },
      skills: [
        {
          id: 'sk_valkyr_1', tier: 1, type: 'active', name: '蒼銀機槍突き', target: 'single',
          cd: 0, power: 1.08, hits: 1,
          desc: '神機槍で敵単体を穿ち、自身に防護壁を張る。',
          effects: [
            { type: 'shield', hpPct: 0.14, turns: 2, target: 'self' },
            { type: 'status', status: 'def_down', chance: 0.50, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_tower', 'mat_a3', 'mat_a4', [
            { desc: '威力+20%・防護壁+6%', bonus: { powerAdd: 0.20, shieldPctAdd: 0.06 } },
            { desc: '敵バフ1つ解除', bonus: { extraEffect: { type: 'dispel', count: 1, target: 'target' } } },
            { desc: '威力+30%・40%で凍結1T', bonus: { powerAdd: 0.30, extraEffect: { type: 'status', status: 'freeze', chance: 0.40, turns: 1, target: 'target' } } }
          ])
        },
        {
          id: 'sk_valkyr_2', tier: 2, type: 'active', name: '戦乙女の蒼穹陣', target: 'ally_all',
          cd: 3, power: 0, hits: 0,
          desc: '味方全体へ強固な防護壁と攻撃上昇・防御上昇を授け、自身は挑発＆反撃構えに入る。',
          effects: [
            { type: 'shield', hpPct: 0.26, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'taunt', chance: 1.0, turns: 2, target: 'self' },
            { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_tower', 'mat_a3', 'mat_a4', [
            { desc: '防護壁+8%・状態異常1つ解除', bonus: { shieldPctAdd: 0.08, extraEffect: { type: 'cleanse', count: 1, target: 'ally_all' } } },
            { desc: '味方全体ゲージ+16%', bonus: { extraEffect: { type: 'gauge', amount: 0.16, target: 'ally_all' } } },
            { desc: '防護壁さらに+12%・自身HP20%回復', bonus: { shieldPctAdd: 0.12, extraEffect: { type: 'heal', hpPct: 0.20, target: 'self' } } }
          ])
        },
        {
          id: 'sk_valkyr_3', tier: 3, type: 'active', name: '蒼氷機神突撃', target: 'all',
          cd: 4, power: 1.75, hits: 2,
          desc: '白銀の翼を展開して敵全体へ突撃！凍結と攻撃低下を刻み、味方へ防護壁を張る。',
          effects: [
            { type: 'status', status: 'freeze', chance: 0.50, turns: 1, target: 'target' },
            { type: 'status', status: 'atk_down', chance: 0.85, turns: 2, target: 'target' },
            { type: 'shield', hpPct: 0.18, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_tower', 'mat_a4', 'mat_a4', [
            { desc: '威力+30%・凍結率+15%', bonus: { powerAdd: 0.30, chanceAdd: 0.15 } },
            { desc: '威力+40%・防護壁+10%', bonus: { powerAdd: 0.40, shieldPctAdd: 0.10 } },
            { desc: '威力+50%・自身継続再生2T', bonus: { powerAdd: 0.50, extraEffect: { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'self' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_tower', 'mat_a3', 'mat_a4', '防御+22%・反撃率+20%・庇護+20%', { defPct: 0.22, counterRate: 0.20, coverRate: 0.20 }),
      lore: '白銀神域の翼と機巧都市の推進器を併せ持つ蒼銀の戦乙女。異界混線タワーで旅団の実力を認め、誇り高き前衛として翼を貸してくれた。'
    },

    {
      id: 'ch_drake', name: 'ドレイク', kana: 'どれいく', title: '機装の黒鋼竜',
      element: 'none', races: ['dragon', 'mech'], role: 'dealer', world: 'dragonpeak',
      baseStats: { hp: 1120, atk: 186, def: 108, spd: 116, crit: 0.20, critDmg: 1.65, res: 0.16 },
      unlock: { type: 'pve', mode: 'superboss', targetId: 'sb_1', label: '超ボス「機竜帝オメガ」計測到達で加入' },
      skills: [
        {
          id: 'sk_drake_1', tier: 1, type: 'active', name: '黒鋼竜砲撃', target: 'single',
          cd: 0, power: 1.18, hits: 2,
          desc: '肩部の機竜砲から二連撃を叩き込み、敵の防御を低下させる。',
          effects: [{ type: 'status', status: 'def_down', chance: 0.55, turns: 2, target: 'target' }],
          awakenings: makeAwaken('mat_boss', 'mat_a3', 'mat_a4', [
            { desc: '威力+20%・防御15%無視', bonus: { powerAdd: 0.20, ignoreDef: 0.15 } },
            { desc: '威力+25%・自身ゲージ+15%', bonus: { powerAdd: 0.25, selfGauge: 0.15 } },
            { desc: '威力+32%・会心率+18%', bonus: { powerAdd: 0.32, critAdd: 0.18 } }
          ])
        },
        {
          id: 'sk_drake_2', tier: 2, type: 'active', name: '零距離オメガ砲', target: 'all',
          cd: 3, power: 2.25, hits: 3,
          desc: '全炉心を直結させた黒鋼の竜砲で敵全体を薙ぎ払う圧巻の砲撃。',
          ignoreDef: 0.30,
          effects: [
            { type: 'status', status: 'vulnerable', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_boss', 'mat_a3', 'mat_a4', [
            { desc: '威力+35%・防御無視+10%', bonus: { powerAdd: 0.35, ignoreDef: 0.10 } },
            { desc: '威力+45%・会心率+20%', bonus: { powerAdd: 0.45, critAdd: 0.20 } },
            { desc: '威力+60%・撃破時ゲージ+40%', bonus: { powerAdd: 0.60, gaugeOnKill: 0.40 } }
          ])
        },
        {
          id: 'sk_drake_p', tier: 3, type: 'passive', name: '機竜炉心フル稼働', target: 'self',
          cd: 0, power: 0,
          desc: '常時、攻撃+18%・追撃率+22%・開幕防護壁18%。無属性ゆえ弱点が存在しない。',
          mod: { atkPct: 0.18, followUpRate: 0.22, startShieldPct: 0.18 },
          awakenings: makeAwaken('mat_boss', 'mat_a4', 'mat_a4', [
            { desc: '追撃威力+30%・会心ダメ+25%', bonus: { mod: { followUpPower: 0.30, critDmg: 0.25 } } },
            { desc: '範囲与ダメ+22%・速度+10%', bonus: { mod: { aoeDmgPct: 0.22, spdPct: 0.10 } } },
            { desc: '与ダメ+18%・会心時ゲージ+15%', bonus: { mod: { dmgDealtPct: 0.18, gaugeOnCrit: 0.15 } } }
          ])
        }
      ],
      resonance: makeResonance('mat_boss', 'mat_a3', 'mat_a4', '攻撃+22%・与ダメ+16%', { atkPct: 0.22, dmgDealtPct: 0.16 }),
      lore: '超巨兵オメガの試作核から独立した誇り高き機装竜戦士。無骨な装甲に似合わず細かい模型作りが趣味で、ボルトと徹夜で設計図を語り合う。'
    },

    {
      id: 'ch_celestia', name: 'セレス', kana: 'せれす', title: '星界の黎明神',
      element: 'light', races: ['god', 'fairy'], role: 'healer', world: 'sanctum',
      baseStats: { hp: 1120, atk: 146, def: 112, spd: 124, crit: 0.10, critDmg: 1.50, res: 0.32 },
      unlock: { type: 'pve', mode: 'tower', targetId: 'tw_20', label: '混線タワー20階踏破で加入' },
      skills: [
        {
          id: 'sk_celes_1', tier: 1, type: 'active', name: '黎明の星雫', target: 'single',
          cd: 0, power: 1.05, hits: 1,
          desc: '朝焼けの星光で敵を打ち、味方全体のHPを小回復しゲージを10%進める。',
          effects: [
            { type: 'heal', mult: 0.60, target: 'ally_all' },
            { type: 'gauge', amount: 0.10, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_tower', 'mat_a4', 'mat_a4', [
            { desc: '回復量+25%・ゲージ加速+5%', bonus: { healMultAdd: 0.25, gaugeAdd: 0.05 } },
            { desc: '最も傷ついた味方の異常を1つ解除', bonus: { extraEffect: { type: 'cleanse', count: 1, target: 'ally_lowest' } } },
            { desc: '威力+25%・味方全体へ防護壁10%', bonus: { powerAdd: 0.25, extraEffect: { type: 'shield', hpPct: 0.10, turns: 2, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_celes_2', tier: 2, type: 'active', name: '星界の祝福賛歌', target: 'ally_all',
          cd: 2, power: 0, hits: 0,
          desc: '味方全員を回復し、攻撃・防御・速度上昇を2T付与して状態異常を2つ祓う。',
          effects: [
            { type: 'heal', mult: 1.65, hpPct: 0.18, target: 'ally_all' },
            { type: 'cleanse', count: 2, target: 'ally_all' },
            { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'ally_all' },
            { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_tower', 'mat_a4', 'mat_a4', [
            { desc: '回復量+30%・HP割合回復+8%', bonus: { healMultAdd: 0.30, healPctAdd: 0.08 } },
            { desc: '味方全体へ防護壁18%追加', bonus: { extraEffect: { type: 'shield', hpPct: 0.18, turns: 2, target: 'ally_all' } } },
            { desc: '味方全体ゲージ+20%', bonus: { extraEffect: { type: 'gauge', amount: 0.20, target: 'ally_all' } } }
          ])
        },
        {
          id: 'sk_celes_3', tier: 3, type: 'active', name: '暁の創世光', target: 'ally_all',
          cd: 4, power: 0, hits: 0,
          desc: '倒れた味方を蘇生し、味方全員を極大回復＋継続再生＋強固な防護壁で満たす。',
          effects: [
            { type: 'revive', hpPct: 0.70, target: 'ally_single' },
            { type: 'heal', mult: 2.20, hpPct: 0.30, target: 'ally_all' },
            { type: 'shield', hpPct: 0.28, turns: 3, target: 'ally_all' },
            { type: 'status', status: 'regen', chance: 1.0, turns: 3, target: 'ally_all' }
          ],
          awakenings: makeAwaken('mat_tower', 'mat_a4', 'mat_a4', [
            { desc: '蘇生HP+20%・防護壁+10%', bonus: { revivePctAdd: 0.20, shieldPctAdd: 0.10 } },
            { desc: '味方全体状態異常全解除', bonus: { extraEffect: { type: 'cleanse', count: 5, target: 'ally_all' } } },
            { desc: '味方全体ゲージ+25%・会心上昇2T', bonus: { extraEffect: { type: 'gauge', amount: 0.25, target: 'ally_all' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_tower', 'mat_a4', 'mat_a4', '与回復+30%・超過回復60%防護壁化', { healDealtPct: 0.30, overhealShield: 0.60 }),
      lore: '混線タワー最上階で七つの世界の夜明けを見守っていた神格の妖精王。微笑み一つで戦場の傷を癒やすが、実は冒険者たちの騒がしい旅話が大好物。'
    },

    {
      id: 'ch_abyssal', name: 'アビス', kana: 'あびす', title: '終焉の魔神王',
      element: 'dark', races: ['god', 'demon'], role: 'tank', world: 'abyss',
      baseStats: { hp: 1520, atk: 142, def: 144, spd: 106, crit: 0.14, critDmg: 1.55, res: 0.26 },
      unlock: { type: 'pve', mode: 'relay', targetId: 'rl_1', label: 'リレー総力戦「境界防衛」制覇で加入' },
      skills: [
        {
          id: 'sk_abyssal_1', tier: 1, type: 'active', name: '深淵王の魔爪', target: 'single',
          cd: 0, power: 1.12, hits: 1,
          desc: '魔神の爪で敵を引き裂き、与ダメの30%を吸収しつつ猛毒と攻撃低下を与える。',
          drainPct: 0.30,
          effects: [
            { type: 'status', status: 'poison', chance: 0.60, turns: 2, target: 'target' },
            { type: 'status', status: 'atk_down', chance: 0.55, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_relay', 'mat_a3', 'mat_a4', [
            { desc: '威力+20%・吸収+15%', bonus: { powerAdd: 0.20, drainAdd: 0.15 } },
            { desc: '敵バフ1つ解除', bonus: { extraEffect: { type: 'dispel', count: 1, target: 'target' } } },
            { desc: '威力+30%・自身防護壁15%', bonus: { powerAdd: 0.30, extraEffect: { type: 'shield', hpPct: 0.15, turns: 2, target: 'self' } } }
          ])
        },
        {
          id: 'sk_abyssal_2', tier: 2, type: 'active', name: '魔神玉座の威光', target: 'all',
          cd: 3, power: 1.45, hits: 1,
          desc: '敵全体へ攻撃低下・防御低下を押し付け、自身に挑発・反撃構え・防護壁を張る。',
          effects: [
            { type: 'status', status: 'atk_down', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'def_down', chance: 0.80, turns: 2, target: 'target' },
            { type: 'status', status: 'taunt', chance: 1.0, turns: 2, target: 'self' },
            { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' },
            { type: 'shield', hpPct: 0.28, turns: 2, target: 'self' }
          ],
          awakenings: makeAwaken('mat_relay', 'mat_a4', 'mat_a4', [
            { desc: '威力+25%・防護壁+10%', bonus: { powerAdd: 0.25, shieldPctAdd: 0.10 } },
            { desc: '味方全体へも防護壁18%', bonus: { extraEffect: { type: 'shield', hpPct: 0.18, turns: 2, target: 'ally_all' } } },
            { desc: '威力+35%・敵全体ゲージ-18%', bonus: { powerAdd: 0.35, extraEffect: { type: 'gauge', amount: -0.18, target: 'target' } } }
          ])
        },
        {
          id: 'sk_abyssal_3', tier: 3, type: 'active', name: '終焉ディメンション', target: 'all',
          cd: 4, power: 2.00, hits: 2,
          desc: '異界の暗黒波で敵全体を呑み込み、脆弱・沈黙・猛毒を刻みつつ自身を大回復。',
          drainPct: 0.35,
          effects: [
            { type: 'status', status: 'vulnerable', chance: 0.85, turns: 2, target: 'target' },
            { type: 'status', status: 'silence', chance: 0.65, turns: 2, target: 'target' },
            { type: 'status', status: 'poison', chance: 0.80, turns: 2, target: 'target' }
          ],
          awakenings: makeAwaken('mat_relay', 'mat_a4', 'mat_a4', [
            { desc: '威力+35%・吸収+15%', bonus: { powerAdd: 0.35, drainAdd: 0.15 } },
            { desc: '敵全体バフ2つ解除', bonus: { extraEffect: { type: 'dispel', count: 2, target: 'target' } } },
            { desc: '威力+50%・味方全体へ攻撃上昇2T', bonus: { powerAdd: 0.50, extraEffect: { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' } } }
          ])
        }
      ],
      resonance: makeResonance('mat_relay', 'mat_a4', 'mat_a4', '被ダメ-14%・反撃率+22%・HP+18%', { dmgTakenPct: -0.14, counterRate: 0.22, hpPct: 0.18 }),
      lore: '深淵魔界を統べていた威厳あふれる魔神王。多部隊総力戦の熱気に心を動かされ「余の玉座も持ち運べるようにした」と自ら前線に立ち始めた。'
    }
  ];

  // 種族配列の正規化チェックとマップ生成
  D.CHAR_BY_ID = {};
  D.CHARACTERS.forEach(function (ch) {
    if (HS.Utils && HS.Utils.normalizeRaces) {
      ch.races = HS.Utils.normalizeRaces(ch.races);
    }
    D.CHAR_BY_ID[ch.id] = ch;
  });
})(typeof window !== 'undefined' ? window : globalThis);
