/* セキュリティ・暗号化・HMAC改ざん検知・二重バックアップ・サニタイズ基盤 */
(function () {
  'use strict';

  const STORAGE_KEY_PRIMARY = 'ikai_zankyo_save_v1';
  const STORAGE_KEY_BACKUP = 'ikai_zankyo_backup_v1';
  const SECRET_SALT = 'IZ#2026!Ech0$Vault@9f4c2a81e7b3';

  /* HTMLエスケープ（XSS完全防止） */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* 同期・完全オフライン互換の暗号学的ハッシュ（SHA-256純JS実装：file://でもHTTPSでも同一動作） */
  function sha256Hex(ascii) {
    const rightRotate = (v, a) => (v >>> a) | (v << (32 - a));
    const maxWord = Math.pow(2, 32);
    const words = [];
    const bytes = new TextEncoder().encode(ascii);
    const bitLen = bytes.length * 8;

    const hash = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    for (let i = 0; i < bytes.length; i++) {
      words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
    }
    words[bytes.length >> 2] |= 0x80 << ((3 - (bytes.length % 4)) * 8);
    const paddedLen = (((bytes.length + 8) >> 6) + 1) * 16;
    while (words.length < paddedLen - 2) words.push(0);
    words.push(Math.floor(bitLen / maxWord));
    words.push(bitLen >>> 0);

    for (let j = 0; j < words.length; j += 16) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = words[j + i] | 0;
      for (let i = 16; i < 64; i++) {
        const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = hash;
      for (let i = 0; i < 64; i++) {
        const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + k[i] + w[i]) | 0;
        const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      hash[0] = (hash[0] + a) | 0; hash[1] = (hash[1] + b) | 0;
      hash[2] = (hash[2] + c) | 0; hash[3] = (hash[3] + d) | 0;
      hash[4] = (hash[4] + e) | 0; hash[5] = (hash[5] + f) | 0;
      hash[6] = (hash[6] + g) | 0; hash[7] = (hash[7] + h) | 0;
    }
    return hash.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }

  /* HMAC風署名生成 */
  function signPayload(nonce, cipherB64) {
    const inner = sha256Hex(SECRET_SALT + ':in:' + nonce + ':' + cipherB64);
    return sha256Hex(SECRET_SALT + ':out:' + inner + ':' + nonce);
  }

  /* ストリーム暗号化/復号（nonce + SHA-256キーストリーム） */
  function xorStream(bytes, nonce) {
    const out = new Uint8Array(bytes.length);
    let blockIndex = 0;
    let keyBlock = null;
    for (let i = 0; i < bytes.length; i++) {
      if (i % 32 === 0) {
        const hex = sha256Hex(SECRET_SALT + ':' + nonce + ':' + blockIndex);
        keyBlock = new Uint8Array(32);
        for (let b = 0; b < 32; b++) {
          keyBlock[b] = parseInt(hex.slice(b * 2, b * 2 + 2), 16);
        }
        blockIndex++;
      }
      out[i] = bytes[i] ^ keyBlock[i % 32];
    }
    return out;
  }

  function bytesToBase64(bytes) {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function genNonce() {
    const arr = new Uint8Array(12);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /* 暗号化＋署名封筒の作成 */
  function sealData(obj) {
    const json = JSON.stringify(obj);
    const plainBytes = new TextEncoder().encode(json);
    const nonce = genNonce();
    const cipherBytes = xorStream(plainBytes, nonce);
    const payload = bytesToBase64(cipherBytes);
    const sig = signPayload(nonce, payload);
    return JSON.stringify({ v: 1, n: nonce, p: payload, s: sig });
  }

  /* 改ざん検証付き復号 */
  function unsealData(envelopeStr) {
    if (typeof envelopeStr !== 'string' || envelopeStr.length < 20) {
      return { ok: false, reason: 'invalid_format' };
    }
    try {
      const env = JSON.parse(envelopeStr);
      if (!env || env.v !== 1 || typeof env.n !== 'string' || typeof env.p !== 'string' || typeof env.s !== 'string') {
        return { ok: false, reason: 'invalid_envelope' };
      }
      const expectedSig = signPayload(env.n, env.p);
      if (expectedSig !== env.s) {
        return { ok: false, reason: 'tampered' };
      }
      const cipherBytes = base64ToBytes(env.p);
      const plainBytes = xorStream(cipherBytes, env.n);
      const json = new TextDecoder().decode(plainBytes);
      const data = JSON.parse(json);
      if (!data || typeof data !== 'object') {
        return { ok: false, reason: 'corrupt_payload' };
      }
      return { ok: true, data };
    } catch (_) {
      return { ok: false, reason: 'decode_error' };
    }
  }

  /* 二重バックアップ付きローカル保存 */
  function saveSecure(stateObj) {
    try {
      const sealed = sealData(stateObj);
      const prev = localStorage.getItem(STORAGE_KEY_PRIMARY);
      if (prev) {
        const checkPrev = unsealData(prev);
        if (checkPrev.ok) {
          localStorage.setItem(STORAGE_KEY_BACKUP, prev);
        }
      }
      localStorage.setItem(STORAGE_KEY_PRIMARY, sealed);
      return true;
    } catch (_) {
      return false;
    }
  }

  /* 改ざん時自動ロールバック付き読込 */
  function loadSecure() {
    try {
      const rawPrimary = localStorage.getItem(STORAGE_KEY_PRIMARY);
      if (rawPrimary) {
        const res = unsealData(rawPrimary);
        if (res.ok) return { status: 'ok', data: res.data };
        const rawBackup = localStorage.getItem(STORAGE_KEY_BACKUP);
        if (rawBackup) {
          const bk = unsealData(rawBackup);
          if (bk.ok) {
            localStorage.setItem(STORAGE_KEY_PRIMARY, rawBackup);
            return { status: 'restored_backup', data: bk.data };
          }
        }
        return { status: 'tampered', data: null };
      }
      return { status: 'empty', data: null };
    } catch (_) {
      return { status: 'empty', data: null };
    }
  }

  function clearSecure() {
    try {
      localStorage.removeItem(STORAGE_KEY_PRIMARY);
      localStorage.removeItem(STORAGE_KEY_BACKUP);
    } catch (_) {}
  }

  /* 引き継ぎコード（署名・暗号化済み） */
  function exportTransferCode(stateObj) {
    const sealed = sealData(stateObj);
    const bytes = new TextEncoder().encode(sealed);
    return 'IZ1-' + bytesToBase64(bytes);
  }

  function importTransferCode(codeStr) {
    if (typeof codeStr !== 'string') return { ok: false, reason: 'empty' };
    const trimmed = codeStr.trim();
    if (!trimmed.startsWith('IZ1-')) return { ok: false, reason: 'bad_prefix' };
    try {
      const bytes = base64ToBytes(trimmed.slice(4));
      const envStr = new TextDecoder().decode(bytes);
      return unsealData(envStr);
    } catch (_) {
      return { ok: false, reason: 'bad_code' };
    }
  }

  /* 数値サニタイズ＆フォーマット（桁が増えてもUI崩れしない） */
  function clampInt(val, min, max, fallback) {
    const n = Math.floor(Number(val));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function formatNum(n) {
    const v = Math.floor(Number(n) || 0);
    const abs = Math.abs(v);
    if (abs >= 100000000) return (v / 100000000).toFixed(1) + '億';
    if (abs >= 10000000) return Math.floor(v / 10000) + '万';
    if (abs >= 100000) return (v / 10000).toFixed(1) + '万';
    return v.toLocaleString('ja-JP');
  }

  /* モジュール内部名前空間のみに凍結登録（ゲーム状態本体は非露出） */
  const NS = Object.freeze({
    escapeHtml,
    saveSecure,
    loadSecure,
    clearSecure,
    exportTransferCode,
    importTransferCode,
    clampInt,
    formatNum
  });

  Object.defineProperty(window, '__IZ_SEC__', {
    value: NS,
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
