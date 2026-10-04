import type { LevelDef } from '@pvz/engine';

// Milestone 1 slice. It occupies the 1-1 campaign slot so completion is
// recorded in the real campaign, but its content is not yet the original
// 1-1 (single sod lane, Peashooter only, tutorial prompts). Milestone 2
// replaces it with the faithful level; see COMPATIBILITY.md.
const day01: LevelDef = {
  id: 'pvz1-day-01',
  era: 'pvz1',
  world: 'pvz1-day',
  name: 'Day',
  label: '1-1',
  board: 'pvz1-day',
  startingSun: 50,
  seedSelection: { mode: 'choose', slots: 6, offered: ['sunflower', 'wall-nut'] },
  firstWaveDelay: 18,
  skySun: true,
  mowers: true,
  music: 'music.day',
  environment: 'day',
  rewards: [{ type: 'plant', id: 'sunflower' }],
  status: 'incomplete',
  waves: [
    { zombies: ['basic'] },
    { zombies: ['basic'] },
    { zombies: ['basic'] },
    { zombies: ['basic', 'basic'] },
    { zombies: ['conehead'] },
    { zombies: ['basic', 'basic'] },
    { zombies: ['basic', 'conehead'] },
    { zombies: ['basic', 'basic'] },
    { zombies: ['basic', 'conehead'] },
    { flag: true, zombies: ['flag', 'basic', 'basic', 'conehead'] },
  ],
};

export const pvz1Levels: LevelDef[] = [day01];
