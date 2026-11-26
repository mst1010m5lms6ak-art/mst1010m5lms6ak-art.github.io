'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});
  const Data = Kairo.data || (Kairo.data = {});

  const REALMS = {
    arcadia: {
      id: 'arcadia',
      name: '剣魔界',
      worldName: 'アルカディア',
      kanji: '剣',
      code: 'ARC',
      color: '#f59e0b',
      colorSoft: 'rgba(245, 158, 11, 0.18)',
      sfx: 'slash',
      strongAgainst: 'cyber',
      weakAgainst: 'yokai',
      desc: '騎士道と古の魔導が交わる王道幻想領域。堅牢な防壁と追撃剣技に秀でる。'
    },
    cyber: {
      id: 'cyber',
      name: '電脳圏',
      worldName: 'ネオ・シオン',
      kanji: '電',
      code: 'CYB',
      color: '#06b6d4',
      colorSoft: 'rgba(6, 182, 212, 0.18)',
      sfx: 'laser',
      strongAgainst: 'steam',
      weakAgainst: 'arcadia',
      desc: '超高層電網と量子兵器が支配する近未来都市。超高速行動と高会心貫通を誇る。'
    },
    yokai: {
      id: 'yokai',
      name: '妖異郷',
      worldName: '常世ノ京',
      kanji: '妖',
      code: 'YOK',
      color: '#f43f5e',
      colorSoft: 'rgba(244, 63, 94, 0.18)',
      sfx: 'mystic',
      strongAgainst: 'arcadia',
      weakAgainst: 'steam',
      desc: '紅蓮の妖火と陰陽術が揺蕩う逢魔の都。継続呪炎と吸血継戦力に優れる。'
    },
    steam: {
      id: 'steam',
      name: '機巧都',
      worldName: 'クロノ・ギア',
      kanji: '機',
      code: 'STM',
      color: '#10b981',
      colorSoft: 'rgba(16, 185, 129, 0.18)',
      sfx: 'gear',
      strongAgainst: 'yokai',
      weakAgainst: 'cyber',
      desc: '歯車と蒸気錬金が鼓動する鉄鋼帝国。破甲と経過強化による重厚な制圧力が武器。'
    },
    astral: {
      id: 'astral',
      name: '星界域',
      worldName: 'アストラル',
      kanji: '星',
      code: 'AST',
      color: '#a855f7',
      colorSoft: 'rgba(168, 85, 247, 0.18)',
      sfx: 'cosmic',
      strongAgainst: 'astral',
      weakAgainst: null,
      desc: '星辰と虚空の神話が交差する高次天球。奥義回転と全体殲滅に特化する。'
    }
  };

  const REALM_LIST = Object.values(REALMS);

  const ROLES = {
    vanguard: { id: 'vanguard', name: '前衛', short: '盾', priority: ['hp', 'def', 'atk'] },
    striker: { id: 'striker', name: '斬撃', short: '斬', priority: ['atk', 'crit', 'cdmg'] },
    caster: { id: 'caster', name: '術師', short: '術', priority: ['atk', 'sp', 'cdmg'] },
    sniper: { id: 'sniper', name: '狙撃', short: '射', priority: ['crit', 'cdmg', 'spd'] },
    support: { id: 'support', name: '支援', short: '援', priority: ['spd', 'hp', 'sp'] }
  };

  const RARITIES = {
    R: { id: 'R', label: 'R', name: '白銀', rank: 1, color: '#94a3b8', glow: 'rgba(148,163,184,0.28)', statMult: 1.0, rate: 0.50, shardValue: 15, maxStars: 5 },
    SR: { id: 'SR', label: 'SR', name: '蒼玉', rank: 2, color: '#38bdf8', glow: 'rgba(56,189,248,0.34)', statMult: 1.18, rate: 0.35, shardValue: 25, maxStars: 6 },
    SSR: { id: 'SSR', label: 'SSR', name: '黄金', rank: 3, color: '#f59e0b', glow: 'rgba(245,158,11,0.42)', statMult: 1.38, rate: 0.12, shardValue: 40, maxStars: 6 },
    UR: { id: 'UR', label: 'UR', name: '星虹', rank: 4, color: '#e879f9', glow: 'rgba(232,121,249,0.52)', statMult: 1.62, rate: 0.03, shardValue: 60, maxStars: 6 }
  };

  const TACTICS = {
    balanced: { id: 'balanced', name: '均衡展開', desc: '攻守と回復のバランスを保ち安定周回する標準方針。' },
    assault: { id: 'assault', name: '全力殲滅', desc: '攻撃と奥義を最優先し、短期決戦と高速周回を狙う。' },
    fortress: { id: 'fortress', name: '堅守再生', desc: '回復と障壁を優先発動し、格上の高難度戦を耐え抜く。' },
    bossFocus: { id: 'bossFocus', name: '強敵集中', desc: '最も最大HPの高い敵へ火力を集中し、奥義をボスへ合わせる。' }
  };

  function getElementMultiplier(attackerRealm, defenderRealm) {
    const a = REALMS[attackerRealm];
    if (!a || !REALMS[defenderRealm]) return 1.0;
    if (attackerRealm === 'astral' || defenderRealm === 'astral') {
      return attackerRealm === defenderRealm ? 1.2 : 1.12;
    }
    if (a.strongAgainst === defenderRealm) return 1.25;
    if (a.weakAgainst === defenderRealm) return 0.85;
    return 1.0;
  }

  // Evaluate party realm synergies
  function evaluatePartySynergies(realmIds) {
    const counts = Object.create(null);
    const valid = realmIds.filter((r) => Boolean(REALMS[r]));
    for (const r of valid) counts[r] = (counts[r] || 0) + 1;
    const distinct = Object.keys(counts).length;

    const bonuses = {
      atkPct: 0,
      hpPct: 0,
      defPct: 0,
      spdPct: 0,
      critPct: 0,
      cdmgPct: 0,
      spGainPct: 0,
      startSp: 0,
      ultDmgPct: 0,
      dmgRedPct: 0,
      penPct: 0,
      regenPct: 0,
      rampAtkPct: 0
    };
    const activeList = [];

    // Mono-realm resonance
    if ((counts.arcadia || 0) >= 2) {
      const n = counts.arcadia;
      const def = n >= 4 ? 32 : n === 3 ? 22 : 14;
      const hp = n >= 4 ? 26 : n === 3 ? 16 : 10;
      bonuses.defPct += def; bonuses.hpPct += hp;
      activeList.push({ id: 'mono_arc', name: `聖剣陣[${n}]`, color: REALMS.arcadia.color, desc: `防御+${def}% / HP+${hp}%` });
    }
    if ((counts.cyber || 0) >= 2) {
      const n = counts.cyber;
      const spd = n >= 4 ? 22 : n === 3 ? 15 : 10;
      const crit = n >= 4 ? 20 : n === 3 ? 12 : 6;
      bonuses.spdPct += spd; bonuses.critPct += crit;
      activeList.push({ id: 'mono_cyb', name: `量子同期[${n}]`, color: REALMS.cyber.color, desc: `速度+${spd}% / 会心+${crit}%` });
    }
    if ((counts.yokai || 0) >= 2) {
      const n = counts.yokai;
      const atk = n >= 4 ? 30 : n === 3 ? 20 : 12;
      const regen = n >= 4 ? 5 : n === 3 ? 3 : 2;
      bonuses.atkPct += atk; bonuses.regenPct += regen;
      activeList.push({ id: 'mono_yok', name: `百鬼夜行[${n}]`, color: REALMS.yokai.color, desc: `攻撃+${atk}% / 毎行動再生+${regen}%` });
    }
    if ((counts.steam || 0) >= 2) {
      const n = counts.steam;
      const ramp = n >= 4 ? 6 : n === 3 ? 4 : 2.5;
      const pen = n >= 4 ? 20 : n === 3 ? 12 : 8;
      bonuses.rampAtkPct += ramp; bonuses.penPct += pen;
      activeList.push({ id: 'mono_stm', name: `蒸気機関[${n}]`, color: REALMS.steam.color, desc: `行動毎攻撃+${ramp}% / 貫通+${pen}%` });
    }
    if ((counts.astral || 0) >= 2) {
      const n = counts.astral;
      const ult = n >= 4 ? 42 : n === 3 ? 28 : 16;
      const sp = n >= 4 ? 35 : n === 3 ? 20 : 12;
      bonuses.ultDmgPct += ult; bonuses.startSp += sp;
      activeList.push({ id: 'mono_ast', name: `星辰共鳴[${n}]`, color: REALMS.astral.color, desc: `奥義+${ult}% / 開幕SP+${sp}` });
    }

    // Multiverse crossover resonance
    if (distinct >= 4) {
      bonuses.atkPct += 22; bonuses.hpPct += 22; bonuses.defPct += 18;
      bonuses.startSp += 30; bonuses.dmgRedPct += 10;
      activeList.push({ id: 'cross_4', name: '境界交錯【四界】', color: '#e879f9', desc: '全能力+22% / 開幕SP+30 / 被ダメ-10%' });
    } else if (distinct === 3) {
      bonuses.atkPct += 12; bonuses.hpPct += 12; bonuses.spGainPct += 15;
      activeList.push({ id: 'cross_3', name: '異界共鳴【三界】', color: '#38bdf8', desc: '攻HP+12% / SP獲得+15%' });
    }

    // Pair cross synergies
    if (counts.arcadia && counts.cyber) {
      bonuses.atkPct += 12; bonuses.penPct += 10;
      activeList.push({ id: 'pair_ac', name: '魔導義体', color: '#fbbf24', desc: '剣×電：攻撃+12% / 貫通+10%' });
    }
    if (counts.yokai && counts.steam) {
      bonuses.cdmgPct += 22; bonuses.penPct += 10;
      activeList.push({ id: 'pair_ys', name: '絡繰百鬼', color: '#34d399', desc: '妖×機：会心ダメ+22% / 貫通+10%' });
    }
    if (counts.arcadia && counts.yokai) {
      bonuses.hpPct += 15; bonuses.regenPct += 3;
      activeList.push({ id: 'pair_ay', name: '神魔習合', color: '#fb7185', desc: '剣×妖：HP+15% / 再生+3%' });
    }
    if (counts.cyber && counts.astral) {
      bonuses.ultDmgPct += 22; bonuses.spdPct += 8;
      activeList.push({ id: 'pair_ca', name: '量子天測', color: '#c084fc', desc: '電×星：奥義+22% / 速度+8%' });
    }
    if (counts.steam && counts.astral) {
      bonuses.rampAtkPct += 3; bonuses.defPct += 14;
      activeList.push({ id: 'pair_sa', name: '天体歯車', color: '#2dd4bf', desc: '機×星：経過攻撃+3% / 防御+14%' });
    }

    return { bonuses, activeList, counts, distinct };
  }

  Data.REALMS = REALMS;
  Data.REALM_LIST = REALM_LIST;
  Data.ROLES = ROLES;
  Data.RARITIES = RARITIES;
  Data.TACTICS = TACTICS;
  Data.getElementMultiplier = getElementMultiplier;
  Data.evaluatePartySynergies = evaluatePartySynergies;
})(window);
