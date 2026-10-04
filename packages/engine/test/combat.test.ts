import { describe, expect, it } from 'vitest';
import { ShooterBehavior, type Zombie } from '@pvz/engine';
import { command, makeSim, ofType, run } from './helpers';

function plant(sim: ReturnType<typeof makeSim>, id: string, row: number, col: number) {
  command(sim, { type: 'debug-spawn-plant', plant: id, row, col });
  const placed = sim.lawn.plantAt(row, col);
  if (!placed) throw new Error('plant was not placed');
  return placed;
}

function zombie(sim: ReturnType<typeof makeSim>, id: string, row: number, x: number): Zombie {
  const z = sim.spawnZombie(id, row, x, -1);
  sim.drainEvents();
  return z;
}

describe('Peashooter attack timing', () => {
  it('fires every 136-150 ticks while a target is in its lane', () => {
    const sim = makeSim();
    plant(sim, 'peashooter', 2, 0);
    const target = zombie(sim, 'basic', 2, 600);
    target.speed = 0;
    target.health = 1e9;
    const fired = ofType(run(sim, 5000), 'projectile-fired').map((e) => e.tick);
    expect(fired.length).toBeGreaterThan(30);
    for (let i = 1; i < fired.length; i++) {
      const gap = fired[i] - fired[i - 1];
      expect(gap).toBeGreaterThanOrEqual(136);
      expect(gap).toBeLessThanOrEqual(150);
    }
  });

  it('releases the pea 35 ticks after deciding to attack', () => {
    const sim = makeSim();
    const shooter = plant(sim, 'peashooter', 2, 0);
    const target = zombie(sim, 'basic', 2, 600);
    target.speed = 0;
    const behavior = shooter.behaviors[0] as ShooterBehavior;
    let decisionTick = -1;
    while (decisionTick < 0) {
      sim.step();
      if (shooter.anim === 'attack') decisionTick = shooter.animTick;
    }
    const log = run(sim, 40);
    const fire = ofType(log, 'projectile-fired')[0];
    expect(behavior.fireDelay).toBe(35);
    expect(fire.tick - decisionTick).toBe(35);
  });

  it('ignores zombies off screen, in other lanes, behind it, or dying', () => {
    const sim = makeSim();
    plant(sim, 'peashooter', 2, 4);
    const offscreen = zombie(sim, 'basic', 2, 780);
    offscreen.speed = 0;
    zombie(sim, 'basic', 1, 500).speed = 0;
    zombie(sim, 'basic', 2, 100).speed = 0;
    expect(ofType(run(sim, 600), 'projectile-fired')).toHaveLength(0);

    offscreen.x = 700;
    offscreen.health = 1e9;
    offscreen.headLost = true;
    offscreen.state = 'dying';
    expect(ofType(run(sim, 600), 'projectile-fired')).toHaveLength(0);
    offscreen.state = 'walking';
    expect(ofType(run(sim, 600), 'projectile-fired').length).toBeGreaterThan(0);
  });
});

describe('Projectiles', () => {
  it('moves peas 3.33 px per tick', () => {
    const sim = makeSim();
    const shooter = plant(sim, 'peashooter', 0, 0);
    const pea = sim.spawnProjectile('pea', shooter, 45, 32);
    const start = pea.x;
    run(sim, 30);
    expect(pea.x - start).toBeCloseTo(3.33 * 30, 6);
  });

  it('hits the leftmost overlapping zombie for 20 damage', () => {
    const sim = makeSim();
    const shooter = plant(sim, 'wall-nut', 0, 0);
    const near = zombie(sim, 'basic', 0, 400);
    const far = zombie(sim, 'basic', 0, 410);
    near.speed = far.speed = 0;
    sim.spawnProjectile('pea', shooter, 45, 32);
    const hits = ofType(run(sim, 200), 'projectile-hit');
    expect(hits).toHaveLength(1);
    expect(hits[0].event.zombieId).toBe(near.id);
    expect(near.health).toBe(250);
    expect(far.health).toBe(270);
    expect(sim.projectiles).toHaveLength(0);
  });

  it('disappears past the right edge', () => {
    const sim = makeSim();
    const shooter = plant(sim, 'peashooter', 0, 8);
    sim.spawnProjectile('pea', shooter, 45, 32);
    run(sim, 100);
    expect(sim.projectiles).toHaveLength(0);
  });
});

describe('Damage and armor', () => {
  it("knocks a basic zombie's head off with the 10th pea and its arm off with the 5th", () => {
    const sim = makeSim();
    const z = zombie(sim, 'basic', 0, 500);
    let hits = 0;
    while (!z.headLost) {
      sim.damageZombie(z, 20);
      hits++;
      if (hits === 4) expect(z.armLost).toBe(false);
      if (hits === 5) expect(z.armLost).toBe(true);
    }
    expect(hits).toBe(10);
    expect(z.state).toBe('dying');
  });

  it('takes 28 peas to behead a Conehead, with cone overflow carrying into the body', () => {
    const sim = makeSim();
    const z = zombie(sim, 'conehead', 0, 500);
    let hits = 0;
    while (z.armor[0].health > 0) {
      sim.damageZombie(z, 20);
      hits++;
    }
    expect(hits).toBe(19);
    expect(z.health).toBe(260);
    expect(ofType(run(sim, 1), 'armor-lost')).toHaveLength(1);
    while (!z.headLost) {
      sim.damageZombie(z, 20);
      hits++;
    }
    expect(hits).toBe(28);
  });

  it('reports the armor material that absorbed a hit', () => {
    const sim = makeSim();
    const z = zombie(sim, 'conehead', 0, 500);
    expect(sim.damageZombie(z, 20)?.spec.material).toBe('plastic');
    z.armor[0].health = 0;
    expect(sim.damageZombie(z, 20)).toBeNull();
  });

  it('drains a headless zombie to death and removes it after the collapse', () => {
    const sim = makeSim();
    const z = zombie(sim, 'basic', 0, 500);
    sim.damageZombie(z, 200);
    expect(z.state).toBe('dying');
    const xBefore = z.x;
    const log = run(sim, 100);
    expect(z.x).toBeLessThan(xBefore);
    expect(ofType(log, 'zombie-died')).toHaveLength(1);
    expect(z.state).toBe('dead');
    run(sim, 200);
    expect(sim.zombies).not.toContain(z);
  });
});

describe('Zombie movement and eating', () => {
  it('rolls a walking speed of 0.23-0.32 px per tick and walks at it', () => {
    const sim = makeSim();
    for (let i = 0; i < 50; i++) {
      const z = zombie(sim, 'basic', i % 5, 700);
      expect(z.speed).toBeGreaterThanOrEqual(0.23);
      expect(z.speed).toBeLessThanOrEqual(0.32);
    }
    const z = sim.zombies[0];
    const start = z.x;
    run(sim, 100);
    expect(start - z.x).toBeCloseTo(z.speed * 100, 6);
  });

  it('eats a Peashooter in 300 ticks (4 damage every 4 ticks) and walks on', () => {
    const sim = makeSim();
    const victim = plant(sim, 'peashooter', 1, 3);
    const z = zombie(sim, 'basic', 1, victim.x + 25);
    z.health = 1e9;
    const log = run(sim, 2000);
    const started = ofType(log, 'zombie-started-eating')[0];
    const eaten = ofType(log, 'plant-removed')[0];
    expect(eaten.event.cause).toBe('eaten');
    expect(eaten.tick - started.tick).toBe(300);
    expect(z.state).toBe('walking');
    expect(sim.lawn.plantAt(1, 3)).toBeNull();
  });

  it('holds a zombie on a Wall-nut for 4000 ticks', () => {
    const sim = makeSim();
    const nut = plant(sim, 'wall-nut', 3, 5);
    const z = zombie(sim, 'basic', 3, nut.x + 40);
    const log = run(sim, 6000);
    const started = ofType(log, 'zombie-started-eating')[0];
    const eaten = ofType(log, 'plant-removed')[0];
    expect(eaten.tick - started.tick).toBe(4000);
    expect(z.state).toBe('walking');
  });

  it('stops eating when its head falls off', () => {
    const sim = makeSim();
    const nut = plant(sim, 'wall-nut', 0, 5);
    const z = zombie(sim, 'basic', 0, nut.x + 10);
    run(sim, 20);
    expect(z.state).toBe('eating');
    sim.damageZombie(z, 200);
    const health = nut.health;
    run(sim, 20);
    expect(z.state === 'dying' || z.state === 'dead').toBe(true);
    expect(nut.health).toBe(health);
  });
});
