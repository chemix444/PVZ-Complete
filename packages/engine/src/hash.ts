import type { Simulation } from './simulation';

/** FNV-1a over the observable simulation state. Used to prove determinism. */
export function hashSimulation(sim: Simulation): string {
  const parts: (number | string)[] = [sim.tick, sim.phase, sim.sun, ...sim.rng.getState()];
  for (const p of sim.plants) parts.push('p', p.id, p.def.id, p.row, p.col, p.health, p.anim, p.animTick, p.sleeping ? 1 : 0);
  for (const z of sim.zombies) {
    parts.push('z', z.id, z.def.id, z.row, z.x, z.health, z.state, z.speed, z.chillTicks, z.freezeTicks, z.hypnotized ? 1 : 0);
    for (const layer of z.armor) parts.push(layer.health);
  }
  for (const pr of sim.projectiles) parts.push('b', pr.id, pr.row, pr.x);
  for (const pk of sim.pickups) parts.push('s', pk.id, pk.x, pk.y, pk.state, pk.age);
  for (const m of sim.mowers) parts.push('m', m.id, m.x, m.state);
  for (const g of sim.gridItems) parts.push('g', g.id, g.kind, g.row, g.col, g.ticksLeft);
  for (const r of sim.rollers) parts.push('r', r.id, r.x, r.y, r.hits);
  for (const s of sim.seedBank) parts.push('k', s.remaining);
  if (sim.conveyor) for (const c of sim.conveyor.packets) parts.push('c', c.id, c.def.id);
  parts.push('w', sim.waves.spawned, sim.waves.countdown);

  let hash = 0x811c9dc5;
  const text = parts.join('|');
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
