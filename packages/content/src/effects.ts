import type { EffectDef } from './types';

const burst = (id: string, particles: number, colors: number[], lifetime: number, speed: [number, number], size: [number, number], gravity = 200) => ({
  id,
  particles,
  colors,
  lifetime,
  speed,
  size,
  gravity,
  spread: Math.PI,
});

export const effectDefs: EffectDef[] = [
  burst('effect.explosion', 40, [0xff3b1f, 0xff8a1f, 0xffd23f, 0xfff3b0], 0.7, [120, 420], [4, 10], 120),
  burst('effect.smoke', 18, [0x5a5a5a, 0x7a7a7a, 0x3a3a3a], 1.2, [30, 110], [8, 16], -40),
  burst('effect.ash', 14, [0x1a1a1a, 0x3a3a3a, 0x55504a], 0.9, [20, 80], [2, 5], 300),
  burst('effect.doom', 70, [0x2a0a3a, 0x5a1a7a, 0x9a4ac0, 0x111111], 1.4, [150, 520], [6, 16], 60),
  burst('effect.ice', 30, [0xe8f8ff, 0xa8dcff, 0x7ac0f0], 0.9, [60, 260], [2, 6], 60),
  burst('effect.fume', 4, [0xb47cd8, 0x9a5ac0, 0xd6b0f0], 0.5, [10, 40], [8, 14], -20),
  burst('effect.paper', 8, [0xf4f1e6, 0xd8d4c4], 0.6, [60, 160], [2, 5], 400),
  burst('effect.metal', 6, [0xc8ccd0, 0x8a9096, 0xffffff], 0.35, [100, 220], [1.5, 3], 500),
  burst('effect.spore-splat', 5, [0xb47cd8, 0x8a4ab0], 0.3, [50, 140], [2, 4], 300),
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
