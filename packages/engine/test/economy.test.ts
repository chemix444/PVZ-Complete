import { describe, expect, it } from 'vitest';
import { ProducerBehavior, SUN_LIFETIME, type Pickup } from '@pvz/engine';
import { command, makeSim, ofType, run, runUntil } from './helpers';

describe('Sunflower production', () => {
  it('produces its first sun 300-1250 ticks after planting, then every 2350-2500', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const sim = makeSim({ rngSeed: seed });
      command(sim, { type: 'debug-spawn-plant', plant: 'sunflower', row: 0, col: 0 });
      const planted = sim.tick;
      const spawns = ofType(run(sim, 8000), 'sun-spawned').map((e) => e.tick);
      expect(spawns[0] - planted).toBeGreaterThanOrEqual(300);
      expect(spawns[0] - planted).toBeLessThanOrEqual(1250);
      for (let i = 1; i < spawns.length; i++) {
        expect(spawns[i] - spawns[i - 1]).toBeGreaterThanOrEqual(2350);
        expect(spawns[i] - spawns[i - 1]).toBeLessThanOrEqual(2500);
      }
    }
  });

  it('glows 100 ticks before producing', () => {
    const sim = makeSim();
    command(sim, { type: 'debug-spawn-plant', plant: 'sunflower', row: 0, col: 0 });
    const log = run(sim, 2000);
    const glow = ofType(log, 'plant-glow')[0];
    const sun = ofType(log, 'sun-spawned')[0];
    expect(sun.tick - glow.tick).toBe(100);
    const flower = sim.lawn.plantAt(0, 0)!;
    const counter = (flower.behaviors[0] as ProducerBehavior).counter;
    expect(counter).toBeGreaterThan(0);
    expect(counter).toBeLessThanOrEqual(2500);
  });
});

describe('Sky sun', () => {
  it('drops after min(950, 425 + 10n) + 0..274 ticks', () => {
    const sim = makeSim({ skySun: true });
    const drops = ofType(run(sim, 20_000), 'sun-spawned').map((e) => e.tick);
    expect(drops[0]).toBeGreaterThanOrEqual(425);
    expect(drops[0]).toBeLessThanOrEqual(699);
    for (let n = 1; n < drops.length; n++) {
      const base = Math.min(950, 425 + 10 * n);
      expect(drops[n] - drops[n - 1]).toBeGreaterThanOrEqual(base);
      expect(drops[n] - drops[n - 1]).toBeLessThanOrEqual(base + 274);
    }
  });

  it('falls to its landing spot and expires 750 ticks after landing', () => {
    const sim = makeSim({ skySun: true });
    let sun: Pickup | undefined;
    runUntil(sim, () => (sun = sim.pickups[0]) !== undefined);
    const landY = sun!.landY;
    runUntil(sim, () => sun!.state === 'resting');
    expect(sun!.y).toBe(landY);
    const landed = sim.tick;
    const log = runUntil(sim, () => !sun!.alive);
    expect(ofType(log, 'pickup-expired')).toHaveLength(1);
    expect(sim.tick - landed).toBe(SUN_LIFETIME);
  });
});

describe('Collecting sun', () => {
  it('credits 25 sun when the pickup reaches the sun bank, not on click', () => {
    const sim = makeSim({ skySun: true, sun: 50 });
    runUntil(sim, () => sim.pickups.length > 0);
    const sun = sim.pickups[0];
    const events = command(sim, { type: 'collect', pickupId: sun.id });
    expect(events.some((e) => e.type === 'pickup-collected')).toBe(true);
    expect(sim.sun).toBe(50);
    const log = runUntil(sim, () => !sun.alive);
    expect(ofType(log, 'sun-credited')[0].event.amount).toBe(25);
    expect(sim.sun).toBe(75);
    expect(sim.tick).toBeLessThan(200 + log[0].tick);
  });

  it('ignores a second click on a sun already flying to the bank', () => {
    const sim = makeSim({ skySun: true, sun: 0 });
    runUntil(sim, () => sim.pickups.length > 0);
    const id = sim.pickups[0].id;
    sim.issue({ type: 'collect', pickupId: id });
    sim.issue({ type: 'collect', pickupId: id });
    runUntil(sim, () => sim.pickups.length === 0);
    expect(sim.sun).toBe(25);
  });
});

describe('Seed packets', () => {
  it('spends sun and recharges for 750 ticks after planting a Peashooter', () => {
    const sim = makeSim({ sun: 300 });
    expect(command(sim, { type: 'plant', slot: 0, row: 0, col: 0 })[0].type).toBe('plant-placed');
    const planted = sim.tick;
    expect(sim.sun).toBe(200);
    const rejected = command(sim, { type: 'plant', slot: 0, row: 1, col: 0 })[0];
    expect(rejected).toMatchObject({ type: 'plant-rejected', reason: 'recharging' });
    run(sim, planted + 748 - sim.tick);
    expect(command(sim, { type: 'plant', slot: 0, row: 1, col: 0 })[0]).toMatchObject({ reason: 'recharging' });
    expect(sim.tick).toBe(planted + 749);
    expect(command(sim, { type: 'plant', slot: 0, row: 1, col: 0 })[0].type).toBe('plant-placed');
    expect(sim.tick).toBe(planted + 750);
  });

  it('starts the Wall-nut packet with a 2000 tick recharge', () => {
    const sim = makeSim();
    const nut = sim.seedBank[2];
    expect(nut.def.id).toBe('wall-nut');
    expect(nut.remaining).toBe(2000);
    expect(sim.seedBank[0].ready).toBe(true);
    run(sim, 1999);
    expect(nut.ready).toBe(false);
    run(sim, 1);
    expect(nut.ready).toBe(true);
  });

  it('rejects unaffordable, occupied and out-of-bounds placements', () => {
    const sim = makeSim({ sun: 75 });
    expect(command(sim, { type: 'plant', slot: 0, row: 0, col: 0 })[0]).toMatchObject({ reason: 'not-enough-sun' });
    expect(command(sim, { type: 'plant', slot: 1, row: 0, col: 0 })[0].type).toBe('plant-placed');
    expect(sim.sun).toBe(25);
    command(sim, { type: 'debug-add-sun', amount: 100 });
    sim.seedBank[1].remaining = 0;
    expect(command(sim, { type: 'plant', slot: 1, row: 0, col: 0 })[0]).toMatchObject({ reason: 'occupied' });
    expect(command(sim, { type: 'plant', slot: 1, row: 5, col: 0 })[0]).toMatchObject({ reason: 'out-of-bounds' });
    expect(command(sim, { type: 'plant', slot: 7, row: 0, col: 1 })[0]).toMatchObject({ reason: 'bad-slot' });
    expect(sim.sun).toBe(125);
  });

  it('frees the cell when a plant is dug up', () => {
    const sim = makeSim();
    command(sim, { type: 'plant', slot: 0, row: 2, col: 2 });
    const events = command(sim, { type: 'dig', row: 2, col: 2 });
    expect(events[0]).toMatchObject({ type: 'plant-removed', cause: 'dug' });
    expect(sim.lawn.plantAt(2, 2)).toBeNull();
  });
});
