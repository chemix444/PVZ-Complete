import { Container, Graphics, Text } from 'pixi.js';
import { lawnArt, plantArt, zombieArtFor, zombieHeadArt, type AssetLibrary } from '@pvz/assets';
import { EffectRegistry } from '@pvz/content';
import {
  Pickup,
  Plant,
  ShooterBehavior,
  Zombie,
  type BoardDef,
  type LevelDef,
  type PlantDef,
  type SimEvent,
  type Simulation,
} from '@pvz/engine';
import { imageSprite } from './clip';
import { Effects } from './effects';
import { GridItemView, MowerView, PickupView, PlantView, ProjectileView, RollerView, ZombieView } from './views';

/** Pieces that fly off a zombie when its armor breaks. */
const ARMOR_DEBRIS: Record<string, () => Graphics> = {
  cone: () => new Graphics().poly([-15, 0, 15, 0, 0, -38]).fill(0xd06f10).stroke({ width: 2, color: 0x9c4d08 }),
  bucket: () => new Graphics().poly([-14, 0, 14, 0, 11, -26, -11, -26]).fill(0x9aa2a8).stroke({ width: 2, color: 0x5a6268 }),
  'football-helmet': () => new Graphics().ellipse(0, -10, 17, 14).fill(0xc0281c).stroke({ width: 2, color: 0x6a1008 }),
  'screen-door': () => new Graphics().rect(-16, -40, 32, 60).fill({ color: 0x7a8a80, alpha: 0.8 }).stroke({ width: 3, color: 0x4a4a42 }),
};

export interface DebugOverlays {
  hitboxes: boolean;
  targeting: boolean;
  grid: boolean;
}

interface Pan {
  from: number;
  to: number;
  elapsed: number;
  duration: number;
  done?: () => void;
}

/**
 * The lawn as seen through a horizontally panning camera: background, every
 * entity view kept in sync with the simulation, effects and debug overlays.
 */
export class BoardScene {
  readonly root = new Container();
  readonly world = new Container();
  private readonly entities = new Container();
  private readonly pickups = new Container();
  private readonly ghostLayer = new Container();
  private readonly debug = new Graphics();
  private readonly debugText = new Container();
  private readonly labels: Text[] = [];
  readonly effects = new Effects();
  private readonly plants = new Map<number, PlantView>();
  private readonly zombies = new Map<number, ZombieView>();
  private readonly projectiles = new Map<number, ProjectileView>();
  private readonly pickupViews = new Map<number, PickupView>();
  private readonly mowers = new Map<number, MowerView>();
  private readonly rollers = new Map<number, RollerView>();
  private readonly items = new Map<number, GridItemView>();
  private readonly frost = new Graphics();
  private shakeLeft = 0;
  private shakePower = 0;
  private readonly preview: Container[] = [];
  private ghost: { container: Container; plant: string } | null = null;
  private pan: Pan | null = null;
  cameraX = 0;
  overlays: DebugOverlays = { hitboxes: false, targeting: false, grid: false };
  /** Shown when the developer inspector has an entity selected. */
  selectedId: number | null = null;

  constructor(
    readonly board: BoardDef,
    private readonly assets: AssetLibrary,
    level: LevelDef,
  ) {
    this.entities.sortableChildren = true;
    const background = imageSprite(assets, board.view.background) ?? lawnArt(board, board.daytime ? 'day' : 'night');
    this.world.addChild(background, this.groundMarks(level), this.ghostLayer, this.entities, this.effects.layer, this.pickups, this.debug, this.debugText);
    this.frost.rect(0, 0, 800, 600).fill(0xd8f0ff);
    this.frost.alpha = 0;
    this.frost.eventMode = 'none';
    this.root.addChild(this.world, this.frost);
  }

  /** Bare dirt over unsodded rows, and the red line of planting-limited levels. */
  private groundMarks(level: LevelDef): Graphics {
    const g = new Graphics();
    const { origin, tile, cols, rows } = this.board;
    level.lanes?.forEach((surface, row) => {
      if (surface !== 'dirt') return;
      const y = origin.y + row * tile.height;
      g.rect(origin.x, y, cols * tile.width, tile.height).fill(0x8a6236);
      for (let i = 0; i < 40; i++) {
        g.circle(origin.x + ((i * 53 + row * 31) % (cols * tile.width)), y + 10 + ((i * 37) % (tile.height - 20)), 2 + (i % 3)).fill(0x6e4a24);
      }
    });
    if (level.plantableCols !== undefined) {
      const x = origin.x + level.plantableCols * tile.width;
      g.rect(x - 2, origin.y, 4, rows * tile.height).fill(0xd0201a);
    }
    return g;
  }

  /** Rattles the camera, for explosions. */
  shake(power: number, duration: number): void {
    this.shakePower = Math.max(this.shakePower, power);
    this.shakeLeft = Math.max(this.shakeLeft, duration);
  }

  setCamera(x: number): void {
    this.cameraX = x;
    this.pan = null;
    this.world.x = -x;
  }

  panTo(x: number, duration: number, done?: () => void): void {
    this.pan = { from: this.cameraX, to: x, elapsed: 0, duration, done };
  }

  get panning(): boolean {
    return this.pan !== null;
  }

  /** Converts a point in the 800x600 view to board coordinates. */
  toBoard(viewX: number, viewY: number): { x: number; y: number } {
    return { x: viewX + this.cameraX, y: viewY };
  }

  update(dt: number): void {
    if (this.pan) {
      const pan = this.pan;
      pan.elapsed = Math.min(pan.duration, pan.elapsed + dt);
      const t = pan.elapsed / pan.duration;
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      this.cameraX = pan.from + (pan.to - pan.from) * eased;
      this.world.x = -this.cameraX;
      if (pan.elapsed >= pan.duration) {
        this.pan = null;
        pan.done?.();
      }
    }
    this.effects.update(dt);
    this.frost.alpha = Math.max(0, this.frost.alpha - dt * 1.2);
    if (this.shakeLeft > 0) {
      this.shakeLeft -= dt;
      this.world.y = (Math.random() - 0.5) * this.shakePower * 2;
      if (this.shakeLeft <= 0) {
        this.world.y = 0;
        this.shakePower = 0;
      }
    }
  }

  /** Idle zombies standing in the street while seeds are chosen. */
  showPreview(zombieIds: readonly string[], count: number): void {
    const street = this.board.view.maxX - 260;
    for (let i = 0; i < count; i++) {
      const id = zombieIds[i % zombieIds.length];
      const art = zombieArtFor(id);
      const row = (i * 3) % this.board.rows;
      art.root.position.set(street + ((i * 71) % 180), this.board.origin.y + row * this.board.tile.height - 20 + ((i * 37) % 30));
      art.root.zIndex = art.root.y;
      art.head.rotation = (((i * 13) % 7) - 3) * 0.04;
      this.entities.addChild(art.root);
      this.preview.push(art.root);
    }
  }

  clearPreview(): void {
    for (const c of this.preview) c.destroy({ children: true });
    this.preview.length = 0;
  }

  /** Translucent plant on the hovered cell while placing. */
  setGhost(def: PlantDef | null, cell: { row: number; col: number } | null, valid: boolean): void {
    if (!def || !cell) {
      if (this.ghost) this.ghost.container.visible = false;
      return;
    }
    if (!this.ghost || this.ghost.plant !== def.id) {
      this.ghost?.container.destroy({ children: true });
      const container = new Container();
      container.addChild(plantArt(def.id, def.name).root);
      container.alpha = 0.45;
      this.ghostLayer.addChild(container);
      this.ghost = { container, plant: def.id };
    }
    this.ghost.container.visible = valid;
    this.ghost.container.position.set(
      this.board.origin.x + cell.col * this.board.tile.width,
      this.board.origin.y + cell.row * this.board.tile.height,
    );
  }

  sync(sim: Simulation, alpha: number, now: number): void {
    syncViews(sim.plants, this.plants, this.entities, (p) => new PlantView(p, this.assets, now), (v, p) => v.update(p, sim, alpha, now));
    syncViews(sim.zombies, this.zombies, this.entities, (z) => new ZombieView(z, this.assets), (v, z) => v.update(z, sim, alpha, now));
    syncViews(
      sim.projectiles,
      this.projectiles,
      this.entities,
      (p) => new ProjectileView(p, sim.lawn.rowY(p.row)),
      (v, p) => v.update(p, alpha),
    );
    syncViews(sim.pickups, this.pickupViews, this.pickups, (p) => new PickupView(p, now), (v, p) => v.update(p, alpha, now));
    syncViews(
      sim.mowers,
      this.mowers,
      this.entities,
      (m) => new MowerView(m, sim.lawn.rowY(m.row)),
      (v, m) => v.update(m, sim.lawn.rowY(m.row), alpha, now),
    );
    syncViews(sim.rollers, this.rollers, this.entities, (r) => new RollerView(r), (v, r) => v.update(r, alpha));
    syncViews(
      sim.gridItems,
      this.items,
      this.entities,
      (item) => new GridItemView(item, sim.lawn.cellX(item.col), sim.lawn.rowY(item.row)),
      (v, item) => v.update(item),
    );
    this.drawDebug(sim);
  }

  /** Reward pickup view, for the end-of-level animation. */
  pickupView(id: number): PickupView | undefined {
    return this.pickupViews.get(id);
  }

  zombieView(id: number): ZombieView | undefined {
    return this.zombies.get(id);
  }

  handleEvent(event: SimEvent, sim: Simulation, now: number): void {
    const fx = (id: string, x: number, y: number) => this.effects.burst(EffectRegistry.get(id), x, y);
    switch (event.type) {
      case 'projectile-hit': {
        this.zombies.get(event.zombieId)?.flash(now);
        const material = event.armorMaterial;
        const effect =
          material === 'plastic'
            ? 'effect.plastic-chip'
            : material === 'metal'
              ? 'effect.metal'
              : material === 'paper'
                ? 'effect.paper'
                : event.def === 'snow-pea'
                  ? 'effect.ice'
                  : event.def.includes('spore')
                    ? 'effect.spore-splat'
                    : 'effect.pea-splat';
        fx(effect, event.x + 20, event.y);
        break;
      }
      case 'plant-placed': {
        const lawn = sim.lawn;
        fx('effect.dirt', lawn.cellX(event.col) + 40, lawn.rowY(event.row) + 90);
        break;
      }
      case 'zombie-spawned': {
        const zombie = sim.entity(event.zombieId);
        if (zombie instanceof Zombie && zombie.risingTicks > 0) fx('effect.dirt', zombie.centerX, zombie.y + 95);
        break;
      }
      case 'zombie-head-lost': {
        const zombie = sim.entity(event.zombieId);
        if (zombie instanceof Zombie) {
          const head = zombieHeadArt();
          head.pivot.set(57, 6);
          this.effects.debris(head, zombie.x + 57, zombie.y + 6, zombie.hypnotized ? -50 : 50, -240, zombie.y + 84);
        }
        break;
      }
      case 'zombie-arm-lost': {
        const zombie = sim.entity(event.zombieId);
        if (zombie instanceof Zombie) {
          const arm = new Graphics().poly([0, 0, 26, 4, 24, 12, 0, 8]).fill(0x6b4a2e).circle(-2, 5, 5.5).fill(0xa3b58c);
          this.effects.debris(arm, zombie.x + 24, zombie.y + 30, -30, -120, zombie.y + 90);
        }
        break;
      }
      case 'armor-lost': {
        const zombie = sim.entity(event.zombieId);
        if (!(zombie instanceof Zombie)) break;
        const part = ARMOR_DEBRIS[event.armor];
        if (part) this.effects.debris(part(), zombie.x + 57, zombie.y - 4, 60, -220, zombie.y + 92);
        if (event.material === 'paper') fx('effect.paper', zombie.x + 30, zombie.y + 50);
        break;
      }
      case 'zombie-died':
        if (event.cause === 'explosion') {
          const zombie = sim.entity(event.zombieId);
          if (zombie instanceof Zombie) fx('effect.ash', zombie.centerX, zombie.y + 60);
        }
        break;
      case 'explosion': {
        const big = event.effect === 'doom';
        fx(big ? 'effect.doom' : 'effect.explosion', event.x, event.y);
        fx('effect.smoke', event.x, event.y);
        if (big) {
          fx('effect.doom', event.x, event.y - 60);
          fx('effect.smoke', event.x, event.y - 90);
        }
        if (event.effect === 'potato') {
          fx('effect.dirt', event.x, event.y + 20);
          this.effects.text('SPUDOW!', event.x, event.y - 40, 0xffe14d);
        }
        this.shake(big ? 10 : 5, big ? 1.2 : 0.4);
        break;
      }
      case 'zombies-frozen':
        this.frost.alpha = 0.7;
        for (const zombie of sim.zombies) if (zombie.freezeTicks > 0) fx('effect.ice', zombie.centerX, zombie.y + 50);
        break;
      case 'fume':
        for (let x = event.x0; x < event.x1; x += 40) fx('effect.fume', x, sim.lawn.rowY(event.row) + 60);
        break;
      case 'zombie-hypnotized': {
        const zombie = sim.entity(event.zombieId);
        if (zombie instanceof Zombie) fx('effect.fume', zombie.centerX, zombie.y + 10);
        break;
      }
      case 'grave-removed':
        fx('effect.dirt', sim.lawn.cellX(event.col) + 40, sim.lawn.rowY(event.row) + 80);
        break;
      case 'roller-hit': {
        const zombie = sim.entity(event.zombieId);
        if (zombie instanceof Zombie) fx('effect.dirt', zombie.centerX, zombie.y + 80);
        break;
      }
      case 'whack':
        fx('effect.dirt', event.x, event.y + 20);
        if (event.zombieId !== null) this.zombies.get(event.zombieId)?.flash(now);
        break;
    }
  }

  pickupAt(sim: Simulation, x: number, y: number): Pickup | null {
    for (let i = sim.pickups.length - 1; i >= 0; i--) {
      const pickup = sim.pickups[i];
      const radius = pickup.kind === 'sun' ? 38 : 45;
      if (pickup.collectible && (pickup.x - x) ** 2 + (pickup.y - y) ** 2 <= radius * radius) return pickup;
    }
    return null;
  }

  /** Entity under a board point, for the inspector. Zombies first, then plants. */
  entityAt(sim: Simulation, x: number, y: number): Zombie | Plant | null {
    const row = sim.lawn.rowAt(y);
    for (const zombie of sim.zombies) {
      if (zombie.row === row && x >= zombie.hitLeft - 10 && x <= zombie.hitRight + 10) return zombie;
    }
    const col = sim.lawn.colAt(x);
    return row >= 0 && col >= 0 ? sim.lawn.topPlantAt(row, col) : null;
  }

  destroy(): void {
    this.effects.clear();
    this.root.destroy({ children: true });
  }

  private drawDebug(sim: Simulation): void {
    const g = this.debug.clear();
    let used = 0;
    const { hitboxes, targeting, grid } = this.overlays;
    const lawn = sim.lawn;
    if (grid) {
      for (let row = 0; row < lawn.rows; row++) {
        for (let col = 0; col < lawn.cols; col++) {
          g.rect(lawn.cellX(col), lawn.rowY(row), this.board.tile.width, this.board.tile.height).stroke({
            width: 1,
            color: 0xffffff,
            alpha: 0.35,
          });
        }
      }
      g.moveTo(this.board.attackLimitX, 0).lineTo(this.board.attackLimitX, 600).stroke({ width: 1, color: 0xff00ff });
      g.moveTo(this.board.houseX, 0).lineTo(this.board.houseX, 600).stroke({ width: 1, color: 0xff0000 });
    }
    if (hitboxes) {
      for (const plant of sim.plants) {
        g.rect(plant.hitLeft, plant.y + 10, plant.hitRight - plant.hitLeft, 80).stroke({ width: 1.5, color: 0x00ff66 });
      }
      for (const zombie of sim.zombies) {
        if (!zombie.collidable) continue;
        g.rect(zombie.hitLeft, zombie.y, zombie.hitRight - zombie.hitLeft, 98).stroke({ width: 1.5, color: 0x33aaff });
        g.rect(zombie.attackLeft, zombie.y + 30, zombie.attackRight - zombie.attackLeft, 30).stroke({ width: 1.5, color: 0xff3333 });
      }
      for (const p of sim.projectiles) g.rect(p.x, p.y - 6, p.def.width, 12).stroke({ width: 1, color: 0xffff00 });
      for (const m of sim.mowers) g.rect(m.x, lawn.rowY(m.row) + 55, m.width, 40).stroke({ width: 1, color: 0xff8800 });
    }
    if (targeting) {
      for (const plant of sim.plants) {
        for (const behavior of plant.behaviors) {
          if (!(behavior instanceof ShooterBehavior) || behavior.targetId < 0) continue;
          const target = sim.entity(behavior.targetId);
          if (!(target instanceof Zombie) || !target.collidable) continue;
          g.moveTo(plant.x + 60, plant.y + 40).lineTo(target.hitLeft, target.y + 40).stroke({ width: 2, color: 0xffee00, alpha: 0.8 });
        }
      }
    }
    if (this.selectedId !== null) {
      const selected = sim.entity(this.selectedId);
      if (selected instanceof Zombie) g.rect(selected.hitLeft - 4, selected.y - 20, selected.hitRight - selected.hitLeft + 8, 122).stroke({ width: 2, color: 0xff00ff });
      if (selected instanceof Plant) g.rect(selected.x, selected.y, this.board.tile.width, this.board.tile.height).stroke({ width: 2, color: 0xff00ff });
    }
    if (hitboxes) {
      for (const zombie of sim.zombies) {
        if (!zombie.collidable) continue;
        let label = this.labels[used];
        if (!label) {
          label = new Text({ text: '', style: { fontSize: 11, fill: 0xffffff, fontFamily: 'monospace' } });
          this.labels.push(label);
          this.debugText.addChild(label);
        }
        label.text = String(Math.ceil(zombie.totalHealth));
        label.position.set(zombie.hitLeft, zombie.y - 14);
        label.visible = true;
        used++;
      }
    }
    for (let i = used; i < this.labels.length; i++) this.labels[i].visible = false;
  }
}

function syncViews<E extends { id: number; alive: boolean }, V extends { root: Container; destroy(): void }>(
  entities: readonly E[],
  views: Map<number, V>,
  layer: Container,
  create: (entity: E) => V,
  update: (view: V, entity: E) => void,
): void {
  const seen = new Set<number>();
  for (const entity of entities) {
    if (!entity.alive) continue;
    seen.add(entity.id);
    let view = views.get(entity.id);
    if (!view) {
      view = create(entity);
      views.set(entity.id, view);
      layer.addChild(view.root);
    }
    update(view, entity);
  }
  for (const [id, view] of views) {
    if (!seen.has(id)) {
      view.destroy();
      views.delete(id);
    }
  }
}
