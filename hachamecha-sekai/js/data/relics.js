'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});
  const Data = Kairo.data || (Kairo.data = {});

  const RELIC_SLOTS = {
    weapon: { id: 'weapon', name: '兵器核', short: '兵', mainStats: ['atkPct', 'atkFlat', 'critPct'] },
    armor: { id: 'armor', name: '防壁枠', short: '壁', mainStats: ['hpPct', 'defPct', 'hpFlat'] },
    memory: { id: 'memory', name: '記憶片', short: '記', mainStats: ['cdmgPct', 'atkPct', 'spGainPct'] },
    ring: { id: 'ring', name: '共鳴環', short: '環', mainStats: ['spdFlat', 'critPct', 'hpPct', 'atkPct'] }
  };

  const RELIC_SLOT_LIST = Object.values(RELIC_SLOTS);

  const RELIC_RARITIES = {
    1: { rank: 1, id: 'common', name: '白銀', color: '#94a3b8', subs: 1, mult: 1.0, salvageDust: 12, maxLv: 9 },
    2: { rank: 2, id: 'magic', name: '蒼玉', color: '#38bdf8', subs: 2, mult: 1.28, salvageDust: 26, maxLv: 12 },
    3: { rank: 3, id: 'rare', name: '紫晶', color: '#c084fc', subs: 3, mult: 1.62, salvageDust: 55, maxLv: 15 },
    4: { rank: 4, id: 'legend', name: '黄金', color: '#f59e0b', subs: 4, mult: 2.05, salvageDust: 120, maxLv: 15 },
    5: { rank: 5, id: 'mythic', name: '星虹', color: '#e879f9', subs: 4, mult: 2.55, salvageDust: 260, maxLv: 15 }
  };

  const RELIC_SETS = {
    sky_blade: {
      id: 'sky_blade', name: '蒼穹の剣聖', color: '#f59e0b',
      two: { desc: '攻撃+15%', stat: { atkPct: 15 } },
      four: { desc: '会心ダメ+35% / 貫通+12%', stat: { cdmgPct: 35, penPct: 12 } }
    },
    quantum_overdrive: {
      id: 'quantum_overdrive', name: '量子過負荷', color: '#06b6d4',
      two: { desc: '会心率+12%', stat: { critPct: 12 } },
      four: { desc: '速度+14% / 会心ダメ+30%', stat: { spdPct: 14, cdmgPct: 30 } }
    },
    crimson_pact: {
      id: 'crimson_pact', name: '妖炎の契約', color: '#f43f5e',
      two: { desc: '攻撃+12% / 吸血+6%', stat: { atkPct: 12, lifesteal: 0.06 } },
      four: { desc: '与ダメ+22% / 吸血+10%', stat: { dmgPct: 22, lifesteal: 0.10 } }
    },
    eternal_gear: {
      id: 'eternal_gear', name: '永劫歯車', color: '#10b981',
      two: { desc: '防御+18%', stat: { defPct: 18 } },
      four: { desc: '行動毎に攻撃+6%(最大8層) / 貫通+10%', stat: { rampSelf: 6, penPct: 10 } }
    },
    astral_echo: {
      id: 'astral_echo', name: '星界の残響', color: '#a855f7',
      two: { desc: 'SP効率+18%', stat: { spGainPct: 18 } },
      four: { desc: '開幕SP+30 / 奥義ダメ+32%', stat: { startSp: 30, ultPct: 32 } }
    },
    iron_bastion: {
      id: 'iron_bastion', name: '不落城塞', color: '#64748b',
      two: { desc: '最大HP+18%', stat: { hpPct: 18 } },
      four: { desc: '被ダメ-15% / 毎行動HP+5%再生', stat: { dmgRed: 15, regenSelf: 5 } }
    },
    swift_gale: {
      id: 'swift_gale', name: '疾風迅雷', color: '#38bdf8',
      two: { desc: '速度+10%', stat: { spdPct: 10 } },
      four: { desc: '速度+15% / SP効率+15%', stat: { spdPct: 15, spGainPct: 15 } }
    },
    cross_fusion: {
      id: 'cross_fusion', name: '境界融合', color: '#e879f9',
      two: { desc: '全基礎ステ+10%', stat: { atkPct: 10, hpPct: 10, defPct: 10 } },
      four: { desc: '攻撃+18% / 会心+10% / 奥義+22%', stat: { atkPct: 18, critPct: 10, ultPct: 22 } }
    }
  };

  const RELIC_SET_LIST = Object.values(RELIC_SETS);

  const STAT_META = {
    atkFlat: { id: 'atkFlat', name: '攻撃力', suffix: '', baseMain: 22, growMain: 6.5, subMin: 8, subMax: 24 },
    atkPct: { id: 'atkPct', name: '攻撃力%', suffix: '%', baseMain: 7, growMain: 2.2, subMin: 2.5, subMax: 7.5 },
    hpFlat: { id: 'hpFlat', name: '最大HP', suffix: '', baseMain: 160, growMain: 45, subMin: 60, subMax: 180 },
    hpPct: { id: 'hpPct', name: '最大HP%', suffix: '%', baseMain: 8, growMain: 2.4, subMin: 3, subMax: 8.5 },
    defPct: { id: 'defPct', name: '防御力%', suffix: '%', baseMain: 8, growMain: 2.4, subMin: 3, subMax: 8.5 },
    spdFlat: { id: 'spdFlat', name: '速度', suffix: '', baseMain: 5, growMain: 1.4, subMin: 2, subMax: 6 },
    critPct: { id: 'critPct', name: '会心率', suffix: '%', baseMain: 5, growMain: 1.5, subMin: 2, subMax: 6 },
    cdmgPct: { id: 'cdmgPct', name: '会心ダメ', suffix: '%', baseMain: 10, growMain: 3.1, subMin: 4, subMax: 12 },
    spGainPct: { id: 'spGainPct', name: 'SP効率', suffix: '%', baseMain: 6, growMain: 1.8, subMin: 2.5, subMax: 7 }
  };

  const SUB_STAT_POOL = ['atkPct', 'hpPct', 'defPct', 'spdFlat', 'critPct', 'cdmgPct', 'spGainPct', 'atkFlat'];

  function formatStatValue(statId, val) {
    const m = STAT_META[statId];
    if (!m) return String(Math.round(val));
    if (m.suffix === '%') return `+${Number(val).toFixed(1)}%`;
    return `+${Math.round(val)}`;
  }

  function rollSubStat(tier, rarityRank, excludeSet) {
    const candidates = SUB_STAT_POOL.filter((s) => !excludeSet.has(s));
    const statId = candidates[Math.floor(Math.random() * candidates.length)] || 'atkPct';
    const meta = STAT_META[statId];
    const rollRatio = Math.random(); // 0..1 determines quality C/B/A/S
    const tierMult = 0.8 + tier * 0.16 + rarityRank * 0.12;
    const rawVal = (meta.subMin + (meta.subMax - meta.subMin) * rollRatio) * tierMult;
    const val = meta.suffix === '%' ? Math.round(rawVal * 10) / 10 : Math.max(1, Math.round(rawVal));
    const grade = rollRatio >= 0.85 ? 'S' : rollRatio >= 0.58 ? 'A' : rollRatio >= 0.28 ? 'B' : 'C';
    return { stat: statId, val, grade, rolls: 1 };
  }

  function rollRelicRarity(tier, minRank) {
    const r = Math.random();
    let rank = 1;
    if (tier >= 5) {
      rank = r < 0.16 ? 5 : r < 0.48 ? 4 : r < 0.82 ? 3 : 2;
    } else if (tier === 4) {
      rank = r < 0.08 ? 5 : r < 0.34 ? 4 : r < 0.74 ? 3 : 2;
    } else if (tier === 3) {
      rank = r < 0.03 ? 5 : r < 0.18 ? 4 : r < 0.55 ? 3 : r < 0.88 ? 2 : 1;
    } else if (tier === 2) {
      rank = r < 0.07 ? 4 : r < 0.32 ? 3 : r < 0.72 ? 2 : 1;
    } else {
      rank = r < 0.14 ? 3 : r < 0.48 ? 2 : 1;
    }
    return Math.max(minRank || 1, Math.min(5, rank));
  }

  function generateRelic(opts) {
    const tier = Math.max(1, Math.min(5, opts.tier || 1));
    const rarityRank = opts.forceRarity || rollRelicRarity(tier, opts.minRarity || 1);
    const rMeta = RELIC_RARITIES[rarityRank];
    const setPool = Array.isArray(opts.sets) && opts.sets.length > 0 ? opts.sets : Object.keys(RELIC_SETS);
    const setId = opts.forceSet || setPool[Math.floor(Math.random() * setPool.length)];
    const slotId = opts.forceSlot || RELIC_SLOT_LIST[Math.floor(Math.random() * RELIC_SLOT_LIST.length)].id;
    const slotMeta = RELIC_SLOTS[slotId];
    const mainStat = slotMeta.mainStats[Math.floor(Math.random() * slotMeta.mainStats.length)];
    const mMeta = STAT_META[mainStat];
    const mainBase = Math.round(mMeta.baseMain * rMeta.mult * (0.85 + tier * 0.12) * 10) / 10;

    const used = new Set([mainStat]);
    const subs = [];
    for (let i = 0; i < rMeta.subs; i++) {
      const sub = rollSubStat(tier, rarityRank, used);
      used.add(sub.stat);
      subs.push(sub);
    }

    const id = 'rel_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    return {
      id,
      setId,
      slot: slotId,
      rarity: rarityRank,
      tier,
      level: 0,
      locked: rarityRank >= 5,
      equippedBy: null,
      main: { stat: mainStat, base: mainBase },
      subs
    };
  }

  function getRelicMainValue(relic) {
    const rMeta = RELIC_RARITIES[relic.rarity] || RELIC_RARITIES[1];
    const mMeta = STAT_META[relic.main.stat] || STAT_META.atkPct;
    const val = relic.main.base + relic.level * mMeta.growMain * (0.75 + rMeta.mult * 0.35);
    return mMeta.suffix === '%' ? Math.round(val * 10) / 10 : Math.round(val);
  }

  function getRelicScore(relic) {
    let score = relic.rarity * 25 + relic.tier * 12 + relic.level * 5;
    for (const s of relic.subs) {
      score += s.grade === 'S' ? 24 : s.grade === 'A' ? 16 : s.grade === 'B' ? 10 : 5;
      score += (s.rolls - 1) * 10;
    }
    return Math.round(score);
  }

  Data.RELIC_SLOTS = RELIC_SLOTS;
  Data.RELIC_SLOT_LIST = RELIC_SLOT_LIST;
  Data.RELIC_RARITIES = RELIC_RARITIES;
  Data.RELIC_SETS = RELIC_SETS;
  Data.RELIC_SET_LIST = RELIC_SET_LIST;
  Data.STAT_META = STAT_META;
  Data.formatStatValue = formatStatValue;
  Data.rollSubStat = rollSubStat;
  Data.generateRelic = generateRelic;
  Data.getRelicMainValue = getRelicMainValue;
  Data.getRelicScore = getRelicScore;
})(window);
