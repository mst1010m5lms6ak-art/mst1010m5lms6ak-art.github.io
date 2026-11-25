(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};

  var DB_NAME = 'hachamecha_sekai_db';
  var DB_VERSION = 1;
  var STORE_NAME = 'saves';
  var SAVE_KEY = 'main';
  var LS_KEY = 'hachamecha_sekai_save_v1';
  var EXPORT_PREFIX = 'HS1:';

  var dbInstance = null;
  var idbAvailable = false;
  var memoryFallback = null;

  function computeChecksum(str) {
    var hash = 2166136261;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function utf8ToBase64(str) {
    if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
      var bytes = new TextEncoder().encode(str);
      var bin = '';
      var chunk = 0x8000;
      for (var i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(bin);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8').toString('base64');
    }
    return btoa(unescape(encodeURIComponent(str)));
  }

  function base64ToUtf8(b64) {
    if (typeof TextDecoder !== 'undefined' && typeof atob === 'function') {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf8');
    }
    return decodeURIComponent(escape(atob(b64)));
  }

  function readLocalStorage() {
    try {
      if (typeof global.localStorage === 'undefined') return null;
      var raw = global.localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocalStorage(state) {
    try {
      if (typeof global.localStorage === 'undefined') return false;
      global.localStorage.setItem(LS_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function removeLocalStorage() {
    try {
      if (typeof global.localStorage !== 'undefined') {
        global.localStorage.removeItem(LS_KEY);
      }
    } catch (e) {
      // ignore
    }
  }

  function init() {
    return new Promise(function (resolve) {
      if (dbInstance) {
        resolve(true);
        return;
      }
      if (typeof global.indexedDB === 'undefined') {
        idbAvailable = false;
        resolve(false);
        return;
      }
      try {
        var req = global.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (ev) {
          var db = ev.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = function (ev) {
          dbInstance = ev.target.result;
          idbAvailable = true;
          if (global.navigator && global.navigator.storage && typeof global.navigator.storage.persist === 'function') {
            try { global.navigator.storage.persist().catch(function () {}); } catch (e) {}
          }
          resolve(true);
        };
        req.onerror = function () {
          idbAvailable = false;
          resolve(false);
        };
      } catch (e) {
        idbAvailable = false;
        resolve(false);
      }
    });
  }

  function readIdb() {
    return new Promise(function (resolve) {
      if (!idbAvailable || !dbInstance) {
        resolve(null);
        return;
      }
      try {
        var tx = dbInstance.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.get(SAVE_KEY);
        req.onsuccess = function () {
          var val = req.result;
          resolve(val && typeof val === 'object' ? val : null);
        };
        req.onerror = function () { resolve(null); };
      } catch (e) {
        resolve(null);
      }
    });
  }

  function writeIdb(state) {
    return new Promise(function (resolve) {
      if (!idbAvailable || !dbInstance) {
        resolve(false);
        return;
      }
      try {
        var tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.put(state, SAVE_KEY);
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { resolve(false); };
      } catch (e) {
        resolve(false);
      }
    });
  }

  function clearIdb() {
    return new Promise(function (resolve) {
      if (!idbAvailable || !dbInstance) {
        resolve(false);
        return;
      }
      try {
        var tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.delete(SAVE_KEY);
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { resolve(false); };
      } catch (e) {
        resolve(false);
      }
    });
  }

  function load() {
    return init().then(function () {
      return readIdb();
    }).then(function (idbData) {
      var lsData = readLocalStorage();
      if (idbData && lsData) {
        var idbTs = Number(idbData._savedAt || 0);
        var lsTs = Number(lsData._savedAt || 0);
        return lsTs > idbTs ? lsData : idbData;
      }
      return idbData || lsData || memoryFallback;
    });
  }

  function save(state) {
    if (!state || typeof state !== 'object') {
      return Promise.resolve(false);
    }
    var payload = JSON.parse(JSON.stringify(state));
    payload._savedAt = Date.now();
    payload._version = HS.VERSION || '1.0.0';
    memoryFallback = payload;
    writeLocalStorage(payload);
    return init().then(function () {
      return writeIdb(payload);
    }).then(function () {
      return true;
    });
  }

  function exportString(state) {
    var payload = JSON.parse(JSON.stringify(state || {}));
    payload._exportedAt = Date.now();
    payload._version = HS.VERSION || '1.0.0';
    var json = JSON.stringify(payload);
    var b64 = utf8ToBase64(json);
    var sum = computeChecksum(b64);
    return EXPORT_PREFIX + sum + ':' + b64;
  }

  function importString(str) {
    if (typeof str !== 'string') {
      throw new Error('バックアップ文字列が空です');
    }
    var rawTrimmed = str.trim();
    if (!rawTrimmed) {
      throw new Error('バックアップ文字列が空です');
    }
    if (rawTrimmed.indexOf('{') === 0) {
      var rawObj = JSON.parse(rawTrimmed);
      if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
        throw new Error('セーブデータの形式が正しくありません');
      }
      return rawObj;
    }
    var trimmed = rawTrimmed.replace(/\s+/g, '');
    if (trimmed.indexOf(EXPORT_PREFIX) !== 0) {
      throw new Error('先頭が HS1: で始まるバックアップ文字列を入力してください');
    }
    var rest = trimmed.slice(EXPORT_PREFIX.length);
    var sep = rest.indexOf(':');
    if (sep <= 0) {
      throw new Error('バックアップ文字列の区切りが破損しています');
    }
    var sum = rest.slice(0, sep);
    var b64 = rest.slice(sep + 1);
    if (computeChecksum(b64) !== sum) {
      throw new Error('バックアップ文字列の検証に失敗しました（途中で欠けている可能性があります）');
    }
    var json = base64ToUtf8(b64);
    var parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('セーブデータの中身が不正です');
    }
    return parsed;
  }

  function clearAll() {
    memoryFallback = null;
    removeLocalStorage();
    return init().then(function () {
      return clearIdb();
    }).then(function () {
      return true;
    });
  }

  HS.Storage = {
    DB_NAME: DB_NAME,
    LS_KEY: LS_KEY,
    init: init,
    load: load,
    save: save,
    exportString: exportString,
    importString: importString,
    clearAll: clearAll
  };
})(typeof window !== 'undefined' ? window : globalThis);
