import type { ProjectileDef } from '@pvz/engine';

export const pvz1Projectiles: ProjectileDef[] = [
  {
    id: 'pea',
    era: 'pvz1',
    motion: 'straight',
    speed: 333,
    damage: 20,
    damageType: 'normal',
    width: 28,
    audio: { hit: 'audio.splat' },
  },
];
