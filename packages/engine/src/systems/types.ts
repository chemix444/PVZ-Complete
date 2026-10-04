import type { SystemSpec } from '../defs';
import type { Simulation } from '../simulation';

/** One step of the per-tick update. World mechanics plug in as extra systems. */
export interface SimSystem {
  readonly id: string;
  update(sim: Simulation): void;
}

export type SystemFactory = (spec: SystemSpec, sim: Simulation) => SimSystem;

const factories = new Map<string, SystemFactory>();

export function registerSystem(type: string, factory: SystemFactory): void {
  factories.set(type, factory);
}

export function createSystem(spec: SystemSpec, sim: Simulation): SimSystem {
  const factory = factories.get(spec.type);
  if (!factory) throw new Error(`Unknown simulation system "${spec.type}"`);
  return factory(spec, sim);
}
