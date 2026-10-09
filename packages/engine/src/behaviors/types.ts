import type { BehaviorSpec } from '../defs';
import type { Plant, Zombie } from '../entities';
import type { Simulation } from '../simulation';

export interface PlantBehavior {
  readonly type: string;
  update(sim: Simulation, plant: Plant): void;
  /** Called when a zombie bites the plant; returning true consumes the bite (Hypno-shroom). */
  onBitten?(sim: Simulation, plant: Plant, zombie: Zombie): boolean;
  /** Snapshot for the inspector and debug overlays. */
  debug?(): Record<string, unknown>;
}

export interface ZombieBehavior {
  readonly type: string;
  update(sim: Simulation, zombie: Zombie): void;
  debug?(): Record<string, unknown>;
}

export type PlantBehaviorFactory = (spec: BehaviorSpec, plant: Plant, sim: Simulation) => PlantBehavior;
export type ZombieBehaviorFactory = (spec: BehaviorSpec, zombie: Zombie, sim: Simulation) => ZombieBehavior;

const plantFactories = new Map<string, PlantBehaviorFactory>();
const zombieFactories = new Map<string, ZombieBehaviorFactory>();

export function registerPlantBehavior(type: string, factory: PlantBehaviorFactory): void {
  plantFactories.set(type, factory);
}

export function registerZombieBehavior(type: string, factory: ZombieBehaviorFactory): void {
  zombieFactories.set(type, factory);
}

export function createPlantBehavior(spec: BehaviorSpec, plant: Plant, sim: Simulation): PlantBehavior {
  const factory = plantFactories.get(spec.type);
  if (!factory) throw new Error(`Unknown plant behavior "${spec.type}" on ${plant.def.id}`);
  return factory(spec, plant, sim);
}

export function createZombieBehavior(spec: BehaviorSpec, zombie: Zombie, sim: Simulation): ZombieBehavior {
  const factory = zombieFactories.get(spec.type);
  if (!factory) throw new Error(`Unknown zombie behavior "${spec.type}" on ${zombie.def.id}`);
  return factory(spec, zombie, sim);
}

export function plantBehaviorTypes(): string[] {
  return [...plantFactories.keys()];
}

export function zombieBehaviorTypes(): string[] {
  return [...zombieFactories.keys()];
}
