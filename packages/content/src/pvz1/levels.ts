import type { LevelDef, SurfaceType } from '@pvz/engine';

// PvZ 1 Adventure: Day (1-1 to 1-10) and Night (2-1 to 2-10). Lane counts,
// plants, zombie line-ups and rewards follow the original; wave counts, grave
// counts and the exact waves are approximations (see COMPATIBILITY.md).
// Tutorial and advice texts are written for this project.

const ONE_LANE: SurfaceType[] = ['dirt', 'dirt', 'grass', 'dirt', 'dirt'];
const THREE_LANES: SurfaceType[] = ['dirt', 'grass', 'grass', 'grass', 'dirt'];

const choose = { mode: 'choose', slots: 6 } as const;

const dayLevel = {
  era: 'pvz1',
  world: 'pvz1-day',
  name: 'Day',
  board: 'pvz1-day',
  startingSun: 50,
  seedSelection: choose,
  waves: [],
  skySun: true,
  mowers: true,
  music: 'music.day',
  environment: 'day',
  status: 'close',
} as const;

const nightLevel = {
  era: 'pvz1',
  world: 'pvz1-night',
  name: 'Night',
  board: 'pvz1-night',
  startingSun: 50,
  seedSelection: choose,
  waves: [],
  skySun: false,
  mowers: true,
  gravesRiseOnFinalWave: true,
  music: 'music.night',
  environment: 'night',
  status: 'close',
} as const;

const dayZombies = ['basic', 'conehead', 'pole-vaulting', 'buckethead'];
const nightZombies = ['basic', 'conehead', 'pole-vaulting', 'buckethead', 'newspaper', 'screen-door', 'football', 'dancing'];

function generator(waves: number, zombies: readonly string[], introduce?: string) {
  return { waves, zombies, introduce, flagZombie: 'flag' };
}

const day: LevelDef[] = [
  {
    ...dayLevel,
    id: 'pvz1-day-01',
    label: '1-1',
    lanes: ONE_LANE,
    startingSun: 150,
    seedSelection: { mode: 'preset', slots: 1 },
    waves: [{ zombies: ['basic'] }, { zombies: ['basic'] }, { zombies: ['basic', 'basic'] }, { flag: true, zombies: ['flag', 'basic', 'basic'] }],
    scripts: [
      {
        id: 'intro',
        when: { on: 'start' },
        actions: [{ do: 'message', text: 'Click the Peashooter seed packet, then click a spot on the grass to plant it.' }, { do: 'hold-waves' }],
      },
      {
        id: 'planted',
        when: { on: 'planted', count: 1 },
        actions: [{ do: 'message', text: 'Sun pays for plants. Click the falling sun to collect it.' }, { do: 'release-waves', delay: 20 }],
      },
      {
        id: 'collected',
        when: { on: 'sun-collected', count: 1 },
        actions: [{ do: 'message', text: 'Keep collecting sun and plant more Peashooters. Zombies are on the way!', duration: 8 }],
      },
    ],
    rewards: [{ type: 'plant', id: 'sunflower' }],
  },
  {
    ...dayLevel,
    id: 'pvz1-day-02',
    label: '1-2',
    lanes: THREE_LANES,
    waveGenerator: generator(6, ['basic']),
    scripts: [{ id: 'advice', when: { on: 'start' }, actions: [{ do: 'message', text: 'Sunflowers make extra sun. Plant plenty of them early on.', duration: 10 }] }],
    rewards: [{ type: 'plant', id: 'cherry-bomb' }],
  },
  {
    ...dayLevel,
    id: 'pvz1-day-03',
    label: '1-3',
    lanes: THREE_LANES,
    waveGenerator: generator(8, ['basic', 'conehead'], 'conehead'),
    rewards: [{ type: 'plant', id: 'wall-nut' }],
  },
  {
    ...dayLevel,
    id: 'pvz1-day-04',
    label: '1-4',
    waveGenerator: generator(10, ['basic', 'conehead']),
    rewards: [{ type: 'feature', id: 'almanac' }],
  },
  {
    ...dayLevel,
    id: 'pvz1-day-05',
    label: '1-5',
    name: 'Wall-nut Bowling',
    music: 'music.minigame',
    seedSelection: { mode: 'conveyor' },
    conveyor: {
      plants: [
        { plant: 'wall-nut-bowling', weight: 85 },
        { plant: 'explode-o-nut', weight: 15 },
      ],
      interval: 3,
      capacity: 8,
    },
    plantableCols: 3,
    skySun: false,
    shovel: true,
    startingPlants: [
      { plant: 'peashooter', row: 1, col: 4 },
      { plant: 'peashooter', row: 2, col: 6 },
      { plant: 'peashooter', row: 3, col: 3 },
    ],
    waveGenerator: generator(10, ['basic', 'conehead']),
    scripts: [
      {
        id: 'dig',
        when: { on: 'start' },
        actions: [
          { do: 'message', text: 'Here is a shovel. Click it, then click each of the three Peashooters to dig them up.' },
          { do: 'hold-waves' },
          { do: 'stop-conveyor' },
        ],
      },
      {
        id: 'bowl',
        when: { on: 'dug', count: 3 },
        actions: [
          { do: 'message', text: 'Wall-nut Bowling! Place nuts left of the red line and they roll into the zombies.', duration: 10 },
          { do: 'start-conveyor' },
          { do: 'release-waves', delay: 10 },
        ],
      },
    ],
    rewards: [
      { type: 'plant', id: 'potato-mine' },
      { type: 'feature', id: 'shovel' },
    ],
  },
  {
    ...dayLevel,
    id: 'pvz1-day-06',
    label: '1-6',
    waveGenerator: generator(10, ['basic', 'conehead', 'pole-vaulting'], 'pole-vaulting'),
    rewards: [{ type: 'plant', id: 'snow-pea' }],
  },
  {
    ...dayLevel,
    id: 'pvz1-day-07',
    label: '1-7',
    waveGenerator: generator(10, ['basic', 'conehead', 'pole-vaulting']),
    rewards: [{ type: 'plant', id: 'chomper' }],
  },
  {
    ...dayLevel,
    id: 'pvz1-day-08',
    label: '1-8',
    waveGenerator: generator(10, ['basic', 'conehead', 'pole-vaulting']),
    rewards: [{ type: 'plant', id: 'repeater' }],
  },
  {
    ...dayLevel,
    id: 'pvz1-day-09',
    label: '1-9',
    waveGenerator: generator(10, dayZombies, 'buckethead'),
    rewards: [{ type: 'note', id: 'zombie-note-1' }],
  },
  {
    ...dayLevel,
    id: 'pvz1-day-10',
    label: '1-10',
    seedSelection: { mode: 'conveyor' },
    conveyor: {
      plants: [
        { plant: 'peashooter', weight: 10 },
        { plant: 'repeater', weight: 20 },
        { plant: 'snow-pea', weight: 15 },
        { plant: 'wall-nut', weight: 15 },
        { plant: 'potato-mine', weight: 15 },
        { plant: 'cherry-bomb', weight: 10 },
        { plant: 'chomper', weight: 15 },
      ],
      interval: 4.25,
      capacity: 10,
    },
    skySun: false,
    waveGenerator: generator(10, dayZombies),
    scripts: [{ id: 'advice', when: { on: 'start' }, actions: [{ do: 'message', text: 'Conveyor belt! Plants arrive for free. Grab them before the belt fills up.', duration: 10 }] }],
    rewards: [{ type: 'plant', id: 'puff-shroom' }],
  },
];

const night: LevelDef[] = [
  {
    ...nightLevel,
    id: 'pvz1-night-01',
    label: '2-1',
    graves: { count: 3, minCol: 4 },
    waveGenerator: generator(10, ['basic', 'conehead', 'newspaper'], 'newspaper'),
    scripts: [
      {
        id: 'advice',
        when: { on: 'start' },
        actions: [{ do: 'message', text: 'No sun falls at night. Puff-shrooms are free, so start with them.', duration: 10 }],
      },
    ],
    rewards: [{ type: 'plant', id: 'sun-shroom' }],
  },
  {
    ...nightLevel,
    id: 'pvz1-night-02',
    label: '2-2',
    graves: { count: 4, minCol: 4 },
    waveGenerator: generator(10, ['basic', 'conehead', 'pole-vaulting', 'newspaper']),
    rewards: [{ type: 'plant', id: 'fume-shroom' }],
  },
  {
    ...nightLevel,
    id: 'pvz1-night-03',
    label: '2-3',
    graves: { count: 5, minCol: 4 },
    waveGenerator: generator(20, ['basic', 'conehead', 'newspaper', 'screen-door'], 'screen-door'),
    rewards: [{ type: 'plant', id: 'grave-buster' }],
  },
  {
    ...nightLevel,
    id: 'pvz1-night-04',
    label: '2-4',
    graves: { count: 5, minCol: 4 },
    waveGenerator: generator(20, ['basic', 'conehead', 'buckethead', 'newspaper', 'screen-door']),
    rewards: [{ type: 'plant', id: 'hypno-shroom' }],
  },
  {
    ...nightLevel,
    id: 'pvz1-night-05',
    label: '2-5',
    name: 'Whack a Zombie',
    music: 'music.minigame',
    mode: 'whack',
    shovel: false,
    seedSelection: { mode: 'preset', slots: 0 },
    graves: { count: 9, minCol: 3 },
    gravesRiseOnFinalWave: false,
    firstWaveDelay: 8,
    waveGenerator: generator(10, ['basic', 'conehead', 'buckethead']),
    scripts: [{ id: 'advice', when: { on: 'start' }, actions: [{ do: 'message', text: 'Whack a Zombie! Click zombies as they climb out of their graves.', duration: 10 }] }],
    rewards: [{ type: 'plant', id: 'scaredy-shroom' }],
  },
  {
    ...nightLevel,
    id: 'pvz1-night-06',
    label: '2-6',
    graves: { count: 6, minCol: 4 },
    waveGenerator: generator(20, ['basic', 'conehead', 'pole-vaulting', 'newspaper', 'screen-door', 'football'], 'football'),
    rewards: [{ type: 'plant', id: 'ice-shroom' }],
  },
  {
    ...nightLevel,
    id: 'pvz1-night-07',
    label: '2-7',
    graves: { count: 6, minCol: 4 },
    waveGenerator: generator(20, ['basic', 'conehead', 'buckethead', 'newspaper', 'screen-door', 'football']),
    rewards: [{ type: 'plant', id: 'doom-shroom' }],
  },
  {
    ...nightLevel,
    id: 'pvz1-night-08',
    label: '2-8',
    graves: { count: 6, minCol: 4 },
    waveGenerator: generator(20, ['basic', 'conehead', 'newspaper', 'screen-door', 'football', 'dancing'], 'dancing'),
    rewards: [],
  },
  {
    ...nightLevel,
    id: 'pvz1-night-09',
    label: '2-9',
    graves: { count: 7, minCol: 4 },
    waveGenerator: generator(20, nightZombies),
    rewards: [{ type: 'note', id: 'zombie-note-2' }],
  },
  {
    ...nightLevel,
    id: 'pvz1-night-10',
    label: '2-10',
    seedSelection: { mode: 'conveyor' },
    conveyor: {
      plants: [
        { plant: 'puff-shroom', weight: 20 },
        { plant: 'fume-shroom', weight: 20 },
        { plant: 'scaredy-shroom', weight: 10 },
        { plant: 'grave-buster', weight: 10 },
        { plant: 'hypno-shroom', weight: 10 },
        { plant: 'ice-shroom', weight: 10 },
        { plant: 'doom-shroom', weight: 5 },
      ],
      interval: 4.25,
      capacity: 10,
    },
    graves: { count: 6, minCol: 4 },
    waveGenerator: generator(20, nightZombies),
    rewards: [],
  },
];

export const pvz1Levels: LevelDef[] = [...day, ...night];
