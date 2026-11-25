(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.Engine = HS.Engine || {};

  function randInt(min, max) {
    if (HS.Utils && typeof HS.Utils.randInt === 'function') return HS.Utils.randInt(min, max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    if (HS.Utils && typeof HS.Utils.pickRandom === 'function') return HS.Utils.pickRandom(arr);
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getRouteById(routeId) {
    if (HS.Data && HS.Data.EXPEDITION_BY_ID && HS.Data.EXPEDITION_BY_ID[routeId]) {
      return HS.Data.EXPEDITION_BY_ID[routeId];
    }
    var list = (HS.Data && Array.isArray(HS.Data.EXPEDITIONS)) ? HS.Data.EXPEDITIONS : [];
    for (var i = 0; i < list.length; i++) if (list[i].id === routeId) return list[i];
    return list[0] || null;
  }

  function getCharById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.CHAR_BY_ID && HS.Data.CHAR_BY_ID[id]) return HS.Data.CHAR_BY_ID[id];
    var list = HS.Data.CHARACTERS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getEquipDefsBySetIds(setIds) {
    var defs = (HS.Data && Array.isArray(HS.Data.EQUIP_DEFS)) ? HS.Data.EQUIP_DEFS : [];
    if (!Array.isArray(setIds) || !setIds.length) return defs;
    var filtered = defs.filter(function (d) { return setIds.indexOf(d.setId) !== -1; });
    return filtered.length ? filtered : defs;
  }

  function evaluateSquad(routeId, charIds) {
    var route = getRouteById(routeId);
    var ids = Array.isArray(charIds) ? charIds.filter(Boolean) : [];
    if (!route || ids.length === 0) {
      return {
        valid: false,
        route: route,
        memberCount: 0,
        matchScore: 0,
        matchPercent: 0,
        qualityBonus: 0,
        bonusDropChance: 0,
        matchedTags: []
      };
    }

    var prefRaces = Array.isArray(route.prefRaces) ? route.prefRaces : [];
    var prefElements = Array.isArray(route.prefElements) ? route.prefElements : [];
    var prefRole = route.prefRole || null;

    var matchScore = ids.length * 10;
    var bonusCount = 0;
    var matchedTags = [];

    for (var i = 0; i < ids.length; i++) {
      var ch = getCharById(ids[i]);
      if (!ch) continue;
      // Dual-race characters trigger DOUBLE bonus when both races match!
      var races = Array.isArray(ch.races) ? ch.races : [];
      var raceHits = 0;
      for (var r = 0; r < races.length; r++) {
        if (prefRaces.indexOf(races[r]) !== -1) {
          raceHits++;
          matchScore += 20;
        }
      }
      if (raceHits >= 2) {
        matchScore += 15;
        bonusCount += 2;
        matchedTags.push(ch.name + '(複合種族W適性)');
      } else if (raceHits === 1) {
        bonusCount += 1;
        matchedTags.push(ch.name + '(種族適性)');
      }
      if (ch.element && prefElements.indexOf(ch.element) !== -1) {
        matchScore += 15;
        bonusCount += 1;
        matchedTags.push(ch.name + '(属性適性)');
      }
      if (prefRole && ch.role === prefRole) {
        matchScore += 15;
        bonusCount += 1;
        matchedTags.push(ch.name + '(ロール適性)');
      }
    }

    var matchPercent = Math.min(180, matchScore);
    var qualityBonus = Math.min(24, Math.floor(matchPercent / 7));
    var bonusDropChance = Math.min(100, 20 + Math.floor(matchPercent * 0.65));

    return {
      valid: true,
      route: route,
      memberCount: ids.length,
      matchScore: matchScore,
      matchPercent: matchPercent,
      qualityBonus: qualityBonus,
      bonusDropChance: bonusDropChance,
      bonusCount: bonusCount,
      matchedTags: matchedTags,
      prefs: {
        elements: prefElements,
        races: prefRaces,
        role: prefRole
      }
    };
  }

  function rollQuality(qRange, bonus) {
    var minQ = (Array.isArray(qRange) && qRange[0]) ? qRange[0] : 35;
    var maxQ = (Array.isArray(qRange) && qRange[1]) ? qRange[1] : 88;
    var lo = Math.min(96, minQ + Math.floor(bonus * 0.6));
    var hi = Math.min(100, maxQ + bonus);
    var q = randInt(lo, hi);
    if (q >= 96 && Math.random() < (0.12 + bonus * 0.005)) q = 100;
    return Math.max(1, Math.min(100, q));
  }

  var ExpeditionAPI = {
    getRoutes: function () {
      return (HS.Data && Array.isArray(HS.Data.EXPEDITIONS)) ? HS.Data.EXPEDITIONS : [];
    },

    getRouteById: getRouteById,
    evaluateSquad: evaluateSquad,

    getSlot: function (slotIdx) {
      var s = HS.State.get();
      return s.expeditions[slotIdx] || null;
    },

    setRoute: function (slotIdx, routeId) {
      var s = HS.State.get();
      if (!s.expeditions[slotIdx]) return { ok: false, error: '枠が不正です' };
      var route = getRouteById(routeId);
      if (!route) return { ok: false, error: '派遣先が見つかりません' };
      if (s.expeditions[slotIdx].routeId !== route.id || s.expeditions[slotIdx].paused) {
        s.expeditions[slotIdx].routeId = route.id;
        s.expeditions[slotIdx].progress = 0;
        s.expeditions[slotIdx].paused = false;
        HS.State.scheduleSave();
        HS.State.emit('expedition:change', { slotIdx: slotIdx, expedition: s.expeditions[slotIdx] });
        HS.State.emit('state:change', { event: 'expedition:change', slotIdx: slotIdx });
      }
      return { ok: true };
    },

    setAutoRestart: function (slotIdx, enabled) {
      var s = HS.State.get();
      if (!s.expeditions[slotIdx]) return { ok: false };
      s.expeditions[slotIdx].autoRestart = Boolean(enabled);
      if (s.expeditions[slotIdx].autoRestart && s.expeditions[slotIdx].paused) {
        s.expeditions[slotIdx].paused = false;
        s.expeditions[slotIdx].progress = 0;
      }
      HS.State.scheduleSave();
      HS.State.emit('expedition:change', { slotIdx: slotIdx, expedition: s.expeditions[slotIdx] });
      HS.State.emit('state:change', { event: 'expedition:change', slotIdx: slotIdx });
      return { ok: true };
    },

    resume: function (slotIdx) {
      var s = HS.State.get();
      var slot = s.expeditions[slotIdx];
      if (!slot) return { ok: false, error: '枠が不正です' };
      if (!slot.routeId || !Array.isArray(slot.charIds) || slot.charIds.length === 0) {
        return { ok: false, error: '別働隊メンバーを1人以上編成してください' };
      }
      slot.paused = false;
      slot.progress = 0;
      HS.State.scheduleSave();
      HS.State.emit('expedition:change', { slotIdx: slotIdx, expedition: slot });
      HS.State.emit('state:change', { event: 'expedition:change', slotIdx: slotIdx });
      return { ok: true };
    },

    restart: function (slotIdx) {
      return ExpeditionAPI.resume(slotIdx);
    },

    toggleChar: function (slotIdx, charId) {
      var s = HS.State.get();
      var slot = s.expeditions[slotIdx];
      if (!slot) return { ok: false, error: '枠が不正です' };

      var existingIdx = slot.charIds.indexOf(charId);
      if (existingIdx !== -1) {
        slot.charIds.splice(existingIdx, 1);
        HS.State.scheduleSave();
        HS.State.emit('expedition:change', { slotIdx: slotIdx, expedition: slot });
        HS.State.emit('state:change', { event: 'expedition:change', slotIdx: slotIdx });
        return { ok: true, assigned: false };
      }

      if (!HS.State.isCharOwned(charId)) return { ok: false, error: '未所持のキャラクターです' };
      if (HS.State.isInActivePartyOrLinks(charId)) {
        return { ok: false, error: '出撃メンバーまたは控えリンク中のキャラは別働隊に配置できません' };
      }
      var otherIdx = slotIdx === 0 ? 1 : 0;
      if (s.expeditions[otherIdx] && s.expeditions[otherIdx].charIds.indexOf(charId) !== -1) {
        return { ok: false, error: '別の別働隊に配置中です' };
      }
      if (slot.charIds.length >= 4) return { ok: false, error: '別働隊は最大4人までです' };

      slot.charIds.push(charId);
      HS.State.scheduleSave();
      HS.State.emit('expedition:change', { slotIdx: slotIdx, expedition: slot });
      HS.State.emit('state:change', { event: 'expedition:change', slotIdx: slotIdx });
      return { ok: true, assigned: true };
    },

    setSquad: function (slotIdx, charIds) {
      var s = HS.State.get();
      var slot = s.expeditions[slotIdx];
      if (!slot) return { ok: false };
      var otherIdx = slotIdx === 0 ? 1 : 0;
      var otherChars = (s.expeditions[otherIdx] && s.expeditions[otherIdx].charIds) || [];
      var clean = [];
      for (var i = 0; i < charIds.length && clean.length < 4; i++) {
        var cid = charIds[i];
        if (!cid || clean.indexOf(cid) !== -1) continue;
        if (!HS.State.isCharOwned(cid)) continue;
        if (HS.State.isInActivePartyOrLinks(cid)) continue;
        if (otherChars.indexOf(cid) !== -1) continue;
        clean.push(cid);
      }
      slot.charIds = clean;
      HS.State.scheduleSave();
      HS.State.emit('expedition:change', { slotIdx: slotIdx, expedition: slot });
      HS.State.emit('state:change', { event: 'expedition:change', slotIdx: slotIdx });
      return { ok: true, charIds: clean };
    },

    autoFillSquad: function (slotIdx) {
      var s = HS.State.get();
      var slot = s.expeditions[slotIdx];
      if (!slot) return { ok: false };
      var avail = HS.State.getAvailableForExpedition(slotIdx);
      if (!avail.length) return { ok: false, error: '待機中の仲間がいません' };

      var route = getRouteById(slot.routeId);
      var prefRaces = (route && route.prefRaces) || [];
      var prefEls = (route && route.prefElements) || [];
      var prefRole = route ? route.prefRole : null;

      var scored = avail.map(function (c) {
        var sc = 0;
        var races = Array.isArray(c.races) ? c.races : [];
        for (var r = 0; r < races.length; r++) {
          if (prefRaces.indexOf(races[r]) !== -1) sc += 25;
        }
        if (c.element && prefEls.indexOf(c.element) !== -1) sc += 15;
        if (prefRole && c.role === prefRole) sc += 15;
        return { id: c.id, score: sc };
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      return ExpeditionAPI.setSquad(slotIdx, scored.slice(0, 4).map(function (x) { return x.id; }));
    },

    // ZERO real-time timers! Advances strictly when a battle is won!
    onBattleWin: function (context) {
      var s = HS.State.get();
      var completions = [];
      var changed = false;
      var relicDrop = (HS.Calc && typeof HS.Calc.calcPartyDropBonuses === 'function')
        ? HS.Calc.calcPartyDropBonuses()
        : { dropGoldPct: 0, dropQualityBonus: 0 };

      for (var i = 0; i < s.expeditions.length; i++) {
        var slot = s.expeditions[i];
        if (!slot || !slot.routeId || !Array.isArray(slot.charIds) || slot.charIds.length === 0) continue;
        if (slot.paused) continue;
        var route = getRouteById(slot.routeId);
        if (!route) continue;

        var required = Math.max(1, route.battlesRequired || 5);
        slot.progress += 1;
        changed = true;

        if (slot.progress >= required) {
          var evalInfo = evaluateSquad(route.id, slot.charIds);
          var mult = 1 + (evalInfo.matchPercent / 100);
          var rw = route.rewards || {};

          var gold = Math.round((rw.gold || 500) * mult * (1 + (relicDrop.dropGoldPct || 0)));
          var matRewards = {};
          HS.State.addMaterial('gold', gold, true);

          if (rw.matId && rw.matQty) {
            var mq = Math.max(1, Math.round(rw.matQty * mult));
            matRewards[rw.matId] = (matRewards[rw.matId] || 0) + mq;
            HS.State.addMaterial(rw.matId, mq, true);
          }
          if (rw.chaosShard) {
            var cq = Math.max(1, Math.round(rw.chaosShard * (1 + evalInfo.matchPercent / 200)));
            matRewards.chaosShard = (matRewards.chaosShard || 0) + cq;
            HS.State.addMaterial('chaosShard', cq, true);
          }

          var dropCount = 1 + (Math.random() * 100 < evalInfo.bonusDropChance ? 1 : 0);
          var equipPool = getEquipDefsBySetIds(rw.dropSets || []);
          var drops = [];
          var autoSoldCount = 0;
          var autoSoldGold = 0;

          for (var d = 0; d < dropCount; d++) {
            var def = pickRandom(equipPool);
            if (!def) continue;
            var q = rollQuality(rw.qualityRange, evalInfo.qualityBonus + (relicDrop.dropQualityBonus || 0));
            var rec = HS.State.receiveEquipment(def.id, q, { silent: true });
            drops.push(rec);
            if (rec.autoSold) {
              autoSoldCount++;
              autoSoldGold += rec.gold;
            }
          }

          slot.completions = (slot.completions || 0) + 1;
          slot.progress = 0;
          slot.paused = !slot.autoRestart;

          var summary = {
            slotIdx: i,
            routeId: route.id,
            routeName: route.name || ('別働隊ルート' + (i + 1)),
            matchPercent: evalInfo.matchPercent,
            gold: gold,
            materials: matRewards,
            drops: drops,
            autoSoldCount: autoSoldCount,
            autoSoldGold: autoSoldGold,
            completions: slot.completions,
            pausedAfterReturn: Boolean(slot.paused),
            context: context || null
          };
          completions.push(summary);
          HS.State.emit('expedition:complete', summary);
        }
      }

      if (changed) {
        HS.State.scheduleSave();
        HS.State.emit('expedition:change', { expeditions: s.expeditions });
        HS.State.emit('state:change', { event: 'expedition:progress' });
      }

      return completions;
    }
  };

  HS.Expedition = ExpeditionAPI;
  HS.Engine.Expedition = ExpeditionAPI;
})(typeof window !== 'undefined' ? window : globalThis);
