(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});
  const DB_NAME = 'hachamecha_world_db';
  const STORE_NAME = 'saves';
  const SAVE_KEY = 'main_save_v1';
  const LS_KEY = 'hw_save_v1_mirror';

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (_e) {
        resolve(null);
      }
    });
    return dbPromise;
  }

  async function writeIdb(raw) {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(raw, SAVE_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (_e) {
        resolve(false);
      }
    });
  }

  async function readIdb() {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (_e) {
        resolve(null);
      }
    });
  }

  let saveTimer = null;

  function saveNow(stateObj) {
    const encoded = HW.Security.encodeSave(stateObj);
    try {
      localStorage.setItem(LS_KEY, encoded);
    } catch (_e) {
      // ignore quota errors
    }
    writeIdb(encoded);
  }

  function scheduleSave(stateObj) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveNow(stateObj);
    }, 180);
  }

  async function loadSave() {
    const idbRaw = await readIdb();
    let lsRaw = null;
    try {
      lsRaw = localStorage.getItem(LS_KEY);
    } catch (_e) {
      lsRaw = null;
    }

    const rIdb = HW.Security.decodeSave(idbRaw);
    const rLs = HW.Security.decodeSave(lsRaw);

    if (rIdb.ok && rLs.ok) {
      const tIdb = rIdb.data.updatedAt || 0;
      const tLs = rLs.data.updatedAt || 0;
      return { ok: true, data: tIdb >= tLs ? rIdb.data : rLs.data, tampered: false };
    }
    if (rIdb.ok) return { ok: true, data: rIdb.data, tampered: false };
    if (rLs.ok) return { ok: true, data: rLs.data, tampered: false };

    const tampered = (idbRaw && rIdb.reason === 'tampered') || (lsRaw && rLs.reason === 'tampered');
    return { ok: false, data: null, tampered: Boolean(tampered) };
  }

  async function clearSave() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch (_e) {
      // ignore
    }
    const db = await openDb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(SAVE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (_e) {
        resolve();
      }
    });
  }

  HW.Storage = {
    saveNow: saveNow,
    scheduleSave: scheduleSave,
    loadSave: loadSave,
    clearSave: clearSave
  };
})();
