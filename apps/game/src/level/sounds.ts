import type { AudioEngine } from '@pvz/audio';
import { AudioRegistry, ProjectileRegistry } from '@pvz/content';
import { Plant, type SimEvent, type Simulation } from '@pvz/engine';

const CHOMP_INTERVAL = 0.42;

/** Maps simulation events (and ongoing states like eating) to sound ids. */
export class LevelSounds {
  private nextGroan = 6 + Math.random() * 6;
  private readonly chompAt = new Map<number, number>();

  constructor(private readonly audio: AudioEngine) {}

  handle(event: SimEvent, sim: Simulation): void {
    const play = (id: string | undefined) => id && this.audio.play(id);
    switch (event.type) {
      case 'plant-placed':
        play('audio.plant');
        break;
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
        if (event.cause === 'dug') play('audio.plant');
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
