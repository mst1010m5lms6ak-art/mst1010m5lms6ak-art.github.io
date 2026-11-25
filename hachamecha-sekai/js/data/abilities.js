(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /*
   * ロール別アビリティ：4ロール × 5段階 × 5択 ＝ 計100種
   * 固定5×5マトリクスに収めるため short は4文字以内、name は自然で省略されない長さ
   */
  HW.ABILITIES = {
    tank: [
      // Tier 1
      [
        { id: 't1_1', short: '剛体', name: '剛体の構え', desc: '最大HP+14%', mod: { hpPct: 0.14 } },
        { id: 't1_2', short: '鉄壁', name: '鉄壁装甲', desc: '防御力+18%', mod: { defPct: 0.18 } },
        { id: 't1_3', short: '見切', name: '影歩きの見切り', desc: '回避率+10%、速度+6', mod: { eva: 0.10, spdFlat: 6 } },
        { id: 't1_4', short: '耐性', name: '不動の心', desc: '状態異常耐性+25%、HP+6%', mod: { res: 0.25, hpPct: 0.06 } },
        { id: 't1_5', short: '剛腕盾', name: '攻勢防御', desc: '攻撃力+12%、防御力+10%', mod: { atkPct: 0.12, defPct: 0.10 } }
      ],
      // Tier 2
      [
        { id: 't2_1', short: '先制挑発', name: '開戦の雄叫び', desc: '戦闘開始時、自身に挑発と防UP(2T)', mod: { startTaunt: 2, startDefUp: 2 } },
        { id: 't2_2', short: '荊棘', name: '棘の鎧', desc: '被弾時、攻撃者へ防御力の55%で反撃', mod: { counterDef: 0.55 } },
        { id: 't2_3', short: '吸収', name: '血気防御', desc: '攻撃時、与ダメージの18%をHP回復', mod: { lifesteal: 0.18 } },
        { id: 't2_4', short: '結界', name: '開戦シールド', desc: 'WAVE開始時、最大HP18%のシールド', mod: { waveShieldPct: 0.18 } },
        { id: 't2_5', short: '威圧', name: '重圧の視線', desc: '被弾時、35%で敵に攻DN(2T)', mod: { onHitAtkDown: 0.35 } }
      ],
      // Tier 3
      [
        { id: 't3_1', short: '堅守', name: '重装の極み', desc: '被ダメージ-12%', mod: { dmgRed: 0.12 } },
        { id: 't3_2', short: '反撃', name: 'カウンター体勢', desc: '回避または被弾時、28%で技1反撃', mod: { counterChance: 0.28 } },
        { id: 't3_3', short: '治癒受', name: '恩寵の器', desc: '被回復量+28%、最大HP+8%', mod: { healInPct: 0.28, hpPct: 0.08 } },
        { id: 't3_4', short: '庇護', name: '味方防壁', desc: '味方全体の防御力+10%', mod: { teamDefPct: 0.10 } },
        { id: 't3_5', short: '加速盾', name: '戦線急行', desc: '被弾ごとに行動ゲージ+8%', mod: { onHitGauge: 0.08 } }
      ],
      // Tier 4
      [
        { id: 't4_1', short: '不屈', name: '不屈の闘志', desc: '戦闘中1度、致死ダメージをHP25%で耐える', mod: { guts: 0.25 } },
        { id: 't4_2', short: '再生鎧', name: '自己修復機関', desc: '行動終了時、最大HPの8%を回復', mod: { turnRegenPct: 0.08 } },
        { id: 't4_3', short: '破甲盾', name: '盾砕きの術', desc: '攻撃時、40%で対象に防DN(2T)', mod: { onAtkDefDown: 0.40 } },
        { id: 't4_4', short: '浄化', name: '清浄の防壁', desc: '行動開始時、自身のデバフ・異常を1つ解除', mod: { selfCleanse: 1 } },
        { id: 't4_5', short: '奮迅', name: '背水の鉄壁', desc: 'HP50%以下で防御+35%、被ダメ-10%', mod: { lowHpDef: 0.35, lowHpRed: 0.10 } }
      ],
      // Tier 5
      [
        { id: 't5_1', short: '絶対要塞', name: '絶対要塞', desc: '最大HP+18%、被ダメージ-14%', mod: { hpPct: 0.18, dmgRed: 0.14 } },
        { id: 't5_2', short: '覇王反撃', name: '覇王の応酬', desc: '防御力の35%を攻撃力に加算、反撃率+18%', mod: { defToAtk: 0.35, counterChance: 0.18 } },
        { id: 't5_3', short: '守護聖域', name: '守護聖域', desc: 'WAVE開始時、味方全体にHP14%シールド', mod: { teamWaveShield: 0.14 } },
        { id: 't5_4', short: '幻影盾', name: '幻影の歩法', desc: '回避率+15%、回避成功時にHP12%回復', mod: { eva: 0.15, evaHeal: 0.12 } },
        { id: 't5_5', short: '戦神挑発', name: '戦神の号令', desc: '挑発中、味方全体の与ダメージ+16%', mod: { tauntTeamDmg: 0.16 } }
      ]
    ],

    dealer: [
      // Tier 1
      [
        { id: 'd1_1', short: '剛力', name: '剛力の極意', desc: '攻撃力+16%', mod: { atkPct: 0.16 } },
        { id: 'd1_2', short: '必殺', name: '急所見切り', desc: '会心率+14%、会心ダメージ+12%', mod: { crit: 0.14, critDmg: 0.12 } },
        { id: 'd1_3', short: '神速', name: '疾風の脚', desc: '速度+14、攻撃力+6%', mod: { spdFlat: 14, atkPct: 0.06 } },
        { id: 'd1_4', short: '異常刃', name: '呪毒の心得', desc: '効果命中+25%、攻撃力+10%', mod: { effHit: 0.25, atkPct: 0.10 } },
        { id: 'd1_5', short: '吸血刃', name: '鮮血の刃', desc: '攻撃力+10%、吸血+12%', mod: { atkPct: 0.10, lifesteal: 0.12 } }
      ],
      // Tier 2
      [
        { id: 'd2_1', short: '先制猛攻', name: '初撃必殺', desc: '各WAVE最初の攻撃、与ダメージ+35%', mod: { firstHitDmg: 0.35 } },
        { id: 'd2_2', short: '連撃', name: '追撃の才', desc: '攻撃時、24%の確率で技1を追加発動', mod: { extraHitChance: 0.24 } },
        { id: 'd2_3', short: '貫通', name: '装甲貫通', desc: '攻撃時、敵防御力を22%無視', mod: { defPen: 0.22 } },
        { id: 'd2_4', short: '弱点特効', name: '弱点看破', desc: '有利属性への与ダメージ+22%', mod: { elemAdvBonus: 0.22 } },
        { id: 'd2_5', short: '状態特効', name: '追討の牙', desc: '状態異常中の敵へ与ダメージ+24%', mod: { ailmentBonus: 0.24 } }
      ],
      // Tier 3
      [
        { id: 'd3_1', short: '撃破加速', name: '狩人の連鎖', desc: '敵撃破時、行動ゲージ+38%', mod: { killGauge: 0.38 } },
        { id: 'd3_2', short: '会心回転', name: '会心ドライブ', desc: '会心発生時、技CTを1短縮(毎行動1回)', mod: { critCtCut: 1 } },
        { id: 'd3_3', short: '大物狩り', name: '巨人殺し', desc: 'ボス・強敵への与ダメージ+22%', mod: { bossDmg: 0.22 } },
        { id: 'd3_4', short: '範囲強化', name: '殲滅波動', desc: '範囲・全体技の与ダメージ+20%', mod: { aoeDmg: 0.20 } },
        { id: 'd3_5', short: '単体極化', name: '一点突破', desc: '単体技の与ダメージ+24%', mod: { singleDmg: 0.24 } }
      ],
      // Tier 4
      [
        { id: 'd4_1', short: '狂戦士', name: '背水の刃', desc: 'HP低下率に応じて与ダメージ最大+40%', mod: { berserkDmg: 0.40 } },
        { id: 'd4_2', short: '完璧主義', name: '無傷の連撃', desc: 'HP80%以上のとき、会心率+18%・攻撃+15%', mod: { fullHpCrit: 0.18, fullHpAtk: 0.15 } },
        { id: 'd4_3', short: '裂傷', name: '出血付与', desc: '攻撃時、40%で敵に出血(2T)を付与', mod: { onAtkBleed: 0.40 } },
        { id: 'd4_4', short: '会心極', name: '致命の一閃', desc: '会心ダメージ+35%', mod: { critDmg: 0.35 } },
        { id: 'd4_5', short: '耐久攻', name: '戦場の生存術', desc: '最大HP+16%、与ダメージ+12%', mod: { hpPct: 0.16, dmgUp: 0.12 } }
      ],
      // Tier 5
      [
        { id: 'd5_1', short: '無双連撃', name: '無双乱舞', desc: '追撃率+20%、速度+10、攻撃力+14%', mod: { extraHitChance: 0.20, spdFlat: 10, atkPct: 0.14 } },
        { id: 'd5_2', short: '終焉一撃', name: '終焉の一撃', desc: '防御貫通+20%、技3の与ダメージ+30%', mod: { defPen: 0.20, s3Dmg: 0.30 } },
        { id: 'd5_3', short: '必中会心', name: '絶対会心領域', desc: '会心率+22%、会心ダメージ+24%', mod: { crit: 0.22, critDmg: 0.24 } },
        { id: 'd5_4', short: '災厄散布', name: '災厄の拡散', desc: '異常中の敵へ+22%、攻撃時30%で呪い(2T)', mod: { ailmentBonus: 0.22, onAtkCurse: 0.30 } },
        { id: 'd5_5', short: '斬撃加速', name: 'オーバードライブ', desc: '行動ごと攻撃+5%(最大8回累積)、速度+12', mod: { rampAtk: 0.05, spdFlat: 12 } }
      ]
    ],

    supporter: [
      // Tier 1
      [
        { id: 's1_1', short: '神速支援', name: '先導の風', desc: '速度+16、最大HP+6%', mod: { spdFlat: 16, hpPct: 0.06 } },
        { id: 's1_2', short: '妨害達人', name: '撹乱の策', desc: '効果命中+28%、速度+6', mod: { effHit: 0.28, spdFlat: 6 } },
        { id: 's1_3', short: '戦意鼓舞', name: '戦意の旗印', desc: '味方全体の攻撃力+10%', mod: { teamAtkPct: 0.10 } },
        { id: 's1_4', short: '陣地構築', name: '防衛支援', desc: '味方全体の防御力+12%', mod: { teamDefPct: 0.12 } },
        { id: 's1_5', short: '知略攻', name: '遊撃戦術', desc: '攻撃力+12%、速度+8', mod: { atkPct: 0.12, spdFlat: 8 } }
      ],
      // Tier 2
      [
        { id: 's2_1', short: '開戦加速', name: 'スタートダッシュ', desc: '開戦時、味方全体の行動ゲージ+18%', mod: { startTeamGauge: 0.18 } },
        { id: 's2_2', short: 'バフ延長', name: '余韻の術', desc: '自身が付与するバフ期間+1T', mod: { buffExt: 1 } },
        { id: 's2_3', short: 'デバ延長', name: '深淵の枷', desc: '自身が付与するデバフ・異常期間+1T', mod: { debuffExt: 1 } },
        { id: 's2_4', short: '防護網', name: '展開シールド', desc: '行動時、最もHP割合が低い味方にHP10%盾', mod: { actShieldLowest: 0.10 } },
        { id: 's2_5', short: '弱体連鎖', name: '脆弱の刻印', desc: '敵全体へのデバフ1種につき被ダメ+6%', mod: { debuffVuln: 0.06 } }
      ],
      // Tier 3
      [
        { id: 's3_1', short: '回転支援', name: 'クロック加速', desc: '自身の技2・技3使用時、味方全体ゲージ+12%', mod: { skillTeamGauge: 0.12 } },
        { id: 's3_2', short: '会心号令', name: '必殺指南', desc: '味方全体の会心率+10%、会心ダメ+12%', mod: { teamCrit: 0.10, teamCritDmg: 0.12 } },
        { id: 's3_3', short: '封殺', name: '沈黙の陣', desc: '攻撃時、30%で対象に沈黙(1T)', mod: { onAtkSilence: 0.30 } },
        { id: 's3_4', short: '吸血付与', name: '戦場供血', desc: '味方全体の吸血率+8%', mod: { teamLifesteal: 0.08 } },
        { id: 's3_5', short: '連携追撃', name: '協同戦線', desc: '行動時、30%で最も攻撃高い味方が技1追撃', mod: { assistChance: 0.30 } }
      ],
      // Tier 4
      [
        { id: 's4_1', short: 'CT短縮', name: '時空圧縮', desc: '技3使用時、ランダム味方2体のCTを1短縮', mod: { s3TeamCtCut: 1 } },
        { id: 's4_2', short: '耐性破壊', name: '防壁解体', desc: '攻撃時、45%で対象に防DN(2T)と鈍化(2T)', mod: { onAtkBreak: 0.45 } },
        { id: 's4_3', short: '全体再生', name: '鼓舞の調べ', desc: 'WAVE開始時、味方全体に再生(2T)を付与', mod: { waveTeamRegen: 2 } },
        { id: 's4_4', short: '堅牢支援', name: '後方指揮', desc: '自身の最大HP+18%、状態異常耐性+25%', mod: { hpPct: 0.18, res: 0.25 } },
        { id: 's4_5', short: '状態強化', name: '猛毒触媒', desc: '敵が受ける継続ダメージ+45%', mod: { teamDotBonus: 0.45 } }
      ],
      // Tier 5
      [
        { id: 's5_1', short: '絶対指揮', name: '絶対指揮系統', desc: '味方全体の攻撃+14%、速度+8', mod: { teamAtkPct: 0.14, teamSpdFlat: 8 } },
        { id: 's5_2', short: '混沌妨害', name: '混沌の鎖', desc: '開戦時、敵全体に攻DN・防DN(2T)を付与', mod: { startEnemyBreak: 2 } },
        { id: 's5_3', short: '総連携', name: 'オールリンク', desc: '協同追撃率+22%、味方全体の与ダメ+12%', mod: { assistChance: 0.22, teamDmgUp: 0.12 } },
        { id: 's5_4', short: '永久機関', name: 'クロノドライブ', desc: '速度+18、自身の技CTを毎行動追加15%短縮', mod: { spdFlat: 18, extraCtChance: 0.35 } },
        { id: 's5_5', short: '万象加護', name: '万象の加護', desc: '味方全体の被ダメ-10%、異常耐性+20%', mod: { teamDmgRed: 0.10, teamRes: 0.20 } }
      ]
    ],

    healer: [
      // Tier 1
      [
        { id: 'h1_1', short: '慈愛', name: '慈愛の祈り', desc: '与回復量+18%', mod: { healOutPct: 0.18 } },
        { id: 'h1_2', short: '生命樹', name: '生命の泉', desc: '最大HP+16%、与回復量+8%', mod: { hpPct: 0.16, healOutPct: 0.08 } },
        { id: 'h1_3', short: '迅速癒', name: '急患対応', desc: '速度+14、与回復量+8%', mod: { spdFlat: 14, healOutPct: 0.08 } },
        { id: 'h1_4', short: '聖壁', name: '堅守の聖女', desc: '防御力+16%、状態異常耐性+20%', mod: { defPct: 0.16, res: 0.20 } },
        { id: 'h1_5', short: '聖光撃', name: '断罪の光', desc: '攻撃力+16%、与回復量+10%', mod: { atkPct: 0.16, healOutPct: 0.10 } }
      ],
      // Tier 2
      [
        { id: 'h2_1', short: '余剰盾', name: 'オーバーヒール盾', desc: '回復超過分の70%をシールドへ変換', mod: { overhealShield: 0.70 } },
        { id: 'h2_2', short: '浄化癒', name: '清めの雫', desc: '回復時、対象のデバフ・異常を1つ解除', mod: { healCleanse: 1 } },
        { id: 'h2_3', short: '救急', name: '緊急治療', desc: 'HP40%以下の味方への回復量+40%', mod: { emergencyHeal: 0.40 } },
        { id: 'h2_4', short: '再生付与', name: '持続治癒', desc: '回復時、対象に再生(2T)を付与', mod: { healRegen: 2 } },
        { id: 'h2_5', short: '鼓舞癒', name: '活力の恵み', desc: '回復時、対象に攻UP(2T)を付与', mod: { healAtkUp: 2 } }
      ],
      // Tier 3
      [
        { id: 'h3_1', short: '全体癒波', name: '癒しの波紋', desc: '自身の行動終了時、味方全体を最大HP5%回復', mod: { turnTeamHeal: 0.05 } },
        { id: 'h3_2', short: '聖域展開', name: '聖域の祝福', desc: '味方全体の最大HP+12%', mod: { teamHpPct: 0.12 } },
        { id: 'h3_3', short: '加速治癒', name: '回復ドライブ', desc: '回復時、対象の行動ゲージ+10%', mod: { healGauge: 0.10 } },
        { id: 'h3_4', short: '反響光', name: '反響の聖光', desc: '回復時、ランダム敵1体に与回復の45%ダメ', mod: { healReflectDmg: 0.45 } },
        { id: 'h3_5', short: '守護祈願', name: '鉄壁の祈り', desc: '回復時、対象に防UP(2T)を付与', mod: { healDefUp: 2 } }
      ],
      // Tier 4
      [
        { id: 'h4_1', short: '自動蘇生', name: '奇跡の息吹', desc: '戦闘中1度、倒れた味方1体をHP45%で蘇生', mod: { autoRevive: 0.45 } },
        { id: 'h4_2', short: '緊急割込', name: '救護出動', desc: '味方がHP35%以下になると自身ゲージ+35%', mod: { rescueGauge: 0.35 } },
        { id: 'h4_3', short: '全体浄化', name: '大浄化結界', desc: 'WAVE開始時、味方全体の異常を全解除＆耐性+20%', mod: { teamRes: 0.20, waveCleanse: 1 } },
        { id: 'h4_4', short: '癒回転', name: '聖杯の循環', desc: '味方回復時、自身の技CTを35%で1短縮', mod: { extraCtChance: 0.35 } },
        { id: 'h4_5', short: '武装僧侶', name: '戦場衛生兵', desc: '味方全体の与ダメージ+10%、与回復+14%', mod: { teamDmgUp: 0.10, healOutPct: 0.14 } }
      ],
      // Tier 5
      [
        { id: 'h5_1', short: '生命賛歌', name: '生命賛歌', desc: '与回復量+30%、超過回復シールド+50%', mod: { healOutPct: 0.30, overhealShield: 0.50 } },
        { id: 'h5_2', short: '不死鳥', name: '不死鳥の祝福', desc: '自動蘇生回数+1（HP55%復帰）、味方HP+10%', mod: { autoRevive: 0.55, teamHpPct: 0.10 } },
        { id: 'h5_3', short: '祝福嵐', name: '祝福の嵐', desc: '回復時、対象に攻UP・速UP(2T)＆ゲージ+8%', mod: { healAtkUp: 2, healSpdUp: 2, healGauge: 0.08 } },
        { id: 'h5_4', short: '神罰癒', name: '裁きと救済', desc: '与回復の65%を敵へ追撃、自身の攻撃力+20%', mod: { healReflectDmg: 0.65, atkPct: 0.20 } },
        { id: 'h5_5', short: '完全聖域', name: '完全聖域', desc: '味方全体の被ダメ-12%、毎行動味方全体HP6%回復', mod: { teamDmgRed: 0.12, turnTeamHeal: 0.06 } }
      ]
    ]
  };

  HW.getAllAbilitiesFlat = function () {
    const out = [];
    HW.ROLES.forEach((r) => {
      const tiers = HW.ABILITIES[r.id] || [];
      tiers.forEach((row, ti) => {
        row.forEach((ab, ci) => {
          out.push(Object.assign({}, ab, { role: r.id, tier: ti + 1, col: ci + 1 }));
        });
      });
    });
    return out;
  };
})();
