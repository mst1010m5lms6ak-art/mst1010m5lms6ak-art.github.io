/* ==========================================================================
   storage.js - IndexedDB + localStorage 二重オフライン永続保存 & JSON入出力
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});
  const DB_NAME = 'HachamechaSekaiDB';
  const STORE_NAME = 'saves';
  const SAVE_KEY = 'hachamecha_sekai_save_v1';

  let dbPromise = null;
  let persistRequested = false;

  function openDB() {
    if (!global.indexedDB) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      try {
        const req = global.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return dbPromise;
  }

  async function requestPersistence() {
    if (persistRequested) return;
    persistRequested = true;
    try {
      if (navigator.storage && navigator.storage.persist) {
        const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
        if (!already) await navigator.storage.persist();
      }
    } catch {
      // 未対応環境では無視
    }
  }

  async function save(dataObj) {
    const payload = JSON.stringify(dataObj);
    try {
      global.localStorage.setItem(SAVE_KEY, payload);
    } catch {
      // 容量制限時でもIndexedDBへ継続
    }
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(payload, SAVE_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async function load() {
    let rawIdb = null;
    let rawLs = null;
    const db = await openDB();
    if (db) {
      rawIdb = await new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    try {
      rawLs = global.localStorage.getItem(SAVE_KEY);
    } catch {
      rawLs = null;
    }

    const candidates = [];
    for (const raw of [rawIdb, rawLs]) {
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') candidates.push(obj);
      } catch {
        // 破損データは無視
      }
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    return candidates[0];
  }

  function exportCode(dataObj) {
    const json = JSON.stringify(dataObj);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function importCode(code) {
    const trimmed = String(code || '').trim();
    if (!trimmed) throw new Error('コードが空です');
    let jsonStr = trimmed;
    if (!trimmed.startsWith('{')) {
      const bin = atob(trimmed);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      jsonStr = new TextDecoder().decode(bytes);
    }
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || !parsed.units || !Array.isArray(parsed.party)) {
      throw new Error('セーブ形式が正しくありません');
    }
    return parsed;
  }

  async function clearAll() {
    try { global.localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(SAVE_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  HS.STORAGE = {
    requestPersistence,
    save,
    load,
    exportCode,
    importCode,
    clearAll
  };
})(window);
