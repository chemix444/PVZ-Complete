import type { DancerSpec, DanceStepSpec, EaterSpec, PoleVaultSpec, RageSpec, ZombieDef } from '@pvz/engine';

// Zombies bite for 4 damage every 4 cs (100 damage per second). The eater
// runs before the walker so a zombie stops on the tick it reaches a plant.
const bite: EaterSpec = { type: 'eater', damage: 4, interval: 0.04 };
const walk = { type: 'walker' } as const;

// Hitbox offsets are measured from the zombie's x anchor; the anchor sits
// left of the visible body, as in PvZ 1.
const bodyBox = { left: 36, width: 42 };
const biteBox = { left: 50, width: 20 };

// PvZ 1 zombies lose an arm below 2/3 of body health and their head below 1/3.
function body(health: number) {
  return { health, loseArmBelow: (health * 2) / 3, dieBelow: health / 3, dyingDrain: 100 };
}

const walker = {
  era: 'pvz1',
  ...body(270),
  speed: [23, 32],
  hitbox: bodyBox,
  attackBox: biteBox,
} as const;

const danceStep: DanceStepSpec = { type: 'dance-step', walk: 1.2, pause: 0.8 };

export const pvz1Zombies: ZombieDef[] = [
  {
    ...walker,
    id: 'basic',
    name: 'Zombie',
    introducedIn: 'pvz1-day-01',
    behaviors: [bite, walk],
    spawn: { value: 1, weight: 4000 },
    tags: ['walker'],
    description: 'Ten peas knock its head off. Eats plants at 100 damage per second.',
  },
  {
    ...walker,
    id: 'flag',
    name: 'Flag Zombie',
    introducedIn: 'pvz1-day-01',
    speed: [45, 45],
    behaviors: [bite, walk],
    tags: ['walker', 'flag'],
    description: 'Leads every huge wave, walking faster than the zombies behind it.',
  },
  {
    ...walker,
    id: 'conehead',
    name: 'Conehead Zombie',
    introducedIn: 'pvz1-day-03',
    armor: [{ id: 'cone', kind: 'helmet', health: 370, material: 'plastic', damageStages: [2 / 3, 1 / 3] }],
    behaviors: [bite, walk],
    spawn: { value: 2, weight: 4000 },
    tags: ['walker', 'armored'],
    description: 'A 370 health traffic cone over a normal zombie: 28 peas in total.',
  },
  {
    ...walker,
    ...body(500),
    id: 'pole-vaulting',
    name: 'Pole Vaulting Zombie',
    introducedIn: 'pvz1-day-06',
    behaviors: [{ type: 'pole-vault', runSpeed: [66, 68], vaultTime: 0.9 } satisfies PoleVaultSpec, bite, walk],
    spawn: { value: 2, weight: 2000 },
    tags: ['runner'],
    description: 'Sprints in and vaults over the first plant it reaches, then walks on at normal speed.',
  },
  {
    ...walker,
    id: 'buckethead',
    name: 'Buckethead Zombie',
    introducedIn: 'pvz1-day-09',
    armor: [{ id: 'bucket', kind: 'helmet', health: 1100, material: 'metal', damageStages: [2 / 3, 1 / 3] }],
    behaviors: [bite, walk],
    spawn: { value: 4, weight: 3000 },
    tags: ['walker', 'armored'],
    description: 'A 1100 health metal bucket over a normal zombie: 65 peas in total.',
  },
  {
    ...walker,
    id: 'newspaper',
    name: 'Newspaper Zombie',
    introducedIn: 'pvz1-night-01',
    armor: [{ id: 'newspaper', kind: 'shield', health: 150, material: 'paper', damageStages: [2 / 3, 1 / 3] }],
    behaviors: [{ type: 'rage', armor: 'newspaper', shock: 1.5, speed: [89, 91] } satisfies RageSpec, bite, walk],
    spawn: { value: 2, weight: 1000 },
    tags: ['walker', 'shielded'],
    description: 'Hides behind a newspaper. Destroy the paper and it charges at triple speed.',
  },
  {
    ...walker,
    id: 'screen-door',
    name: 'Screen Door Zombie',
    introducedIn: 'pvz1-night-03',
    armor: [{ id: 'screen-door', kind: 'shield', health: 1100, material: 'metal', damageStages: [2 / 3, 1 / 3] }],
    behaviors: [bite, walk],
    spawn: { value: 4, weight: 3500 },
    tags: ['walker', 'shielded'],
    description: 'Its screen door stops peas and spores from the front. Fumes and lobbed shots get around it.',
  },
  {
    ...walker,
    id: 'football',
    name: 'Football Zombie',
    introducedIn: 'pvz1-night-06',
    speed: [66, 68],
    armor: [{ id: 'football-helmet', kind: 'helmet', health: 1400, material: 'metal', damageStages: [2 / 3, 1 / 3] }],
    behaviors: [bite, walk],
    spawn: { value: 7, weight: 2000 },
    tags: ['runner', 'armored'],
    description: 'Fast and heavily armored by its 1400 health helmet.',
  },
  {
    ...walker,
    ...body(500),
    id: 'dancing',
    name: 'Dancing Zombie',
    introducedIn: 'pvz1-night-08',
    speed: [45, 45],
    behaviors: [
      {
        type: 'dancer',
        backup: 'backup-dancer',
        moonwalkSpeed: 55,
        stopX: 640,
        summonTime: 1,
        resummonEvery: 10,
      } satisfies DancerSpec,
      danceStep,
      bite,
      walk,
    ],
    spawn: { value: 5, weight: 1000 },
    tags: ['summoner'],
    description: 'Moonwalks onto the lawn and calls up four backup dancers around itself.',
  },
  {
    ...walker,
    id: 'backup-dancer',
    name: 'Backup Dancer',
    introducedIn: 'pvz1-night-08',
    speed: [45, 45],
    behaviors: [danceStep, bite, walk],
    tags: ['summoned'],
    description: 'Rises from the ground to dance alongside a Dancing Zombie.',
  },
];
