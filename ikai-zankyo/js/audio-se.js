(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};
  const Env = IkaiApp.Env;

  let ctx = null;
  let muted = false;
  let volume = 0.6;
  let unlocked = false;

  function getAudioCtor() {
    return root.AudioContext || root.webkitAudioContext || null;
  }

  function hasUserActivation() {
    if (root.navigator && root.navigator.userActivation) {
      return Boolean(root.navigator.userActivation.hasBeenActive || root.navigator.userActivation.isActive);
    }
    return true;
  }

  function ensureContext() {
    if (ctx) {
      return ctx;
    }
    if (!hasUserActivation()) {
      return null;
    }
    const Ctor = getAudioCtor();
    if (!Ctor) {
      return null;
    }
    try {
      ctx = new Ctor();
    } catch (_) {
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    if (!hasUserActivation()) {
      return false;
    }
    const audioCtx = ensureContext();
    if (!audioCtx) {
      return false;
    }
    if (audioCtx.state === 'running') {
      unlocked = true;
      return true;
    }
    if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      try {
        const promise = audioCtx.resume();
        if (promise && typeof promise.then === 'function') {
          promise.then(function () {
            if (audioCtx.state === 'running') {
              unlocked = true;
            }
          }).catch(function () {});
        }
      } catch (_) {
        // Ignore gesture errors safely
      }
    }
    return unlocked;
  }

  function setMuted(flag) {
    muted = Boolean(flag);
  }

  function setVolume(v) {
    const num = Number(v);
    if (Env && typeof Env.clamp === 'function') {
      volume = Env.clamp(num, 0, 1);
    } else if (Number.isFinite(num)) {
      volume = Math.min(1, Math.max(0, num));
    }
  }

  function getSettings() {
    return {
      muted,
      volume,
      unlocked: Boolean(unlocked || (ctx && ctx.state === 'running')),
      supported: Boolean(getAudioCtor())
    };
  }

  function playTone(audioCtx, opts) {
    const start = audioCtx.currentTime + (opts.delay || 0);
    const dur = opts.duration || 0.1;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freqStart, start);
    if (opts.freqEnd && opts.freqEnd !== opts.freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), start + dur);
    }

    const peak = Math.max(0.0001, (opts.gain || 0.25) * volume);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.01);
  }

  function playNoise(audioCtx, dur, cutoff, peakGain) {
    const sampleRate = audioCtx.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * dur));
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, peakGain * volume), audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(audioCtx.currentTime);
    src.stop(audioCtx.currentTime + dur + 0.01);
  }

  const SE_LIST = Object.freeze([
    { id: 'ui_tap', label: '操作打鍵' },
    { id: 'ui_tab', label: '画面切替' },
    { id: 'battle_attack', label: '斬撃衝撃' },
    { id: 'battle_crit', label: '会心閃光' },
    { id: 'battle_heal', label: '浄化和音' },
    { id: 'boss_telegraph', label: 'ボス予告' },
    { id: 'summon_ssr', label: 'SSR共鳴' },
    { id: 'victory', label: '勝利余韻' },
    { id: 'defeat', label: '敗北鎮静' }
  ]);

  function play(seId) {
    if (muted || volume <= 0) {
      return false;
    }
    const audioCtx = ensureContext();
    if (!audioCtx) {
      return false;
    }
    if (audioCtx.state !== 'running') {
      if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
        audioCtx.resume().catch(function () {});
      }
      return false;
    }
    unlocked = true;

    try {
      switch (seId) {
        case 'ui_tap':
          playTone(audioCtx, { type: 'triangle', freqStart: 860, freqEnd: 620, duration: 0.045, gain: 0.16 });
          break;
        case 'ui_tab':
          playTone(audioCtx, { type: 'sine', freqStart: 500, freqEnd: 740, duration: 0.065, gain: 0.16 });
          break;
        case 'battle_attack':
          playNoise(audioCtx, 0.09, 1800, 0.22);
          playTone(audioCtx, { type: 'sine', freqStart: 220, freqEnd: 85, duration: 0.11, gain: 0.24 });
          break;
        case 'battle_crit':
          playTone(audioCtx, { type: 'sawtooth', freqStart: 1080, freqEnd: 720, duration: 0.16, gain: 0.14 });
          playTone(audioCtx, { type: 'triangle', freqStart: 1620, freqEnd: 1080, duration: 0.15, gain: 0.18, delay: 0.01 });
          break;
        case 'battle_heal':
          playTone(audioCtx, { type: 'sine', freqStart: 523, freqEnd: 523, duration: 0.14, gain: 0.15, delay: 0 });
          playTone(audioCtx, { type: 'sine', freqStart: 659, freqEnd: 659, duration: 0.14, gain: 0.15, delay: 0.045 });
          playTone(audioCtx, { type: 'sine', freqStart: 784, freqEnd: 784, duration: 0.18, gain: 0.16, delay: 0.09 });
          break;
        case 'boss_telegraph':
          playTone(audioCtx, { type: 'sine', freqStart: 146, freqEnd: 130, duration: 0.32, gain: 0.24 });
          playTone(audioCtx, { type: 'sine', freqStart: 150, freqEnd: 134, duration: 0.32, gain: 0.24 });
          break;
        case 'summon_ssr':
          playTone(audioCtx, { type: 'triangle', freqStart: 440, freqEnd: 440, duration: 0.22, gain: 0.14, delay: 0 });
          playTone(audioCtx, { type: 'sine', freqStart: 554, freqEnd: 554, duration: 0.24, gain: 0.15, delay: 0.06 });
          playTone(audioCtx, { type: 'sine', freqStart: 659, freqEnd: 659, duration: 0.26, gain: 0.15, delay: 0.12 });
          playTone(audioCtx, { type: 'triangle', freqStart: 880, freqEnd: 880, duration: 0.32, gain: 0.18, delay: 0.18 });
          break;
        case 'victory':
          playTone(audioCtx, { type: 'sine', freqStart: 392, freqEnd: 392, duration: 0.18, gain: 0.15, delay: 0 });
          playTone(audioCtx, { type: 'sine', freqStart: 494, freqEnd: 494, duration: 0.18, gain: 0.15, delay: 0.08 });
          playTone(audioCtx, { type: 'sine', freqStart: 587, freqEnd: 587, duration: 0.20, gain: 0.16, delay: 0.16 });
          playTone(audioCtx, { type: 'triangle', freqStart: 784, freqEnd: 784, duration: 0.30, gain: 0.18, delay: 0.24 });
          break;
        case 'defeat':
          playTone(audioCtx, { type: 'sine', freqStart: 330, freqEnd: 247, duration: 0.38, gain: 0.20 });
          break;
        default:
          playTone(audioCtx, { type: 'triangle', freqStart: 660, freqEnd: 520, duration: 0.05, gain: 0.12 });
          break;
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  IkaiApp.AudioSE = Object.freeze({
    SE_LIST,
    unlock,
    play,
    setVolume,
    setMuted,
    getSettings
  });
})(typeof window !== 'undefined' ? window : globalThis);
