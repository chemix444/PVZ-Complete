import { describe, expect, it } from 'vitest';
import { HUGE_WAVE_HOLD, type WaveSpec } from '@pvz/engine';
import { makeSim, ofType, run, runUntil } from './helpers';

const threeWaves: WaveSpec[] = [
  { zombies: ['basic'] },
  { zombies: ['basic', 'basic'] },
  { flag: true, zombies: ['flag', 'conehead'] },
];

describe('Wave pacing', () => {
  it("spawns the first wave after the level's first wave delay", () => {
    const sim = makeSim({ waves: threeWaves, firstWaveDelay: 18 });
    const log = runUntil(sim, () => sim.waves.spawned > 0);
    const spawned = ofType(log, 'wave-spawned');
    expect(spawned[0].tick).toBe(1800);
    expect(spawned[0].event).toMatchObject({ wave: 1, total: 3, flag: false });
    expect(sim.zombies).toHaveLength(1);
  });

  it('schedules the next wave 2500-3100 ticks later when nothing is killed', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const sim = makeSim({ waves: threeWaves, rngSeed: seed, firstWaveDelay: 1 });
      runUntil(sim, () => sim.waves.spawned === 1);
      for (const z of sim.zombies) z.speed = 0;
      const first = sim.tick;
      expect(sim.waves.countdown).toBeGreaterThanOrEqual(2500);
      expect(sim.waves.countdown).toBeLessThanOrEqual(3100);
      runUntil(sim, () => sim.waves.spawned === 2);
      expect(sim.tick - first).toBeGreaterThanOrEqual(2500);
      expect(sim.tick - first).toBeLessThanOrEqual(3100);
    }
  });

  it('cuts the countdown to 200 ticks once the wave is weakened, but not before 401 ticks', () => {
    const sim = makeSim({ waves: threeWaves, firstWaveDelay: 1 });
    runUntil(sim, () => sim.waves.spawned === 1);
    const first = sim.tick;
    const z = sim.zombies[0];
    z.speed = 0;
    sim.damageZombie(z, 200);
    run(sim, 50);
    expect(sim.waves.countdown).toBeGreaterThan(200);
    runUntil(sim, () => sim.waves.spawned === 2);
    expect(sim.tick - first).toBe(401 + 200);
  });

  it('warns of a huge wave and holds the flag wave for 750 ticks', () => {
    const sim = makeSim({ waves: threeWaves, firstWaveDelay: 1 });
    runUntil(sim, () => sim.waves.spawned === 2);
    for (const z of sim.zombies) z.speed = 0;
    const log = runUntil(sim, () => sim.waves.spawned === 3);
    const warning = ofType(log, 'huge-wave-warning')[0];
    const flag = ofType(log, 'wave-spawned')[0];
    expect(warning.event.wave).toBe(3);
    expect(flag.tick - warning.tick).toBe(HUGE_WAVE_HOLD);
    expect(flag.event.flag).toBe(true);
    expect(ofType(log, 'final-wave')).toHaveLength(1);
    expect(sim.zombies.some((z) => z.def.id === 'flag')).toBe(true);
  });

  it('spawns zombies at the right edge, in valid rows, and tags them with their wave', () => {
    const sim = makeSim({ waves: [{ zombies: Array(40).fill('basic') }], firstWaveDelay: 0.01 });
    run(sim, 1);
    const rows = new Set<number>();
    for (const z of sim.zombies) {
      // Spawned this tick and already took its first step.
      expect(z.x).toBeGreaterThan(779);
      expect(z.x).toBeLessThan(820);
      expect(z.wave).toBe(0);
      rows.add(z.row);
    }
    expect(rows.size).toBe(5);
  });

  it('honours fixed rows in wave entries', () => {
    const sim = makeSim({ waves: [{ zombies: [{ zombie: 'conehead', row: 4 }] }], firstWaveDelay: 0.01 });
    run(sim, 1);
    expect(sim.zombies[0].row).toBe(4);
  });

  it('reports level progress from 0 to 1', () => {
    const sim = makeSim({ waves: threeWaves, firstWaveDelay: 1 });
    expect(sim.waves.progress()).toBe(0);
    runUntil(sim, () => sim.waves.spawned === 1);
    expect(sim.waves.progress()).toBeCloseTo(1 / 3, 2);
    for (const z of sim.zombies) z.speed = 0;
    run(sim, 1000);
    expect(sim.waves.progress()).toBeGreaterThan(1 / 3);
    expect(sim.waves.progress()).toBeLessThan(2 / 3);
  });
});
