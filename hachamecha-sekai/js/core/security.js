(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});
  const SALT = 'HW::ChaosVerse::2026::IntegritySalt#9f3a';

  function fnv1a(str, seed) {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  function signPayload(jsonStr) {
    const p1 = fnv1a(SALT + jsonStr, 2166136261);
    const p2 = fnv1a(jsonStr + SALT + jsonStr.length, 3735928559);
    const p3 = fnv1a(p1 + ':' + p2 + ':' + SALT, 13371337);
    return p1 + p2 + p3;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function encodeSave(saveObj) {
    const body = JSON.stringify(saveObj);
    const sig = signPayload(body);
    return JSON.stringify({ v: 1, sig: sig, body: body });
  }

  function decodeSave(rawStr) {
    if (!rawStr || typeof rawStr !== 'string') return { ok: false, reason: 'empty' };
    try {
      const parsed = JSON.parse(rawStr);
      if (!parsed || typeof parsed.body !== 'string' || typeof parsed.sig !== 'string') {
        return { ok: false, reason: 'format' };
      }
      const expected = signPayload(parsed.body);
      if (expected !== parsed.sig) {
        return { ok: false, reason: 'tampered' };
      }
      const data = JSON.parse(parsed.body);
      if (!data || typeof data !== 'object' || !data.chars) {
        return { ok: false, reason: 'invalid' };
      }
      return { ok: true, data: data };
    } catch (_e) {
      return { ok: false, reason: 'parse' };
    }
  }

  function exportBackupCode(saveObj) {
    const packed = encodeSave(saveObj);
    const bytes = new TextEncoder().encode(packed);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'HWSAVE1:' + btoa(bin);
  }

  function importBackupCode(code) {
    if (!code || typeof code !== 'string') return { ok: false, reason: 'empty' };
    const trimmed = code.trim();
    if (!trimmed.startsWith('HWSAVE1:')) return { ok: false, reason: 'prefix' };
    try {
      const bin = atob(trimmed.slice(8));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const raw = new TextDecoder().decode(bytes);
      return decodeSave(raw);
    } catch (_e) {
      return { ok: false, reason: 'decode' };
    }
  }

  HW.Security = {
    escapeHtml: escapeHtml,
    encodeSave: encodeSave,
    decodeSave: decodeSave,
    exportBackupCode: exportBackupCode,
    importBackupCode: importBackupCode
  };
})();
