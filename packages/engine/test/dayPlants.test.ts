import { describe, expect, it } from 'vitest';
import { ChomperBehavior, MineBehavior, type Plant, type Simulation, type Zombie } from '@pvz/engine';
import { command, makeSim, ofType, run, runUntil } from './helpers';

function plant(sim: Simulation, id: string, row: number, col: number): Plant {
  command(sim, { type: 'debug-spawn-plant', plant: id, row, col });
  const placed = sim.lawn.plantAt(row, col);
  if (!placed) throw new Error(`${id} was not placed`);
  return placed;
}

function zombie(sim: Simulation, id: string, row: number, x: number, still = true): Zombie {
  const z = sim.spawnZombie(id, row, x, -1);
  if (still) z.speed = 0;
  sim.drainEvents();
  return z;
}

/** Anchor x that puts a zombie's body over the given column. */
function overCol(sim: Simulation, col: number): number {
  return sim.lawn.cellX(col) + 40 - 57;
}

describe('Cherry Bomb', () => {
  it('explodes 1.2 s after planting and burns every zombie in the 3x3 square to ash', () => {
    const sim = makeSim();
    const bomb = plant(sim, 'cherry-bomb', 2, 4);
    const inside = [zombie(sim, 'buckethead', 1, overCol(sim, 5)), zombie(sim, 'basic', 2, overCol(sim, 4)), zombie(sim, 'conehead', 3, overCol(sim, 3))];
    const outside = [zombie(sim, 'basic', 0, overCol(sim, 4)), zombie(sim, 'basic', 2, overCol(sim, 7))];
    const planted = bomb.plantedTick;
    const log = runUntil(sim, () => !bomb.alive);
    expect(sim.tick - planted).toBe(120);
    expect(ofType(log, 'explosion')[0].event.effect).toBe('cherry');
    for (const z of inside) {
      expect(z.state).toBe('dead');
      expect(z.deathCause).toBe('explosion');
    }
    for (const z of outside) expect(z.state).toBe('walking');
    expect(sim.lawn.plantAt(2, 4)).toBeNull();
  });

  it('starts a level with 35 s of its 50 s recharge left', () => {
    const sim = makeSim({ seeds: ['cherry-bomb'] });
    expect(sim.seedBank[0].remaining).toBe(3500);
  });
});

describe('Potato Mine', () => {
  it('needs 15 s to arm and ignores zombies until then', () => {
    const sim = makeSim();
    const mine = plant(sim, 'potato-mine', 1, 3);
    const behavior = mine.behaviors[0] as MineBehavior;
    const z = zombie(sim, 'basic', 1, overCol(sim, 3) + 5);
    run(sim, 1400);
    expect(behavior.armed).toBe(false);
    expect(z.state === 'eating' || z.state === 'walking').toBe(true);
  });

  it('once armed, blows up the first zombie that touches it and zombies right next to it', () => {
    const sim = makeSim();
    const mine = plant(sim, 'potato-mine', 1, 3);
    (mine.behaviors[0] as MineBehavior).armIn = 1;
    run(sim, 2);
    const first = zombie(sim, 'basic', 1, overCol(sim, 3) + 20);
    const close = zombie(sim, 'conehead', 1, overCol(sim, 3) + 40);
    const far = zombie(sim, 'basic', 1, overCol(sim, 6));
    const log = run(sim, 5);
    expect(ofType(log, 'explosion')[0].event.effect).toBe('potato');
    expect(first.deathCause).toBe('explosion');
    expect(close.deathCause).toBe('explosion');
    expect(far.state).toBe('walking');
    expect(mine.alive).toBe(false);
  });

  it('is vaulted over by a running Pole Vaulting Zombie', () => {
    const sim = makeSim();
    const mine = plant(sim, 'potato-mine', 1, 3);
    (mine.behaviors[0] as MineBehavior).armIn = 1;
    const vaulter = zombie(sim, 'pole-vaulting', 1, overCol(sim, 5), false);
    const log = runUntil(sim, () => vaulter.hitRight < mine.hitLeft, 3000);
    expect(ofType(log, 'zombie-vaulted')).toHaveLength(1);
    expect(mine.alive).toBe(true);
    expect(ofType(log, 'explosion')).toHaveLength(0);
  });
});

describe('Snow Pea', () => {
  it('chills for 10 s: half walking speed and half bite rate', () => {
    const sim = makeSim();
    const shooter = plant(sim, 'snow-pea', 0, 0);
    const z = zombie(sim, 'basic', 0, 500, false);
    z.health = 1e9;
    runUntil(sim, () => z.chillTicks > 0);
    expect(z.chillTicks).toBeGreaterThan(990);
    expect(z.speedFactor).toBe(0.5);
    const x = z.x;
    run(sim, 10);
    expect(x - z.x).toBeCloseTo(z.speed * 0.5 * 10, 6);
    sim.removePlant(shooter, 'debug');
    run(sim, 1001);
    expect(z.chillTicks).toBe(0);
  });

  it('chilled zombies take twice as long to eat a plant', () => {
    const sim = makeSim();
    const victim = plant(sim, 'peashooter', 2, 3);
    const z = zombie(sim, 'basic', 2, victim.x + 25, false);
    z.health = 1e9;
    z.chillTicks = 100_000;
    const log = run(sim, 1000);
    const started = ofType(log, 'zombie-started-eating')[0];
    const eaten = ofType(log, 'plant-removed')[0];
    expect(eaten.tick - started.tick).toBe(600);
  });

  it('does not chill through a screen door', () => {
    const sim = makeSim();
    plant(sim, 'snow-pea', 0, 0);
    const z = zombie(sim, 'screen-door', 0, 500);
    runUntil(sim, () => z.armor[0].health < 1100);
    expect(z.chillTicks).toBe(0);
    expect(z.health).toBe(270);
  });
});

describe('Chomper', () => {
  it('swallows a zombie in reach after its bite delay, then chews for 42 s', () => {
    const sim = makeSim();
    const chomper = plant(sim, 'chomper', 1, 2);
    const behavior = chomper.behaviors[0] as ChomperBehavior;
    const victim = zombie(sim, 'buckethead', 1, overCol(sim, 3));
    const log = runUntil(sim, () => victim.state === 'dead');
    const bite = ofType(log, 'chomper-bite')[0];
    expect(bite.event.zombieId).toBe(victim.id);
    expect(victim.deathCause).toBe('chomp');
    expect(behavior.state).toBe('chewing');
    const next = zombie(sim, 'basic', 1, overCol(sim, 3));
    run(sim, 4199);
    expect(next.state).toBe('walking');
    runUntil(sim, () => next.state === 'dead', 200);
    expect(next.deathCause).toBe('chomp');
  });

  it('ignores zombies more than a tile away', () => {
    const sim = makeSim();
    const chomper = plant(sim, 'chomper', 1, 2);
    zombie(sim, 'basic', 1, overCol(sim, 5));
    run(sim, 300);
    expect((chomper.behaviors[0] as ChomperBehavior).state).toBe('ready');
  });
});

describe('Repeater', () => {
  it('fires two peas per attack, 15 ticks apart', () => {
    const sim = makeSim();
    plant(sim, 'repeater', 3, 0);
    const z = zombie(sim, 'basic', 3, 600);
    z.health = 1e9;
    const fired = ofType(run(sim, 1000), 'projectile-fired').map((e) => e.tick);
    expect(fired.length % 2).toBe(0);
    for (let i = 0; i < fired.length; i += 2) expect(fired[i + 1] - fired[i]).toBe(15);
  });
});
