(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  var C = HS.CONST;

  var ELEMENT_ORDER = {};
  C.ELEMENTS.forEach(function (el, idx) { ELEMENT_ORDER[el] = idx; });

  var RACE_ORDER = {};
  C.RACES.forEach(function (r, idx) { RACE_ORDER[r] = idx; });

  var ROLE_ORDER = {};
  C.ROLES.forEach(function (role, idx) { ROLE_ORDER[role] = idx; });

  var SLOT_ORDER = {};
  C.SLOTS.forEach(function (slot, idx) { SLOT_ORDER[slot] = idx; });

  var uidCounter = 0;

  function elementIndex(el) {
    return Object.prototype.hasOwnProperty.call(ELEMENT_ORDER, el) ? ELEMENT_ORDER[el] : 99;
  }

  function raceIndex(r) {
    return Object.prototype.hasOwnProperty.call(RACE_ORDER, r) ? RACE_ORDER[r] : 99;
  }

  function roleIndex(role) {
    if (role == null || role === '') return -1;
    return Object.prototype.hasOwnProperty.call(ROLE_ORDER, role) ? ROLE_ORDER[role] : 99;
  }

  function slotIndex(slot) {
    if (slot == null || slot === '') return -1;
    return Object.prototype.hasOwnProperty.call(SLOT_ORDER, slot) ? SLOT_ORDER[slot] : 99;
  }

  function normalizeRaces(races) {
    if (!races) return [];
    var arr = Array.isArray(races) ? races.slice() : [races];
    var seen = {};
    var unique = [];
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (r && !seen[r]) {
        seen[r] = true;
        unique.push(r);
      }
    }
    unique.sort(function (a, b) { return raceIndex(a) - raceIndex(b); });
    return unique;
  }

  function compareRaces(racesA, racesB) {
    var a = Array.isArray(racesA) ? racesA : (racesA ? [racesA] : []);
    var b = Array.isArray(racesB) ? racesB : (racesB ? [racesB] : []);
    var a0 = a.length > 0 ? raceIndex(a[0]) : 99;
    var b0 = b.length > 0 ? raceIndex(b[0]) : 99;
    if (a0 !== b0) return a0 - b0;
    var a1 = a.length > 1 ? raceIndex(a[1]) : -1;
    var b1 = b.length > 1 ? raceIndex(b[1]) : -1;
    if (a1 !== b1) return a1 - b1;
    return 0;
  }

  function compareKana(a, b) {
    var ka = (a && (a.kana || a.name)) || '';
    var kb = (b && (b.kana || b.name)) || '';
    if (ka === kb) return 0;
    return ka.localeCompare(kb, 'ja');
  }

  /**
   * 厳密ソート規則:
   * 1. 属性順: 炎→水→風→光→闇→無
   * 2. 種族順: 人間→竜→神→魔物→妖精→獣→機械（単一種族の直後に複合種族）
   * 3. ロール順: タンク→ディーラー→サポーター→ヒーラー
   * 4. 五十音順
   */
  function compareCatalog(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    var eDiff = elementIndex(a.element) - elementIndex(b.element);
    if (eDiff !== 0) return eDiff;

    var rDiff = compareRaces(a.races, b.races);
    if (rDiff !== 0) return rDiff;

    var roleDiff = roleIndex(a.role) - roleIndex(b.role);
    if (roleDiff !== 0) return roleDiff;

    var kDiff = compareKana(a, b);
    if (kDiff !== 0) return kDiff;

    var sDiff = slotIndex(a.slot) - slotIndex(b.slot);
    if (sDiff !== 0) return sDiff;

    return String(a.id || '').localeCompare(String(b.id || ''));
  }

  function sortCharacters(list) {
    return (list || []).slice().sort(compareCatalog);
  }

  function sortEnemies(list) {
    return (list || []).slice().sort(compareCatalog);
  }

  function sortEquipDefs(list) {
    return (list || []).slice().sort(compareCatalog);
  }

  function sortEquipItems(list, equipDefMap) {
    var map = equipDefMap || (HS.Data && HS.Data.EQUIP_DEF_BY_ID) || {};
    return (list || []).slice().sort(function (a, b) {
      var defA = map[a.defId];
      var defB = map[b.defId];
      var cDiff = compareCatalog(defA, defB);
      if (cDiff !== 0) return cDiff;
      var qDiff = (b.quality || 0) - (a.quality || 0);
      if (qDiff !== 0) return qDiff;
      return String(a.uid || '').localeCompare(String(b.uid || ''));
    });
  }

  function sortAbilities(list) {
    return (list || []).slice().sort(function (a, b) {
      var rDiff = roleIndex(a.role) - roleIndex(b.role);
      if (rDiff !== 0) return rDiff;
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.idx !== b.idx) return a.idx - b.idx;
      return compareKana(a, b);
    });
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function getQualityTier(q) {
    var val = clamp(Math.round(q || 1), C.QUALITY_MIN, C.QUALITY_MAX);
    var tiers = C.QUALITY_TIERS;
    for (var i = 0; i < tiers.length; i++) {
      if (val >= tiers[i].min && val <= tiers[i].max) return tiers[i];
    }
    return tiers[0];
  }

  function qualityMultiplier(q) {
    var val = clamp(Math.round(q || 1), C.QUALITY_MIN, C.QUALITY_MAX);
    if (val >= 100) return 1.60;
    return 0.60 + ((val - 1) / 98) * 0.85;
  }

  function formatExact(n) {
    var num = Math.round(Number(n) || 0);
    return num.toLocaleString('ja-JP');
  }

  function formatNum(n) {
    var num = Math.round(Number(n) || 0);
    var abs = Math.abs(num);
    var sign = num < 0 ? '-' : '';
    if (abs < 100000) {
      return num.toLocaleString('ja-JP');
    }
    if (abs < 100000000) {
      var man = abs / 10000;
      return sign + (man >= 100 ? Math.floor(man) : man.toFixed(1).replace(/\.0$/, '')) + '万';
    }
    var oku = abs / 100000000;
    return sign + (oku >= 100 ? Math.floor(oku) : oku.toFixed(2).replace(/\.?0+$/, '')) + '億';
  }

  function formatPct(val, showSign) {
    var pct = Math.round((Number(val) || 0) * 100);
    var prefix = (showSign && pct > 0) ? '+' : '';
    return prefix + pct + '%';
  }

  function randInt(min, max) {
    var lo = Math.ceil(min);
    var hi = Math.floor(max);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  function randFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function weightedPick(items, weightFn) {
    if (!items || items.length === 0) return null;
    var total = 0;
    var weights = new Array(items.length);
    for (var i = 0; i < items.length; i++) {
      var w = Math.max(0, Number(weightFn ? weightFn(items[i], i) : items[i].weight) || 0);
      weights[i] = w;
      total += w;
    }
    if (total <= 0) return items[0];
    var r = Math.random() * total;
    var acc = 0;
    for (var j = 0; j < items.length; j++) {
      acc += weights[j];
      if (r <= acc) return items[j];
    }
    return items[items.length - 1];
  }

  function shuffle(arr) {
    var copy = (arr || []).slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function uid(prefix) {
    uidCounter += 1;
    var p = prefix || 'id';
    return p + '_' + Date.now().toString(36) + '_' + uidCounter.toString(36) + '_' + Math.floor(Math.random() * 1296).toString(36);
  }

  function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj));
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function appendChildSafe(parent, child) {
    if (child == null || child === false || child === true) return;
    if (Array.isArray(child)) {
      for (var i = 0; i < child.length; i++) {
        appendChildSafe(parent, child[i]);
      }
      return;
    }
    if (typeof child === 'string' || typeof child === 'number') {
      parent.appendChild(document.createTextNode(String(child)));
      return;
    }
    parent.appendChild(child);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs && typeof attrs === 'object') {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class' || k === 'className') {
          node.className = String(v);
        } else if (k === 'text') {
          node.textContent = String(v);
        } else if (k === 'html') {
          node.innerHTML = String(v);
        } else if (k === 'dataset' && typeof v === 'object') {
          var dKeys = Object.keys(v);
          for (var d = 0; d < dKeys.length; d++) {
            if (v[dKeys[d]] != null) node.dataset[dKeys[d]] = String(v[dKeys[d]]);
          }
        } else if (k === 'style' && typeof v === 'object') {
          var sKeys = Object.keys(v);
          for (var s = 0; s < sKeys.length; s++) {
            var sk = sKeys[s];
            if (sk.indexOf('--') === 0) {
              node.style.setProperty(sk, String(v[sk]));
            } else {
              node.style[sk] = v[sk];
            }
          }
        } else if (k.indexOf('on') === 0 && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v === true) {
          node.setAttribute(k, '');
        } else {
          node.setAttribute(k, String(v));
        }
      }
    }
    if (children !== undefined) {
      appendChildSafe(node, children);
    }
    return node;
  }

  HS.Utils = {
    elementIndex: elementIndex,
    raceIndex: raceIndex,
    roleIndex: roleIndex,
    slotIndex: slotIndex,
    normalizeRaces: normalizeRaces,
    compareRaces: compareRaces,
    compareKana: compareKana,
    compareCatalog: compareCatalog,
    sortCharacters: sortCharacters,
    sortEnemies: sortEnemies,
    sortEquipDefs: sortEquipDefs,
    sortEquipItems: sortEquipItems,
    sortAbilities: sortAbilities,
    getQualityTier: getQualityTier,
    qualityMultiplier: qualityMultiplier,
    formatNum: formatNum,
    formatExact: formatExact,
    formatPct: formatPct,
    clamp: clamp,
    randInt: randInt,
    randFloat: randFloat,
    pickRandom: pickRandom,
    weightedPick: weightedPick,
    shuffle: shuffle,
    uid: uid,
    deepClone: deepClone,
    escapeHtml: escapeHtml,
    el: el
  };
})(typeof window !== 'undefined' ? window : globalThis);
