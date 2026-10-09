import type { BoardDef } from '@pvz/engine';

// Board coordinates match PvZ 1's 800x600 screen with the camera at rest:
// the grid starts at (40, 80) with 80x100 cells, the house is off the left
// edge and the street extends past the right edge.
const frontLawn = {
  era: 'pvz1',
  rows: 5,
  cols: 9,
  origin: { x: 40, y: 80 },
  tile: { width: 80, height: 100 },
  lanes: ['grass', 'grass', 'grass', 'grass', 'grass'],
  zombieSpawnX: 780,
  zombieSpawnJitter: 40,
  attackLimitX: 800,
  houseX: -60,
  projectileLimitX: 840,
  mower: { x: -15, width: 60, speed: 333 },
  sunCollectTarget: { x: 46, y: 32 },
} as const;

export const pvz1Boards: BoardDef[] = [
  {
    ...frontLawn,
    id: 'pvz1-day',
    name: 'Front Lawn (Day)',
    daytime: true,
    skySun: { minX: 140, maxX: 690, startY: 40, minLandY: 170, maxLandY: 500, fallSpeed: 67 },
    view: { background: 'bg.pvz1.day', minX: -220, maxX: 1180, width: 800, height: 600 },
  },
  {
    ...frontLawn,
    id: 'pvz1-night',
    name: 'Front Lawn (Night)',
    daytime: false,
    view: { background: 'bg.pvz1.night', minX: -220, maxX: 1180, width: 800, height: 600 },
  },
];
