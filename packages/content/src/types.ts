import type { Era, RewardSpec } from '@pvz/engine';

export interface WorldDef {
  readonly id: string;
  readonly name: string;
  readonly era: Era;
  /** PvZ 1 areas use the adventure level list; PvZ 2 worlds use a scrolling map. */
  readonly map: 'pvz1-area' | 'pvz2-map';
  readonly levels: readonly string[];
  readonly environment: string;
  readonly music: string;
  readonly boards: readonly string[];
  /** Simulation systems every level of this world installs. */
  readonly mechanics: readonly string[];
  readonly plants: readonly string[];
  readonly zombies: readonly string[];
  /** Campaign nodes that must be complete before the world opens. */
  readonly requires: readonly string[];
  readonly boss?: string;
  readonly rewards: readonly RewardSpec[];
}

export type AudioChannel = 'music' | 'sfx' | 'ui';

export interface AudioDef {
  readonly id: string;
  readonly channel: AudioChannel;
  /** Procedural placeholder used until a real file is supplied in the asset manifest. */
  readonly placeholder: string;
  readonly volume?: number;
  /** Concurrent instances before the oldest is cut off. */
  readonly maxInstances?: number;
  readonly loop?: boolean;
}

export interface EffectDef {
  readonly id: string;
  readonly particles: number;
  readonly colors: readonly number[];
  readonly lifetime: number;
  readonly speed: readonly [number, number];
  readonly size: readonly [number, number];
  readonly gravity: number;
  /** Direction spread in radians around straight up. */
  readonly spread: number;
}
