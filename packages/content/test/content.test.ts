import { describe, expect, it } from 'vitest';
import {
  contentFor,
  levelZombieTypes,
  LevelRegistry,
  PlantRegistry,
  resolveProfile,
  validateContent,
  ZombieRegistry,
} from '@pvz/content';
import type { PlantDef } from '@pvz/engine';

describe('Content registries', () => {
  it('cross-references cleanly', () => {
    expect(validateContent()).toEqual([]);
  });

  it('uses stable ids and tags every definition with an era', () => {
    for (const plant of PlantRegistry.all()) expect(['pvz1', 'pvz2']).toContain(plant.era);
    for (const zombie of ZombieRegistry.all()) expect(['pvz1', 'pvz2']).toContain(zombie.era);
    expect(PlantRegistry.get('peashooter').cost).toBe(100);
    expect(() => PlantRegistry.get('no-such-plant')).toThrow(/unknown id/);
  });

  it('keeps one definition per plant and applies era profiles on top', () => {
    const plant: PlantDef = {
      ...PlantRegistry.get('peashooter'),
      profiles: { pvz2: { health: 300, cost: 100, recharge: 5, tags: ['shooter', 'plant-food'] } },
    };
    const pvz2 = resolveProfile(plant, 'pvz2');
    expect(pvz2.id).toBe('peashooter');
    expect(pvz2.recharge).toBe(5);
    expect(pvz2.behaviors).toBe(plant.behaviors);
    expect(resolveProfile(plant, 'pvz1')).toBe(plant);
  });

  it('serves era-resolved definitions to the simulation', () => {
    expect(contentFor('pvz1').plant('wall-nut')).toBe(PlantRegistry.get('wall-nut'));
  });

  it('lists the zombies a level can spawn', () => {
    expect(levelZombieTypes(LevelRegistry.get('pvz1-day-01'))).toEqual(['basic', 'conehead', 'flag']);
  });
});
