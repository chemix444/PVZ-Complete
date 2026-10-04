# Save format

All progress lives in player profiles stored in the browser's IndexedDB. A profile covers the whole game: PvZ 1 adventure, the PvZ 2 worlds, side modes, the plant collection and settings. There is no separate save for PvZ 2 and no new game when the campaign crosses into PvZ 2.

## Storage

| Item | Value |
| --- | --- |
| Database | `pvz-complete` |
| Database version | `1` (object store layout; separate from the profile format version) |
| Store `profiles` | one record per profile, key path `id` |
| Store `meta` | key-value; `activeProfile` holds the id of the last profile used |

`IndexedDbProfileStore` implements `ProfileStore` (`list`, `load`, `save`, `remove`, `getActiveId`, `setActiveId`). `MemoryProfileStore` implements the same interface for tests and for browsers without IndexedDB. Records are written with `structuredClone` and every read goes through `migrateProfile`.

## Profile record (version 1)

```ts
{
  version: 1,
  id: 'p-lw3k2x-1a2b3c',
  name: 'Ada',
  createdAt: 1759600000000,         // ms since epoch
  updatedAt: 1759600123456,
  campaign: {
    current: 'pvz1.day.2',          // Continue target; null when nothing is left
    completed: {
      'campaign.start': { firstCompletedAt, lastCompletedAt, completions: 1 },
      'pvz1.day.1': { firstCompletedAt, lastCompletedAt, completions: 3 },
    },
    unlocked: [],                   // nodes opened without their requirements
    notes: [],
  },
  levels: {
    'pvz1-day-01': { wins: 3, losses: 1, bestTicks: 18420 },
  },
  plants: {                         // the one plant collection, PvZ 1 and PvZ 2 together
    peashooter: { source: 'campaign.start', acquiredAt: 1759600000000 },
    sunflower: { source: 'pvz1.day.1', acquiredAt: 1759600100000 },
  },
  features: [],                     // campaign-gated systems: 'shovel', 'plant-food', ...
  currencies: { coins: 0 },
  seedSlots: 6,
  pvz1: { adventureCompletions: 0 },
  pvz2: { worlds: {} },             // per world: { stars, completedLevels }
  sideModes: {},                    // per mode: { bestScore, plays }
  achievements: {},                 // per id: { unlockedAt }
  records: { zombiesKilled, sunCollected, plantsPlaced, levelsWon, levelsLost },
  settings: { musicVolume: 0.5, sfxVolume: 0.8, showFps: false, devTools: false },
}
```

Campaign nodes, levels and plants are referenced by id only. Nothing in a profile embeds content data.

## Versioning and migrations

`PROFILE_VERSION` (`packages/save/src/profile.ts`) is the current format version. `migrateProfile(raw)`:

1. rejects anything that is not an object with a string `id`
2. treats a missing `version` as 0
3. refuses a version newer than this build (`ProfileVersionError`) instead of overwriting it
4. applies each `Migration { from, to, migrate }` in sequence until the current version, failing if a step is missing
5. normalizes the result

To change the format: bump `PROFILE_VERSION`, append a migration from the previous version to `MIGRATIONS`, describe it here, and add a test with a fixture of the old shape.

## Adding content never invalidates a profile

Normalization (`normalizeProfile`) deep-merges the profile over a freshly created default profile. Fields added after a profile was written get their defaults; every existing value is kept, including ids of plants, levels or nodes this build does not know. New content therefore needs no migration:

- New plants, zombies, levels and worlds simply appear as locked or available content.
- New campaign nodes are evaluated against the saved completions. On load, `CampaignGraph.start()` completes any new `auto` nodes whose requirements are already met and recomputes `campaign.current`.
- New settings, currencies, side modes and records fields take their defaults.

Migrations are only for changes defaults cannot express, such as renaming or restructuring a field.

## Export and import

Settings has Export profile and Import profile. The file is JSON:

```json
{ "format": "pvz-complete-profile", "profile": { "...": "profile record" } }
```

`importProfile()` checks the `format` marker and runs the same migration path as loading from IndexedDB, so exports from older builds import cleanly.
