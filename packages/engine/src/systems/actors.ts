import type { Zombie } from '../entities';
import type { Simulation } from '../simulation';
import type { SimSystem } from './types';

export class PlantSystem implements SimSystem {
  readonly id = 'plants';

  update(sim: Simulation): void {
    for (const plant of sim.plants) {
      if (!plant.alive) continue;
      for (const behavior of plant.behaviors) behavior.update(sim, plant);
    }
  }
}

export class ZombieSystem implements SimSystem {
  readonly id = 'zombies';

  update(sim: Simulation): void {
    for (const zombie of sim.zombies) {
      if (!zombie.alive) continue;
      zombie.prevX = zombie.x;
      if (zombie.state === 'dead') {
        if (--zombie.deadTicks <= 0) sim.removeEntity(zombie);
        continue;
      }
      if (zombie.state === 'dying') {
        zombie.health -= zombie.def.dyingDrain / 100;
        if (zombie.health <= 0) {
          sim.killZombie(zombie, 'damage');
          continue;
        }
      }
      for (const behavior of zombie.behaviors) behavior.update(sim, zombie);
    }
  }
}

export class ProjectileSystem implements SimSystem {
  readonly id = 'projectiles';

  update(sim: Simulation): void {
    const limit = sim.board.projectileLimitX;
    for (const projectile of sim.projectiles) {
      if (!projectile.alive) continue;
      projectile.prevX = projectile.x;
      projectile.x += projectile.vx;
      if (projectile.x > limit) {
        sim.removeEntity(projectile);
        continue;
      }
      const left = projectile.x;
      const right = projectile.x + projectile.def.width;
      let hit: Zombie | null = null;
      for (const zombie of sim.zombies) {
        if (zombie.row !== projectile.row || !zombie.collidable) continue;
        if (left >= zombie.hitRight || right <= zombie.hitLeft) continue;
        if (!hit || zombie.x < hit.x) hit = zombie;
      }
      if (!hit) continue;
      const armor = sim.damageZombie(hit, projectile.def.damage);
      sim.emit({
        type: 'projectile-hit',
        projectileId: projectile.id,
        def: projectile.def.id,
        zombieId: hit.id,
        x: projectile.x,
        y: projectile.y,
        armorMaterial: armor ? armor.spec.material : null,
      });
      sim.removeEntity(projectile);
    }
  }
}

const SUN_COLLECT_RATE = 0.09;
const SUN_COLLECT_DONE = 8;
const TOSS_GRAVITY = 0.09;

export class PickupSystem implements SimSystem {
  readonly id = 'pickups';

  update(sim: Simulation): void {
    const target = sim.board.sunCollectTarget;
    for (const pickup of sim.pickups) {
      if (!pickup.alive) continue;
      pickup.prevX = pickup.x;
      pickup.prevY = pickup.y;
      switch (pickup.state) {
        case 'falling':
          if (pickup.motion === 'sky') {
            pickup.y += pickup.vy;
            if (pickup.y >= pickup.landY) {
              pickup.y = pickup.landY;
              pickup.state = 'resting';
            }
          } else {
            pickup.vy += TOSS_GRAVITY;
            pickup.x += pickup.vx;
            pickup.y += pickup.vy;
            if (pickup.vy > 0 && pickup.y >= pickup.landY) {
              pickup.y = pickup.landY;
              pickup.state = 'resting';
            }
          }
          break;
        case 'resting':
          if (pickup.lifetime > 0 && ++pickup.age >= pickup.lifetime) {
            sim.emit({ type: 'pickup-expired', pickupId: pickup.id });
            sim.removeEntity(pickup);
          }
          break;
        case 'collecting': {
          if (pickup.kind !== 'sun') break;
          const dx = target.x - pickup.x;
          const dy = target.y - pickup.y;
          if (dx * dx + dy * dy <= SUN_COLLECT_DONE * SUN_COLLECT_DONE) {
            sim.addSun(pickup.value);
            sim.emit({ type: 'sun-credited', amount: pickup.value });
            sim.removeEntity(pickup);
          } else {
            pickup.x += dx * SUN_COLLECT_RATE;
            pickup.y += dy * SUN_COLLECT_RATE;
          }
          break;
        }
      }
    }
  }
}

export class MowerSystem implements SimSystem {
  readonly id = 'mowers';

  update(sim: Simulation): void {
    for (const mower of sim.mowers) {
      if (mower.state === 'gone') continue;
      mower.prevX = mower.x;
      if (mower.state === 'idle') {
        for (const zombie of sim.zombies) {
          if (zombie.row === mower.row && zombie.active && zombie.hitLeft <= mower.x + mower.width) {
            mower.state = 'running';
            sim.emit({ type: 'mower-started', mowerId: mower.id, row: mower.row });
            break;
          }
        }
      }
      if (mower.state !== 'running') continue;
      mower.x += mower.speed;
      for (const zombie of sim.zombies) {
        if (zombie.row !== mower.row || !zombie.collidable) continue;
        if (zombie.hitLeft < mower.x + mower.width && zombie.hitRight > mower.x) sim.killZombie(zombie, 'mower');
      }
      if (mower.x > sim.board.projectileLimitX + mower.width) {
        mower.state = 'gone';
        sim.removeEntity(mower);
      }
    }
  }
}

export class OutcomeSystem implements SimSystem {
  readonly id = 'outcome';

  update(sim: Simulation): void {
    if (sim.phase !== 'playing') return;
    let remaining = 0;
    for (const zombie of sim.zombies) {
      if (!zombie.collidable) continue;
      if (zombie.active && zombie.hitLeft < sim.board.houseX) {
        sim.lose(zombie);
        return;
      }
      remaining++;
    }
    if (remaining === 0 && sim.waves.finished) sim.clear();
  }
}
