import {
  plantBehaviorTypes,
  Registry,
  zombieBehaviorTypes,
  type BoardDef,
  type Era,
  type LevelDef,
  type PlantDef,
  type ProjectileDef,
  type SimContent,
  type ZombieDef,
} from '@pvz/engine';
import type { CampaignNodeDef } from '@pvz/campaign';
import { pvz1Plants } from './pvz1/plants';
import { pvz1Zombies } from './pvz1/zombies';
import { pvz1Projectiles } from './pvz1/projectiles';
import { pvz1Boards } from './pvz1/boards';
import { pvz1Levels } from './pvz1/levels';
import { worlds } from './worlds';
import { campaignNodes } from './campaign/nodes';
import { audioDefs } from './audio';
import { effectDefs } from './effects';
import type { AudioDef, EffectDef, WorldDef } from './types';

// One registry per content kind holds both eras. A plant that exists in both
// games is a single entry with per-era profiles, never two entries.
export const PlantRegistry = new Registry<PlantDef>('PlantRegistry', pvz1Plants);
export const ZombieRegistry = new Registry<ZombieDef>('ZombieRegistry', pvz1Zombies);
export const ProjectileRegistry = new Registry<ProjectileDef>('ProjectileRegistry', pvz1Projectiles);
export const BoardRegistry = new Registry<BoardDef>('BoardRegistry', pvz1Boards);
export const LevelRegistry = new Registry<LevelDef>('LevelRegistry', pvz1Levels);
export const WorldRegistry = new Registry<WorldDef>('WorldRegistry', worlds);
export const CampaignRegistry = new Registry<CampaignNodeDef>('CampaignRegistry', campaignNodes);
export const AudioRegistry = new Registry<AudioDef>('AudioRegistry', audioDefs);
export const EffectRegistry = new Registry<EffectDef>('EffectRegistry', effectDefs);

/** Applies a definition's era profile on top of its base values. */
export function resolveProfile<T extends { readonly profiles?: Partial<Record<Era, object>> }>(def: T, era: Era): T {
  const profile = def.profiles?.[era];
  return profile ? { ...def, ...profile } : def;
}

const eraContent = new Map<Era, SimContent>();

/** Definitions as the simulation should see them for levels of the given era. */
export function contentFor(era: Era): SimContent {
  let content = eraContent.get(era);
  if (!content) {
    const plants = new Map<string, PlantDef>();
    const zombies = new Map<string, ZombieDef>();
    content = {
      plant: (id) => cached(plants, id, () => resolveProfile(PlantRegistry.get(id), era)),
      zombie: (id) => cached(zombies, id, () => resolveProfile(ZombieRegistry.get(id), era)),
      projectile: (id) => ProjectileRegistry.get(id),
    };
    eraContent.set(era, content);
  }
  return content;
}

function cached<T>(map: Map<string, T>, id: string, make: () => T): T {
  let value = map.get(id);
  if (value === undefined) {
    value = make();
    map.set(id, value);
  }
  return value;
}

/** The level as the simulation runs it: its world's mechanics come first in `systems`. */
export function playableLevel(id: string): LevelDef {
  const level = LevelRegistry.get(id);
  const world = WorldRegistry.get(level.world);
  if (world.mechanics.length === 0) return level;
  return { ...level, systems: [...world.mechanics.map((type) => ({ type })), ...(level.systems ?? [])] };
}

/** Zombie types that can appear in a level, in first-appearance order. */
export function levelZombieTypes(level: LevelDef): string[] {
  const ids = new Set<string>();
  const generator = level.waveGenerator;
  if (generator) {
    if (generator.introduce) ids.add(generator.introduce);
    for (const id of generator.zombies) ids.add(id);
    if (generator.flagZombie) ids.add(generator.flagZombie);
  } else {
    for (const wave of level.waves) {
      for (const entry of wave.zombies) ids.add(typeof entry === 'string' ? entry : entry.zombie);
    }
  }
  for (const script of level.scripts ?? []) {
    for (const action of script.actions) if (action.do === 'spawn-zombie') ids.add(action.zombie);
  }
  const summoned = new Set<string>();
  for (const id of ids) {
    for (const behavior of ZombieRegistry.find(id)?.behaviors ?? []) {
      if (behavior.type === 'dancer') summoned.add(String(behavior.backup));
    }
  }
  return [...ids, ...[...summoned].filter((id) => !ids.has(id))];
}

/** Plants a level lends or hands out regardless of the profile's collection. */
export function levelPlantIds(level: LevelDef): string[] {
  const selection = level.seedSelection;
  return [
    ...(selection.offered ?? []),
    ...(selection.forced ?? []),
    ...(selection.banned ?? []),
    ...(level.conveyor?.plants.map((p) => p.plant) ?? []),
    ...(level.startingPlants?.map((p) => p.plant) ?? []),
  ];
}

/** Cross-reference check over every registry. Returns human-readable problems. */
export function validateContent(): string[] {
  const problems: string[] = [];
  const plantTypes = new Set(plantBehaviorTypes());
  const zombieTypes = new Set(zombieBehaviorTypes());

  for (const plant of PlantRegistry.all()) {
    for (const behavior of plant.behaviors) {
      if (!plantTypes.has(behavior.type)) problems.push(`plant ${plant.id}: unknown behavior ${behavior.type}`);
      if (behavior.type === 'shooter' && !ProjectileRegistry.has(String(behavior.projectile))) {
        problems.push(`plant ${plant.id}: unknown projectile ${String(behavior.projectile)}`);
      }
    }
  }
  for (const zombie of ZombieRegistry.all()) {
    for (const behavior of zombie.behaviors) {
      if (!zombieTypes.has(behavior.type)) problems.push(`zombie ${zombie.id}: unknown behavior ${behavior.type}`);
      if (behavior.type === 'dancer' && !ZombieRegistry.has(String(behavior.backup))) {
        problems.push(`zombie ${zombie.id}: unknown backup ${String(behavior.backup)}`);
      }
    }
  }
  for (const level of LevelRegistry.all()) {
    if (!BoardRegistry.has(level.board)) problems.push(`level ${level.id}: unknown board ${level.board}`);
    if (!WorldRegistry.has(level.world)) problems.push(`level ${level.id}: unknown world ${level.world}`);
    for (const id of levelZombieTypes(level)) {
      if (!ZombieRegistry.has(id)) problems.push(`level ${level.id}: unknown zombie ${id}`);
    }
    for (const id of levelPlantIds(level)) {
      if (!PlantRegistry.has(id)) problems.push(`level ${level.id}: unknown plant ${id}`);
    }
    if (level.seedSelection.mode === 'conveyor' && !level.conveyor) problems.push(`level ${level.id}: conveyor mode without a conveyor`);
    for (const reward of level.rewards ?? []) {
      if (reward.type === 'plant' && !PlantRegistry.has(reward.id ?? '')) {
        problems.push(`level ${level.id}: reward plant ${reward.id} does not exist`);
      }
    }
  }
  for (const world of WorldRegistry.all()) {
    for (const id of world.levels) if (!LevelRegistry.has(id)) problems.push(`world ${world.id}: unknown level ${id}`);
    for (const id of world.requires) if (!CampaignRegistry.has(id)) problems.push(`world ${world.id}: unknown node ${id}`);
  }
  for (const node of CampaignRegistry.all()) {
    if (node.level && !LevelRegistry.has(node.level)) problems.push(`node ${node.id}: unknown level ${node.level}`);
    if (node.world && !WorldRegistry.has(node.world)) problems.push(`node ${node.id}: unknown world ${node.world}`);
    for (const reward of node.rewards ?? []) {
      if (reward.type === 'plant' && !PlantRegistry.has(reward.id ?? '')) {
        problems.push(`node ${node.id}: reward plant ${reward.id} does not exist`);
      }
    }
  }
  return problems;
}
