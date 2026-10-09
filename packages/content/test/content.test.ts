import { describe, expect, it } from 'vitest';
import {
  contentFor,
  levelZombieTypes,
  playableLevel,
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

  it('runs a level with its world mechanics prepended to its systems', () => {
    expect(playableLevel('pvz1-day-01')).toBe(LevelRegistry.get('pvz1-day-01'));
  });

  it('lists the zombies a level can spawn, including summoned ones', () => {
    expect(levelZombieTypes(LevelRegistry.get('pvz1-day-01'))).toEqual(['basic', 'flag']);
    expect(levelZombieTypes(LevelRegistry.get('pvz1-day-06'))).toEqual(['pole-vaulting', 'basic', 'conehead', 'flag']);
    expect(levelZombieTypes(LevelRegistry.get('pvz1-night-08'))).toContain('backup-dancer');
  });

  it('defines all twenty Day and Night levels in campaign order', () => {
    const labels = LevelRegistry.all().map((level) => level.label);
    expect(labels).toEqual([...Array.from({ length: 10 }, (_, i) => `1-${i + 1}`), ...Array.from({ length: 10 }, (_, i) => `2-${i + 1}`)]);
  });
});
