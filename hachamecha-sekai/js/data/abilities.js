(function () {
  'use strict';

  const Hacha = window.Hacha;

  /*
   * ロール別アビリティ全100種（4ロール × 5段階 × 各5択）
   * 段階解放コスト: 段階2(結晶4/資金300), 段階3(結晶8/資金650), 段階4(結晶14/資金1200), 段階5(結晶22/資金2200)
   * 解放済み段階の5択はいつでも無料で付け替え可能
   */
  const ABILITY_UNLOCK_COSTS = {
    2: { crystals: 4,  coins: 300 },
    3: { crystals: 8,  coins: 650 },
    4: { crystals: 14, coins: 1200 },
    5: { crystals: 22, coins: 2200 }
  };

  const ABILITIES_BY_ROLE = {
    tank: [
      /* 段階1 */
      [
        { id: 'ab_t_1_1', name: '鉄壁の構え',   desc: '最大HP+14%',                           mod: { hpPct: 0.14 } },
        { id: 'ab_t_1_2', name: '鋼鉄の外殻',   desc: '防御力+18%',                           mod: { defPct: 0.18 } },
        { id: 'ab_t_1_3', name: '開幕の防壁',   desc: 'WAVE開始時に最大HP15%の障壁を展開',   mod: { waveShieldPct: 0.15 } },
        { id: 'ab_t_1_4', name: '注目の一喝',   desc: '戦闘開始時に挑発2ターン付与・防御+8%', mod: { startTaunt: 2, defPct: 0.08 } },
        { id: 'ab_t_1_5', name: '機敏な盾捌き', desc: '速度+10%・最大HP+7%',                  mod: { spdPct: 0.10, hpPct: 0.07 } }
      ],
      /* 段階2 */
      [
        { id: 'ab_t_2_1', name: '重装の誓い',   desc: '被ダメージ-10%',                       mod: { dmgTakenRed: 0.10 } },
        { id: 'ab_t_2_2', name: '棘鎧の報復',   desc: '被弾時に攻撃者へ防御力55%の反撃',      mod: { thornsDefRatio: 0.55 } },
        { id: 'ab_t_2_3', name: '自己修復機関', desc: '行動終了時に最大HP6%回復',             mod: { selfRegenPct: 0.06 } },
        { id: 'ab_t_2_4', name: '耐性コーティング', desc: '状態異常の付与抵抗+28%',           mod: { statusRes: 0.28 } },
        { id: 'ab_t_2_5', name: '前衛の鼓動',   desc: '被弾時に共鳴ゲージ+5追加獲得',         mod: { hitChainGain: 5 } }
      ],
      /* 段階3 */
      [
        { id: 'ab_t_3_1', name: '守護の号令',   desc: '味方全体の防御力+10%',                 mod: { partyDefPct: 0.10 } },
        { id: 'ab_t_3_2', name: '不屈の防波堤', desc: 'HP50%未満の間、被ダメージ-18%',        mod: { lowHpDmgRed: 0.18 } },
        { id: 'ab_t_3_3', name: '堅牢な盾撃',   desc: '防御力の32%を攻撃力へ上乗せ',          mod: { defToAtk: 0.32 } },
        { id: 'ab_t_3_4', name: '属性吸収装甲', desc: '不利属性から受けるダメージ-20%',       mod: { weakTakenRed: 0.20 } },
        { id: 'ab_t_3_5', name: '大盾の余波',   desc: '回復を受けた際、自身の障壁+8%HP',      mod: { healToShieldPct: 0.08 } }
      ],
      /* 段階4 */
      [
        { id: 'ab_t_4_1', name: '城塞の心臓',   desc: '最大HP+22%・防御力+12%',               mod: { hpPct: 0.22, defPct: 0.12 } },
        { id: 'ab_t_4_2', name: '威圧オーラ',   desc: '行動時にランダム敵1体の攻撃力低下付与', mod: { turnDebuffAtk: 0.55 } },
        { id: 'ab_t_4_3', name: '守護障壁展開', desc: 'WAVE開始時に味方全体へ最大HP10%障壁',  mod: { partyWaveShield: 0.10 } },
        { id: 'ab_t_4_4', name: '反響カウンター', desc: '被弾時35%で自身の行動ゲージ+140',    mod: { hitCtBoost: 140 } },
        { id: 'ab_t_4_5', name: '不動明王陣',   desc: '気絶・凍結を完全無効・防御+14%',       mod: { immuneCC: true, defPct: 0.14 } }
      ],
      /* 段階5 */
      [
        { id: 'ab_t_5_1', name: '絶対防衛線',   desc: '被ダメージ-16%・味方全体の被ダメ-8%',  mod: { dmgTakenRed: 0.16, partyDmgRed: 0.08 } },
        { id: 'ab_t_5_2', name: '不死身の砦',   desc: '戦闘中1度だけ致死ダメージをHP30%で耐える', mod: { gutsPct: 0.30 } },
        { id: 'ab_t_5_3', name: '覇王の盾反撃', desc: '被弾時、防御力95%の反撃＋挑発延長',    mod: { thornsDefRatio: 0.95, startTaunt: 2 } },
        { id: 'ab_t_5_4', name: '共鳴要塞コア', desc: '共鳴チェイン発動時、味方全体へ障壁18%', mod: { chainPartyShield: 0.18 } },
        { id: 'ab_t_5_5', name: '聖域の守護者', desc: '最大HP+28%・毎行動時に味方最小HPを8%回復', mod: { hpPct: 0.28, allySpotHealPct: 0.08 } }
      ]
    ],

    dealer: [
      /* 段階1 */
      [
        { id: 'ab_d_1_1', name: '鋭利な刃',     desc: '攻撃力+15%',                           mod: { atkPct: 0.15 } },
        { id: 'ab_d_1_2', name: '急所見切り',   desc: '会心率+14%',                           mod: { critFlat: 0.14 } },
        { id: 'ab_d_1_3', name: '疾風の踏み込み', desc: '速度+12%・攻撃力+6%',                mod: { spdPct: 0.12, atkPct: 0.06 } },
        { id: 'ab_d_1_4', name: '弱点解剖',     desc: '有利属性への与ダメージ+18%',           mod: { weakDmgBonus: 0.18 } },
        { id: 'ab_d_1_5', name: '開幕速攻',     desc: 'WAVE開始時の行動ゲージ+240',           mod: { waveStartCt: 240 } }
      ],
      /* 段階2 */
      [
        { id: 'ab_d_2_1', name: '致命の一撃',   desc: '会心ダメージ+30%',                     mod: { critDmgBonus: 0.30 } },
        { id: 'ab_d_2_2', name: '装甲貫通弾',   desc: '敵の防御力を18%無視して攻撃',          mod: { defPen: 0.18 } },
        { id: 'ab_d_2_3', name: '撃破ブースト', desc: '敵撃破時に行動ゲージ+280・攻撃UP',     mod: { killCtBoost: 280 } },
        { id: 'ab_d_2_4', name: '状態異常追撃', desc: 'デバフ・異常中の敵へ与ダメージ+22%',   mod: { debuffedDmgBonus: 0.22 } },
        { id: 'ab_d_2_5', name: '吸収の刃',     desc: '与ダメージの10%だけ自身のHP回復',      mod: { lifesteal: 0.10 } }
      ],
      /* 段階3 */
      [
        { id: 'ab_d_3_1', name: '単体必殺術',   desc: '単体技の与ダメージ+24%',               mod: { singleBonus: 0.24 } },
        { id: 'ab_d_3_2', name: '殲滅の渦',     desc: '範囲・全体技の与ダメージ+22%',         mod: { multiBonus: 0.22 } },
        { id: 'ab_d_3_3', name: '大物狩り',     desc: 'ボス・乱入敵への与ダメージ+26%',       mod: { bossDmgBonus: 0.26 } },
        { id: 'ab_d_3_4', name: '連撃の極意',   desc: '攻撃時25%の確率で追加の追撃ダメージ',  mod: { extraHitChance: 0.25 } },
        { id: 'ab_d_3_5', name: '背水の闘志',   desc: 'HPが減るほど攻撃力上昇（最大+35%）',   mod: { missingHpAtk: 0.35 } }
      ],
      /* 段階4 */
      [
        { id: 'ab_d_4_1', name: '暴走オーバードライブ', desc: '攻撃力+24%・会心率+10%',       mod: { atkPct: 0.24, critFlat: 0.10 } },
        { id: 'ab_d_4_2', name: '必殺加速機構', desc: '奥義の待機ターンを1短縮',              mod: { cdReduce: 1 } },
        { id: 'ab_d_4_3', name: '共鳴起爆装置', desc: '攻撃時の共鳴ゲージ増加+40%',           mod: { atkChainBonus: 0.40 } },
        { id: 'ab_d_4_4', name: '破甲の一閃',   desc: '攻撃時45%で対象へ防御低下を付与',      mod: { hitDefDown: 0.45 } },
        { id: 'ab_d_4_5', name: '完全無欠の刃', desc: 'HP80%以上の時、与ダメージ+28%',        mod: { highHpDmgBonus: 0.28 } }
      ],
      /* 段階5 */
      [
        { id: 'ab_d_5_1', name: '次元斬断',     desc: '防御貫通+28%・会心ダメージ+35%',       mod: { defPen: 0.28, critDmgBonus: 0.35 } },
        { id: 'ab_d_5_2', name: '終末の連弾',   desc: '攻撃時45%で追撃発動・攻撃力+16%',      mod: { extraHitChance: 0.45, atkPct: 0.16 } },
        { id: 'ab_d_5_3', name: '処刑人の宣告', desc: 'HP40%以下の敵への与ダメージ+45%',      mod: { executeBonus: 0.45 } },
        { id: 'ab_d_5_4', name: 'チェイン主砲', desc: '共鳴チェインの威力+45%・攻撃力+15%',   mod: { chainPowerBonus: 0.45, atkPct: 0.15 } },
        { id: 'ab_d_5_5', name: '神速の修羅',   desc: '速度+20%・敵撃破時に行動ゲージ+420',   mod: { spdPct: 0.20, killCtBoost: 420 } }
      ]
    ],

    supporter: [
      /* 段階1 */
      [
        { id: 'ab_s_1_1', name: '先導のタクト', desc: '速度+15%',                             mod: { spdPct: 0.15 } },
        { id: 'ab_s_1_2', name: '開幕のファンファーレ', desc: 'WAVE開始時に味方全体へ攻撃上昇', mod: { wavePartyAtkUp: 2 } },
        { id: 'ab_s_1_3', name: '戦術補助回路', desc: '最大HP+12%・防御力+12%',               mod: { hpPct: 0.12, defPct: 0.12 } },
        { id: 'ab_s_1_4', name: '妨害の極意',   desc: 'デバフ・状態異常の付与確率+22%',       mod: { statusRate: 0.22 } },
        { id: 'ab_s_1_5', name: '共鳴増幅器',   desc: '自身の行動による共鳴ゲージ増加+45%',   mod: { atkChainBonus: 0.45 } }
      ],
      /* 段階2 */
      [
        { id: 'ab_s_2_1', name: '鼓舞の残響',   desc: '味方全体の攻撃力+10%',                 mod: { partyAtkPct: 0.10 } },
        { id: 'ab_s_2_2', name: '加速の号笛',   desc: '味方全体の速度+9%',                    mod: { partySpdPct: 0.09 } },
        { id: 'ab_s_2_3', name: '弱体解析レンズ', desc: '味方全体の弱点ダメージ+14%',         mod: { partyWeakBonus: 0.14 } },
        { id: 'ab_s_2_4', name: '迅速チャージ', desc: 'WAVE開始時の行動ゲージ+300',           mod: { waveStartCt: 300 } },
        { id: 'ab_s_2_5', name: '連携アシスト', desc: '行動時に最も攻撃が高い味方のCT+100',   mod: { boostAceCt: 100 } }
      ],
      /* 段階3 */
      [
        { id: 'ab_s_3_1', name: '会心指揮棒',   desc: '味方全体の会心率+11%',                 mod: { partyCritFlat: 0.11 } },
        { id: 'ab_s_3_2', name: '混沌の悪戯',   desc: '行動時50%で敵1体にランダムデバフ付与', mod: { turnRandomDebuff: 0.50 } },
        { id: 'ab_s_3_3', name: 'エネルギー循環', desc: '奥義の待機ターンを1短縮・速度+8%',   mod: { cdReduce: 1, spdPct: 0.08 } },
        { id: 'ab_s_3_4', name: '障壁コーラス', desc: '行動時に味方全体へ小さな障壁(6%HP)',   mod: { turnPartyShield: 0.06 } },
        { id: 'ab_s_3_5', name: '異常拡散波',   desc: '敵の状態異常・継続ダメージ+30%',       mod: { partyDotBonus: 0.30 } }
      ],
      /* 段階4 */
      [
        { id: 'ab_s_4_1', name: '大交響曲',     desc: '味方全体の攻撃+12%・防御+10%',         mod: { partyAtkPct: 0.12, partyDefPct: 0.10 } },
        { id: 'ab_s_4_2', name: 'クロック加速', desc: '行動時に味方全体の行動ゲージ+65',      mod: { turnPartyCt: 65 } },
        { id: 'ab_s_4_3', name: '崩壊の序曲',   desc: 'WAVE開始時に敵全体へ防御低下2ターン',  mod: { waveEnemyDefDown: 2 } },
        { id: 'ab_s_4_4', name: '共鳴オーケストラ', desc: '共鳴チェインの威力+40%・蓄積+25%', mod: { chainPowerBonus: 0.40, atkChainBonus: 0.25 } },
        { id: 'ab_s_4_5', name: '防護スクランブル', desc: '味方全体の被ダメージ-10%',         mod: { partyDmgRed: 0.10 } }
      ],
      /* 段階5 */
      [
        { id: 'ab_s_5_1', name: '万象マエストロ', desc: '味方全体の全能力+11%',               mod: { partyAtkPct: 0.11, partyDefPct: 0.11, partySpdPct: 0.11 } },
        { id: 'ab_s_5_2', name: '時間跳躍指令', desc: '行動時にエース味方のCT+180＋攻撃UP',   mod: { boostAceCt: 180, wavePartyAtkUp: 2 } },
        { id: 'ab_s_5_3', name: '絶望の重奏',   desc: '行動時に敵全体へ被ダメ増加付与(50%)',  mod: { turnAllVuln: 0.50 } },
        { id: 'ab_s_5_4', name: '無限チェイン回路', desc: '共鳴チェイン発動後ゲージ25%残存',  mod: { chainRefund: 25 } },
        { id: 'ab_s_5_5', name: '異界の演出家', desc: '味方全体の会心ダメ+35%・速度+12%',     mod: { partyCritDmg: 0.35, partySpdPct: 0.12 } }
      ]
    ],

    healer: [
      /* 段階1 */
      [
        { id: 'ab_h_1_1', name: '慈愛の祈り',   desc: '与回復量+18%',                         mod: { healPower: 0.18 } },
        { id: 'ab_h_1_2', name: '癒しの足取り', desc: '速度+12%・与回復量+8%',                mod: { spdPct: 0.12, healPower: 0.08 } },
        { id: 'ab_h_1_3', name: '守護の聖衣',   desc: '最大HP+15%・防御力+10%',               mod: { hpPct: 0.15, defPct: 0.10 } },
        { id: 'ab_h_1_4', name: '清浄の息吹',   desc: '回復時に状態異常を1つ解除する確率+45%', mod: { cleanseChance: 0.45 } },
        { id: 'ab_h_1_5', name: '穏やかな波動', desc: 'WAVE開始時に味方全体HP10%回復',        mod: { wavePartyHeal: 0.10 } }
      ],
      /* 段階2 */
      [
        { id: 'ab_h_2_1', name: '過剰治癒障壁', desc: '最大HPを超えた回復の65%を障壁化',      mod: { overhealShield: 0.65 } },
        { id: 'ab_h_2_2', name: '生命の泉',     desc: '行動終了時に味方最小HPを最大HP7%回復', mod: { allySpotHealPct: 0.07 } },
        { id: 'ab_h_2_3', name: '再生の祝福',   desc: '回復時に対象へ継続回復2ターンを付与',  mod: { healGrantRegen: 2 } },
        { id: 'ab_h_2_4', name: '緊急トリアージ', desc: 'HP40%以下の味方への回復量+35%',      mod: { lowHpHealBonus: 0.35 } },
        { id: 'ab_h_2_5', name: '共鳴ヒール',   desc: '回復スキル発動時に共鳴ゲージ+10追加',  mod: { healChainGain: 10 } }
      ],
      /* 段階3 */
      [
        { id: 'ab_h_3_1', name: '聖女の祝福',   desc: '味方全体の最大HP+14%',                 mod: { partyHpPct: 0.14 } },
        { id: 'ab_h_3_2', name: '活力注入',     desc: '回復時に対象の行動ゲージ+85',          mod: { healCtBoost: 85 } },
        { id: 'ab_h_3_3', name: '浄化の聖域',   desc: '回復時に必ず状態異常を1つ解除',        mod: { cleanseChance: 1.0 } },
        { id: 'ab_h_3_4', name: '反撃の聖光',   desc: '与回復量+14%・自身の攻撃力+18%',       mod: { healPower: 0.14, atkPct: 0.18 } },
        { id: 'ab_h_3_5', name: '迅速詠唱',     desc: '奥義の待機ターンを1短縮',              mod: { cdReduce: 1 } }
      ],
      /* 段階4 */
      [
        { id: 'ab_h_4_1', name: '大慈愛の光輪', desc: '与回復量+28%・最大HP+14%',             mod: { healPower: 0.28, hpPct: 0.14 } },
        { id: 'ab_h_4_2', name: '天使の防護膜', desc: '回復時に対象へ防御上昇2ターン付与',    mod: { healGrantDefUp: 2 } },
        { id: 'ab_h_4_3', name: '勇気の処方箋', desc: '回復時に対象へ攻撃上昇2ターン付与',    mod: { healGrantAtkUp: 2 } },
        { id: 'ab_h_4_4', name: '不動の祈り',   desc: '気絶・凍結・沈黙を完全無効',           mod: { immuneCC: true } },
        { id: 'ab_h_4_5', name: '生命共鳴波',   desc: '行動終了時に味方全体HP5%回復',         mod: { turnPartyHeal: 0.05 } }
      ],
      /* 段階5 */
      [
        { id: 'ab_h_5_1', name: '奇跡の聖杯',   desc: '与回復量+38%・過剰回復100%障壁化',     mod: { healPower: 0.38, overhealShield: 1.0 } },
        { id: 'ab_h_5_2', name: '不滅の讃美歌', desc: '味方全体の最大HP+18%・被ダメ-8%',      mod: { partyHpPct: 0.18, partyDmgRed: 0.08 } },
        { id: 'ab_h_5_3', name: '蘇生の光脈',   desc: '戦闘中1度、倒れた味方1人をHP55%で蘇生', mod: { autoRevivePct: 0.55 } },
        { id: 'ab_h_5_4', name: '疾風救護隊',   desc: '速度+18%・回復時対象の行動ゲージ+120', mod: { spdPct: 0.18, healCtBoost: 120 } },
        { id: 'ab_h_5_5', name: '万癒のオーラ', desc: '毎行動時に味方全体HP8%回復＋異常解除', mod: { turnPartyHeal: 0.08, cleanseChance: 1.0 } }
      ]
    ]
  };

  /* 図鑑・逆引き用のフラットマップ生成 */
  const ABILITY_LIST = [];
  const ABILITY_MAP = {};
  Object.keys(ABILITIES_BY_ROLE).forEach((roleId) => {
    ABILITIES_BY_ROLE[roleId].forEach((tierArr, tIdx) => {
      tierArr.forEach((ab, cIdx) => {
        const entry = Object.assign({}, ab, { role: roleId, tier: tIdx + 1, choiceIndex: cIdx });
        ABILITY_LIST.push(entry);
        ABILITY_MAP[ab.id] = entry;
      });
    });
  });

  Hacha.data.ABILITY_UNLOCK_COSTS = ABILITY_UNLOCK_COSTS;
  Hacha.data.ABILITIES_BY_ROLE = ABILITIES_BY_ROLE;
  Hacha.data.ABILITY_LIST = ABILITY_LIST;
  Hacha.data.ABILITY_MAP = ABILITY_MAP;
})();
