(function () {
  'use strict';

  const HS = window.HS;
  const DB_NAME = 'hachamecha_sekai_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'saves';
  const SAVE_KEY = 'primary_v1';
  const LS_KEY = 'hs_save_primary_v1';
  const SALT = 'HS::CHAOS_VERSE::2026::INTEGRITY';

  function computeChecksum(str) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    const input = SALT + '|' + str;
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= (c + (i & 255));
      h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }

  function wrapEnvelope(data) {
    const json = JSON.stringify(data);
    return {
      v: 1,
      ts: Date.now(),
      sig: computeChecksum(json),
      payload: json
    };
  }

  function unwrapEnvelope(env) {
    if (!env || typeof env !== 'object' || typeof env.payload !== 'string' || typeof env.sig !== 'string') {
      return null;
    }
    if (computeChecksum(env.payload) !== env.sig) {
      return null;
    }
    try {
      const parsed = JSON.parse(env.payload);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function openDB() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
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
  }

  async function save(stateObj) {
    const env = wrapEnvelope(stateObj);
    const serialized = JSON.stringify(env);

    try {
      localStorage.setItem(LS_KEY, serialized);
    } catch {
      // Ignore quota errors if storage is constrained
    }

    const db = await openDB();
    if (!db) return true;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(env, SAVE_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async function load() {
    let idbEnv = null;
    const db = await openDB();
    if (db) {
      idbEnv = await new Promise((resolve) => {
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

    let lsEnv = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) lsEnv = JSON.parse(raw);
    } catch {
      lsEnv = null;
    }

    const candidates = [idbEnv, lsEnv].filter(Boolean).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    for (const c of candidates) {
      const valid = unwrapEnvelope(c);
      if (valid) return valid;
    }
    return null;
  }

  async function clearAll() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    const db = await openDB();
    if (!db) return;
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(SAVE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  function exportCode(stateObj) {
    const env = wrapEnvelope(stateObj);
    const bytes = new TextEncoder().encode(JSON.stringify(env));
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'HS1:' + btoa(bin);
  }

  function importCode(code) {
    if (typeof code !== 'string') return null;
    const trimmed = code.trim();
    if (!trimmed.startsWith('HS1:')) return null;
    try {
      const bin = atob(trimmed.slice(4));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const env = JSON.parse(new TextDecoder().decode(bytes));
      return unwrapEnvelope(env);
    } catch {
      return null;
    }
  }

  HS.Storage = {
    save,
    load,
    clearAll,
    exportCode,
    importCode
  };
})();
