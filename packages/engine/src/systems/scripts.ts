import type { ScriptAction, ScriptSpec, ScriptTrigger } from '../defs';
import { ticks } from '../core/time';
import type { Simulation } from '../simulation';
import type { SimSystem } from './types';

/** Counters that script triggers read. */
export interface ScriptCounters {
  planted: number;
  readonly plantedById: Map<string, number>;
  sunCollected: number;
  dug: number;
  killed: number;
}

// Runs each level script once, the first tick its trigger holds. Scripts
// drive tutorials and staged levels (hold waves until the player has done
// something, show advice, start the conveyor) without special cases in the
// engine.
export class ScriptSystem implements SimSystem {
  readonly id = 'scripts';
  private readonly firedAt = new Map<string, number>();

  constructor(private readonly scripts: readonly ScriptSpec[]) {}

  update(sim: Simulation): void {
    if (sim.phase !== 'playing') return;
    for (const script of this.scripts) {
      if (this.firedAt.has(script.id) || !this.holds(sim, script.when)) continue;
      this.firedAt.set(script.id, sim.tick);
      for (const action of script.actions) run(sim, action);
    }
  }

  fired(id: string): boolean {
    return this.firedAt.has(id);
  }

  private holds(sim: Simulation, trigger: ScriptTrigger): boolean {
    const counters = sim.counters;
    switch (trigger.on) {
      case 'start':
        return true;
      case 'time':
        return sim.tick >= ticks(trigger.at);
      case 'planted':
        return (trigger.plant ? (counters.plantedById.get(trigger.plant) ?? 0) : counters.planted) >= trigger.count;
      case 'sun-collected':
        return counters.sunCollected >= trigger.count;
      case 'dug':
        return counters.dug >= trigger.count;
      case 'killed':
        return counters.killed >= trigger.count;
      case 'wave':
        return sim.waves.spawned >= trigger.wave;
      case 'after': {
        const at = this.firedAt.get(trigger.script);
        return at !== undefined && sim.tick - at >= ticks(trigger.delay);
      }
    }
  }
}

function run(sim: Simulation, action: ScriptAction): void {
  switch (action.do) {
    case 'message':
      sim.emit({ type: 'message', text: action.text, duration: action.duration ?? 0 });
      return;
    case 'hold-waves':
      sim.waves.held = true;
      return;
    case 'release-waves':
      sim.waves.release(action.delay === undefined ? undefined : ticks(action.delay));
      return;
    case 'hold-sky-sun':
      if (sim.skySun) sim.skySun.held = true;
      return;
    case 'release-sky-sun':
      if (sim.skySun) sim.skySun.held = false;
      return;
    case 'drop-sun':
      sim.spawnSkySun(action.x);
      return;
    case 'add-sun':
      sim.addSun(action.amount);
      return;
    case 'spawn-zombie':
      sim.spawnZombie(action.zombie, action.row, action.x ?? sim.board.zombieSpawnX, -1);
      return;
    case 'start-conveyor':
      if (sim.conveyor) sim.conveyor.running = true;
      return;
    case 'stop-conveyor':
      if (sim.conveyor) sim.conveyor.running = false;
      return;
  }
}
