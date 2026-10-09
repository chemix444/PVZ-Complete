import { BoardRegistry, contentFor } from '@pvz/content';
import { Simulation, type Command, type LevelDef, type SimEvent, type WaveSpec } from '@pvz/engine';

export interface TestLevelOptions {
  board?: string;
  /** Any other level fields to override. */
  level?: Partial<LevelDef>;
  waves?: WaveSpec[];
  seeds?: string[];
  skySun?: boolean;
  mowers?: boolean;
  sun?: number;
  rngSeed?: number;
  firstWaveDelay?: number;
}

// A level with no waves would clear on its first tick, so without explicit
// waves the test level gets one wave that never arrives.
const NEVER = 1e6;

/** A plain five-lane PvZ 1 lawn with sky sun, waves and mowers off unless asked for. */
export function makeSim(options: TestLevelOptions = {}): Simulation {
  const level: LevelDef = {
    id: 'test-level',
    era: 'pvz1',
    world: 'pvz1-day',
    name: 'Test',
    label: 'T',
    board: options.board ?? 'pvz1-day',
    startingSun: options.sun ?? 5000,
    seedSelection: { mode: 'choose', slots: 6 },
    waves: options.waves ?? [{ zombies: ['basic'] }],
    firstWaveDelay: options.firstWaveDelay ?? (options.waves ? 18 : NEVER),
    skySun: options.skySun ?? false,
    mowers: options.mowers ?? false,
    rewards: [{ type: 'plant', id: 'sunflower' }],
    ...options.level,
  };
  return new Simulation({
    content: contentFor('pvz1'),
    board: BoardRegistry.get(level.board),
    level,
    seeds: options.seeds ?? ['peashooter', 'sunflower', 'wall-nut'],
    rngSeed: options.rngSeed ?? 1234,
  });
}

/** Steps the simulation, collecting every event emitted along the way with its tick. */
export function run(sim: Simulation, ticks: number, log: { tick: number; event: SimEvent }[] = []) {
  for (let i = 0; i < ticks && !sim.finished; i++) {
    sim.step();
    for (const event of sim.drainEvents()) log.push({ tick: sim.tick, event });
  }
  return log;
}

export function runUntil(sim: Simulation, done: () => boolean, limit = 100_000) {
  const log: { tick: number; event: SimEvent }[] = [];
  for (let i = 0; i < limit && !done() && !sim.finished; i++) {
    sim.step();
    for (const event of sim.drainEvents()) log.push({ tick: sim.tick, event });
  }
  return log;
}

export function command(sim: Simulation, cmd: Command): SimEvent[] {
  sim.issue(cmd);
  sim.step();
  return sim.drainEvents();
}

export function ofType<T extends SimEvent['type']>(log: { tick: number; event: SimEvent }[], type: T) {
  return log.filter((entry) => entry.event.type === type) as { tick: number; event: Extract<SimEvent, { type: T }> }[];
}
