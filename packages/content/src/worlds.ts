import type { WorldDef } from './types';

// PvZ 1 areas are worlds too; only their map presentation differs from PvZ 2.
export const worlds: WorldDef[] = [
  {
    id: 'pvz1-day',
    name: 'Day',
    era: 'pvz1',
    map: 'pvz1-area',
    levels: ['pvz1-day-01'],
    environment: 'day',
    music: 'music.day',
    boards: ['pvz1-day'],
    mechanics: [],
    plants: ['peashooter', 'sunflower', 'wall-nut'],
    zombies: ['basic', 'flag', 'conehead'],
    requires: ['campaign.start'],
    rewards: [],
  },
];
