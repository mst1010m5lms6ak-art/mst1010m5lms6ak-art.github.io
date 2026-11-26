'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});

  // --- Pure-JS SHA-256 & HMAC-SHA256 (works offline, file://, HTTPS, Capacitor) ---
  const K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  function utf8ToBytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c < 0xd800 || c >= 0xe000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      else {
        i++;
        c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return new Uint8Array(out);
  }

  function bytesToUtf8(bytes) {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(bytes);
    }
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i];
      if (c < 0x80) out += String.fromCharCode(c);
      else if (c < 0xe0) out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[++i] & 0x3f));
      else if (c < 0xf0) out += String.fromCharCode(((c & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f));
      else {
        const cp = (((c & 0x07) << 18) | ((bytes[++i] & 0x3f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f)) - 0x10000;
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      }
    }
    return out;
  }

  function sha256Bytes(msgBytes) {
    const bitLen = msgBytes.length * 8;
    const padLen = ((msgBytes.length + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(padLen);
    buf.set(msgBytes);
    buf[msgBytes.length] = 0x80;
    const view = new DataView(buf.buffer);
    const high = Math.floor(bitLen / 0x100000000);
    const low = bitLen >>> 0;
    view.setUint32(padLen - 8, high, false);
    view.setUint32(padLen - 4, low, false);

    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const w = new Uint32Array(64);

    for (let offset = 0; offset < padLen; offset += 64) {
      for (let i = 0; i < 16; i++) {
        w[i] = view.getUint32(offset + i * 4, false);
      }
      for (let i = 16; i < 64; i++) {
        const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
        const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K256[i] + w[i]) >>> 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0;
        d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach((val, idx) => outView.setUint32(idx * 4, val, false));
    return out;
  }

  function bytesToHex(bytes) {
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  function hmacSha256Hex(keyStr, msgStr) {
    let keyBytes = utf8ToBytes(keyStr);
    if (keyBytes.length > 64) keyBytes = sha256Bytes(keyBytes);
    const keyBlock = new Uint8Array(64);
    keyBlock.set(keyBytes);
    const oPad = new Uint8Array(64);
    const iPad = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      oPad[i] = keyBlock[i] ^ 0x5c;
      iPad[i] = keyBlock[i] ^ 0x36;
    }
    const msgBytes = utf8ToBytes(msgStr);
    const inner = new Uint8Array(64 + msgBytes.length);
    inner.set(iPad, 0);
    inner.set(msgBytes, 64);
    const innerHash = sha256Bytes(inner);
    const outer = new Uint8Array(64 + 32);
    outer.set(oPad, 0);
    outer.set(innerHash, 64);
    return bytesToHex(sha256Bytes(outer));
  }

  function timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  // Application-derived integrity secret (split assembly)
  const KEY_PARTS = ['KC9#v1', 'Chrono', 'Resonance', 'Vault!26', 'Sealed'];
  function getIntegritySecret(salt) {
    return bytesToHex(sha256Bytes(utf8ToBytes(KEY_PARTS.join('::') + '::' + (salt || 'local'))));
  }

  function obfuscatePayload(plainText, nonce) {
    const raw = utf8ToBytes(plainText);
    const keyStream = sha256Bytes(utf8ToBytes(getIntegritySecret('xor') + ':' + nonce));
    const masked = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      masked[i] = raw[i] ^ keyStream[i % keyStream.length] ^ ((i * 31) & 0xff);
    }
    let bin = '';
    for (let i = 0; i < masked.length; i++) bin += String.fromCharCode(masked[i]);
    return btoa(bin);
  }

  function deobfuscatePayload(encoded, nonce) {
    const bin = atob(encoded);
    const masked = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) masked[i] = bin.charCodeAt(i);
    const keyStream = sha256Bytes(utf8ToBytes(getIntegritySecret('xor') + ':' + nonce));
    const raw = new Uint8Array(masked.length);
    for (let i = 0; i < masked.length; i++) {
      raw[i] = masked[i] ^ keyStream[i % keyStream.length] ^ ((i * 31) & 0xff);
    }
    return bytesToUtf8(raw);
  }

  function randomNonce() {
    if (global.crypto && global.crypto.getRandomValues) {
      const arr = new Uint8Array(12);
      global.crypto.getRandomValues(arr);
      return bytesToHex(arr);
    }
    return bytesToHex(sha256Bytes(utf8ToBytes(String(Date.now()) + ':' + String(Math.random())))).slice(0, 24);
  }

  // Prototype-pollution safe JSON parser
  function safeJsonParse(str) {
    if (typeof str !== 'string' || str.length > 1500000) return null;
    try {
      return JSON.parse(str, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
    } catch (_e) {
      return null;
    }
  }

  function clampNumber(val, min, max, fallback) {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function clampInt(val, min, max, fallback) {
    return Math.floor(clampNumber(val, min, max, fallback));
  }

  // Envelope signing & verification
  const ENVELOPE_VERSION = 1;

  function signSaveEnvelope(dataObj, salt) {
    const nonce = randomNonce();
    const ts = Date.now();
    const mono = Math.floor(typeof performance !== 'undefined' ? performance.now() : 0);
    const plain = JSON.stringify(dataObj);
    const payload = obfuscatePayload(plain, nonce);
    const signInput = `${ENVELOPE_VERSION}|${ts}|${mono}|${nonce}|${payload}`;
    const sig = hmacSha256Hex(getIntegritySecret(salt || 'save'), signInput);
    return JSON.stringify({
      v: ENVELOPE_VERSION,
      ts,
      mono,
      nonce,
      payload,
      sig
    });
  }

  function verifySaveEnvelope(rawStr, salt) {
    const env = safeJsonParse(rawStr);
    if (!env || typeof env !== 'object') {
      return { ok: false, reason: 'FORMAT_ERROR', data: null };
    }
    if (env.v !== ENVELOPE_VERSION || typeof env.payload !== 'string' || typeof env.sig !== 'string' || typeof env.nonce !== 'string') {
      return { ok: false, reason: 'SCHEMA_ERROR', data: null };
    }
    const signInput = `${env.v}|${env.ts}|${env.mono}|${env.nonce}|${env.payload}`;
    const expected = hmacSha256Hex(getIntegritySecret(salt || 'save'), signInput);
    if (!timingSafeEqual(env.sig, expected)) {
      return { ok: false, reason: 'TAMPER_DETECTED', data: null };
    }
    try {
      const plain = deobfuscatePayload(env.payload, env.nonce);
      const data = safeJsonParse(plain);
      if (!data || typeof data !== 'object') {
        return { ok: false, reason: 'CORRUPT_PAYLOAD', data: null };
      }
      return { ok: true, reason: 'OK', data, meta: { ts: env.ts, mono: env.mono } };
    } catch (_e) {
      return { ok: false, reason: 'DECODE_ERROR', data: null };
    }
  }

  // Monotonic clock & offline elapsed validator
  const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000; // 24 hours cap
  const CLOCK_BACKWARD_TOLERANCE_MS = 60 * 1000; // 1 minute tolerance for NTP drift

  function evaluateOfflineElapsed(lastSavedWallTs, nowWallTs) {
    const now = clampInt(nowWallTs || Date.now(), 0, 8640000000000000, Date.now());
    const last = clampInt(lastSavedWallTs || now, 0, 8640000000000000, now);
    const rawDelta = now - last;

    if (rawDelta < -CLOCK_BACKWARD_TOLERANCE_MS) {
      return { elapsedMs: 0, anomaly: 'CLOCK_BACKWARD', capped: false };
    }
    if (rawDelta <= 0) {
      return { elapsedMs: 0, anomaly: null, capped: false };
    }
    if (rawDelta > MAX_OFFLINE_MS) {
      return { elapsedMs: MAX_OFFLINE_MS, anomaly: rawDelta > MAX_OFFLINE_MS * 30 ? 'CLOCK_LEAP' : null, capped: true };
    }
    return { elapsedMs: rawDelta, anomaly: null, capped: false };
  }

  // Redundant Storage Vault (IndexedDB + localStorage primary/backup, swappable for Capacitor)
  const LS_PRIMARY = 'kc_vault_primary_v1';
  const LS_BACKUP = 'kc_vault_backup_v1';
  const IDB_NAME = 'KairoChronicleVault';
  const IDB_STORE = 'saves';
  const IDB_KEY = 'primary';

  function openVaultDB() {
    return new Promise((resolve) => {
      if (!global.indexedDB) return resolve(null);
      try {
        const req = global.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (_e) {
        resolve(null);
      }
    });
  }

  async function idbGet(key) {
    const db = await openVaultDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
        req.onerror = () => resolve(null);
      } catch (_e) {
        resolve(null);
      }
    });
  }

  async function idbPut(key, val) {
    const db = await openVaultDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(val, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (_e) {
        resolve(false);
      }
    });
  }

  async function idbClear() {
    const db = await openVaultDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (_e) {
        resolve(false);
      }
    });
  }

  const StorageVault = {
    async requestPersistence() {
      try {
        if (navigator.storage && navigator.storage.persist) {
          return await navigator.storage.persist();
        }
      } catch (_e) {}
      return false;
    },

    async save(stateObj) {
      const envelope = signSaveEnvelope(stateObj, 'save');
      let lsOk = false;
      try {
        const prev = global.localStorage.getItem(LS_PRIMARY);
        if (prev && verifySaveEnvelope(prev, 'save').ok) {
          global.localStorage.setItem(LS_BACKUP, prev);
        }
        global.localStorage.setItem(LS_PRIMARY, envelope);
        lsOk = true;
      } catch (_e) {
        lsOk = false;
      }
      const idbOk = await idbPut(IDB_KEY, envelope);
      return { ok: lsOk || idbOk, lsOk, idbOk };
    },

    async load() {
      const candidates = [];
      let tampered = false;

      let lsPrimary = null;
      let lsBackup = null;
      try {
        lsPrimary = global.localStorage.getItem(LS_PRIMARY);
        lsBackup = global.localStorage.getItem(LS_BACKUP);
      } catch (_e) {}
      const idbPrimary = await idbGet(IDB_KEY);

      const sources = [
        { name: 'localStorage', raw: lsPrimary },
        { name: 'indexedDB', raw: idbPrimary },
        { name: 'backup', raw: lsBackup }
      ];

      for (const src of sources) {
        if (!src.raw) continue;
        const res = verifySaveEnvelope(src.raw, 'save');
        if (res.ok) {
          candidates.push({ source: src.name, data: res.data, ts: res.meta.ts });
        } else if (res.reason === 'TAMPER_DETECTED') {
          tampered = true;
        }
      }

      if (candidates.length === 0) {
        return { found: false, tampered, data: null, source: null };
      }

      candidates.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      const best = candidates[0];

      // Heal corrupted slots from verified healthy slot
      if (tampered) {
        await this.save(best.data);
      }

      return { found: true, tampered, data: best.data, source: best.source };
    },

    exportCode(stateObj) {
      return 'KC1:' + signSaveEnvelope(stateObj, 'transfer');
    },

    importCode(codeStr) {
      if (typeof codeStr !== 'string') return { ok: false, reason: 'FORMAT_ERROR', data: null };
      const trimmed = codeStr.trim();
      if (!trimmed.startsWith('KC1:')) return { ok: false, reason: 'PREFIX_ERROR', data: null };
      return verifySaveEnvelope(trimmed.slice(4), 'transfer');
    },

    async wipeAll() {
      try {
        global.localStorage.removeItem(LS_PRIMARY);
        global.localStorage.removeItem(LS_BACKUP);
      } catch (_e) {}
      await idbClear();
    }
  };

  // Safe DOM builder (zero innerHTML, XSS-proof)
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
        const val = attrs[key];
        if (val === undefined || val === null || val === false) continue;
        if (key === 'className' || key === 'class') {
          node.className = String(val);
        } else if (key === 'text') {
          node.textContent = String(val);
        } else if (key === 'style' && typeof val === 'object') {
          for (const sk in val) {
            if (Object.prototype.hasOwnProperty.call(val, sk)) {
              if (sk.startsWith('--')) node.style.setProperty(sk, String(val[sk]));
              else node.style[sk] = String(val[sk]);
            }
          }
        } else if (key === 'dataset' && typeof val === 'object') {
          for (const dk in val) {
            if (Object.prototype.hasOwnProperty.call(val, dk)) {
              node.dataset[dk] = String(val[dk]);
            }
          }
        } else if (key.startsWith('on') && typeof val === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), val);
        } else if (key === 'disabled') {
          node.disabled = Boolean(val);
        } else if (key === 'value') {
          node.value = String(val);
        } else {
          node.setAttribute(key, String(val));
        }
      }
    }
    if (children !== undefined && children !== null) {
      const list = Array.isArray(children) ? children : [children];
      for (let i = 0; i < list.length; i++) {
        const ch = list[i];
        if (ch === null || ch === undefined || ch === false) continue;
        if (typeof ch === 'string' || typeof ch === 'number') {
          node.appendChild(document.createTextNode(String(ch)));
        } else if (ch instanceof Node) {
          node.appendChild(ch);
        }
      }
    }
    return node;
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  Kairo.security = {
    sha256Hex: (str) => bytesToHex(sha256Bytes(utf8ToBytes(str))),
    hmacSha256Hex,
    timingSafeEqual,
    safeJsonParse,
    clampNumber,
    clampInt,
    signSaveEnvelope,
    verifySaveEnvelope,
    evaluateOfflineElapsed,
    StorageVault,
    MAX_OFFLINE_MS
  };

  Kairo.dom = { el, clearNode };
})(window);
