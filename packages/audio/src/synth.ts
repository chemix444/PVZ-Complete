// Procedural placeholder sounds. They exist so the game is fully audible
// before real audio is supplied; every one is replaced by a manifest entry
// with the same id. Output is mono PCM in [-1, 1], deterministic per preset.

export type Wave = 'sine' | 'square' | 'saw' | 'triangle';

interface Envelope {
  /** Attack time in seconds. */
  readonly attack?: number;
  /** Exponential decay time constant in seconds. */
  readonly decay: number;
}

function oscillator(wave: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(p * Math.PI * 2);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'saw':
      return 2 * p - 1;
    case 'triangle':
      return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  }
}

export class Mixer {
  readonly data: Float32Array;
  private seed = 0x2545f491;

  constructor(seconds: number, readonly sampleRate: number) {
    this.data = new Float32Array(Math.ceil(seconds * sampleRate));
  }

  tone(start: number, duration: number, freq: number | ((t: number) => number), wave: Wave, gain: number, env: Envelope): this {
    const sr = this.sampleRate;
    const from = Math.floor(start * sr);
    const count = Math.floor(duration * sr);
    const attack = env.attack ?? 0.004;
    const release = Math.min(0.01, duration / 4);
    let phase = 0;
    for (let i = 0; i < count && from + i < this.data.length; i++) {
      const t = i / sr;
      const f = typeof freq === 'number' ? freq : freq(t);
      phase += f / sr;
      this.data[from + i] += oscillator(wave, phase) * gain * envelope(t, duration, attack, env.decay, release);
    }
    return this;
  }

  noise(start: number, duration: number, gain: number, env: Envelope, smoothing = 1): this {
    const sr = this.sampleRate;
    const from = Math.floor(start * sr);
    const count = Math.floor(duration * sr);
    const attack = env.attack ?? 0.002;
    const release = Math.min(0.01, duration / 4);
    let y = 0;
    for (let i = 0; i < count && from + i < this.data.length; i++) {
      const t = i / sr;
      y += smoothing * (this.random() - y);
      this.data[from + i] += y * gain * envelope(t, duration, attack, env.decay, release);
    }
    return this;
  }

  /** One-pole low-pass over the whole buffer; smaller alpha is darker. */
  lowpass(alpha: number): this {
    let y = 0;
    for (let i = 0; i < this.data.length; i++) {
      y += alpha * (this.data[i] - y);
      this.data[i] = y;
    }
    return this;
  }

  /** Amplitude modulation over the whole buffer. */
  tremolo(rate: number, depth: number): this {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] *= 1 - depth * (0.5 + 0.5 * Math.sin((i / this.sampleRate) * rate * Math.PI * 2));
    }
    return this;
  }

  finish(peak = 0.9): Float32Array {
    let max = 0;
    for (const v of this.data) max = Math.max(max, Math.abs(v));
    if (max > peak) {
      const k = peak / max;
      for (let i = 0; i < this.data.length; i++) this.data[i] *= k;
    }
    return this.data;
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 2147483648 - 1;
  }
}

function envelope(t: number, duration: number, attack: number, decay: number, release: number): number {
  const a = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
  const r = duration - t < release ? Math.max(0, (duration - t) / release) : 1;
  return a * r;
}

export function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

type Preset = (sampleRate: number) => Float32Array;

function arpeggio(m: Mixer, start: number, notes: number[], step: number, length: number, wave: Wave, gain: number): Mixer {
  notes.forEach((note, i) => m.tone(start + i * step, length, midiToHz(note), wave, gain, { decay: length / 2.5 }));
  return m;
}

const presets: Record<string, Preset> = {
  throw: (sr) => new Mixer(0.12, sr).tone(0, 0.1, (t) => 560 - 2600 * t, 'sine', 0.8, { decay: 0.035 }).noise(0, 0.02, 0.3, { decay: 0.006 }).finish(),
  plant: (sr) =>
    new Mixer(0.25, sr).tone(0, 0.18, (t) => 130 - 260 * t, 'sine', 0.8, { decay: 0.05 }).noise(0, 0.2, 0.35, { decay: 0.06 }, 0.3).finish(),
  splat: (sr) =>
    new Mixer(0.2, sr).noise(0, 0.18, 0.9, { decay: 0.045 }, 0.25).tone(0, 0.12, (t) => 170 - 500 * t, 'sine', 0.6, { decay: 0.04 }).finish(),
  'plastic-hit': (sr) => new Mixer(0.1, sr).noise(0, 0.08, 0.6, { decay: 0.018 }, 0.6).tone(0, 0.07, 1150, 'square', 0.18, { decay: 0.02 }).finish(),
  points: (sr) => new Mixer(0.45, sr).tone(0, 0.16, 988, 'sine', 0.45, { decay: 0.06 }).tone(0.07, 0.35, 1480, 'sine', 0.45, { decay: 0.12 }).finish(0.7),
  chomp: (sr) =>
    new Mixer(0.2, sr).noise(0, 0.09, 0.8, { decay: 0.025 }, 0.35).noise(0.07, 0.1, 0.6, { decay: 0.03 }, 0.3).lowpass(0.6).finish(),
  gulp: (sr) => new Mixer(0.35, sr).tone(0, 0.32, (t) => 340 - 820 * t, 'sine', 0.8, { decay: 0.12 }).finish(),
  groan: (sr) =>
    new Mixer(1.5, sr)
      .tone(0, 1.45, (t) => 92 + 9 * Math.sin(t * Math.PI * 2 * 5) - 14 * t, 'saw', 0.5, { attack: 0.2, decay: 0.8 })
      .tone(0, 1.45, (t) => 138 + 9 * Math.sin(t * Math.PI * 2 * 4.5) - 20 * t, 'saw', 0.25, { attack: 0.25, decay: 0.7 })
      .lowpass(0.08)
      .finish(0.6),
  pop: (sr) => new Mixer(0.1, sr).tone(0, 0.08, (t) => 480 + 6000 * t, 'sine', 0.6, { decay: 0.025 }).finish(),
  thud: (sr) => new Mixer(0.3, sr).tone(0, 0.28, (t) => 82 - 70 * t, 'sine', 0.9, { decay: 0.08 }).noise(0, 0.12, 0.4, { decay: 0.04 }, 0.1).finish(),
  lawnmower: (sr) =>
    new Mixer(1.6, sr)
      .tone(0, 1.6, 64, 'saw', 0.6, { attack: 0.05, decay: 1.4 })
      .noise(0, 1.6, 0.3, { attack: 0.05, decay: 1.2 }, 0.2)
      .tremolo(28, 0.5)
      .lowpass(0.2)
      .finish(0.7),
  awooga: (sr) =>
    new Mixer(1.4, sr)
      .tone(0, 0.55, (t) => 240 + 320 * t, 'saw', 0.5, { attack: 0.03, decay: 0.6 })
      .tone(0.68, 0.6, (t) => 240 + 320 * t, 'saw', 0.5, { attack: 0.03, decay: 0.6 })
      .lowpass(0.18)
      .finish(0.8),
  siren: (sr) =>
    new Mixer(2.6, sr).tone(0, 2.5, (t) => 640 + 260 * Math.sin(t * Math.PI * 2 * 0.8 - Math.PI / 2), 'triangle', 0.45, { attack: 0.15, decay: 3 }).finish(0.7),
  'final-wave': (sr) =>
    new Mixer(1.8, sr)
      .tone(0, 1.7, 98, 'saw', 0.4, { decay: 0.7 })
      .tone(0, 1.7, 147, 'saw', 0.3, { decay: 0.7 })
      .tone(0, 1.7, 196, 'saw', 0.25, { decay: 0.6 })
      .noise(0, 0.4, 0.5, { decay: 0.12 }, 0.15)
      .lowpass(0.15)
      .finish(),
  ready: (sr) => {
    const m = new Mixer(1.8, sr);
    m.tone(0, 0.2, midiToHz(72), 'triangle', 0.5, { decay: 0.08 });
    m.tone(0.6, 0.2, midiToHz(72), 'triangle', 0.5, { decay: 0.08 });
    m.tone(1.2, 0.5, midiToHz(79), 'triangle', 0.55, { decay: 0.2 });
    return m.finish(0.7);
  },
  reward: (sr) => arpeggio(new Mixer(0.9, sr), 0, [72, 76, 79, 84], 0.09, 0.45, 'triangle', 0.4).finish(0.7),
  'jingle-win': (sr) => {
    const m = arpeggio(new Mixer(2.6, sr), 0, [67, 72, 76, 79, 84, 88], 0.12, 0.35, 'triangle', 0.4);
    for (const note of [72, 76, 79, 84]) m.tone(0.8, 1.6, midiToHz(note), 'triangle', 0.22, { decay: 0.6 });
    return m.finish(0.75);
  },
  'jingle-lose': (sr) => {
    const m = arpeggio(new Mixer(3, sr), 0, [76, 74, 72, 71], 0.3, 0.5, 'saw', 0.18);
    for (const note of [57, 60, 64]) m.tone(1.2, 1.7, midiToHz(note), 'saw', 0.15, { decay: 0.8 });
    return m.lowpass(0.2).tremolo(6, 0.3).finish(0.75);
  },
  tap: (sr) => new Mixer(0.05, sr).noise(0, 0.02, 0.5, { decay: 0.004 }, 0.7).tone(0, 0.03, 1600, 'sine', 0.25, { decay: 0.01 }).finish(0.6),
  'seed-lift': (sr) => new Mixer(0.1, sr).tone(0, 0.08, (t) => 700 + 2500 * t, 'triangle', 0.4, { decay: 0.04 }).finish(0.6),
  buzzer: (sr) => new Mixer(0.32, sr).tone(0, 0.3, 140, 'square', 0.3, { attack: 0.01, decay: 0.4 }).lowpass(0.3).finish(0.6),
  pause: (sr) => new Mixer(0.25, sr).tone(0, 0.09, 660, 'triangle', 0.4, { decay: 0.05 }).tone(0.1, 0.12, 440, 'triangle', 0.4, { decay: 0.06 }).finish(0.6),
};

export function placeholderSoundNames(): string[] {
  return Object.keys(presets);
}

export function renderPlaceholderSound(name: string, sampleRate: number): Float32Array | null {
  return presets[name]?.(sampleRate) ?? null;
}
