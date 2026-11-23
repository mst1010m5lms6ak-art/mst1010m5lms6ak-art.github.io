(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  const ELEMENTS = [
    { id: "fire",  name: "炎", order: 0, color: "#ff5247", strong: "wind",  weak: "water" },
    { id: "water", name: "水", order: 1, color: "#29b6ff", strong: "fire",  weak: "wind" },
    { id: "wind",  name: "風", order: 2, color: "#3ee68a", strong: "water", weak: "fire" },
    { id: "light", name: "光", order: 3, color: "#ffe052", strong: "dark",  weak: "dark" },
    { id: "dark",  name: "闇", order: 4, color: "#c05cff", strong: "light", weak: "light" },
    { id: "none",  name: "無", order: 5, color: "#b8c2d8", strong: null,    weak: null }
  ];

  const ELEMENT_MAP = Object.fromEntries(ELEMENTS.map((e) => [e.id, e]));

  const RACES = [
    { id: "human",   name: "人間", order: 0, color: "#60a5fa", bonusDesc: "全能力+8% / 技回転UP" },
    { id: "dragon",  name: "竜",   order: 1, color: "#f97316", bonusDesc: "攻撃+14% / 炎上追撃" },
    { id: "demon",   name: "魔物", order: 2, color: "#d946ef", bonusDesc: "会心+12% / 混沌蓄積UP" },
    { id: "fairy",   name: "妖精", order: 3, color: "#4ade80", bonusDesc: "速度+12% / 回復効力UP" },
    { id: "machine", name: "機械", order: 4, color: "#38bdf8", bonusDesc: "防御+18% / 開幕障壁" }
  ];

  const RACE_MAP = Object.fromEntries(RACES.map((r) => [r.id, r]));

  const ROLES = [
    {
      id: "tank",
      name: "タンク",
      short: "盾",
      order: 0,
      color: "#38bdf8",
      abilityName: "鉄壁の挑発",
      abilityDesc: "狙われ率上昇・開幕HP22%障壁・被弾時カオス+5"
    },
    {
      id: "dealer",
      name: "ディーラー",
      short: "剣",
      order: 1,
      color: "#ff5266",
      abilityName: "狂乱の追撃",
      abilityDesc: "会心威力+25%・撃破時行動+35%・25%確率で追撃"
    },
    {
      id: "supporter",
      name: "サポーター",
      short: "星",
      order: 2,
      color: "#c084fc",
      abilityName: "混沌の共振",
      abilityDesc: "付与バフ+1T延長・行動時に味方1体のCTを1短縮"
    },
    {
      id: "healer",
      name: "ヒーラー",
      short: "癒",
      order: 3,
      color: "#4ade80",
      abilityName: "生命の余剰",
      abilityDesc: "超過回復を障壁に変換・回復時に弱体効果を1つ浄化"
    }
  ];

  const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.id, r]));

  const RARITIES = [
    { id: "N",     name: "N",     order: 0, color: "#9ea7bd", mult: 1.0,  ops: 1, sell: 45 },
    { id: "R",     name: "R",     order: 1, color: "#4cc3ff", mult: 1.28, ops: 2, sell: 120 },
    { id: "SR",    name: "SR",    order: 2, color: "#c864ff", mult: 1.65, ops: 3, sell: 320 },
    { id: "SSR",   name: "SSR",   order: 3, color: "#ffc933", mult: 2.15, ops: 4, sell: 850 },
    { id: "CHAOS", name: "CHAOS", order: 4, color: "#ff3d9a", mult: 2.8,  ops: 4, sell: 2200 }
  ];

  const RARITY_MAP = Object.fromEntries(RARITIES.map((r) => [r.id, r]));

  const EQUIP_SLOTS = [
    { id: "weapon", name: "武器", short: "武器" },
    { id: "armor",  name: "防具", short: "防具" },
    { id: "relic",  name: "遺物", short: "遺物" }
  ];

  const CHAOS_LAWS = [
    { id: "overdrive",  name: "倍速狂乱",   desc: "全員の行動速度が1.45倍・カオス蓄積加速", color: "#00e5ff" },
    { id: "crit_storm", name: "会心嵐",     desc: "全員の会心率+45%・会心ダメージ+40%",    color: "#ff5266" },
    { id: "elem_surge", name: "属性暴走",   desc: "有利属性倍率が1.85倍に跳ね上がる",       color: "#ffc933" },
    { id: "meteor",     name: "隕石乱入",   desc: "行動ごとにランダムな敵へカオス隕石落下", color: "#ff7b54" },
    { id: "vamp_feast", name: "混沌吸血",   desc: "攻撃ダメージの22%をHPとして吸収",        color: "#d946ef" },
    { id: "void_bless", name: "無律覚醒",   desc: "無属性の与ダメージ+40%・全員CT加速",     color: "#b8c2d8" },
    { id: "reverse_hp", name: "反転祝福",   desc: "被弾時に最大HP6%の反動再生が発生",       color: "#4ade80" },
    { id: "glass_war",  name: "極限乱戦",   desc: "敵味方すべての与ダメージ+35%",           color: "#ff3d9a" }
  ];

  function getElementMult(atkEl, defEl, lawId) {
    const a = ELEMENT_MAP[atkEl] || ELEMENT_MAP.none;
    let mult = 1.0;
    let label = "normal";
    if (atkEl === "none") {
      if (lawId === "void_bless") {
        mult = 1.4;
        label = "weak";
      }
      return { mult, label };
    }
    if (a.strong === defEl) {
      mult = lawId === "elem_surge" ? 1.85 : (atkEl === "light" || atkEl === "dark" ? 1.3 : 1.35);
      label = "weak";
    } else if (a.weak === defEl && atkEl !== "light" && atkEl !== "dark") {
      mult = 0.75;
      label = "resist";
    }
    return { mult, label };
  }

  /**
   * Strict character sort:
   * 1) Element: fire -> water -> wind -> light -> dark -> none
   * 2) Race: human -> dragon -> demon -> fairy -> machine
   *    Dual-race ordering: single first, then sorted by 2nd race (e.g. human -> human+dragon -> human+demon -> ...)
   * 3) Role: tank -> dealer -> supporter -> healer
   */
  function getCharSortKey(ch) {
    const elOrder = ELEMENT_MAP[ch.element] ? ELEMENT_MAP[ch.element].order : 9;
    const r1 = RACE_MAP[ch.races[0]] ? RACE_MAP[ch.races[0]].order : 9;
    const r2 = ch.races[1] && RACE_MAP[ch.races[1]] ? RACE_MAP[ch.races[1]].order + 1 : 0;
    const roleOrder = ROLE_MAP[ch.role] ? ROLE_MAP[ch.role].order : 9;
    return elOrder * 10000 + r1 * 1000 + r2 * 100 + roleOrder * 10;
  }

  function sortCharacters(list) {
    return list.slice().sort((a, b) => {
      const ka = getCharSortKey(a);
      const kb = getCharSortKey(b);
      if (ka !== kb) return ka - kb;
      return a.id.localeCompare(b.id);
    });
  }

  function calcPartySynergies(charDefs) {
    const raceCounts = { human: 0, dragon: 0, demon: 0, fairy: 0, machine: 0 };
    const elCounts = { fire: 0, water: 0, wind: 0, light: 0, dark: 0, none: 0 };
    charDefs.forEach((c) => {
      if (!c) return;
      elCounts[c.element] = (elCounts[c.element] || 0) + 1;
      c.races.forEach((r) => {
        if (raceCounts[r] !== undefined) raceCounts[r] += 1;
      });
    });

    const active = [];
    const mods = { atkPct: 0, hpPct: 0, defPct: 0, spdPct: 0, critPct: 0, healPct: 0, chaosPct: 0, shieldPct: 0, burnOnHit: false };

    RACES.forEach((r) => {
      const n = raceCounts[r.id];
      if (n >= 2) {
        const tier = n >= 4 ? 3 : n >= 3 ? 2 : 1;
        const scale = tier === 3 ? 2.2 : tier === 2 ? 1.5 : 1.0;
        active.push({ type: "race", id: r.id, name: r.name + "×" + n, color: r.color, tier });
        if (r.id === "human") {
          mods.atkPct += Math.round(8 * scale);
          mods.hpPct += Math.round(8 * scale);
          mods.spdPct += Math.round(6 * scale);
        } else if (r.id === "dragon") {
          mods.atkPct += Math.round(14 * scale);
          mods.burnOnHit = true;
        } else if (r.id === "demon") {
          mods.critPct += Math.round(10 * scale);
          mods.chaosPct += Math.round(18 * scale);
        } else if (r.id === "fairy") {
          mods.spdPct += Math.round(12 * scale);
          mods.healPct += Math.round(14 * scale);
        } else if (r.id === "machine") {
          mods.defPct += Math.round(18 * scale);
          mods.shieldPct += Math.round(12 * scale);
        }
      }
    });

    const uniqueEls = Object.values(elCounts).filter((v) => v > 0).length;
    if (uniqueEls >= 4) {
      active.push({ type: "elem", id: "rainbow", name: "混沌四彩", color: "#ff3d9a", tier: 2 });
      mods.atkPct += 12;
      mods.chaosPct += 20;
    } else {
      ELEMENTS.forEach((e) => {
        if (elCounts[e.id] >= 3) {
          active.push({ type: "elem", id: e.id, name: e.name + "共鳴×" + elCounts[e.id], color: e.color, tier: 2 });
          mods.atkPct += 15;
          mods.hpPct += 10;
        }
      });
    }

    return { active, mods, raceCounts, elCounts };
  }

  function fmtNum(n) {
    const v = Math.round(n || 0);
    if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(2) + "M";
    if (Math.abs(v) >= 10000) return (v / 1000).toFixed(1) + "K";
    return v.toLocaleString("ja-JP");
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function raceText(races) {
    return races.map((r) => (RACE_MAP[r] ? RACE_MAP[r].name : r)).join("・");
  }

  HS.CONST = {
    ELEMENTS,
    ELEMENT_MAP,
    RACES,
    RACE_MAP,
    ROLES,
    ROLE_MAP,
    RARITIES,
    RARITY_MAP,
    EQUIP_SLOTS,
    CHAOS_LAWS,
    getElementMult,
    getCharSortKey,
    sortCharacters,
    calcPartySynergies,
    fmtNum,
    esc,
    raceText
  };
})(window);
