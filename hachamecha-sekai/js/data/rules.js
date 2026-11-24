(function () {
  'use strict';

  const Hacha = window.Hacha;

  /* ステージごとに混線する「世界法則（カオスルール）」 */
  const WORLD_RULES = {
    steam_overheat: {
      id: 'steam_overheat',
      name: '蒸気過熱界域',
      icon: '♨️',
      summary: '炎・機械の攻撃+20%、敵味方とも行動時に火傷が発生しやすい',
      mods: { boostElements: ['fire'], boostRaces: ['machine'], atkBonus: 0.20, extraBurnChance: 0.14 }
    },
    cyber_gravity: {
      id: 'cyber_gravity',
      name: '電脳重圧空間',
      icon: '🛰️',
      summary: '単体技の威力+22%、速度が高いほど与ダメージ上昇',
      mods: { singleSkillBonus: 0.22, spdScaleDmg: 0.12 }
    },
    fairy_carnival: {
      id: 'fairy_carnival',
      name: '妖精の悪戯劇場',
      icon: '🎪',
      summary: '妖精・風の速度+18%、バフ付与時の共鳴ゲージ増加+35%',
      mods: { boostElements: ['wind'], boostRaces: ['fairy'], spdBonus: 0.18, buffChainBonus: 0.35 }
    },
    dragon_cafeteria: {
      id: 'dragon_cafeteria',
      name: '竜神の大給食室',
      icon: '🍲',
      summary: '竜・獣の最大HP+22%、回復量+18%',
      mods: { boostRaces: ['dragon', 'beast'], hpBonus: 0.22, healBonus: 0.18 }
    },
    sacred_neon: {
      id: 'sacred_neon',
      name: '霓虹の神域回路',
      icon: '⛩️',
      summary: '光・闇の弱点倍率さらに+20%、全体技の威力+16%',
      mods: { boostElements: ['light', 'dark'], weakExtra: 0.20, allSkillBonus: 0.16 }
    },
    chaos_vortex: {
      id: 'chaos_vortex',
      name: '混沌の境界渦',
      icon: '🌀',
      summary: '全キャラの会心率+12%、共鳴チェイン威力+28%',
      mods: { critFlat: 0.12, chainBonus: 0.28 }
    },
    iron_bastion: {
      id: 'iron_bastion',
      name: '重装甲ギア要塞',
      icon: '🛡️',
      summary: '防御力+20%、開幕に味方全体へ障壁を展開',
      mods: { defBonus: 0.20, startShieldRatio: 0.14 }
    },
    midnight_feast: {
      id: 'midnight_feast',
      name: '真夜中の魔物屋台',
      icon: '🏮',
      summary: '魔物・闇の攻撃+20%、状態異常の継続ダメージ+30%',
      mods: { boostElements: ['dark'], boostRaces: ['monster'], atkBonus: 0.20, dotBonus: 0.30 }
    },
    aqua_resonance: {
      id: 'aqua_resonance',
      name: '蒼海クロックワーク',
      icon: '🌊',
      summary: '水・機械の防御+18%、範囲技の威力+20%',
      mods: { boostElements: ['water'], boostRaces: ['machine'], defBonus: 0.18, areaSkillBonus: 0.20 }
    },
    divine_tempo: {
      id: 'divine_tempo',
      name: '神速タイムスリップ',
      icon: '⏳',
      summary: '神・人間の速度+16%、行動順ゲージの上昇速度+12%',
      mods: { boostRaces: ['god', 'human'], spdBonus: 0.16, globalCtBoost: 0.12 }
    }
  };

  /* 世界共鳴シナジー（主力4人＋支援リンク4人の属性＆種族から発動。2種族持ちは両方加算） */
  const RESONANCES = [
    { id: 'res_human',   kind: 'race',    target: 'human',   need: 2, name: '人間連帯',     icon: '🧑', desc: '味方全体の攻撃+10%・速度+6%',     effect: { atk: 0.10, spd: 0.06 }, chainTag: '連携一斉射撃' },
    { id: 'res_dragon',  kind: 'race',    target: 'dragon',  need: 2, name: '竜脈咆哮',     icon: '🐉', desc: '味方全体の攻撃+14%・最大HP+10%',  effect: { atk: 0.14, hp: 0.10 },  chainTag: '灼熱竜息連波' },
    { id: 'res_god',     kind: 'race',    target: 'god',     need: 2, name: '神域降臨',     icon: '👑', desc: '味方全体の回復+16%・共鳴蓄積+18%', effect: { heal: 0.16, chainGain: 0.18 }, chainTag: '天界裁定光' },
    { id: 'res_monster', kind: 'race',    target: 'monster', need: 2, name: '魔宴狂騒',     icon: '👹', desc: '味方全体の会心率+10%・異常付与+15%', effect: { crit: 0.10, statusRate: 0.15 }, chainTag: '混沌百鬼夜行' },
    { id: 'res_fairy',   kind: 'race',    target: 'fairy',   need: 2, name: '妖精円舞',     icon: '🧚', desc: '味方全体の速度+12%・回避障壁付与',  effect: { spd: 0.12, shieldStart: 0.10 }, chainTag: '星屑乱舞曲' },
    { id: 'res_beast',   kind: 'race',    target: 'beast',   need: 2, name: '野性共鳴',     icon: '🐺', desc: '味方全体の攻撃+12%・会心ダメ+20%', effect: { atk: 0.12, critDmg: 0.20 }, chainTag: '猛獣牙連撃' },
    { id: 'res_machine', kind: 'race',    target: 'machine', need: 2, name: '歯車同期',     icon: '⚙️', desc: '味方全体の防御+16%・開幕障壁+12%', effect: { def: 0.16, shieldStart: 0.12 }, chainTag: '超電磁一斉掃射' },

    { id: 'res_fire',    kind: 'element', target: 'fire',    need: 2, name: '紅蓮連鎖',     icon: '🔥', desc: '味方全体の攻撃+12%・火傷付与率UP', effect: { atk: 0.12, burnBonus: 0.10 }, chainTag: '業火メテオ' },
    { id: 'res_water',   kind: 'element', target: 'water',   need: 2, name: '蒼流循環',     icon: '💧', desc: '味方全体の防御+12%・回復+12%',    effect: { def: 0.12, heal: 0.12 }, chainTag: '大瀑布アクア' },
    { id: 'res_wind',    kind: 'element', target: 'wind',    need: 2, name: '疾風交響',     icon: '🌪️', desc: '味方全体の速度+11%・会心率+6%',   effect: { spd: 0.11, crit: 0.06 }, chainTag: '蒼穹トルネード' },
    { id: 'res_light',   kind: 'element', target: 'light',   need: 2, name: '聖光輪唱',     icon: '✨', desc: '味方全体の最大HP+12%・開幕障壁+10%', effect: { hp: 0.12, shieldStart: 0.10 }, chainTag: '閃光プリズム' },
    { id: 'res_dark',    kind: 'element', target: 'dark',    need: 2, name: '深淵共鳴',     icon: '🌙', desc: '味方全体の攻撃+13%・防御貫通+10%', effect: { atk: 0.13, pen: 0.10 }, chainTag: '宵闇アビス' },
    { id: 'res_none',    kind: 'element', target: 'none',    need: 2, name: '無色調和',     icon: '⚪', desc: '味方全体の全能力+8%',              effect: { hp: 0.08, atk: 0.08, def: 0.08, spd: 0.08 }, chainTag: '白銀クロノス' },

    { id: 'res_rainbow', kind: 'unique_elements', need: 4, name: 'はちゃめちゃ混成', icon: '🌈', desc: '4属性以上混成：全能力+9%・チェイン威力+25%', effect: { hp: 0.09, atk: 0.09, def: 0.09, spd: 0.09, chainPower: 0.25 }, chainTag: '万象カオスバースト' },
    { id: 'res_multirace', kind: 'unique_races',  need: 4, name: '異種大行進',       icon: '🎭', desc: '4種族以上混成：共鳴ゲージ蓄積+22%・攻撃+8%', effect: { atk: 0.08, chainGain: 0.22 }, chainTag: '異界パレード' }
  ];

  /* 戦闘回数連動の異界派遣ミッション（リアル時間待ち一切なし） */
  const DISPATCH_MISSIONS = [
    {
      id: 'disp_crystals',
      name: '結晶鉱山の調査隊',
      icon: '💎',
      needBattles: 3,
      minChars: 1,
      maxChars: 3,
      preferredRaces: ['machine', 'human', 'dragon'],
      rewardDesc: 'ロール結晶×6〜12・資金',
      rewards: { coins: 420, crystals: 8, scrolls: 1, fragments: 0, gearChance: 0.15 }
    },
    {
      id: 'disp_scrolls',
      name: '古書店街の技解読',
      icon: '📜',
      needBattles: 4,
      minChars: 1,
      maxChars: 3,
      preferredRaces: ['fairy', 'god', 'human'],
      rewardDesc: '技の巻物×4〜8・資金',
      rewards: { coins: 520, crystals: 3, scrolls: 5, fragments: 0, gearChance: 0.20 }
    },
    {
      id: 'disp_gear',
      name: '蒸気鍛冶場の掘り出し',
      icon: '🎁',
      needBattles: 5,
      minChars: 1,
      maxChars: 3,
      preferredRaces: ['beast', 'monster', 'machine'],
      rewardDesc: '高品質装備確定・資金',
      rewards: { coins: 600, crystals: 4, scrolls: 2, fragments: 1, gearChance: 1.0, minQuality: 72 }
    },
    {
      id: 'disp_chaos',
      name: '境界裂け目の核片回収',
      icon: '🔮',
      needBattles: 6,
      minChars: 2,
      maxChars: 3,
      preferredRaces: ['dragon', 'god', 'monster'],
      rewardDesc: '混沌の核片×3〜5・高品質装備',
      rewards: { coins: 850, crystals: 6, scrolls: 3, fragments: 3, gearChance: 0.75, minQuality: 78 }
    }
  ];

  Hacha.data.WORLD_RULES = WORLD_RULES;
  Hacha.data.RESONANCES = RESONANCES;
  Hacha.data.DISPATCH_MISSIONS = DISPATCH_MISSIONS;
})();
