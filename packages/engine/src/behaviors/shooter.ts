import type { ShooterSpec } from '../defs';
import type { Plant, Zombie } from '../entities';
import type { Simulation } from '../simulation';
import { ticks } from '../core/time';
import { registerPlantBehavior, type PlantBehavior } from './types';

// PvZ 1 shooters run a launch counter. When it expires it is reset to the
// launch rate minus a random 0..jitter, and the plant checks for a target only
// at that moment; with a target it starts the attack animation and releases
// the projectile fireDelay ticks later (and the rest of a burst after that).
export class ShooterBehavior implements PlantBehavior {
  readonly type = 'shooter';
  private readonly interval: number;
  private readonly jitter: number;
  readonly fireDelay: number;
  private readonly burst: number;
  private readonly burstGap: number;
  launchCounter: number;
  /** Ticks until the next projectile of the current burst, 0 when idle. */
  releaseIn = 0;
  private burstLeft = 0;
  targetId = -1;
  hiding = false;

  constructor(private readonly spec: ShooterSpec) {
    this.interval = ticks(spec.interval);
    this.jitter = ticks(spec.intervalJitter);
    this.fireDelay = Math.max(1, ticks(spec.fireDelay));
    this.burst = spec.burst ?? 1;
    this.burstGap = Math.max(1, ticks(spec.burstGap ?? 0));
    this.launchCounter = ticks(spec.initialDelay ?? 0);
  }

  update(sim: Simulation, plant: Plant): void {
    if (this.spec.hideWithin !== undefined) {
      const scared = zombieNear(sim, plant, this.spec.hideWithin);
      if (scared !== this.hiding) {
        this.hiding = scared;
        plant.setAnim(scared ? 'hide' : 'idle', sim.tick);
      }
    }
    if (this.releaseIn > 0 && --this.releaseIn === 0) {
      sim.spawnProjectile(this.spec.projectile, plant, this.spec.spawnOffset.x, this.spec.spawnOffset.y);
      if (--this.burstLeft > 0) this.releaseIn = this.burstGap;
    }
    if (--this.launchCounter > 0) return;
    this.launchCounter = this.interval - sim.rng.int(this.jitter);
    if (this.hiding) return;
    const target = findLaneTarget(sim, plant, this.spec.range);
    this.targetId = target ? target.id : -1;
    if (target) {
      this.releaseIn = this.fireDelay;
      this.burstLeft = this.burst;
      plant.setAnim('attack', sim.tick);
    }
  }

  debug(): Record<string, unknown> {
    return { launchCounter: this.launchCounter, releaseIn: this.releaseIn, targetId: this.targetId, hiding: this.hiding };
  }
}

/**
 * Nearest hostile zombie ahead of the plant in its row that has entered the
 * screen, optionally within `range` px of the plant's cell.
 */
export function findLaneTarget(sim: Simulation, plant: Plant, range?: number): Zombie | null {
  let best: Zombie | null = null;
  const limit = range === undefined ? sim.board.attackLimitX : Math.min(sim.board.attackLimitX, plant.x + sim.board.tile.width + range);
  for (const zombie of sim.zombies) {
    if (zombie.row !== plant.row || !zombie.hostile) continue;
    if (zombie.hitLeft >= limit || zombie.hitRight <= plant.x) continue;
    if (!best || zombie.x < best.x) best = zombie;
  }
  return best;
}

/** A hostile zombie within `distance` px of the plant's cell, in its row or the rows next to it. */
function zombieNear(sim: Simulation, plant: Plant, distance: number): boolean {
  const left = plant.x - distance;
  const right = plant.x + sim.board.tile.width + distance;
  for (const zombie of sim.zombies) {
    if (!zombie.hostile || Math.abs(zombie.row - plant.row) > 1) continue;
    if (zombie.hitRight > left && zombie.hitLeft < right) return true;
  }
  return false;
}

registerPlantBehavior('shooter', (spec) => new ShooterBehavior(spec as ShooterSpec));
