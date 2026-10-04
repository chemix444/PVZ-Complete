import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  createProfile,
  exportProfile,
  importProfile,
  IndexedDbProfileStore,
  MemoryProfileStore,
  migrateProfile,
  PROFILE_VERSION,
  ProfileVersionError,
  recordLevelResult,
  type Migration,
} from '@pvz/save';

describe('Profiles', () => {
  it('starts at the current version with one unified collection', () => {
    const profile = createProfile('Ada', 100, 'p1');
    expect(profile.version).toBe(PROFILE_VERSION);
    expect(profile.plants).toEqual({});
    expect(profile.seedSlots).toBe(6);
    expect(profile.pvz2.worlds).toEqual({});
  });

  it('records wins, losses and best time', () => {
    const profile = createProfile('Ada', 0, 'p1');
    recordLevelResult(profile, 'pvz1-day-01', false, 900);
    recordLevelResult(profile, 'pvz1-day-01', true, 20000);
    recordLevelResult(profile, 'pvz1-day-01', true, 18000);
    expect(profile.levels['pvz1-day-01']).toEqual({ wins: 2, losses: 1, bestTicks: 18000 });
    expect(profile.records.levelsWon).toBe(2);
  });
});

describe('Migrations', () => {
  const legacy: Migration[] = [
    {
      from: 0,
      to: 1,
      migrate: (raw) => ({ ...raw, plants: Object.fromEntries((raw.ownedPlants as string[]).map((id) => [id, { source: 'legacy', acquiredAt: 0 }])) }),
    },
    {
      from: 1,
      to: 2,
      migrate: (raw) => ({ ...raw, currencies: { ...(raw.currencies as object), coins: Number(raw.money ?? 0) } }),
    },
  ];

  it('runs each migration step in order and normalizes the result', () => {
    const migrated = migrateProfile({ id: 'old', name: 'Old', ownedPlants: ['peashooter'], money: 250 }, legacy, 2);
    expect(migrated.version).toBe(2);
    expect(migrated.plants.peashooter.source).toBe('legacy');
    expect(migrated.currencies.coins).toBe(250);
    expect(migrated.settings.sfxVolume).toBe(0.8);
  });

  it('fills fields added after a profile was written without touching existing data', () => {
    const old = createProfile('Ada', 5, 'p1') as unknown as Record<string, unknown>;
    old.plants = { peashooter: { source: 'campaign.start', acquiredAt: 5 }, 'future-plant': { source: 'x', acquiredAt: 9 } };
    delete old.sideModes;
    delete (old.settings as Record<string, unknown>).showFps;
    const migrated = migrateProfile(old);
    expect(migrated.sideModes).toEqual({});
    expect(migrated.settings.showFps).toBe(false);
    expect(migrated.plants['future-plant']).toEqual({ source: 'x', acquiredAt: 9 });
  });

  it('refuses profiles from a newer build instead of discarding them', () => {
    expect(() => migrateProfile({ id: 'p', version: PROFILE_VERSION + 1 })).toThrow(ProfileVersionError);
    expect(() => migrateProfile({ id: 'p', version: 0 }, [], 1)).toThrow(/No migration/);
    expect(() => migrateProfile('nope')).toThrow(ProfileVersionError);
  });

  it('round-trips through export and import', () => {
    const profile = createProfile('Ada', 1, 'p1');
    profile.plants.sunflower = { source: 'pvz1.day.1', acquiredAt: 2 };
    expect(importProfile(exportProfile(profile))).toEqual(profile);
  });
});

describe('Profile stores', () => {
  it('persists profiles and the active profile in IndexedDB', async () => {
    const store = new IndexedDbProfileStore(`test-${Math.random()}`);
    const a = createProfile('Ada', 1, 'a');
    const b = createProfile('Bo', 2, 'b');
    b.updatedAt = 50;
    await store.save(a);
    await store.save(b);
    await store.setActiveId('a');
    expect((await store.list()).map((p) => p.id)).toEqual(['b', 'a']);
    expect(await store.load('a')).toEqual(a);
    expect(await store.getActiveId()).toBe('a');
    a.plants.peashooter = { source: 'campaign.start', acquiredAt: 3 };
    await store.save(a);
    expect((await store.load('a'))?.plants.peashooter.acquiredAt).toBe(3);
    await store.remove('a');
    expect(await store.load('a')).toBeNull();
    expect(await store.getActiveId()).toBeNull();
    store.close();
  });

  it('migrates old records on load', async () => {
    const store = new MemoryProfileStore();
    store.putRaw('legacy', { id: 'legacy', version: 1, name: 'Legacy' });
    const loaded = await store.load('legacy');
    expect(loaded?.name).toBe('Legacy');
    expect(loaded?.campaign.completed).toEqual({});
  });
});
