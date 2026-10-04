import type { PlantDef, ProducerSpec, ShooterSpec } from '@pvz/engine';

// Values are PvZ 1 (centisecond timings converted to seconds). See
// COMPATIBILITY.md for what is measured and what is still approximate.

const peashooterAttack: ShooterSpec = {
  type: 'shooter',
  projectile: 'pea',
  interval: 1.5,
  intervalJitter: 0.15,
  fireDelay: 0.35,
  initialDelay: 0,
  spawnOffset: { x: 45, y: 32 },
};

const sunflowerProduction: ProducerSpec = {
  type: 'producer',
  amount: 25,
  firstDelay: [3, 12.5],
  interval: [23.5, 25],
  glowLead: 1,
};

export const pvz1Plants: PlantDef[] = [
  {
    id: 'peashooter',
    name: 'Peashooter',
    era: 'pvz1',
    introducedIn: 'pvz1-day-01',
    cost: 100,
    recharge: 7.5,
    health: 300,
    behaviors: [peashooterAttack],
    tags: ['shooter', 'day'],
    description: 'Fires a pea at the first zombie in its lane, about every one and a half seconds.',
    audio: { fire: 'audio.throw' },
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    era: 'pvz1',
    introducedIn: 'pvz1-day-02',
    cost: 50,
    recharge: 7.5,
    health: 300,
    behaviors: [sunflowerProduction],
    tags: ['producer', 'day'],
    description: 'Produces 25 sun roughly every 24 seconds. The first sun arrives 3 to 12.5 seconds after planting.',
  },
  {
    id: 'wall-nut',
    name: 'Wall-nut',
    era: 'pvz1',
    introducedIn: 'pvz1-day-04',
    cost: 50,
    recharge: 30,
    rechargeAtStart: 20,
    health: 4000,
    behaviors: [],
    damageStages: [2 / 3, 1 / 3],
    tags: ['defensive', 'day'],
    description: 'A hard shell that holds zombies in place while they chew through 4000 health.',
  },
];
