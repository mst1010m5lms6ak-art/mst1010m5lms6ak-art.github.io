(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};

  const STORAGE_KEY = 'ikai_zankyo_save_v1';

  const RARITY_RANK = {
    SSR: 0,
    SR: 1,
    R: 2
  };

  const ROLE_RANK = {
    'タンク': 0,
    'ディーラー': 1,
    'サポーター': 2,
    'ヒーラー': 3
  };

  const GOJUON_PRIMARY_MAP = {
    'が': 'か', 'ぎ': 'か', 'ぐ': 'か', 'げ': 'か', 'ご': 'か',
    'ざ': 'さ', 'じ': 'さ', 'ず': 'さ', 'ぜ': 'さ', 'ぞ': 'さ',
    'だ': 'た', 'ぢ': 'た', 'づ': 'た', 'で': 'た', 'ど': 'た',
    'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
    'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
    'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
    'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
    'ゎ': 'わ', 'ゔ': 'う', 'ゐ': 'い', 'ゑ': 'え'
  };
  // 正しい清音基底置換テーブル（か行・さ行・た行の濁音は各自の清音へ）
  GOJUON_PRIMARY_MAP['が'] = 'か';
  GOJUON_PRIMARY_MAP['ぎ'] = 'き';
  GOJUON_PRIMARY_MAP['ぐ'] = 'く';
  GOJUON_PRIMARY_MAP['げ'] = 'け';
  GOJUON_PRIMARY_MAP['ご'] = 'こ';
  GOJUON_PRIMARY_MAP['ざ'] = 'さ';
  GOJUON_PRIMARY_MAP['じ'] = 'し';
  GOJUON_PRIMARY_MAP['ず'] = 'す';
  GOJUON_PRIMARY_MAP['ぜ'] = 'せ';
  GOJUON_PRIMARY_MAP['ぞ'] = 'そ';
  GOJUON_PRIMARY_MAP['だ'] = 'た';
  GOJUON_PRIMARY_MAP['ぢ'] = 'ち';
  GOJUON_PRIMARY_MAP['づ'] = 'つ';
  GOJUON_PRIMARY_MAP['で'] = 'て';
  GOJUON_PRIMARY_MAP['ど'] = 'と';
  GOJUON_PRIMARY_MAP['ゕ'] = 'か';
  GOJUON_PRIMARY_MAP['ゖ'] = 'け';

  const VOWEL_ROW_A = new Set('あかさたなはまやらわ'.split(''));
  const VOWEL_ROW_I = new Set('いきしちにひみり'.split(''));
  const VOWEL_ROW_U = new Set('うくすつぬふむゆる'.split(''));
  const VOWEL_ROW_E = new Set('えけせてねへめれ'.split(''));
  const VOWEL_ROW_O = new Set('おこそとのほもよろを'.split(''));

  function toHiragana(raw) {
    const str = String(raw || '').normalize('NFC').replace(/\s+/g, '');
    let out = '';
    for (let i = 0; i < str.length; i += 1) {
      const code = str.charCodeAt(i);
      if (code >= 0x30a1 && code <= 0x30f6) {
        out += String.fromCharCode(code - 0x60);
      } else {
        out += str[i];
      }
    }
    return out;
  }

  function toGojuonPrimary(hira) {
    let out = '';
    let prevBase = '';
    for (let i = 0; i < hira.length; i += 1) {
      const ch = hira[i];
      if (ch === 'ー') {
        if (VOWEL_ROW_A.has(prevBase)) {
          out += 'あ';
          prevBase = 'あ';
        } else if (VOWEL_ROW_I.has(prevBase)) {
          out += 'い';
          prevBase = 'い';
        } else if (VOWEL_ROW_U.has(prevBase)) {
          out += 'う';
          prevBase = 'う';
        } else if (VOWEL_ROW_E.has(prevBase)) {
          out += 'え';
          prevBase = 'え';
        } else if (VOWEL_ROW_O.has(prevBase)) {
          out += 'お';
          prevBase = 'お';
        } else {
          out += ch;
        }
        continue;
      }
      const mapped = GOJUON_PRIMARY_MAP[ch] || ch;
      out += mapped;
      prevBase = mapped;
    }
    return out;
  }

  function compareCodePoints(a, b) {
    if (a === b) {
      return 0;
    }
    return a < b ? -1 : 1;
  }

  function sortUnits(units) {
    if (!Array.isArray(units)) {
      return [];
    }
    const MasterData = IkaiApp.MasterData;
    const charMap = (MasterData && MasterData.CHARACTER_MAP) ? MasterData.CHARACTER_MAP : {};

    const decorated = units.map(function (unit, idx) {
      const ref = (unit && unit.id && Object.prototype.hasOwnProperty.call(charMap, unit.id)) ? charMap[unit.id] : null;
      const rarity = (unit && unit.rarity) || (ref && ref.rarity) || 'R';
      const role = (unit && unit.role) || (ref && ref.role) || 'ヒーラー';
      const kanaRaw = (unit && unit.kana) || (ref && ref.kana) || (unit && unit.name) || '';
      const hira = toHiragana(kanaRaw);
      const primary = toGojuonPrimary(hira);
      return {
        unit,
        idx,
        rarityRank: Object.prototype.hasOwnProperty.call(RARITY_RANK, rarity) ? RARITY_RANK[rarity] : 99,
        roleRank: Object.prototype.hasOwnProperty.call(ROLE_RANK, role) ? ROLE_RANK[role] : 99,
        primary,
        hira,
        id: (unit && unit.id) ? String(unit.id) : ''
      };
    });

    decorated.sort(function (a, b) {
      if (a.rarityRank !== b.rarityRank) {
        return a.rarityRank - b.rarityRank;
      }
      if (a.roleRank !== b.roleRank) {
        return a.roleRank - b.roleRank;
      }
      const pCmp = compareCodePoints(a.primary, b.primary);
      if (pCmp !== 0) {
        return pCmp;
      }
      const hCmp = compareCodePoints(a.hira, b.hira);
      if (hCmp !== 0) {
        return hCmp;
      }
      const idCmp = compareCodePoints(a.id, b.id);
      if (idCmp !== 0) {
        return idCmp;
      }
      return a.idx - b.idx;
    });

    return decorated.map(function (d) { return d.unit; });
  }

  function createDefaultRosterEntry() {
    return {
      awakening: 0,
      shards: 0,
      emblemNodes: [],
      equipped: {
        '主器': null,
        '護符': null,
        '装具': null,
        '印章': null
      },
      skills: [null, null],
      tactic: {
        policy: 'balanced',
        target: 'lowest_hp',
        skillPriority: 'unique_first'
      }
    };
  }

  function createInitialState() {
    return {
      version: 1,
      currencies: {
        echoStones: 1500,
        starCoins: 3000,
        exchangeCrystals: 0,
        emblemShards: 30,
        masteryBooks: 5,
        universalShards: 0,
        qualityCatalysts: 0
      },
      roster: {
        char_todo_seiichi: createDefaultRosterEntry(),
        char_kobayashi_shohei: createDefaultRosterEntry(),
        char_saito_riko: createDefaultRosterEntry(),
        char_nakamura_yui: createDefaultRosterEntry(),
        char_watanabe_aoi: createDefaultRosterEntry()
      },
      party: [
        'char_todo_seiichi',
        'char_kobayashi_shohei',
        'char_saito_riko',
        'char_nakamura_yui'
      ],
      resonanceSlots: [null, null, null, null],
      equips: [
        { uid: 'eq_init_1', equipId: 'eq_teppeki_main', qualityIdx: 0, locked: false },
        { uid: 'eq_init_2', equipId: 'eq_teppeki_amulet', qualityIdx: 0, locked: false },
        { uid: 'eq_init_3', equipId: 'eq_zankyo_main', qualityIdx: 0, locked: false },
        { uid: 'eq_init_4', equipId: 'eq_hoshiyomi_main', qualityIdx: 0, locked: false },
        { uid: 'eq_init_5', equipId: 'eq_jousui_main', qualityIdx: 0, locked: false },
        { uid: 'eq_init_6', equipId: 'eq_yogiri_amulet', qualityIdx: 0, locked: false }
      ],
      skillInventory: {
        sk_r_kiriharai: { ownedCount: 1, rank: 1, uses: 0 },
        sk_r_oukyu: { ownedCount: 1, rank: 1, uses: 0 },
        sk_r_shogekiha: { ownedCount: 1, rank: 1, uses: 0 },
        sk_r_kessoku: { ownedCount: 1, rank: 1, uses: 0 }
      },
      synthesisPity: {},
      progress: {
        clearedStages: [],
        abyssMaxFloor: 0,
        raidCleared: {},
        raidBestDamage: {},
        trialsCleared: [],
        totalBattles: 0
      },
      summon: {
        pityCount: 0,
        srPityCount: 0,
        totalPulls: 0,
        selectedBannerId: 'banner_pu_1'
      },
      expeditions: [],
      settings: {
        autoSellMaxQualityIdx: -1,
        battleSpeed: 1,
        autoRepeatCount: 0,
        soundMuted: false,
        soundVolume: 0.7
      }
    };
  }

  let currentState = null;
  let saveChain = Promise.resolve();
  const listeners = new Set();

  function cloneValue(obj) {
    if (typeof root.structuredClone === 'function') {
      return root.structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
  }

  function freezeState(obj) {
    if (IkaiApp.Env && typeof IkaiApp.Env.deepFreeze === 'function') {
      return IkaiApp.Env.deepFreeze(cloneValue(obj));
    }
    return cloneValue(obj);
  }

  function notifyListeners() {
    listeners.forEach(function (fn) {
      try {
        fn(currentState);
      } catch (_) {
        // Isolate subscriber errors
      }
    });
  }

  function getState() {
    if (!currentState) {
      currentState = freezeState(createInitialState());
    }
    return currentState;
  }

  function saveNow() {
    const nextTask = saveChain.then(async function () {
      try {
        const SaveSecurity = IkaiApp.SaveSecurity;
        if (!SaveSecurity) {
          return { ok: false, reason: 'SaveSecurity が未初期化です' };
        }
        const stateToSave = cloneValue(getState());
        const signed = await SaveSecurity.signState(stateToSave);
        const serialized = JSON.stringify(signed);
        if (typeof root.localStorage !== 'undefined') {
          root.localStorage.setItem(STORAGE_KEY, serialized);
        }
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          reason: err && err.message ? err.message : 'セーブに失敗しました'
        };
      }
    });
    saveChain = nextTask.catch(function () {});
    return nextTask;
  }

  function setState(nextState, opts) {
    const SaveSecurity = IkaiApp.SaveSecurity;
    if (SaveSecurity && typeof SaveSecurity.validateSchema === 'function') {
      const check = SaveSecurity.validateSchema(nextState);
      if (!check.ok) {
        throw new Error('状態更新スキーマ拒否: ' + check.reason);
      }
    }
    currentState = freezeState(nextState);
    notifyListeners();
    if (!opts || opts.persist !== false) {
      saveNow();
    }
    return currentState;
  }

  function update(updaterFn, opts) {
    const draft = cloneValue(getState());
    const result = updaterFn(draft);
    const next = result !== undefined ? result : draft;
    return setState(next, opts);
  }

  function subscribe(listenerFn) {
    if (typeof listenerFn !== 'function') {
      return function () {};
    }
    listeners.add(listenerFn);
    return function () {
      listeners.delete(listenerFn);
    };
  }

  async function loadSaved() {
    let raw = null;
    try {
      if (typeof root.localStorage !== 'undefined') {
        raw = root.localStorage.getItem(STORAGE_KEY);
      }
    } catch (_) {
      raw = null;
    }

    if (!raw) {
      const initial = createInitialState();
      setState(initial, { persist: false });
      return { ok: true, isNew: true, fallback: false, state: getState() };
    }

    const SaveSecurity = IkaiApp.SaveSecurity;
    if (!SaveSecurity) {
      const initial = createInitialState();
      setState(initial, { persist: false });
      return { ok: false, fallback: true, reason: 'SaveSecurity が未初期化です', state: getState() };
    }

    const verified = await SaveSecurity.verifyAndParse(raw);
    if (!verified.ok) {
      // 既存の破損・改ざんデータは上書き破壊せずメモリ上のみ初期状態で安全起動
      const initial = createInitialState();
      setState(initial, { persist: false });
      return {
        ok: false,
        fallback: true,
        reason: verified.reason || 'セーブデータの署名検証に失敗しました',
        state: getState()
      };
    }

    setState(verified.state, { persist: false });
    return { ok: true, isNew: false, fallback: false, state: getState() };
  }

  IkaiApp.StateStore = Object.freeze({
    STORAGE_KEY,
    createInitialState,
    getState,
    setState,
    update,
    subscribe,
    saveNow,
    loadSaved,
    sortUnits
  });
})(typeof window !== 'undefined' ? window : globalThis);
