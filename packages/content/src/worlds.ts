import type { WorldDef } from './types';

// PvZ 1 areas are worlds too; only their map presentation differs from PvZ 2.
export const worlds: WorldDef[] = [
  {
    id: 'pvz1-day',
    name: 'Day',
    era: 'pvz1',
    map: 'pvz1-area',
    levels: Array.from({ length: 10 }, (_, i) => `pvz1-day-${String(i + 1).padStart(2, '0')}`),
    environment: 'day',
    music: 'music.day',
    boards: ['pvz1-day'],
    mechanics: [],
    plants: ['peashooter', 'sunflower', 'cherry-bomb', 'wall-nut', 'potato-mine', 'snow-pea', 'chomper', 'repeater'],
    zombies: ['basic', 'flag', 'conehead', 'pole-vaulting', 'buckethead'],
    requires: ['campaign.start'],
    rewards: [],
  },
  {
    id: 'pvz1-night',
    name: 'Night',
    era: 'pvz1',
    map: 'pvz1-area',
    levels: Array.from({ length: 10 }, (_, i) => `pvz1-night-${String(i + 1).padStart(2, '0')}`),
    environment: 'night',
    music: 'music.night',
    boards: ['pvz1-night'],
    mechanics: [],
    plants: ['puff-shroom', 'sun-shroom', 'fume-shroom', 'grave-buster', 'hypno-shroom', 'scaredy-shroom', 'ice-shroom', 'doom-shroom'],
    zombies: ['basic', 'flag', 'conehead', 'pole-vaulting', 'buckethead', 'newspaper', 'screen-door', 'football', 'dancing', 'backup-dancer'],
    requires: ['pvz1.day.10'],
    rewards: [],
  },
];
