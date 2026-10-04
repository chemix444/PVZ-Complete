import type { BoardDef, LevelDef, PlantDef, ProjectileDef, RewardSpec, ZombieDef } from './defs';
import type { Command } from './commands';
import type { PlacementFailure, PlantRemoval, SimEvent, ZombieDeath } from './events';
import { Rng } from './core/rng';
import { ticks } from './core/time';
import { Lawn } from './lawn';
import { LawnMower, Pickup, Plant, Projectile, Zombie, type ArmorState, type Entity } from './entities';
import { createPlantBehavior, createZombieBehavior } from './behaviors/types';
import { createSystem, type SimSystem } from './systems/types';
import { SeedBankSystem, SeedPacket } from './systems/seedBank';
import { SkySunSystem } from './systems/skySun';
import { WaveSystem } from './systems/waves';
import { MowerSystem, OutcomeSystem, PickupSystem, PlantSystem, ProjectileSystem, ZombieSystem } from './systems/actors';
import './behaviors/shooter';
import './behaviors/producer';
import './behaviors/zombie';

/** Era-resolved definitions the simulation reads by id. */
export interface SimContent {
  plant(id: string): PlantDef;
  zombie(id: string): ZombieDef;
  projectile(id: string): ProjectileDef;
}

export interface SimulationConfig {
  readonly content: SimContent;
  readonly board: BoardDef;
  readonly level: LevelDef;
  /** Plant ids in seed bank order. */
  readonly seeds: readonly string[];
  readonly rngSeed: number;
}

/**
 * playing: waves running. cleared: last zombie dead, reward waiting to be
 * picked up. won / lost: the simulation no longer advances.
 */
export type SimPhase = 'playing' | 'cleared' | 'won' | 'lost';

// Sun pickups rest for 7.5 s before disappearing (not measured precisely).
export const SUN_LIFETIME = ticks(7.5);
export const SKY_SUN_VALUE = 25;
/** Collapse animation length after a zombie dies. */
export const ZOMBIE_DEATH_TICKS = ticks(1.5);
export const ZOMBIE_MOWED_TICKS = ticks(0.6);

export interface SimStats {
  zombiesKilled: number;
  sunCollected: number;
  plantsPlaced: number;
}

export class Simulation {
  tick = 0;
  phase: SimPhase = 'playing';
  sun: number;
  readonly rng: Rng;
  readonly content: SimContent;
  readonly board: BoardDef;
  readonly level: LevelDef;
  readonly lawn: Lawn;
  readonly seedBank: SeedPacket[];

  readonly plants: Plant[] = [];
  readonly zombies: Zombie[] = [];
  readonly projectiles: Projectile[] = [];
  readonly pickups: Pickup[] = [];
  readonly mowers: LawnMower[] = [];

  readonly waves: WaveSystem;
  readonly skySun: SkySunSystem | null;
  readonly systems: SimSystem[];
  readonly stats: SimStats = { zombiesKilled: 0, sunCollected: 0, plantsPlaced: 0 };
  /** Where the most recent zombie died; the level reward drops there. */
  lastDeath: { x: number; y: number } | null = null;
  rewardPickup: Pickup | null = null;
  lostTo: Zombie | null = null;

  private events: SimEvent[] = [];
  private readonly queue: Command[] = [];
  private readonly byId = new Map<number, Entity>();
  private nextId = 1;

  constructor(config: SimulationConfig) {
    this.content = config.content;
    this.board = config.board;
    this.level = config.level;
    this.rng = new Rng(config.rngSeed);
    this.lawn = new Lawn(config.board);
    this.sun = config.level.startingSun;
    this.seedBank = config.seeds.map((id) => new SeedPacket(config.content.plant(id)));

    if (config.level.mowers && config.board.mower) {
      const spec = config.board.mower;
      for (let row = 0; row < this.lawn.rows; row++) {
        if (this.lawn.surface(row, 0) === 'none') continue;
        this.track(this.mowers, new LawnMower(this.allocateId(), row, spec.x, spec.width, spec.speed / 100));
      }
    }

    this.waves = new WaveSystem(this, config.level.waves);
    this.skySun = config.level.skySun && config.board.skySun ? new SkySunSystem(this) : null;
    const extra = (config.level.systems ?? []).map((spec) => createSystem(spec, this));
    this.systems = [
      new SeedBankSystem(),
      ...(this.skySun ? [this.skySun] : []),
      this.waves,
      new PlantSystem(),
      new ZombieSystem(),
      new ProjectileSystem(),
      new PickupSystem(),
      new MowerSystem(),
      ...extra,
      new OutcomeSystem(),
    ];
  }

  get finished(): boolean {
    return this.phase === 'won' || this.phase === 'lost';
  }

  issue(command: Command): void {
    this.queue.push(command);
  }

  step(): void {
    if (this.finished) return;
    this.tick++;
    for (let i = 0; i < this.queue.length; i++) this.apply(this.queue[i]);
    this.queue.length = 0;
    for (const system of this.systems) {
      system.update(this);
      if (this.finished) break;
    }
    compact(this.plants);
    compact(this.zombies);
    compact(this.projectiles);
    compact(this.pickups);
    compact(this.mowers);
  }

  /** Returns and clears the events emitted since the last drain. */
  drainEvents(): SimEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  emit(event: SimEvent): void {
    this.events.push(event);
  }

  entity(id: number): Entity | undefined {
    return this.byId.get(id);
  }

  // ---- queries -----------------------------------------------------------

  canPlace(def: PlantDef, row: number, col: number): PlacementFailure | null {
    if (!this.lawn.inBounds(row, col)) return 'out-of-bounds';
    const surfaces = def.surfaces ?? ['grass'];
    if (!surfaces.includes(this.lawn.surface(row, col))) return 'surface';
    if (this.lawn.plantAt(row, col, def.slot ?? 'main')) return 'occupied';
    return null;
  }

  /** Why planting from a seed bank slot would fail right now, or null if it would succeed. */
  checkPlanting(slot: number, row: number, col: number): PlacementFailure | null {
    if (this.phase !== 'playing' && this.phase !== 'cleared') return 'not-playing';
    const packet = this.seedBank[slot];
    if (!packet) return 'bad-slot';
    if (!packet.ready) return 'recharging';
    if (this.sun < packet.cost) return 'not-enough-sun';
    return this.canPlace(packet.def, row, col);
  }

  // ---- mutations used by commands, behaviors and systems ------------------

  placePlant(def: PlantDef, row: number, col: number): Plant {
    const lawn = this.lawn;
    const plant = new Plant(this.allocateId(), def, row, col, def.slot ?? 'main', lawn.cellX(col), lawn.rowY(row), this.tick);
    for (const spec of def.behaviors) plant.behaviors.push(createPlantBehavior(spec, plant, this));
    this.track(this.plants, plant);
    lawn.occupy(plant);
    this.stats.plantsPlaced++;
    this.emit({ type: 'plant-placed', plantId: plant.id, def: def.id, row, col });
    return plant;
  }

  removePlant(plant: Plant, cause: PlantRemoval): void {
    if (!plant.alive) return;
    this.lawn.vacate(plant);
    this.removeEntity(plant);
    for (const zombie of this.zombies) {
      if (zombie.eating === plant) zombie.eating = null;
    }
    this.emit({ type: 'plant-removed', plantId: plant.id, def: plant.def.id, cause });
  }

  damagePlant(plant: Plant, amount: number): void {
    plant.health -= amount;
    if (plant.health <= 0) this.removePlant(plant, 'eaten');
  }

  spawnZombie(id: string, row: number, x: number, wave: number): Zombie {
    const def = this.content.zombie(id);
    const speed = this.rng.floatRange(def.speed[0], def.speed[1]) / 100;
    const zombie = new Zombie(this.allocateId(), def, row, x, this.lawn.rowY(row), speed, wave, this.tick);
    for (const spec of def.behaviors) zombie.behaviors.push(createZombieBehavior(spec, zombie, this));
    this.track(this.zombies, zombie);
    this.emit({ type: 'zombie-spawned', zombieId: zombie.id, def: id, row, wave });
    return zombie;
  }

  /**
   * Applies damage through armor to the body. Helmet damage that exceeds the
   * helmet's remaining health carries over to the body. Returns the armor
   * layer that absorbed the hit, if any.
   */
  damageZombie(zombie: Zombie, amount: number): ArmorState | null {
    if (zombie.state === 'dead') return null;
    let remaining = amount;
    let struck: ArmorState | null = null;
    for (const layer of zombie.armor) {
      if (layer.health <= 0 || remaining <= 0) continue;
      struck = layer;
      const absorbed = Math.min(layer.health, remaining);
      layer.health -= absorbed;
      remaining -= absorbed;
      if (layer.health <= 0) {
        this.emit({ type: 'armor-lost', zombieId: zombie.id, armor: layer.spec.id, material: layer.spec.material });
      }
    }
    if (remaining > 0) {
      zombie.health -= remaining;
      this.updateZombieDamageState(zombie);
    }
    return struck;
  }

  killZombie(zombie: Zombie, cause: ZombieDeath): void {
    if (zombie.state === 'dead') return;
    zombie.state = 'dead';
    zombie.eating = null;
    zombie.deathCause = cause;
    zombie.deadTicks = cause === 'mower' ? ZOMBIE_MOWED_TICKS : ZOMBIE_DEATH_TICKS;
    zombie.setAnim(cause === 'mower' ? 'mowed' : 'die', this.tick);
    this.stats.zombiesKilled++;
    this.lastDeath = { x: zombie.x + zombie.def.hitbox.left + zombie.def.hitbox.width / 2, y: zombie.y };
    this.emit({ type: 'zombie-died', zombieId: zombie.id, def: zombie.def.id, cause });
  }

  spawnProjectile(id: string, owner: Plant, offsetX: number, offsetY: number): Projectile {
    const def = this.content.projectile(id);
    const projectile = new Projectile(this.allocateId(), def, owner.row, owner.x + offsetX, owner.y + offsetY, owner.id);
    this.track(this.projectiles, projectile);
    this.emit({ type: 'projectile-fired', projectileId: projectile.id, def: id, plantId: owner.id });
    return projectile;
  }

  spawnSkySun(): Pickup {
    const spec = this.board.skySun!;
    const x = this.rng.range(spec.minX, spec.maxX);
    const landY = this.rng.range(spec.minLandY, spec.maxLandY);
    const sun = new Pickup(this.allocateId(), 'sun', SKY_SUN_VALUE, x, spec.startY, 'sky', landY, SUN_LIFETIME);
    sun.vy = spec.fallSpeed / 100;
    this.track(this.pickups, sun);
    this.emit({ type: 'sun-spawned', pickupId: sun.id, source: 'sky' });
    return sun;
  }

  spawnPlantSun(plant: Plant, amount: number): Pickup {
    const tile = this.board.tile;
    const x = plant.x + tile.width / 2 - 10 + this.rng.range(-10, 10);
    const y = plant.y + tile.height * 0.3;
    const landY = plant.y + tile.height * 0.45 + this.rng.int(15);
    const sun = new Pickup(this.allocateId(), 'sun', amount, x, y, 'toss', landY, SUN_LIFETIME);
    sun.vx = this.rng.floatRange(-0.4, 0.4);
    sun.vy = this.rng.floatRange(-3, -2.5);
    this.track(this.pickups, sun);
    this.emit({ type: 'sun-spawned', pickupId: sun.id, source: 'plant' });
    return sun;
  }

  addSun(amount: number): void {
    this.sun += amount;
    if (amount > 0) this.stats.sunCollected += amount;
  }

  /** Last zombie of the final wave is dead: drop the reward. */
  clear(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'cleared';
    const lawn = this.lawn;
    const drop = this.lastDeath ?? { x: lawn.cellX(Math.floor(lawn.cols / 2)), y: lawn.rowY(Math.floor(lawn.rows / 2)) };
    const minX = lawn.cellX(0) + 20;
    const maxX = lawn.cellX(lawn.cols - 1);
    const x = Math.min(maxX, Math.max(minX, drop.x));
    const landY = drop.y + this.board.tile.height * 0.4;
    const reward = new Pickup(this.allocateId(), 'reward', 0, x, landY - 30, 'drop', landY, 0, this.level.rewards ?? []);
    reward.vy = -2.5;
    this.track(this.pickups, reward);
    this.rewardPickup = reward;
    this.emit({ type: 'level-cleared', pickupId: reward.id });
  }

  win(rewards: readonly RewardSpec[]): void {
    if (this.finished) return;
    this.phase = 'won';
    this.emit({ type: 'level-won', rewards });
  }

  lose(zombie: Zombie): void {
    if (this.finished) return;
    this.phase = 'lost';
    this.lostTo = zombie;
    this.emit({ type: 'level-lost', zombieId: zombie.id, row: zombie.row });
  }

  removeEntity(entity: Entity): void {
    entity.alive = false;
    this.byId.delete(entity.id);
  }

  // ---- internals ----------------------------------------------------------

  private apply(command: Command): void {
    switch (command.type) {
      case 'plant': {
        const failure = this.checkPlanting(command.slot, command.row, command.col);
        const packet = this.seedBank[command.slot];
        if (failure) {
          this.emit({ type: 'plant-rejected', reason: failure, def: packet ? packet.def.id : null });
          return;
        }
        this.sun -= packet.cost;
        packet.startRecharge();
        this.placePlant(packet.def, command.row, command.col);
        return;
      }
      case 'collect': {
        const pickup = this.byId.get(command.pickupId);
        if (!(pickup instanceof Pickup) || !pickup.collectible) return;
        if (this.finished) return;
        pickup.state = 'collecting';
        this.emit({ type: 'pickup-collected', pickupId: pickup.id, kind: pickup.kind });
        if (pickup.kind === 'reward') this.win(pickup.rewards);
        return;
      }
      case 'dig': {
        if (!this.lawn.inBounds(command.row, command.col)) return;
        const plant = this.lawn.topPlantAt(command.row, command.col);
        if (plant) this.removePlant(plant, 'dug');
        return;
      }
      case 'debug-add-sun':
        this.sun = Math.max(0, this.sun + command.amount);
        return;
      case 'debug-spawn-zombie':
        if (command.row >= 0 && command.row < this.lawn.rows) {
          this.spawnZombie(command.zombie, command.row, command.x ?? this.board.zombieSpawnX, -1);
        }
        return;
      case 'debug-spawn-plant': {
        const def = this.content.plant(command.plant);
        if (!this.canPlace(def, command.row, command.col)) this.placePlant(def, command.row, command.col);
        return;
      }
      case 'debug-set-health': {
        const target = this.byId.get(command.entityId);
        if (target instanceof Plant) {
          target.health = command.health;
          if (target.health <= 0) this.removePlant(target, 'debug');
        } else if (target instanceof Zombie && target.state !== 'dead') {
          target.health = command.health;
          if (target.health <= 0) this.killZombie(target, 'debug');
          else this.updateZombieDamageState(target);
        }
        return;
      }
      case 'debug-skip-wave':
        this.waves.skip();
        return;
      case 'debug-kill-zombies':
        for (const zombie of this.zombies) if (zombie.collidable) this.killZombie(zombie, 'debug');
        return;
      case 'debug-recharge-all':
        for (const packet of this.seedBank) packet.remaining = 0;
        return;
    }
  }

  private updateZombieDamageState(zombie: Zombie): void {
    const def = zombie.def;
    if (!zombie.armLost && def.loseArmBelow !== undefined && zombie.health < def.loseArmBelow) {
      zombie.armLost = true;
      this.emit({ type: 'zombie-arm-lost', zombieId: zombie.id });
    }
    if (!zombie.headLost && zombie.health < def.dieBelow) {
      zombie.headLost = true;
      this.emit({ type: 'zombie-head-lost', zombieId: zombie.id });
      if (zombie.active) {
        zombie.state = 'dying';
        zombie.eating = null;
        zombie.setAnim('walk', this.tick);
      }
    }
    if (zombie.health <= 0) this.killZombie(zombie, 'damage');
  }

  private allocateId(): number {
    return this.nextId++;
  }

  private track<T extends Entity>(list: T[], entity: T): void {
    list.push(entity);
    this.byId.set(entity.id, entity);
  }
}

function compact<T extends { alive: boolean }>(list: T[]): void {
  let write = 0;
  for (let read = 0; read < list.length; read++) {
    const item = list[read];
    if (item.alive) list[write++] = item;
  }
  list.length = write;
}
