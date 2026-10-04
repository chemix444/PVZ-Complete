import { renderMusic } from './music';
import { renderPlaceholderSound } from './synth';

export type Channel = 'music' | 'sfx' | 'ui';

export interface SoundSpec {
  readonly id: string;
  readonly channel: Channel;
  readonly placeholder: string;
  readonly volume?: number;
  readonly maxInstances?: number;
  readonly loop?: boolean;
}

interface Voice {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
}

/**
 * Web Audio playback for every sound id. Supplied files (by id, through the
 * asset manifest) win over procedural placeholders; several files for one id
 * are random variants. Limits concurrent voices per id and crossfades music.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly channels = new Map<Channel, GainNode>();
  private readonly volumes: Record<Channel, number> = { music: 0.5, sfx: 0.8, ui: 0.8 };
  private readonly specs = new Map<string, SoundSpec>();
  private readonly buffers = new Map<string, Promise<AudioBuffer[]>>();
  private readonly voices = new Map<string, Voice[]>();
  private music: { id: string; voice: Voice } | null = null;
  private wantedMusic: string | null = null;

  constructor(
    specs: readonly SoundSpec[],
    private readonly urlsFor: (id: string) => readonly string[] | null,
  ) {
    for (const spec of specs) this.specs.set(spec.id, spec);
  }

  get unlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Must be called from a user gesture before anything is audible. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      for (const channel of ['music', 'sfx', 'ui'] as const) {
        const gain = this.ctx.createGain();
        gain.gain.value = this.volumes[channel];
        gain.connect(this.master);
        this.channels.set(channel, gain);
      }
      if (this.wantedMusic) this.playMusic(this.wantedMusic, 0.5);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolume(channel: Channel, volume: number): void {
    this.volumes[channel] = volume;
    const gain = this.channels.get(channel);
    if (gain && this.ctx) gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  play(id: string, volume = 1): void {
    const ctx = this.ctx;
    const spec = this.specs.get(id);
    if (!ctx || !spec || ctx.state !== 'running') return;
    void this.load(id).then((variants) => {
      if (variants.length === 0) return;
      const buffer = variants[Math.floor(Math.random() * variants.length)];
      const active = this.voices.get(id) ?? [];
      const limit = spec.maxInstances ?? 8;
      while (active.length >= limit) active.shift()!.source.stop();
      const voice = this.voice(buffer, spec, (spec.volume ?? 1) * volume, false);
      active.push(voice);
      this.voices.set(id, active);
      voice.source.onended = () => {
        const index = active.indexOf(voice);
        if (index >= 0) active.splice(index, 1);
      };
      voice.source.start();
    });
  }

  /** Switches the music track with a crossfade; null fades music out. */
  playMusic(id: string | null, fadeSeconds = 1): void {
    this.wantedMusic = id;
    const ctx = this.ctx;
    if (!ctx || this.music?.id === id) return;
    const previous = this.music;
    this.music = null;
    if (previous) {
      const now = ctx.currentTime;
      previous.voice.gain.gain.cancelScheduledValues(now);
      previous.voice.gain.gain.setValueAtTime(previous.voice.gain.gain.value, now);
      previous.voice.gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
      previous.voice.source.stop(now + fadeSeconds + 0.05);
    }
    if (!id) return;
    const spec = this.specs.get(id);
    if (!spec) return;
    void this.load(id).then((variants) => {
      if (this.wantedMusic !== id || variants.length === 0 || this.music) return;
      const voice = this.voice(variants[0], spec, 0, true);
      const now = ctx.currentTime;
      voice.gain.gain.linearRampToValueAtTime(spec.volume ?? 1, now + fadeSeconds);
      voice.source.start();
      this.music = { id, voice };
    });
  }

  /** Decodes or synthesizes every sound so first plays are not delayed. */
  async warm(ids: readonly string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.load(id)));
  }

  private voice(buffer: AudioBuffer, spec: SoundSpec, volume: number, loop: boolean): Voice {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop || spec.loop === true;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.channels.get(spec.channel)!);
    return { source, gain };
  }

  private load(id: string): Promise<AudioBuffer[]> {
    let pending = this.buffers.get(id);
    if (!pending) {
      pending = this.decode(id);
      this.buffers.set(id, pending);
    }
    return pending;
  }

  private async decode(id: string): Promise<AudioBuffer[]> {
    const ctx = this.ctx!;
    const urls = this.urlsFor(id);
    if (urls && urls.length > 0) {
      return Promise.all(
        urls.map(async (url) => ctx.decodeAudioData(await (await fetch(url)).arrayBuffer())),
      );
    }
    const spec = this.specs.get(id)!;
    const samples = renderPlaceholderSound(spec.placeholder, ctx.sampleRate) ?? renderMusic(spec.placeholder, ctx.sampleRate);
    if (!samples) return [];
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    return [buffer];
  }
}
