import { ColorMatrixFilter, Container, Graphics } from 'pixi.js';
import {
  lawnMowerArt,
  moneyBagArt,
  peaArt,
  plantArt,
  sunArt,
  zombieArt,
  type AssetLibrary,
  type PlantArt,
  type SunArt,
  type ZombieArt,
} from '@pvz/assets';
import { PlantRegistry } from '@pvz/content';
import { ShooterBehavior, type LawnMower, type Pickup, type Plant, type Projectile, type Simulation, type Zombie } from '@pvz/engine';
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

  constructor(plant: Plant, assets: AssetLibrary, now: number) {
    this.bornAt = now;
    this.root.position.set(plant.x, plant.y);
    this.root.zIndex = plant.row * 100 + Z_PLANT;
    const prefix = `plant.${plant.def.id}`;
    if (ClipVisual.available(assets, prefix, ['idle'])) {
      this.clip = new ClipVisual(assets, prefix, ['idle']);
      this.root.addChild(this.clip.root);
    } else {
      this.art = plantArt(plant.def.id, plant.def.name);
      this.root.addChild(this.art.root);
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
    const head = art.head;
    head.rotation = Math.sin(now * 2.2 + this.phase) * 0.04;
    head.scale.set(1);
    head.position.set(head.pivot.x, head.pivot.y);

    if (plant.anim === 'attack') {
      const shooter = plant.behaviors.find((b): b is ShooterBehavior => b instanceof ShooterBehavior);
      const p = shooter ? (sinceAnim * 100) / shooter.fireDelay : 2;
      if (p < 1) {
        head.position.x -= 5 * p;
        head.scale.set(1 - 0.08 * p, 1 + 0.06 * p);
      } else if (p < 1.4) {
        const q = 1 - (p - 1) / 0.4;
        head.position.x += 4 * q;
        head.scale.set(1 + 0.08 * q, 1 - 0.05 * q);
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

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

export class ZombieView {
  readonly root = new Container();
  private readonly art: ZombieArt | null = null;
  private readonly clip: ClipVisual | null = null;
  private flashUntil = 0;

  constructor(zombie: Zombie, assets: AssetLibrary) {
    const prefix = `zombie.${zombie.def.id}`;
    if (ClipVisual.available(assets, prefix, ['walk', 'idle'])) {
      this.clip = new ClipVisual(assets, prefix, ['walk', 'idle']);
      this.root.addChild(this.clip.root);
    } else {
      this.art = zombieArt({ armor: zombie.def.armor?.map((a) => a.id), flag: zombie.def.tags.includes('flag') });
      this.root.addChild(this.art.root);
    }
  }

  flash(now: number): void {
    this.flashUntil = now + 0.08;
  }

  update(zombie: Zombie, sim: Simulation, alpha: number, now: number): void {
    const x = lerp(zombie.prevX, zombie.x, alpha);
    this.root.position.set(x, zombie.y);
    this.root.zIndex = zombie.row * 100 + Z_ZOMBIE;
    this.root.filters = now < this.flashUntil ? [hitFlash] : null;
    const sinceAnim = (sim.tick + alpha - zombie.animTick) / 100;
    if (this.clip) {
      this.clip.show(zombie.anim, zombie.anim === 'walk' ? now : sinceAnim);
      this.root.alpha = zombie.state === 'dead' ? Math.max(0, 1 - sinceAnim / 1.5) : 1;
      return;
    }
    const art = this.art!;
    art.head.visible = !zombie.headLost;
    art.armFront.visible = !zombie.armLost;
    for (const layer of zombie.armor) {
      const stages = art.armor[layer.spec.id];
      if (!stages) continue;
      art.armorRoot[layer.spec.id].visible = layer.health > 0;
      const fraction = layer.health / layer.spec.health;
      const stage = (layer.spec.damageStages ?? []).filter((s) => fraction < s).length;
      stages.forEach((c, i) => (c.visible = i === Math.min(stage, stages.length - 1)));
    }

    const body = art.body;
    body.rotation = 0;
    body.scale.set(1);
    body.position.set(body.pivot.x, body.pivot.y);
    this.root.alpha = 1;

    switch (zombie.state) {
      case 'walking':
      case 'dying': {
        const phase = x * 0.11;
        const swing = Math.sin(phase);
        art.legFront.rotation = swing * 0.35;
        art.legBack.rotation = -swing * 0.35;
        body.position.y -= Math.abs(Math.cos(phase)) * 2;
        art.armFront.rotation = -0.1 + swing * 0.12;
        art.armBack.rotation = -0.1 - swing * 0.12;
        art.head.rotation = Math.sin(phase * 0.5) * 0.06;
        if (zombie.state === 'dying') body.rotation = -0.08 + Math.sin(phase * 0.5) * 0.08;
        break;
      }
      case 'eating': {
        const chew = Math.sin(now * 15);
        art.legFront.rotation = 0.1;
        art.legBack.rotation = -0.1;
        art.head.rotation = 0.1 + chew * 0.12;
        art.armFront.rotation = -0.35 + chew * 0.2;
        art.armBack.rotation = -0.3 - chew * 0.2;
        body.rotation = -0.05;
        break;
      }
      case 'dead': {
        if (zombie.deathCause === 'mower') {
          body.scale.set(1 + sinceAnim * 1.5, Math.max(0.1, 1 - sinceAnim * 2.5));
          this.root.alpha = Math.max(0, 1 - sinceAnim / 0.6);
        } else {
          const fall = Math.min(1, sinceAnim / 0.7);
          body.rotation = fall * fall * 1.45;
          art.legFront.rotation = art.legBack.rotation = 0;
          this.root.alpha = sinceAnim > 1 ? Math.max(0, 1 - (sinceAnim - 1) / 0.5) : 1;
        }
        break;
      }
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

export class ProjectileView {
  readonly root = new Container();

  constructor(projectile: Projectile, rowTop: number) {
    const shadow = new Graphics().ellipse(0, 0, 9, 3).fill({ color: 0x000000, alpha: 0.25 });
    shadow.position.set(0, rowTop + 95 - projectile.y);
    const art = peaArt();
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
