import { describe, expect, it } from 'vitest';
import { contentFor } from '@pvz/content';
import { generateWaves, Rng, type ScriptSpec } from '@pvz/engine';
import { command, makeSim, ofType, run, runUntil } from './helpers';

describe('Unsodded lanes', () => {
  it('only sodded rows get zombies, mowers and plants', () => {
    const sim = makeSim({
      waves: [{ zombies: Array(20).fill('basic') }],
      firstWaveDelay: 0.01,
      mowers: true,
      level: { lanes: ['dirt', 'grass', 'grass', 'grass', 'dirt'] },
    });
    run(sim, 2);
    expect(new Set(sim.zombies.map((z) => z.row))).toEqual(new Set([1, 2, 3]));
    expect(sim.mowers.map((m) => m.row)).toEqual([1, 2, 3]);
    expect(sim.canPlace(sim.content.plant('peashooter'), 0, 2)).toBe('surface');
    expect(sim.canPlace(sim.content.plant('peashooter'), 1, 2)).toBeNull();
  });
});

describe('Scripts', () => {
  const tutorial: ScriptSpec[] = [
    { id: 'intro', when: { on: 'start' }, actions: [{ do: 'message', text: 'Plant a Peashooter' }, { do: 'hold-waves' }] },
    { id: 'planted', when: { on: 'planted', count: 1, plant: 'peashooter' }, actions: [{ do: 'release-waves', delay: 5 }] },
    { id: 'sun', when: { on: 'sun-collected', count: 1 }, actions: [{ do: 'message', text: 'Nice', duration: 3 }] },
    { id: 'later', when: { on: 'after', script: 'planted', delay: 2 }, actions: [{ do: 'add-sun', amount: 100 }] },
  ];

  it('hold waves until the player plants, then release them on a new delay', () => {
    const sim = makeSim({ waves: [{ zombies: ['basic'] }], firstWaveDelay: 1, sun: 100, level: { scripts: tutorial } });
    const intro = run(sim, 1);
    expect(ofType(intro, 'message')[0].event.text).toBe('Plant a Peashooter');
    run(sim, 1000);
    expect(sim.waves.spawned).toBe(0);
    command(sim, { type: 'plant', slot: 0, row: 2, col: 0 });
    const planted = sim.tick;
    runUntil(sim, () => sim.waves.spawned === 1);
    expect(sim.tick - planted).toBe(500);
    expect(sim.sun).toBe(100);
  });

  it('fires each script once', () => {
    const sim = makeSim({ skySun: true, level: { scripts: tutorial } });
    runUntil(sim, () => sim.pickups.length > 0);
    command(sim, { type: 'collect', pickupId: sim.pickups[0].id });
    runUntil(sim, () => sim.pickups.length > 0);
    command(sim, { type: 'collect', pickupId: sim.pickups[0].id });
    const log = run(sim, 2000);
    expect(ofType(log, 'message').filter((e) => e.event.text === 'Nice').length).toBeLessThanOrEqual(1);
    expect(sim.scripts!.fired('sun')).toBe(true);
  });

  it('counts dug plants for staged levels', () => {
    const sim = makeSim({
      level: {
        startingPlants: [
          { plant: 'peashooter', row: 0, col: 4 },
          { plant: 'peashooter', row: 2, col: 5 },
        ],
        scripts: [{ id: 'cleared', when: { on: 'dug', count: 2 }, actions: [{ do: 'message', text: 'Done' }] }],
      },
    });
    expect(sim.plants).toHaveLength(2);
    command(sim, { type: 'dig', row: 0, col: 4 });
    expect(sim.scripts!.fired('cleared')).toBe(false);
    const events = command(sim, { type: 'dig', row: 2, col: 5 });
    expect(events.some((e) => e.type === 'message')).toBe(true);
  });
});

describe('Conveyor belt', () => {
  const conveyor = { plants: [{ plant: 'peashooter', weight: 1 }, { plant: 'wall-nut', weight: 1 }], interval: 4, capacity: 3 };

  it('delivers a free packet every interval until the belt is full', () => {
    const sim = makeSim({ level: { seedSelection: { mode: 'conveyor' }, conveyor } });
    expect(sim.seedBank).toHaveLength(0);
    const log = run(sim, 2000);
    const deliveries = ofType(log, 'conveyor-packet').map((e) => e.tick);
    expect(deliveries).toHaveLength(3);
    expect(deliveries[1] - deliveries[0]).toBe(400);
    expect(sim.conveyor!.packets).toHaveLength(3);
  });

  it('plants from the belt cost nothing and free a slot', () => {
    const sim = makeSim({ sun: 0, level: { seedSelection: { mode: 'conveyor' }, conveyor } });
    runUntil(sim, () => sim.conveyor!.packets.length > 0);
    const packet = sim.conveyor!.packets[0];
    const events = command(sim, { type: 'plant-conveyor', packetId: packet.id, row: 1, col: 1 });
    expect(events[0]).toMatchObject({ type: 'plant-placed', def: packet.def.id });
    expect(sim.conveyor!.packets).not.toContain(packet);
    expect(sim.sun).toBe(0);
  });
});

describe('Wall-nut Bowling', () => {
  const bowling = { plantableCols: 3, seedSelection: { mode: 'conveyor' as const } };

  it('only allows planting left of the red line', () => {
    const sim = makeSim({ level: bowling });
    expect(sim.canPlace(sim.content.plant('wall-nut-bowling'), 2, 3)).toBe('column');
    expect(sim.canPlace(sim.content.plant('wall-nut-bowling'), 2, 2)).toBeNull();
  });

  it('rolls, knocks out the zombie it hits, and bounces off diagonally into the next', () => {
    const sim = makeSim({ level: bowling });
    const first = sim.spawnZombie('basic', 2, 400, -1);
    const up = sim.spawnZombie('conehead', 1, 440, -1);
    const down = sim.spawnZombie('conehead', 3, 440, -1);
    first.speed = up.speed = down.speed = 0;
    command(sim, { type: 'debug-spawn-plant', plant: 'wall-nut-bowling', row: 2, col: 0 });
    run(sim, 1);
    expect(sim.rollers).toHaveLength(1);
    expect(sim.plants).toHaveLength(0);
    const roller = sim.rollers[0];
    const log = runUntil(sim, () => !roller.alive, 2000);
    const hits = ofType(log, 'roller-hit').map((e) => e.event.zombieId);
    expect(hits[0]).toBe(first.id);
    expect(first.state).toBe('dead');
    expect([up.id, down.id]).toContain(hits[1]);
  });

  it('an Explode-o-nut blows up a 3x3 area on first contact', () => {
    const sim = makeSim({ level: bowling });
    const target = sim.spawnZombie('buckethead', 2, 400, -1);
    const neighbour = sim.spawnZombie('basic', 3, 420, -1);
    const away = sim.spawnZombie('basic', 0, 420, -1);
    target.speed = neighbour.speed = away.speed = 0;
    command(sim, { type: 'debug-spawn-plant', plant: 'explode-o-nut', row: 2, col: 0 });
    const log = runUntil(sim, () => target.state === 'dead', 2000);
    expect(ofType(log, 'explosion')[0].event.effect).toBe('explode-o-nut');
    expect(neighbour.deathCause).toBe('explosion');
    expect(away.state).toBe('walking');
  });
});

describe('PvZ 1 wave generator', () => {
  const content = contentFor('pvz1');
  const spec = { waves: 20, zombies: ['basic', 'conehead', 'pole-vaulting', 'buckethead'], introduce: 'pole-vaulting', flagZombie: 'flag' };

  it('puts flags on every 10th wave and the last, led by the flag zombie', () => {
    const waves = generateWaves(spec, new Rng(5), content);
    expect(waves).toHaveLength(20);
    expect(waves.map((w, i) => (w.flag ? i : -1)).filter((i) => i >= 0)).toEqual([9, 19]);
    expect(waves[9].zombies[0]).toBe('flag');
    expect(waves[0].zombies).toEqual(['pole-vaulting']);
  });

  it('spends the budget floor(i / 3) + 1, times 2.5 on flag waves', () => {
    const values = new Map(spec.zombies.map((id) => [id, content.zombie(id).spawn!.value]));
    const waves = generateWaves({ ...spec, introduce: undefined }, new Rng(9), content);
    waves.forEach((wave, i) => {
      let budget = Math.floor(i / 3) + 1;
      if (wave.flag) budget = Math.floor(budget * 2.5);
      const spent = wave.zombies.filter((z) => z !== 'flag').reduce((n, z) => n + values.get(z as string)!, 0);
      expect(spent).toBe(budget);
    });
  });

  it('is deterministic for a seed and varies across seeds', () => {
    expect(generateWaves(spec, new Rng(1), content)).toEqual(generateWaves(spec, new Rng(1), content));
    expect(generateWaves(spec, new Rng(1), content)).not.toEqual(generateWaves(spec, new Rng(2), content));
  });
});

describe('Whack a Zombie', () => {
  it('sends zombies up out of graves and lets the mallet knock them out', () => {
    const sim = makeSim({
      board: 'pvz1-night',
      waves: [{ zombies: ['basic', 'conehead'] }],
      firstWaveDelay: 0.01,
      level: { mode: 'whack', graves: { count: 5, minCol: 4 } },
    });
    run(sim, 2);
    const [basic, cone] = sim.zombies;
    expect(basic.risingTicks).toBeGreaterThan(0);
    const graveCells = sim.graves().map((g) => `${g.row},${sim.lawn.cellX(g.col) + 40}`);
    expect(graveCells).toContain(`${basic.row},${basic.centerX}`);
    run(sim, 160);
    command(sim, { type: 'whack', x: basic.centerX, y: basic.y + 50 });
    expect(basic.state).toBe('dead');
    command(sim, { type: 'whack', x: cone.centerX, y: cone.y + 50 });
    expect(cone.state).not.toBe('dead');
    command(sim, { type: 'whack', x: cone.centerX, y: cone.y + 50 });
    expect(cone.state).toBe('dead');
  });
});
