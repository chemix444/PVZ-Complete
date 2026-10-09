import type { ProjectileDef } from '@pvz/engine';

const pea = {
  era: 'pvz1',
  motion: 'straight',
  speed: 333,
  damage: 20,
  damageType: 'normal',
  width: 28,
} as const;

export const pvz1Projectiles: ProjectileDef[] = [
  { ...pea, id: 'pea', audio: { hit: 'audio.splat' } },
  { ...pea, id: 'snow-pea', chill: 10, audio: { hit: 'audio.frozen-hit' } },
  { ...pea, id: 'spore', width: 16, maxDistance: 280, audio: { hit: 'audio.splat' } },
  { ...pea, id: 'scaredy-spore', width: 16, audio: { hit: 'audio.splat' } },
];
