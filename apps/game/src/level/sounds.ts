import type { AudioEngine } from '@pvz/audio';
import { AudioRegistry, ProjectileRegistry } from '@pvz/content';
import { Plant, Zombie, type SimEvent, type Simulation } from '@pvz/engine';

const EXPLOSION_SOUNDS: Record<string, string> = {
  cherry: 'audio.explosion',
  'explode-o-nut': 'audio.explosion',
  potato: 'audio.potato-mine',
  doom: 'audio.doom',
};

const CHOMP_INTERVAL = 0.42;

/** Maps simulation events (and ongoing states like eating) to sound ids. */
export class LevelSounds {
  private nextGroan = 6 + Math.random() * 6;
  private readonly chompAt = new Map<number, number>();
  private lastSummonTick = -1;

  constructor(private readonly audio: AudioEngine) {}

  handle(event: SimEvent, sim: Simulation): void {
    const play = (id: string | undefined) => id && this.audio.play(id);
    switch (event.type) {
      case 'plant-placed': {
        const plant = sim.entity(event.plantId);
        if (plant instanceof Plant && plant.def.tags.includes('bowling')) play('audio.bowling');
        else if (plant instanceof Plant && plant.def.placeOn === 'grave') play('audio.grave-buster');
        else play('audio.plant');
        break;
      }
      case 'plant-rejected':
        play('audio.buzzer');
        break;
      case 'projectile-fired': {
        const owner = sim.entity(event.plantId);
        play(owner instanceof Plant ? owner.def.audio?.fire : undefined);
        break;
      }
      case 'projectile-hit':
        if (event.armorMaterial && AudioRegistry.has(`audio.${event.armorMaterial}-hit`)) play(`audio.${event.armorMaterial}-hit`);
        else play(ProjectileRegistry.find(event.def)?.audio?.hit);
        break;
      case 'plant-removed':
        if (event.cause === 'eaten') play('audio.gulp');
        if (event.cause === 'dug') play('audio.shovel');
        break;
      case 'zombie-arm-lost':
      case 'zombie-head-lost':
        play('audio.limbs-pop');
        break;
      case 'zombie-died':
        if (event.cause === 'damage') play('audio.zombie-fall');
        this.chompAt.delete(event.zombieId);
        break;
      case 'mower-started':
        play('audio.lawnmower');
        break;
      case 'wave-spawned':
        if (event.wave === 1) play('audio.awooga');
        break;
      case 'huge-wave-warning':
        play('audio.siren');
        break;
      case 'final-wave':
        play('audio.final-wave');
        break;
      case 'pickup-collected':
        play(event.kind === 'sun' ? 'audio.points' : undefined);
        break;
      case 'level-cleared':
        play('audio.reward');
        break;
      case 'explosion':
        play(EXPLOSION_SOUNDS[event.effect] ?? 'audio.explosion');
        break;
      case 'zombies-frozen':
        play('audio.frozen');
        break;
      case 'fume':
        play('audio.fume');
        break;
      case 'chomper-bite':
        if (event.zombieId !== null) play('audio.chomper-bite');
        break;
      case 'zombie-hypnotized':
        play('audio.hypno');
        break;
      case 'zombie-vaulted':
        play('audio.vault');
        break;
      case 'zombie-enraged':
        play('audio.rage');
        break;
      case 'backup-summoned':
        if (this.lastSummonTick !== sim.tick) play('audio.dancer');
        this.lastSummonTick = sim.tick;
        break;
      case 'zombie-spawned': {
        const zombie = sim.entity(event.zombieId);
        if (zombie instanceof Zombie && zombie.risingTicks > 0) play('audio.dirt-rise');
        break;
      }
      case 'mine-armed':
        play('audio.plant');
        break;
      case 'roller-hit':
        play('audio.bowling-impact');
        break;
      case 'whack':
        play('audio.whack');
        break;
    }
  }

  /** Continuous sounds: chewing while zombies eat, occasional groans. */
  update(sim: Simulation, dt: number, now: number): void {
    let onLawn = 0;
    for (const zombie of sim.zombies) {
      if (!zombie.active) continue;
      onLawn++;
      if (zombie.state !== 'eating') {
        this.chompAt.delete(zombie.id);
        continue;
      }
      const at = this.chompAt.get(zombie.id) ?? now;
      if (now >= at) {
        this.audio.play('audio.chomp');
        this.chompAt.set(zombie.id, now + CHOMP_INTERVAL);
      }
    }
    this.nextGroan -= dt;
    if (this.nextGroan <= 0) {
      this.nextGroan = 5 + Math.random() * 7;
      if (onLawn > 0) this.audio.play('audio.groan');
    }
  }
}
