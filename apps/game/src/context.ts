import type { AssetLibrary } from '@pvz/assets';
import type { AudioEngine } from '@pvz/audio';
import type { CampaignGraph } from '@pvz/campaign';
import type { PlayerProfile, ProfileStore } from '@pvz/save';
import type { Stage } from './stage';

export interface Navigator {
  profiles(): void;
  menu(): void;
  campaign(focusWorld?: string): void;
  almanac(tab?: 'plants' | 'zombies'): void;
  settings(): void;
  level(levelId: string): void;
}

/** Services every screen can use. One instance lives for the whole session. */
export interface GameContext {
  readonly stage: Stage;
  readonly audio: AudioEngine;
  readonly assets: AssetLibrary;
  readonly store: ProfileStore;
  readonly campaign: CampaignGraph;
  readonly nav: Navigator;
  /** The signed-in profile. Null only on the profile screen before one is chosen. */
  profile: PlayerProfile | null;
  saveProfile(): Promise<void>;
  applySettings(): void;
}

export function requireProfile(ctx: GameContext): PlayerProfile {
  if (!ctx.profile) throw new Error('No active profile');
  return ctx.profile;
}
