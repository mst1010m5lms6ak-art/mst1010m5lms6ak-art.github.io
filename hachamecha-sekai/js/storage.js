(function () {
  'use strict';

  const Hacha = window.Hacha;
  const LS_KEY = 'hachamecha_sekai_save_v1';
  const IDB_NAME = 'hachamecha_sekai_db';
  const IDB_STORE = 'saves';
  const IDB_KEY = 'main';

  let idbHandle = null;

  function openIDB() {
    if (idbHandle) return Promise.resolve(idbHandle);
    if (!window.indexedDB) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => {
          idbHandle = req.result;
          resolve(idbHandle);
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function idbGet() {
    return openIDB().then((db) => {
      if (!db) return null;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });
  }

  function idbSet(data) {
    return openIDB().then((db) => {
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(data, IDB_KEY);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    });
  }

  function createDefaultCharProgress(charId) {
    return {
      unlocked: false,
      awakening: 0,       // 異界覚醒 0〜5
      abilityTier: 1,     // 解放済みアビリティ段階 1〜5
      abilityChoices: [0, 0, 0, 0, 0], // 各段階の5択インデックス(0〜4)
      skillRanks: [1, 1, 1],           // 各技の習熟ランク 1〜10
      skillUses: [0, 0, 0],            // 技使用回数（自動で習熟ランクUP）
      equip: { weapon: null, armor: null, charm: null }
    };
  }

  function createInitialState() {
    const starterIds = [
      'c_fire_tank',
      'c_water_dealer',
      'c_wind_supporter',
      'c_light_healer',
      'c_dark_dealer',
      'c_none_tank'
    ];
    const chars = {};
    (Hacha.data.CHARACTERS || []).forEach((c) => {
      const p = createDefaultCharProgress(c.id);
      if (starterIds.includes(c.id)) p.unlocked = true;
      chars[c.id] = p;
    });

    /* 初期装備（品質体験用） */
    const starterGear = [
      { uid: Hacha.util.uid('eq'), templateId: 'eq_w_01', quality: 74, locked: false },
      { uid: Hacha.util.uid('eq'), templateId: 'eq_a_01', quality: 68, locked: false },
      { uid: Hacha.util.uid('eq'), templateId: 'eq_c_01', quality: 82, locked: false },
      { uid: Hacha.util.uid('eq'), templateId: 'eq_w_02', quality: 88, locked: false }
    ];
    chars.c_fire_tank.equip.armor = starterGear[1].uid;
    chars.c_water_dealer.equip.weapon = starterGear[0].uid;
    chars.c_light_healer.equip.charm = starterGear[2].uid;
    chars.c_dark_dealer.equip.weapon = starterGear[3].uid;

    return {
      version: 1,
      updatedAt: Date.now(),
      resources: {
        coins: 1200,
        scrolls: 6,
        fragments: 3,
        crystals: { tank: 8, dealer: 8, supporter: 8, healer: 8 }
      },
      party: ['c_fire_tank', 'c_water_dealer', 'c_wind_supporter', 'c_light_healer'],
      links: ['c_none_tank', 'c_dark_dealer', null, null],
      chars,
      inventory: starterGear,
      progress: {
        clearedStages: {},
        towerFloor: 1,
        bestTowerFloor: 0,
        bossCleared: {},
        trialCleared: {},
        arenaCleared: {},
        totalBattles: 0,
        totalWins: 0,
        intruderKills: 0,
        intruderKillMap: {}
      },
      dispatches: [
        { slot: 0, missionId: 'disp_crystals', charIds: [], progress: 0, autoRepeat: true, active: false },
        { slot: 1, missionId: 'disp_scrolls',  charIds: [], progress: 0, autoRepeat: true, active: false },
        { slot: 2, missionId: 'disp_gear',     charIds: [], progress: 0, autoRepeat: true, active: false }
      ],
      codex: {
        chars: starterIds.slice(),
        enemies: [],
        equips: ['eq_w_01', 'eq_a_01', 'eq_c_01', 'eq_w_02']
      },
      settings: {
        battleSpeed: 1,
        autoLoop: false,
        autoSellBelow: 0,
        keepNewCodexGear: true,
        seEnabled: true
      }
    };
  }

  function hydrateState(raw) {
    const base = createInitialState();
    if (!raw || typeof raw !== 'object') return base;

    const merged = Object.assign({}, base, raw);
    merged.resources = Object.assign({}, base.resources, raw.resources || {});
    merged.resources.crystals = Object.assign({}, base.resources.crystals, (raw.resources && raw.resources.crystals) || {});
    merged.progress = Object.assign({}, base.progress, raw.progress || {});
    merged.progress.clearedStages = Object.assign({}, raw.progress && raw.progress.clearedStages);
    merged.progress.bossCleared = Object.assign({}, raw.progress && raw.progress.bossCleared);
    merged.progress.trialCleared = Object.assign({}, raw.progress && raw.progress.trialCleared);
    merged.progress.arenaCleared = Object.assign({}, raw.progress && raw.progress.arenaCleared);
    merged.progress.intruderKillMap = Object.assign({}, raw.progress && raw.progress.intruderKillMap);
    merged.settings = Object.assign({}, base.settings, raw.settings || {});
    merged.codex = Object.assign({}, base.codex, raw.codex || {});

    const charMap = {};
    (Hacha.data.CHARACTERS || []).forEach((c) => {
      const def = createDefaultCharProgress(c.id);
      const saved = (raw.chars && raw.chars[c.id]) || {};
      charMap[c.id] = Object.assign({}, def, saved, {
        abilityChoices: Array.isArray(saved.abilityChoices) && saved.abilityChoices.length === 5
          ? saved.abilityChoices.slice() : def.abilityChoices.slice(),
        skillRanks: Array.isArray(saved.skillRanks) && saved.skillRanks.length === 3
          ? saved.skillRanks.slice() : def.skillRanks.slice(),
        skillUses: Array.isArray(saved.skillUses) && saved.skillUses.length === 3
          ? saved.skillUses.slice() : def.skillUses.slice(),
        equip: Object.assign({}, def.equip, saved.equip || {})
      });
    });
    merged.chars = charMap;

    if (!Array.isArray(merged.party) || merged.party.length !== 4) {
      merged.party = base.party.slice();
    }
    if (!Array.isArray(merged.links) || merged.links.length !== 4) {
      merged.links = base.links.slice();
    }
    if (!Array.isArray(merged.inventory)) {
      merged.inventory = base.inventory.slice();
    }
    if (!Array.isArray(merged.dispatches) || merged.dispatches.length !== 3) {
      merged.dispatches = base.dispatches;
    }

    return merged;
  }

  async function loadSave() {
    let lsData = null;
    try {
      const str = window.localStorage.getItem(LS_KEY);
      if (str) lsData = JSON.parse(str);
    } catch (e) {}

    const idbData = await idbGet();
    let chosen = null;
    if (lsData && idbData) {
      chosen = (idbData.updatedAt || 0) >= (lsData.updatedAt || 0) ? idbData : lsData;
    } else {
      chosen = idbData || lsData;
    }

    const hydrated = hydrateState(chosen);
    Hacha.state = hydrated;
    return hydrated;
  }

  let saveTimer = null;
  function persistNow() {
    if (!Hacha.state) return;
    Hacha.state.updatedAt = Date.now();
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(Hacha.state));
    } catch (e) {}
    idbSet(Hacha.state);
  }

  function saveState(immediate) {
    if (immediate) {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      persistNow();
      return;
    }
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persistNow();
    }, 180);
  }

  function exportSaveString() {
    persistNow();
    return JSON.stringify(Hacha.state);
  }

  function importSaveString(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || !parsed.chars || !parsed.party) {
      throw new Error('セーブデータの形式が正しくありません');
    }
    Hacha.state = hydrateState(parsed);
    persistNow();
    return Hacha.state;
  }

  function resetSave() {
    Hacha.state = createInitialState();
    persistNow();
    return Hacha.state;
  }

  Hacha.storage = {
    loadSave,
    saveState,
    exportSaveString,
    importSaveString,
    resetSave,
    createInitialState
  };
})();
