/* ==========================================================================
   audio.js - Web Audio API プロシージャル効果音（外部音声ファイル不使用）
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});
  let ctx = null;
  let enabled = true;
  let lastPlayAt = 0;

  function ensureContext() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch { return null; }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function unlock() {
    ensureContext();
  }

  function setEnabled(flag) {
    enabled = !!flag;
  }

  function isEnabled() {
    return enabled;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
    gain.gain.setValueAtTime(vol || 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  function play(kind) {
    if (!enabled) return;
    const nowMs = performance.now();
    if (kind === 'hit' && nowMs - lastPlayAt < 45) return;
    lastPlayAt = nowMs;

    switch (kind) {
      case 'tap':
        tone(560, 0.045, 'sine', 0.04, 720);
        break;
      case 'hit':
        tone(220, 0.07, 'square', 0.045, 95);
        break;
      case 'crit':
        tone(520, 0.09, 'sawtooth', 0.06, 980);
        setTimeout(() => tone(880, 0.1, 'triangle', 0.05, 420), 40);
        break;
      case 'heal':
        tone(523, 0.09, 'sine', 0.05, 784);
        break;
      case 'buff':
        tone(440, 0.08, 'triangle', 0.045, 660);
        break;
      case 'chaos':
        tone(260, 0.14, 'sawtooth', 0.07, 880);
        setTimeout(() => tone(660, 0.18, 'square', 0.05, 1320), 75);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => {
          setTimeout(() => tone(f, 0.13, 'triangle', 0.06), i * 70);
        });
        break;
      case 'lose':
        [330, 293, 246].forEach((f, i) => {
          setTimeout(() => tone(f, 0.16, 'sawtooth', 0.05), i * 95);
        });
        break;
      case 'drop':
        tone(784, 0.08, 'sine', 0.055, 1174);
        break;
      default:
        break;
    }
  }

  HS.AUDIO = { unlock, setEnabled, isEnabled, play };
})(window);
