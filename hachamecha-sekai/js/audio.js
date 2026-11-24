(function () {
  'use strict';

  const Hacha = window.Hacha;
  let ctx = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function isEnabled() {
    return !!(Hacha.state && Hacha.state.settings && Hacha.state.settings.seEnabled);
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!isEnabled()) return;
    const ac = ensureCtx();
    if (!ac) return;
    try {
      const now = ac.currentTime + (delay || 0);
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol || 0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (e) {}
  }

  const audio = {
    unlock() {
      ensureCtx();
    },
    play(kind) {
      if (!isEnabled()) return;
      switch (kind) {
        case 'tap':
          tone(540, 0.055, 'triangle', 0.05, 760);
          break;
        case 'hit':
          tone(210, 0.08, 'sawtooth', 0.06, 95);
          break;
        case 'weak':
          tone(480, 0.07, 'square', 0.055, 860);
          tone(720, 0.09, 'triangle', 0.05, 1120, 0.04);
          break;
        case 'crit':
          tone(340, 0.06, 'sawtooth', 0.07, 150);
          tone(920, 0.12, 'triangle', 0.065, 1380, 0.03);
          break;
        case 'heal':
          tone(520, 0.11, 'sine', 0.06, 780);
          tone(780, 0.13, 'sine', 0.055, 1040, 0.06);
          break;
        case 'buff':
          tone(440, 0.09, 'triangle', 0.05, 660);
          tone(660, 0.11, 'triangle', 0.05, 880, 0.05);
          break;
        case 'intrusion':
          tone(220, 0.14, 'sawtooth', 0.085, 180);
          tone(310, 0.14, 'sawtooth', 0.085, 220, 0.14);
          tone(190, 0.22, 'sawtooth', 0.09, 120, 0.28);
          break;
        case 'chain':
          tone(440, 0.1, 'triangle', 0.07, 660);
          tone(660, 0.1, 'triangle', 0.07, 880, 0.07);
          tone(880, 0.18, 'sine', 0.08, 1320, 0.14);
          break;
        case 'perfect':
          tone(659, 0.12, 'sine', 0.07);
          tone(880, 0.12, 'sine', 0.07, null, 0.08);
          tone(1318, 0.24, 'triangle', 0.08, null, 0.16);
          break;
        case 'win':
          tone(523, 0.12, 'triangle', 0.07);
          tone(659, 0.12, 'triangle', 0.07, null, 0.1);
          tone(784, 0.14, 'triangle', 0.07, null, 0.2);
          tone(1046, 0.26, 'sine', 0.08, null, 0.3);
          break;
        case 'lose':
          tone(330, 0.16, 'sawtooth', 0.06, 260);
          tone(240, 0.28, 'sawtooth', 0.06, 150, 0.15);
          break;
        default:
          break;
      }
    }
  };

  Hacha.audio = audio;
})();
