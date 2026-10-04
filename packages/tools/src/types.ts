import type { Command, Simulation } from '@pvz/engine';

export type DevTool = { kind: 'plant'; id: string } | { kind: 'zombie'; id: string } | { kind: 'inspect' };

export interface DevOverlays {
  hitboxes: boolean;
  targeting: boolean;
  grid: boolean;
}

/** What the developer tools can see and drive inside a running level. */
export interface DevSession {
  readonly levelId: string;
  /** Null while seeds are still being chosen. */
  readonly sim: Simulation | null;
  readonly rngSeed: number | null;
  speed: number;
  paused: boolean;
  stepTick(): void;
  issue(command: Command): void;
  readonly overlays: DevOverlays;
  tool: DevTool | null;
  selectedId: number | null;
  readonly stats: { readonly fps: number; readonly ticksPerSecond: number; readonly stepCostMs: number };
}

export type NodeStatus = 'locked' | 'available' | 'completed';

/** What the developer tools can do outside a level: content, campaign and profile. */
export interface DevHost {
  session(): DevSession | null;
  levels(): { id: string; label: string; name: string; era: string; world: string }[];
  worlds(): { id: string; name: string; era: string }[];
  startLevel(levelId: string): void;
  openWorld(worldId: string): void;
  profileName(): string | null;
  campaignNodes(): { id: string; title: string; kind: string; era: string; status: NodeStatus; level?: string }[];
  completeNode(id: string): void;
  unlockNode(id: string): void;
  /** Unlocks a node and, if it is a level, starts it. */
  jumpTo(id: string): void;
  resetProgress(): void;
  plants(): { id: string; name: string; era: string; owned: boolean }[];
  zombies(): { id: string; name: string; era: string }[];
  setPlantOwned(id: string, owned: boolean): void;
  seedSlots(): number;
  setSeedSlots(slots: number): void;
}
