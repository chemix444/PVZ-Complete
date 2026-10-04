export interface ClipTiming {
  readonly frameCount: number;
  readonly fps: number;
  readonly loop: boolean;
  /** Frame index -> event name. */
  readonly events?: Readonly<Record<string, string>>;
}

/**
 * Frame clock for one animation clip. Rendering-only: the simulation decides
 * when things happen, and views seek clips to match simulation time.
 */
export class AnimationPlayer {
  time = 0;
  speed = 1;

  constructor(readonly clip: ClipTiming) {}

  get frame(): number {
    return this.frameAt(this.time);
  }

  get finished(): boolean {
    return !this.clip.loop && Math.floor(this.time * this.clip.fps) >= this.clip.frameCount;
  }

  /** Jumps to a time without firing events (used to sync to simulation time). */
  seek(seconds: number): void {
    this.time = Math.max(0, seconds);
  }

  /** Advances the clock and returns events for every frame entered on the way. */
  advance(seconds: number): string[] {
    const fired: string[] = [];
    const before = Math.floor(this.time * this.clip.fps);
    this.time += seconds * this.speed;
    const after = Math.floor(this.time * this.clip.fps);
    const events = this.clip.events;
    if (!events) return fired;
    const last = this.clip.loop ? after : Math.min(after, this.clip.frameCount - 1);
    for (let raw = before + 1; raw <= last; raw++) {
      const name = events[String(raw % this.clip.frameCount)];
      if (name) fired.push(name);
    }
    return fired;
  }

  frameAt(seconds: number): number {
    const raw = Math.floor(Math.max(0, seconds) * this.clip.fps);
    return this.clip.loop ? raw % this.clip.frameCount : Math.min(raw, this.clip.frameCount - 1);
  }
}
