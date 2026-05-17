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

export type BgmTrackId =
  | 'title'
  | 'skin-select'
  | 'map-select'
  | 'battle-pool-park'
  | 'battle-castle-garden'
  | 'battle-cloud-plaza'
  | 'result-victory'
  | 'result-rank';

type WaveType = OscillatorType;

interface BgmNote {
  frequency: number;
  length: number;
  velocity: number;
  wave?: WaveType;
}

interface BgmStep {
  lead?: BgmNote;
  chord: readonly BgmNote[];
  bass?: BgmNote;
  beat?: 'kick' | 'snare' | 'tick';
  durationBeats: number;
}

interface BgmTrack {
  tempo: number;
  swing: number;
  steps: readonly BgmStep[];
}

const ROOT_2 = 2 ** (1 / 12);
const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

export const BGM_TRACKS: Record<BgmTrackId, BgmTrack> = {
  title: {
    tempo: 104,
    swing: 0.04,
    steps: [
      step('C4', ['C4', 'E4', 'G4'], 'C3', 'tick'),
      step('E4', ['G3', 'C4', 'E4'], 'G2'),
      step('G4', ['A3', 'C4', 'F4'], 'F2', 'tick'),
      step('E4', ['G3', 'B3', 'D4'], 'G2'),
      step('D4', ['F3', 'A3', 'D4'], 'D3', 'tick'),
      step('G4', ['E3', 'G3', 'C4'], 'C3'),
    ],
  },
  'skin-select': {
    tempo: 112,
    swing: 0.08,
    steps: [
      step('A4', ['F3', 'A3', 'C4'], 'F2', 'tick'),
      step('C5', ['G3', 'Bb3', 'D4'], 'G2'),
      step('D5', ['A3', 'C4', 'E4'], 'A2', 'tick'),
      step('C5', ['F3', 'A3', 'C4'], 'F2'),
      step('G4', ['E3', 'G3', 'C4'], 'C3', 'tick'),
      step('A4', ['F3', 'A3', 'D4'], 'D3'),
    ],
  },
  'map-select': {
    tempo: 118,
    swing: 0.05,
    steps: [
      step('G4', ['C4', 'E4', 'G4'], 'C3', 'tick'),
      step('B4', ['D4', 'G4', 'B4'], 'G2'),
      step('A4', ['C4', 'F4', 'A4'], 'F2', 'tick'),
      step('G4', ['B3', 'D4', 'G4'], 'G2'),
      step('E5', ['C4', 'E4', 'A4'], 'A2', 'tick'),
      step('D5', ['D4', 'F4', 'A4'], 'D3'),
    ],
  },
  'battle-pool-park': {
    tempo: 142,
    swing: 0.02,
    steps: [
      step('E5', ['A3', 'C4', 'E4', 'A4'], 'A2', 'kick'),
      step('G5', ['A3', 'D4', 'E4', 'G4'], 'A2', 'tick'),
      step('A5', ['F3', 'A3', 'C4', 'E4'], 'F2', 'snare'),
      step('G5', ['G3', 'B3', 'D4', 'F4'], 'G2', 'tick'),
      step('C6', ['A3', 'C4', 'E4', 'G4'], 'A2', 'kick'),
      step('B5', ['E3', 'G3', 'B3', 'D4'], 'E2', 'snare'),
      step('A5', ['F3', 'A3', 'C4', 'F4'], 'F2', 'tick'),
      step('E5', ['G3', 'B3', 'D4', 'G4'], 'G2', 'snare'),
    ],
  },
  'battle-castle-garden': {
    tempo: 136,
    swing: 0.01,
    steps: [
      step('D5', ['D3', 'A3', 'D4', 'F4'], 'D2', 'kick'),
      step('F5', ['D3', 'A3', 'C4', 'F4'], 'D2', 'tick'),
      step('A5', ['Bb2', 'F3', 'Bb3', 'D4'], 'Bb1', 'snare'),
      step('G5', ['C3', 'G3', 'Bb3', 'E4'], 'C2', 'tick'),
      step('F5', ['D3', 'F3', 'A3', 'D4'], 'D2', 'kick'),
      step('E5', ['A2', 'E3', 'G3', 'C4'], 'A1', 'snare'),
      step('D5', ['Bb2', 'F3', 'A3', 'D4'], 'Bb1', 'tick'),
      step('A4', ['C3', 'G3', 'Bb3', 'E4'], 'C2', 'snare'),
    ],
  },
  'battle-cloud-plaza': {
    tempo: 150,
    swing: 0.06,
    steps: [
      step('B5', ['E4', 'G4', 'B4', 'D5'], 'E2', 'kick'),
      step('G5', ['D4', 'G4', 'B4', 'E5'], 'E2', 'tick'),
      step('E6', ['C4', 'E4', 'G4', 'B4'], 'C3', 'snare'),
      step('D6', ['D4', 'F#4', 'A4', 'C5'], 'D3', 'tick'),
      step('B5', ['E4', 'G4', 'B4', 'E5'], 'E2', 'kick'),
      step('A5', ['A3', 'C4', 'E4', 'G4'], 'A2', 'snare'),
      step('G5', ['C4', 'E4', 'G4', 'C5'], 'C3', 'tick'),
      step('E5', ['D4', 'F#4', 'A4', 'D5'], 'D3', 'snare'),
    ],
  },
  'result-victory': {
    tempo: 128,
    swing: 0.03,
    steps: [
      step('C5', ['C4', 'E4', 'G4', 'C5'], 'C3', 'kick'),
      step('E5', ['E4', 'G4', 'C5'], 'G2', 'tick'),
      step('G5', ['F4', 'A4', 'C5'], 'F2', 'snare'),
      step('C6', ['G4', 'B4', 'D5'], 'G2', 'tick'),
      step('B5', ['E4', 'G4', 'C5'], 'C3', 'kick'),
      step('G5', ['F4', 'A4', 'D5'], 'D3', 'snare'),
    ],
  },
  'result-rank': {
    tempo: 96,
    swing: 0.02,
    steps: [
      step('G4', ['C4', 'E4', 'G4'], 'C3', 'tick'),
      step('E4', ['A3', 'C4', 'E4'], 'A2'),
      step('F4', ['F3', 'A3', 'C4'], 'F2', 'tick'),
      step('D4', ['G3', 'B3', 'D4'], 'G2'),
    ],
  },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterSfx: GainNode | null = null;
  private masterBgm: GainNode | null = null;
  private bgmTimer: number | null = null;
  private currentBgm: BgmTrackId | null = null;
  private bgmStepIndex = 0;
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

  startBgm(trackId: BgmTrackId = 'battle-pool-park'): void {
    if (!this.ctx || !this.masterBgm) return;
    if (this.currentBgm === trackId && this.bgmTimer !== null) return;
    this.stopBgm();
    this.currentBgm = trackId;
    this.bgmStepIndex = 0;
    this.scheduleBgmStep();
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.currentBgm = null;
  }

  private scheduleBgmStep(): void {
    if (!this.ctx || !this.masterBgm || !this.currentBgm) return;
    const track = BGM_TRACKS[this.currentBgm];
    const stepDef = track.steps[this.bgmStepIndex % track.steps.length];
    const beatSec = 60 / track.tempo;
    const duration = beatSec * stepDef.durationBeats;
    const now = this.ctx.currentTime;
    const stepPhase = this.bgmStepIndex % 2 === 0 ? 1 : -1;
    const nextDelayMs = Math.max(70, (duration + track.swing * stepPhase * beatSec) * 1000);

    if (stepDef.bass) this.playBgmNote(stepDef.bass, now, duration, 0.75);
    for (const note of stepDef.chord) this.playBgmNote(note, now, duration * 0.92, 0.42);
    if (stepDef.lead) this.playBgmNote(stepDef.lead, now + duration * 0.08, duration * 0.58, 0.5);
    if (stepDef.beat) this.playBgmBeat(stepDef.beat, now);

    this.bgmStepIndex++;
    this.bgmTimer = window.setTimeout(() => this.scheduleBgmStep(), nextDelayMs);
  }

  private playBgmNote(note: BgmNote, start: number, duration: number, layerGain: number): void {
    if (!this.ctx || !this.masterBgm) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = note.wave ?? 'triangle';
    osc.frequency.setValueAtTime(note.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, note.velocity * layerGain), start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.04, duration * note.length));
    osc.connect(gain);
    gain.connect(this.masterBgm);
    osc.start(start);
    osc.stop(start + Math.max(0.06, duration * note.length + 0.04));
  }

  private playBgmBeat(kind: 'kick' | 'snare' | 'tick', start: number): void {
    if (!this.ctx || !this.masterBgm) return;
    if (kind === 'tick') {
      const tick = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      tick.type = 'square';
      tick.frequency.setValueAtTime(1200, start);
      gain.gain.setValueAtTime(0.06, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.035);
      tick.connect(gain);
      gain.connect(this.masterBgm);
      tick.start(start);
      tick.stop(start + 0.04);
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = kind === 'kick' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(kind === 'kick' ? 120 : 260, start);
    osc.frequency.exponentialRampToValueAtTime(kind === 'kick' ? 55 : 95, start + 0.12);
    gain.gain.setValueAtTime(kind === 'kick' ? 0.14 : 0.09, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    osc.connect(gain);
    gain.connect(this.masterBgm);
    osc.start(start);
    osc.stop(start + 0.16);
  }
}

export function battleTrackForMap(mapId: string): BgmTrackId {
  switch (mapId) {
    case 'castle-garden':
      return 'battle-castle-garden';
    case 'cloud-plaza':
      return 'battle-cloud-plaza';
    default:
      return 'battle-pool-park';
  }
}

function step(lead: string, chord: readonly string[], bass?: string, beat?: BgmStep['beat']): BgmStep {
  return {
    lead: note(lead, 0.62, 0.1, 'square'),
    chord: chord.map((n) => note(n, 0.82, 0.09, 'triangle')),
    bass: bass ? note(bass, 0.9, 0.11, 'sawtooth') : undefined,
    beat,
    durationBeats: 0.5,
  };
}

function note(name: string, length: number, velocity: number, wave?: WaveType): BgmNote {
  return { frequency: noteFrequency(name), length, velocity, wave };
}

function noteFrequency(name: string): number {
  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(name);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const noteName = match[1];
  const octave = Number(match[2]);
  const noteIndex = NOTE_INDEX[noteName];
  if (noteIndex === undefined) throw new Error(`Invalid note name: ${name}`);
  const semitoneFromA4 = noteIndex - NOTE_INDEX.A + (octave - 4) * 12;
  return 440 * ROOT_2 ** semitoneFromA4;
}
