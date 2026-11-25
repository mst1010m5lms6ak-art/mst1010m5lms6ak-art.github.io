(function () {
  'use strict';

  const HS = window.HS;

  const RACE_SYNERGY_DEFS = {
    human:   { name: '人間連帯',  b2: { desc: '攻撃+8%・防御+8%', effect: { atkPct: 0.08, defPct: 0.08 } }, b3: { desc: '攻撃+16%・防御+16%', effect: { atkPct: 0.16, defPct: 0.16 } } },
    dragon:  { name: '竜脈咆哮',  b2: { desc: '攻撃+10%・会心ダメ+14%', effect: { atkPct: 0.10, critDmg: 0.14 } }, b3: { desc: '攻撃+20%・会心ダメ+28%', effect: { atkPct: 0.20, critDmg: 0.28 } } },
    god:     { name: '神域恩寵',  b2: { desc: '与回復+12%・耐性+15%', effect: { healOutPct: 0.12, resistPct: 0.15 } }, b3: { desc: '与回復+24%・耐性+30%', effect: { healOutPct: 0.24, resistPct: 0.30 } } },
    demon:   { name: '魔界侵蝕',  b2: { desc: '異常命中+15%・特効+12%', effect: { effHitPct: 0.15, debuffBonusDmg: 0.12 } }, b3: { desc: '異常命中+30%・特効+25%', effect: { effHitPct: 0.30, debuffBonusDmg: 0.25 } } },
    fairy:   { name: '妖精円舞',  b2: { desc: '速度+8%・毎行動HP3%回復', effect: { spdPct: 0.08, turnRegenPct: 0.03 } }, b3: { desc: '速度+15%・毎行動HP6%回復', effect: { spdPct: 0.15, turnRegenPct: 0.06 } } },
    beast:   { name: '百獣疾駆',  b2: { desc: '会心率+10%・追撃+12%', effect: { critRate: 0.10, extraHitChance: 0.12, extraHitMult: 0.50 } }, b3: { desc: '会心率+20%・追撃+24%', effect: { critRate: 0.20, extraHitChance: 0.24, extraHitMult: 0.55 } } },
    machine: { name: '機甲同期',  b2: { desc: '防御+12%・開幕障壁10%', effect: { defPct: 0.12, waveShieldPct: 0.10 } }, b3: { desc: '防御+24%・開幕障壁20%', effect: { defPct: 0.24, waveShieldPct: 0.20 } } }
  };

  function addEffects(target, eff) {
    if (!eff || typeof eff !== 'object') return;
    for (const [k, v] of Object.entries(eff)) {
      if (typeof v === 'boolean') {
        target[k] = target[k] || v;
      } else if (typeof v === 'number') {
        if (k === 'extraHitMult' || k === 'revivePct') {
          target[k] = Math.max(target[k] || 0, v);
        } else if (k === 'rampMax') {
          target[k] = Math.max(target[k] || 0, v);
        } else {
          target[k] = (target[k] || 0) + v;
        }
      }
    }
  }

  function computePartySynergies(frontIds, reserveIds) {
    const frontChars = (frontIds || []).map((id) => HS.Data.CHAR_MAP[id]).filter(Boolean);
    const reserveChars = (reserveIds || []).map((id) => HS.Data.CHAR_MAP[id]).filter(Boolean);
    const allChars = [...frontChars, ...reserveChars];

    const synergies = [];
    const totalEffect = {};

    // Element counts (Front + Reserve)
    const elCounts = {};
    for (const c of allChars) elCounts[c.element] = (elCounts[c.element] || 0) + 1;
    for (const [elId, cnt] of Object.entries(elCounts)) {
      const m = HS.CONST.EL_MAP[elId];
      if (!m) continue;
      if (cnt >= 4) {
        const ef = { atkPct: 0.18, hpPct: 0.16, spdPct: 0.08 };
        synergies.push({ label: `${m.icon}${m.name}極共鳴(${cnt})`, desc: 'HP+16%・攻+18%・速+8%', effect: ef });
        addEffects(totalEffect, ef);
      } else if (cnt >= 2) {
        const ef = { atkPct: 0.09, hpPct: 0.08 };
        synergies.push({ label: `${m.icon}${m.name}共鳴(${cnt})`, desc: 'HP+8%・攻+9%', effect: ef });
        addEffects(totalEffect, ef);
      }
    }

    // 4-distinct elements on Frontline
    const frontElSet = new Set(frontChars.map((c) => c.element));
    if (frontChars.length === 4 && frontElSet.size === 4) {
      const ef = { hpPct: 0.10, atkPct: 0.10, defPct: 0.10, spdPct: 0.07 };
      synergies.push({ label: '✦多界調和(4属性)', desc: 'HP/攻/防+10%・速+7%', effect: ef });
      addEffects(totalEffect, ef);
    }

    // Race counts (Dual-race contributes to BOTH races!)
    const raceCounts = {};
    for (const c of allChars) {
      for (const r of c.races) {
        raceCounts[r] = (raceCounts[r] || 0) + 1;
      }
    }
    for (const [raceId, cnt] of Object.entries(raceCounts)) {
      const def = RACE_SYNERGY_DEFS[raceId];
      if (!def) continue;
      if (cnt >= 3) {
        synergies.push({ label: `${HS.CONST.RACE_MAP[raceId].icon}${def.name}Ⅱ(${cnt})`, desc: def.b3.desc, effect: def.b3.effect });
        addEffects(totalEffect, def.b3.effect);
      } else if (cnt >= 2) {
        synergies.push({ label: `${HS.CONST.RACE_MAP[raceId].icon}${def.name}Ⅰ(${cnt})`, desc: def.b2.desc, effect: def.b2.effect });
        addEffects(totalEffect, def.b2.effect);
      }
    }

    // Role synergies (evaluated on Frontline)
    const roleCounts = { tank: 0, dealer: 0, supporter: 0, healer: 0 };
    for (const c of frontChars) roleCounts[c.role] = (roleCounts[c.role] || 0) + 1;
    if (roleCounts.tank >= 1 && roleCounts.dealer >= 1 && roleCounts.supporter >= 1 && roleCounts.healer >= 1) {
      const ef = { hpPct: 0.12, atkPct: 0.12, defPct: 0.12, healOutPct: 0.12 };
      synergies.push({ label: '❖四位一体', desc: 'HP/攻/防/与回復+12%', effect: ef });
      addEffects(totalEffect, ef);
    } else {
      if (roleCounts.tank >= 2) {
        const ef = { defPct: 0.16, dmgTakenMult: -0.07 };
        synergies.push({ label: '🛡️鉄壁双盾', desc: '防御+16%・被ダメ-7%', effect: ef });
        addEffects(totalEffect, ef);
      }
      if (roleCounts.dealer >= 2) {
        const ef = { atkPct: 0.14, critRate: 0.08 };
        synergies.push({ label: '⚔️猛攻連陣', desc: '攻撃+14%・会心率+8%', effect: ef });
        addEffects(totalEffect, ef);
      }
      if (roleCounts.supporter >= 2) {
        const ef = { spdPct: 0.12, effHitPct: 0.18 };
        synergies.push({ label: '🔮戦術共鳴', desc: '速度+12%・異常命中+18%', effect: ef });
        addEffects(totalEffect, ef);
      }
      if (roleCounts.healer >= 2) {
        const ef = { healOutPct: 0.18, resistPct: 0.20 };
        synergies.push({ label: '💚聖域二重奏', desc: '与回復+18%・耐性+20%', effect: ef });
        addEffects(totalEffect, ef);
      }
    }

    return { synergies, totalEffect };
  }

  function getEquippedSets(state, charId) {
    const prog = state.charProgress[charId];
    const counts = {};
    const items = [];
    if (!prog) return { items, activeSets: [] };

    for (const slot of ['weapon', 'armor', 'accessory', 'core']) {
      const uid = prog.equips?.[slot];
      if (!uid) continue;
      const inst = state.inventory.find((x) => x.uid === uid);
      if (!inst) continue;
      const def = HS.Data.EQUIP_ITEM_MAP[inst.itemId];
      if (!def) continue;
      items.push({ inst, def, stats: HS.Data.calcItemStats(inst.itemId, inst.quality) });
      counts[def.setId] = (counts[def.setId] || 0) + 1;
    }

    const activeSets = [];
    for (const [setId, cnt] of Object.entries(counts)) {
      const setDef = HS.Data.EQUIP_SET_MAP[setId];
      if (!setDef) continue;
      if (cnt >= 2) {
        activeSets.push({ setDef, count: cnt, tier2: true, tier4: cnt >= 4 });
      }
    }
    return { items, activeSets };
  }

  function collectCharSelfModifiers(state, charId, reserveCharId) {
    const def = HS.Data.CHAR_MAP[charId];
    const prog = state.charProgress[charId] || { abilityTier: 0, abilityChoices: [0, 0, 0, 0, 0], masteryXp: [0, 0, 0], awakening: 0, equips: {} };
    const mods = {};
    const flat = { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0 };

    // Equipment base stats + set bonuses
    const { items, activeSets } = getEquippedSets(state, charId);
    for (const entry of items) {
      for (const [k, v] of Object.entries(entry.stats)) {
        flat[k] = (flat[k] || 0) + v;
      }
    }
    for (const as of activeSets) {
      if (as.tier2) addEffects(mods, as.setDef.bonus2.effect);
      if (as.tier4) addEffects(mods, as.setDef.bonus4.effect);
    }

    // Role Abilities (unlocked tiers)
    const roleTiers = HS.Data.ROLE_ABILITIES[def.role] || [];
    for (let t = 0; t < Math.min(prog.abilityTier, roleTiers.length); t++) {
      const slotIdx = prog.abilityChoices[t] || 0;
      const ab = roleTiers[t][slotIdx];
      if (ab) addEffects(mods, ab.effect);
    }

    // Character passive skill (slot 3 if passive)
    for (const sk of def.skills) {
      if (sk.passive && sk.effect) addEffects(mods, sk.effect);
    }

    // Engraving Awakenings
    for (let a = 0; a < Math.min(prog.awakening, def.awakenings.length); a++) {
      addEffects(mods, def.awakenings[a].effect);
    }

    // Reserve Resonance Link (15% of reserve's base stats + resonance passive!)
    if (reserveCharId && HS.Data.CHAR_MAP[reserveCharId]) {
      const rDef = HS.Data.CHAR_MAP[reserveCharId];
      const rProg = state.charProgress[reserveCharId];
      const rMult = 0.15 + (rProg ? rProg.awakening * 0.03 : 0);
      flat.hp += Math.round(rDef.base.hp * rMult);
      flat.atk += Math.round(rDef.base.atk * rMult);
      flat.def += Math.round(rDef.base.def * rMult);
      flat.spd += Math.round(rDef.base.spd * rMult * 0.6);
      if (rDef.resonance?.effect) addEffects(mods, rDef.resonance.effect);
    }

    return { flat, mods, items, activeSets };
  }

  function computeUnitStats(state, charId, reserveCharId, partySynergyEff, partyAuraEff) {
    const def = HS.Data.CHAR_MAP[charId];
    const { flat, mods, items, activeSets } = collectCharSelfModifiers(state, charId, reserveCharId);
    const totalMods = {};
    addEffects(totalMods, mods);
    addEffects(totalMods, partySynergyEff);
    addEffects(totalMods, partyAuraEff);

    const maxHp = Math.round((def.base.hp + flat.hp) * (1 + (totalMods.hpPct || 0)));
    const defStat = Math.round((def.base.def + flat.def) * (1 + (totalMods.defPct || 0)));
    const atkBonusFromDef = Math.round(defStat * (totalMods.defToAtkPct || 0));
    const atk = Math.round((def.base.atk + flat.atk) * (1 + (totalMods.atkPct || 0))) + atkBonusFromDef;
    const spd = Math.max(40, Math.round((def.base.spd + flat.spd) * (1 + (totalMods.spdPct || 0))));
    const critRate = Math.min(0.95, Math.max(0.05, def.base.critRate + flat.critRate + (totalMods.critRate || 0)));
    const critDmg = Math.max(1.25, def.base.critDmg + flat.critDmg + (totalMods.critDmg || 0));

    return {
      maxHp,
      atk,
      def: defStat,
      spd,
      critRate,
      critDmg,
      mods: totalMods,
      items,
      activeSets
    };
  }

  // Build full combat-ready snapshot of the Frontline party (including cross-member party auras!)
  function buildPartyCombatSnapshots(state) {
    const frontSlots = [];
    for (let i = 0; i < 4; i++) {
      const cid = state.frontParty[i];
      if (!cid || !HS.Data.CHAR_MAP[cid]) continue;
      frontSlots.push({ slotIdx: i, charId: cid, reserveId: state.reserveLinks[i] || null });
    }

    const syn = computePartySynergies(state.frontParty, state.reserveLinks);

    // First pass: gather party-wide auras contributed by each frontline unit
    const partyAura = {};
    const enemyAura = {};
    for (const fs of frontSlots) {
      const { mods } = collectCharSelfModifiers(state, fs.charId, fs.reserveId);
      if (mods.partyHpPct) partyAura.hpPct = (partyAura.hpPct || 0) + mods.partyHpPct;
      if (mods.partyAtkPct) partyAura.atkPct = (partyAura.atkPct || 0) + mods.partyAtkPct;
      if (mods.partyDefPct) partyAura.defPct = (partyAura.defPct || 0) + mods.partyDefPct;
      if (mods.partySpdPct) partyAura.spdPct = (partyAura.spdPct || 0) + mods.partySpdPct;
      if (mods.partyCritRate) partyAura.critRate = (partyAura.critRate || 0) + mods.partyCritRate;
      if (mods.partyCritDmg) partyAura.critDmg = (partyAura.critDmg || 0) + mods.partyCritDmg;
      if (mods.partyResistPct) partyAura.resistPct = (partyAura.resistPct || 0) + mods.partyResistPct;
      if (mods.partyHealInPct) partyAura.healInPct = (partyAura.healInPct || 0) + mods.partyHealInPct;
      if (mods.partyDmgReduce) partyAura.dmgTakenMult = (partyAura.dmgTakenMult || 0) - mods.partyDmgReduce;
      if (mods.partyAoeReduce) partyAura.aoeReduce = (partyAura.aoeReduce || 0) + mods.partyAoeReduce;
      if (mods.partyShieldDr) partyAura.shieldDr = (partyAura.shieldDr || 0) + mods.partyShieldDr;
      if (mods.partyWeakBonus) partyAura.weakBonusPct = (partyAura.weakBonusPct || 0) + mods.partyWeakBonus;
      if (mods.wavePartyAtb) partyAura.startAtbPct = (partyAura.startAtbPct || 0) + mods.wavePartyAtb;
      if (mods.allyWaveShieldPct) partyAura.allyWaveShieldPct = (partyAura.allyWaveShieldPct || 0) + mods.allyWaveShieldPct;
      if (mods.wavePartyRegen) partyAura.wavePartyRegen = Math.max(partyAura.wavePartyRegen || 0, mods.wavePartyRegen);
      if (mods.regenBoostPct) partyAura.regenBoostPct = (partyAura.regenBoostPct || 0) + mods.regenBoostPct;

      if (mods.enemyAtkAura) enemyAura.atkPct = (enemyAura.atkPct || 0) + mods.enemyAtkAura;
      if (mods.enemyDefAura) enemyAura.defPct = (enemyAura.defPct || 0) + mods.enemyDefAura;
      if (mods.enemySpdAura) enemyAura.spdPct = (enemyAura.spdPct || 0) + mods.enemySpdAura;
      if (mods.enemyVulnAura) enemyAura.vulnPct = (enemyAura.vulnPct || 0) + mods.enemyVulnAura;
    }

    const units = frontSlots.map((fs) => {
      const def = HS.Data.CHAR_MAP[fs.charId];
      const prog = HS.Engine.State.getCharProgress(fs.charId);
      const calc = computeUnitStats(state, fs.charId, fs.reserveId, syn.totalEffect, partyAura);
      return {
        slotIdx: fs.slotIdx,
        charId: fs.charId,
        reserveId: fs.reserveId,
        def,
        prog,
        stats: calc
      };
    });

    return { units, synergies: syn.synergies, enemyAura };
  }

  HS.Engine.Stats = {
    computePartySynergies,
    getEquippedSets,
    computeUnitStats,
    buildPartyCombatSnapshots
  };
})();
