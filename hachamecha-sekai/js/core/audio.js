(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});
  let ctx = null;
  let enabled = true;

  function ensureCtx() {
    if (!enabled) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    gain.gain.setValueAtTime(vol || 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  HW.Audio = {
    setEnabled: function (flag) {
      enabled = Boolean(flag);
    },
    isEnabled: function () {
      return enabled;
    },
    unlock: function () {
      ensureCtx();
    },
    tap: function () {
      tone(620, 0.045, 'sine', 0.035, 760);
    },
    hit: function (isCrit) {
      if (isCrit) {
        tone(520, 0.09, 'sawtooth', 0.055, 980);
        setTimeout(() => tone(880, 0.1, 'triangle', 0.05, 1320), 30);
      } else {
        tone(220, 0.065, 'square', 0.035, 120);
      }
    },
    heal: function () {
      tone(520, 0.08, 'sine', 0.04, 780);
      setTimeout(() => tone(780, 0.11, 'sine', 0.04, 1040), 45);
    },
    spark: function () {
      tone(740, 0.08, 'triangle', 0.06, 1180);
      setTimeout(() => tone(1180, 0.14, 'sine', 0.06, 1660), 60);
    },
    rankUp: function () {
      [523, 659, 784, 1046].forEach((f, idx) => {
        setTimeout(() => tone(f, 0.12, 'triangle', 0.055), idx * 65);
      });
    },
    maxDrop: function () {
      [660, 880, 1108, 1318, 1760].forEach((f, idx) => {
        setTimeout(() => tone(f, 0.14, 'sine', 0.06), idx * 55);
      });
    },
    win: function () {
      [440, 554, 659, 880].forEach((f, idx) => {
        setTimeout(() => tone(f, 0.15, 'triangle', 0.05), idx * 70);
      });
    }
  };
})();
