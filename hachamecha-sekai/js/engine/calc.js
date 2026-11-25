(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.Engine = HS.Engine || {};

  var DEFAULT_SLOTS = ['weapon', 'armor', 'accessory', 'core'];

  function clamp(v, min, max) {
    if (HS.Utils && typeof HS.Utils.clamp === 'function') return HS.Utils.clamp(v, min, max);
    return Math.max(min, Math.min(max, v));
  }

  function getCharById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.CHAR_BY_ID && HS.Data.CHAR_BY_ID[id]) return HS.Data.CHAR_BY_ID[id];
    var list = HS.Data.CHARACTERS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getEquipDefById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.EQUIP_DEF_BY_ID && HS.Data.EQUIP_DEF_BY_ID[id]) return HS.Data.EQUIP_DEF_BY_ID[id];
    var list = HS.Data.EQUIP_DEFS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getEquipSetById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.EQUIP_SET_BY_ID && HS.Data.EQUIP_SET_BY_ID[id]) return HS.Data.EQUIP_SET_BY_ID[id];
    var list = HS.Data.EQUIP_SETS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getAbilityById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.ABILITY_BY_ID && HS.Data.ABILITY_BY_ID[id]) return HS.Data.ABILITY_BY_ID[id];
    var list = HS.Data.ABILITIES || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getRelicById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.RELIC_BY_ID && HS.Data.RELIC_BY_ID[id]) return HS.Data.RELIC_BY_ID[id];
    var list = HS.Data.RELICS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // All percentage/rate modifiers strictly follow HS.Data decimal convention (e.g. 0.15 = 15%, 1.50 = 150%)
  function createEmptyModifiers() {
    return {
      hpFlat: 0, atkFlat: 0, defFlat: 0, spdFlat: 0,
      hpPct: 0, atkPct: 0, defPct: 0, spdPct: 0,
      crit: 0, critDmg: 0, res: 0,
      dmgDealtPct: 0, dmgTakenPct: 0,
      healDealtPct: 0, healTakenPct: 0,
      skillDmgPct: 0, aoeDmgPct: 0, singleDmgPct: 0,
      elementDmgPct: 0, ailmentDmgPct: 0, ailmentRate: 0, lowHpDmgPct: 0,
      initGauge: 0, startShieldPct: 0, waveHealPct: 0, turnRegenPct: 0,
      followUpRate: 0, followUpPower: 0,
      counterRate: 0, counterPower: 0,
      coverRate: 0,
      buffDuration: 0, debuffDuration: 0,
      cleanseOnHeal: 0, overhealShield: 0,
      reviveOnce: 0, gutsOnce: false,
      gaugeOnHit: 0, gaugeOnKill: 0, gaugeOnCrit: 0,
      allyStartAtkUp: 0, allyStartSpdUp: 0, enemyStartDefDown: 0,
      dropGoldPct: 0, dropQualityBonus: 0
    };
  }

  function applyMod(acc, mod, scale) {
    if (!mod || typeof mod !== 'object') return;
    var k = typeof scale === 'number' ? scale : 1;

    function add(field, val) {
      if (typeof val === 'number' && isFinite(val)) acc[field] += val * k;
    }

    add('hpFlat', mod.hpFlat || mod.hp);
    add('atkFlat', mod.atkFlat || mod.atk);
    add('defFlat', mod.defFlat || mod.def);
    add('spdFlat', mod.spdFlat || mod.spd);

    add('hpPct', mod.hpPct);
    add('atkPct', mod.atkPct);
    add('defPct', mod.defPct);
    add('spdPct', mod.spdPct);
    add('crit', mod.crit);
    add('critDmg', mod.critDmg);
    add('res', mod.res);

    add('dmgDealtPct', mod.dmgDealtPct);
    add('dmgTakenPct', mod.dmgTakenPct);
    add('healDealtPct', mod.healDealtPct);
    add('healTakenPct', mod.healTakenPct);
    add('skillDmgPct', mod.skillDmgPct);
    add('aoeDmgPct', mod.aoeDmgPct);
    add('singleDmgPct', mod.singleDmgPct);
    add('elementDmgPct', mod.elementDmgPct);
    add('ailmentDmgPct', mod.ailmentDmgPct);
    add('ailmentRate', mod.ailmentRate);
    add('lowHpDmgPct', mod.lowHpDmgPct);

    add('initGauge', mod.initGauge);
    add('startShieldPct', mod.startShieldPct);
    add('waveHealPct', mod.waveHealPct);
    add('turnRegenPct', mod.turnRegenPct);

    add('followUpRate', mod.followUpRate);
    add('followUpPower', mod.followUpPower);
    add('counterRate', mod.counterRate);
    add('counterPower', mod.counterPower);
    add('coverRate', mod.coverRate);

    if (typeof mod.buffDuration === 'number') acc.buffDuration += mod.buffDuration;
    if (typeof mod.debuffDuration === 'number') acc.debuffDuration += mod.debuffDuration;
    if (typeof mod.cleanseOnHeal === 'number') acc.cleanseOnHeal += mod.cleanseOnHeal;
    add('overhealShield', mod.overhealShield);
    if (typeof mod.reviveOnce === 'number') acc.reviveOnce = Math.max(acc.reviveOnce, mod.reviveOnce);
    if (mod.gutsOnce) acc.gutsOnce = true;

    add('gaugeOnHit', mod.gaugeOnHit);
    add('gaugeOnKill', mod.gaugeOnKill);
    add('gaugeOnCrit', mod.gaugeOnCrit);

    if (typeof mod.allyStartAtkUp === 'number') acc.allyStartAtkUp = Math.max(acc.allyStartAtkUp, mod.allyStartAtkUp);
    if (typeof mod.allyStartSpdUp === 'number') acc.allyStartSpdUp = Math.max(acc.allyStartSpdUp, mod.allyStartSpdUp);
    if (typeof mod.enemyStartDefDown === 'number') acc.enemyStartDefDown = Math.max(acc.enemyStartDefDown, mod.enemyStartDefDown);

    add('dropGoldPct', mod.dropGoldPct);
    add('dropQualityBonus', mod.dropQualityBonus);
  }

  // Quality scaling: q=1 -> 0.60x, q=99 -> 1.45x, q=100 (極) -> 1.60x
  function calcQualityMultiplier(quality) {
    if (HS.Utils && typeof HS.Utils.qualityMultiplier === 'function') {
      return HS.Utils.qualityMultiplier(quality);
    }
    var q = clamp(Math.round(Number(quality) || 1), 1, 100);
    if (q >= 100) return 1.60;
    return 0.60 + ((q - 1) / 98) * 0.85;
  }

  function calcEquipStats(defId, quality) {
    var def = getEquipDefById(defId);
    if (!def || !def.baseStats) return {};
    var mult = calcQualityMultiplier(quality);
    var out = {};
    var bs = def.baseStats;
    var keys = Object.keys(bs);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = bs[k];
      if (typeof v !== 'number') continue;
      if (k === 'hp' || k === 'atk' || k === 'def' || k === 'spd') {
        out[k] = Math.max(1, Math.round(v * mult));
      } else {
        out[k] = Math.round(v * mult * 1000) / 1000;
      }
    }
    return out;
  }

  function evaluateSynergy(syn, counts) {
    var req = syn.req || {};
    var kind = syn.kind || '';
    if (kind === 'element') return (counts.elements[req.element] || 0) >= (req.count || 2);
    if (kind === 'race') return (counts.races[req.race] || 0) >= (req.count || 2);
    if (kind === 'all_roles') return counts.distinctRoles >= (req.count || 4);
    if (kind === 'distinct_elements') return counts.distinctElements >= (req.count || 4);
    if (kind === 'distinct_races') return counts.distinctRaces >= (req.count || 5);
    if (kind === 'dual_race') return counts.dualRaceCount >= (req.count || 2);
    return false;
  }

  function getSynergyFamilyKey(syn) {
    var req = syn.req || {};
    if (syn.kind === 'element') return 'el_' + req.element;
    if (syn.kind === 'race') return 'race_' + req.race;
    if (syn.kind === 'distinct_elements') return 'distinct_elements';
    if (syn.kind === 'dual_race') return 'dual_race';
    return syn.id;
  }

  function calcPartySynergies(partyIds, linkIds) {
    var s = HS.State ? HS.State.get() : null;
    var pIds = Array.isArray(partyIds) ? partyIds : (s ? s.party : []);
    var lIds = Array.isArray(linkIds) ? linkIds : (s ? s.links : []);

    var counts = {
      elements: {},
      races: {},
      roles: {},
      worlds: {},
      dualRaceCount: 0,
      distinctElements: 0,
      distinctRaces: 0,
      distinctRoles: 0,
      distinctWorlds: 0
    };

    var seen = {};
    var combined = pIds.concat(lIds);
    var totalMembers = 0;

    for (var i = 0; i < combined.length; i++) {
      var cid = combined[i];
      if (!cid || seen[cid]) continue;
      var ch = getCharById(cid);
      if (!ch) continue;
      seen[cid] = true;
      totalMembers++;

      if (ch.element) counts.elements[ch.element] = (counts.elements[ch.element] || 0) + 1;
      if (ch.role) counts.roles[ch.role] = (counts.roles[ch.role] || 0) + 1;
      if (ch.world) counts.worlds[ch.world] = (counts.worlds[ch.world] || 0) + 1;

      var races = Array.isArray(ch.races) ? ch.races : [];
      if (races.length >= 2) counts.dualRaceCount++;
      // Dual-race characters count toward BOTH of their races!
      for (var r = 0; r < races.length; r++) {
        counts.races[races[r]] = (counts.races[races[r]] || 0) + 1;
      }
    }

    counts.distinctElements = Object.keys(counts.elements).length;
    counts.distinctRaces = Object.keys(counts.races).length;
    counts.distinctRoles = Object.keys(counts.roles).length;
    counts.distinctWorlds = Object.keys(counts.worlds).length;

    var allSyns = (HS.Data && Array.isArray(HS.Data.SYNERGIES)) ? HS.Data.SYNERGIES : [];
    var bestByFamily = {};
    var familyOrder = [];

    for (var si = 0; si < allSyns.length; si++) {
      var syn = allSyns[si];
      if (!evaluateSynergy(syn, counts)) continue;
      var fk = getSynergyFamilyKey(syn);
      var prev = bestByFamily[fk];
      var curReq = (syn.req && syn.req.count) || 1;
      var prevReq = (prev && prev.req && prev.req.count) || 0;
      if (!prev) {
        bestByFamily[fk] = syn;
        familyOrder.push(fk);
      } else if (curReq > prevReq) {
        bestByFamily[fk] = syn;
      }
    }

    var active = [];
    var bonuses = createEmptyModifiers();
    for (var fi = 0; fi < familyOrder.length; fi++) {
      var act = bestByFamily[familyOrder[fi]];
      active.push(act);
      applyMod(bonuses, act.bonus || act.mod);
    }

    return {
      active: active,
      counts: counts,
      totalMembers: totalMembers,
      bonuses: bonuses
    };
  }

  function calcLinkBonus(frontCharId, linkCharId) {
    if (!frontCharId || !linkCharId) return null;
    var front = getCharById(frontCharId);
    var link = getCharById(linkCharId);
    if (!front || !link) return null;

    var roleMeta = (HS.Data && HS.Data.ROLES_META && HS.Data.ROLES_META[link.role]) ? HS.Data.ROLES_META[link.role] : null;
    var baseBonus = (roleMeta && roleMeta.linkBonus) ? roleMeta.linkBonus : {};
    var matchMeta = (HS.Data && HS.Data.LINK_MATCH_BONUS) ? HS.Data.LINK_MATCH_BONUS : null;

    var sameElement = Boolean(front.element && link.element && front.element === link.element);
    var frontRaces = Array.isArray(front.races) ? front.races : [];
    var linkRaces = Array.isArray(link.races) ? link.races : [];
    var sharedRaces = [];
    for (var i = 0; i < frontRaces.length; i++) {
      if (linkRaces.indexOf(frontRaces[i]) !== -1) sharedRaces.push(frontRaces[i]);
    }

    var mod = createEmptyModifiers();
    applyMod(mod, baseBonus, 1);
    if (sameElement) {
      applyMod(mod, (matchMeta && matchMeta.sameElement && matchMeta.sameElement.bonus) || { hpPct: 0.05, atkPct: 0.05 });
    }
    if (sharedRaces.length > 0) {
      applyMod(mod, (matchMeta && matchMeta.sameRace && matchMeta.sameRace.bonus) || { defPct: 0.06, crit: 0.04 });
    }

    return {
      frontCharId: frontCharId,
      linkCharId: linkCharId,
      linkChar: link,
      role: link.role,
      linkName: (roleMeta && roleMeta.linkName) || '',
      linkDesc: (roleMeta && roleMeta.linkDesc) || '',
      sameElement: sameElement,
      sharedRaces: sharedRaces,
      mod: mod
    };
  }

  function resolveEquipEntry(entry, s) {
    if (!entry) return null;
    if (typeof entry === 'string') {
      var item = HS.State ? HS.State.getItem(entry) : null;
      if (!item && s && Array.isArray(s.inventory)) {
        for (var i = 0; i < s.inventory.length; i++) {
          if (s.inventory[i].uid === entry) { item = s.inventory[i]; break; }
        }
      }
      if (!item) return null;
      return { uid: item.uid, defId: item.defId, quality: item.quality, def: getEquipDefById(item.defId) };
    }
    if (typeof entry === 'object' && entry.defId) {
      return { uid: entry.uid || null, defId: entry.defId, quality: entry.quality || 50, def: getEquipDefById(entry.defId) };
    }
    return null;
  }

  function calcUnitStats(charId, opts) {
    opts = opts || {};
    var ch = getCharById(charId);
    if (!ch) return null;

    var s = HS.State ? HS.State.get() : null;
    var cp = (s && s.charProgress && s.charProgress[charId])
      ? s.charProgress[charId]
      : { skillAwaken: [0, 0, 0], resonance: 0, equip: { weapon: null, armor: null, accessory: null, core: null } };

    var bs = ch.baseStats || { hp: 1000, atk: 120, def: 90, spd: 100, crit: 0.10, critDmg: 1.50, res: 0.10 };
    var mod = createEmptyModifiers();

    // 1. Equipped Gear (quality-scaled) + 2pc/4pc Set Bonuses
    var slots = (HS.CONST && HS.CONST.SLOTS) ? HS.CONST.SLOTS : DEFAULT_SLOTS;
    var equipMap = Object.assign({}, cp.equip || {}, opts.overrideEquip || {});
    var equipFlat = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0, res: 0 };
    var setCounts = {};
    var resolvedEquip = {};

    for (var si = 0; si < slots.length; si++) {
      var slot = slots[si];
      var eq = resolveEquipEntry(equipMap[slot], s);
      resolvedEquip[slot] = eq;
      if (!eq || !eq.def) continue;
      var es = calcEquipStats(eq.defId, eq.quality);
      equipFlat.hp += es.hp || 0;
      equipFlat.atk += es.atk || 0;
      equipFlat.def += es.def || 0;
      equipFlat.spd += es.spd || 0;
      equipFlat.crit += es.crit || 0;
      equipFlat.critDmg += es.critDmg || 0;
      equipFlat.res += es.res || 0;
      if (eq.def.setId) setCounts[eq.def.setId] = (setCounts[eq.def.setId] || 0) + 1;
    }

    var activeSets = [];
    Object.keys(setCounts).forEach(function (setId) {
      var cnt = setCounts[setId];
      var setObj = getEquipSetById(setId);
      if (!setObj) return;
      var active2 = cnt >= 2;
      var active4 = cnt >= 4;
      if (active2 && setObj.bonus2 && setObj.bonus2.mod) applyMod(mod, setObj.bonus2.mod);
      if (active4 && setObj.bonus4 && setObj.bonus4.mod) applyMod(mod, setObj.bonus4.mod);
      activeSets.push({ setId: setId, set: setObj, count: cnt, active2: active2, active4: active4 });
    });

    // 2. Paired 1-to-1 控えリンク Passive + Same Element / Shared Race Match Bonus
    var partyIds = Array.isArray(opts.overrideParty) ? opts.overrideParty : (s ? s.party : [charId]);
    var linkIds = Array.isArray(opts.overrideLinks) ? opts.overrideLinks : (s ? s.links : []);
    var linkCharId = null;
    if (opts.overrideLinkId !== undefined) {
      linkCharId = opts.overrideLinkId;
    } else {
      var pIdx = partyIds.indexOf(charId);
      if (pIdx !== -1 && linkIds[pIdx]) linkCharId = linkIds[pIdx];
    }
    var linkInfo = calcLinkBonus(charId, linkCharId);
    if (linkInfo) applyMod(mod, linkInfo.mod);

    // 3. Party Synergies (across BOTH frontline AND links!)
    var synergies = calcPartySynergies(partyIds, linkIds);
    applyMod(mod, synergies.bonuses);

    // 4. Role Shared Abilities + Resonance Tier-5 Extra Abilities (Tier 1 & Tier 3)
    var resonance = typeof opts.overrideResonance === 'number' ? opts.overrideResonance : (cp.resonance || 0);
    var unlockedTier = (s && s.abilities && s.abilities.unlockedTiers && s.abilities.unlockedTiers[ch.role]) || 1;
    var roleEq = (s && s.abilities && s.abilities.equipped && s.abilities.equipped[ch.role]) || {};
    var extraEq = opts.overrideExtraAbilities || (s && s.abilities && s.abilities.extraEquipped && s.abilities.extraEquipped[charId]) || {};

    var activeAbilityIds = [];
    if (Array.isArray(opts.overrideAbilities)) {
      activeAbilityIds = opts.overrideAbilities.filter(Boolean);
    } else {
      var abMap = Object.assign({}, roleEq, (opts.overrideAbilities && typeof opts.overrideAbilities === 'object') ? opts.overrideAbilities : {});
      for (var t = 1; t <= unlockedTier; t++) {
        if (abMap[t]) activeAbilityIds.push(abMap[t]);
      }
      if (resonance >= 5) {
        if (extraEq[1] && activeAbilityIds.indexOf(extraEq[1]) === -1) activeAbilityIds.push(extraEq[1]);
        if (unlockedTier >= 3 && extraEq[3] && activeAbilityIds.indexOf(extraEq[3]) === -1) activeAbilityIds.push(extraEq[3]);
      }
    }

    var activeAbilities = [];
    for (var ai = 0; ai < activeAbilityIds.length; ai++) {
      var abObj = getAbilityById(activeAbilityIds[ai]);
      if (!abObj) continue;
      activeAbilities.push(abObj);
      applyMod(mod, abObj.mod);
    }

    // 5. Character Resonance Stages (1..resonance)
    if (resonance > 0 && Array.isArray(ch.resonance)) {
      for (var r = 0; r < Math.min(resonance, ch.resonance.length); r++) {
        if (ch.resonance[r] && ch.resonance[r].mod) applyMod(mod, ch.resonance[r].mod);
      }
    }

    // 6. Character Passive Skill (when skills[2].type === 'passive') + its Awakenings
    var skillAwaken = Array.isArray(opts.overrideSkillAwaken) ? opts.overrideSkillAwaken : (cp.skillAwaken || [0, 0, 0]);
    if (Array.isArray(ch.skills)) {
      for (var skI = 0; skI < ch.skills.length; skI++) {
        var sk = ch.skills[skI];
        if (!sk || sk.type !== 'passive') continue;
        if (sk.mod) applyMod(mod, sk.mod);
        var awkLv = skillAwaken[skI] || 0;
        if (awkLv > 0 && Array.isArray(sk.awakenings)) {
          for (var pa = 0; pa < Math.min(awkLv, sk.awakenings.length); pa++) {
            var awNode = sk.awakenings[pa];
            if (awNode && awNode.bonus && awNode.bonus.mod) applyMod(mod, awNode.bonus.mod);
          }
        }
      }
    }

    // 7. World Relics (up to 3 party-wide)
    var relicIds = Array.isArray(opts.overrideRelics)
      ? opts.overrideRelics
      : ((s && s.relics && Array.isArray(s.relics.equipped)) ? s.relics.equipped : []);
    var activeRelics = [];
    for (var rel = 0; rel < relicIds.length; rel++) {
      var rObj = getRelicById(relicIds[rel]);
      if (!rObj) continue;
      activeRelics.push(rObj);
      applyMod(mod, rObj.mod);
    }

    // 8. Optional Tower Rule Modifier
    if (opts.towerRule && typeof opts.towerRule === 'object') {
      var tr = opts.towerRule;
      applyMod(mod, tr);
      if (tr.elementBoost && tr.elementBoost === ch.element) {
        mod.dmgDealtPct += (tr.elementBoostPct || 0.30);
      }
      if (tr.lightDarkBoostPct && (ch.element === 'light' || ch.element === 'dark')) {
        mod.dmgDealtPct += tr.lightDarkBoostPct;
      }
    }

    // Final Combat Stats (exact decimal rates for crit/critDmg/res!)
    var rawHp = (bs.hp || 1000) + equipFlat.hp + mod.hpFlat;
    var rawAtk = (bs.atk || 120) + equipFlat.atk + mod.atkFlat;
    var rawDef = (bs.def || 80) + equipFlat.def + mod.defFlat;
    var rawSpd = (bs.spd || 100) + equipFlat.spd + mod.spdFlat;

    var hp = Math.max(100, Math.round(rawHp * (1 + mod.hpPct)));
    var atk = Math.max(20, Math.round(rawAtk * (1 + mod.atkPct)));
    var def = Math.max(10, Math.round(rawDef * (1 + mod.defPct)));
    var spd = Math.max(40, Math.round(rawSpd * (1 + mod.spdPct)));
    var crit = clamp(Math.round(((bs.crit || 0.10) + equipFlat.crit + mod.crit) * 1000) / 1000, 0, 1.0);
    var critDmg = Math.max(1.20, Math.round(((bs.critDmg || 1.50) + equipFlat.critDmg + mod.critDmg) * 1000) / 1000);
    var res = clamp(Math.round(((bs.res || 0.10) + equipFlat.res + mod.res) * 1000) / 1000, 0, 0.95);

    var power = Math.round(
      hp * 0.24 +
      atk * 3.1 +
      def * 2.2 +
      spd * 4.0 +
      crit * 650 +
      (critDmg - 1.50) * 380 +
      res * 350 +
      mod.startShieldPct * 900 +
      mod.initGauge * 650 +
      mod.followUpRate * 850 +
      mod.counterRate * 750 +
      mod.waveHealPct * 650 +
      mod.dmgDealtPct * 950 +
      Math.max(0, -mod.dmgTakenPct) * 950 +
      (skillAwaken[0] + skillAwaken[1] + skillAwaken[2]) * 75 +
      resonance * 120
    );

    return {
      charId: charId,
      hp: hp,
      atk: atk,
      def: def,
      spd: spd,
      crit: crit,
      critDmg: critDmg,
      res: res,
      // All combat modifiers (decimal scale matching HS.Data)
      dmgDealtPct: mod.dmgDealtPct,
      dmgTakenPct: clamp(mod.dmgTakenPct, -0.65, 0.50),
      dmgReduction: clamp(-mod.dmgTakenPct, 0, 0.65),
      healDealtPct: mod.healDealtPct,
      healTakenPct: mod.healTakenPct,
      skillDmgPct: mod.skillDmgPct,
      aoeDmgPct: mod.aoeDmgPct,
      singleDmgPct: mod.singleDmgPct,
      elementDmgPct: mod.elementDmgPct,
      ailmentDmgPct: mod.ailmentDmgPct,
      ailmentRate: mod.ailmentRate,
      lowHpDmgPct: mod.lowHpDmgPct,
      initGauge: clamp(mod.initGauge, 0, 0.92),
      startShieldPct: clamp(mod.startShieldPct, 0, 0.85),
      waveHealPct: clamp(mod.waveHealPct, 0, 0.65),
      turnRegenPct: clamp(mod.turnRegenPct, 0, 0.35),
      followUpRate: clamp(mod.followUpRate, 0, 0.85),
      followUpPower: mod.followUpPower,
      counterRate: clamp(mod.counterRate, 0, 0.85),
      counterPower: mod.counterPower,
      coverRate: clamp(mod.coverRate, 0, 0.80),
      buffDuration: Math.floor(mod.buffDuration),
      debuffDuration: Math.floor(mod.debuffDuration),
      cleanseOnHeal: Math.floor(mod.cleanseOnHeal),
      overhealShield: clamp(mod.overhealShield, 0, 1.0),
      reviveOnce: clamp(mod.reviveOnce, 0, 0.90),
      gutsOnce: Boolean(mod.gutsOnce),
      gaugeOnHit: clamp(mod.gaugeOnHit, 0, 0.40),
      gaugeOnKill: clamp(mod.gaugeOnKill, 0, 0.50),
      gaugeOnCrit: clamp(mod.gaugeOnCrit, 0, 0.40),
      allyStartAtkUp: Math.floor(mod.allyStartAtkUp),
      allyStartSpdUp: Math.floor(mod.allyStartSpdUp),
      enemyStartDefDown: Math.floor(mod.enemyStartDefDown),
      dropGoldPct: mod.dropGoldPct,
      dropQualityBonus: mod.dropQualityBonus,
      // Live UI Metadata
      power: power,
      resonance: resonance,
      skillAwaken: skillAwaken.slice(),
      resolvedEquip: resolvedEquip,
      activeSets: activeSets,
      activeAbilities: activeAbilities,
      activeRelics: activeRelics,
      linkInfo: linkInfo,
      synergies: synergies
    };
  }

  function calcStatDiff(before, after) {
    if (!before || !after) return null;
    var keys = ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg', 'res', 'power'];
    var diff = {};
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var d = (after[k] || 0) - (before[k] || 0);
      diff[k] = (k === 'crit' || k === 'critDmg' || k === 'res')
        ? Math.round(d * 1000) / 1000
        : Math.round(d);
    }
    return diff;
  }

  function calcPartySummary(partyIds, linkIds, opts) {
    var s = HS.State ? HS.State.get() : null;
    var pIds = Array.isArray(partyIds) ? partyIds : (s ? s.party : []);
    var lIds = Array.isArray(linkIds) ? linkIds : (s ? s.links : []);
    var synergies = calcPartySynergies(pIds, lIds);
    var units = [];
    var totalPower = 0;

    for (var i = 0; i < pIds.length; i++) {
      var cid = pIds[i];
      if (!cid) { units.push(null); continue; }
      var uStats = calcUnitStats(cid, Object.assign({}, opts || {}, { overrideParty: pIds, overrideLinks: lIds }));
      units.push(uStats);
      if (uStats) totalPower += uStats.power;
    }

    return { units: units, synergies: synergies, totalPower: totalPower };
  }

  function calcPartyDropBonuses() {
    var s = HS.State ? HS.State.get() : null;
    var relicIds = (s && s.relics && Array.isArray(s.relics.equipped)) ? s.relics.equipped : [];
    var goldPct = 0;
    var qualityBonus = 0;
    for (var i = 0; i < relicIds.length; i++) {
      var r = getRelicById(relicIds[i]);
      if (!r || !r.mod) continue;
      if (typeof r.mod.dropGoldPct === 'number') goldPct += r.mod.dropGoldPct;
      if (typeof r.mod.dropQualityBonus === 'number') qualityBonus += r.mod.dropQualityBonus;
    }
    return { dropGoldPct: goldPct, dropQualityBonus: qualityBonus };
  }

  var CalcAPI = {
    calcQualityMultiplier: calcQualityMultiplier,
    calcEquipStats: calcEquipStats,
    calcPartySynergies: calcPartySynergies,
    calcLinkBonus: calcLinkBonus,
    calcUnitStats: calcUnitStats,
    calcStatDiff: calcStatDiff,
    calcPartySummary: calcPartySummary,
    calcPartyDropBonuses: calcPartyDropBonuses,
    applyMod: applyMod,
    createEmptyModifiers: createEmptyModifiers
  };

  HS.Calc = CalcAPI;
  HS.Engine.Calc = CalcAPI;
})(typeof window !== 'undefined' ? window : globalThis);
