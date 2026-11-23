/* ==========================================================================
   equipment.js - ハクスラ装備生成・付加効果・強化・自動売却ルール判定
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  const PREFIXES = {
    N:     ['古びた', '試作の', '街角の'],
    R:     ['上質な', '輝ける', '疾風の'],
    SR:    ['魔導の', '竜鱗の', '星屑の'],
    SSR:   ['神域の', '超次元の', '覇王の'],
    CHAOS: ['はちゃめちゃ', '特異点の', '創世混沌']
  };

  const SLOT_BASES = {
    weapon:    { mainStat: 'atk', mainLabel: 'ATK', names: ['ブレード', 'キャノン', 'スタッフ', 'ハンマー', 'エッジ'] },
    armor:     { mainStat: 'hp',  mainLabel: 'HP',  names: ['メイル', 'コート', 'バリア装甲', 'マント', 'ジャケット'] },
    accessory: { mainStat: 'spd', mainLabel: 'SPD', names: ['リング', 'クロック', 'チャーム', 'コアモジュール', 'バッジ'] }
  };

  const AFFIX_POOL = [
    { type: 'atkPct',    label: 'ATK',      unit: '%', min: 4,  max: 14 },
    { type: 'hpPct',     label: 'HP',       unit: '%', min: 5,  max: 16 },
    { type: 'defPct',    label: 'DEF',      unit: '%', min: 5,  max: 16 },
    { type: 'spd',       label: 'SPD',      unit: '',  min: 3,  max: 11 },
    { type: 'crit',      label: '会心率',    unit: '%', min: 3,  max: 10 },
    { type: 'cdmg',      label: '会心ダメ',  unit: '%', min: 8,  max: 24 },
    { type: 'healPct',   label: '回復量',    unit: '%', min: 5,  max: 16 },
    { type: 'dmgRed',    label: '被ダメ軽減', unit: '%', min: 3,  max: 9 },
    { type: 'lifesteal', label: '吸血',      unit: '%', min: 2,  max: 7 },
    { type: 'chaosGain', label: '混沌蓄積',  unit: '%', min: 6,  max: 20 },
    { type: 'attrDmg',   label: '属性強化',  unit: '%', min: 5,  max: 16 }
  ];

  const AFFIX_MAP = Object.fromEntries(AFFIX_POOL.map((a) => [a.type, a]));

  let uidCounter = 1;

  function rollRarity(rarityBias) {
    const b = Number(rarityBias || 0.5);
    const r = Math.random() * 100;
    const chaosChance = Math.min(18, Math.max(0.6, b * 2.6));
    const ssrChance = Math.min(34, Math.max(4, b * 8.5));
    const srChance = Math.min(42, Math.max(14, b * 14));
    const rChance = 32;
    if (r < chaosChance) return 'CHAOS';
    if (r < chaosChance + ssrChance) return 'SSR';
    if (r < chaosChance + ssrChance + srChance) return 'SR';
    if (r < chaosChance + ssrChance + srChance + rChance) return 'R';
    return 'N';
  }

  function generateEquipment(stagePower, rarityBias) {
    const { rand, randInt, pick } = HS.UTIL;
    const rarity = rollRarity(rarityBias);
    const rDef = HS.CONST.RARITY_MAP[rarity];
    const slot = pick(['weapon', 'armor', 'accessory']);
    const sDef = SLOT_BASES[slot];

    const tierScale = Math.pow(Math.max(1, (stagePower || 1500) / 1400), 0.58);
    let mainVal = 10;
    if (slot === 'weapon') mainVal = Math.round(18 * rDef.mult * tierScale * rand(0.92, 1.12));
    else if (slot === 'armor') mainVal = Math.round(92 * rDef.mult * tierScale * rand(0.92, 1.12));
    else mainVal = Math.round(5 * Math.pow(rDef.mult, 0.72) * Math.pow(tierScale, 0.42) * rand(0.92, 1.12));

    const used = new Set();
    const affixes = [];
    for (let i = 0; i < rDef.affixCount; i++) {
      let cand = pick(AFFIX_POOL);
      let guard = 0;
      while (used.has(cand.type) && guard++ < 15) cand = pick(AFFIX_POOL);
      used.add(cand.type);
      const val = Math.max(1, Math.round(rand(cand.min, cand.max) * (0.72 + rDef.idx * 0.22)));
      affixes.push({ type: cand.type, val });
    }

    const item = {
      id: `eq_${Date.now().toString(36)}_${(uidCounter++).toString(36)}_${randInt(10, 99)}`,
      name: `${pick(PREFIXES[rarity])}${pick(sDef.names)}`,
      slot,
      rarity,
      mainStat: sDef.mainStat,
      mainVal: Math.max(1, mainVal),
      affixes,
      enhance: 0,
      locked: rarity === 'CHAOS',
      equippedBy: null
    };
    item.score = calcEquipScore(item);
    return item;
  }

  function calcEquipScore(item) {
    const rDef = HS.CONST.RARITY_MAP[item.rarity] || HS.CONST.RARITIES[0];
    const enh = 1 + (item.enhance || 0) * 0.12;
    let base = item.mainVal * enh;
    if (item.mainStat === 'weapon' || item.mainStat === 'atk') base *= 2.8;
    else if (item.mainStat === 'hp') base *= 0.45;
    else if (item.mainStat === 'spd') base *= 12;
    let afScore = 0;
    for (const af of item.affixes || []) afScore += af.val * 8;
    return Math.round(base + afScore + rDef.idx * 90);
  }

  function getEnhanceCost(item) {
    const rIdx = HS.CONST.RARITY_MAP[item.rarity]?.idx || 0;
    const lv = item.enhance || 0;
    return {
      gold: Math.round((120 + lv * 140) * (1 + rIdx * 0.45)),
      dust: Math.round((4 + lv * 5) * (1 + rIdx * 0.35))
    };
  }

  function getSellValue(item) {
    const rDef = HS.CONST.RARITY_MAP[item.rarity] || HS.CONST.RARITIES[0];
    const bonus = 1 + (item.enhance || 0) * 0.25;
    return {
      gold: Math.round(rDef.sellGold * bonus),
      dust: Math.round(rDef.sellDust * bonus)
    };
  }

  /**
   * 自動売却ルール判定
   * maxRarity: 'N' | 'R' | 'SR' | 'SSR' (これ以下のレアリティを自動売却)
   */
  function shouldAutoSell(item, rule) {
    if (!rule || !rule.enabled) return false;
    if (item.locked || item.equippedBy) return false;
    const itemIdx = HS.CONST.RARITY_MAP[item.rarity]?.idx ?? 0;
    const maxIdx = HS.CONST.RARITY_MAP[rule.maxRarity]?.idx ?? 0;
    if (itemIdx > maxIdx) return false;
    if (rule.keepHighScore && item.score >= (rule.keepScoreThreshold || 900)) return false;
    return true;
  }

  function formatAffix(af, enhance) {
    const def = AFFIX_MAP[af.type];
    if (!def) return '';
    const v = Math.round(af.val * (1 + (enhance || 0) * 0.05) * 10) / 10;
    return `${def.label}+${v}${def.unit}`;
  }

  HS.EQUIP = {
    SLOT_BASES,
    AFFIX_POOL,
    AFFIX_MAP,
    generateEquipment,
    calcEquipScore,
    getEnhanceCost,
    getSellValue,
    shouldAutoSell,
    formatAffix
  };
})(window);
