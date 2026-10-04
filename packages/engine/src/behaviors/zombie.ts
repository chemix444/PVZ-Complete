import type { EaterSpec } from '../defs';
import type { Plant, Zombie } from '../entities';
import type { Simulation } from '../simulation';
import { ticks } from '../core/time';
import { registerZombieBehavior, type ZombieBehavior } from './types';

/** Moves left at the zombie's speed whenever nothing is holding it in place. */
export class WalkerBehavior implements ZombieBehavior {
  readonly type = 'walker';

  update(_sim: Simulation, zombie: Zombie): void {
    if (zombie.state === 'walking' || zombie.state === 'dying') zombie.x -= zombie.speed;
  }
}

// Bites the plant overlapping the zombie's attack box. Must run before the
// walker so a zombie that reaches a plant stops on the same tick.
export class EaterBehavior implements ZombieBehavior {
  readonly type = 'eater';
  private readonly damage: number;
  private readonly interval: number;
  biteCounter = 0;

  constructor(spec: EaterSpec) {
    this.damage = spec.damage;
    this.interval = Math.max(1, ticks(spec.interval));
  }

  update(sim: Simulation, zombie: Zombie): void {
    if (!zombie.active) return;
    const current = zombie.eating;
    const target = current && current.alive && overlaps(zombie, current) ? current : findPlantToEat(sim, zombie);
    if (!target) {
      if (zombie.state === 'eating') {
        zombie.state = 'walking';
        zombie.eating = null;
        zombie.setAnim('walk', sim.tick);
      }
      return;
    }
    if (target !== current) {
      // The first bite lands one full interval after contact.
      zombie.eating = target;
      zombie.state = 'eating';
      zombie.setAnim('eat', sim.tick);
      this.biteCounter = this.interval;
      sim.emit({ type: 'zombie-started-eating', zombieId: zombie.id, plantId: target.id });
      return;
    }
    if (--this.biteCounter <= 0) {
      this.biteCounter = this.interval;
      sim.damagePlant(target, this.damage);
    }
  }

  debug(): Record<string, unknown> {
    return { biteCounter: this.biteCounter };
  }
}

function overlaps(zombie: Zombie, plant: Plant): boolean {
  return zombie.attackLeft < plant.hitRight && zombie.attackRight > plant.hitLeft;
}

const SLOT_PRIORITY = { cover: 2, main: 1, base: 0 } as const;

/** The plant a zombie bites: highest layer first, then the rightmost. */
export function findPlantToEat(sim: Simulation, zombie: Zombie): Plant | null {
  let best: Plant | null = null;
  for (const plant of sim.plants) {
    if (plant.row !== zombie.row || !plant.alive || !overlaps(zombie, plant)) continue;
    if (
      !best ||
      SLOT_PRIORITY[plant.slot] > SLOT_PRIORITY[best.slot] ||
      (plant.slot === best.slot && plant.hitRight > best.hitRight)
    ) {
      best = plant;
    }
  }
  return best;
}

registerZombieBehavior('walker', () => new WalkerBehavior());
registerZombieBehavior('eater', (spec) => new EaterBehavior(spec as EaterSpec));
