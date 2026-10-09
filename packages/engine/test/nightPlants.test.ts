import { describe, expect, it } from 'vitest';
import { ProducerBehavior, ShooterBehavior, type Plant, type Simulation, type Zombie } from '@pvz/engine';
import { command, makeSim, ofType, run, runUntil } from './helpers';

const night = { board: 'pvz1-night' };

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

describe('Mushrooms', () => {
  it('sleep on day lawns and do nothing', () => {
    const sim = makeSim();
    const puff = plant(sim, 'puff-shroom', 1, 0);
    zombie(sim, 'basic', 1, 150);
    expect(puff.sleeping).toBe(true);
    expect(ofType(run(sim, 600), 'projectile-fired')).toHaveLength(0);
  });

  it('are awake at night', () => {
    const sim = makeSim(night);
    const puff = plant(sim, 'puff-shroom', 1, 0);
    zombie(sim, 'basic', 1, 150);
    expect(puff.sleeping).toBe(false);
    expect(ofType(run(sim, 600), 'projectile-fired').length).toBeGreaterThan(0);
  });
});

describe('Puff-shroom', () => {
  it('only targets zombies within three tiles', () => {
    const sim = makeSim(night);
    const puff = plant(sim, 'puff-shroom', 1, 0);
    const far = zombie(sim, 'basic', 1, puff.x + 80 + 250 - 36);
    expect(ofType(run(sim, 600), 'projectile-fired')).toHaveLength(0);
    far.x -= 30;
    expect(ofType(run(sim, 600), 'projectile-fired').length).toBeGreaterThan(0);
  });

  it('spores vanish after 280 px', () => {
    const sim = makeSim(night);
    const puff = plant(sim, 'puff-shroom', 1, 0);
    const spore = sim.spawnProjectile('spore', puff, 40, 66);
    run(sim, Math.ceil(280 / 3.33) + 1);
    expect(spore.alive).toBe(false);
  });
});

describe('Sun-shroom', () => {
  it('makes 15 sun until it grows after two minutes, then 25', () => {
    const sim = makeSim(night);
    const shroom = plant(sim, 'sun-shroom', 0, 0);
    const behavior = shroom.behaviors[0] as ProducerBehavior;
    const values: number[] = [];
    for (let i = 0; i < 20_000; i++) {
      for (const entry of ofType(run(sim, 1), 'sun-spawned')) {
        const sun = sim.entity(entry.event.pickupId);
        if (sun && 'value' in sun) values.push(sun.value);
      }
    }
    expect(behavior.grown).toBe(true);
    expect(values[0]).toBe(15);
    expect(values[values.length - 1]).toBe(25);
  });
});

describe('Fume-shroom', () => {
  it('hits every zombie within four tiles, including through screen doors', () => {
    const sim = makeSim(night);
    const fume = plant(sim, 'fume-shroom', 2, 1);
    const near = zombie(sim, 'basic', 2, fume.x + 60);
    const door = zombie(sim, 'screen-door', 2, fume.x + 200);
    const out = zombie(sim, 'basic', 2, fume.x + 80 + 330);
    const log = runUntil(sim, () => near.health < 270, 400);
    expect(ofType(log, 'fume').length).toBeGreaterThan(0);
    expect(near.health).toBe(250);
    expect(door.health).toBe(250);
    expect(door.armor[0].health).toBe(1080);
    expect(out.health).toBe(270);
  });
});

describe('Graves and Grave Buster', () => {
  it('places starting graves in the allowed columns and blocks planting on them', () => {
    const sim = makeSim({ ...night, level: { graves: { count: 6, minCol: 4 } } });
    const graves = sim.graves();
    expect(graves).toHaveLength(6);
    for (const grave of graves) expect(grave.col).toBeGreaterThanOrEqual(4);
    const grave = graves[0];
    expect(sim.canPlace(sim.content.plant('peashooter'), grave.row, grave.col)).toBe('occupied');
    expect(sim.canPlace(sim.content.plant('grave-buster'), 0, 0)).toBe('needs-grave');
  });

  it('a Grave Buster eats the grave in 4.5 s and disappears', () => {
    const sim = makeSim({ ...night, level: { graves: { count: 1, minCol: 8 } } });
    const grave = sim.graves()[0];
    const buster = plant(sim, 'grave-buster', grave.row, grave.col);
    const log = runUntil(sim, () => !buster.alive);
    expect(sim.tick - buster.plantedTick).toBe(450);
    expect(ofType(log, 'grave-removed')).toHaveLength(1);
    expect(sim.lawn.itemAt(grave.row, grave.col)).toBeNull();
  });

  it('on the final wave, a zombie climbs out of every grave', () => {
    const sim = makeSim({
      ...night,
      waves: [{ zombies: ['basic'] }, { flag: true, zombies: ['flag', 'conehead'] }],
      firstWaveDelay: 0.01,
      level: { graves: { count: 4, minCol: 5 }, gravesRiseOnFinalWave: true },
    });
    runUntil(sim, () => sim.waves.finished);
    const risers = sim.zombies.filter((z) => z.risingTicks > 0);
    expect(risers).toHaveLength(4);
    for (const z of risers) {
      expect(sim.graves().some((g) => g.row === z.row && Math.abs(sim.lawn.cellX(g.col) + 40 - z.centerX) < 1)).toBe(true);
      expect(z.hostile).toBe(false);
    }
    run(sim, 151);
    expect(risers.every((z) => z.hostile)).toBe(true);
  });
});

describe('Scaredy-shroom', () => {
  it('shoots from across the lawn but hides when a zombie is close', () => {
    const sim = makeSim(night);
    const scaredy = plant(sim, 'scaredy-shroom', 2, 1);
    const behavior = scaredy.behaviors[0] as ShooterBehavior;
    const z = zombie(sim, 'basic', 2, 650);
    z.health = 1e9;
    expect(ofType(run(sim, 400), 'projectile-fired').length).toBeGreaterThan(0);
    z.x = scaredy.x + 60;
    run(sim, 2);
    expect(behavior.hiding).toBe(true);
    expect(ofType(run(sim, 400), 'projectile-fired')).toHaveLength(0);
  });
});

describe('Ice-shroom', () => {
  it('freezes every zombie for 4 s, then leaves them chilled', () => {
    const sim = makeSim(night);
    const zs = [zombie(sim, 'basic', 0, 600, false), zombie(sim, 'football', 4, 300, false)];
    const ice = plant(sim, 'ice-shroom', 2, 2);
    const log = runUntil(sim, () => !ice.alive);
    expect(ofType(log, 'zombies-frozen')).toHaveLength(1);
    const xs = zs.map((z) => z.x);
    run(sim, 300);
    zs.forEach((z, i) => expect(z.x).toBe(xs[i]));
    expect(zs[0].health).toBe(250);
    run(sim, 101);
    expect(zs[0].freezeTicks).toBe(0);
    expect(zs[0].speedFactor).toBe(0.5);
  });
});

describe('Doom-shroom', () => {
  it('destroys zombies over a wide area and leaves a crater for three minutes', () => {
    const sim = makeSim(night);
    const doom = plant(sim, 'doom-shroom', 2, 4);
    const hit = [zombie(sim, 'football', 0, sim.lawn.cellX(1)), zombie(sim, 'buckethead', 4, sim.lawn.cellX(7))];
    const safe = zombie(sim, 'basic', 2, sim.lawn.cellX(8) + 40);
    runUntil(sim, () => !doom.alive);
    for (const z of hit) expect(z.deathCause).toBe('explosion');
    expect(safe.state).toBe('walking');
    const crater = sim.lawn.itemAt(2, 4);
    expect(crater?.kind).toBe('crater');
    expect(sim.canPlace(sim.content.plant('puff-shroom'), 2, 4)).toBe('occupied');
    run(sim, 18_000);
    expect(sim.lawn.itemAt(2, 4)).toBeNull();
  });
});
