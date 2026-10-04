import type { EffectDef } from './types';

export const effectDefs: EffectDef[] = [
  {
    id: 'effect.pea-splat',
    particles: 6,
    colors: [0x7bd23c, 0x4f9e1f, 0xb4f07a],
    lifetime: 0.35,
    speed: [60, 160],
    size: [2, 4],
    gravity: 300,
    spread: Math.PI,
  },
  {
    id: 'effect.dirt',
    particles: 10,
    colors: [0x7a5228, 0x5c3b1a, 0x9a6b3a],
    lifetime: 0.5,
    speed: [60, 150],
    size: [2, 5],
    gravity: 500,
    spread: Math.PI * 0.7,
  },
  {
    id: 'effect.plastic-chip',
    particles: 5,
    colors: [0xf28a1c, 0xffb24d],
    lifetime: 0.4,
    speed: [80, 180],
    size: [2, 4],
    gravity: 500,
    spread: Math.PI,
  },
];
