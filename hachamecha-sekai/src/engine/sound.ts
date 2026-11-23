class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public volume = 0.45;

  public unlock(): void {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private beep(freq: number, dur: number, type: OscillatorType, endFreq?: number, gainScale = 1): void {
    if (!this.enabled || this.volume <= 0) return;
    if (!this.ctx) this.unlock();
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + dur);
    }
    const peak = Math.min(0.35, this.volume * 0.28 * gainScale);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  public tap(): void {
    this.beep(620, 0.05, 'triangle', 760, 0.6);
  }

  public hit(crit = false): void {
    if (crit) {
      this.beep(260, 0.14, 'sawtooth', 880, 1.15);
      setTimeout(() => this.beep(980, 0.09, 'square', 520, 0.8), 35);
    } else {
      this.beep(210, 0.08, 'sawtooth', 95, 0.8);
    }
  }

  public heal(): void {
    this.beep(520, 0.12, 'sine', 780, 0.75);
    setTimeout(() => this.beep(780, 0.12, 'sine', 1040, 0.65), 60);
  }

  public chaos(): void {
    this.beep(180, 0.22, 'sawtooth', 920, 1.1);
    setTimeout(() => this.beep(680, 0.18, 'square', 1240, 0.9), 70);
    setTimeout(() => this.beep(320, 0.24, 'triangle', 120, 0.9), 120);
  }

  public victory(): void {
    [523, 659, 784, 1046].forEach((f, idx) => {
      setTimeout(() => this.beep(f, 0.16, 'triangle', f * 1.02, 0.9), idx * 75);
    });
  }

  public defeat(): void {
    [360, 290, 220].forEach((f, idx) => {
      setTimeout(() => this.beep(f, 0.2, 'sawtooth', f * 0.85, 0.75), idx * 100);
    });
  }
}

export const sound = new SoundEngine();
