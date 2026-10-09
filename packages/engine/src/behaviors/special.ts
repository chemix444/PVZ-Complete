import type {
  BowlSpec,
  ChomperSpec,
  ExplodeSpec,
  FreezeAllSpec,
  FumeSpec,
  GraveBusterSpec,
  MineSpec,
} from '../defs';
import type { Plant, Zombie } from '../entities';
import type { Simulation } from '../simulation';
import { ticks } from '../core/time';
import { registerPlantBehavior, type PlantBehavior } from './types';

/** Cherry Bomb, Doom-shroom: blow up a square of cells after a short fuse. */
export class ExplodeBehavior implements PlantBehavior {
  readonly type = 'explode';
  fuse: number;

  constructor(private readonly spec: ExplodeSpec, plant: Plant, sim: Simulation) {
    this.fuse = ticks(spec.fuse);
    plant.setAnim('fuse', sim.tick);
  }

  update(sim: Simulation, plant: Plant): void {
    if (this.fuse > 0) {
      this.fuse--;
      return;
    }
    const { tile } = sim.board;
    const spec = this.spec;
    sim.damageArea(
      plant.x - spec.cols * tile.width,
      plant.x + (spec.cols + 1) * tile.width,
      plant.row - spec.rows,
      plant.row + spec.rows,
      spec.damage,
      'explosion',
    );
    sim.emit({ type: 'explosion', effect: spec.effect, x: plant.x + tile.width / 2, y: plant.y + tile.height / 2 });
    sim.removePlant(plant, 'used');
    if (spec.crater) sim.addGridItem('crater', plant.row, plant.col, ticks(spec.crater));
  }

  debug(): Record<string, unknown> {
    return { fuse: this.fuse };
  }
}

/** Ice-shroom: freezes every zombie on the lawn, then leaves them chilled. */
export class FreezeAllBehavior implements PlantBehavior {
  readonly type = 'freeze-all';
  fuse: number;

  constructor(private readonly spec: FreezeAllSpec, plant: Plant, sim: Simulation) {
    this.fuse = ticks(spec.fuse);
    plant.setAnim('fuse', sim.tick);
  }

  update(sim: Simulation, plant: Plant): void {
    if (this.fuse > 0) {
      this.fuse--;
      return;
    }
    const freeze = ticks(this.spec.freeze);
    const chill = ticks(this.spec.chill);
    for (const zombie of sim.zombies) {
      if (!zombie.collidable || zombie.hypnotized) continue;
      sim.damageZombie(zombie, this.spec.damage, 'explosion');
      if (zombie.state === 'dead') continue;
      zombie.freezeTicks = Math.max(zombie.freezeTicks, freeze);
      zombie.chillTicks = Math.max(zombie.chillTicks, freeze + chill);
    }
    sim.emit({ type: 'zombies-frozen' });
    sim.removePlant(plant, 'used');
  }
}

/** Potato Mine: arms after a delay, then explodes under the first zombie to touch it. */
export class MineBehavior implements PlantBehavior {
  readonly type = 'mine';
  armIn: number;

  constructor(private readonly spec: MineSpec) {
    this.armIn = ticks(spec.armTime);
  }

  get armed(): boolean {
    return this.armIn <= 0;
  }

  update(sim: Simulation, plant: Plant): void {
    if (this.armIn > 0) {
      this.armIn--;
      return;
    }
    if (plant.anim !== 'armed') {
      plant.setAnim('armed', sim.tick);
      sim.emit({ type: 'mine-armed', plantId: plant.id });
    }
    for (const zombie of sim.zombies) {
      // A running Pole Vaulter jumps over the mine instead of stepping on it.
      if (zombie.row !== plant.row || !zombie.hostile || zombie.noEat) continue;
      if (zombie.attackLeft < plant.hitRight && zombie.attackRight > plant.hitLeft) {
        const blast = this.spec.blast;
        sim.damageArea(plant.x - blast, plant.x + sim.board.tile.width + blast, plant.row, plant.row, this.spec.damage, 'explosion');
        sim.emit({ type: 'explosion', effect: 'potato', x: plant.x + sim.board.tile.width / 2, y: plant.y + sim.board.tile.height * 0.75 });
        sim.removePlant(plant, 'used');
        return;
      }
    }
  }

  debug(): Record<string, unknown> {
    return { armIn: this.armIn };
  }
}

type ChomperState = 'ready' | 'biting' | 'chewing';

/** Chomper: swallows the zombie in front of it whole, then chews for a long time. */
export class ChomperBehavior implements PlantBehavior {
  readonly type = 'chomper';
  state: ChomperState = 'ready';
  timer = 0;

  constructor(private readonly spec: ChomperSpec) {}

  update(sim: Simulation, plant: Plant): void {
    switch (this.state) {
      case 'ready':
        if (this.target(sim, plant)) {
          this.state = 'biting';
          this.timer = Math.max(1, ticks(this.spec.biteDelay));
          plant.setAnim('bite', sim.tick);
        }
        return;
      case 'biting': {
        if (--this.timer > 0) return;
        const victim = this.target(sim, plant);
        sim.emit({ type: 'chomper-bite', plantId: plant.id, zombieId: victim ? victim.id : null });
        if (!victim) {
          this.state = 'ready';
          plant.setAnim('idle', sim.tick);
          return;
        }
        if (victim.def.tags.includes('large')) {
          sim.damageZombie(victim, this.spec.largeDamage, 'bite');
          this.state = 'ready';
          plant.setAnim('idle', sim.tick);
          return;
        }
        sim.killZombie(victim, 'chomp');
        this.state = 'chewing';
        this.timer = ticks(this.spec.chewTime);
        plant.setAnim('chew', sim.tick);
        return;
      }
      case 'chewing':
        if (--this.timer > 0) return;
        this.state = 'ready';
        plant.setAnim('idle', sim.tick);
    }
  }

  private target(sim: Simulation, plant: Plant): Zombie | null {
    const right = plant.x + sim.board.tile.width + this.spec.reach;
    let best: Zombie | null = null;
    for (const zombie of sim.zombies) {
      if (zombie.row !== plant.row || !zombie.hostile) continue;
      if (zombie.hitLeft >= right || zombie.hitRight <= plant.x) continue;
      if (!best || zombie.x < best.x) best = zombie;
    }
    return best;
  }

  debug(): Record<string, unknown> {
    return { state: this.state, timer: this.timer };
  }
}

/** Hypno-shroom: the first zombie to bite it switches sides. */
export class HypnotizeBehavior implements PlantBehavior {
  readonly type = 'hypnotize';

  update(): void {}

  onBitten(sim: Simulation, plant: Plant, zombie: Zombie): boolean {
    sim.hypnotize(zombie);
    sim.removePlant(plant, 'used');
    return true;
  }
}

/** Grave Buster: planted on a grave, eats it, then disappears. */
export class GraveBusterBehavior implements PlantBehavior {
  readonly type = 'grave-buster';
  timer: number;

  constructor(spec: GraveBusterSpec) {
    this.timer = ticks(spec.time);
  }

  update(sim: Simulation, plant: Plant): void {
    if (this.timer > 0) {
      this.timer--;
      return;
    }
    const grave = sim.lawn.itemAt(plant.row, plant.col);
    if (grave?.kind === 'grave') sim.removeGridItem(grave);
    sim.removePlant(plant, 'used');
  }

  debug(): Record<string, unknown> {
    return { timer: this.timer };
  }
}

/** Wall-nut Bowling: the placed nut immediately rolls away as a Roller. */
export class BowlBehavior implements PlantBehavior {
  readonly type = 'bowl';

  constructor(private readonly spec: BowlSpec) {}

  update(sim: Simulation, plant: Plant): void {
    sim.spawnRoller(plant, this.spec.speed / 100, this.spec.damage, this.spec.explode);
    sim.removePlant(plant, 'used');
  }
}

/** Fume-shroom: same launch counter as shooters, but hits every zombie in reach at once and passes shields. */
export class FumeBehavior implements PlantBehavior {
  readonly type = 'fume';
  launchCounter = 0;
  releaseIn = 0;
  private readonly interval: number;
  private readonly jitter: number;
  private readonly fireDelay: number;

  constructor(private readonly spec: FumeSpec) {
    this.interval = ticks(spec.interval);
    this.jitter = ticks(spec.intervalJitter);
    this.fireDelay = Math.max(1, ticks(spec.fireDelay));
  }

  update(sim: Simulation, plant: Plant): void {
    const x0 = plant.x + sim.board.tile.width / 2;
    const x1 = plant.x + sim.board.tile.width + this.spec.range;
    if (this.releaseIn > 0 && --this.releaseIn === 0) {
      sim.damageArea(x0, x1, plant.row, plant.row, this.spec.damage, 'fume');
      sim.emit({ type: 'fume', plantId: plant.id, row: plant.row, x0, x1 });
    }
    if (--this.launchCounter > 0) return;
    this.launchCounter = this.interval - sim.rng.int(this.jitter);
    const limit = Math.min(x1, sim.board.attackLimitX);
    for (const zombie of sim.zombies) {
      if (zombie.row === plant.row && zombie.hostile && zombie.hitLeft < limit && zombie.hitRight > x0) {
        this.releaseIn = this.fireDelay;
        plant.setAnim('attack', sim.tick);
        return;
      }
    }
  }

  debug(): Record<string, unknown> {
    return { launchCounter: this.launchCounter, releaseIn: this.releaseIn };
  }
}

registerPlantBehavior('explode', (spec, plant, sim) => new ExplodeBehavior(spec as ExplodeSpec, plant, sim));
registerPlantBehavior('freeze-all', (spec, plant, sim) => new FreezeAllBehavior(spec as FreezeAllSpec, plant, sim));
registerPlantBehavior('mine', (spec) => new MineBehavior(spec as MineSpec));
registerPlantBehavior('chomper', (spec) => new ChomperBehavior(spec as ChomperSpec));
registerPlantBehavior('hypnotize', () => new HypnotizeBehavior());
registerPlantBehavior('grave-buster', (spec) => new GraveBusterBehavior(spec as GraveBusterSpec));
registerPlantBehavior('bowl', (spec) => new BowlBehavior(spec as BowlSpec));
registerPlantBehavior('fume', (spec) => new FumeBehavior(spec as FumeSpec));
