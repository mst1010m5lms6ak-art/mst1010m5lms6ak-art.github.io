(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  const NAME_PREFIXES = {
    N: ["欠けた", "鉄の", "古びた", "粗製の"],
    R: ["鋭利な", "蒼鋼の", "魔導の", "疾風の"],
    SR: ["狂乱の", "竜鱗の", "星辰の", "深淵の"],
    SSR: ["創世の", "天穹の", "終焉の", "神威の"],
    CHAOS: ["はちゃめちゃ", "虚無崩壊", "次元歪曲", "無限混沌"]
  };

  const SLOT_NOUNS = {
    weapon: ["大剣", "魔杖", "双刃", "粒子砲", "戦槌"],
    armor: ["装甲", "法衣", "竜鎧", "障壁膜", "外殻"],
    relic: ["コア", "歯車", "宝珠", "サイコロ", "王冠"]
  };

  const SUB_OP_POOL = [
    { key: "atkPct",   label: "攻撃%",   min: 4,  max: 14, unit: "%" },
    { key: "hpPct",    label: "HP%",     min: 5,  max: 16, unit: "%" },
    { key: "defPct",   label: "防御%",   min: 5,  max: 16, unit: "%" },
    { key: "spdAdd",   label: "速度",    min: 3,  max: 11, unit: "" },
    { key: "critAdd",  label: "会心率",  min: 3,  max: 11, unit: "%" },
    { key: "cdmgAdd",  label: "会心威",  min: 6,  max: 20, unit: "%" },
    { key: "healPct",  label: "回復効",  min: 5,  max: 18, unit: "%" },
    { key: "vampAdd",  label: "吸血",    min: 2,  max: 8,  unit: "%" },
    { key: "chaosPct", label: "混沌効",  min: 5,  max: 18, unit: "%" }
  ];

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function rollRarity(minTier) {
    const r = Math.random() * 100;
    const t = minTier || 0;
    let idx = 0;
    if (r < 3.5 + t * 2.2) idx = 4;       // CHAOS
    else if (r < 14 + t * 5.5) idx = 3;   // SSR
    else if (r < 36 + t * 8.5) idx = 2;   // SR
    else if (r < 68 + t * 6.0) idx = 1;   // R
    else idx = 0;                         // N
    idx = Math.max(t >= 3 ? 2 : t >= 2 ? 1 : 0, Math.min(4, idx));
    return HS.CONST.RARITIES[idx];
  }

  function generateEquip(minTier, stageScale) {
    const rar = rollRarity(minTier);
    const slots = ["weapon", "armor", "relic"];
    const slot = slots[randInt(0, slots.length - 1)];
    const prefixes = NAME_PREFIXES[rar.id];
    const nouns = SLOT_NOUNS[slot];
    const name = prefixes[randInt(0, prefixes.length - 1)] + nouns[randInt(0, nouns.length - 1)];

    const scaleFactor = 1 + (stageScale || 1) * 0.12;
    let mainStat = { key: "atk", label: "攻撃", val: 0 };
    if (slot === "weapon") {
      mainStat = { key: "atk", label: "攻撃", val: Math.round((24 + randInt(0, 10)) * rar.mult * scaleFactor) };
    } else if (slot === "armor") {
      mainStat = Math.random() < 0.5
        ? { key: "hp", label: "HP", val: Math.round((160 + randInt(0, 55)) * rar.mult * scaleFactor) }
        : { key: "def", label: "防御", val: Math.round((22 + randInt(0, 9)) * rar.mult * scaleFactor) };
    } else {
      const pick = randInt(0, 2);
      if (pick === 0) mainStat = { key: "spd", label: "速度", val: Math.round((7 + randInt(0, 4)) * (0.85 + rar.order * 0.25)) };
      else if (pick === 1) mainStat = { key: "atk", label: "攻撃", val: Math.round((18 + randInt(0, 8)) * rar.mult * scaleFactor) };
      else mainStat = { key: "hp", label: "HP", val: Math.round((140 + randInt(0, 45)) * rar.mult * scaleFactor) };
    }

    const used = new Set();
    const subs = [];
    for (let i = 0; i < rar.ops; i++) {
      let cand = SUB_OP_POOL[randInt(0, SUB_OP_POOL.length - 1)];
      let tries = 0;
      while (used.has(cand.key) && tries < 10) {
        cand = SUB_OP_POOL[randInt(0, SUB_OP_POOL.length - 1)];
        tries++;
      }
      used.add(cand.key);
      const v = Math.round(randInt(cand.min, cand.max) * (0.75 + rar.order * 0.22));
      subs.push({ key: cand.key, label: cand.label, val: v, unit: cand.unit });
    }

    return {
      uid: "eq_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
      name,
      slot,
      rarity: rar.id,
      level: 0,
      locked: rar.order >= 3, // SSR and CHAOS auto-protected
      main: mainStat,
      subs
    };
  }

  function getEquipMainValue(eq) {
    return Math.round(eq.main.val * (1 + eq.level * 0.14));
  }

  function getUpgradeCost(eq) {
    const rar = HS.CONST.RARITY_MAP[eq.rarity] || HS.CONST.RARITIES[0];
    return Math.round((90 + eq.level * 75) * (1 + rar.order * 0.35));
  }

  function getSellValue(eq) {
    const rar = HS.CONST.RARITY_MAP[eq.rarity] || HS.CONST.RARITIES[0];
    return Math.round(rar.sell * (1 + eq.level * 0.25));
  }

  function isEquippedBy(save, uid) {
    for (const cid of Object.keys(save.equipsByChar)) {
      const m = save.equipsByChar[cid];
      if (!m) continue;
      if (m.weapon === uid || m.armor === uid || m.relic === uid) return cid;
    }
    return null;
  }

  function shouldAutoSell(eq, save) {
    const maxOrder = save.settings.autoSellMaxOrder; // -1 = OFF, 0 = N, 1 = R, 2 = SR, 3 = SSR
    if (maxOrder < 0) return false;
    if (eq.locked) return false;
    const rar = HS.CONST.RARITY_MAP[eq.rarity];
    return rar && rar.order <= maxOrder;
  }

  function calcCharStats(charId, save) {
    const def = HS.CHARS.get(charId);
    if (!def) return null;
    const prog = save.chars[charId] || { unlocked: false, level: 1, limitBreak: 0, exUnlocked: false, exLevel: 0 };
    const lvScale = 1 + (prog.level - 1) * 0.095 + prog.limitBreak * 0.22;

    let hp = def.base.hp * lvScale;
    let atk = def.base.atk * lvScale;
    let defStat = def.base.def * lvScale;
    let spd = def.base.spd + Math.floor((prog.level - 1) * 0.45) + prog.limitBreak * 3;
    let crit = def.base.crit + prog.limitBreak * 2;
    let cdmg = 150 + (def.role === "dealer" ? 25 : 0);
    let healPct = 0;
    let vampAdd = 0;
    let chaosPct = 0;

    let hpPct = 0;
    let atkPct = 0;
    let defPct = 0;

    const eqMap = save.equipsByChar[charId] || {};
    ["weapon", "armor", "relic"].forEach((slot) => {
      const uid = eqMap[slot];
      if (!uid) return;
      const eq = save.inventory.find((i) => i.uid === uid);
      if (!eq) return;
      const mv = getEquipMainValue(eq);
      if (eq.main.key === "atk") atk += mv;
      else if (eq.main.key === "hp") hp += mv;
      else if (eq.main.key === "def") defStat += mv;
      else if (eq.main.key === "spd") spd += mv;

      eq.subs.forEach((s) => {
        if (s.key === "atkPct") atkPct += s.val;
        else if (s.key === "hpPct") hpPct += s.val;
        else if (s.key === "defPct") defPct += s.val;
        else if (s.key === "spdAdd") spd += s.val;
        else if (s.key === "critAdd") crit += s.val;
        else if (s.key === "cdmgAdd") cdmg += s.val;
        else if (s.key === "healPct") healPct += s.val;
        else if (s.key === "vampAdd") vampAdd += s.val;
        else if (s.key === "chaosPct") chaosPct += s.val;
      });
    });

    // Exclusive weapon stats
    if (prog.exUnlocked && def.exWeapon) {
      const ex = def.exWeapon;
      const exMult = 1 + prog.exLevel * 0.18;
      if (ex.hpPct) hpPct += Math.round(ex.hpPct * exMult);
      if (ex.atkPct) atkPct += Math.round(ex.atkPct * exMult);
      if (ex.defPct) defPct += Math.round(ex.defPct * exMult);
      if (ex.spdAdd) spd += Math.round(ex.spdAdd * exMult);
      if (ex.critAdd) crit += Math.round(ex.critAdd * exMult);
      if (ex.healPct) healPct += Math.round(ex.healPct * exMult);
    }

    hp = Math.round(hp * (1 + hpPct / 100));
    atk = Math.round(atk * (1 + atkPct / 100));
    defStat = Math.round(defStat * (1 + defPct / 100));
    spd = Math.round(spd);
    crit = Math.min(100, Math.round(crit));

    const power = Math.round(hp * 0.34 + atk * 3.8 + defStat * 2.5 + spd * 4.5 + crit * 8 + (prog.exUnlocked ? 420 : 0));

    return {
      hp,
      atk,
      def: defStat,
      spd,
      crit,
      cdmg,
      healPct,
      vampAdd,
      chaosPct,
      power,
      level: prog.level,
      limitBreak: prog.limitBreak,
      exUnlocked: prog.exUnlocked,
      exLevel: prog.exLevel
    };
  }

  function calcPartyPower(save) {
    return save.party.reduce((sum, cid) => {
      if (!cid) return sum;
      const st = calcCharStats(cid, save);
      return sum + (st ? st.power : 0);
    }, 0);
  }

  HS.EQUIP = {
    generateEquip,
    getEquipMainValue,
    getUpgradeCost,
    getSellValue,
    isEquippedBy,
    shouldAutoSell,
    calcCharStats,
    calcPartyPower
  };
})(window);
