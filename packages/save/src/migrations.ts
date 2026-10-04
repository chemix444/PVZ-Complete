import { createProfile, PROFILE_VERSION, type PlayerProfile } from './profile';

/** Upgrades a raw profile object from one version to the next. */
export interface Migration {
  readonly from: number;
  readonly to: number;
  migrate(raw: Record<string, unknown>): Record<string, unknown>;
}

// Add an entry here whenever PlayerProfile changes shape in a way defaults
// cannot express (renames, restructuring). New optional data and new content
// ids never need a migration; normalizeProfile fills defaults.
export const MIGRATIONS: readonly Migration[] = [];

export class ProfileVersionError extends Error {}

export function migrateProfile(
  raw: unknown,
  migrations: readonly Migration[] = MIGRATIONS,
  current: number = PROFILE_VERSION,
): PlayerProfile {
  if (!isRecord(raw) || typeof raw.id !== 'string') {
    throw new ProfileVersionError('Not a PVZ Complete profile');
  }
  let data: Record<string, unknown> = structuredClone(raw);
  let version = typeof data.version === 'number' ? data.version : 0;
  if (version > current) {
    throw new ProfileVersionError(`Profile version ${version} is newer than this build supports (${current})`);
  }
  while (version < current) {
    const step = migrations.find((m) => m.from === version);
    if (!step) throw new ProfileVersionError(`No migration from profile version ${version}`);
    data = step.migrate(data);
    version = step.to;
    data.version = version;
  }
  return normalizeProfile(data, current);
}

// Fills every field missing from an older or partial profile with its
// default, keeping all existing values, including ids of content this build
// does not know about.
export function normalizeProfile(data: Record<string, unknown>, version: number = PROFILE_VERSION): PlayerProfile {
  const defaults = createProfile(String(data.name ?? 'Player'), Number(data.createdAt ?? 0), String(data.id));
  const merged = mergeDefaults(defaults, data) as unknown as PlayerProfile;
  merged.version = version;
  return merged;
}

function mergeDefaults(defaults: unknown, value: unknown): unknown {
  if (value === undefined) return structuredClone(defaults);
  if (!isRecord(defaults) || !isRecord(value) || Array.isArray(defaults)) return value;
  const out: Record<string, unknown> = { ...value };
  for (const key of Object.keys(defaults)) out[key] = mergeDefaults(defaults[key], value[key]);
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function exportProfile(profile: PlayerProfile): string {
  return JSON.stringify({ format: 'pvz-complete-profile', profile }, null, 2);
}

export function importProfile(json: string): PlayerProfile {
  const parsed = JSON.parse(json) as { format?: string; profile?: unknown };
  if (parsed.format !== 'pvz-complete-profile') throw new ProfileVersionError('Not a PVZ Complete profile export');
  return migrateProfile(parsed.profile);
}
