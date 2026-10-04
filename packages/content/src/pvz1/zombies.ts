import type { EaterSpec, ZombieDef } from '@pvz/engine';

// Zombies bite for 4 damage every 4 ticks (100 damage per second).
const bite: EaterSpec = { type: 'eater', damage: 4, interval: 0.04 };
// The eater runs before the walker so a zombie stops on the tick it reaches a plant.
const walkAndEat = [bite, { type: 'walker' }] as const;

// Hitbox offsets are measured from the zombie's x anchor; the anchor sits
// left of the visible body, as in PvZ 1.
const bodyBox = { left: 36, width: 42 };
const biteBox = { left: 50, width: 20 };

export const pvz1Zombies: ZombieDef[] = [
  {
    id: 'basic',
    name: 'Zombie',
    era: 'pvz1',
    introducedIn: 'pvz1-day-01',
    health: 270,
    loseArmBelow: 180,
    dieBelow: 90,
    dyingDrain: 100,
    speed: [23, 32],
    hitbox: bodyBox,
    attackBox: biteBox,
    behaviors: walkAndEat,
    spawn: { value: 1, weight: 4000 },
    tags: ['walker'],
    description: 'Ten peas knock its head off. Eats plants at 100 damage per second.',
  },
  {
    id: 'flag',
    name: 'Flag Zombie',
    era: 'pvz1',
    introducedIn: 'pvz1-day-01',
    health: 270,
    loseArmBelow: 180,
    dieBelow: 90,
    dyingDrain: 100,
    speed: [45, 45],
    hitbox: bodyBox,
    attackBox: biteBox,
    behaviors: walkAndEat,
    tags: ['walker', 'flag'],
    description: 'Leads every huge wave, walking faster than the zombies behind it.',
  },
  {
    id: 'conehead',
    name: 'Conehead Zombie',
    era: 'pvz1',
    introducedIn: 'pvz1-day-03',
    health: 270,
    loseArmBelow: 180,
    dieBelow: 90,
    dyingDrain: 100,
    speed: [23, 32],
    hitbox: bodyBox,
    attackBox: biteBox,
    armor: [{ id: 'cone', kind: 'helmet', health: 370, material: 'plastic', damageStages: [2 / 3, 1 / 3] }],
    behaviors: walkAndEat,
    spawn: { value: 2, weight: 4000 },
    tags: ['walker', 'armored'],
    description: 'A 370 health traffic cone over a normal zombie: 28 peas in total.',
  },
];
