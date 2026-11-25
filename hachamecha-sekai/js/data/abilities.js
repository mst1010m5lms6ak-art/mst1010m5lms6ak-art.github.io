(function () {
  'use strict';

  const HS = window.HS;

  // 4 Roles x 5 Tiers x 5 Choices = 100 Unique Role Abilities
  const ROLE_ABILITIES = {
    tank: [
      // Tier 1
      [
        { id: 't1_0', name: '鋼鉄の構え', desc: '防御力+14%、最大HP+8%', effect: { defPct: 0.14, hpPct: 0.08 } },
        { id: 't1_1', name: '初動障壁', desc: '各WAVE開始時、最大HP14%の障壁を展開', effect: { waveShieldPct: 0.14 } },
        { id: 't1_2', name: '棘鎧の構え', desc: '被弾時、防御力45%分の反射ダメージを与える', effect: { thornsDefPct: 0.45 } },
        { id: 't1_3', name: '威圧の咆哮', desc: '各WAVE開始時、自身に挑発(2行動)を付与', effect: { waveTaunt: 2 } },
        { id: 't1_4', name: '不屈の脈動', desc: '自身の行動開始時、最大HP5%を回復', effect: { turnRegenPct: 0.05 } }
      ],
      // Tier 2
      [
        { id: 't2_0', name: '重装の極意', desc: '被ダメージを10%軽減、最大HP+10%', effect: { dmgTakenMult: -0.10, hpPct: 0.10 } },
        { id: 't2_1', name: '味方守護幕', desc: '自身以外の味方全体へWAVE開始時にHP8%障壁', effect: { allyWaveShieldPct: 0.08 } },
        { id: 't2_2', name: '報復の刃', desc: '被弾時35%で通常技による反撃を行う', effect: { counterChance: 0.35 } },
        { id: 't2_3', name: '戦意剥奪', desc: '被弾時、攻撃してきた敵へ攻↓(2行動)を付与', effect: { onHitAtkDown: 2 } },
        { id: 't2_4', name: '危機活性', desc: 'HP50%以下のとき受ける回復量+35%', effect: { lowHpHealInPct: 0.35 } }
      ],
      // Tier 3
      [
        { id: 't3_0', name: '堅城陣形', desc: '味方全体の防御力+10%、自身の防御力+12%', effect: { partyDefPct: 0.10, defPct: 0.12 } },
        { id: 't3_1', name: '防壁再生', desc: '行動終了時、最大HP9%の障壁を自身に付与', effect: { turnShieldPct: 0.09 } },
        { id: 't3_2', name: '剛盾強襲', desc: '自身の攻撃力に防御力の35%を上乗せ', effect: { defToAtkPct: 0.35 } },
        { id: 't3_3', name: '亀裂誘発', desc: '自身の攻撃命中時、50%で敵に防↓(2行動)を付与', effect: { onAttackDefDown: 0.50 } },
        { id: 't3_4', name: '浄化の体躯', desc: '状態異常耐性+40%、最大HP+12%', effect: { resistPct: 0.40, hpPct: 0.12 } }
      ],
      // Tier 4
      [
        { id: 't4_0', name: '鉄壁の盾壁', desc: '味方全体への全体攻撃ダメージを14%軽減', effect: { partyAoeReduce: 0.14 } },
        { id: 't4_1', name: '結晶護盾', desc: '障壁がある間、自身の被ダメージをさらに18%軽減', effect: { shieldDr: 0.18 } },
        { id: 't4_2', name: '怒涛の逆襲', desc: 'HPが減るほど与ダメージ上昇（最大+45%）', effect: { missingHpDmgPct: 0.45 } },
        { id: 't4_3', name: '重圧領域', desc: '戦闘中、敵全体の攻撃力を8%低下させる', effect: { enemyAtkAura: -0.08 } },
        { id: 't4_4', name: '不死の鼓動', desc: '戦闘中1度だけ致死ダメージをHP30%で耐える', effect: { revivePct: 0.30 } }
      ],
      // Tier 5
      [
        { id: 't5_0', name: '絶対防衛線', desc: '最大HP+22%、防御力+22%、被ダメージ-10%', effect: { hpPct: 0.22, defPct: 0.22, dmgTakenMult: -0.10 } },
        { id: 't5_1', name: '星輝大障壁', desc: '技3発動時、味方全体へ最大HP16%の障壁を展開', effect: { s3PartyShieldPct: 0.16 } },
        { id: 't5_2', name: '破滅の報復', desc: '反撃発動率+30%、反撃ダメージ+45%', effect: { counterChance: 0.30, counterDmgPct: 0.45 } },
        { id: 't5_3', name: '覇王の縛鎖', desc: '敵全体へのデバフ持続+1行動、挑発中防御+25%', effect: { debuffExtend: 1, tauntDefPct: 0.25 } },
        { id: 't5_4', name: '無限再生殻', desc: '被弾ごとに最大HP4%即時回復、状態異常耐性+25%', effect: { onHitHealPct: 0.04, resistPct: 0.25 } }
      ]
    ],

    dealer: [
      // Tier 1
      [
        { id: 'd1_0', name: '鋭利な眼光', desc: '会心率+12%、会心ダメージ+18%', effect: { critRate: 0.12, critDmg: 0.18 } },
        { id: 'd1_1', name: '疾風の連撃', desc: '攻撃力+8%、行動速度+10%', effect: { atkPct: 0.08, spdPct: 0.10 } },
        { id: 'd1_2', name: '弱点解剖', desc: '状態異常・デバフ中の敵へ与ダメージ+18%', effect: { debuffBonusDmg: 0.18 } },
        { id: 'd1_3', name: '渾身の一閃', desc: '攻撃力+15%', effect: { atkPct: 0.15 } },
        { id: 'd1_4', name: '加速装填', desc: '行動ゲージの開始位置+20%、速度+6%', effect: { startAtbPct: 0.20, spdPct: 0.06 } }
      ],
      // Tier 2
      [
        { id: 'd2_0', name: '急所貫通', desc: '会心発生時、敵防御力の20%を無視する', effect: { critDefPen: 0.20 } },
        { id: 'd2_1', name: '追撃の残影', desc: '攻撃後30%の確率で攻撃力55%分の追撃が発生', effect: { extraHitChance: 0.30, extraHitMult: 0.55 } },
        { id: 'd2_2', name: '侵蝕付与', desc: '攻撃命中時35%で毒(2行動)を付与する', effect: { onHitPoison: 0.35 } },
        { id: 'd2_3', name: '先制強打', desc: 'HP80%以上の敵に対して与ダメージ+22%', effect: { highEnemyHpDmg: 0.22 } },
        { id: 'd2_4', name: '回転術式', desc: '技1使用時、自身の行動ゲージ+18%', effect: { s1AtbGain: 0.18 } }
      ],
      // Tier 3
      [
        { id: 'd3_0', name: '会心連鎖', desc: '会心発生時、自身の行動ゲージ+14%', effect: { critAtbGain: 0.14 } },
        { id: 'd3_1', name: '手数増強', desc: '行動するたび攻撃力+4%（最大5回累積）', effect: { rampAtkPerTurn: 0.04, rampMax: 5 } },
        { id: 'd3_2', name: '処刑人の刃', desc: 'HP40%以下の敵へ与ダメージ+32%', effect: { executeDmg: 0.32 } },
        { id: 'd3_3', name: '背水の覚悟', desc: '自身HPが減少するほど攻撃力上昇（最大+40%）', effect: { missingHpDmgPct: 0.40 } },
        { id: 'd3_4', name: '技脈短縮', desc: '敵を撃破したとき自身の技CTを1短縮する', effect: { killCtReduce: 1 } }
      ],
      // Tier 4
      [
        { id: 'd4_0', name: '極致の会心', desc: '会心率+15%、会心ダメージ+30%', effect: { critRate: 0.15, critDmg: 0.30 } },
        { id: 'd4_1', name: '双連撃破', desc: '追撃発動率+22%、速度+10%', effect: { extraHitChance: 0.22, spdPct: 0.10 } },
        { id: 'd4_2', name: '災厄増幅', desc: '敵のデバフ/異常1個につき与ダメージ+8%', effect: { perDebuffDmg: 0.08 } },
        { id: 'd4_3', name: '防御粉砕', desc: '全攻撃で敵防御力を18%無視する', effect: { defPen: 0.18 } },
        { id: 'd4_4', name: '吸血の戦刃', desc: '与ダメージの10%分、自身のHPを回復する', effect: { lifestealPct: 0.10 } }
      ],
      // Tier 5
      [
        { id: 'd5_0', name: '天穿の斬撃', desc: '会心ダメージ+45%、属性有利ダメージ+15%', effect: { critDmg: 0.45, weakBonusPct: 0.15 } },
        { id: 'd5_1', name: '音速乱舞', desc: '行動速度+18%、追撃ダメージ倍率+35%', effect: { spdPct: 0.18, extraHitMult: 0.35 } },
        { id: 'd5_2', name: '終末の刻印', desc: '状態異常中の敵へ与ダメージ+35%、火傷/毒威力+30%', effect: { debuffBonusDmg: 0.35, dotBoost: 0.30 } },
        { id: 'd5_3', name: '無双の剛撃', desc: '攻撃力+28%、技3ダメージ+25%', effect: { atkPct: 0.28, s3DmgPct: 0.25 } },
        { id: 'd5_4', name: '永劫の連環', desc: '敵撃破時、自身の行動ゲージ+40%、攻撃力+15%', effect: { killAtbGain: 0.40, atkPct: 0.15 } }
      ]
    ],

    supporter: [
      // Tier 1
      [
        { id: 's1_0', name: '先陣の号令', desc: '各WAVE開始時、味方全体の行動ゲージ+12%', effect: { wavePartyAtb: 0.12 } },
        { id: 's1_1', name: '鼓舞の紋章', desc: '戦闘中、味方全体の攻撃力+8%', effect: { partyAtkPct: 0.08 } },
        { id: 's1_2', name: '弱体看破', desc: '自身のデバフ・異常付与確率+18%', effect: { effHitPct: 0.18 } },
        { id: 's1_3', name: '戦術防護', desc: '戦闘中、味方全体の最大HP+10%', effect: { partyHpPct: 0.10 } },
        { id: 's1_4', name: '呪縛の糸', desc: '自身の攻撃命中時、40%で敵に速↓(2行動)', effect: { onHitSpdDown: 0.40 } }
      ],
      // Tier 2
      [
        { id: 's2_0', name: '疾走オーラ', desc: '戦闘中、味方全体の行動速度+8%', effect: { partySpdPct: 0.08 } },
        { id: 's2_1', name: '必殺照準', desc: '戦闘中、味方全体の会心率+9%', effect: { partyCritRate: 0.09 } },
        { id: 's2_2', name: '防御崩し', desc: '攻撃命中時、45%で敵に被↑(2行動)を付与', effect: { onHitVuln: 0.45 } },
        { id: 's2_3', name: '応急障壁', desc: '行動終了時、最もHPが低い味方へHP10%障壁', effect: { turnLowestShieldPct: 0.10 } },
        { id: 's2_4', name: '災禍延長', desc: '自身が付与するデバフ・異常の持続+1行動', effect: { debuffExtend: 1 } }
      ],
      // Tier 3
      [
        { id: 's3_0', name: '時間圧縮', desc: '自身の行動速度+16%、開始行動ゲージ+20%', effect: { spdPct: 0.16, startAtbPct: 0.20 } },
        { id: 's3_1', name: '会心共鳴', desc: '戦闘中、味方全体の会心ダメージ+18%', effect: { partyCritDmg: 0.18 } },
        { id: 's3_2', name: '虚弱領域', desc: '戦闘中、敵全体の防御力-10%', effect: { enemyDefAura: -0.10 } },
        { id: 's3_3', name: '守護連動', desc: '味方へバフを付与した際、対象のHPを6%回復', effect: { buffHealPct: 0.06 } },
        { id: 's3_4', name: '沈黙の楔', desc: '技2・技3命中時、35%で沈黙(1行動)を追加付与', effect: { skillSilence: 0.35 } }
      ],
      // Tier 4
      [
        { id: 's4_0', name: '行軍加速', desc: '技2・技3使用時、味方全体の行動ゲージ+10%', effect: { skillPartyAtb: 0.10 } },
        { id: 's4_1', name: '属性共鳴陣', desc: '味方全体の属性有利ダメージ+14%', effect: { partyWeakBonus: 0.14 } },
        { id: 's4_2', name: '連鎖弱体', desc: '敵がデバフを受けると攻撃力70%分の追加追撃', effect: { debuffBurstPct: 0.70 } },
        { id: 's4_3', name: '結界展開', desc: '味方全体の被ダメージ-8%、状態異常耐性+18%', effect: { partyDmgReduce: 0.08, partyResistPct: 0.18 } },
        { id: 's4_4', name: '氷結の帳', desc: 'WAVE開始時、ランダムな敵2体に凍結(2行動)', effect: { waveFreezeCount: 2 } }
      ],
      // Tier 5
      [
        { id: 's5_0', name: '時空指揮官', desc: '味方全体の行動速度+12%、自身行動時ランダム味方1体のCTを1短縮', effect: { partySpdPct: 0.12, turnAllyCtReduce: 1 } },
        { id: 's5_1', name: '覇道戦歌', desc: '味方全体の攻撃力+15%、会心ダメージ+20%', effect: { partyAtkPct: 0.15, partyCritDmg: 0.20 } },
        { id: 's5_2', name: '崩壊の理', desc: '敵全体の被ダメージ+12%、デバフ付与率+25%', effect: { enemyVulnAura: 0.12, effHitPct: 0.25 } },
        { id: 's5_3', name: '聖域の加護', desc: '味方全体の最大HP+15%、防御力+12%、各WAVE開始時障壁8%', effect: { partyHpPct: 0.15, partyDefPct: 0.12, allyWaveShieldPct: 0.08 } },
        { id: 's5_4', name: '混沌干渉', desc: '自身行動時、敵全体へランダムデバフ1種(2行動)を付与', effect: { turnEnemyRandomDebuff: 2 } }
      ]
    ],

    healer: [
      // Tier 1
      [
        { id: 'h1_0', name: '慈愛の手', desc: '与回復量+16%', effect: { healOutPct: 0.16 } },
        { id: 'h1_1', name: '生命の芽吹き', desc: '各WAVE開始時、味方全体に再生(2行動)を付与', effect: { wavePartyRegen: 2 } },
        { id: 'h1_2', name: '清浄の祈り', desc: '回復発動時、対象のデバフ/異常を1つ解除', effect: { healCleanse: 1 } },
        { id: 'h1_3', name: '余剰障壁', desc: '最大HPを超えた過剰回復分の65%を障壁に変換', effect: { overhealShieldPct: 0.65 } },
        { id: 'h1_4', name: '戦巫女の杖', desc: '自身の攻撃力+14%、速度+8%', effect: { atkPct: 0.14, spdPct: 0.08 } }
      ],
      // Tier 2
      [
        { id: 'h2_0', name: '救命優先', desc: 'HP50%以下の味方に対する与回復量+30%', effect: { lowAllyHealPct: 0.30 } },
        { id: 'h2_1', name: '癒しの風', desc: '自身の行動終了時、味方全体のHPを5%回復', effect: { turnPartyHealPct: 0.05 } },
        { id: 'h2_2', name: '加護のヴェール', desc: '味方全体の状態異常耐性+22%', effect: { partyResistPct: 0.22 } },
        { id: 'h2_3', name: '光輪結界', desc: '回復した対象へ防↑(2行動)を追加付与', effect: { healDefUp: 2 } },
        { id: 'h2_4', name: '反響聖光', desc: '技1で攻撃した際、最もHPが低い味方をHP8%回復', effect: { s1AllyHealPct: 0.08 } }
      ],
      // Tier 3
      [
        { id: 'h3_0', name: '豊穣の泉', desc: '与回復量+20%、自身の最大HP+14%', effect: { healOutPct: 0.20, hpPct: 0.14 } },
        { id: 'h3_1', name: '持続活性化', desc: '味方の再生による回復量+50%', effect: { regenBoostPct: 0.50 } },
        { id: 'h3_2', name: '完全抗体', desc: '自身の状態異常耐性+55%、速度+10%', effect: { resistPct: 0.55, spdPct: 0.10 } },
        { id: 'h3_3', name: '生命防壁', desc: '回復した対象へ最大HP8%の障壁を付与', effect: { healBonusShieldPct: 0.08 } },
        { id: 'h3_4', name: '鼓舞の癒し', desc: '回復した対象へ攻↑(2行動)を追加付与', effect: { healAtkUp: 2 } }
      ],
      // Tier 4
      [
        { id: 'h4_0', name: '臨界救済', desc: '味方のHPが35%以下になったとき自身の行動ゲージ+30%', effect: { emergencyAtb: 0.30 } },
        { id: 'h4_1', name: '永遠の庭園', desc: '味方全体が受ける回復量+18%', effect: { partyHealInPct: 0.18 } },
        { id: 'h4_2', name: '災厄反射', desc: 'デバフ解除成功時、味方全体の行動ゲージ+8%', effect: { cleanseAtb: 0.08 } },
        { id: 'h4_3', name: '堅牢聖幕', desc: '障壁を持つ味方の被ダメージを10%軽減', effect: { partyShieldDr: 0.10 } },
        { id: 'h4_4', name: '聖裁の輝き', desc: '回復発動時、ランダムな敵1体へ与回復量35%分の追撃', effect: { healSmitePct: 0.35 } }
      ],
      // Tier 5
      [
        { id: 'h5_0', name: '奇跡の聖杯', desc: '与回復量+32%、回復時に対象の行動ゲージ+10%', effect: { healOutPct: 0.32, healAtbGain: 0.10 } },
        { id: 'h5_1', name: '世界樹の息吹', desc: '毎行動終了時、味方全体HP7%回復＋再生(2行動)', effect: { turnPartyHealPct: 0.07, turnPartyRegen: 2 } },
        { id: 'h5_2', name: '無垢なる聖域', desc: '技3発動時、味方全体の全デバフ解除＋異常耐性+25%', effect: { s3FullCleanse: true, partyResistPct: 0.25 } },
        { id: 'h5_3', name: '天蓋の守護', desc: '過剰回復の100%を障壁化、味方全体最大HP+16%', effect: { overhealShieldPct: 0.35, partyHpPct: 0.16 } },
        { id: 'h5_4', name: '生命転化砲', desc: '味方全体の攻撃力+12%、回復発動時の聖裁追撃倍率+40%', effect: { partyAtkPct: 0.12, healSmitePct: 0.40 } }
      ]
    ]
  };

  const ABILITY_BY_ID = {};
  for (const [role, tiers] of Object.entries(ROLE_ABILITIES)) {
    tiers.forEach((choices, tierIdx) => {
      choices.forEach((ab, slotIdx) => {
        ab.role = role;
        ab.tier = tierIdx + 1;
        ab.slot = slotIdx;
        ABILITY_BY_ID[ab.id] = ab;
      });
    });
  }

  HS.Data.ROLE_ABILITIES = ROLE_ABILITIES;
  HS.Data.ABILITY_BY_ID = ABILITY_BY_ID;
})();
