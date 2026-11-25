(function () {
  'use strict';

  const HS = window.HS;

  // 28 Characters: 4 Starters + 6 Area Clear + 16 Shop (World Gold) + 2 Tower 100F Rewards
  // Includes single-race and dual-race characters, 3-skill kits and 2-skill+passive kits.
  const CHARACTERS = [
    // ==================== FIRE (5) ====================
    {
      id: 'c_fire_kain',
      name: '紅蓮騎士カイン',
      kana: 'ぐれんきしかいん',
      element: 'fire',
      races: ['human'],
      role: 'tank',
      unlock: { type: 'starter' },
      base: { hp: 1620, atk: 185, def: 175, spd: 96, critRate: 0.10, critDmg: 1.50 },
      skills: [
        { name: '紅炎盾撃', target: 'single', ct: 0, kind: 'dmg', power: 1.05, defScale: 0.45, desc: '単体へ防御依存の炎撃。自身の被弾耐性を整える。', effects: [{ stat: 'defUp', chance: 0.35, dur: 2, onSelf: true }] },
        { name: '烈火挑発陣', target: 'range', ct: 3, kind: 'dmg', power: 1.25, defScale: 0.55, desc: '範囲へ炎波を放ち、自身へ挑発(2行動)と防↑(2行動)を付与。', effects: [{ stat: 'taunt', chance: 1.0, dur: 2, onSelf: true }, { stat: 'defUp', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '不滅紅蓮壁', target: 'allyAll', ct: 4, kind: 'shield', shieldPct: 0.24, desc: '味方全体へ最大HP24%の炎障壁と防↑(2行動)を展開し、自身に反撃を付与。', effects: [{ stat: 'defUp', chance: 1.0, dur: 2 }, { stat: 'counter', chance: 1.0, dur: 2, onSelf: true }] }
      ],
      resonance: { name: '紅蓮の盾誓', desc: 'リンク先の最大HP+14%、防御力+12%', effect: { hpPct: 0.14, defPct: 0.12 } },
      awakenings: [
        { name: '第一刻印・耐熱甲', desc: '最大HP+15%、被ダメージ-6%', effect: { hpPct: 0.15, dmgTakenMult: -0.06 } },
        { name: '第二刻印・紅炎返', desc: '反撃発動率+25%、防御力+16%', effect: { counterChance: 0.25, defPct: 0.16 } },
        { name: '第三刻印・城塞核', desc: '味方全体の防御力+10%、各WAVE開始時自身に挑発(2行動)', effect: { partyDefPct: 0.10, waveTaunt: 2 } }
      ],
      lore: '崩壊した旧王国の近衛隊長。異界の溶接装甲で盾を補強し、どんな化け物の正面にも真っ先に立ち塞がる。'
    },
    {
      id: 'c_fire_ignis',
      name: '焔竜姫イグニス',
      kana: 'えんりゅうひめいぐにす',
      element: 'fire',
      races: ['human', 'dragon'],
      role: 'dealer',
      unlock: { type: 'starter' },
      base: { hp: 1180, atk: 278, def: 112, spd: 112, critRate: 0.16, critDmg: 1.60 },
      skills: [
        { name: '竜焔連爪', target: 'single', ct: 0, kind: 'dmg', power: 1.15, desc: '単体へ灼熱の爪撃。30%で火傷(2行動)を付与。', effects: [{ stat: 'burn', chance: 0.30, dur: 2 }] },
        { name: '爆炎竜息', target: 'range', ct: 3, kind: 'dmg', power: 1.55, desc: '範囲の敵を焼き払い、70%で火傷(2行動)と防↓(2行動)を付与。', effects: [{ stat: 'burn', chance: 0.70, dur: 2 }, { stat: 'defDown', chance: 0.70, dur: 2 }] },
        { name: '星墜紅蓮覇', target: 'all', ct: 4, kind: 'dmg', power: 2.05, desc: '敵全体へ竜炎を降り注ぐ大技。火傷中の敵には与ダメージ+35%。', bonusOnAilment: 'burn', bonusMult: 1.35, effects: [{ stat: 'burn', chance: 0.85, dur: 2 }] }
      ],
      resonance: { name: '竜炎の血脈', desc: 'リンク先の攻撃力+16%、会心ダメージ+16%', effect: { atkPct: 0.16, critDmg: 0.16 } },
      awakenings: [
        { name: '第一刻印・焦熱鱗', desc: '攻撃力+14%、火傷付与率+15%', effect: { atkPct: 0.14, effHitPct: 0.15 } },
        { name: '第二刻印・竜眼開', desc: '会心率+12%、炎与ダメージ+15%', effect: { critRate: 0.12, elDmgFire: 0.15 } },
        { name: '第三刻印・覇炎翼', desc: '敵撃破時、自身の行動ゲージ+30%、攻撃力+12%', effect: { killAtbGain: 0.30, atkPct: 0.12 } }
      ],
      lore: '古竜の心臓を継いだ若き戦姫。現代のミリタリージャケットを羽織りながら、笑い声と共に戦場を火の海へ変える。'
    },
    {
      id: 'c_fire_zenos',
      name: '機甲竜ゼノス',
      kana: 'きこうりゅうぜのす',
      element: 'fire',
      races: ['dragon', 'machine'],
      role: 'dealer',
      unlock: { type: 'area', areaId: 2 },
      base: { hp: 1320, atk: 292, def: 142, spd: 106, critRate: 0.14, critDmg: 1.65 },
      skills: [
        { name: '熱線パルス', target: 'single', ct: 0, kind: 'dmg', power: 1.18, desc: '単体へ高熱レーザーを照射。防御15%無視。', defPen: 0.15 },
        { name: '過熱ブラスト', target: 'all', ct: 3, kind: 'dmg', power: 1.72, desc: '敵全体へ溶炉砲を掃射し、80%で火傷(2行動)を付与。', effects: [{ stat: 'burn', chance: 0.80, dur: 2 }] },
        { name: '炉心暴走駆動', passive: true, desc: '【常時】自身の攻撃力+18%、行動するたび攻撃力+6%(最大4累積)、防御貫通+15%。', effect: { atkPct: 0.18, rampAtkPerTurn: 0.06, rampMax: 4, defPen: 0.15 } }
      ],
      resonance: { name: '竜機同期炉', desc: 'リンク先の攻撃力+14%、防御貫通+12%', effect: { atkPct: 0.14, defPen: 0.12 } },
      awakenings: [
        { name: '第一刻印・装甲炉', desc: '最大HP+14%、防御力+14%', effect: { hpPct: 0.14, defPct: 0.14 } },
        { name: '第二刻印・収束砲', desc: '会心ダメージ+28%、炎与ダメ+14%', effect: { critDmg: 0.28, elDmgFire: 0.14 } },
        { name: '第三刻印・超臨界', desc: '追撃発動率+28%、攻撃力+16%', effect: { extraHitChance: 0.28, extraHitMult: 0.60, atkPct: 0.16 } }
      ],
      lore: '紅蓮溶炉で目覚めた鋼鉄の古竜。魔導炉とジェット推進器を併せ持ち、唸りを上げて空を焦がす。'
    },
    {
      id: 'c_fire_mira',
      name: '妖炎舞姫ミラ',
      kana: 'ようえんまいひめみら',
      element: 'fire',
      races: ['fairy'],
      role: 'supporter',
      unlock: { type: 'shop', cost: 1100 },
      base: { hp: 1160, atk: 215, def: 120, spd: 124, critRate: 0.12, critDmg: 1.50 },
      skills: [
        { name: '灯火の粉', target: 'single', ct: 0, kind: 'dmg', power: 1.02, desc: '単体へ妖炎を飛ばし、50%で被↑(2行動)を付与。', effects: [{ stat: 'vuln', chance: 0.50, dur: 2 }] },
        { name: '祝炎の舞踏', target: 'allyAll', ct: 3, kind: 'buff', desc: '味方全体へ攻↑(2行動)と会↑(2行動)を授け、行動ゲージ+14%。', atbBoost: 0.14, effects: [{ stat: 'atkUp', chance: 1.0, dur: 2 }, { stat: 'critUp', chance: 1.0, dur: 2 }] },
        { name: '緋紅輪舞曲', target: 'all', ct: 4, kind: 'dmg', power: 1.65, desc: '敵全体へ炎の舞を浴びせ、防↓(2行動)と火傷(2行動)を付与。', effects: [{ stat: 'defDown', chance: 0.85, dur: 2 }, { stat: 'burn', chance: 0.85, dur: 2 }] }
      ],
      resonance: { name: '陽炎の祝詞', desc: 'リンク先の行動速度+12%、会心率+10%', effect: { spdPct: 0.12, critRate: 0.10 } },
      awakenings: [
        { name: '第一刻印・軽舞羽', desc: '行動速度+14%、開始ゲージ+18%', effect: { spdPct: 0.14, startAtbPct: 0.18 } },
        { name: '第二刻印・熱情歌', desc: '味方全体の攻撃力+10%、会心ダメージ+14%', effect: { partyAtkPct: 0.10, partyCritDmg: 0.14 } },
        { name: '第三刻印・不滅灯', desc: '味方全体の炎与ダメ+16%、デバフ命中+25%', effect: { elDmgFire: 0.16, effHitPct: 0.25 } }
      ],
      lore: '提灯の街で踊り続ける火の妖精。リズムに合わせて弾ける火花は、仲間の闘志を不思議なほど高揚させる。'
    },
    {
      id: 'c_fire_garm',
      name: '爆炎獣ガルド',
      kana: 'ばくえんじゅうがるど',
      element: 'fire',
      races: ['beast'],
      role: 'dealer',
      unlock: { type: 'shop', cost: 1650 },
      base: { hp: 1380, atk: 286, def: 126, spd: 115, critRate: 0.18, critDmg: 1.62 },
      skills: [
        { name: '烈火噛み砕き', target: 'single', ct: 0, kind: 'dmg', power: 1.22, desc: '単体へ猛烈な咬撃。自身HPが少ないほど威力が上昇。' },
        { name: '溶岩猛進撃', target: 'range', ct: 3, kind: 'dmg', power: 1.85, desc: '範囲の敵を吹き飛ばし、自身に攻↑(2行動)を付与。', effects: [{ stat: 'atkUp', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '紅狼狂炎牙', target: 'single', ct: 4, kind: 'dmg', power: 2.85, desc: '単体へ全てを懸けた超火力の一撃。与ダメージの18%分HP回復。', lifesteal: 0.18 }
      ],
      resonance: { name: '猛炎の牙魂', desc: 'リンク先の攻撃力+15%、吸血+6%', effect: { atkPct: 0.15, lifestealPct: 0.06 } },
      awakenings: [
        { name: '第一刻印・野性衝', desc: '会心率+14%、速度+10%', effect: { critRate: 0.14, spdPct: 0.10 } },
        { name: '第二刻印・血戦牙', desc: 'HP減少時与ダメ最大+35%、吸血+8%', effect: { missingHpDmgPct: 0.35, lifestealPct: 0.08 } },
        { name: '第三刻印・爆狼王', desc: '攻撃力+20%、技3ダメージ+25%', effect: { atkPct: 0.20, s3DmgPct: 0.25 } }
      ],
      lore: '火山地帯をバイクで駆ける炎狼の獣人。小細工を嫌い、燃え上がる拳と牙だけで道を切り拓く。'
    },

    // ==================== WATER (5) ====================
    {
      id: 'c_water_noa',
      name: '蒼海巫女ノア',
      kana: 'そうかいみこのあ',
      element: 'water',
      races: ['human'],
      role: 'healer',
      unlock: { type: 'starter' },
      base: { hp: 1360, atk: 196, def: 138, spd: 108, critRate: 0.08, critDmg: 1.45 },
      skills: [
        { name: '清流の水弾', target: 'single', ct: 0, kind: 'dmg', power: 1.00, desc: '単体へ水弾を放ち、最もHPが低い味方をHP8%回復。', allyBonusHealPct: 0.08 },
        { name: '潤いの波紋', target: 'allyRange', ct: 2, kind: 'heal', power: 1.65, desc: 'HP比率の低い味方2体を大回復し、再生(2行動)を付与。', effects: [{ stat: 'regen', chance: 1.0, dur: 2 }] },
        { name: '蒼海聖域歌', target: 'allyAll', ct: 4, kind: 'heal', power: 2.05, desc: '味方全体を大きく回復し、デバフ1つ解除＋防↑(2行動)を付与。', cleanse: 1, effects: [{ stat: 'defUp', chance: 1.0, dur: 2 }] }
      ],
      resonance: { name: '清流の祈り', desc: 'リンク先の最大HP+14%、被回復量+16%', effect: { hpPct: 0.14, healInPct: 0.16 } },
      awakenings: [
        { name: '第一刻印・澄水律', desc: '与回復量+18%、状態異常耐性+20%', effect: { healOutPct: 0.18, resistPct: 0.20 } },
        { name: '第二刻印・潮防壁', desc: '過剰回復の50%を障壁化、最大HP+14%', effect: { overhealShieldPct: 0.50, hpPct: 0.14 } },
        { name: '第三刻印・海聖杯', desc: '味方全体の被回復量+15%、与回復量+20%', effect: { partyHealInPct: 0.15, healOutPct: 0.20 } }
      ],
      lore: '沈んだ図書館の巫女。古文書と防水端末の両方を使いこなし、仲間たちの傷を静かな波音で癒す。'
    },
    {
      id: 'c_water_levi',
      name: '氷竜卿レヴィア',
      kana: 'ひょうりゅうきょうれヴぃあ',
      element: 'water',
      races: ['dragon'],
      role: 'tank',
      unlock: { type: 'area', areaId: 3 },
      base: { hp: 1740, atk: 192, def: 186, spd: 98, critRate: 0.10, critDmg: 1.50 },
      skills: [
        { name: '凍鱗の一撃', target: 'single', ct: 0, kind: 'dmg', power: 1.05, defScale: 0.45, desc: '単体へ氷結打撃。45%で凍結(1行動)を付与。', effects: [{ stat: 'freeze', chance: 0.45, dur: 1 }] },
        { name: '絶対零度壁', target: 'all', ct: 3, kind: 'dmg', power: 1.35, defScale: 0.50, desc: '敵全体へ寒波を放ち60%で凍結(1行動)、自身に挑発とHP18%障壁。', selfShieldPct: 0.18, effects: [{ stat: 'freeze', chance: 0.60, dur: 1 }, { stat: 'taunt', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '永久凍土鱗', passive: true, desc: '【常時】最大HP+16%、防御力+18%、被弾時に敵へ速↓(2行動)を付与。', effect: { hpPct: 0.16, defPct: 0.18, onHitSpdDownSelf: 2 } }
      ],
      resonance: { name: '氷河の加護', desc: 'リンク先の防御力+16%、被ダメージ-7%', effect: { defPct: 0.16, dmgTakenMult: -0.07 } },
      awakenings: [
        { name: '第一刻印・白氷殻', desc: '各WAVE開始時HP16%障壁、最大HP+14%', effect: { waveShieldPct: 0.16, hpPct: 0.14 } },
        { name: '第二刻印・凍縛陣', desc: 'デバフ命中+25%、防御力+18%', effect: { effHitPct: 0.25, defPct: 0.18 } },
        { name: '第三刻印・氷竜王', desc: '味方全体への全体被ダメ-12%、被ダメージ-10%', effect: { partyAoeReduce: 0.12, dmgTakenMult: -0.10 } }
      ],
      lore: '水晶海の深層を統べる氷竜の貴族。冷静沈着な紳士だが、凍りついた戦場を見る時だけは微かに笑う。'
    },
    {
      id: 'c_water_aqua',
      name: '滴精霊アクア',
      kana: 'しずくせいれいあくあ',
      element: 'water',
      races: ['fairy'],
      role: 'supporter',
      unlock: { type: 'shop', cost: 1200 },
      base: { hp: 1220, atk: 210, def: 130, spd: 126, critRate: 0.11, critDmg: 1.50 },
      skills: [
        { name: '水泡の戯れ', target: 'single', ct: 0, kind: 'dmg', power: 1.04, desc: '単体へ泡撃。50%で攻↓(2行動)を付与。', effects: [{ stat: 'atkDown', chance: 0.50, dur: 2 }] },
        { name: '翠泉の加護', target: 'allyAll', ct: 3, kind: 'buff', desc: '味方全体へ速↑(2行動)と再生(2行動)を付与し、デバフを1つ解除。', cleanse: 1, effects: [{ stat: 'spdUp', chance: 1.0, dur: 2 }, { stat: 'regen', chance: 1.0, dur: 2 }] },
        { name: '鏡水の大渦', target: 'all', ct: 4, kind: 'dmg', power: 1.58, desc: '敵全体へ水渦を放ち、75%で速↓(2行動)と凍結(1行動)を付与。', effects: [{ stat: 'spdDown', chance: 0.75, dur: 2 }, { stat: 'freeze', chance: 0.55, dur: 1 }] }
      ],
      resonance: { name: '湧水の導き', desc: 'リンク先の行動速度+11%、状態異常耐性+22%', effect: { spdPct: 0.11, resistPct: 0.22 } },
      awakenings: [
        { name: '第一刻印・清泉輪', desc: '速度+14%、味方全体耐性+15%', effect: { spdPct: 0.14, partyResistPct: 0.15 } },
        { name: '第二刻印・氷霧幕', desc: '味方全体防御+12%、デバフ命中+20%', effect: { partyDefPct: 0.12, effHitPct: 0.20 } },
        { name: '第三刻印・大河律', desc: '味方全体の行動速度+10%、毎行動味方全体HP4%回復', effect: { partySpdPct: 0.10, turnPartyHealPct: 0.04 } }
      ],
      lore: 'ガラス瓶に住み着いた気まぐれな水精霊。戦場の空気をひんやりと整え、敵の動きを鈍らせる。'
    },
    {
      id: 'c_water_sharo',
      name: '深海機シャロ',
      kana: 'しんかいきしゃろ',
      element: 'water',
      races: ['machine'],
      role: 'dealer',
      unlock: { type: 'shop', cost: 1750 },
      base: { hp: 1260, atk: 282, def: 136, spd: 114, critRate: 0.15, critDmg: 1.60 },
      skills: [
        { name: '超高圧水刃', target: 'single', ct: 0, kind: 'dmg', power: 1.16, desc: '単体へ高圧ウォーターカッター。敵防御15%無視。', defPen: 0.15 },
        { name: '魚雷斉射砲', target: 'range', ct: 3, kind: 'dmg', power: 1.78, desc: '範囲へ誘導水雷を撃ち込み、65%で防↓(2行動)を付与。', effects: [{ stat: 'defDown', chance: 0.65, dur: 2 }] },
        { name: '深淵水圧砲', target: 'all', ct: 4, kind: 'dmg', power: 2.15, desc: '敵全体へ超高圧奔流を放つ。凍結・速↓中の敵に与ダメ+30%。', bonusOnAnyDebuff: true, bonusMult: 1.30 }
      ],
      resonance: { name: '水圧タービン', desc: 'リンク先の攻撃力+14%、水与ダメ+12%', effect: { atkPct: 0.14, elDmgWater: 0.12 } },
      awakenings: [
        { name: '第一刻印・耐圧殻', desc: '攻撃力+14%、防御力+14%', effect: { atkPct: 0.14, defPct: 0.14 } },
        { name: '第二刻印・精密照', desc: '会心率+14%、防御貫通+16%', effect: { critRate: 0.14, defPen: 0.16 } },
        { name: '第三刻印・海溝砲', desc: '技3ダメージ+28%、水与ダメ+18%', effect: { s3DmgPct: 0.28, elDmgWater: 0.18 } }
      ],
      lore: '深海探査用自律ドロイド。いつの間にか海洋魔導兵器と合体し、穏やかな合成音声で高圧水刃を撃つ。'
    },
    {
      id: 'c_water_nereis',
      name: '海神妃ネレイス',
      kana: 'かいしんひねれいす',
      element: 'water',
      races: ['god'],
      role: 'healer',
      unlock: { type: 'shop', cost: 2800 },
      base: { hp: 1480, atk: 224, def: 152, spd: 112, critRate: 0.10, critDmg: 1.50 },
      skills: [
        { name: '蒼波神光', target: 'single', ct: 0, kind: 'dmg', power: 1.08, desc: '単体へ水神の光を放ち、味方全体のHPを5%回復。', partyBonusHealPct: 0.05 },
        { name: '大海神の祝福', target: 'allyAll', ct: 3, kind: 'heal', power: 1.95, desc: '味方全体を大回復し、最大HP14%障壁と全デバフ1解除を付与。', shieldPct: 0.14, cleanse: 1 },
        { name: '永劫海流の理', passive: true, desc: '【常時】与回復量+24%、毎行動終了時に味方全体HP6%回復、味方全体耐性+20%。', effect: { healOutPct: 0.24, turnPartyHealPct: 0.06, partyResistPct: 0.20 } }
      ],
      resonance: { name: '海神の恩寵', desc: 'リンク先の最大HP+18%、与回復量+18%', effect: { hpPct: 0.18, healOutPct: 0.18 } },
      awakenings: [
        { name: '第一刻印・真珠光', desc: '最大HP+16%、速度+10%', effect: { hpPct: 0.16, spdPct: 0.10 } },
        { name: '第二刻印・神水壁', desc: '過剰回復の65%を障壁化、味方全体防御+10%', effect: { overhealShieldPct: 0.65, partyDefPct: 0.10 } },
        { name: '第三刻印・蒼穹海', desc: '与回復量+25%、回復時対象の行動ゲージ+10%', effect: { healOutPct: 0.25, healAtbGain: 0.10 } }
      ],
      lore: '幾千の海世界を見守ってきた蒼海の女神。優雅な扇の一振りで壊滅寸前の部隊すら満潮のように蘇らせる。'
    },

    // ==================== WIND (5) ====================
    {
      id: 'c_wind_ren',
      name: '疾風剣士レン',
      kana: 'しっぷうけんしれん',
      element: 'wind',
      races: ['human'],
      role: 'supporter',
      unlock: { type: 'starter' },
      base: { hp: 1210, atk: 224, def: 122, spd: 128, critRate: 0.15, critDmg: 1.55 },
      skills: [
        { name: '風切り一閃', target: 'single', ct: 0, kind: 'dmg', power: 1.08, desc: '単体へ素早い斬撃。自身の行動ゲージ+15%。', selfAtb: 0.15 },
        { name: '追風の号令', target: 'allyAll', ct: 3, kind: 'buff', desc: '味方全体へ速↑(2行動)と攻↑(2行動)を付与し、行動ゲージ+16%。', atbBoost: 0.16, effects: [{ stat: 'spdUp', chance: 1.0, dur: 2 }, { stat: 'atkUp', chance: 1.0, dur: 2 }] },
        { name: '翠嵐連斬波', target: 'all', ct: 4, kind: 'dmg', power: 1.62, desc: '敵全体へ風の刃を浴びせ、70%で速↓(2行動)と防↓(2行動)を付与。', effects: [{ stat: 'spdDown', chance: 0.70, dur: 2 }, { stat: 'defDown', chance: 0.70, dur: 2 }] }
      ],
      resonance: { name: '疾風の歩調', desc: 'リンク先の行動速度+14%、開始ゲージ+15%', effect: { spdPct: 0.14, startAtbPct: 0.15 } },
      awakenings: [
        { name: '第一刻印・風脚術', desc: '行動速度+14%、会心率+10%', effect: { spdPct: 0.14, critRate: 0.10 } },
        { name: '第二刻印・追い風', desc: '味方全体の行動速度+10%、開始ゲージ+10%', effect: { partySpdPct: 0.10, wavePartyAtb: 0.10 } },
        { name: '第三刻印・嵐指揮', desc: '味方全体の攻撃力+12%、会心率+10%', effect: { partyAtkPct: 0.12, partyCritRate: 0.10 } }
      ],
      lore: '異界の配達屋兼剣士。スケートブレードで空を滑るように駆け抜け、仲間へ絶妙なタイミングで風を送る。'
    },
    {
      id: 'c_wind_fenrir',
      name: '嵐狼王フェン',
      kana: 'らんろうおうふぇん',
      element: 'wind',
      races: ['beast'],
      role: 'dealer',
      unlock: { type: 'area', areaId: 4 },
      base: { hp: 1240, atk: 294, def: 116, spd: 132, critRate: 0.22, critDmg: 1.68 },
      skills: [
        { name: '風牙連撃', target: 'single', ct: 0, kind: 'dmg', power: 1.18, desc: '単体へ高速双撃。会心時、自身の行動ゲージ+15%。', critAtb: 0.15 },
        { name: '烈風裂き', target: 'range', ct: 2, kind: 'dmg', power: 1.68, desc: '範囲を切り裂き、65%で被↑(2行動)を付与。', effects: [{ stat: 'vuln', chance: 0.65, dur: 2 }] },
        { name: '天狼絶嵐牙', target: 'single', ct: 4, kind: 'dmg', power: 2.75, desc: '単体へ目にも留まらぬ連牙。必ず会心が発生する。', guaranteedCrit: true }
      ],
      resonance: { name: '嵐狼の俊足', desc: 'リンク先の行動速度+13%、会心率+12%', effect: { spdPct: 0.13, critRate: 0.12 } },
      awakenings: [
        { name: '第一刻印・疾駆爪', desc: '速度+15%、追撃率+22%', effect: { spdPct: 0.15, extraHitChance: 0.22, extraHitMult: 0.55 } },
        { name: '第二刻印・牙極致', desc: '会心ダメージ+32%、風与ダメ+15%', effect: { critDmg: 0.32, elDmgWind: 0.15 } },
        { name: '第三刻印・狼王覇', desc: '敵撃破時CT1短縮＋ゲージ+35%、攻撃力+15%', effect: { killCtReduce: 1, killAtbGain: 0.35, atkPct: 0.15 } }
      ],
      lore: '獣王峡の頂に君臨する若き嵐狼。その脚力は音速を超え、気づいた時には獲物の背後に立っている。'
    },
    {
      id: 'c_wind_sylph',
      name: '翠風精シルフ',
      kana: 'すいふうせいしるふ',
      element: 'wind',
      races: ['fairy'],
      role: 'healer',
      unlock: { type: 'shop', cost: 1350 },
      base: { hp: 1280, atk: 204, def: 126, spd: 122, critRate: 0.10, critDmg: 1.50 },
      skills: [
        { name: '若葉の風刃', target: 'single', ct: 0, kind: 'dmg', power: 1.02, desc: '単体へ風刃を放ち、最もHPが低い味方へ再生(2行動)を付与。', allyBonusRegen: 2 },
        { name: '花嵐の癒風', target: 'allyAll', ct: 3, kind: 'heal', power: 1.55, desc: '味方全体を回復し、速↑(2行動)と再生(2行動)を付与。', effects: [{ stat: 'spdUp', chance: 1.0, dur: 2 }, { stat: 'regen', chance: 1.0, dur: 2 }] },
        { name: '大樹風の祈り', target: 'allyAll', ct: 4, kind: 'heal', power: 2.15, desc: '味方全体を大きく回復し、全デバフ2つ解除＋行動ゲージ+14%。', cleanse: 2, atbBoost: 0.14 }
      ],
      resonance: { name: '森風の囁き', desc: 'リンク先の行動速度+10%、与回復量+15%', effect: { spdPct: 0.10, healOutPct: 0.15 } },
      awakenings: [
        { name: '第一刻印・花風羽', desc: '与回復量+18%、速度+12%', effect: { healOutPct: 0.18, spdPct: 0.12 } },
        { name: '第二刻印・緑風環', desc: '味方全体の再生効果+40%、耐性+18%', effect: { regenBoostPct: 0.40, partyResistPct: 0.18 } },
        { name: '第三刻印・精霊樹', desc: '各WAVE開始時味方全体再生(2行動)、味方速度+8%', effect: { wavePartyRegen: 2, partySpdPct: 0.08 } }
      ],
      lore: '古木の上層から降りてきた風の上位妖精。草花の香りと共に舞い、傷ついた者の呼吸を整える。'
    },
    {
      id: 'c_wind_garuda',
      name: '翼機獣ガルーダ',
      kana: 'よくきじゅうがるーだ',
      element: 'wind',
      races: ['beast', 'machine'],
      role: 'dealer',
      unlock: { type: 'shop', cost: 2100 },
      base: { hp: 1210, atk: 288, def: 122, spd: 136, critRate: 0.18, critDmg: 1.62 },
      skills: [
        { name: '音速羽ミサイル', target: 'range', ct: 0, kind: 'dmg', power: 0.96, desc: '範囲の敵へ翼刃を連射する通常技。' },
        { name: '旋風ダイブ', target: 'all', ct: 3, kind: 'dmg', power: 1.84, desc: '敵全体へ超音速急降下。50%で暗闇(2行動)を付与。', effects: [{ stat: 'blind', chance: 0.50, dur: 2 }] },
        { name: '推力ターボ翼', passive: true, desc: '【常時】行動速度+20%、追撃発動率+32%、開始ゲージ+25%。', effect: { spdPct: 0.20, extraHitChance: 0.32, extraHitMult: 0.55, startAtbPct: 0.25 } }
      ],
      resonance: { name: '推力補助翼', desc: 'リンク先の行動速度+15%、追撃発動率+14%', effect: { spdPct: 0.15, extraHitChance: 0.14, extraHitMult: 0.50 } },
      awakenings: [
        { name: '第一刻印・流線翼', desc: '攻撃力+14%、会心率+12%', effect: { atkPct: 0.14, critRate: 0.12 } },
        { name: '第二刻印・音速壁', desc: '風与ダメ+18%、会心発生時ゲージ+14%', effect: { elDmgWind: 0.18, critAtbGain: 0.14 } },
        { name: '第三刻印・蒼穹機', desc: '速度+15%、追撃ダメージ倍率+35%', effect: { spdPct: 0.15, extraHitMult: 0.35 } }
      ],
      lore: '天空要塞で改造された巨大な鷲の機甲獣。タービン翼の轟音と共に、視界外から一斉掃射を浴びせる。'
    },
    {
      id: 'c_wind_zephyr',
      name: '翠竜盾ゼファー',
      kana: 'すいりゅうたてぜふぁー',
      element: 'wind',
      races: ['dragon'],
      role: 'tank',
      unlock: { type: 'shop', cost: 1950 },
      base: { hp: 1680, atk: 196, def: 172, spd: 116, critRate: 0.12, critDmg: 1.50 },
      skills: [
        { name: '嵐鱗タックル', target: 'single', ct: 0, kind: 'dmg', power: 1.06, defScale: 0.40, desc: '単体へ風を纏う突撃。40%で敵に暗闇(2行動)を付与。', effects: [{ stat: 'blind', chance: 0.40, dur: 2 }] },
        { name: '竜巻防風壁', target: 'allyAll', ct: 3, kind: 'shield', shieldPct: 0.20, desc: '味方全体へ最大HP20%障壁と速↑(2行動)を付与し、自身に挑発。', effects: [{ stat: 'spdUp', chance: 1.0, dur: 2 }, { stat: 'taunt', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '蒼嵐大防壁', target: 'all', ct: 4, kind: 'dmg', power: 1.55, defScale: 0.55, desc: '敵全体へ竜巻を放ち攻↓(2行動)、自身に反撃とHP16%回復。', selfHealPct: 0.16, effects: [{ stat: 'atkDown', chance: 0.80, dur: 2 }, { stat: 'counter', chance: 1.0, dur: 2, onSelf: true }] }
      ],
      resonance: { name: '嵐鱗の障壁', desc: 'リンク先の最大HP+12%、速度+10%、防御+10%', effect: { hpPct: 0.12, spdPct: 0.10, defPct: 0.10 } },
      awakenings: [
        { name: '第一刻印・風防鱗', desc: '最大HP+16%、速度+10%', effect: { hpPct: 0.16, spdPct: 0.10 } },
        { name: '第二刻印・反風陣', desc: '反撃率+30%、被ダメージ-8%', effect: { counterChance: 0.30, dmgTakenMult: -0.08 } },
        { name: '第三刻印・疾風城', desc: '味方全体へWAVE開始時HP12%障壁、味方速度+8%', effect: { allyWaveShieldPct: 0.12, partySpdPct: 0.08 } }
      ],
      lore: '暴風の結界を自在に編む翠の若竜。重い鎧ではなく旋風の圧力で敵の攻撃をすべて逸らし切る。'
    },

    // ==================== LIGHT (5) ====================
    {
      id: 'c_light_celes',
      name: '白銀聖女セレス',
      kana: 'はくぎんせいじょせれす',
      element: 'light',
      races: ['human'],
      role: 'healer',
      unlock: { type: 'area', areaId: 1 },
      base: { hp: 1420, atk: 214, def: 146, spd: 112, critRate: 0.10, critDmg: 1.50 },
      skills: [
        { name: '白銀聖光', target: 'single', ct: 0, kind: 'dmg', power: 1.04, desc: '単体へ聖光を放ち、35%で暗闇(1行動)を付与。', effects: [{ stat: 'blind', chance: 0.35, dur: 1 }] },
        { name: '聖銀の恵み', target: 'allyAll', ct: 3, kind: 'heal', power: 1.72, desc: '味方全体を回復し、攻↑(2行動)と防↑(2行動)を授ける。', effects: [{ stat: 'atkUp', chance: 1.0, dur: 2 }, { stat: 'defUp', chance: 1.0, dur: 2 }] },
        { name: '奇跡の白銀鐘', target: 'allyAll', ct: 4, kind: 'heal', power: 2.35, desc: '味方全体を特大回復し、全デバフ解除＋最大HP14%障壁を展開。', cleanse: 3, shieldPct: 0.14 }
      ],
      resonance: { name: '白銀の祝福', desc: 'リンク先の与回復量+16%、最大HP+12%、防御+10%', effect: { healOutPct: 0.16, hpPct: 0.12, defPct: 0.10 } },
      awakenings: [
        { name: '第一刻印・清浄鐘', desc: '与回復量+20%、状態異常耐性+25%', effect: { healOutPct: 0.20, resistPct: 0.25 } },
        { name: '第二刻印・聖光壁', desc: '回復時に対象へ最大HP8%障壁、最大HP+15%', effect: { healBonusShieldPct: 0.08, hpPct: 0.15 } },
        { name: '第三刻印・銀聖域', desc: '味方全体の被ダメ-8%、味方全体耐性+22%', effect: { partyDmgReduce: 0.08, partyResistPct: 0.22 } }
      ],
      lore: '廃都市の礼拝堂を守り抜いた白銀髪の聖女。魔導ランタンの柔らかな光で、絶望に沈んだ人々の傷を癒す。'
    },
    {
      id: 'c_light_sol',
      name: '太陽神官ソル',
      kana: 'たいようしんかんそる',
      element: 'light',
      races: ['god'],
      role: 'supporter',
      unlock: { type: 'area', areaId: 5 },
      base: { hp: 1360, atk: 242, def: 148, spd: 120, critRate: 0.14, critDmg: 1.55 },
      skills: [
        { name: '陽光貫通波', target: 'range', ct: 0, kind: 'dmg', power: 0.98, desc: '範囲へ陽光を放ち、45%で被↑(2行動)を付与。', effects: [{ stat: 'vuln', chance: 0.45, dur: 2 }] },
        { name: '白日の神託', target: 'allyAll', ct: 3, kind: 'buff', desc: '味方全体へ攻↑(2行動)・会↑(2行動)・最大HP15%障壁を展開。', shieldPct: 0.15, effects: [{ stat: 'atkUp', chance: 1.0, dur: 2 }, { stat: 'critUp', chance: 1.0, dur: 2 }] },
        { name: '天陽裁き砲', target: 'all', ct: 4, kind: 'dmg', power: 1.92, desc: '敵全体へ太陽光を降らせ、防↓(2行動)と火傷(2行動)を刻む。', effects: [{ stat: 'defDown', chance: 0.85, dur: 2 }, { stat: 'burn', chance: 0.85, dur: 2 }] }
      ],
      resonance: { name: '恒星の恩恵', desc: 'リンク先の攻撃力+14%、会心率+12%', effect: { atkPct: 0.14, critRate: 0.12 } },
      awakenings: [
        { name: '第一刻印・日輪冠', desc: '味方全体攻撃+10%、開始ゲージ+18%', effect: { partyAtkPct: 0.10, startAtbPct: 0.18 } },
        { name: '第二刻印・閃光陣', desc: '味方全体会心率+12%、会心ダメ+18%', effect: { partyCritRate: 0.12, partyCritDmg: 0.18 } },
        { name: '第三刻印・太陽律', desc: '味方全体の属性有利ダメージ+18%、速度+10%', effect: { partyWeakBonus: 0.18, spdPct: 0.10 } }
      ],
      lore: '天界回廊の星間灯台を司る太陽神官。サングラス越しの明るい笑顔で、味方全員に眩い祝福を注ぐ。'
    },
    {
      id: 'c_light_aegis',
      name: '光機盾イージス',
      kana: 'こうきたていーじす',
      element: 'light',
      races: ['machine'],
      role: 'tank',
      unlock: { type: 'shop', cost: 1850 },
      base: { hp: 1780, atk: 184, def: 198, spd: 94, critRate: 0.08, critDmg: 1.45 },
      skills: [
        { name: '光盾バッシュ', target: 'single', ct: 0, kind: 'dmg', power: 1.04, defScale: 0.50, desc: '単体へ光盾打撃。35%で気絶(1行動)を付与。', effects: [{ stat: 'stun', chance: 0.35, dur: 1 }] },
        { name: '光学全方位壁', target: 'allyAll', ct: 3, kind: 'shield', shieldPct: 0.28, desc: '味方全体へ最大HP28%の厚い光学障壁と挑発(自身2行動)を展開。', effects: [{ stat: 'taunt', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '絶対光学装甲', passive: true, desc: '【常時】防御力+24%、最大HP+16%、各WAVE開始時に味方全体へHP12%障壁。', effect: { defPct: 0.24, hpPct: 0.16, allyWaveShieldPct: 0.12 } }
      ],
      resonance: { name: '光学盾同期', desc: 'リンク先の防御力+18%、最大HP+12%', effect: { defPct: 0.18, hpPct: 0.12 } },
      awakenings: [
        { name: '第一刻印・反射膜', desc: '被ダメージ-10%、被弾時防御40%反射', effect: { dmgTakenMult: -0.10, thornsDefPct: 0.40 } },
        { name: '第二刻印・重光核', desc: '障壁中さらに被ダメ-18%、防御力+16%', effect: { shieldDr: 0.18, defPct: 0.16 } },
        { name: '第三刻印・不落機', desc: '致死耐え(HP35%復帰)、味方全体防御+12%', effect: { revivePct: 0.35, partyDefPct: 0.12 } }
      ],
      lore: '星間防衛計画で建造された自律守護機。仲間を守るためなら隕石の直撃すら正面から受け止める。'
    },
    {
      id: 'c_light_lumi',
      name: '星妖精ルミナ',
      kana: 'ほしようせいるみな',
      element: 'light',
      races: ['god', 'fairy'],
      role: 'dealer',
      unlock: { type: 'shop', cost: 2400 },
      base: { hp: 1180, atk: 298, def: 118, spd: 122, critRate: 0.22, critDmg: 1.70 },
      skills: [
        { name: '星屑の閃矢', target: 'single', ct: 0, kind: 'dmg', power: 1.16, desc: '単体へ高会心の星矢を放つ。会心率+15%。', bonusCrit: 0.15 },
        { name: '流星プリズム', target: 'range', ct: 3, kind: 'dmg', power: 1.88, desc: '範囲へ七色の星光を浴びせ、自身に会↑(2行動)を付与。', effects: [{ stat: 'critUp', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '超新星ノヴァ', target: 'all', ct: 4, kind: 'dmg', power: 2.32, desc: '敵全体へ星の奔流を解き放つ極光大技。敵防御20%無視。', defPen: 0.20 }
      ],
      resonance: { name: '星屑の煌めき', desc: 'リンク先の会心率+14%、会心ダメージ+22%', effect: { critRate: 0.14, critDmg: 0.22 } },
      awakenings: [
        { name: '第一刻印・星光眼', desc: '会心率+14%、攻撃力+14%', effect: { critRate: 0.14, atkPct: 0.14 } },
        { name: '第二刻印・閃光輪', desc: '会心時ゲージ+16%、光与ダメ+18%', effect: { critAtbGain: 0.16, elDmgLight: 0.18 } },
        { name: '第三刻印・天星冠', desc: '会心ダメージ+40%、技3ダメージ+25%', effect: { critDmg: 0.40, s3DmgPct: 0.25 } }
      ],
      lore: '神の星屑から生まれた小さな光精。無邪気に宙を飛び回りながら、恒星クラスの光弾を軽々と撃ち抜く。'
    },
    {
      id: 'c_light_aurelia',
      name: '天竜神アウレリア',
      kana: 'てんりゅうしんあうれりあ',
      element: 'light',
      races: ['dragon', 'god'],
      role: 'dealer',
      unlock: { type: 'tower', towerId: 1 },
      base: { hp: 1520, atk: 332, def: 162, spd: 126, critRate: 0.24, critDmg: 1.75 },
      skills: [
        { name: '天竜閃光刃', target: 'range', ct: 0, kind: 'dmg', power: 1.12, desc: '範囲を貫く黄金竜閃。敵防御20%無視。', defPen: 0.20 },
        { name: '聖竜の咆哮', target: 'all', ct: 3, kind: 'dmg', power: 1.96, desc: '敵全体へ神竜の裁きを下し、味方全体へ攻↑(2行動)とHP12%障壁。', partyShieldPct: 0.12, partyBuff: { stat: 'atkUp', dur: 2 } },
        { name: '創世天竜破', target: 'all', ct: 4, kind: 'dmg', power: 2.65, desc: '異界塔Ⅰ制覇の証。敵全体へ極大光撃を叩き込み、敵防御30%無視。', defPen: 0.30 }
      ],
      resonance: { name: '天竜神の威光', desc: 'リンク先の全基礎能力+14%、会心ダメージ+20%', effect: { hpPct: 0.14, atkPct: 0.14, defPct: 0.14, spdPct: 0.14, critDmg: 0.20 } },
      awakenings: [
        { name: '第一刻印・黄金鱗', desc: '攻撃力+18%、最大HP+16%', effect: { atkPct: 0.18, hpPct: 0.16 } },
        { name: '第二刻印・神竜翼', desc: '味方全体攻撃+12%、速度+14%', effect: { partyAtkPct: 0.12, spdPct: 0.14 } },
        { name: '第三刻印・創世光', desc: '会心ダメ+40%、光与ダメ+25%、追撃+25%', effect: { critDmg: 0.40, elDmgLight: 0.25, extraHitChance: 0.25, extraHitMult: 0.65 } }
      ],
      lore: '異界塔Ⅰの最上階に君臨していた白金の天竜神。試練を超えた強者を認め、その翼を貸すことを誓った。'
    },

    // ==================== DARK (5) ====================
    {
      id: 'c_dark_kuro',
      name: '冥剣士クロウ',
      kana: 'めいけんしくろう',
      element: 'dark',
      races: ['human', 'demon'],
      role: 'dealer',
      unlock: { type: 'shop', cost: 1300 },
      base: { hp: 1220, atk: 292, def: 114, spd: 118, critRate: 0.18, critDmg: 1.64 },
      skills: [
        { name: '影斬り', target: 'single', ct: 0, kind: 'dmg', power: 1.16, desc: '単体へ闇の斬撃。35%で毒(2行動)を付与。', effects: [{ stat: 'poison', chance: 0.35, dur: 2 }] },
        { name: '冥界の鎖刃', target: 'range', ct: 3, kind: 'dmg', power: 1.76, desc: '範囲へ闇刃を放ち、70%で防↓(2行動)と毒(2行動)を付与。', effects: [{ stat: 'defDown', chance: 0.70, dur: 2 }, { stat: 'poison', chance: 0.70, dur: 2 }] },
        { name: '絶影断罪斬', target: 'single', ct: 4, kind: 'dmg', power: 2.80, desc: '単体へ渾身の闇一閃。敵の異常/デバフ1個につき威力+15%。', perDebuffSkillMult: 0.15 }
      ],
      resonance: { name: '冥剣の鋭気', desc: 'リンク先の攻撃力+16%、異常特効+16%', effect: { atkPct: 0.16, debuffBonusDmg: 0.16 } },
      awakenings: [
        { name: '第一刻印・影刃', desc: '攻撃力+15%、吸血+8%', effect: { atkPct: 0.15, lifestealPct: 0.08 } },
        { name: '第二刻印・蝕毒', desc: '異常中の敵へ与ダメ+25%、闇与ダメ+16%', effect: { debuffBonusDmg: 0.25, elDmgDark: 0.16 } },
        { name: '第三刻印・冥極', desc: '防御貫通+22%、敵撃破時ゲージ+35%', effect: { defPen: 0.22, killAtbGain: 0.35 } }
      ],
      lore: '魔族の腕を宿した孤高の剣士。黒コートを翻し、異界の闇を斬り裂くことで自らの呪いを抑えている。'
    },
    {
      id: 'c_dark_lilith',
      name: '深淵魔女リリス',
      kana: 'しんえんまじょりりす',
      element: 'dark',
      races: ['demon'],
      role: 'supporter',
      unlock: { type: 'area', areaId: 6 },
      base: { hp: 1240, atk: 248, def: 128, spd: 124, critRate: 0.14, critDmg: 1.55 },
      skills: [
        { name: '呪縛の黒蝶', target: 'single', ct: 0, kind: 'dmg', power: 1.05, desc: '単体へ黒蝶を放ち、55%で毒(2行動)と攻↓(2行動)を付与。', effects: [{ stat: 'poison', chance: 0.55, dur: 2 }, { stat: 'atkDown', chance: 0.55, dur: 2 }] },
        { name: '深淵の呪詛陣', target: 'all', ct: 3, kind: 'dmg', power: 1.48, desc: '敵全体へ防↓(2行動)・被↑(2行動)・沈黙(1行動)を付与。', effects: [{ stat: 'defDown', chance: 0.85, dur: 2 }, { stat: 'vuln', chance: 0.85, dur: 2 }, { stat: 'silence', chance: 0.50, dur: 1 }] },
        { name: '永闇の侵蝕', passive: true, desc: '【常時】デバフ命中+30%、敵全体の防御力-12%、敵全体の被ダメ+10%。', effect: { effHitPct: 0.30, enemyDefAura: -0.12, enemyVulnAura: 0.10 } }
      ],
      resonance: { name: '魔女の秘呪', desc: 'リンク先のデバフ命中+25%、異常特効+18%', effect: { effHitPct: 0.25, debuffBonusDmg: 0.18 } },
      awakenings: [
        { name: '第一刻印・黒魔導', desc: '速度+14%、攻撃力+14%', effect: { spdPct: 0.14, atkPct: 0.14 } },
        { name: '第二刻印・永呪鎖', desc: 'デバフ持続+1行動、敵全体攻撃-8%', effect: { debuffExtend: 1, enemyAtkAura: -0.08 } },
        { name: '第三刻印・深淵妃', desc: '味方全体攻撃+12%、行動時敵全体へランダムデバフ', effect: { partyAtkPct: 0.12, turnEnemyRandomDebuff: 2 } }
      ],
      lore: '混沌深淵で紅茶を嗜む妖艶な魔女。敵を弱体化させる呪術の芸術性に並々ならぬ情熱を注ぐ。'
    },
    {
      id: 'c_dark_belial',
      name: '魔獣将ベリアル',
      kana: 'まじゅうしょうべりある',
      element: 'dark',
      races: ['demon', 'beast'],
      role: 'tank',
      unlock: { type: 'shop', cost: 2050 },
      base: { hp: 1760, atk: 222, def: 168, spd: 102, critRate: 0.12, critDmg: 1.55 },
      skills: [
        { name: '吸魂爪撃', target: 'single', ct: 0, kind: 'dmg', power: 1.12, defScale: 0.35, desc: '単体へ魔爪撃。与ダメージの35%分HPを吸収する。', lifesteal: 0.35 },
        { name: '漆黒威圧哮', target: 'all', ct: 3, kind: 'dmg', power: 1.42, defScale: 0.40, desc: '敵全体へ攻↓(2行動)を付与し、自身へ挑発(2行動)と反撃(2行動)。', effects: [{ stat: 'atkDown', chance: 0.80, dur: 2 }, { stat: 'taunt', chance: 1.0, dur: 2, onSelf: true }, { stat: 'counter', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '冥獣血宴', target: 'range', ct: 4, kind: 'dmg', power: 1.95, defScale: 0.55, desc: '範囲を喰らい尽くし、与ダメージの50%分HPを大回復。', lifesteal: 0.50 }
      ],
      resonance: { name: '魔獣の血契', desc: 'リンク先の最大HP+16%、吸血+8%', effect: { hpPct: 0.16, lifestealPct: 0.08 } },
      awakenings: [
        { name: '第一刻印・黒剛毛', desc: '最大HP+18%、防御力+14%', effect: { hpPct: 0.18, defPct: 0.14 } },
        { name: '第二刻印・暴食牙', desc: '吸血+14%、反撃率+28%', effect: { lifestealPct: 0.14, counterChance: 0.28 } },
        { name: '第三刻印・不沈獣', desc: '被弾ごとHP5%回復、致死耐え(HP30%)', effect: { onHitHealPct: 0.05, revivePct: 0.30 } }
      ],
      lore: '魔界戦線を一人で支えた黒獅子の将軍。受けた傷を敵の生命力で即座に塗り替える不沈の闘士。'
    },
    {
      id: 'c_dark_nyx',
      name: '夜想巫女ニュクス',
      kana: 'やそうみこにゅくす',
      element: 'dark',
      races: ['god'],
      role: 'healer',
      unlock: { type: 'shop', cost: 2600 },
      base: { hp: 1380, atk: 236, def: 136, spd: 116, critRate: 0.12, critDmg: 1.55 },
      skills: [
        { name: '宵闇の星灯', target: 'single', ct: 0, kind: 'dmg', power: 1.08, desc: '単体へ闇光を放ち、最もHPが低い味方をHP10%回復。', allyBonusHealPct: 0.10 },
        { name: '安寧の夜帳', target: 'allyAll', ct: 3, kind: 'heal', power: 1.68, desc: '味方全体を回復し、会↑(2行動)と再生(2行動)を付与。', effects: [{ stat: 'critUp', chance: 1.0, dur: 2 }, { stat: 'regen', chance: 1.0, dur: 2 }] },
        { name: '月影の鎮魂歌', target: 'all', ct: 4, kind: 'dmg', power: 1.75, desc: '敵全体へ闇波を放ち、与ダメージに応じて味方全体を大きく回復する。', partyDrainHeal: 0.42 }
      ],
      resonance: { name: '夜帳の安息', desc: 'リンク先の与回復量+16%、攻撃力+12%', effect: { healOutPct: 0.16, atkPct: 0.12 } },
      awakenings: [
        { name: '第一刻印・月華灯', desc: '与回復量+20%、攻撃力+14%', effect: { healOutPct: 0.20, atkPct: 0.14 } },
        { name: '第二刻印・宵聖裁', desc: '回復発動時、敵1体へ与回復量40%の闇追撃', effect: { healSmitePct: 0.40 } },
        { name: '第三刻印・永夜神', desc: '味方全体会心ダメ+22%、被回復量+16%', effect: { partyCritDmg: 0.22, partyHealInPct: 0.16 } }
      ],
      lore: '星なき夜空を司る静謐の女神。敵から奪った魔力を穏やかな子守唄へと変え、味方の傷を塞ぐ。'
    },
    {
      id: 'c_dark_omega',
      name: '終焉機構オメガ',
      kana: 'しゅうえんきこうおめが',
      element: 'dark',
      races: ['demon', 'machine'],
      role: 'dealer',
      unlock: { type: 'tower', towerId: 2 },
      base: { hp: 1460, atk: 348, def: 158, spd: 132, critRate: 0.24, critDmg: 1.80 },
      skills: [
        { name: '虚無演算斬', target: 'range', ct: 0, kind: 'dmg', power: 1.18, desc: '範囲を断ち切る暗黒演算刃。50%で被↑(2行動)を付与。', effects: [{ stat: 'vuln', chance: 0.50, dur: 2 }] },
        { name: '終末消去砲', target: 'all', ct: 3, kind: 'dmg', power: 2.48, desc: '異界塔Ⅱ制覇の証。敵全体へ極大暗黒砲＋防↓・毒・火傷(2行動)、防御30%無視。', defPen: 0.30, effects: [{ stat: 'defDown', chance: 0.90, dur: 2 }, { stat: 'poison', chance: 0.90, dur: 2 }, { stat: 'burn', chance: 0.90, dur: 2 }] },
        { name: '無限終焉演算', passive: true, desc: '【常時】攻撃力+24%、追撃発動率+38%、敵撃破時ゲージ+40%＆CT1短縮。', effect: { atkPct: 0.24, extraHitChance: 0.38, extraHitMult: 0.70, killAtbGain: 0.40, killCtReduce: 1 } }
      ],
      resonance: { name: '終焉コア共鳴', desc: 'リンク先の攻撃力+20%、防御貫通+16%、速度+10%', effect: { atkPct: 0.20, defPen: 0.16, spdPct: 0.10 } },
      awakenings: [
        { name: '第一刻印・暗黒炉', desc: '攻撃力+20%、会心率+14%', effect: { atkPct: 0.20, critRate: 0.14 } },
        { name: '第二刻印・法則破', desc: '敵デバフ1個につき与ダメ+12%、闇与ダメ+25%', effect: { perDebuffDmg: 0.12, elDmgDark: 0.25 } },
        { name: '第三刻印・零終焉', desc: '会心ダメージ+45%、吸血+12%、速度+14%', effect: { critDmg: 0.45, lifestealPct: 0.12, spdPct: 0.14 } }
      ],
      lore: '異界塔Ⅱの頂点で全ての異世界を演算していた魔導自律兵器。限界を突破した指揮官を新たな主と認めた。'
    },

    // ==================== NONE (8) - Covers remaining race/role combos! ====================
    {
      id: 'c_none_zero',
      name: '零式機兵ゼロ',
      kana: 'ぜろしききへいぜろ',
      element: 'none',
      races: ['human', 'machine'],
      role: 'dealer',
      unlock: { type: 'shop', cost: 1450 },
      base: { hp: 1310, atk: 284, def: 138, spd: 118, critRate: 0.20, critDmg: 1.65 },
      skills: [
        { name: '零式ブレード', target: 'single', ct: 0, kind: 'dmg', power: 1.20, desc: '単体へ無属性の精密斬撃。属性耐性に影響されない。' },
        { name: 'オーバードライブ', target: 'range', ct: 3, kind: 'dmg', power: 1.82, desc: '範囲へ高速連斬し、自身に速↑(2行動)と会↑(2行動)を付与。', effects: [{ stat: 'spdUp', chance: 1.0, dur: 2, onSelf: true }, { stat: 'critUp', chance: 1.0, dur: 2, onSelf: true }] },
        { name: 'ゼロ・イグニション', target: 'all', ct: 4, kind: 'dmg', power: 2.24, desc: '敵全体へ純粋エネルギー衝撃波を放つ。敵防御25%無視。', defPen: 0.25 }
      ],
      resonance: { name: '零式補助回路', desc: 'リンク先の攻撃力+14%、速度+10%、会心率+8%', effect: { atkPct: 0.14, spdPct: 0.10, critRate: 0.08 } },
      awakenings: [
        { name: '第一刻印・精密脚', desc: '速度+14%、会心率+12%', effect: { spdPct: 0.14, critRate: 0.12 } },
        { name: '第二刻印・無垢刃', desc: '無属性与ダメ+22%、防御貫通+18%', effect: { elDmgNone: 0.22, defPen: 0.18 } },
        { name: '第三刻印・零極限', desc: '追撃率+28%、会心ダメ+35%', effect: { extraHitChance: 0.28, extraHitMult: 0.60, critDmg: 0.35 } }
      ],
      lore: '義体化された異界調査員。どの属性にも染まらない純白のブレードを操り、淡々と任務を遂行する。'
    },
    {
      id: 'c_none_valk',
      name: '鋼鉄騎士ヴァルク',
      kana: 'こうてつきしヴぁるく',
      element: 'none',
      races: ['human'],
      role: 'tank',
      unlock: { type: 'shop', cost: 1050 },
      base: { hp: 1700, atk: 190, def: 184, spd: 98, critRate: 0.10, critDmg: 1.50 },
      skills: [
        { name: '重装盾撃', target: 'single', ct: 0, kind: 'dmg', power: 1.05, defScale: 0.48, desc: '単体へ重い盾撃。40%で攻↓(2行動)を付与。', effects: [{ stat: 'atkDown', chance: 0.40, dur: 2 }] },
        { name: '不落の戦列', target: 'allyAll', ct: 3, kind: 'buff', desc: '味方全体へ防↑(2行動)とHP16%障壁を展開し、自身に挑発。', shieldPct: 0.16, effects: [{ stat: 'defUp', chance: 1.0, dur: 2 }, { stat: 'taunt', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '鋼鉄要塞化', passive: true, desc: '【常時】最大HP+20%、防御力+20%、弱点属性を受けず被ダメージ-10%。', effect: { hpPct: 0.20, defPct: 0.20, dmgTakenMult: -0.10 } }
      ],
      resonance: { name: '鋼鉄の心得', desc: 'リンク先の最大HP+15%、防御力+15%', effect: { hpPct: 0.15, defPct: 0.15 } },
      awakenings: [
        { name: '第一刻印・重盾鍛', desc: '防御力+18%、状態異常耐性+25%', effect: { defPct: 0.18, resistPct: 0.25 } },
        { name: '第二刻印・守護誓', desc: '味方全体の最大HP+12%、全体被ダメ-12%', effect: { partyHpPct: 0.12, partyAoeReduce: 0.12 } },
        { name: '第三刻印・不屈鎧', desc: '毎行動HP6%回復、防御力の40%を攻撃力に加算', effect: { turnRegenPct: 0.06, defToAtkPct: 0.40 } }
      ],
      lore: '古今東西あらゆる戦場を渡り歩いたベテラン騎士。魔法も機械も信用せず、磨き抜いた鋼鉄だけを信じる。'
    },
    {
      id: 'c_none_drake',
      name: '白銀竜ドレイク',
      kana: 'はくぎんりゅうどれいく',
      element: 'none',
      races: ['dragon'],
      role: 'supporter',
      unlock: { type: 'shop', cost: 2250 },
      base: { hp: 1460, atk: 234, def: 156, spd: 118, critRate: 0.14, critDmg: 1.55 },
      skills: [
        { name: '銀鱗の衝撃波', target: 'range', ct: 0, kind: 'dmg', power: 1.02, desc: '範囲へ無属性の衝撃波。40%で防↓(2行動)を付与。', effects: [{ stat: 'defDown', chance: 0.40, dur: 2 }] },
        { name: '古竜の共鳴咆', target: 'allyAll', ct: 3, kind: 'buff', desc: '味方全体へ攻↑・防↑・速↑(各2行動)を同時付与。', effects: [{ stat: 'atkUp', chance: 1.0, dur: 2 }, { stat: 'defUp', chance: 1.0, dur: 2 }, { stat: 'spdUp', chance: 1.0, dur: 2 }] },
        { name: '白銀時空ブレス', target: 'all', ct: 4, kind: 'dmg', power: 1.88, desc: '敵全体へ銀色のブレスを放ち、味方全体の行動ゲージ+18%。', partyAtb: 0.18 }
      ],
      resonance: { name: '白銀竜の叡智', desc: 'リンク先の全基礎能力+11%', effect: { hpPct: 0.11, atkPct: 0.11, defPct: 0.11, spdPct: 0.11 } },
      awakenings: [
        { name: '第一刻印・銀竜律', desc: '味方全体攻撃+10%、味方全体防御+10%', effect: { partyAtkPct: 0.10, partyDefPct: 0.10 } },
        { name: '第二刻印・時空翼', desc: '速度+15%、各WAVE開始時味方全体ゲージ+12%', effect: { spdPct: 0.15, wavePartyAtb: 0.12 } },
        { name: '第三刻印・古竜王', desc: '味方全体速度+10%、会心ダメージ+20%', effect: { partySpdPct: 0.10, partyCritDmg: 0.20 } }
      ],
      lore: '属性が分かれる以前の世界を知る老練の白銀竜。言葉少なに戦局全体を見渡し、完璧な援護を施す。'
    },
    {
      id: 'c_none_kronos',
      name: '時空神クロノス',
      kana: 'じくうしんくろのす',
      element: 'none',
      races: ['god'],
      role: 'supporter',
      unlock: { type: 'shop', cost: 3200 },
      base: { hp: 1380, atk: 244, def: 148, spd: 134, critRate: 0.14, critDmg: 1.55 },
      skills: [
        { name: '秒針の裁き', target: 'single', ct: 0, kind: 'dmg', power: 1.08, desc: '単体へ時空針を突き立て、50%で速↓(2行動)を付与。', effects: [{ stat: 'spdDown', chance: 0.50, dur: 2 }] },
        { name: '時間加速領域', target: 'allyAll', ct: 3, kind: 'buff', desc: '味方全体の行動ゲージ+24%、速↑(2行動)とランダム味方2体のCT1短縮。', atbBoost: 0.24, reduceAllyCt: 2, effects: [{ stat: 'spdUp', chance: 1.0, dur: 2 }] },
        { name: '刻の支配者', passive: true, desc: '【常時】味方全体の行動速度+14%、開始ゲージ+18%、敵全体速度-10%。', effect: { partySpdPct: 0.14, wavePartyAtb: 0.18, enemySpdAura: -0.10 } }
      ],
      resonance: { name: '時空の歯車', desc: 'リンク先の行動速度+16%、開始ゲージ+20%', effect: { spdPct: 0.16, startAtbPct: 0.20 } },
      awakenings: [
        { name: '第一刻印・秒針律', desc: '速度+16%、最大HP+14%', effect: { spdPct: 0.16, hpPct: 0.14 } },
        { name: '第二刻印・時戻し', desc: '行動時ランダム味方1体のCTを1短縮、味方攻撃+10%', effect: { turnAllyCtReduce: 1, partyAtkPct: 0.10 } },
        { name: '第三刻印・永劫刻', desc: '味方全体の行動速度+12%、会心率+12%', effect: { partySpdPct: 0.12, partyCritRate: 0.12 } }
      ],
      lore: '巨大な懐中時計を背負う時の神。はちゃめちゃに混ざり合った異世界の時間を、面白がりながら調律している。'
    },
    {
      id: 'c_none_mimic',
      name: '擬態魔ミミック',
      kana: 'ぎたいまみみっく',
      element: 'none',
      races: ['demon'],
      role: 'supporter',
      unlock: { type: 'shop', cost: 1500 },
      base: { hp: 1350, atk: 238, def: 142, spd: 120, critRate: 0.16, critDmg: 1.55 },
      skills: [
        { name: 'びっくり噛みつき', target: 'single', ct: 0, kind: 'dmg', power: 1.12, desc: '単体へ奇襲攻撃。45%で気絶(1行動)または毒(2行動)。', effects: [{ stat: 'poison', chance: 0.45, dur: 2 }, { stat: 'stun', chance: 0.25, dur: 1 }] },
        { name: '宝箱のいたずら', target: 'all', ct: 3, kind: 'dmg', power: 1.52, desc: '敵全体へ煙幕弾を投げ、暗闇・沈黙・被↑(各2行動)を高確率付与。', effects: [{ stat: 'blind', chance: 0.70, dur: 2 }, { stat: 'silence', chance: 0.55, dur: 1 }, { stat: 'vuln', chance: 0.80, dur: 2 }] },
        { name: 'お宝大盤振る舞い', target: 'allyAll', ct: 4, kind: 'heal', power: 1.38, desc: '味方全体を回復し、攻↑・会↑・HP12%障壁を気前よく配る。', shieldPct: 0.12, effects: [{ stat: 'atkUp', chance: 1.0, dur: 2 }, { stat: 'critUp', chance: 1.0, dur: 2 }] }
      ],
      resonance: { name: '秘宝の嗅覚', desc: 'リンク先の攻撃力+12%、会心率+12%、最大HP+10%', effect: { atkPct: 0.12, critRate: 0.12, hpPct: 0.10 } },
      awakenings: [
        { name: '第一刻印・頑丈箱', desc: '最大HP+16%、防御力+16%', effect: { hpPct: 0.16, defPct: 0.16 } },
        { name: '第二刻印・奇術袋', desc: 'デバフ命中+25%、味方全体会心率+10%', effect: { effHitPct: 0.25, partyCritRate: 0.10 } },
        { name: '第三刻印・黄金箱', desc: '味方全体攻撃+12%、敵全体被ダメ+10%', effect: { partyAtkPct: 0.12, enemyVulnAura: 0.10 } }
      ],
      lore: '自販機にも宝箱にも化けられる陽気な魔物。中身は異世界のガラクタと回復薬がぎっしり詰まっている。'
    },
    {
      id: 'c_none_pixie',
      name: '幻夢精ピクシー',
      kana: 'げんむせいぴくしー',
      element: 'none',
      races: ['fairy'],
      role: 'healer',
      unlock: { type: 'shop', cost: 1600 },
      base: { hp: 1320, atk: 206, def: 132, spd: 124, critRate: 0.12, critDmg: 1.50 },
      skills: [
        { name: '夢色パウダー', target: 'single', ct: 0, kind: 'dmg', power: 1.00, desc: '単体へ幻の鱗粉を振りかけ、40%で暗闇(2行動)を付与。', effects: [{ stat: 'blind', chance: 0.40, dur: 2 }] },
        { name: 'まどろみの癒し', target: 'allyRange', ct: 2, kind: 'heal', power: 1.78, desc: 'HP比率が低い味方2体を大回復し、デバフを2つ解除。', cleanse: 2 },
        { name: '夢幻ユートピア', target: 'allyAll', ct: 4, kind: 'heal', power: 1.98, desc: '味方全体を回復し、再生(2行動)・速↑(2行動)・HP14%障壁を展開。', shieldPct: 0.14, effects: [{ stat: 'regen', chance: 1.0, dur: 2 }, { stat: 'spdUp', chance: 1.0, dur: 2 }] }
      ],
      resonance: { name: '夢見の鱗粉', desc: 'リンク先の与回復量+15%、行動速度+11%', effect: { healOutPct: 0.15, spdPct: 0.11 } },
      awakenings: [
        { name: '第一刻印・夢羽根', desc: '与回復量+18%、速度+12%', effect: { healOutPct: 0.18, spdPct: 0.12 } },
        { name: '第二刻印・清夢幕', desc: '回復時デバフ1解除、味方全体耐性+20%', effect: { healCleanse: 1, partyResistPct: 0.20 } },
        { name: '第三刻印・常夢郷', desc: '過剰回復55%障壁化、毎行動味方全体HP5%回復', effect: { overhealShieldPct: 0.55, turnPartyHealPct: 0.05 } }
      ],
      lore: '夢と現実の境界を飛び交う虹羽の妖精。どんな激戦の最中でも、彼女の周りだけは柔らかな午睡の空気が漂う。'
    },
    {
      id: 'c_none_leo',
      name: '白獅王レオ',
      kana: 'はくしおうれお',
      element: 'none',
      races: ['beast'],
      role: 'tank',
      unlock: { type: 'shop', cost: 2300 },
      base: { hp: 1820, atk: 226, def: 178, spd: 108, critRate: 0.14, critDmg: 1.55 },
      skills: [
        { name: '百獣の鉄拳', target: 'single', ct: 0, kind: 'dmg', power: 1.10, defScale: 0.42, desc: '単体へ剛拳を叩き込む。30%で気絶(1行動)を付与。', effects: [{ stat: 'stun', chance: 0.30, dur: 1 }] },
        { name: '王者獅子の咆哮', target: 'all', ct: 3, kind: 'dmg', power: 1.48, defScale: 0.45, desc: '敵全体へ攻↓(2行動)、味方全体へ攻↑(2行動)と自身に挑発・反撃。', partyBuff: { stat: 'atkUp', dur: 2 }, effects: [{ stat: 'atkDown', chance: 0.80, dur: 2 }, { stat: 'taunt', chance: 1.0, dur: 2, onSelf: true }, { stat: 'counter', chance: 1.0, dur: 2, onSelf: true }] },
        { name: '白獅不滅の誇り', passive: true, desc: '【常時】最大HP+22%、反撃率+32%、自身の防御40%を攻撃力に加算。', effect: { hpPct: 0.22, counterChance: 0.32, defToAtkPct: 0.40 } }
      ],
      resonance: { name: '百獣王の誇り', desc: 'リンク先の最大HP+15%、攻撃力+12%、防御力+10%', effect: { hpPct: 0.15, atkPct: 0.12, defPct: 0.10 } },
      awakenings: [
        { name: '第一刻印・白鬣鎧', desc: '最大HP+16%、防御力+16%', effect: { hpPct: 0.16, defPct: 0.16 } },
        { name: '第二刻印・王者牙', desc: '反撃ダメージ+45%、被ダメージ-8%', effect: { counterDmgPct: 0.45, dmgTakenMult: -0.08 } },
        { name: '第三刻印・百獣陣', desc: '味方全体攻撃+10%、味方全体最大HP+12%', effect: { partyAtkPct: 0.10, partyHpPct: 0.12 } }
      ],
      lore: '異界の闘技場で無敗を誇った白銀の獅子王。拳と誇りひとつで仲間の背中を守り切る。'
    },
    {
      id: 'c_none_medica',
      name: '救護機メディカ',
      kana: 'きゅうごきめでぃか',
      element: 'none',
      races: ['machine'],
      role: 'healer',
      unlock: { type: 'shop', cost: 1700 },
      base: { hp: 1460, atk: 208, def: 158, spd: 116, critRate: 0.08, critDmg: 1.45 },
      skills: [
        { name: 'ナノ修復弾', target: 'allySingle', ct: 0, kind: 'heal', power: 1.15, desc: '最もHP比率が低い味方1体を回復する通常救護。' },
        { name: '広域ナノミスト', target: 'allyAll', ct: 3, kind: 'heal', power: 1.80, desc: '味方全体へ修復ナノマシンを散布し、最大HP15%障壁と防↑(2行動)。', shieldPct: 0.15, effects: [{ stat: 'defUp', chance: 1.0, dur: 2 }] },
        { name: '緊急自動蘇生炉', passive: true, desc: '【常時】与回復量+20%、味方HP35%以下で自身ゲージ+30%、毎行動味方全体HP5%回復。', effect: { healOutPct: 0.20, emergencyAtb: 0.30, turnPartyHealPct: 0.05 } }
      ],
      resonance: { name: '自律修復パック', desc: 'リンク先の最大HP+14%、毎行動HP4%回復', effect: { hpPct: 0.14, turnRegenPct: 0.04 } },
      awakenings: [
        { name: '第一刻印・医療核', desc: '最大HP+16%、防御力+16%', effect: { hpPct: 0.16, defPct: 0.16 } },
        { name: '第二刻印・高速診', desc: '速度+14%、与回復量+18%', effect: { spdPct: 0.14, healOutPct: 0.18 } },
        { name: '第三刻印・完全救', desc: '回復時デバフ1解除＋防↑(2行動)、味方全体耐性+20%', effect: { healCleanse: 1, healDefUp: 2, partyResistPct: 0.20 } }
      ],
      lore: '星間医療船から派遣された救護アンドロイド。傷口を0.1秒で解析し、最適な修復プログラムを送り届ける。'
    }
  ];

  // Sort canonically using HS.CONST.compareUnits
  CHARACTERS.sort(HS.CONST.compareUnits);

  const CHAR_MAP = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

  HS.Data.CHARACTERS = CHARACTERS;
  HS.Data.CHAR_MAP = CHAR_MAP;
})();
