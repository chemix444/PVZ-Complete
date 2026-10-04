import type { ShooterSpec } from '../defs';
import type { Plant, Zombie } from '../entities';
import type { Simulation } from '../simulation';
import { ticks } from '../core/time';
import { registerPlantBehavior, type PlantBehavior } from './types';

// PvZ 1 shooters run a launch counter. When it expires it is reset to the
// launch rate minus a random 0..jitter, and the plant checks for a target only
// at that moment; with a target it starts the attack animation and releases
// the projectile fireDelay ticks later.
export class ShooterBehavior implements PlantBehavior {
  readonly type = 'shooter';
  private readonly interval: number;
  private readonly jitter: number;
  readonly fireDelay: number;
  launchCounter: number;
  /** Ticks until the pending projectile is released, 0 when idle. */
  releaseIn = 0;
  targetId = -1;

  constructor(private readonly spec: ShooterSpec) {
    this.interval = ticks(spec.interval);
    this.jitter = ticks(spec.intervalJitter);
    this.fireDelay = Math.max(1, ticks(spec.fireDelay));
    this.launchCounter = ticks(spec.initialDelay ?? 0);
  }

  update(sim: Simulation, plant: Plant): void {
    if (this.releaseIn > 0 && --this.releaseIn === 0) {
      sim.spawnProjectile(this.spec.projectile, plant, this.spec.spawnOffset.x, this.spec.spawnOffset.y);
    }
    if (--this.launchCounter > 0) return;
    this.launchCounter = this.interval - sim.rng.int(this.jitter);
    const target = findLaneTarget(sim, plant);
    this.targetId = target ? target.id : -1;
    if (target) {
      this.releaseIn = this.fireDelay;
      plant.setAnim('attack', sim.tick);
    }
  }

  debug(): Record<string, unknown> {
    return { launchCounter: this.launchCounter, releaseIn: this.releaseIn, targetId: this.targetId };
  }
}

/** Nearest active zombie ahead of the plant in its row that has entered the screen. */
export function findLaneTarget(sim: Simulation, plant: Plant): Zombie | null {
  let best: Zombie | null = null;
  const limit = sim.board.attackLimitX;
  for (const zombie of sim.zombies) {
    if (zombie.row !== plant.row || !zombie.active) continue;
    if (zombie.hitLeft >= limit || zombie.hitRight <= plant.x) continue;
    if (!best || zombie.x < best.x) best = zombie;
  }
  return best;
}

registerPlantBehavior('shooter', (spec) => new ShooterBehavior(spec as ShooterSpec));
