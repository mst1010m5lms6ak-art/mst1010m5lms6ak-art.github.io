/* 完全オフライン軽量 Web Audio シンセSE（外部音源ゼロ・発熱極小） */
(function () {
  'use strict';

  let ctx = null;
  let enabled = true;

  function ensureCtx() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensureCtx();
    if (!c) return;
    try {
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
      gain.gain.setValueAtTime(vol || 0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    } catch (_) {}
  }

  function play(kind) {
    if (!enabled) return;
    switch (kind) {
      case 'tap':
        tone(680, 0.045, 'triangle', 0.04, 520);
        break;
      case 'hit':
        tone(210, 0.06, 'sawtooth', 0.035, 95);
        break;
      case 'crit':
        tone(520, 0.09, 'square', 0.04, 880);
        break;
      case 'heal':
        tone(580, 0.11, 'sine', 0.045, 860);
        break;
      case 'boss':
        tone(140, 0.28, 'sawtooth', 0.065, 78);
        setTimeout(() => tone(190, 0.24, 'sawtooth', 0.06, 92), 140);
        break;
      case 'intruder':
        tone(340, 0.14, 'square', 0.055, 620);
        setTimeout(() => tone(460, 0.18, 'square', 0.055, 790), 110);
        break;
      case 'summon':
        tone(440, 0.12, 'triangle', 0.05, 660);
        setTimeout(() => tone(660, 0.16, 'sine', 0.055, 990), 90);
        break;
      case 'rare':
        tone(523, 0.1, 'triangle', 0.055, 659);
        setTimeout(() => tone(659, 0.12, 'triangle', 0.055, 784), 85);
        setTimeout(() => tone(784, 0.2, 'sine', 0.065, 1046), 175);
        break;
      case 'win':
        tone(523, 0.1, 'triangle', 0.05);
        setTimeout(() => tone(659, 0.1, 'triangle', 0.05), 90);
        setTimeout(() => tone(784, 0.18, 'sine', 0.06), 180);
        break;
      default:
        break;
    }
  }

  function setEnabled(flag) {
    enabled = Boolean(flag);
  }

  function isEnabled() {
    return enabled;
  }

  Object.defineProperty(window, '__IZ_AUDIO__', {
    value: Object.freeze({ play, setEnabled, isEnabled, unlock: ensureCtx }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
