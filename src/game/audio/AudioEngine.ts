export type SfxName =
  | 'water-shot'
  | 'balloon-shot'
  | 'bubble-shot'
  | 'splash'
  | 'pickup'
  | 'build'
  | 'jump'
  | 'eliminated'
  | 'victory'
  | 'click';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterSfx: GainNode | null = null;
  private masterBgm: GainNode | null = null;
  private bgmOsc: OscillatorNode | null = null;
  private bgmInterval: number | null = null;
  private sfxVolume = 0.7;
  private bgmVolume = 0.5;

  init(): void {
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.masterSfx = this.ctx.createGain();
      this.masterSfx.gain.value = this.sfxVolume;
      this.masterSfx.connect(this.ctx.destination);
      this.masterBgm = this.ctx.createGain();
      this.masterBgm.gain.value = this.bgmVolume;
      this.masterBgm.connect(this.ctx.destination);
    } catch {
      // audio unsupported; fail silently
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.masterSfx) this.masterSfx.gain.value = this.sfxVolume;
  }

  setBgmVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.masterBgm) this.masterBgm.gain.value = this.bgmVolume;
  }

  playSfx(name: SfxName): void {
    if (!this.ctx || !this.masterSfx) return;
    const ctx = this.ctx;
    const out = this.masterSfx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(out);

    switch (name) {
      case 'water-shot':
        osc.type = 'square';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'balloon-shot':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      case 'bubble-shot':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case 'splash':
        this.playNoise(0.15, 0.18);
        return;
      case 'pickup':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(990, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      case 'build':
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(280, now + 0.05);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case 'jump':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.1);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      case 'eliminated':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.55);
        break;
      case 'victory':
        this.playMelody([523, 659, 784, 1047], 0.16);
        return;
      case 'click':
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
    }
  }

  private playNoise(duration: number, gainValue: number): void {
    if (!this.ctx || !this.masterSfx) return;
    const ctx = this.ctx;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(gain);
    gain.connect(this.masterSfx);
    src.start();
  }

  private playMelody(freqs: number[], step: number): void {
    if (!this.ctx || !this.masterSfx) return;
    const ctx = this.ctx;
    let t = ctx.currentTime;
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + step);
      osc.connect(gain);
      gain.connect(this.masterSfx);
      osc.start(t);
      osc.stop(t + step + 0.02);
      t += step;
    }
  }

  startBgm(): void {
    if (!this.ctx || !this.masterBgm || this.bgmInterval !== null) return;
    const notes = [261, 329, 392, 523, 392, 329];
    let idx = 0;
    const playNote = () => {
      if (!this.ctx || !this.masterBgm) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[idx % notes.length], now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.masterBgm);
      osc.start(now);
      osc.stop(now + 0.45);
      idx++;
    };
    this.bgmInterval = window.setInterval(playNote, 380);
  }

  stopBgm(): void {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.bgmOsc) {
      try { this.bgmOsc.stop(); } catch {}
      this.bgmOsc = null;
    }
  }
}
