import type { Simulation } from './simulation';

/** FNV-1a over the observable simulation state. Used to prove determinism. */
export function hashSimulation(sim: Simulation): string {
  const parts: (number | string)[] = [sim.tick, sim.phase, sim.sun, ...sim.rng.getState()];
  for (const p of sim.plants) parts.push('p', p.id, p.def.id, p.row, p.col, p.health, p.anim, p.animTick);
  for (const z of sim.zombies) {
    parts.push('z', z.id, z.def.id, z.row, z.x, z.health, z.state, z.speed);
    for (const layer of z.armor) parts.push(layer.health);
  }
  for (const pr of sim.projectiles) parts.push('b', pr.id, pr.row, pr.x);
  for (const pk of sim.pickups) parts.push('s', pk.id, pk.x, pk.y, pk.state, pk.age);
  for (const m of sim.mowers) parts.push('m', m.id, m.x, m.state);
  for (const s of sim.seedBank) parts.push('k', s.remaining);
  parts.push('w', sim.waves.spawned, sim.waves.countdown);

  let hash = 0x811c9dc5;
  const text = parts.join('|');
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
