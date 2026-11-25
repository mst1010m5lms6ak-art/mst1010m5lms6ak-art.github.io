(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.Engine = HS.Engine || {};

  var listeners = {};
  var saveTimer = null;
  var initialized = false;
  var state = null;

  var DEFAULT_ROLES = ['tank', 'dealer', 'supporter', 'healer'];
  var DEFAULT_SLOTS = ['weapon', 'armor', 'accessory', 'core'];

  function getRoles() {
    return (HS.CONST && HS.CONST.ROLES) ? HS.CONST.ROLES : DEFAULT_ROLES;
  }

  function getSlots() {
    return (HS.CONST && HS.CONST.SLOTS) ? HS.CONST.SLOTS : DEFAULT_SLOTS;
  }

  function genUid(prefix) {
    if (HS.Utils && typeof HS.Utils.uid === 'function') return HS.Utils.uid(prefix);
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function clamp(v, min, max) {
    if (HS.Utils && typeof HS.Utils.clamp === 'function') return HS.Utils.clamp(v, min, max);
    return Math.max(min, Math.min(max, v));
  }

  function deepClone(obj) {
    if (HS.Utils && typeof HS.Utils.deepClone === 'function') return HS.Utils.deepClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

  function getCharsList() {
    return (HS.Data && Array.isArray(HS.Data.CHARACTERS)) ? HS.Data.CHARACTERS : [];
  }

  function getCharById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.CHAR_BY_ID && HS.Data.CHAR_BY_ID[id]) return HS.Data.CHAR_BY_ID[id];
    var list = getCharsList();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getAbilitiesByRoleTier(role, tier) {
    var list = (HS.Data && Array.isArray(HS.Data.ABILITIES)) ? HS.Data.ABILITIES : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].role === role && list[i].tier === tier) out.push(list[i]);
    }
    out.sort(function (a, b) { return (a.idx || 0) - (b.idx || 0); });
    return out;
  }

  function getAbilityById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.ABILITY_BY_ID && HS.Data.ABILITY_BY_ID[id]) return HS.Data.ABILITY_BY_ID[id];
    var list = (HS.Data && Array.isArray(HS.Data.ABILITIES)) ? HS.Data.ABILITIES : [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getEquipDefById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.EQUIP_DEF_BY_ID && HS.Data.EQUIP_DEF_BY_ID[id]) return HS.Data.EQUIP_DEF_BY_ID[id];
    var list = (HS.Data && Array.isArray(HS.Data.EQUIP_DEFS)) ? HS.Data.EQUIP_DEFS : [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getRelicById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.RELIC_BY_ID && HS.Data.RELIC_BY_ID[id]) return HS.Data.RELIC_BY_ID[id];
    var list = (HS.Data && Array.isArray(HS.Data.RELICS)) ? HS.Data.RELICS : [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getStarterCharIds() {
    var chars = getCharsList();
    var starters = [];
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var src = (c.unlock && c.unlock.type) || c.unlockType || '';
      if (src === 'starter' || c.isStarter === true) starters.push(c.id);
    }
    if (starters.length < 4 && chars.length > 0) {
      var roles = getRoles();
      for (var r = 0; r < roles.length && starters.length < 4; r++) {
        for (var j = 0; j < chars.length; j++) {
          if (chars[j].role === roles[r] && starters.indexOf(chars[j].id) === -1) {
            starters.push(chars[j].id);
            break;
          }
        }
      }
      for (var k = 0; k < chars.length && starters.length < 4; k++) {
        if (starters.indexOf(chars[k].id) === -1) starters.push(chars[k].id);
      }
    }
    return starters.slice(0, 4);
  }

  function getDefaultMaterials() {
    var mats = {
      gold: 3000,
      chaosShard: 25,
      mat_a1: 12,
      mat_a2: 0,
      mat_a3: 0,
      mat_a4: 0,
      mat_intruder: 0,
      mat_tower: 0,
      mat_boss: 0,
      mat_relay: 0
    };
    if (HS.Data && HS.Data.MATERIALS) {
      var keys = Array.isArray(HS.Data.MATERIALS)
        ? HS.Data.MATERIALS.map(function (m) { return m.id; })
        : Object.keys(HS.Data.MATERIALS);
      for (var i = 0; i < keys.length; i++) {
        if (typeof mats[keys[i]] !== 'number') mats[keys[i]] = 0;
      }
    }
    return mats;
  }

  function createEmptyCharProgress() {
    return {
      skillAwaken: [0, 0, 0],
      resonance: 0,
      equip: { weapon: null, armor: null, accessory: null, core: null }
    };
  }

  function createDefaultState() {
    var now = Date.now();
    var starters = getStarterCharIds();
    var roles = getRoles();
    var areas = (HS.Data && Array.isArray(HS.Data.AREAS)) ? HS.Data.AREAS : [];
    var firstArea = areas[0] || null;
    var firstStage = (firstArea && Array.isArray(firstArea.stages) && firstArea.stages[0]) ? firstArea.stages[0] : null;
    var expRoutes = (HS.Data && Array.isArray(HS.Data.EXPEDITIONS)) ? HS.Data.EXPEDITIONS : [];

    var unlockedTiers = {};
    var equippedAbilities = {};
    var codexAbilities = {};
    for (var r = 0; r < roles.length; r++) {
      var role = roles[r];
      unlockedTiers[role] = 1;
      equippedAbilities[role] = { 1: null, 2: null, 3: null, 4: null, 5: null };
      var t1List = getAbilitiesByRoleTier(role, 1);
      if (t1List.length > 0) {
        equippedAbilities[role][1] = t1List[0].id;
        for (var a = 0; a < t1List.length; a++) codexAbilities[t1List[a].id] = true;
      }
    }

    var charProgress = {};
    var codexChars = {};
    for (var s = 0; s < starters.length; s++) {
      charProgress[starters[s]] = createEmptyCharProgress();
      codexChars[starters[s]] = true;
    }

    // Provide starter gear (frontier & steam sets) so player feels gear & live stat diffs right away
    var inventory = [];
    var codexEquips = {};
    var equipDefs = (HS.Data && Array.isArray(HS.Data.EQUIP_DEFS)) ? HS.Data.EQUIP_DEFS : [];
    if (equipDefs.length > 0) {
      var starterSetDefs = equipDefs.filter(function (d) {
        return d.setId === 'set_frontier' || d.setId === 'set_steam';
      });
      var pool = starterSetDefs.length >= 4 ? starterSetDefs : equipDefs;
      var bySlot = { weapon: [], armor: [], accessory: [], core: [] };
      for (var e = 0; e < pool.length; e++) {
        if (bySlot[pool[e].slot]) bySlot[pool[e].slot].push(pool[e]);
      }
      var qSeq = [58, 66, 74, 82];
      for (var si = 0; si < starters.length; si++) {
        var cid = starters[si];
        var wDef = bySlot.weapon[si % Math.max(1, bySlot.weapon.length)];
        var aDef = bySlot.armor[si % Math.max(1, bySlot.armor.length)];
        if (wDef) {
          var wItem = { uid: genUid('eq'), defId: wDef.id, quality: qSeq[si % qSeq.length], locked: false, acquiredAt: now };
          inventory.push(wItem);
          codexEquips[wDef.id] = true;
          charProgress[cid].equip.weapon = wItem.uid;
        }
        if (aDef) {
          var aItem = { uid: genUid('eq'), defId: aDef.id, quality: qSeq[(si + 1) % qSeq.length], locked: false, acquiredAt: now };
          inventory.push(aItem);
          codexEquips[aDef.id] = true;
          charProgress[cid].equip.armor = aItem.uid;
        }
      }
      var spares = [
        bySlot.accessory[0] ? { def: bySlot.accessory[0], q: 72 } : null,
        bySlot.accessory[1] ? { def: bySlot.accessory[1], q: 86 } : null,
        bySlot.core[0] ? { def: bySlot.core[0], q: 78 } : null,
        bySlot.weapon[0] ? { def: bySlot.weapon[0], q: 92 } : null
      ];
      for (var sp = 0; sp < spares.length; sp++) {
        if (!spares[sp]) continue;
        inventory.push({ uid: genUid('eq'), defId: spares[sp].def.id, quality: spares[sp].q, locked: false, acquiredAt: now });
        codexEquips[spares[sp].def.id] = true;
      }
    }

    var highestStageByArea = {};
    for (var ai = 0; ai < areas.length; ai++) {
      highestStageByArea[areas[ai].id] = (ai === 0) ? 1 : 0;
    }

    var party = [starters[0] || null, starters[1] || null, starters[2] || null, starters[3] || null];

    return {
      version: 1,
      createdAt: now,
      updatedAt: now,
      materials: getDefaultMaterials(),
      ownedChars: starters.slice(),
      party: party,
      links: [null, null, null, null],
      relaySquads: [starters.slice(), [], []],
      expeditions: [
        { slot: 0, routeId: expRoutes[0] ? expRoutes[0].id : null, charIds: [], progress: 0, completions: 0, autoRestart: true, paused: false },
        { slot: 1, routeId: expRoutes[1] ? expRoutes[1].id : (expRoutes[0] ? expRoutes[0].id : null), charIds: [], progress: 0, completions: 0, autoRestart: true, paused: false }
      ],
      abilities: {
        unlockedTiers: unlockedTiers,
        equipped: equippedAbilities,
        extraEquipped: {}
      },
      charProgress: charProgress,
      relics: {
        unlocked: [],
        equipped: [null, null, null]
      },
      inventory: inventory,
      autoSell: {
        enabled: true,
        maxQualityToSell: 69,
        protectMaxQuality: true,
        keepSetIds: []
      },
      progress: {
        clearedStages: {},
        highestStageByArea: highestStageByArea,
        selectedMode: 'stage',
        selectedAreaId: firstArea ? firstArea.id : 'area1',
        selectedStageId: firstStage ? firstStage.id : 'a1_s1',
        towerCleared: {},
        towerHighest: 0,
        superbossBest: {},
        superbossClaimed: {},
        relayCleared: {},
        intruderKills: {},
        bountyCleared: {},
        totalBattlesWon: 0,
        totalAutoSold: 0,
        totalAutoSoldGold: 0
      },
      codex: {
        chars: codexChars,
        enemies: {},
        equips: codexEquips,
        abilities: codexAbilities
      },
      settings: {
        speed: 1,
        wakeLock: false,
        showCutin: true,
        compactFx: false
      }
    };
  }

  function sanitizeState(raw) {
    var base = createDefaultState();
    if (!raw || typeof raw !== 'object') return base;
    var s = deepClone(raw);
    s.version = 1;
    s.createdAt = typeof s.createdAt === 'number' ? s.createdAt : base.createdAt;
    s.updatedAt = typeof s.updatedAt === 'number' ? s.updatedAt : Date.now();

    s.materials = Object.assign({}, base.materials, s.materials || {});
    Object.keys(s.materials).forEach(function (k) {
      if (typeof s.materials[k] !== 'number' || !isFinite(s.materials[k]) || s.materials[k] < 0) s.materials[k] = 0;
    });

    if (!Array.isArray(s.ownedChars) || s.ownedChars.length === 0) {
      s.ownedChars = base.ownedChars.slice();
    } else {
      var uOwned = [];
      for (var i = 0; i < s.ownedChars.length; i++) {
        var cid = s.ownedChars[i];
        if (cid && uOwned.indexOf(cid) === -1 && (!getCharsList().length || getCharById(cid))) uOwned.push(cid);
      }
      s.ownedChars = uOwned.length ? uOwned : base.ownedChars.slice();
    }

    s.party = Array.isArray(s.party) ? s.party.slice(0, 4) : base.party.slice();
    while (s.party.length < 4) s.party.push(null);
    var usedParty = {};
    for (var p = 0; p < 4; p++) {
      var pc = s.party[p];
      if (!pc || s.ownedChars.indexOf(pc) === -1 || usedParty[pc]) s.party[p] = null;
      else usedParty[pc] = true;
    }
    if (!s.party.some(Boolean)) {
      s.party[0] = s.ownedChars[0] || null;
      if (s.party[0]) usedParty[s.party[0]] = true;
    }

    s.links = Array.isArray(s.links) ? s.links.slice(0, 4) : [null, null, null, null];
    while (s.links.length < 4) s.links.push(null);
    var usedLinks = {};
    for (var l = 0; l < 4; l++) {
      var lc = s.links[l];
      if (!lc || s.ownedChars.indexOf(lc) === -1 || usedParty[lc] || usedLinks[lc]) s.links[l] = null;
      else usedLinks[lc] = true;
    }

    s.relaySquads = Array.isArray(s.relaySquads) ? s.relaySquads.slice(0, 3) : base.relaySquads;
    while (s.relaySquads.length < 3) s.relaySquads.push([]);
    var usedRelay = {};
    for (var rq = 0; rq < 3; rq++) {
      var arr = Array.isArray(s.relaySquads[rq]) ? s.relaySquads[rq] : [];
      var cleanSq = [];
      for (var rj = 0; rj < arr.length && cleanSq.length < 4; rj++) {
        var rc = arr[rj];
        if (rc && s.ownedChars.indexOf(rc) !== -1 && !usedRelay[rc]) {
          cleanSq.push(rc);
          usedRelay[rc] = true;
        }
      }
      s.relaySquads[rq] = cleanSq;
    }

    s.expeditions = Array.isArray(s.expeditions) ? s.expeditions.slice(0, 2) : base.expeditions;
    while (s.expeditions.length < 2) s.expeditions.push(deepClone(base.expeditions[s.expeditions.length]));
    var usedExp = {};
    for (var ex = 0; ex < 2; ex++) {
      var slotObj = s.expeditions[ex] || {};
      var expChars = Array.isArray(slotObj.charIds) ? slotObj.charIds : [];
      var cleanExp = [];
      for (var ec = 0; ec < expChars.length && cleanExp.length < 4; ec++) {
        var ch = expChars[ec];
        if (ch && s.ownedChars.indexOf(ch) !== -1 && !usedParty[ch] && !usedLinks[ch] && !usedExp[ch]) {
          cleanExp.push(ch);
          usedExp[ch] = true;
        }
      }
      s.expeditions[ex] = {
        slot: ex,
        routeId: slotObj.routeId || (base.expeditions[ex] && base.expeditions[ex].routeId) || null,
        charIds: cleanExp,
        progress: Math.max(0, Math.floor(Number(slotObj.progress) || 0)),
        completions: Math.max(0, Math.floor(Number(slotObj.completions) || 0)),
        autoRestart: slotObj.autoRestart !== false,
        paused: Boolean(slotObj.paused)
      };
    }

    s.abilities = s.abilities || {};
    s.abilities.unlockedTiers = Object.assign({}, base.abilities.unlockedTiers, s.abilities.unlockedTiers || {});
    s.abilities.equipped = s.abilities.equipped || {};
    s.abilities.extraEquipped = s.abilities.extraEquipped || {};
    var roles = getRoles();
    for (var ri = 0; ri < roles.length; ri++) {
      var role = roles[ri];
      s.abilities.unlockedTiers[role] = clamp(Math.floor(Number(s.abilities.unlockedTiers[role]) || 1), 1, 5);
      s.abilities.equipped[role] = Object.assign({ 1: null, 2: null, 3: null, 4: null, 5: null }, base.abilities.equipped[role], s.abilities.equipped[role] || {});
      for (var t = 1; t <= s.abilities.unlockedTiers[role]; t++) {
        var curId = s.abilities.equipped[role][t];
        var abObj = getAbilityById(curId);
        if (!abObj || abObj.role !== role || abObj.tier !== t) {
          var tList = getAbilitiesByRoleTier(role, t);
          s.abilities.equipped[role][t] = tList[0] ? tList[0].id : null;
        }
      }
    }

    s.inventory = Array.isArray(s.inventory) ? s.inventory : [];
    var invByUid = {};
    var cleanInv = [];
    for (var ii = 0; ii < s.inventory.length; ii++) {
      var item = s.inventory[ii];
      if (!item || !item.uid || !item.defId || invByUid[item.uid]) continue;
      if (HS.Data && HS.Data.EQUIP_DEFS && HS.Data.EQUIP_DEFS.length && !getEquipDefById(item.defId)) continue;
      var ci = {
        uid: String(item.uid),
        defId: String(item.defId),
        quality: clamp(Math.round(Number(item.quality) || 1), 1, 100),
        locked: Boolean(item.locked),
        acquiredAt: typeof item.acquiredAt === 'number' ? item.acquiredAt : Date.now()
      };
      invByUid[ci.uid] = ci;
      cleanInv.push(ci);
    }
    s.inventory = cleanInv;

    s.charProgress = s.charProgress || {};
    var usedUids = {};
    var slots = getSlots();
    for (var oc = 0; oc < s.ownedChars.length; oc++) {
      var oid = s.ownedChars[oc];
      var cp = s.charProgress[oid] || createEmptyCharProgress();
      if (!Array.isArray(cp.skillAwaken) || cp.skillAwaken.length < 3) cp.skillAwaken = [0, 0, 0];
      else cp.skillAwaken = [
        clamp(Math.floor(Number(cp.skillAwaken[0]) || 0), 0, 3),
        clamp(Math.floor(Number(cp.skillAwaken[1]) || 0), 0, 3),
        clamp(Math.floor(Number(cp.skillAwaken[2]) || 0), 0, 3)
      ];
      cp.resonance = clamp(Math.floor(Number(cp.resonance) || 0), 0, 5);
      cp.equip = cp.equip || { weapon: null, armor: null, accessory: null, core: null };
      for (var sl = 0; sl < slots.length; sl++) {
        var slotName = slots[sl];
        var uid = cp.equip[slotName];
        if (!uid || !invByUid[uid] || usedUids[uid]) {
          cp.equip[slotName] = null;
        } else {
          var def = getEquipDefById(invByUid[uid].defId);
          if (def && def.slot !== slotName) cp.equip[slotName] = null;
          else usedUids[uid] = oid;
        }
      }
      s.charProgress[oid] = cp;
    }

    s.relics = s.relics || { unlocked: [], equipped: [null, null, null] };
    s.relics.unlocked = Array.isArray(s.relics.unlocked) ? s.relics.unlocked.filter(function (v, idx, a) { return Boolean(v) && a.indexOf(v) === idx; }) : [];
    s.relics.equipped = Array.isArray(s.relics.equipped) ? s.relics.equipped.slice(0, 3) : [null, null, null];
    while (s.relics.equipped.length < 3) s.relics.equipped.push(null);
    var usedRelics = {};
    for (var rel = 0; rel < 3; rel++) {
      var rid = s.relics.equipped[rel];
      if (!rid || s.relics.unlocked.indexOf(rid) === -1 || usedRelics[rid]) s.relics.equipped[rel] = null;
      else usedRelics[rid] = true;
    }

    s.autoSell = Object.assign({}, base.autoSell, s.autoSell || {});
    s.autoSell.enabled = Boolean(s.autoSell.enabled);
    s.autoSell.maxQualityToSell = clamp(Math.round(Number(s.autoSell.maxQualityToSell) || 0), 0, 99);
    s.autoSell.protectMaxQuality = s.autoSell.protectMaxQuality !== false;
    s.autoSell.keepSetIds = Array.isArray(s.autoSell.keepSetIds) ? s.autoSell.keepSetIds.slice() : [];

    s.progress = Object.assign({}, base.progress, s.progress || {});
    s.progress.clearedStages = s.progress.clearedStages || {};
    s.progress.highestStageByArea = Object.assign({}, base.progress.highestStageByArea, s.progress.highestStageByArea || {});
    s.progress.towerCleared = s.progress.towerCleared || {};
    s.progress.superbossBest = s.progress.superbossBest || {};
    s.progress.superbossClaimed = s.progress.superbossClaimed || {};
    // Migrate legacy numeric milestone indices (0, 1, 2) to canonical ms.id strings ('sb1_m1', etc.)
    Object.keys(s.progress.superbossClaimed).forEach(function (sbId) {
      var rawList = s.progress.superbossClaimed[sbId];
      if (!Array.isArray(rawList)) { s.progress.superbossClaimed[sbId] = []; return; }
      var sbDef = (HS.Data && HS.Data.SUPERBOSS_BY_ID && HS.Data.SUPERBOSS_BY_ID[sbId]) || null;
      var msList = (sbDef && Array.isArray(sbDef.milestones)) ? sbDef.milestones : [];
      var migrated = [];
      for (var mi = 0; mi < rawList.length; mi++) {
        var entry = rawList[mi];
        var key = (typeof entry === 'number' && msList[entry] && msList[entry].id) ? msList[entry].id : String(entry);
        if (key && migrated.indexOf(key) === -1) migrated.push(key);
      }
      s.progress.superbossClaimed[sbId] = migrated;
    });
    s.progress.relayCleared = s.progress.relayCleared || {};
    s.progress.intruderKills = s.progress.intruderKills || {};
    s.progress.bountyCleared = s.progress.bountyCleared || {};

    s.codex = Object.assign({}, base.codex, s.codex || {});
    s.codex.chars = Object.assign({}, base.codex.chars, s.codex.chars || {});
    s.codex.enemies = Object.assign({}, s.codex.enemies || {});
    s.codex.equips = Object.assign({}, base.codex.equips, s.codex.equips || {});
    s.codex.abilities = Object.assign({}, base.codex.abilities, s.codex.abilities || {});
    for (var cc = 0; cc < s.ownedChars.length; cc++) s.codex.chars[s.ownedChars[cc]] = true;

    s.settings = Object.assign({}, base.settings, s.settings || {});
    if ([1, 2, 3].indexOf(s.settings.speed) === -1) s.settings.speed = 1;
    s.settings.wakeLock = Boolean(s.settings.wakeLock);
    s.settings.showCutin = s.settings.showCutin !== false;
    s.settings.compactFx = Boolean(s.settings.compactFx);

    return s;
  }

  function emit(event, payload) {
    var list = listeners[event];
    if (list && list.length) {
      var copy = list.slice();
      for (var i = 0; i < copy.length; i++) {
        try { copy[i](payload, event); } catch (err) {
          if (typeof console !== 'undefined' && console.error) console.error('[HS.State] listener error:', event, err);
        }
      }
    }
    if (event !== '*' && listeners['*'] && listeners['*'].length) {
      var anyCopy = listeners['*'].slice();
      for (var j = 0; j < anyCopy.length; j++) {
        try { anyCopy[j](payload, event); } catch (err2) {
          if (typeof console !== 'undefined' && console.error) console.error('[HS.State] * listener error:', event, err2);
        }
      }
    }
  }

  function subscribe(event, fn) {
    if (typeof event === 'function') { fn = event; event = '*'; }
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return function unsubscribe() {
      var arr = listeners[event];
      if (!arr) return;
      var idx = arr.indexOf(fn);
      if (idx !== -1) arr.splice(idx, 1);
    };
  }

  function saveNow() {
    if (!state) return Promise.resolve();
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    state.updatedAt = Date.now();
    if (HS.Storage && typeof HS.Storage.save === 'function') {
      return Promise.resolve(HS.Storage.save(state)).catch(function (err) {
        if (typeof console !== 'undefined' && console.warn) console.warn('[HS.State] save failed:', err);
      });
    }
    return Promise.resolve();
  }

  function scheduleSave() {
    if (!state) return;
    state.updatedAt = Date.now();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      saveNow();
    }, 320);
  }

  function notifyChange(subEvent, payload) {
    scheduleSave();
    if (subEvent) emit(subEvent, payload);
    emit('state:change', { event: subEvent || 'state:change', payload: payload });
  }

  function ensureInit() {
    if (!state) {
      state = createDefaultState();
      initialized = true;
    }
    return state;
  }

  function removeCharFromExpeditions(charId) {
    var removed = false;
    for (var i = 0; i < state.expeditions.length; i++) {
      var idx = state.expeditions[i].charIds.indexOf(charId);
      if (idx !== -1) {
        state.expeditions[i].charIds.splice(idx, 1);
        removed = true;
      }
    }
    return removed;
  }

  function normalizeCost(cost) {
    var out = {};
    if (!cost || typeof cost !== 'object') return out;
    if (cost.matId && cost.matQty) {
      out[cost.matId] = (out[cost.matId] || 0) + Math.floor(cost.matQty);
    }
    Object.keys(cost).forEach(function (k) {
      if (k === 'matId' || k === 'matQty') return;
      var v = Number(cost[k]);
      if (isFinite(v) && v > 0) out[k] = (out[k] || 0) + Math.floor(v);
    });
    return out;
  }

  function canAfford(cost) {
    ensureInit();
    var norm = normalizeCost(cost);
    var keys = Object.keys(norm);
    for (var i = 0; i < keys.length; i++) {
      if ((state.materials[keys[i]] || 0) < norm[keys[i]]) return false;
    }
    return true;
  }

  function spendCost(cost) {
    ensureInit();
    if (!canAfford(cost)) return false;
    var norm = normalizeCost(cost);
    var keys = Object.keys(norm);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      state.materials[k] = Math.max(0, (state.materials[k] || 0) - norm[k]);
    }
    return true;
  }

  function getEquippedOwner(uid) {
    ensureInit();
    if (!uid) return null;
    var ids = Object.keys(state.charProgress);
    var slots = getSlots();
    for (var i = 0; i < ids.length; i++) {
      var eq = state.charProgress[ids[i]].equip;
      if (!eq) continue;
      for (var s = 0; s < slots.length; s++) {
        if (eq[slots[s]] === uid) return ids[i];
      }
    }
    return null;
  }

  function getSellValue(item) {
    if (!item) return 0;
    var q = clamp(Math.round(Number(item.quality) || 1), 1, 100);
    var base = 40 + q * 4;
    if (q >= 90) base += 120;
    if (q === 100) base += 600;
    return base;
  }

  function shouldAutoSell(item, ignoreEnabled) {
    ensureInit();
    if (!item) return false;
    var cfg = state.autoSell;
    if (!ignoreEnabled && !cfg.enabled) return false;
    if (item.locked) return false;
    if (getEquippedOwner(item.uid)) return false;
    if (cfg.protectMaxQuality && item.quality >= 100) return false;
    var def = getEquipDefById(item.defId);
    if (def && Array.isArray(cfg.keepSetIds) && cfg.keepSetIds.indexOf(def.setId) !== -1) return false;
    return item.quality <= cfg.maxQualityToSell;
  }

  function getAbilityTierUnlockCost(role, tier) {
    if (HS.Data && HS.Data.ABILITY_TIER_COSTS) {
      if (HS.Data.ABILITY_TIER_COSTS[tier]) return HS.Data.ABILITY_TIER_COSTS[tier];
      if (HS.Data.ABILITY_TIER_COSTS[role] && HS.Data.ABILITY_TIER_COSTS[role][tier]) return HS.Data.ABILITY_TIER_COSTS[role][tier];
    }
    var abList = getAbilitiesByRoleTier(role, tier);
    if (abList[0] && abList[0].unlockCost) return abList[0].unlockCost;
    return { gold: 1000 * tier };
  }

  function getSkillAwakenCost(charId, skillIdx, nextLevel) {
    var ch = getCharById(charId);
    if (ch && Array.isArray(ch.skills) && ch.skills[skillIdx]) {
      var awList = ch.skills[skillIdx].awakenings;
      if (Array.isArray(awList) && awList[nextLevel - 1] && awList[nextLevel - 1].cost) {
        return awList[nextLevel - 1].cost;
      }
    }
    return { gold: 600 * nextLevel, mat_a1: 3 * nextLevel };
  }

  function getResonanceCost(charId, nextStage) {
    var ch = getCharById(charId);
    if (ch && Array.isArray(ch.resonance) && ch.resonance[nextStage - 1] && ch.resonance[nextStage - 1].cost) {
      return ch.resonance[nextStage - 1].cost;
    }
    return { gold: 800 * nextStage, chaosShard: 2 * nextStage };
  }

  function getTavernCost(charObj) {
    if (!charObj) return null;
    if (charObj.unlock && charObj.unlock.cost) return charObj.unlock.cost;
    if (charObj.tavernCost) return charObj.tavernCost;
    return { gold: 1500, chaosShard: 5 };
  }

  function findStageInfo(stageId) {
    var areas = (HS.Data && Array.isArray(HS.Data.AREAS)) ? HS.Data.AREAS : [];
    for (var i = 0; i < areas.length; i++) {
      var stages = areas[i].stages || [];
      for (var j = 0; j < stages.length; j++) {
        if (stages[j].id === stageId) return { area: areas[i], areaIdx: i, stage: stages[j], stageIdx: j };
      }
    }
    return null;
  }

  var StateAPI = {
    init: function () {
      var loadPromise = (HS.Storage && typeof HS.Storage.load === 'function')
        ? Promise.resolve(HS.Storage.load()).catch(function () { return null; })
        : Promise.resolve(null);
      return loadPromise.then(function (loaded) {
        state = loaded ? sanitizeState(loaded) : createDefaultState();
        initialized = true;
        emit('state:ready', state);
        return state;
      });
    },

    isReady: function () { return initialized; },
    get: function () { return ensureInit(); },
    saveNow: saveNow,
    scheduleSave: scheduleSave,
    subscribe: subscribe,
    emit: emit,

    reset: function () {
      var clearPromise = (HS.Storage && typeof HS.Storage.clearAll === 'function')
        ? Promise.resolve(HS.Storage.clearAll()).catch(function () {})
        : Promise.resolve();
      return clearPromise.then(function () {
        state = createDefaultState();
        initialized = true;
        return saveNow().then(function () {
          emit('state:reset', state);
          emit('state:change', { event: 'state:reset', payload: state });
          return state;
        });
      });
    },

    exportSave: function () {
      ensureInit();
      if (HS.Storage && typeof HS.Storage.exportString === 'function') return HS.Storage.exportString(state);
      return JSON.stringify(state);
    },

    importSave: function (str) {
      if (!str || typeof str !== 'string') return { ok: false, error: 'セーブ文字列が空です' };
      try {
        var parsed = (HS.Storage && typeof HS.Storage.importString === 'function')
          ? HS.Storage.importString(str)
          : JSON.parse(str);
        if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'セーブデータの形式が不正です' };
        state = sanitizeState(parsed);
        initialized = true;
        saveNow();
        emit('state:import', state);
        emit('state:change', { event: 'state:import', payload: state });
        return { ok: true, state: state };
      } catch (err) {
        return { ok: false, error: (err && err.message) ? err.message : 'セーブデータの読み込みに失敗しました' };
      }
    },

    getGold: function () { ensureInit(); return state.materials.gold || 0; },
    getMaterial: function (matId) { ensureInit(); return state.materials[matId] || 0; },

    addMaterial: function (matId, qty, silent) {
      ensureInit();
      var n = Math.floor(Number(qty) || 0);
      if (!matId || n === 0) return state.materials[matId] || 0;
      state.materials[matId] = Math.max(0, (state.materials[matId] || 0) + n);
      if (!silent) notifyChange('materials:change', { matId: matId, qty: n });
      return state.materials[matId];
    },

    addMaterials: function (map, silent) {
      ensureInit();
      if (!map || typeof map !== 'object') return;
      Object.keys(map).forEach(function (k) {
        var v = Math.floor(Number(map[k]) || 0);
        if (v > 0) state.materials[k] = (state.materials[k] || 0) + v;
      });
      if (!silent) notifyChange('materials:change', map);
    },

    canAfford: canAfford,
    spendCost: function (cost) {
      var ok = spendCost(cost);
      if (ok) notifyChange('materials:change', cost);
      return ok;
    },
    normalizeCost: normalizeCost,

    isCharOwned: function (charId) { ensureInit(); return state.ownedChars.indexOf(charId) !== -1; },

    getOwnedChars: function () {
      ensureInit();
      var objs = [];
      for (var i = 0; i < state.ownedChars.length; i++) {
        var c = getCharById(state.ownedChars[i]);
        if (c) objs.push(c);
      }
      return (HS.Utils && typeof HS.Utils.sortCharacters === 'function') ? HS.Utils.sortCharacters(objs) : objs;
    },

    getCharProgress: function (charId) {
      ensureInit();
      if (!state.charProgress[charId]) state.charProgress[charId] = createEmptyCharProgress();
      return state.charProgress[charId];
    },

    unlockChar: function (charId, source) {
      ensureInit();
      var ch = getCharById(charId);
      if (!ch) return { unlocked: false, error: '対象キャラクターが見つかりません' };
      state.codex.chars[charId] = true;
      if (state.ownedChars.indexOf(charId) !== -1) return { unlocked: false, alreadyOwned: true, char: ch };
      state.ownedChars.push(charId);
      if (!state.charProgress[charId]) state.charProgress[charId] = createEmptyCharProgress();
      notifyChange('char:unlock', { charId: charId, char: ch, source: source || 'event' });
      return { unlocked: true, char: ch, source: source || 'event' };
    },

    getTavernCost: getTavernCost,

    recruitTavernChar: function (charId) {
      ensureInit();
      var ch = getCharById(charId);
      if (!ch) return { ok: false, error: 'キャラクターが見つかりません' };
      if (state.ownedChars.indexOf(charId) !== -1) return { ok: false, error: 'すでに仲間になっています' };
      var cost = getTavernCost(ch);
      if (!canAfford(cost)) return { ok: false, error: '必要な素材またはゴールドが不足しています' };
      spendCost(cost);
      var res = StateAPI.unlockChar(charId, 'tavern');
      return { ok: true, char: ch, result: res };
    },

    isInParty: function (charId) { ensureInit(); return state.party.indexOf(charId) !== -1; },
    isInLinks: function (charId) { ensureInit(); return state.links.indexOf(charId) !== -1; },
    isInActivePartyOrLinks: function (charId) {
      ensureInit();
      return state.party.indexOf(charId) !== -1 || state.links.indexOf(charId) !== -1;
    },
    isInExpedition: function (charId) {
      ensureInit();
      for (var i = 0; i < state.expeditions.length; i++) {
        if (state.expeditions[i].charIds.indexOf(charId) !== -1) return i;
      }
      return -1;
    },
    getLinkedChar: function (partySlotIdx) { ensureInit(); return state.links[partySlotIdx] || null; },
    getLinkedCharFor: function (charId) {
      ensureInit();
      var idx = state.party.indexOf(charId);
      return idx === -1 ? null : (state.links[idx] || null);
    },

    setPartySlot: function (slotIdx, charId) {
      ensureInit();
      if (slotIdx < 0 || slotIdx > 3) return { ok: false, error: '枠が不正です' };
      if (!charId) {
        if (state.party.filter(Boolean).length <= 1 && state.party[slotIdx]) {
          return { ok: false, error: '出撃メンバーは最低1人必要です' };
        }
        state.party[slotIdx] = null;
        notifyChange('party:change', { party: state.party.slice(), links: state.links.slice() });
        return { ok: true };
      }
      if (state.ownedChars.indexOf(charId) === -1) return { ok: false, error: '未所持のキャラクターです' };

      var existingPartyIdx = state.party.indexOf(charId);
      if (existingPartyIdx !== -1) {
        if (existingPartyIdx === slotIdx) return { ok: true };
        var temp = state.party[slotIdx];
        state.party[slotIdx] = charId;
        state.party[existingPartyIdx] = temp;
      } else {
        var existingLinkIdx = state.links.indexOf(charId);
        if (existingLinkIdx !== -1) state.links[existingLinkIdx] = null;
        removeCharFromExpeditions(charId);
        state.party[slotIdx] = charId;
      }
      notifyChange('party:change', { party: state.party.slice(), links: state.links.slice() });
      return { ok: true };
    },

    setLinkSlot: function (slotIdx, charId) {
      ensureInit();
      if (slotIdx < 0 || slotIdx > 3) return { ok: false, error: '枠が不正です' };
      if (!charId) {
        state.links[slotIdx] = null;
        notifyChange('party:change', { party: state.party.slice(), links: state.links.slice() });
        return { ok: true };
      }
      if (state.ownedChars.indexOf(charId) === -1) return { ok: false, error: '未所持のキャラクターです' };
      if (state.party.indexOf(charId) !== -1) return { ok: false, error: '出撃中のメンバーは控えリンクに配置できません' };

      var existingLinkIdx = state.links.indexOf(charId);
      if (existingLinkIdx !== -1) {
        if (existingLinkIdx === slotIdx) return { ok: true };
        var temp = state.links[slotIdx];
        state.links[slotIdx] = charId;
        state.links[existingLinkIdx] = temp;
      } else {
        removeCharFromExpeditions(charId);
        state.links[slotIdx] = charId;
      }
      notifyChange('party:change', { party: state.party.slice(), links: state.links.slice() });
      return { ok: true };
    },

    getAvailableForLinks: function () {
      ensureInit();
      return StateAPI.getOwnedChars().filter(function (c) { return state.party.indexOf(c.id) === -1; });
    },

    getAvailableForExpedition: function (slotIdx) {
      ensureInit();
      var otherSlot = slotIdx === 0 ? 1 : 0;
      var otherChars = (state.expeditions[otherSlot] && state.expeditions[otherSlot].charIds) || [];
      return StateAPI.getOwnedChars().filter(function (c) {
        return state.party.indexOf(c.id) === -1 && state.links.indexOf(c.id) === -1 && otherChars.indexOf(c.id) === -1;
      });
    },

    setRelaySlot: function (squadIdx, slotIdx, charId) {
      ensureInit();
      if (squadIdx < 0 || squadIdx > 2 || slotIdx < 0 || slotIdx > 3) return { ok: false, error: '部隊または枠が不正です' };
      var squad = state.relaySquads[squadIdx];
      if (!charId) {
        if (slotIdx < squad.length) squad.splice(slotIdx, 1);
        notifyChange('relay:change', { relaySquads: deepClone(state.relaySquads) });
        return { ok: true };
      }
      if (state.ownedChars.indexOf(charId) === -1) return { ok: false, error: '未所持のキャラクターです' };
      for (var q = 0; q < 3; q++) {
        var idx = state.relaySquads[q].indexOf(charId);
        if (idx !== -1) state.relaySquads[q].splice(idx, 1);
      }
      if (slotIdx < squad.length) squad[slotIdx] = charId;
      else if (squad.length < 4) squad.push(charId);
      else squad[3] = charId;
      notifyChange('relay:change', { relaySquads: deepClone(state.relaySquads) });
      return { ok: true };
    },

    toggleRelayChar: function (squadIdx, charId) {
      ensureInit();
      if (squadIdx < 0 || squadIdx > 2) return { ok: false };
      var squad = state.relaySquads[squadIdx];
      var existing = squad.indexOf(charId);
      if (existing !== -1) {
        squad.splice(existing, 1);
        notifyChange('relay:change', { relaySquads: deepClone(state.relaySquads) });
        return { ok: true, assigned: false };
      }
      for (var q = 0; q < 3; q++) {
        var oIdx = state.relaySquads[q].indexOf(charId);
        if (oIdx !== -1) state.relaySquads[q].splice(oIdx, 1);
      }
      if (squad.length >= 4) return { ok: false, error: '1部隊は最大4人までです' };
      squad.push(charId);
      notifyChange('relay:change', { relaySquads: deepClone(state.relaySquads) });
      return { ok: true, assigned: true };
    },

    autoFillRelaySquads: function () {
      ensureInit();
      var ordered = [];
      state.party.forEach(function (id) { if (id && ordered.indexOf(id) === -1) ordered.push(id); });
      state.links.forEach(function (id) { if (id && ordered.indexOf(id) === -1) ordered.push(id); });
      StateAPI.getOwnedChars().forEach(function (c) { if (ordered.indexOf(c.id) === -1) ordered.push(c.id); });
      state.relaySquads = [ordered.slice(0, 4), ordered.slice(4, 8), ordered.slice(8, 12)];
      notifyChange('relay:change', { relaySquads: deepClone(state.relaySquads) });
      return state.relaySquads;
    },

    getItem: function (uid) {
      ensureInit();
      for (var i = 0; i < state.inventory.length; i++) if (state.inventory[i].uid === uid) return state.inventory[i];
      return null;
    },

    getEquippedOwner: getEquippedOwner,

    equipItem: function (charId, uid) {
      ensureInit();
      if (state.ownedChars.indexOf(charId) === -1) return { ok: false, error: '未所持のキャラクターです' };
      var item = StateAPI.getItem(uid);
      if (!item) return { ok: false, error: '装備が見つかりません' };
      var def = getEquipDefById(item.defId);
      if (!def) return { ok: false, error: '装備定義が見つかりません' };

      var prevOwner = getEquippedOwner(uid);
      if (prevOwner && prevOwner !== charId) state.charProgress[prevOwner].equip[def.slot] = null;
      var cp = StateAPI.getCharProgress(charId);
      cp.equip[def.slot] = uid;
      notifyChange('equip:change', { charId: charId, slot: def.slot, uid: uid, prevOwner: prevOwner });
      return { ok: true, slot: def.slot, prevOwner: prevOwner };
    },

    unequipSlot: function (charId, slot) {
      ensureInit();
      var cp = StateAPI.getCharProgress(charId);
      if (!cp || !cp.equip) return { ok: false };
      cp.equip[slot] = null;
      notifyChange('equip:change', { charId: charId, slot: slot, uid: null });
      return { ok: true };
    },

    autoEquipChar: function (charId) {
      ensureInit();
      if (state.ownedChars.indexOf(charId) === -1) return { ok: false };
      var slots = getSlots();
      var cp = StateAPI.getCharProgress(charId);
      var changed = false;
      for (var s = 0; s < slots.length; s++) {
        var slot = slots[s];
        var bestUid = cp.equip[slot] || null;
        var bestScore = -1;
        for (var i = 0; i < state.inventory.length; i++) {
          var item = state.inventory[i];
          var def = getEquipDefById(item.defId);
          if (!def || def.slot !== slot) continue;
          var owner = getEquippedOwner(item.uid);
          if (owner && owner !== charId) continue;
          var score = item.quality;
          if (HS.Calc && typeof HS.Calc.calcUnitStats === 'function') {
            var ov = {};
            ov[slot] = item.uid;
            var preview = HS.Calc.calcUnitStats(charId, { overrideEquip: ov });
            score = (preview && preview.power) ? preview.power : item.quality;
          }
          if (score > bestScore) { bestScore = score; bestUid = item.uid; }
        }
        if (bestUid !== cp.equip[slot]) { cp.equip[slot] = bestUid; changed = true; }
      }
      if (changed) notifyChange('equip:change', { charId: charId, auto: true });
      return { ok: true, changed: changed };
    },

    toggleLockItem: function (uid) {
      ensureInit();
      var item = StateAPI.getItem(uid);
      if (!item) return { ok: false };
      item.locked = !item.locked;
      notifyChange('inventory:change', { uid: uid, locked: item.locked });
      return { ok: true, locked: item.locked };
    },

    getSellValue: getSellValue,
    shouldAutoSell: shouldAutoSell,

    receiveEquipment: function (defId, quality, opts) {
      ensureInit();
      opts = opts || {};
      var def = getEquipDefById(defId);
      var q = clamp(Math.round(Number(quality) || 1), 1, 100);
      var item = { uid: genUid('eq'), defId: defId, quality: q, locked: false, acquiredAt: Date.now() };
      state.codex.equips[defId] = true;

      if (!opts.skipAutoSell && shouldAutoSell(item, false)) {
        var gold = getSellValue(item);
        state.materials.gold = (state.materials.gold || 0) + gold;
        state.progress.totalAutoSold = (state.progress.totalAutoSold || 0) + 1;
        state.progress.totalAutoSoldGold = (state.progress.totalAutoSoldGold || 0) + gold;
        if (!opts.silent) notifyChange('inventory:change', { autoSold: true, item: item, gold: gold });
        return { item: item, def: def, autoSold: true, gold: gold, isMaxQuality: q === 100 };
      }

      state.inventory.push(item);
      if (!opts.silent) notifyChange('inventory:change', { autoSold: false, item: item });
      return { item: item, def: def, autoSold: false, gold: 0, isMaxQuality: q === 100 };
    },

    sellItem: function (uid) {
      ensureInit();
      var idx = -1;
      for (var i = 0; i < state.inventory.length; i++) if (state.inventory[i].uid === uid) { idx = i; break; }
      if (idx === -1) return { ok: false, error: '装備が見つかりません' };
      var item = state.inventory[idx];
      if (item.locked) return { ok: false, error: '保護中の装備は売却できません' };
      if (getEquippedOwner(uid)) return { ok: false, error: '装備中のアイテムは売却できません' };
      var gold = getSellValue(item);
      state.inventory.splice(idx, 1);
      state.materials.gold = (state.materials.gold || 0) + gold;
      notifyChange('inventory:change', { soldUid: uid, gold: gold });
      return { ok: true, gold: gold, item: item };
    },

    bulkAutoSell: function () {
      ensureInit();
      var soldCount = 0;
      var totalGold = 0;
      var kept = [];
      for (var i = 0; i < state.inventory.length; i++) {
        var item = state.inventory[i];
        if (shouldAutoSell(item, true)) {
          totalGold += getSellValue(item);
          soldCount += 1;
        } else {
          kept.push(item);
        }
      }
      if (soldCount > 0) {
        state.inventory = kept;
        state.materials.gold = (state.materials.gold || 0) + totalGold;
        state.progress.totalAutoSold = (state.progress.totalAutoSold || 0) + soldCount;
        state.progress.totalAutoSoldGold = (state.progress.totalAutoSoldGold || 0) + totalGold;
        notifyChange('inventory:change', { bulkSold: soldCount, gold: totalGold });
      }
      return { soldCount: soldCount, totalGold: totalGold };
    },

    updateAutoSell: function (patch) {
      ensureInit();
      if (!patch || typeof patch !== 'object') return state.autoSell;
      if (typeof patch.enabled === 'boolean') state.autoSell.enabled = patch.enabled;
      if (typeof patch.maxQualityToSell === 'number') state.autoSell.maxQualityToSell = clamp(Math.round(patch.maxQualityToSell), 0, 99);
      if (typeof patch.protectMaxQuality === 'boolean') state.autoSell.protectMaxQuality = patch.protectMaxQuality;
      if (Array.isArray(patch.keepSetIds)) state.autoSell.keepSetIds = patch.keepSetIds.slice();
      notifyChange('autosell:change', deepClone(state.autoSell));
      return state.autoSell;
    },

    getAbilityTierUnlockCost: getAbilityTierUnlockCost,

    unlockAbilityTier: function (role, tier) {
      ensureInit();
      var cur = state.abilities.unlockedTiers[role] || 1;
      if (tier <= cur) return { ok: false, error: 'すでに解放済みです' };
      if (tier > 5) return { ok: false, error: '最大段階です' };
      if (tier !== cur + 1) return { ok: false, error: '前の段階を先に解放してください' };
      var cost = getAbilityTierUnlockCost(role, tier);
      if (!canAfford(cost)) return { ok: false, error: '解放に必要な素材またはゴールドが不足しています' };

      spendCost(cost);
      state.abilities.unlockedTiers[role] = tier;
      var choices = getAbilitiesByRoleTier(role, tier);
      if (choices.length > 0) {
        state.abilities.equipped[role][tier] = choices[0].id;
        for (var i = 0; i < choices.length; i++) state.codex.abilities[choices[i].id] = true;
      }
      notifyChange('ability:change', { role: role, tier: tier, unlocked: true });
      return { ok: true, tier: tier };
    },

    equipAbility: function (role, tier, abilityId) {
      ensureInit();
      if (tier > (state.abilities.unlockedTiers[role] || 1)) return { ok: false, error: 'この段階はまだ未解放です' };
      var ab = getAbilityById(abilityId);
      if (!ab || ab.role !== role || ab.tier !== tier) return { ok: false, error: 'アビリティが一致しません' };
      state.abilities.equipped[role][tier] = abilityId;
      state.codex.abilities[abilityId] = true;
      Object.keys(state.abilities.extraEquipped).forEach(function (cid) {
        var map = state.abilities.extraEquipped[cid];
        if (map && map[tier] === abilityId) map[tier] = null;
      });
      notifyChange('ability:change', { role: role, tier: tier, abilityId: abilityId });
      return { ok: true };
    },

    equipExtraAbility: function (charId, tier, abilityId) {
      ensureInit();
      if (tier !== 1 && tier !== 3) return { ok: false, error: '追加枠は1段階・3段階のみ対応です' };
      var ch = getCharById(charId);
      if (!ch) return { ok: false, error: 'キャラクターが見つかりません' };
      if ((StateAPI.getCharProgress(charId).resonance || 0) < 5) return { ok: false, error: '異界共鳴5段階で解放されます' };
      if (tier > (state.abilities.unlockedTiers[ch.role] || 1)) return { ok: false, error: 'この段階のロールアビリティが未解放です' };

      if (!state.abilities.extraEquipped[charId]) state.abilities.extraEquipped[charId] = { 1: null, 3: null };
      if (!abilityId) {
        state.abilities.extraEquipped[charId][tier] = null;
        notifyChange('ability:change', { charId: charId, tier: tier, extra: true, abilityId: null });
        return { ok: true };
      }
      var ab = getAbilityById(abilityId);
      if (!ab || ab.role !== ch.role || ab.tier !== tier) return { ok: false, error: 'ロールまたは段階が一致しません' };
      if (state.abilities.equipped[ch.role][tier] === abilityId) return { ok: false, error: '基本枠と同じアビリティは重複装備できません' };
      state.abilities.extraEquipped[charId][tier] = abilityId;
      state.codex.abilities[abilityId] = true;
      notifyChange('ability:change', { charId: charId, tier: tier, extra: true, abilityId: abilityId });
      return { ok: true };
    },

    getSkillAwakenCost: getSkillAwakenCost,

    awakenSkill: function (charId, skillIdx) {
      ensureInit();
      if (skillIdx < 0 || skillIdx > 2) return { ok: false, error: 'スキル番号が不正です' };
      if (state.ownedChars.indexOf(charId) === -1) return { ok: false, error: '未所持のキャラクターです' };
      var cp = StateAPI.getCharProgress(charId);
      var cur = cp.skillAwaken[skillIdx] || 0;
      if (cur >= 3) return { ok: false, error: 'すでに最大覚醒(III)です' };
      var next = cur + 1;
      var cost = getSkillAwakenCost(charId, skillIdx, next);
      if (!canAfford(cost)) return { ok: false, error: '素材またはゴールドが不足しています' };
      spendCost(cost);
      cp.skillAwaken[skillIdx] = next;
      notifyChange('growth:change', { kind: 'skillAwaken', charId: charId, skillIdx: skillIdx, level: next });
      return { ok: true, level: next };
    },

    getResonanceCost: getResonanceCost,

    advanceResonance: function (charId) {
      ensureInit();
      if (state.ownedChars.indexOf(charId) === -1) return { ok: false, error: '未所持のキャラクターです' };
      var cp = StateAPI.getCharProgress(charId);
      var cur = cp.resonance || 0;
      if (cur >= 5) return { ok: false, error: '異界共鳴は最大(5段階)です' };
      var next = cur + 1;
      var cost = getResonanceCost(charId, next);
      if (!canAfford(cost)) return { ok: false, error: '素材またはゴールドが不足しています' };
      spendCost(cost);
      cp.resonance = next;
      if (next === 5) {
        var ch = getCharById(charId);
        if (ch) {
          if (!state.abilities.extraEquipped[charId]) state.abilities.extraEquipped[charId] = { 1: null, 3: null };
          var t1List = getAbilitiesByRoleTier(ch.role, 1);
          var mainT1 = state.abilities.equipped[ch.role][1];
          for (var i = 0; i < t1List.length; i++) {
            if (t1List[i].id !== mainT1) { state.abilities.extraEquipped[charId][1] = t1List[i].id; break; }
          }
        }
      }
      notifyChange('growth:change', { kind: 'resonance', charId: charId, stage: next });
      return { ok: true, stage: next };
    },

    unlockRelic: function (relicId) {
      ensureInit();
      if (!relicId) return { unlocked: false };
      if (state.relics.unlocked.indexOf(relicId) !== -1) return { unlocked: false, alreadyOwned: true };
      state.relics.unlocked.push(relicId);
      var emptyIdx = state.relics.equipped.indexOf(null);
      if (emptyIdx !== -1) state.relics.equipped[emptyIdx] = relicId;
      notifyChange('relic:change', { relicId: relicId, unlocked: true });
      return { unlocked: true, relic: getRelicById(relicId) };
    },

    setRelicSlot: function (slotIdx, relicId) {
      ensureInit();
      if (slotIdx < 0 || slotIdx > 2) return { ok: false };
      if (!relicId) {
        state.relics.equipped[slotIdx] = null;
        notifyChange('relic:change', { equipped: state.relics.equipped.slice() });
        return { ok: true };
      }
      if (state.relics.unlocked.indexOf(relicId) === -1) return { ok: false, error: '未獲得の世界遺物です' };
      var existing = state.relics.equipped.indexOf(relicId);
      if (existing !== -1) state.relics.equipped[existing] = state.relics.equipped[slotIdx];
      state.relics.equipped[slotIdx] = relicId;
      notifyChange('relic:change', { equipped: state.relics.equipped.slice() });
      return { ok: true };
    },

    toggleEquipRelic: function (relicId) {
      ensureInit();
      if (state.relics.unlocked.indexOf(relicId) === -1) return { ok: false, error: '未獲得の世界遺物です' };
      var idx = state.relics.equipped.indexOf(relicId);
      if (idx !== -1) {
        state.relics.equipped[idx] = null;
        notifyChange('relic:change', { equipped: state.relics.equipped.slice() });
        return { ok: true, equipped: false };
      }
      var empty = state.relics.equipped.indexOf(null);
      if (empty === -1) return { ok: false, error: '世界遺物は最大3つまで装備できます' };
      state.relics.equipped[empty] = relicId;
      notifyChange('relic:change', { equipped: state.relics.equipped.slice() });
      return { ok: true, equipped: true, slotIdx: empty };
    },

    selectStage: function (areaId, stageId) {
      ensureInit();
      state.progress.selectedMode = 'stage';
      if (areaId) state.progress.selectedAreaId = areaId;
      if (stageId) state.progress.selectedStageId = stageId;
      notifyChange('progress:change', { selectedAreaId: state.progress.selectedAreaId, selectedStageId: state.progress.selectedStageId });
    },

    isStageUnlocked: function (areaIdOrStageId, stageNum) {
      ensureInit();
      var areaId = areaIdOrStageId;
      var num = stageNum;
      if (num === undefined && HS.Data && HS.Data.STAGE_BY_ID && HS.Data.STAGE_BY_ID[areaIdOrStageId]) {
        var stObj = HS.Data.STAGE_BY_ID[areaIdOrStageId];
        areaId = stObj.areaId;
        num = stObj.stageNum;
      }
      var areas = (HS.Data && Array.isArray(HS.Data.AREAS)) ? HS.Data.AREAS : [];
      var areaIdx = -1;
      for (var i = 0; i < areas.length; i++) if (areas[i].id === areaId) { areaIdx = i; break; }
      if (areaIdx === -1) return true;
      var highest = state.progress.highestStageByArea[areaId] || 0;
      if (areaIdx === 0 && highest < 1) highest = 1;
      return num <= highest;
    },

    isTowerFloorUnlocked: function (floorNum) {
      ensureInit();
      return floorNum <= ((state.progress.towerHighest || 0) + 1);
    },

    recordStageClear: function (stageId) {
      ensureInit();
      var firstClear = !state.progress.clearedStages[stageId];
      state.progress.clearedStages[stageId] = (state.progress.clearedStages[stageId] || 0) + 1;
      state.progress.totalBattlesWon = (state.progress.totalBattlesWon || 0) + 1;

      var info = findStageInfo(stageId);
      if (info) {
        var areaId = info.area.id;
        var stageNum = info.stage.stageNum || (info.stageIdx + 1);
        var curHigh = state.progress.highestStageByArea[areaId] || 1;
        var totalInArea = info.area.stages ? info.area.stages.length : 10;
        if (stageNum >= curHigh && stageNum < totalInArea) {
          state.progress.highestStageByArea[areaId] = stageNum + 1;
        }
        var areas = HS.Data.AREAS || [];
        if (stageNum >= totalInArea && areas[info.areaIdx + 1]) {
          var nextAreaId = areas[info.areaIdx + 1].id;
          if ((state.progress.highestStageByArea[nextAreaId] || 0) < 1) {
            state.progress.highestStageByArea[nextAreaId] = 1;
          }
        }
      }
      notifyChange('progress:change', { stageId: stageId, firstClear: firstClear });
      return { firstClear: firstClear, clears: state.progress.clearedStages[stageId] };
    },

    recordIntruderKill: function (intruderId) {
      ensureInit();
      if (!intruderId) return 0;
      state.progress.intruderKills[intruderId] = (state.progress.intruderKills[intruderId] || 0) + 1;
      notifyChange('progress:change', { intruderId: intruderId, kills: state.progress.intruderKills[intruderId] });
      return state.progress.intruderKills[intruderId];
    },

    recordTowerClear: function (floorNum) {
      ensureInit();
      var key = String(floorNum);
      var firstClear = !state.progress.towerCleared[key];
      state.progress.towerCleared[key] = true;
      if (floorNum > (state.progress.towerHighest || 0)) state.progress.towerHighest = floorNum;
      state.progress.totalBattlesWon = (state.progress.totalBattlesWon || 0) + 1;
      notifyChange('progress:change', { towerFloor: floorNum, firstClear: firstClear });
      return { firstClear: firstClear };
    },

    recordSuperbossDamage: function (bossId, totalDamage) {
      ensureInit();
      var prev = state.progress.superbossBest[bossId] || 0;
      var isNewRecord = totalDamage > prev;
      if (isNewRecord) state.progress.superbossBest[bossId] = Math.floor(totalDamage);
      if (!Array.isArray(state.progress.superbossClaimed[bossId])) state.progress.superbossClaimed[bossId] = [];
      state.progress.totalBattlesWon = (state.progress.totalBattlesWon || 0) + 1;
      notifyChange('progress:change', { superbossId: bossId, damage: totalDamage, isNewRecord: isNewRecord });
      return { isNewRecord: isNewRecord, best: state.progress.superbossBest[bossId], prev: prev };
    },

    recordRelayClear: function (raidId) {
      ensureInit();
      var firstClear = !state.progress.relayCleared[raidId];
      state.progress.relayCleared[raidId] = (state.progress.relayCleared[raidId] || 0) + 1;
      state.progress.totalBattlesWon = (state.progress.totalBattlesWon || 0) + 1;
      notifyChange('progress:change', { relayId: raidId, firstClear: firstClear });
      return { firstClear: firstClear };
    },

    recordBountyClear: function (bountyId) {
      ensureInit();
      var firstClear = !state.progress.bountyCleared[bountyId];
      state.progress.bountyCleared[bountyId] = (state.progress.bountyCleared[bountyId] || 0) + 1;
      state.progress.totalBattlesWon = (state.progress.totalBattlesWon || 0) + 1;
      notifyChange('progress:change', { bountyId: bountyId, firstClear: firstClear });
      return { firstClear: firstClear, clears: state.progress.bountyCleared[bountyId] };
    },

    markCodex: function (kind, id, silent) {
      ensureInit();
      if (!kind || !id || !state.codex[kind]) return false;
      if (state.codex[kind][id]) return false;
      state.codex[kind][id] = true;
      if (!silent) notifyChange('codex:change', { kind: kind, id: id });
      return true;
    },

    updateSettings: function (patch) {
      ensureInit();
      if (!patch || typeof patch !== 'object') return state.settings;
      if (typeof patch.speed === 'number' && [1, 2, 3].indexOf(patch.speed) !== -1) state.settings.speed = patch.speed;
      if (typeof patch.wakeLock === 'boolean') state.settings.wakeLock = patch.wakeLock;
      if (typeof patch.showCutin === 'boolean') state.settings.showCutin = patch.showCutin;
      if (typeof patch.compactFx === 'boolean') state.settings.compactFx = patch.compactFx;
      notifyChange('settings:change', deepClone(state.settings));
      return state.settings;
    },

    cycleSpeed: function () {
      ensureInit();
      var speeds = (HS.CONST && HS.CONST.SPEEDS) ? HS.CONST.SPEEDS : [1, 2, 3];
      var next = speeds[(speeds.indexOf(state.settings.speed) + 1) % speeds.length];
      StateAPI.updateSettings({ speed: next });
      return next;
    }
  };

  HS.State = StateAPI;
  HS.Engine.State = StateAPI;
})(typeof window !== 'undefined' ? window : globalThis);
