import { ColorMatrixFilter, Container, Graphics, Text } from 'pixi.js';
import {
  craterArt,
  graveArt,
  lawnMowerArt,
  moneyBagArt,
  peaArt,
  plantArt,
  snowPeaArt,
  sporeArt,
  sunArt,
  zombieArtFor,
  type AssetLibrary,
  type PlantArt,
  type SunArt,
  type ZombieArt,
} from '@pvz/assets';
import { PlantRegistry } from '@pvz/content';
import {
  ChomperBehavior,
  ExplodeBehavior,
  FreezeAllBehavior,
  FumeBehavior,
  GraveBusterBehavior,
  MineBehavior,
  ProducerBehavior,
  RageBehavior,
  ShooterBehavior,
  ZOMBIE_RISE_TICKS,
  type GridItem,
  type LawnMower,
  type Pickup,
  type Plant,
  type Projectile,
  type Roller,
  type Simulation,
  type Zombie,
} from '@pvz/engine';
import { ClipVisual } from './clip';
import { SeedPacketView } from './packet';

// Draw order inside the entity layer: by row, then by kind within a row.
export const Z_PLANT = 10;
export const Z_MOWER = 40;
export const Z_ZOMBIE = 50;
export const Z_PROJECTILE = 80;

const hitFlash = new ColorMatrixFilter();
hitFlash.brightness(1.7, false);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class PlantView {
  readonly root = new Container();
  private readonly art: PlantArt | null = null;
  private readonly clip: ClipVisual | null = null;
  private readonly phase = Math.random() * Math.PI * 2;
  private readonly bornAt: number;
  private readonly zzz: Text | null = null;

  constructor(plant: Plant, assets: AssetLibrary, now: number) {
    this.bornAt = now;
    this.root.position.set(plant.x, plant.y);
    this.root.zIndex = plant.row * 100 + Z_PLANT;
    const prefix = `plant.${plant.def.id}`;
    if (ClipVisual.available(assets, prefix, ['idle'])) {
      this.clip = new ClipVisual(assets, prefix, ['idle']);
      this.root.addChild(this.clip.root);
      return;
    }
    this.art = plantArt(plant.def.id, plant.def.name);
    this.root.addChild(this.art.root);
    if (plant.def.nocturnal) {
      this.zzz = new Text({ text: 'z', style: { fontFamily: 'Trebuchet MS', fontSize: 16, fontWeight: 'bold', fill: 0xe8e8ff, stroke: { color: 0x202040, width: 3 } } });
      this.zzz.position.set(52, 30);
      this.root.addChild(this.zzz);
    }
  }

  update(plant: Plant, sim: Simulation, alpha: number, now: number): void {
    const pop = Math.min(1, (now - this.bornAt) / 0.18);
    this.root.scale.set(0.8 + 0.2 * (1 - (1 - pop) ** 3));
    const sinceAnim = (sim.tick + alpha - plant.animTick) / 100;
    if (this.clip) {
      this.clip.show(plant.anim, plant.anim === 'idle' ? now : sinceAnim);
      return;
    }
    const art = this.art!;
    const parts = art.parts ?? {};
    const head = art.head;
    head.rotation = plant.sleeping ? Math.sin(now * 1.2 + this.phase) * 0.02 : Math.sin(now * 2.2 + this.phase) * 0.04;
    head.scale.set(1);
    head.position.set(head.pivot.x, head.pivot.y);

    if (parts.eyes) parts.eyes.visible = !plant.sleeping;
    if (parts.sleepEyes) parts.sleepEyes.visible = plant.sleeping;
    if (this.zzz) {
      this.zzz.visible = plant.sleeping;
      const cycle = (now * 0.6 + this.phase) % 1;
      this.zzz.position.set(52 + cycle * 10, 34 - cycle * 24);
      this.zzz.alpha = 1 - cycle;
      this.zzz.text = cycle < 0.5 ? 'z' : 'Z';
    }

    for (const behavior of plant.behaviors) {
      if (behavior instanceof ShooterBehavior) this.animateShooter(behavior, plant, head, sinceAnim);
      else if (behavior instanceof MineBehavior) {
        const armed = behavior.armed;
        if (parts.armed) parts.armed.visible = armed;
        if (parts.unarmed) parts.unarmed.visible = !armed;
        if (parts.light) parts.light.alpha = armed && Math.floor(now * 3) % 2 === 0 ? 1 : 0.35;
        if (armed && plant.anim === 'armed' && sinceAnim < 0.3) head.scale.set(1, 0.5 + (sinceAnim / 0.3) * 0.5);
      } else if (behavior instanceof ChomperBehavior) {
        const jaw = parts.jaw;
        if (!jaw) continue;
        if (behavior.state === 'biting') jaw.rotation = Math.min(0.55, sinceAnim * 1.2);
        else if (behavior.state === 'chewing') {
          jaw.rotation = 0.04 + Math.abs(Math.sin(now * 5)) * 0.06;
          head.scale.set(1 + Math.sin(now * 5) * 0.04);
        } else jaw.rotation = 0.08 + Math.sin(now * 2 + this.phase) * 0.05;
      } else if (behavior instanceof ExplodeBehavior || behavior instanceof FreezeAllBehavior) {
        const swell = 1 + Math.min(1, sinceAnim / 1.2) * 0.35;
        head.scale.set(swell);
        head.position.x += Math.sin(now * 60) * sinceAnim * 2;
      } else if (behavior instanceof ProducerBehavior && behavior.growIn !== -1) {
        head.scale.set(0.6);
      } else if (behavior instanceof GraveBusterBehavior) {
        head.position.y += Math.abs(Math.sin(now * 14)) * 3;
        head.rotation = Math.sin(now * 14) * 0.08;
      } else if (behavior instanceof FumeBehavior && plant.anim === 'attack') {
        const p = sinceAnim / 0.5;
        if (p < 1) head.scale.set(1 + 0.08 * p, 1 - 0.06 * p);
        else if (p < 1.4) head.scale.set(1 - 0.08 * (1.4 - p), 1);
      }
    }
    if (art.glow) {
      art.glow.visible = plant.anim === 'glow';
      art.glow.alpha = 0.6 + 0.4 * Math.sin(now * 12);
    }
    if (art.damage && plant.def.damageStages) {
      const fraction = plant.health / plant.maxHealth;
      art.damage.forEach((g, i) => (g.visible = fraction < plant.def.damageStages![i]));
    }
  }

  private animateShooter(shooter: ShooterBehavior, plant: Plant, head: Container, sinceAnim: number): void {
    if (shooter.hiding) {
      head.scale.set(1.1, 0.45);
      return;
    }
    if (plant.anim !== 'attack') return;
    const p = (sinceAnim * 100) / shooter.fireDelay;
    if (p < 1) {
      head.position.x -= 5 * p;
      head.scale.set(1 - 0.08 * p, 1 + 0.06 * p);
    } else if (p < 1.4) {
      const q = 1 - (p - 1) / 0.4;
      head.position.x += 4 * q;
      head.scale.set(1 + 0.08 * q, 1 - 0.05 * q);
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

export class ZombieView {
  readonly root = new Container();
  private readonly art: ZombieArt | null = null;
  private readonly clip: ClipVisual | null = null;
  private readonly ground = new Graphics();
  private flashUntil = 0;

  constructor(zombie: Zombie, assets: AssetLibrary) {
    const prefix = `zombie.${zombie.def.id}`;
    if (ClipVisual.available(assets, prefix, ['walk', 'idle'])) {
      this.clip = new ClipVisual(assets, prefix, ['walk', 'idle']);
      this.root.addChild(this.clip.root);
    } else {
      this.art = zombieArtFor(zombie.def.id);
      this.root.addChild(this.art.root);
    }
    // Clips the zombie at ground level while it climbs out of the earth.
    this.ground.rect(-60, -200, 240, 300).fill(0xffffff);
  }

  flash(now: number): void {
    this.flashUntil = now + 0.08;
  }

  update(zombie: Zombie, sim: Simulation, alpha: number, now: number): void {
    const x = lerp(zombie.prevX, zombie.x, alpha);
    this.root.position.set(x, zombie.y);
    this.root.zIndex = zombie.row * 100 + Z_ZOMBIE;
    this.root.filters = now < this.flashUntil ? [hitFlash] : null;
    this.root.tint = zombie.freezeTicks > 0 ? 0xbfe6ff : zombie.chillTicks > 0 ? 0x8fc4ff : zombie.hypnotized ? 0xe0a0ff : 0xffffff;
    const rising = zombie.risingTicks > 0;
    if (rising && !this.root.mask) {
      this.root.addChild(this.ground);
      this.root.mask = this.ground;
    } else if (!rising && this.root.mask) {
      this.root.mask = null;
      this.ground.removeFromParent();
    }
    const sinceAnim = (sim.tick + alpha - zombie.animTick) / 100;
    if (this.clip) {
      this.clip.show(zombie.anim, zombie.anim === 'walk' ? now : sinceAnim);
      this.root.alpha = zombie.state === 'dead' ? Math.max(0, 1 - sinceAnim / 1.5) : 1;
      return;
    }
    const art = this.art!;
    const body = art.body;
    art.head.visible = !zombie.headLost;
    art.armFront.visible = !zombie.armLost;
    art.head.tint = 0xffffff;
    for (const layer of zombie.armor) {
      const stages = art.armor[layer.spec.id];
      if (!stages) continue;
      art.armorRoot[layer.spec.id].visible = layer.health > 0;
      const fraction = layer.health / layer.spec.health;
      const stage = (layer.spec.damageStages ?? []).filter((s) => fraction < s).length;
      stages.forEach((c, i) => (c.visible = i === Math.min(stage, stages.length - 1)));
    }
    if (art.pole) art.pole.visible = zombie.anim === 'run' || zombie.anim === 'vault';

    body.rotation = 0;
    body.scale.set(1);
    body.position.set(body.pivot.x, body.pivot.y);
    art.root.scale.x = 1;
    art.root.x = 0;
    this.root.alpha = 1;
    // Hypnotized zombies and moonwalkers face right.
    if (zombie.hypnotized || zombie.anim === 'moonwalk') {
      art.root.scale.x = -1;
      art.root.x = (zombie.def.hitbox.left + zombie.def.hitbox.width / 2) * 2;
    }
    if (rising) body.position.y += 100 * (zombie.risingTicks / ZOMBIE_RISE_TICKS) - Math.sin(now * 30) * 1.5;
    const frozen = zombie.freezeTicks > 0;
    const clock = frozen ? 0 : now;

    switch (zombie.state) {
      case 'walking':
      case 'dying': {
        if (rising) {
          art.armFront.rotation = -1.4 + Math.sin(clock * 8) * 0.2;
          art.armBack.rotation = -1.2;
          break;
        }
        if (zombie.anim === 'vault') {
          const t = Math.min(1, sinceAnim / 0.9);
          body.position.y -= Math.sin(Math.PI * t) * 70;
          body.rotation = -0.4 * Math.sin(Math.PI * t);
          if (art.pole) art.pole.rotation = -1.2 * t;
          break;
        }
        if (zombie.anim === 'summon') {
          art.armFront.rotation = -2.4;
          art.armBack.rotation = -2.2;
          body.position.y -= Math.abs(Math.sin(clock * 6)) * 3;
          break;
        }
        if (zombie.anim === 'shock') {
          art.head.position.x = art.head.pivot.x + Math.sin(clock * 50) * 2;
          art.armFront.rotation = -1.6;
          break;
        }
        const running = zombie.anim === 'run' || zombie.anim === 'moonwalk';
        const phase = (zombie.hypnotized ? -x : x) * (running ? 0.07 : 0.11) + (zombie.anim === 'moonwalk' ? clock * 6 : 0);
        const swing = Math.sin(phase);
        const stride = running ? 0.55 : 0.35;
        art.legFront.rotation = swing * stride;
        art.legBack.rotation = -swing * stride;
        body.position.y -= Math.abs(Math.cos(phase)) * (running ? 4 : 2);
        if (zombie.anim === 'run') body.rotation = -0.12;
        art.armFront.rotation = -0.1 + swing * 0.12;
        art.armBack.rotation = -0.1 - swing * 0.12;
        art.head.rotation = Math.sin(phase * 0.5) * 0.06;
        if (zombie.locked && zombie.anim === 'walk') {
          // Dance pause: arms up, hips sway.
          art.armFront.rotation = -2 + Math.sin(clock * 8) * 0.3;
          art.armBack.rotation = -2 - Math.sin(clock * 8) * 0.3;
          body.rotation = Math.sin(clock * 8) * 0.06;
        }
        if (zombie.state === 'dying') body.rotation = -0.08 + Math.sin(phase * 0.5) * 0.08;
        break;
      }
      case 'eating': {
        const chew = Math.sin(clock * 15);
        art.legFront.rotation = 0.1;
        art.legBack.rotation = -0.1;
        art.head.rotation = 0.1 + chew * 0.12;
        art.armFront.rotation = -0.35 + chew * 0.2;
        art.armBack.rotation = -0.3 - chew * 0.2;
        body.rotation = -0.05;
        break;
      }
      case 'dead': {
        if (zombie.deathCause === 'chomp') {
          this.root.alpha = 0;
        } else if (zombie.deathCause === 'mower') {
          body.scale.set(1 + sinceAnim * 1.5, Math.max(0.1, 1 - sinceAnim * 2.5));
          this.root.alpha = Math.max(0, 1 - sinceAnim / 0.6);
        } else if (zombie.deathCause === 'explosion') {
          this.root.tint = 0x2a2a2a;
          art.head.visible = true;
          body.scale.set(1, Math.max(0.05, 1 - Math.max(0, sinceAnim - 0.5) * 1.6));
          this.root.alpha = Math.max(0, 1 - Math.max(0, sinceAnim - 0.6) / 0.6);
        } else {
          const fall = Math.min(1, sinceAnim / 0.7);
          body.rotation = fall * fall * 1.45;
          art.legFront.rotation = art.legBack.rotation = 0;
          this.root.alpha = sinceAnim > 1 ? Math.max(0, 1 - (sinceAnim - 1) / 0.5) : 1;
        }
        break;
      }
    }
    for (const behavior of zombie.behaviors) {
      if (behavior instanceof RageBehavior && behavior.phase === 'angry') art.head.tint = 0xff8a7a;
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

export class RollerView {
  readonly root = new Container();
  private readonly art: PlantArt;

  constructor(roller: Roller) {
    this.art = plantArt(roller.def.id, roller.def.name);
    // Wall-nut art is centered near (40, 58) in cell space.
    this.art.root.pivot.set(40, 58);
    this.root.addChild(this.art.root);
  }

  update(roller: Roller, alpha: number): void {
    const x = lerp(roller.prevX, roller.x, alpha);
    const y = lerp(roller.prevY, roller.y, alpha);
    this.root.position.set(x, y);
    this.root.zIndex = Math.floor((y - 80) / 100) * 100 + Z_PROJECTILE;
    this.art.root.rotation = x / 30;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

export class GridItemView {
  readonly root = new Container();

  constructor(item: GridItem, x: number, y: number) {
    this.root.addChild(item.kind === 'grave' ? graveArt(item.variant) : craterArt());
    this.root.position.set(x, y);
    this.root.zIndex = item.row * 100 + 5;
  }

  update(item: GridItem): void {
    // Craters fade out over their last 10 seconds.
    this.root.alpha = item.kind === 'crater' && item.ticksLeft > 0 ? Math.min(1, item.ticksLeft / 1000) : 1;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

/** Placeholder art per projectile id. */
const projectileArt: Record<string, () => Graphics> = {
  pea: peaArt,
  'snow-pea': snowPeaArt,
  spore: sporeArt,
  'scaredy-spore': sporeArt,
};

export class ProjectileView {
  readonly root = new Container();

  constructor(projectile: Projectile, rowTop: number) {
    const shadow = new Graphics().ellipse(0, 0, 9, 3).fill({ color: 0x000000, alpha: 0.25 });
    shadow.position.set(0, rowTop + 95 - projectile.y);
    const art = (projectileArt[projectile.def.id] ?? peaArt)();
    this.root.addChild(shadow, art);
    this.root.zIndex = projectile.row * 100 + Z_PROJECTILE;
  }

  update(projectile: Projectile, alpha: number): void {
    // Projectile x is the left edge of its collision span; art is centered.
    this.root.position.set(lerp(projectile.prevX, projectile.x, alpha) + projectile.def.width / 2, projectile.y);
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

export class PickupView {
  readonly root = new Container();
  private readonly sun: SunArt | null = null;
  private readonly rays: Graphics | null = null;
  private readonly bornAt: number;

  constructor(pickup: Pickup, now: number) {
    this.bornAt = now;
    if (pickup.kind === 'sun') {
      this.sun = sunArt();
      this.root.addChild(this.sun.root);
      return;
    }
    this.rays = new Graphics();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.rays.poly([0, 0, Math.cos(a - 0.12) * 70, Math.sin(a - 0.12) * 70, Math.cos(a + 0.12) * 70, Math.sin(a + 0.12) * 70]).fill({
        color: 0xfff6c0,
        alpha: 0.35,
      });
    }
    this.root.addChild(this.rays);
    const plantReward = pickup.rewards.find((r) => r.type === 'plant' && r.id && PlantRegistry.has(r.id));
    if (plantReward) {
      const packet = new SeedPacketView(PlantRegistry.get(plantReward.id!));
      packet.setState({ charge: 1, affordable: true, held: false });
      packet.eventMode = 'none';
      packet.pivot.set(25, 35);
      this.root.addChild(packet);
    } else {
      this.root.addChild(moneyBagArt());
    }
  }

  update(pickup: Pickup, alpha: number, now: number): void {
    this.root.position.set(lerp(pickup.prevX, pickup.x, alpha), lerp(pickup.prevY, pickup.y, alpha));
    if (this.sun) {
      this.sun.rays.rotation = now * 0.9;
      this.sun.glow.scale.set(1 + Math.sin(now * 4) * 0.06);
      const remaining = pickup.lifetime - pickup.age;
      this.root.alpha = pickup.state === 'resting' && remaining < 150 ? 0.5 + 0.5 * Math.cos(now * 18) : 1;
      this.root.scale.set(Math.min(1, (now - this.bornAt) / 0.2) * (pickup.state === 'collecting' ? 0.85 : 1));
    }
    if (this.rays) this.rays.rotation = now * 0.5;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

export class MowerView {
  readonly root = new Container();

  constructor(mower: LawnMower, rowY: number) {
    this.root.addChild(lawnMowerArt());
    this.root.position.set(mower.x, rowY);
    this.root.zIndex = mower.row * 100 + Z_MOWER;
  }

  update(mower: LawnMower, rowY: number, alpha: number, now: number): void {
    const running = mower.state === 'running';
    this.root.position.set(lerp(mower.prevX, mower.x, alpha), rowY + (running ? Math.sin(now * 60) * 1.5 : 0));
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
