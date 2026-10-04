// One profile holds the whole PVZ Complete run: PvZ 1 adventure, the PvZ 2
// worlds, side modes and settings. There is never a second save for PvZ 2.

export const PROFILE_VERSION = 1;

export interface NodeCompletion {
  firstCompletedAt: number;
  lastCompletedAt: number;
  completions: number;
}

export interface LevelRecord {
  wins: number;
  losses: number;
  /** Fastest win in simulation ticks. */
  bestTicks: number | null;
}

export interface PlantOwnership {
  /** Campaign node (or other source) that granted the plant. */
  source: string;
  acquiredAt: number;
}

export interface CampaignProgress {
  /** Node the "Continue" button leads to; null when everything available is done. */
  current: string | null;
  completed: Record<string, NodeCompletion>;
  /** Nodes opened without meeting their requirements (debug tools, events). */
  unlocked: string[];
  notes: string[];
}

export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  showFps: boolean;
  devTools: boolean;
}

export interface Records {
  zombiesKilled: number;
  sunCollected: number;
  plantsPlaced: number;
  levelsWon: number;
  levelsLost: number;
}

export interface PlayerProfile {
  version: number;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  campaign: CampaignProgress;
  levels: Record<string, LevelRecord>;
  plants: Record<string, PlantOwnership>;
  features: string[];
  currencies: Record<string, number>;
  seedSlots: number;
  pvz1: { adventureCompletions: number };
  pvz2: { worlds: Record<string, { stars: number; completedLevels: number }> };
  sideModes: Record<string, { bestScore: number; plays: number }>;
  achievements: Record<string, { unlockedAt: number }>;
  records: Records;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.5,
  sfxVolume: 0.8,
  showFps: false,
  devTools: false,
};

export const DEFAULT_SEED_SLOTS = 6;

export function createProfile(name: string, now: number, id: string = makeProfileId(now)): PlayerProfile {
  return {
    version: PROFILE_VERSION,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    campaign: { current: null, completed: {}, unlocked: [], notes: [] },
    levels: {},
    plants: {},
    features: [],
    currencies: { coins: 0 },
    seedSlots: DEFAULT_SEED_SLOTS,
    pvz1: { adventureCompletions: 0 },
    pvz2: { worlds: {} },
    sideModes: {},
    achievements: {},
    records: { zombiesKilled: 0, sunCollected: 0, plantsPlaced: 0, levelsWon: 0, levelsLost: 0 },
    settings: { ...DEFAULT_SETTINGS },
  };
}

function makeProfileId(now: number): string {
  const random = Math.floor(Math.random() * 0x100000000).toString(36);
  return `p-${now.toString(36)}-${random}`;
}

export function recordLevelResult(profile: PlayerProfile, levelId: string, won: boolean, ticks: number): LevelRecord {
  const record = (profile.levels[levelId] ??= { wins: 0, losses: 0, bestTicks: null });
  if (won) {
    record.wins++;
    profile.records.levelsWon++;
    if (record.bestTicks === null || ticks < record.bestTicks) record.bestTicks = ticks;
  } else {
    record.losses++;
    profile.records.levelsLost++;
  }
  return record;
}
