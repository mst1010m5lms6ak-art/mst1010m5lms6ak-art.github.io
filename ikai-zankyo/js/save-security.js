(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};

  const SAVE_FORMAT = 'ikai-zankyo-save';
  const SCHEMA_VERSION = 1;
  const HMAC_KEY_STR = 'ikai-zankyo:save-integrity:v1:2026';

  const FORBIDDEN_KEYS = new Set([
    'lv',
    'level',
    'レベル',
    'suboptions',
    'substats',
    'formation',
    'pvp',
    'daily',
    'weekly',
    'monthly',
    'achievements'
  ]);

  const DANGEROUS_KEYS = new Set([
    '__proto__',
    'constructor',
    'prototype'
  ]);

  const TOP_LEVEL_KEYS = [
    'version',
    'currencies',
    'roster',
    'party',
    'resonanceSlots',
    'equips',
    'skillInventory',
    'synthesisPity',
    'progress',
    'summon',
    'expeditions',
    'settings'
  ];

  const CURRENCY_KEYS = [
    'echoStones',
    'starCoins',
    'exchangeCrystals',
    'emblemShards',
    'masteryBooks',
    'universalShards',
    'qualityCatalysts'
  ];

  const EQUIP_ITEM_KEYS = ['uid', 'equipId', 'qualityIdx', 'locked'];
  const ROSTER_ENTRY_KEYS = ['awakening', 'shards', 'emblemNodes', 'equipped', 'skills', 'tactic'];
  const TACTIC_KEYS = ['policy', 'target', 'skillPriority'];
  const SKILL_INV_ITEM_KEYS = ['ownedCount', 'rank', 'uses'];
  const PROGRESS_KEYS = ['clearedStages', 'abyssMaxFloor', 'raidCleared', 'trialsCleared', 'totalBattles'];
  const PROGRESS_OPTIONAL_KEYS = ['raidBestDamage'];
  const SUMMON_KEYS = ['pityCount', 'totalPulls', 'selectedBannerId'];
  const SUMMON_OPTIONAL_KEYS = ['srPityCount'];
  const EXPEDITION_KEYS = ['zoneId', 'charIds', 'battlesDone', 'requiredBattles', 'claimed'];
  const SETTINGS_KEYS = ['autoSellMaxQualityIdx', 'battleSpeed', 'autoRepeatCount', 'soundMuted', 'soundVolume'];
  const RAID_DIFF_KEYS = new Set(['easy', 'deep', 'extreme']);

  const TACTIC_POLICIES = new Set(['aggressive', 'balanced', 'defensive', 'conserve']);
  const TACTIC_TARGETS = new Set(['lowest_hp', 'boss_first', 'fastest_enemy', 'debuffed_first']);
  const TACTIC_PRIORITIES = new Set(['unique_first', 'collect_first', 'auto']);

  const SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  const SHA256_H0 = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  function utf8Encode(str) {
    if (typeof root.TextEncoder === 'function') {
      return new root.TextEncoder().encode(str);
    }
    const out = [];
    for (let i = 0; i < str.length; i += 1) {
      let code = str.charCodeAt(i);
      if (code < 0x80) {
        out.push(code);
      } else if (code < 0x800) {
        out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
          i += 1;
          out.push(
            0xf0 | (code >> 18),
            0x80 | ((code >> 12) & 0x3f),
            0x80 | ((code >> 6) & 0x3f),
            0x80 | (code & 0x3f)
          );
        } else {
          out.push(0xef, 0xbf, 0xbd);
        }
      } else {
        out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
    }
    return new Uint8Array(out);
  }

  function toUint8Array(input) {
    if (input instanceof Uint8Array) {
      return input;
    }
    return utf8Encode(String(input));
  }

  function bytesToHex(bytes) {
    let hex = '';
    for (let i = 0; i < bytes.length; i += 1) {
      const b = bytes[i];
      hex += (b < 16 ? '0' : '') + b.toString(16);
    }
    return hex;
  }

  function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
  }

  function sha256BytesPureJs(inputBytes) {
    const msg = toUint8Array(inputBytes);
    const msgLen = msg.length;
    const bitLen = msgLen * 8;
    const paddedLen = Math.ceil((msgLen + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLen);
    padded.set(msg, 0);
    padded[msgLen] = 0x80;

    const high = Math.floor(bitLen / 0x100000000);
    const low = bitLen >>> 0;
    padded[paddedLen - 8] = (high >>> 24) & 0xff;
    padded[paddedLen - 7] = (high >>> 16) & 0xff;
    padded[paddedLen - 6] = (high >>> 8) & 0xff;
    padded[paddedLen - 5] = high & 0xff;
    padded[paddedLen - 4] = (low >>> 24) & 0xff;
    padded[paddedLen - 3] = (low >>> 16) & 0xff;
    padded[paddedLen - 2] = (low >>> 8) & 0xff;
    padded[paddedLen - 1] = low & 0xff;

    let h0 = SHA256_H0[0];
    let h1 = SHA256_H0[1];
    let h2 = SHA256_H0[2];
    let h3 = SHA256_H0[3];
    let h4 = SHA256_H0[4];
    let h5 = SHA256_H0[5];
    let h6 = SHA256_H0[6];
    let h7 = SHA256_H0[7];

    const w = new Uint32Array(64);

    for (let offset = 0; offset < paddedLen; offset += 64) {
      for (let i = 0; i < 16; i += 1) {
        const j = offset + i * 4;
        w[i] = ((padded[j] << 24) | (padded[j + 1] << 16) | (padded[j + 2] << 8) | padded[j + 3]) >>> 0;
      }
      for (let i = 16; i < 64; i += 1) {
        const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
        const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }

      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      let f = h5;
      let g = h6;
      let h = h7;

      for (let i = 0; i < 64; i += 1) {
        const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        const ch = ((e & f) ^ ((~e) & g)) >>> 0;
        const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
        const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const temp2 = (S0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
      h5 = (h5 + f) >>> 0;
      h6 = (h6 + g) >>> 0;
      h7 = (h7 + h) >>> 0;
    }

    const words = [h0, h1, h2, h3, h4, h5, h6, h7];
    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i += 1) {
      out[i * 4] = (words[i] >>> 24) & 0xff;
      out[i * 4 + 1] = (words[i] >>> 16) & 0xff;
      out[i * 4 + 2] = (words[i] >>> 8) & 0xff;
      out[i * 4 + 3] = words[i] & 0xff;
    }
    return out;
  }

  function sha256HexPureJs(input) {
    return bytesToHex(sha256BytesPureJs(toUint8Array(input)));
  }

  function concatBytes(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  function hmacSha256BytesPureJs(keyInput, msgInput) {
    let keyBytes = toUint8Array(keyInput);
    const msgBytes = toUint8Array(msgInput);
    if (keyBytes.length > 64) {
      keyBytes = sha256BytesPureJs(keyBytes);
    }
    const kPad = new Uint8Array(64);
    kPad.set(keyBytes, 0);

    const ipad = new Uint8Array(64);
    const opad = new Uint8Array(64);
    for (let i = 0; i < 64; i += 1) {
      ipad[i] = kPad[i] ^ 0x36;
      opad[i] = kPad[i] ^ 0x5c;
    }
    const inner = sha256BytesPureJs(concatBytes(ipad, msgBytes));
    return sha256BytesPureJs(concatBytes(opad, inner));
  }

  function hmacSha256HexPureJs(keyInput, msgInput) {
    return bytesToHex(hmacSha256BytesPureJs(keyInput, msgInput));
  }

  function canUseWebCrypto() {
    return Boolean(
      typeof globalThis !== 'undefined' &&
      globalThis.isSecureContext === true &&
      globalThis.crypto &&
      globalThis.crypto.subtle &&
      typeof globalThis.crypto.subtle.importKey === 'function' &&
      typeof globalThis.crypto.subtle.sign === 'function'
    );
  }

  async function computeHmacHex(msgStr) {
    const msgBytes = utf8Encode(msgStr);
    const keyBytes = utf8Encode(HMAC_KEY_STR);
    if (canUseWebCrypto()) {
      const cryptoKey = await globalThis.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuffer = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
      return bytesToHex(new Uint8Array(sigBuffer));
    }
    return hmacSha256HexPureJs(keyBytes, msgBytes);
  }

  function canonicalStringify(val) {
    if (val === null) {
      return 'null';
    }
    const t = typeof val;
    if (t === 'number') {
      if (!Number.isFinite(val)) {
        throw new Error('Non-finite number in canonicalStringify');
      }
      return JSON.stringify(val);
    }
    if (t === 'boolean' || t === 'string') {
      return JSON.stringify(val);
    }
    if (Array.isArray(val)) {
      const items = [];
      for (let i = 0; i < val.length; i += 1) {
        const el = val[i];
        if (el === undefined || typeof el === 'function' || typeof el === 'symbol') {
          items.push('null');
        } else {
          items.push(canonicalStringify(el));
        }
      }
      return '[' + items.join(',') + ']';
    }
    if (t === 'object') {
      const keys = Object.keys(val).sort();
      const pairs = [];
      for (let i = 0; i < keys.length; i += 1) {
        const k = keys[i];
        const v = val[k];
        if (v !== undefined && typeof v !== 'function' && typeof v !== 'symbol') {
          pairs.push(JSON.stringify(k) + ':' + canonicalStringify(v));
        }
      }
      return '{' + pairs.join(',') + '}';
    }
    throw new Error('Unsupported value in canonicalStringify');
  }

  function constantTimeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  function isPlainObject(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      return false;
    }
    const proto = Object.getPrototypeOf(v);
    if (proto === null || proto === Object.prototype) {
      return true;
    }
    return Object.prototype.toString.call(v) === '[object Object]' &&
      Boolean(proto.constructor && proto.constructor.name === 'Object') &&
      Object.getPrototypeOf(proto) === null;
  }

  function hasOwn(obj, key) {
    return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function hasExactKeys(obj, expectedKeys) {
    const ownNames = Object.getOwnPropertyNames(obj);
    if (ownNames.length !== expectedKeys.length) {
      return false;
    }
    for (let i = 0; i < expectedKeys.length; i += 1) {
      if (!hasOwn(obj, expectedKeys[i])) {
        return false;
      }
    }
    return true;
  }

  function hasKeysWithin(obj, requiredKeys, optionalKeys) {
    const ownNames = Object.getOwnPropertyNames(obj);
    const allowed = new Set(requiredKeys.concat(optionalKeys || []));
    for (let i = 0; i < requiredKeys.length; i += 1) {
      if (!hasOwn(obj, requiredKeys[i])) {
        return false;
      }
    }
    for (let i = 0; i < ownNames.length; i += 1) {
      if (!allowed.has(ownNames[i])) {
        return false;
      }
    }
    return true;
  }

  function isValidSynthesisPityKey(MasterData, key) {
    if (typeof key !== 'string' || key.length === 0) {
      return false;
    }
    if (hasOwn(MasterData.EQUIP_MAP, key)) {
      return true;
    }
    const colonIdx = key.lastIndexOf(':');
    if (colonIdx > 0) {
      const equipId = key.slice(0, colonIdx);
      const qStr = key.slice(colonIdx + 1);
      if (hasOwn(MasterData.EQUIP_MAP, equipId) && /^[0-3]$/.test(qStr)) {
        return true;
      }
    }
    return false;
  }

  function findForbiddenKey(node, seen) {
    if (!node || typeof node !== 'object') {
      return null;
    }
    const visited = seen || new WeakSet();
    if (visited.has(node)) {
      return null;
    }
    visited.add(node);

    if (Array.isArray(node)) {
      const arrOwn = Object.getOwnPropertyNames(node);
      for (let i = 0; i < arrOwn.length; i += 1) {
        const ak = arrOwn[i];
        if (DANGEROUS_KEYS.has(ak) || FORBIDDEN_KEYS.has(ak.toLowerCase())) {
          return ak;
        }
      }
      for (let i = 0; i < node.length; i += 1) {
        const found = findForbiddenKey(node[i], visited);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const keys = Object.getOwnPropertyNames(node);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (DANGEROUS_KEYS.has(key) || FORBIDDEN_KEYS.has(key.toLowerCase())) {
        return key;
      }
      const found = findForbiddenKey(node[key], visited);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function isNonNegSafeInt(v, maxVal) {
    const cap = typeof maxVal === 'number' ? maxVal : 999999999;
    return Number.isSafeInteger(v) && v >= 0 && v <= cap;
  }

  function validateSchema(obj) {
    const MasterData = IkaiApp.MasterData;
    if (!MasterData) {
      return { ok: false, reason: 'MasterData が未初期化です' };
    }
    if (!isPlainObject(obj)) {
      return { ok: false, reason: 'セーブデータがオブジェクト形式ではありません' };
    }

    const forbidden = findForbiddenKey(obj);
    if (forbidden) {
      return { ok: false, reason: '禁止されたキーが含まれています: ' + forbidden };
    }

    const topKeys = Object.keys(obj);
    for (let i = 0; i < TOP_LEVEL_KEYS.length; i += 1) {
      if (!hasOwn(obj, TOP_LEVEL_KEYS[i])) {
        return { ok: false, reason: '必須キーが不足しています: ' + TOP_LEVEL_KEYS[i] };
      }
    }
    const allowedTopSet = new Set(TOP_LEVEL_KEYS);
    for (let i = 0; i < topKeys.length; i += 1) {
      if (!allowedTopSet.has(topKeys[i])) {
        return { ok: false, reason: '未知の最上位キーが存在します: ' + topKeys[i] };
      }
    }
    if (!hasExactKeys(obj, TOP_LEVEL_KEYS)) {
      return { ok: false, reason: '最上位キーの構成が不正です' };
    }

    if (obj.version !== SCHEMA_VERSION) {
      return { ok: false, reason: '未対応のスキーマバージョンです' };
    }

    // currencies
    if (!isPlainObject(obj.currencies) || !hasExactKeys(obj.currencies, CURRENCY_KEYS)) {
      return { ok: false, reason: 'currencies のキー構成が不正です' };
    }
    for (let i = 0; i < CURRENCY_KEYS.length; i += 1) {
      const ck = CURRENCY_KEYS[i];
      if (!isNonNegSafeInt(obj.currencies[ck], 999999999)) {
        return { ok: false, reason: '通貨値が不正です: ' + ck };
      }
    }

    // equips (先に uid 辞書構築)
    if (!Array.isArray(obj.equips)) {
      return { ok: false, reason: 'equips が配列ではありません' };
    }
    const equipByUid = new Map();
    for (let i = 0; i < obj.equips.length; i += 1) {
      const eq = obj.equips[i];
      if (!isPlainObject(eq) || !hasExactKeys(eq, EQUIP_ITEM_KEYS)) {
        return { ok: false, reason: 'equips 要素が不正です' };
      }
      if (typeof eq.uid !== 'string' || eq.uid.length === 0 || equipByUid.has(eq.uid)) {
        return { ok: false, reason: '装備 uid が不正または重複しています' };
      }
      if (typeof eq.equipId !== 'string' || !hasOwn(MasterData.EQUIP_MAP, eq.equipId)) {
        return { ok: false, reason: '存在しない equipId です: ' + eq.equipId };
      }
      if (!Number.isSafeInteger(eq.qualityIdx) || eq.qualityIdx < 0 || eq.qualityIdx > 4) {
        return { ok: false, reason: '装備品質が不正です' };
      }
      if (typeof eq.locked !== 'boolean') {
        return { ok: false, reason: '装備ロック状態が不正です' };
      }
      equipByUid.set(eq.uid, eq);
    }

    // skillInventory (roster検証より先に収集技所持状況を検証)
    if (!isPlainObject(obj.skillInventory)) {
      return { ok: false, reason: 'skillInventory が不正です' };
    }
    const skillIds = Object.keys(obj.skillInventory);
    for (let i = 0; i < skillIds.length; i += 1) {
      const sid = skillIds[i];
      if (!hasOwn(MasterData.SKILL_MAP, sid)) {
        return { ok: false, reason: 'skillInventory に未知の技IDがあります: ' + sid };
      }
      const item = obj.skillInventory[sid];
      if (!isPlainObject(item) ||
          !hasExactKeys(item, SKILL_INV_ITEM_KEYS) ||
          !isNonNegSafeInt(item.ownedCount) ||
          !Number.isSafeInteger(item.rank) || item.rank < 1 || item.rank > 5 ||
          !isNonNegSafeInt(item.uses)) {
        return { ok: false, reason: 'skillInventory エントリが不正です: ' + sid };
      }
    }

    // emblem node metadata for awakening & layer validation
    const emblemNodeMap = new Map();
    const layerNodesMap = new Map();
    for (let e = 0; e < MasterData.EMBLEM_NODES.length; e += 1) {
      const nodeDef = MasterData.EMBLEM_NODES[e];
      emblemNodeMap.set(nodeDef.id, nodeDef);
      if (!layerNodesMap.has(nodeDef.layer)) {
        layerNodesMap.set(nodeDef.layer, []);
      }
      layerNodesMap.get(nodeDef.layer).push(nodeDef.id);
    }

    // roster
    if (!isPlainObject(obj.roster)) {
      return { ok: false, reason: 'roster が不正です' };
    }
    const equippedUidOwnerSet = new Set();
    const rosterIds = Object.keys(obj.roster);
    for (let i = 0; i < rosterIds.length; i += 1) {
      const cid = rosterIds[i];
      if (!hasOwn(MasterData.CHARACTER_MAP, cid)) {
        return { ok: false, reason: '存在しないキャラIDです: ' + cid };
      }
      const entry = obj.roster[cid];
      if (!isPlainObject(entry) || !hasExactKeys(entry, ROSTER_ENTRY_KEYS)) {
        return { ok: false, reason: 'roster エントリが不正です: ' + cid };
      }
      if (!Number.isSafeInteger(entry.awakening) || entry.awakening < 0 || entry.awakening > 3) {
        return { ok: false, reason: '覚醒段階が不正です: ' + cid };
      }
      const tierDef = MasterData.AWAKENING_TIERS[entry.awakening];
      if (!tierDef) {
        return { ok: false, reason: '覚醒段階定義が不正です: ' + cid };
      }
      if (!isNonNegSafeInt(entry.shards)) {
        return { ok: false, reason: '覚醒片数が不正です: ' + cid };
      }
      if (!Array.isArray(entry.emblemNodes)) {
        return { ok: false, reason: 'emblemNodes が配列ではありません: ' + cid };
      }
      const nodeSeen = new Set();
      for (let n = 0; n < entry.emblemNodes.length; n += 1) {
        const nid = entry.emblemNodes[n];
        const nodeDef = emblemNodeMap.get(nid);
        if (!Number.isSafeInteger(nid) || !nodeDef || nodeSeen.has(nid)) {
          return { ok: false, reason: 'emblemNodes が不正です: ' + cid };
        }
        if (entry.awakening < nodeDef.reqAwakening || nodeDef.layer > tierDef.maxEmblemLayer) {
          return { ok: false, reason: '覚醒段階不足のため紋章ノードが不正です: ' + cid };
        }
        nodeSeen.add(nid);
      }
      for (let n = 0; n < entry.emblemNodes.length; n += 1) {
        const nodeDef = emblemNodeMap.get(entry.emblemNodes[n]);
        if (nodeDef && nodeDef.reqPrevLayerAll) {
          const prevIds = layerNodesMap.get(nodeDef.layer - 1) || [];
          for (let p = 0; p < prevIds.length; p += 1) {
            if (!nodeSeen.has(prevIds[p])) {
              return { ok: false, reason: '前層の紋章ノードが未解放です: ' + cid };
            }
          }
        }
      }
      if (!isPlainObject(entry.equipped) || !hasExactKeys(entry.equipped, MasterData.EQUIP_SLOTS)) {
        return { ok: false, reason: 'equipped が不正です: ' + cid };
      }
      for (let s = 0; s < MasterData.EQUIP_SLOTS.length; s += 1) {
        const slot = MasterData.EQUIP_SLOTS[s];
        const eqUid = entry.equipped[slot];
        if (eqUid !== null) {
          if (typeof eqUid !== 'string' || !equipByUid.has(eqUid)) {
            return { ok: false, reason: '装備参照 uid が不正です: ' + cid + ':' + slot };
          }
          if (equippedUidOwnerSet.has(eqUid)) {
            return { ok: false, reason: '同一装備 uid が重複装着されています: ' + eqUid };
          }
          if (tierDef.unlockedSlots.indexOf(slot) === -1) {
            return { ok: false, reason: '未開放の装備枠に装備が装着されています: ' + cid + ':' + slot };
          }
          const eqObj = equipByUid.get(eqUid);
          const eqDef = MasterData.EQUIP_MAP[eqObj.equipId];
          if (!eqDef || eqDef.slot !== slot) {
            return { ok: false, reason: '装備部位がスロットと一致しません: ' + cid + ':' + slot };
          }
          equippedUidOwnerSet.add(eqUid);
        }
      }
      if (!Array.isArray(entry.skills) || entry.skills.length !== 2) {
        return { ok: false, reason: 'skills 配列長が不正です: ' + cid };
      }
      for (let k = 0; k < 2; k += 1) {
        const sid = entry.skills[k];
        if (sid !== null) {
          if (k >= tierDef.skillSlots) {
            return { ok: false, reason: '未開放の収集技枠に技が設定されています: ' + cid };
          }
          if (typeof sid !== 'string' || !hasOwn(MasterData.SKILL_MAP, sid)) {
            return { ok: false, reason: '存在しない収集技IDです: ' + cid };
          }
          if (!hasOwn(obj.skillInventory, sid) || obj.skillInventory[sid].ownedCount < 1) {
            return { ok: false, reason: '未所持の収集技が設定されています: ' + cid + ':' + sid };
          }
        }
      }
      if (entry.skills[0] !== null && entry.skills[0] === entry.skills[1]) {
        return { ok: false, reason: '同一の収集技を重複装着することはできません: ' + cid };
      }
      if (!isPlainObject(entry.tactic) || !hasExactKeys(entry.tactic, TACTIC_KEYS)) {
        return { ok: false, reason: 'tactic が不正です: ' + cid };
      }
      if (!TACTIC_POLICIES.has(entry.tactic.policy) ||
          !TACTIC_TARGETS.has(entry.tactic.target) ||
          !TACTIC_PRIORITIES.has(entry.tactic.skillPriority)) {
        return { ok: false, reason: 'tactic 設定値が不正です: ' + cid };
      }
    }

    // party
    if (!Array.isArray(obj.party) || obj.party.length !== 4) {
      return { ok: false, reason: 'party は長さ4の配列である必要があります' };
    }
    const partySet = new Set();
    let partyMemberCount = 0;
    for (let i = 0; i < 4; i += 1) {
      const cid = obj.party[i];
      if (cid !== null) {
        if (typeof cid !== 'string' || !hasOwn(obj.roster, cid)) {
          return { ok: false, reason: 'party に未所持キャラが含まれています' };
        }
        if (partySet.has(cid)) {
          return { ok: false, reason: 'party に同一キャラが重複しています' };
        }
        partySet.add(cid);
        partyMemberCount += 1;
      }
    }
    if (partyMemberCount < 1) {
      return { ok: false, reason: 'party には最低1名のキャラが必要です' };
    }

    // resonanceSlots
    if (!Array.isArray(obj.resonanceSlots) || obj.resonanceSlots.length !== 4) {
      return { ok: false, reason: 'resonanceSlots は長さ4の配列である必要があります' };
    }
    const resSet = new Set();
    for (let i = 0; i < 4; i += 1) {
      const cid = obj.resonanceSlots[i];
      if (cid !== null) {
        if (typeof cid !== 'string' || !hasOwn(obj.roster, cid)) {
          return { ok: false, reason: 'resonanceSlots に未所持キャラが含まれています' };
        }
        if (resSet.has(cid) || partySet.has(cid)) {
          return { ok: false, reason: 'resonanceSlots のキャラが重複または編成と衝突しています' };
        }
        resSet.add(cid);
      }
    }

    // synthesisPity
    if (!isPlainObject(obj.synthesisPity)) {
      return { ok: false, reason: 'synthesisPity が不正です' };
    }
    const pityKeys = Object.keys(obj.synthesisPity);
    for (let i = 0; i < pityKeys.length; i += 1) {
      const pk = pityKeys[i];
      if (!isValidSynthesisPityKey(MasterData, pk) || !isNonNegSafeInt(obj.synthesisPity[pk])) {
        return { ok: false, reason: 'synthesisPity のキーまたは値が不正です: ' + pk };
      }
    }

    // progress
    if (!isPlainObject(obj.progress) || !hasKeysWithin(obj.progress, PROGRESS_KEYS, PROGRESS_OPTIONAL_KEYS)) {
      return { ok: false, reason: 'progress が不正です' };
    }
    if (!Array.isArray(obj.progress.clearedStages)) {
      return { ok: false, reason: 'clearedStages が配列ではありません' };
    }
    const clearedStageSet = new Set();
    for (let i = 0; i < obj.progress.clearedStages.length; i += 1) {
      const stg = obj.progress.clearedStages[i];
      if (typeof stg !== 'string' || !hasOwn(MasterData.STAGE_MAP, stg) || clearedStageSet.has(stg)) {
        return { ok: false, reason: 'clearedStages が不正または重複しています: ' + stg };
      }
      clearedStageSet.add(stg);
    }
    if (!isNonNegSafeInt(obj.progress.abyssMaxFloor)) {
      return { ok: false, reason: 'abyssMaxFloor が不正です' };
    }
    if (!isPlainObject(obj.progress.raidCleared)) {
      return { ok: false, reason: 'raidCleared が不正です' };
    }
    const raidBossIdSet = new Set(MasterData.RAID_BOSSES.map(function (b) { return b.id; }));
    const raidClearedBossIds = Object.keys(obj.progress.raidCleared);
    for (let i = 0; i < raidClearedBossIds.length; i += 1) {
      const rbid = raidClearedBossIds[i];
      if (!raidBossIdSet.has(rbid)) {
        return { ok: false, reason: 'raidCleared に存在しない討伐ボスIDがあります: ' + rbid };
      }
      const diffObj = obj.progress.raidCleared[rbid];
      if (!isPlainObject(diffObj)) {
        return { ok: false, reason: 'raidCleared のボス記録が不正です: ' + rbid };
      }
      const diffKeys = Object.keys(diffObj);
      for (let d = 0; d < diffKeys.length; d += 1) {
        const dk = diffKeys[d];
        if (!RAID_DIFF_KEYS.has(dk)) {
          return { ok: false, reason: 'raidCleared に不正な難易度キーがあります: ' + dk };
        }
        const dv = diffObj[dk];
        if (typeof dv !== 'boolean' && !isNonNegSafeInt(dv)) {
          return { ok: false, reason: 'raidCleared の値が不正です: ' + rbid + '.' + dk };
        }
      }
    }
    if (hasOwn(obj.progress, 'raidBestDamage')) {
      if (!isPlainObject(obj.progress.raidBestDamage)) {
        return { ok: false, reason: 'raidBestDamage が不正です' };
      }
      const bestBossIds = Object.keys(obj.progress.raidBestDamage);
      for (let i = 0; i < bestBossIds.length; i += 1) {
        const rbid = bestBossIds[i];
        if (!raidBossIdSet.has(rbid)) {
          return { ok: false, reason: 'raidBestDamage に存在しない討伐ボスIDがあります: ' + rbid };
        }
        const diffObj = obj.progress.raidBestDamage[rbid];
        if (!isPlainObject(diffObj)) {
          return { ok: false, reason: 'raidBestDamage のボス記録が不正です: ' + rbid };
        }
        const diffKeys = Object.keys(diffObj);
        for (let d = 0; d < diffKeys.length; d += 1) {
          const dk = diffKeys[d];
          if (!RAID_DIFF_KEYS.has(dk)) {
            return { ok: false, reason: 'raidBestDamage に不正な難易度キーがあります: ' + dk };
          }
          if (!isNonNegSafeInt(diffObj[dk])) {
            return { ok: false, reason: 'raidBestDamage の値が不正です: ' + rbid + '.' + dk };
          }
        }
      }
    }
    if (!Array.isArray(obj.progress.trialsCleared)) {
      return { ok: false, reason: 'trialsCleared が配列ではありません' };
    }
    const validTrialIds = new Set(MasterData.TRIALS.map(function (t) { return t.id; }));
    const trialSeenSet = new Set();
    for (let i = 0; i < obj.progress.trialsCleared.length; i += 1) {
      const tid = obj.progress.trialsCleared[i];
      if (typeof tid !== 'string' || !validTrialIds.has(tid) || trialSeenSet.has(tid)) {
        return { ok: false, reason: 'trialsCleared が不正または重複しています' };
      }
      trialSeenSet.add(tid);
    }
    if (!isNonNegSafeInt(obj.progress.totalBattles)) {
      return { ok: false, reason: 'totalBattles が不正です' };
    }

    // summon
    if (!isPlainObject(obj.summon) || !hasKeysWithin(obj.summon, SUMMON_KEYS, SUMMON_OPTIONAL_KEYS)) {
      return { ok: false, reason: 'summon が不正です' };
    }
    if (!Number.isSafeInteger(obj.summon.pityCount) || obj.summon.pityCount < 0 || obj.summon.pityCount > 80) {
      return { ok: false, reason: 'summon.pityCount が不正です' };
    }
    if (hasOwn(obj.summon, 'srPityCount')) {
      if (!Number.isSafeInteger(obj.summon.srPityCount) || obj.summon.srPityCount < 0 || obj.summon.srPityCount > 40) {
        return { ok: false, reason: 'summon.srPityCount が不正です' };
      }
    }
    if (!isNonNegSafeInt(obj.summon.totalPulls)) {
      return { ok: false, reason: 'summon.totalPulls が不正です' };
    }
    const validBannerIds = new Set(MasterData.BANNERS.map(function (b) { return b.id; }));
    if (typeof obj.summon.selectedBannerId !== 'string' || !validBannerIds.has(obj.summon.selectedBannerId)) {
      return { ok: false, reason: '存在しない召喚バナーIDです' };
    }

    // expeditions
    if (!Array.isArray(obj.expeditions) || obj.expeditions.length > 4) {
      return { ok: false, reason: 'expeditions が不正です' };
    }
    const zoneMap = new Map();
    for (let z = 0; z < MasterData.EXPEDITION_ZONES.length; z += 1) {
      zoneMap.set(MasterData.EXPEDITION_ZONES[z].id, MasterData.EXPEDITION_ZONES[z]);
    }
    const activeExpCharSet = new Set();
    for (let i = 0; i < obj.expeditions.length; i += 1) {
      const exp = obj.expeditions[i];
      if (!isPlainObject(exp) || !hasExactKeys(exp, EXPEDITION_KEYS)) {
        return { ok: false, reason: '異界調査エントリが不正です' };
      }
      if (typeof exp.zoneId !== 'string' || !zoneMap.has(exp.zoneId)) {
        return { ok: false, reason: '異界調査の区画IDが不正です' };
      }
      const zone = zoneMap.get(exp.zoneId);
      if (typeof exp.claimed !== 'boolean') {
        return { ok: false, reason: '異界調査の claimed が不正です' };
      }
      if (!Number.isSafeInteger(exp.requiredBattles) || exp.requiredBattles !== zone.requiredBattles) {
        return { ok: false, reason: '異界調査の必要戦闘回数が区画定義と一致しません' };
      }
      if (!isNonNegSafeInt(exp.battlesDone, exp.requiredBattles)) {
        return { ok: false, reason: '異界調査の戦闘回数値が不正です' };
      }
      if (!Array.isArray(exp.charIds) || exp.charIds.length < 1 || exp.charIds.length > zone.maxChars) {
        return { ok: false, reason: '異界調査の派遣人数が不正です' };
      }
      const expCharSet = new Set();
      for (let c = 0; c < exp.charIds.length; c += 1) {
        const cid = exp.charIds[c];
        if (typeof cid !== 'string' || !hasOwn(obj.roster, cid) || expCharSet.has(cid)) {
          return { ok: false, reason: '異界調査の派遣キャラが不正です' };
        }
        expCharSet.add(cid);
        if (!exp.claimed) {
          if (partySet.has(cid) || resSet.has(cid) || activeExpCharSet.has(cid)) {
            return { ok: false, reason: '異界調査の派遣キャラが編成・共鳴または他調査と重複しています: ' + cid };
          }
          activeExpCharSet.add(cid);
        }
      }
    }

    // settings
    if (!isPlainObject(obj.settings) || !hasExactKeys(obj.settings, SETTINGS_KEYS)) {
      return { ok: false, reason: 'settings が不正です' };
    }
    if (!Number.isSafeInteger(obj.settings.autoSellMaxQualityIdx) ||
        obj.settings.autoSellMaxQualityIdx < -1 || obj.settings.autoSellMaxQualityIdx > 3) {
      return { ok: false, reason: 'autoSellMaxQualityIdx が不正です' };
    }
    if (obj.settings.battleSpeed !== 1 && obj.settings.battleSpeed !== 2 && obj.settings.battleSpeed !== 3) {
      return { ok: false, reason: 'battleSpeed が不正です' };
    }
    if (!isNonNegSafeInt(obj.settings.autoRepeatCount)) {
      return { ok: false, reason: 'autoRepeatCount が不正です' };
    }
    if (typeof obj.settings.soundMuted !== 'boolean') {
      return { ok: false, reason: 'soundMuted が不正です' };
    }
    if (typeof obj.settings.soundVolume !== 'number' ||
        !Number.isFinite(obj.settings.soundVolume) ||
        obj.settings.soundVolume < 0 || obj.settings.soundVolume > 1) {
      return { ok: false, reason: 'soundVolume が不正です' };
    }

    return { ok: true };
  }

  async function signState(payload) {
    const check = validateSchema(payload);
    if (!check.ok) {
      throw new Error('セーブデータスキーマ検証失敗: ' + check.reason);
    }
    const envelopeBody = {
      format: SAVE_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      alg: 'HMAC-SHA256',
      savedAt: new Date().toISOString(),
      payload
    };
    const canonical = canonicalStringify(envelopeBody);
    const mac = await computeHmacHex(canonical);
    return {
      format: envelopeBody.format,
      schemaVersion: envelopeBody.schemaVersion,
      alg: envelopeBody.alg,
      savedAt: envelopeBody.savedAt,
      payload: envelopeBody.payload,
      mac
    };
  }

  async function verifyAndParse(rawJsonOrObj) {
    try {
      let parsed = rawJsonOrObj;
      if (typeof rawJsonOrObj === 'string') {
        parsed = JSON.parse(rawJsonOrObj);
      }
      if (!isPlainObject(parsed) || !hasExactKeys(parsed, ['format', 'schemaVersion', 'alg', 'savedAt', 'payload', 'mac'])) {
        return { ok: false, reason: 'セーブエンベロープ構成が不正です' };
      }
      if (parsed.format !== SAVE_FORMAT ||
          parsed.schemaVersion !== SCHEMA_VERSION ||
          parsed.alg !== 'HMAC-SHA256' ||
          typeof parsed.savedAt !== 'string' ||
          typeof parsed.mac !== 'string' ||
          !hasOwn(parsed, 'payload')) {
        return { ok: false, reason: 'セーブエンベロープ形式が不正です' };
      }
      if (!/^[0-9a-f]{64}$/.test(parsed.mac)) {
        return { ok: false, reason: '署名MAC形式が不正です' };
      }

      const bodyToVerify = {
        format: parsed.format,
        schemaVersion: parsed.schemaVersion,
        alg: parsed.alg,
        savedAt: parsed.savedAt,
        payload: parsed.payload
      };
      const canonical = canonicalStringify(bodyToVerify);
      const expectedMac = await computeHmacHex(canonical);
      if (!constantTimeEqual(parsed.mac, expectedMac)) {
        return { ok: false, reason: '改ざん検知：署名MACが一致しません' };
      }

      const schemaResult = validateSchema(parsed.payload);
      if (!schemaResult.ok) {
        return { ok: false, reason: 'スキーマ検証失敗：' + schemaResult.reason };
      }

      return { ok: true, state: parsed.payload };
    } catch (err) {
      return {
        ok: false,
        reason: 'セーブ解析失敗：' + (err && err.message ? err.message : '不正な形式です')
      };
    }
  }

  async function exportBackup(state) {
    const signed = await signState(state);
    return JSON.stringify(signed, null, 2);
  }

  async function importBackup(jsonText) {
    return verifyAndParse(jsonText);
  }

  IkaiApp.SaveSecurity = Object.freeze({
    SAVE_FORMAT,
    SCHEMA_VERSION,
    signState,
    verifyAndParse,
    exportBackup,
    importBackup,
    validateSchema,
    _internal: Object.freeze({
      sha256HexPureJs,
      hmacSha256HexPureJs,
      computeHmacHex,
      canonicalStringify,
      constantTimeEqual
    })
  });
})(typeof window !== 'undefined' ? window : globalThis);
