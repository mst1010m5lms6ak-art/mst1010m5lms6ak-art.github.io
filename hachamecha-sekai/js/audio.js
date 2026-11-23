(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  let ctx = null;
  let enabled = true;

  function ensureCtx() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, freqEnd) {
    const c = ensureCtx();
    if (!c) return;
    try {
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || "triangle";
      osc.frequency.setValueAtTime(freq, now);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + dur);
      gain.gain.setValueAtTime(vol || 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    } catch (_) {}
  }

  HS.AUDIO = {
    setEnabled(flag) {
      enabled = !!flag;
    },
    tap() {
      tone(520, 0.045, "sine", 0.05, 680);
    },
    hit(isCrit) {
      if (isCrit) {
        tone(340, 0.11, "sawtooth", 0.09, 110);
        tone(880, 0.09, "square", 0.05, 1320);
      } else {
        tone(220, 0.065, "triangle", 0.06, 95);
      }
    },
    heal() {
      tone(540, 0.09, "sine", 0.06, 860);
    },
    chaos() {
      tone(280, 0.18, "sawtooth", 0.08, 740);
      setTimeout(() => tone(620, 0.16, "square", 0.06, 980), 80);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => tone(f, 0.12, "triangle", 0.07), i * 65);
      });
    },
    lose() {
      [340, 280, 210].forEach((f, i) => {
        setTimeout(() => tone(f, 0.16, "sawtooth", 0.06), i * 95);
      });
    }
  };
})(window);
