import { ticks } from '../core/time';
import type { Zombie } from '../entities';
import type { Simulation } from '../simulation';
import type { SimSystem } from './types';

export class PlantSystem implements SimSystem {
  readonly id = 'plants';

  update(sim: Simulation): void {
    for (const plant of sim.plants) {
      if (!plant.alive || plant.sleeping) continue;
      for (const behavior of plant.behaviors) {
        behavior.update(sim, plant);
        if (!plant.alive) break;
      }
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
      if (zombie.freezeTicks > 0) zombie.freezeTicks--;
      if (zombie.chillTicks > 0) zombie.chillTicks--;
      if (zombie.risingTicks > 0) {
        zombie.risingTicks--;
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
      if (zombie.hypnotized && zombie.hitLeft > sim.board.projectileLimitX) sim.removeEntity(zombie);
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
      const travelled = projectile.x - projectile.startX;
      if (projectile.x > limit || (projectile.def.maxDistance !== undefined && travelled > projectile.def.maxDistance)) {
        sim.removeEntity(projectile);
        continue;
      }
      const left = projectile.x;
      const right = projectile.x + projectile.def.width;
      let hit: Zombie | null = null;
      for (const zombie of sim.zombies) {
        if (zombie.row !== projectile.row || !zombie.collidable || zombie.hypnotized) continue;
        if (left >= zombie.hitRight || right <= zombie.hitLeft) continue;
        if (!hit || zombie.x < hit.x) hit = zombie;
      }
      if (!hit) continue;
      const armor = sim.damageZombie(hit, projectile.def.damage, 'projectile');
      // A shield takes the hit for the zombie, chill included.
      if (projectile.def.chill && armor?.spec.kind !== 'shield') sim.chill(hit, ticks(projectile.def.chill));
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

const ROLLER_RADIUS = 30;
/** Vertical speed after a bounce, relative to the horizontal speed. */
const ROLLER_BOUNCE = 1.25;

// Wall-nut Bowling: nuts roll right; each hit sends them off diagonally
// (reversing on later hits) and they bounce off the top and bottom lanes.
export class RollerSystem implements SimSystem {
  readonly id = 'rollers';

  update(sim: Simulation): void {
    const lawn = sim.lawn;
    let first = 0;
    while (first < lawn.rows - 1 && !lawn.isLane(first)) first++;
    let last = lawn.rows - 1;
    while (last > 0 && !lawn.isLane(last)) last--;
    const top = lawn.rowY(first) + sim.board.tile.height / 2;
    const bottom = lawn.rowY(last) + sim.board.tile.height / 2;
    for (const roller of sim.rollers) {
      if (!roller.alive) continue;
      roller.prevX = roller.x;
      roller.prevY = roller.y;
      roller.x += roller.vx;
      roller.y += roller.vy;
      if (roller.y < top) {
        roller.y = 2 * top - roller.y;
        roller.vy = -roller.vy;
      } else if (roller.y > bottom) {
        roller.y = 2 * bottom - roller.y;
        roller.vy = -roller.vy;
      }
      if (roller.x - ROLLER_RADIUS > sim.board.projectileLimitX) {
        sim.removeEntity(roller);
        continue;
      }
      const row = lawn.rowAt(roller.y);
      for (const zombie of sim.zombies) {
        if (zombie.row !== row || !zombie.collidable || zombie.hypnotized || zombie.id === roller.lastHitId) continue;
        if (roller.x - ROLLER_RADIUS >= zombie.hitRight || roller.x + ROLLER_RADIUS <= zombie.hitLeft) continue;
        if (roller.explode) {
          const width = sim.board.tile.width;
          sim.damageArea(roller.x - width * 1.5, roller.x + width * 1.5, row - 1, row + 1, roller.damage, 'explosion');
          sim.emit({ type: 'explosion', effect: 'explode-o-nut', x: roller.x, y: roller.y });
          sim.removeEntity(roller);
          break;
        }
        sim.damageZombie(zombie, roller.damage, 'bowling');
        roller.hits++;
        roller.lastHitId = zombie.id;
        sim.emit({ type: 'roller-hit', rollerId: roller.id, zombieId: zombie.id, hits: roller.hits });
        if (roller.vy === 0) {
          const up = row > first;
          const down = row < last;
          const direction = up && down ? (sim.rng.int(2) === 0 ? -1 : 1) : up ? -1 : 1;
          roller.vy = direction * roller.vx * ROLLER_BOUNCE;
        } else {
          roller.vy = -roller.vy;
        }
        break;
      }
    }
  }
}

export class GridItemSystem implements SimSystem {
  readonly id = 'grid-items';

  update(sim: Simulation): void {
    for (const item of sim.gridItems) {
      if (item.alive && item.ticksLeft > 0 && --item.ticksLeft === 0) sim.removeGridItem(item);
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
          if (zombie.row === mower.row && zombie.hostile && zombie.hitLeft <= mower.x + mower.width) {
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
      if (!zombie.collidable || zombie.hypnotized) continue;
      if (zombie.hostile && zombie.hitLeft < sim.board.houseX) {
        sim.lose(zombie);
        return;
      }
      remaining++;
    }
    if (remaining === 0 && sim.waves.finished) sim.clear();
  }
}
