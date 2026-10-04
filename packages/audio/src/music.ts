import { midiToHz, Mixer, type Wave } from './synth';

// Original placeholder loops (not transcriptions of the games' soundtrack).
// Each renders one seamless loop of a few bars.

type Note = readonly [step: number, midi: number, length: number];

interface Song {
  readonly bpm: number;
  /** Chord per bar as MIDI root plus intervals. */
  readonly chords: readonly (readonly number[])[];
  readonly melody: readonly (readonly Note[])[];
  readonly drums: boolean;
  readonly arpEvery: number;
  readonly leadWave: Wave;
}

const AM = [57, 60, 64];
const F = [53, 57, 60];
const G = [55, 59, 62];
const C = [48, 52, 55];
const DM = [50, 53, 57];
const E = [52, 56, 59];
const BB = [46, 50, 53];
const A = [45, 49, 52];

const songs: Record<string, Song> = {
  'music-day': {
    bpm: 112,
    chords: [AM, AM, F, G, AM, AM, DM, E],
    drums: true,
    arpEvery: 2,
    leadWave: 'triangle',
    melody: [
      [[0, 69, 2], [3, 72, 1], [4, 76, 2], [6, 74, 1], [8, 72, 2], [10, 71, 2], [12, 69, 4]],
      [[0, 64, 2], [2, 69, 2], [4, 72, 2], [6, 71, 1], [7, 69, 1], [8, 71, 4], [14, 72, 2]],
      [[0, 72, 2], [3, 77, 1], [4, 76, 2], [6, 74, 2], [8, 72, 2], [10, 74, 2], [12, 76, 4]],
      [[0, 74, 2], [2, 71, 2], [4, 67, 2], [6, 71, 2], [8, 74, 6], [14, 74, 1], [15, 76, 1]],
      [[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2], [8, 76, 3], [11, 72, 1], [12, 69, 4]],
      [[0, 72, 1], [1, 71, 1], [2, 69, 2], [4, 64, 2], [6, 69, 2], [8, 72, 2], [10, 76, 2], [12, 81, 4]],
      [[0, 77, 3], [3, 76, 1], [4, 74, 2], [6, 72, 2], [8, 74, 2], [10, 77, 2], [12, 74, 4]],
      [[0, 71, 2], [2, 68, 2], [4, 71, 2], [6, 74, 2], [8, 76, 6], [14, 68, 2]],
    ],
  },
  'music-menu': {
    bpm: 84,
    chords: [AM, F, C, E, AM, F, G, E],
    drums: false,
    arpEvery: 1,
    leadWave: 'sine',
    melody: [
      [[0, 76, 6], [8, 72, 4], [12, 74, 4]],
      [[0, 72, 8], [8, 69, 8]],
      [[0, 67, 4], [4, 72, 4], [8, 76, 8]],
      [[0, 75, 4], [4, 76, 4], [8, 71, 8]],
      [[0, 76, 6], [8, 79, 4], [12, 77, 4]],
      [[0, 76, 8], [8, 72, 8]],
      [[0, 74, 4], [4, 71, 4], [8, 67, 8]],
      [[0, 68, 8], [8, 71, 8]],
    ],
  },
  'music-choose': {
    bpm: 100,
    chords: [DM, AM, BB, A, DM, AM, BB, A],
    drums: true,
    arpEvery: 2,
    leadWave: 'triangle',
    melody: [
      [[0, 74, 3], [4, 77, 2], [6, 76, 2], [8, 74, 4]],
      [[0, 72, 3], [4, 76, 2], [6, 72, 2], [8, 69, 4]],
      [[0, 70, 3], [4, 74, 2], [6, 77, 2], [8, 74, 4]],
      [[0, 73, 4], [4, 76, 4], [8, 69, 8]],
      [[0, 74, 3], [4, 77, 2], [6, 81, 2], [8, 79, 4], [12, 77, 4]],
      [[0, 76, 3], [4, 72, 2], [6, 76, 2], [8, 69, 4]],
      [[0, 70, 2], [2, 74, 2], [4, 77, 4], [8, 74, 4], [12, 70, 4]],
      [[0, 73, 4], [4, 69, 4], [8, 64, 4], [12, 61, 4]],
    ],
  },
};

export function renderMusic(name: string, sampleRate: number): Float32Array | null {
  const song = songs[name];
  if (!song) return null;
  const step = 60 / song.bpm / 4;
  const bars = song.chords.length;
  const m = new Mixer(bars * 16 * step, sampleRate);

  song.chords.forEach((chord, bar) => {
    const barStart = bar * 16 * step;
    const [root, third, fifth] = chord;
    for (let beat = 0; beat < 4; beat++) {
      const bass = beat % 2 === 0 ? root - 12 : fifth - 12;
      m.tone(barStart + beat * 4 * step, 3 * step, midiToHz(bass), 'sine', 0.42, { decay: step * 2.5 });
      m.tone(barStart + beat * 4 * step, 2 * step, midiToHz(bass), 'triangle', 0.15, { decay: step * 1.5 });
    }
    const arp = [root + 12, third + 12, fifth + 12, third + 12];
    for (let i = 0; i < 16; i += song.arpEvery) {
      const note = arp[(i / song.arpEvery) % arp.length];
      const at = barStart + i * step;
      m.tone(at, 2 * step, midiToHz(note), 'sine', 0.13, { decay: step * 0.9 });
      m.tone(at, step, midiToHz(note + 12), 'sine', 0.04, { decay: step * 0.4 });
    }
    for (const [at, note, length] of song.melody[bar]) {
      m.tone(barStart + at * step, length * step, midiToHz(note), song.leadWave, 0.2, { attack: 0.01, decay: length * step * 0.8 });
    }
    if (song.drums) {
      for (let beat = 0; beat < 4; beat++) {
        const at = barStart + beat * 4 * step;
        if (beat % 2 === 0) m.tone(at, 0.15, (t) => 110 - 400 * t, 'sine', 0.35, { decay: 0.05 });
        else m.noise(at, 0.1, 0.12, { decay: 0.03 }, 0.5);
        m.noise(at + 2 * step, 0.04, 0.06, { decay: 0.01 }, 0.9);
      }
    }
  });
  return m.finish(0.8);
}

export function placeholderMusicNames(): string[] {
  return Object.keys(songs);
}
