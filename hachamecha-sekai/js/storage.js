(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  const SAVE_KEY = "hachamecha_sekai_save_v1";
  const IDB_NAME = "HachamechaSekaiDB";
  const IDB_STORE = "saves";

  function createInitialSave() {
    const chars = {};
    HS.CHARS.LIST.forEach((c) => {
      chars[c.id] = {
        unlocked: !!c.starter,
        level: 1,
        exp: 0,
        limitBreak: 0,
        exUnlocked: false,
        exLevel: 0
      };
    });

    // Initial balanced 4-member party (Tank, Dealer, Supporter, Healer) + 2 extra starters ready for D&D swap
    const party = ["f_hum_tank", "f_hum_dra_dlr", "g_hum_sup", "w_hum_fai_hlr"];

    // Starter equipment set
    const starterEq = [
      HS.EQUIP.generateEquip(1, 1),
      HS.EQUIP.generateEquip(1, 1),
      HS.EQUIP.generateEquip(1, 1),
      HS.EQUIP.generateEquip(2, 1)
    ];

    const equipsByChar = {};
    HS.CHARS.LIST.forEach((c) => {
      equipsByChar[c.id] = { weapon: null, armor: null, relic: null };
    });

    return {
      version: 1,
      gold: 800,
      crystal: 45,
      core: 4,
      shards: 0,
      chars,
      party,
      inventory: starterEq,
      equipsByChar,
      clearedStages: {},
      abyssMaxFloor: 1,
      abyssCurrentFloor: 1,
      selectedStageId: "j_1_1",
      selectedMode: "journey",
      settings: {
        speed: 1,            // 1, 2, 3
        autoBattle: true,
        autoLoop: false,
        autoSellMaxOrder: 0, // -1:OFF, 0:N, 1:R, 2:SR, 3:SSR
        seEnabled: true
      },
      stats: {
        totalBattles: 0,
        totalWins: 0,
        totalAutoSold: 0,
        maxSingleDamage: 0,
        chaosTriggered: 0
      }
    };
  }

  function mergeSave(raw) {
    const base = createInitialSave();
    if (!raw || typeof raw !== "object") return base;
    const merged = Object.assign({}, base, raw);
    merged.settings = Object.assign({}, base.settings, raw.settings || {});
    merged.stats = Object.assign({}, base.stats, raw.stats || {});
    merged.chars = Object.assign({}, base.chars);
    Object.keys(base.chars).forEach((cid) => {
      if (raw.chars && raw.chars[cid]) {
        merged.chars[cid] = Object.assign({}, base.chars[cid], raw.chars[cid]);
      }
    });
    merged.equipsByChar = Object.assign({}, base.equipsByChar);
    Object.keys(base.equipsByChar).forEach((cid) => {
      if (raw.equipsByChar && raw.equipsByChar[cid]) {
        merged.equipsByChar[cid] = Object.assign({}, base.equipsByChar[cid], raw.equipsByChar[cid]);
      }
    });
    if (!Array.isArray(merged.party) || merged.party.length !== 4) {
      merged.party = base.party.slice();
    }
    if (!Array.isArray(merged.inventory)) {
      merged.inventory = base.inventory.slice();
    }
    // Clamp speed strictly up to 3x
    if (![1, 2, 3].includes(merged.settings.speed)) merged.settings.speed = 1;
    return merged;
  }

  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) return reject(new Error("no idb"));
      const req = global.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function writeIDB(data) {
    openIDB()
      .then((db) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(data, SAVE_KEY);
      })
      .catch(() => {});
  }

  function readIDB() {
    return openIDB()
      .then(
        (db) =>
          new Promise((resolve) => {
            const tx = db.transaction(IDB_STORE, "readonly");
            const req = tx.objectStore(IDB_STORE).get(SAVE_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          })
      )
      .catch(() => null);
  }

  function load() {
    try {
      const txt = global.localStorage.getItem(SAVE_KEY);
      if (txt) {
        return mergeSave(JSON.parse(txt));
      }
    } catch (_) {}
    return createInitialSave();
  }

  function save(data) {
    try {
      global.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) {}
    writeIDB(data);
  }

  function tryRecoverFromIDB(callback) {
    const hasLocal = !!global.localStorage.getItem(SAVE_KEY);
    if (hasLocal) return;
    readIDB().then((idbData) => {
      if (idbData && typeof callback === "function") {
        callback(mergeSave(idbData));
      }
    });
  }

  function exportJson(data) {
    return JSON.stringify(data);
  }

  function importJson(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !parsed.chars) {
      throw new Error("不正なデータ形式です");
    }
    const merged = mergeSave(parsed);
    save(merged);
    return merged;
  }

  function reset() {
    const fresh = createInitialSave();
    save(fresh);
    return fresh;
  }

  HS.STORAGE = {
    load,
    save,
    tryRecoverFromIDB,
    exportJson,
    importJson,
    reset
  };
})(window);
