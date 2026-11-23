import { createStarterEquipment } from '../data/equipment';
import type { AchievementDef, SaveData } from '../types/game';

const DB_NAME = 'hachamecha_sekai_db';
const STORE_NAME = 'save_store';
const KEY_MAIN = 'main_save_v1';
const LS_FALLBACK_KEY = 'hachamecha_sekai_save_v1';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach_win_1',
    title: '混沌への第一歩',
    desc: 'バトルに1回勝利する',
    rewardShard: 15,
    rewardGold: 800,
    check: (s) => ({ current: s.totalWins, target: 1 })
  },
  {
    id: 'ach_win_15',
    title: 'はちゃめちゃ熟練者',
    desc: 'バトルに累計15回勝利する',
    rewardShard: 30,
    rewardGold: 2200,
    check: (s) => ({ current: s.totalWins, target: 15 })
  },
  {
    id: 'ach_win_50',
    title: '周回の鬼',
    desc: 'バトルに累計50回勝利する',
    rewardShard: 60,
    rewardGold: 5500,
    check: (s) => ({ current: s.totalWins, target: 50 })
  },
  {
    id: 'ach_chaos_10',
    title: '法則クラッシャー',
    desc: 'カオス法則を累計10回発動させる',
    rewardShard: 25,
    rewardGold: 1600,
    check: (s) => ({ current: s.totalChaosTriggered, target: 10 })
  },
  {
    id: 'ach_units_8',
    title: '賑やかなパーティ',
    desc: '仲間を8体以上解放する',
    rewardShard: 35,
    rewardGold: 2500,
    check: (s) => ({ current: Object.keys(s.ownedUnits).length, target: 8 })
  },
  {
    id: 'ach_units_16',
    title: '混沌の大軍団',
    desc: '仲間を16体以上解放する',
    rewardShard: 65,
    rewardGold: 6000,
    check: (s) => ({ current: Object.keys(s.ownedUnits).length, target: 16 })
  },
  {
    id: 'ach_tower_5',
    title: '無限塔の挑戦者',
    desc: '無限塔5階を突破する',
    rewardShard: 30,
    rewardGold: 3000,
    check: (s) => ({ current: s.towerMaxFloor, target: 5 })
  },
  {
    id: 'ach_tower_15',
    title: '無限塔の覇者',
    desc: '無限塔15階を突破する',
    rewardShard: 70,
    rewardGold: 8000,
    check: (s) => ({ current: s.towerMaxFloor, target: 15 })
  },
  {
    id: 'ach_sig_1',
    title: '専用武器の覚醒',
    desc: 'いずれかの仲間の専用武器を鍛造する',
    rewardShard: 30,
    rewardGold: 2500,
    check: (s) => ({
      current: Object.values(s.ownedUnits).filter((u) => u.sigUnlocked).length,
      target: 1
    })
  },
  {
    id: 'ach_sell_20',
    title: '断捨離マスター',
    desc: '自動売却で装備を累計20個換金する',
    rewardShard: 25,
    rewardGold: 2000,
    check: (s) => ({ current: s.totalAutoSold, target: 20 })
  }
];

export function createInitialSave(): SaveData {
  const starterItems = createStarterEquipment();
  return {
    version: 1,
    gold: 1200,
    shard: 25,
    powder: 45,
    sigCore: 1,
    party: ['u_fire_tank', 'u_water_dealer', 'u_wind_sup', 'u_light_heal'],
    ownedUnits: {
      u_fire_tank: {
        unitId: 'u_fire_tank',
        level: 1,
        exp: 0,
        equip: { weapon: null, armor: starterItems[1].uid, accessory: null },
        sigUnlocked: false,
        sigLevel: 1
      },
      u_water_dealer: {
        unitId: 'u_water_dealer',
        level: 1,
        exp: 0,
        equip: { weapon: starterItems[0].uid, armor: null, accessory: null },
        sigUnlocked: false,
        sigLevel: 1
      },
      u_wind_sup: {
        unitId: 'u_wind_sup',
        level: 1,
        exp: 0,
        equip: { weapon: null, armor: null, accessory: null },
        sigUnlocked: false,
        sigLevel: 1
      },
      u_light_heal: {
        unitId: 'u_light_heal',
        level: 1,
        exp: 0,
        equip: { weapon: null, armor: null, accessory: null },
        sigUnlocked: false,
        sigLevel: 1
      }
    },
    inventory: starterItems,
    clearedStages: {},
    towerMaxFloor: 0,
    totalBattles: 0,
    totalWins: 0,
    totalChaosTriggered: 0,
    totalAutoSold: 0,
    claimedAchievements: {},
    settings: {
      handedness: 'right',
      seEnabled: true,
      seVolume: 0.45,
      defaultSpeed: 1,
      defaultAuto: false,
      autoSell: {
        enabled: true,
        maxRarity: 'N'
      },
      autoChaosOrb: true
    }
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function sanitizeSave(raw: Partial<SaveData> | null | undefined): SaveData {
  const base = createInitialSave();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    party: Array.isArray(raw.party) && raw.party.length === 4 ? raw.party : base.party,
    ownedUnits: raw.ownedUnits && Object.keys(raw.ownedUnits).length > 0 ? raw.ownedUnits : base.ownedUnits,
    inventory: Array.isArray(raw.inventory) ? raw.inventory : base.inventory,
    clearedStages: raw.clearedStages || {},
    claimedAchievements: raw.claimedAchievements || {},
    settings: {
      ...base.settings,
      ...(raw.settings || {}),
      autoSell: {
        ...base.settings.autoSell,
        ...(raw.settings?.autoSell || {})
      }
    }
  };
}

export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (!already) {
        await navigator.storage.persist();
      }
    }
  } catch {
    // 非対応環境では無視
  }
}

export async function loadSaveData(): Promise<SaveData> {
  try {
    const db = await openDb();
    const idbResult = await new Promise<SaveData | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY_MAIN);
      req.onsuccess = () => resolve((req.result as SaveData) || null);
      req.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    });
    db.close();
    if (idbResult) {
      return sanitizeSave(idbResult);
    }
  } catch {
    // IndexedDB失敗時はlocalStorageへフォールバック
  }

  try {
    const ls = localStorage.getItem(LS_FALLBACK_KEY);
    if (ls) {
      return sanitizeSave(JSON.parse(ls) as Partial<SaveData>);
    }
  } catch {
    // 破損時は初期セーブ
  }
  return createInitialSave();
}

export async function persistSaveData(data: SaveData): Promise<void> {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(data));
  } catch {
    // 容量制限等は無視してIndexedDBへ保存
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, KEY_MAIN);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    db.close();
  } catch {
    // localStorageに保存済み
  }
}

export function exportSaveCode(data: SaveData): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export function importSaveCode(code: string): SaveData | null {
  try {
    const bin = atob(code.trim());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<SaveData>;
    if (!parsed || typeof parsed !== 'object' || !parsed.ownedUnits) return null;
    return sanitizeSave(parsed);
  } catch {
    return null;
  }
}
