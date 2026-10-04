import type { RewardSpec } from './defs';

export type PlacementFailure =
  | 'not-playing'
  | 'bad-slot'
  | 'recharging'
  | 'not-enough-sun'
  | 'out-of-bounds'
  | 'surface'
  | 'occupied';

export type PlantRemoval = 'eaten' | 'dug' | 'debug';
export type ZombieDeath = 'damage' | 'mower' | 'debug';

// Events are the only channel from the simulation to presentation (audio,
// particles, UI text). Presentation never feeds anything back except commands.
export type SimEvent =
  | { type: 'plant-placed'; plantId: number; def: string; row: number; col: number }
  | { type: 'plant-rejected'; reason: PlacementFailure; def: string | null }
  | { type: 'plant-removed'; plantId: number; def: string; cause: PlantRemoval }
  | { type: 'plant-glow'; plantId: number }
  | { type: 'projectile-fired'; projectileId: number; def: string; plantId: number }
  | {
      type: 'projectile-hit';
      projectileId: number;
      def: string;
      zombieId: number;
      x: number;
      y: number;
      /** Material of the armor that absorbed the hit, null for a body hit. */
      armorMaterial: string | null;
    }
  | { type: 'zombie-spawned'; zombieId: number; def: string; row: number; wave: number }
  | { type: 'zombie-started-eating'; zombieId: number; plantId: number }
  | { type: 'zombie-arm-lost'; zombieId: number }
  | { type: 'zombie-head-lost'; zombieId: number }
  | { type: 'armor-lost'; zombieId: number; armor: string; material: string }
  | { type: 'zombie-died'; zombieId: number; def: string; cause: ZombieDeath }
  | { type: 'sun-spawned'; pickupId: number; source: 'sky' | 'plant' }
  | { type: 'pickup-collected'; pickupId: number; kind: string }
  | { type: 'pickup-expired'; pickupId: number }
  | { type: 'sun-credited'; amount: number }
  | { type: 'mower-started'; mowerId: number; row: number }
  | { type: 'wave-spawned'; wave: number; total: number; flag: boolean }
  | { type: 'huge-wave-warning'; wave: number }
  | { type: 'final-wave' }
  | { type: 'level-cleared'; pickupId: number }
  | { type: 'level-won'; rewards: readonly RewardSpec[] }
  | { type: 'level-lost'; zombieId: number; row: number };

export type SimEventType = SimEvent['type'];
