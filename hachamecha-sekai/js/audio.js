'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});

  let ctx = null;
  let masterGain = null;
  let unlocked = false;
  let enabled = true;
  let volume = 0.45;
  let activeVoices = 0;
  const MAX_VOICES = 8;
  const lastPlayedAt = Object.create(null);

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = enabled ? volume : 0;
      masterGain.connect(ctx.destination);
    }
    return ctx;
  }

  function unlockAudio() {
    const ac = ensureContext();
    if (!ac) return;
    if (ac.state === 'suspended' || ac.state === 'interrupted') {
      ac.resume().catch(() => {});
    }
    if (!unlocked) {
      try {
        const buf = ac.createBuffer(1, 1, ac.sampleRate);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.connect(ac.destination);
        src.start(0);
        unlocked = true;
      } catch (_e) {}
    }
  }

  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((ev) => {
    global.addEventListener(ev, unlockAudio, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === 'running') ctx.suspend().catch(() => {});
    } else if (enabled) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    }
  });

  function canPlay(id, minGapMs) {
    if (!enabled || volume <= 0.001) return false;
    const ac = ensureContext();
    if (!ac || ac.state !== 'running') return false;
    if (activeVoices >= MAX_VOICES) return false;
    const now = performance.now();
    if (lastPlayedAt[id] && now - lastPlayedAt[id] < minGapMs) return false;
    lastPlayedAt[id] = now;
    return true;
  }

  function tone(opts) {
    const ac = ctx;
    if (!ac || !masterGain) return;
    const now = ac.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.08;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq || 440, now);
    if (opts.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), now + dur);
    }
    const peak = opts.gain || 0.25;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(g);
    g.connect(masterGain);
    activeVoices++;
    osc.start(now);
    osc.stop(now + dur + 0.015);
    osc.onended = () => {
      activeVoices = Math.max(0, activeVoices - 1);
      try { osc.disconnect(); g.disconnect(); } catch (_e) {}
    };
  }

  function noiseBurst(opts) {
    const ac = ctx;
    if (!ac || !masterGain) return;
    const now = ac.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.08;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ac.createBufferSource();
    src.buffer = buf;

    const filter = ac.createBiquadFilter();
    filter.type = opts.filterType || 'bandpass';
    filter.frequency.setValueAtTime(opts.freq || 1400, now);
    if (opts.freqEnd) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, opts.freqEnd), now + dur);
    }
    filter.Q.value = opts.q || 1.2;

    const g = ac.createGain();
    g.gain.setValueAtTime(opts.gain || 0.22, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    activeVoices++;
    src.start(now);
    src.stop(now + dur + 0.01);
    src.onended = () => {
      activeVoices = Math.max(0, activeVoices - 1);
      try { src.disconnect(); filter.disconnect(); g.disconnect(); } catch (_e) {}
    };
  }

  const SFX = {
    tap() {
      if (!canPlay('tap', 35)) return;
      tone({ type: 'triangle', freq: 620, freqEnd: 480, dur: 0.045, gain: 0.16 });
    },
    tab() {
      if (!canPlay('tab', 45)) return;
      tone({ type: 'sine', freq: 520, freqEnd: 740, dur: 0.06, gain: 0.16 });
    },
    confirm() {
      if (!canPlay('confirm', 60)) return;
      tone({ type: 'triangle', freq: 523.25, dur: 0.07, gain: 0.18 });
      tone({ type: 'triangle', freq: 783.99, delay: 0.045, dur: 0.09, gain: 0.18 });
    },
    error() {
      if (!canPlay('error', 90)) return;
      tone({ type: 'sawtooth', freq: 190, freqEnd: 130, dur: 0.12, gain: 0.14 });
    },
    slash() {
      if (!canPlay('slash', 65)) return;
      noiseBurst({ freq: 2400, freqEnd: 520, dur: 0.085, gain: 0.22, q: 1.5 });
      tone({ type: 'sawtooth', freq: 420, freqEnd: 140, dur: 0.07, gain: 0.12 });
    },
    laser() {
      if (!canPlay('laser', 65)) return;
      tone({ type: 'sawtooth', freq: 1380, freqEnd: 260, dur: 0.09, gain: 0.13 });
      tone({ type: 'sine', freq: 920, freqEnd: 460, dur: 0.07, gain: 0.1 });
    },
    mystic() {
      if (!canPlay('mystic', 65)) return;
      tone({ type: 'sine', freq: 740, freqEnd: 1180, dur: 0.1, gain: 0.13 });
      noiseBurst({ freq: 1800, freqEnd: 900, dur: 0.09, gain: 0.12, q: 2.2 });
    },
    gear() {
      if (!canPlay('gear', 65)) return;
      tone({ type: 'square', freq: 240, freqEnd: 110, dur: 0.08, gain: 0.14 });
      noiseBurst({ freq: 900, freqEnd: 320, dur: 0.07, gain: 0.18, q: 0.9 });
    },
    cosmic() {
      if (!canPlay('cosmic', 65)) return;
      tone({ type: 'sine', freq: 540, freqEnd: 1080, dur: 0.12, gain: 0.14 });
      tone({ type: 'triangle', freq: 270, freqEnd: 180, dur: 0.14, gain: 0.12 });
    },
    crit() {
      if (!canPlay('crit', 70)) return;
      noiseBurst({ freq: 3200, freqEnd: 800, dur: 0.11, gain: 0.26, q: 1.4 });
      tone({ type: 'triangle', freq: 980, freqEnd: 1480, dur: 0.09, gain: 0.2 });
      tone({ type: 'sawtooth', freq: 260, freqEnd: 90, dur: 0.12, gain: 0.16 });
    },
    ult() {
      if (!canPlay('ult', 180)) return;
      tone({ type: 'sine', freq: 220, freqEnd: 880, dur: 0.22, gain: 0.22 });
      tone({ type: 'triangle', freq: 440, freqEnd: 1320, delay: 0.06, dur: 0.24, gain: 0.2 });
      noiseBurst({ freq: 1600, freqEnd: 3600, delay: 0.04, dur: 0.18, gain: 0.2, q: 1.8 });
    },
    heal() {
      if (!canPlay('heal', 110)) return;
      tone({ type: 'sine', freq: 587.33, dur: 0.09, gain: 0.15 });
      tone({ type: 'sine', freq: 880, delay: 0.06, dur: 0.13, gain: 0.16 });
    },
    win() {
      if (!canPlay('win', 220)) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        tone({ type: 'triangle', freq: f, delay: idx * 0.055, dur: 0.14, gain: 0.18 });
      });
    },
    lose() {
      if (!canPlay('lose', 220)) return;
      [349.23, 311.13, 261.63].forEach((f, idx) => {
        tone({ type: 'sawtooth', freq: f, delay: idx * 0.09, dur: 0.16, gain: 0.12 });
      });
    },
    dropRare() {
      if (!canPlay('dropRare', 150)) return;
      tone({ type: 'sine', freq: 880, dur: 0.1, gain: 0.2 });
      tone({ type: 'sine', freq: 1318.5, delay: 0.06, dur: 0.16, gain: 0.22 });
    },
    levelUp() {
      if (!canPlay('levelUp', 90)) return;
      [440, 554.37, 659.25, 880].forEach((f, idx) => {
        tone({ type: 'triangle', freq: f, delay: idx * 0.035, dur: 0.1, gain: 0.16 });
      });
    },
    summonStart() {
      if (!canPlay('summonStart', 160)) return;
      tone({ type: 'sine', freq: 240, freqEnd: 720, dur: 0.26, gain: 0.18 });
      tone({ type: 'triangle', freq: 360, freqEnd: 1080, delay: 0.07, dur: 0.25, gain: 0.16 });
    },
    summonUR() {
      if (!canPlay('summonUR', 200)) return;
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, idx) => {
        tone({ type: 'triangle', freq: f, delay: idx * 0.05, dur: 0.24, gain: 0.22 });
      });
    },
    summonSSR() {
      if (!canPlay('summonSSR', 180)) return;
      [440, 554.37, 659.25, 880].forEach((f, idx) => {
        tone({ type: 'sine', freq: f, delay: idx * 0.05, dur: 0.18, gain: 0.2 });
      });
    },
    forge() {
      if (!canPlay('forge', 120)) return;
      noiseBurst({ freq: 2800, freqEnd: 900, dur: 0.09, gain: 0.22, q: 2.0 });
      tone({ type: 'triangle', freq: 1120, freqEnd: 680, delay: 0.03, dur: 0.14, gain: 0.18 });
    }
  };

  Kairo.audio = {
    play(name) {
      if (SFX[name]) SFX[name]();
    },
    setEnabled(val) {
      enabled = Boolean(val);
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.02);
      }
    },
    setVolume(val) {
      volume = Math.max(0, Math.min(1, Number(val) || 0));
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.02);
      }
    },
    isEnabled: () => enabled,
    getVolume: () => volume,
    unlock: unlockAudio
  };
})(window);
