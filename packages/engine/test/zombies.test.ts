import { describe, expect, it } from 'vitest';
import { PoleVaultBehavior, RageBehavior, type Plant, type Simulation, type Zombie } from '@pvz/engine';
import { command, makeSim, ofType, run, runUntil } from './helpers';

function plant(sim: Simulation, id: string, row: number, col: number): Plant {
  command(sim, { type: 'debug-spawn-plant', plant: id, row, col });
  return sim.lawn.plantAt(row, col)!;
}

function zombie(sim: Simulation, id: string, row: number, x: number): Zombie {
  const z = sim.spawnZombie(id, row, x, -1);
  sim.drainEvents();
  return z;
}

function peasToBehead(sim: Simulation, z: Zombie): number {
  let hits = 0;
  while (!z.headLost && z.state !== 'dead') {
    sim.damageZombie(z, 20, 'projectile');
    hits++;
  }
  return hits;
}

describe('Pole Vaulting Zombie', () => {
  it('runs at 0.66-0.68 px per tick without eating', () => {
    const sim = makeSim();
    const z = zombie(sim, 'pole-vaulting', 2, 700);
    expect(z.speed).toBeGreaterThanOrEqual(0.66);
    expect(z.speed).toBeLessThanOrEqual(0.68);
    expect(z.noEat).toBe(true);
  });

  it('vaults over the first plant it reaches and lands on the far side, then walks and eats normally', () => {
    const sim = makeSim();
    const first = plant(sim, 'wall-nut', 2, 6);
    const second = plant(sim, 'peashooter', 2, 2);
    const z = zombie(sim, 'pole-vaulting', 2, 700);
    const log = runUntil(sim, () => (z.behaviors[0] as PoleVaultBehavior).phase === 'walking', 5000);
    expect(ofType(log, 'zombie-vaulted')).toHaveLength(1);
    expect(z.hitRight).toBeLessThan(first.hitLeft);
    expect(first.health).toBe(4000);
    expect(z.speed).toBeGreaterThanOrEqual(0.23);
    expect(z.speed).toBeLessThanOrEqual(0.32);
    runUntil(sim, () => z.state === 'eating', 5000);
    expect(z.eating).toBe(second);
  });

  it('needs 17 peas to lose its head (500 body health)', () => {
    const sim = makeSim();
    expect(peasToBehead(sim, zombie(sim, 'pole-vaulting', 0, 700))).toBe(17);
  });
});

describe('Armored zombies', () => {
  it('Buckethead takes 65 peas', () => {
    const sim = makeSim();
    expect(peasToBehead(sim, zombie(sim, 'buckethead', 0, 700))).toBe(65);
  });

  it('Football Zombie takes 80 peas and runs at 0.66-0.68 px per tick', () => {
    const sim = makeSim();
    const z = zombie(sim, 'football', 0, 700);
    expect(z.speed).toBeGreaterThanOrEqual(0.66);
    expect(peasToBehead(sim, z)).toBe(80);
  });

  it('a screen door soaks up peas without letting damage through', () => {
    const sim = makeSim();
    const z = zombie(sim, 'screen-door', 0, 700);
    for (let i = 0; i < 54; i++) sim.damageZombie(z, 20, 'projectile');
    expect(z.health).toBe(270);
    expect(z.armor[0].health).toBe(20);
    sim.damageZombie(z, 100, 'projectile');
    expect(z.armor[0].health).toBe(0);
    expect(z.health).toBe(270);
  });

  it('fumes hit the door and the zombie behind it at full strength', () => {
    const sim = makeSim();
    const z = zombie(sim, 'screen-door', 0, 700);
    sim.damageZombie(z, 20, 'fume');
    expect(z.armor[0].health).toBe(1080);
    expect(z.health).toBe(250);
  });

  it('explosions carry through a shield into the body', () => {
    const sim = makeSim();
    const z = zombie(sim, 'screen-door', 0, 700);
    sim.damageZombie(z, 1800, 'explosion');
    expect(z.state).toBe('dead');
    expect(z.deathCause).toBe('explosion');
  });
});

describe('Newspaper Zombie', () => {
  it('stops in shock when its paper is destroyed, then charges at 0.89-0.91 px per tick', () => {
    const sim = makeSim();
    const z = zombie(sim, 'newspaper', 1, 600);
    sim.damageZombie(z, 150, 'projectile');
    expect(z.health).toBe(270);
    const log = run(sim, 1);
    expect(ofType(log, 'zombie-enraged')).toHaveLength(1);
    const x = z.x;
    run(sim, 140);
    expect(z.x).toBe(x);
    runUntil(sim, () => (z.behaviors[0] as RageBehavior).phase === 'angry');
    expect(z.speed).toBeGreaterThanOrEqual(0.89);
    expect(z.speed).toBeLessThanOrEqual(0.91);
  });
});

describe('Dancing Zombie', () => {
  it('moonwalks in, summons four backup dancers around itself, and replaces lost ones', () => {
    const sim = makeSim();
    const dancer = zombie(sim, 'dancing', 2, 760);
    const backupsAlive = () => sim.zombies.filter((z) => z.def.id === 'backup-dancer' && z.state !== 'dead');
    const log = runUntil(sim, () => backupsAlive().length >= 4, 3000);
    const summoned = ofType(log, 'backup-summoned');
    expect(summoned).toHaveLength(4);
    const backups = summoned.map((e) => sim.entity(e.event.zombieId) as Zombie);
    expect(new Set(backups.map((b) => b.row))).toEqual(new Set([1, 2, 3]));
    expect(backups.every((b) => b.risingTicks > 0)).toBe(true);
    expect(dancer.hitLeft).toBeLessThan(640);

    sim.killZombie(backups[0], 'debug');
    const more = runUntil(sim, () => backupsAlive().length === 4, 3000);
    expect(ofType(more, 'backup-summoned')).toHaveLength(1);
  });

  it('in the top lane summons only in front, behind and below', () => {
    const sim = makeSim();
    zombie(sim, 'dancing', 0, 760);
    const log = runUntil(sim, () => sim.zombies.length >= 4, 3000);
    const rows = ofType(log, 'backup-summoned').map((e) => (sim.entity(e.event.zombieId) as Zombie).row);
    expect(rows.sort()).toEqual([0, 0, 1]);
  });
});

describe('Hypnotized zombies', () => {
  it('turn around after biting a Hypno-shroom, fight zombies, and leave on the right', () => {
    const sim = makeSim({ board: 'pvz1-night' });
    const hypno = plant(sim, 'hypno-shroom', 2, 3);
    const z = zombie(sim, 'basic', 2, hypno.x + 25);
    z.health = 260;
    const log = runUntil(sim, () => z.hypnotized, 500);
    expect(ofType(log, 'zombie-hypnotized')).toHaveLength(1);
    expect(hypno.alive).toBe(false);
    const x = z.x;
    run(sim, 50);
    expect(z.x).toBeGreaterThan(x);

    const enemy = zombie(sim, 'basic', 2, z.x + 40);
    enemy.speed = 0;
    z.speed = 0.3;
    runUntil(sim, () => z.state === 'eating', 500);
    expect(z.eating).toBe(enemy);
    expect(enemy.eating).toBe(z);
    runUntil(sim, () => enemy.health < 270, 50);
    expect(enemy.health).toBeLessThan(270);
  });

  it('are ignored by plants and projectiles', () => {
    const sim = makeSim();
    plant(sim, 'peashooter', 1, 0);
    const z = zombie(sim, 'basic', 1, 500);
    sim.hypnotize(z);
    z.speed = 0;
    const log = run(sim, 600);
    expect(ofType(log, 'projectile-fired')).toHaveLength(0);
    expect(z.health).toBe(270);
  });
});
