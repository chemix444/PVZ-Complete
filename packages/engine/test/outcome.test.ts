import { describe, expect, it } from 'vitest';
import { hashSimulation, type Simulation } from '@pvz/engine';
import { command, makeSim, ofType, run, runUntil } from './helpers';

describe('Lawn mowers', () => {
  it('starts when a zombie reaches it and clears the whole lane once', () => {
    const sim = makeSim({ mowers: true });
    expect(sim.mowers).toHaveLength(5);
    const a = sim.spawnZombie('basic', 2, 40, -1);
    const b = sim.spawnZombie('conehead', 2, 300, -1);
    const other = sim.spawnZombie('basic', 3, 300, -1);
    b.speed = other.speed = 0;
    const log = runUntil(sim, () => b.state === 'dead');
    expect(ofType(log, 'mower-started')[0].event.row).toBe(2);
    expect(a.deathCause).toBe('mower');
    expect(b.deathCause).toBe('mower');
    expect(other.state).toBe('walking');
    run(sim, 400);
    expect(sim.mowers.filter((m) => m.row === 2)).toHaveLength(0);
    expect(sim.phase).toBe('playing');
  });

  it('loses the level when a zombie reaches the house in a lane without a mower', () => {
    const sim = makeSim({ mowers: true });
    sim.spawnZombie('basic', 1, 40, -1);
    runUntil(sim, () => sim.mowers.length === 4);
    const second = sim.spawnZombie('basic', 1, 60, -1);
    const log = runUntil(sim, () => sim.finished);
    expect(sim.phase).toBe('lost');
    expect(ofType(log, 'level-lost')[0].event).toMatchObject({ zombieId: second.id, row: 1 });
    expect(second.hitLeft).toBeLessThan(sim.board.houseX);
  });

  it('does not let a headless zombie win', () => {
    const sim = makeSim();
    const z = sim.spawnZombie('basic', 0, -40, -1);
    z.health = 1e9;
    z.headLost = true;
    z.state = 'dying';
    run(sim, 500);
    expect(sim.phase).toBe('playing');
  });
});

describe('Winning', () => {
  it('drops the reward after the last zombie of the final wave dies, and wins when it is collected', () => {
    const sim = makeSim({ waves: [{ zombies: ['basic'] }, { flag: true, zombies: ['flag'] }], firstWaveDelay: 1 });
    runUntil(sim, () => sim.waves.spawned === 1);
    command(sim, { type: 'debug-kill-zombies' });
    expect(sim.phase).toBe('playing');
    runUntil(sim, () => sim.waves.finished);
    const killed = command(sim, { type: 'debug-kill-zombies' });
    expect(sim.phase).toBe('cleared');
    const reward = sim.rewardPickup!;
    expect(killed.find((e) => e.type === 'level-cleared')).toMatchObject({ pickupId: reward.id });
    expect(reward.rewards).toEqual([{ type: 'plant', id: 'sunflower' }]);
    run(sim, 300);
    expect(reward.state).toBe('resting');
    const events = command(sim, { type: 'collect', pickupId: reward.id });
    expect(sim.phase).toBe('won');
    expect(events.find((e) => e.type === 'level-won')).toMatchObject({ rewards: [{ type: 'plant', id: 'sunflower' }] });
    const tick = sim.tick;
    sim.step();
    expect(sim.tick).toBe(tick);
  });

  it('does not clear while zombies from earlier waves are alive', () => {
    const sim = makeSim({ waves: [{ zombies: ['basic'] }], firstWaveDelay: 1 });
    runUntil(sim, () => sim.waves.finished);
    run(sim, 100);
    expect(sim.phase).toBe('playing');
  });
});

// A reasonable player: stalls emergencies with a Wall-nut, defends lanes
// with zombies in them, and otherwise alternates economy and defense.
// Collects every sun the moment it can be clicked.
function playBot(sim: Simulation): void {
  const PEA = 0;
  const SUN = 1;
  const NUT = 2;
  const ROWS = [0, 1, 2, 3, 4];
  const countIn = (row: number, id: string) => sim.plants.filter((p) => p.row === row && p.def.id === id).length;
  const sunflowers = () => sim.plants.filter((p) => p.def.id === 'sunflower').length;
  const freeCol = (row: number, cols: number[]) => cols.find((col) => !sim.lawn.plantAt(row, col));
  const zombiesIn = (row: number) => sim.zombies.filter((z) => z.row === row && z.active);
  const needed = (row: number) => {
    const zombies = zombiesIn(row);
    if (zombies.length === 0) return 0;
    return zombies.length > 1 || zombies.some((z) => z.armor.length > 0) ? 2 : 1;
  };
  // Returns true when the step is the one to wait for, even if not yet affordable.
  const want = (slot: number, row: number | undefined, cols: number[]) => {
    if (row === undefined) return false;
    const col = freeCol(row, cols);
    if (col === undefined) return false;
    if (sim.checkPlanting(slot, row, col) === null) sim.issue({ type: 'plant', slot, row, col });
    return true;
  };

  while (!sim.finished && sim.tick < 300_000) {
    for (const pickup of sim.pickups) {
      if (pickup.kind === 'sun' && pickup.collectible) sim.issue({ type: 'collect', pickupId: pickup.id });
      if (pickup.kind === 'reward' && pickup.state === 'resting') sim.issue({ type: 'collect', pickupId: pickup.id });
    }
    const emergency = ROWS.find(
      (row) => zombiesIn(row).some((z) => z.x < 480) && countIn(row, 'peashooter') < needed(row) && countIn(row, 'wall-nut') === 0,
    );
    if (emergency !== undefined && sim.seedBank[NUT].ready) want(NUT, emergency, [4, 3, 5]);
    else if (sunflowers() < 2) want(SUN, ROWS.find((r) => freeCol(r, [0]) !== undefined), [0]);
    else if (want(PEA, ROWS.find((r) => countIn(r, 'peashooter') < needed(r)), [2, 3])) {
      // waiting for sun to defend a lane
    } else if (sunflowers() < 4) want(SUN, ROWS.find((r) => freeCol(r, [0]) !== undefined), [0]);
    else if (want(PEA, ROWS.find((r) => countIn(r, 'peashooter') < 1), [2])) {
      // proactive defense
    } else if (sunflowers() < 8) want(SUN, ROWS.find((r) => freeCol(r, [0, 1]) !== undefined), [0, 1]);
    else if (want(PEA, ROWS.find((r) => countIn(r, 'peashooter') < 2), [3, 2])) {
      // second column
    } else want(NUT, ROWS.find((r) => freeCol(r, [6]) !== undefined), [6]);
    sim.step();
    sim.drainEvents();
  }
}

describe('Full level', () => {
  it('can be won by a straightforward strategy', async () => {
    const { LevelRegistry, BoardRegistry, contentFor } = await import('@pvz/content');
    const { Simulation } = await import('@pvz/engine');
    const level = LevelRegistry.get('pvz1-day-01');
    for (const rngSeed of [1, 2, 3, 4, 5]) {
      const sim = new Simulation({
        content: contentFor('pvz1'),
        board: BoardRegistry.get(level.board),
        level,
        seeds: ['peashooter', 'sunflower', 'wall-nut'],
        rngSeed,
      });
      playBot(sim);
      if (sim.phase !== 'won') console.log(rngSeed, sim.tick, sim.phase, sim.plants.map((p) => `${p.def.id}@${p.row},${p.col}`).join(' '), sim.zombies.map((z) => `${z.def.id}@${z.row}:${Math.round(z.x)}:${z.state}`).join(' '));
      expect(sim.phase).toBe('won');
      expect(sim.stats.zombiesKilled).toBe(level.waves.reduce((n, w) => n + w.zombies.length, 0));
    }
  });

  it('replays identically from the same seed and inputs', async () => {
    const { LevelRegistry, BoardRegistry, contentFor } = await import('@pvz/content');
    const { Simulation } = await import('@pvz/engine');
    const level = LevelRegistry.get('pvz1-day-01');
    const play = (rngSeed: number) => {
      const sim = new Simulation({
        content: contentFor('pvz1'),
        board: BoardRegistry.get(level.board),
        level,
        seeds: ['peashooter', 'sunflower', 'wall-nut'],
        rngSeed,
      });
      const hashes: string[] = [];
      while (!sim.finished && sim.tick < 300_000) {
        for (const pickup of sim.pickups) if (pickup.state === 'resting') sim.issue({ type: 'collect', pickupId: pickup.id });
        if (sim.tick % 500 === 0) sim.issue({ type: 'plant', slot: sim.tick % 1000 === 0 ? 1 : 0, row: (sim.tick / 500) % 5, col: Math.floor(sim.tick / 2500) % 9 });
        sim.step();
        sim.drainEvents();
        if (sim.tick % 1000 === 0) hashes.push(hashSimulation(sim));
      }
      hashes.push(hashSimulation(sim));
      return hashes;
    };
    const first = play(77);
    expect(play(77)).toEqual(first);
    expect(play(78)).not.toEqual(first);
  });
});
