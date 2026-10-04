import type { ArmorSpec, PlantDef, PlantSlot, ProjectileDef, RewardSpec, ZombieDef } from './defs';
import type { ZombieDeath } from './events';
import type { PlantBehavior, ZombieBehavior } from './behaviors/types';

export class Plant {
  readonly kind = 'plant';
  alive = true;
  health: number;
  readonly maxHealth: number;
  /** Animation name and the tick it started; presentation syncs to these. */
  anim = 'idle';
  animTick: number;
  readonly behaviors: PlantBehavior[] = [];
  /** Horizontal span zombies collide with. */
  readonly hitLeft: number;
  readonly hitRight: number;

  constructor(
    readonly id: number,
    readonly def: PlantDef,
    readonly row: number,
    readonly col: number,
    readonly slot: PlantSlot,
    /** Left edge of the cell. */
    readonly x: number,
    /** Top edge of the row. */
    readonly y: number,
    readonly plantedTick: number,
  ) {
    this.health = def.health;
    this.maxHealth = def.health;
    this.animTick = plantedTick;
    this.hitLeft = x + (def.hitbox?.left ?? 10);
    this.hitRight = this.hitLeft + (def.hitbox?.width ?? 60);
  }

  setAnim(name: string, tick: number): void {
    this.anim = name;
    this.animTick = tick;
  }
}

export interface ArmorState {
  readonly spec: ArmorSpec;
  health: number;
}

/**
 * walking: moving and able to eat. eating: stopped on a plant.
 * dying: head lost, still walking and absorbing projectiles but not targeted.
 * dead: collapse animation playing, no longer interacts.
 */
export type ZombieState = 'walking' | 'eating' | 'dying' | 'dead';

export class Zombie {
  readonly kind = 'zombie';
  alive = true;
  x: number;
  prevX: number;
  health: number;
  readonly maxHealth: number;
  readonly armor: ArmorState[];
  /** Walking speed in px per tick. */
  speed: number;
  state: ZombieState = 'walking';
  eating: Plant | null = null;
  armLost = false;
  headLost = false;
  /** Ticks left in the collapse animation once dead. */
  deadTicks = 0;
  deathCause: ZombieDeath | null = null;
  anim = 'walk';
  animTick: number;
  readonly behaviors: ZombieBehavior[] = [];

  constructor(
    readonly id: number,
    readonly def: ZombieDef,
    readonly row: number,
    x: number,
    /** Top edge of the row. */
    readonly y: number,
    speed: number,
    /** Index of the wave that spawned it, -1 for scripted or debug spawns. */
    readonly wave: number,
    spawnTick: number,
  ) {
    this.x = x;
    this.prevX = x;
    this.health = def.health;
    this.maxHealth = def.health;
    this.armor = (def.armor ?? []).map((spec) => ({ spec, health: spec.health }));
    this.speed = speed;
    this.animTick = spawnTick;
  }

  get hitLeft(): number {
    return this.x + this.def.hitbox.left;
  }

  get hitRight(): number {
    return this.x + this.def.hitbox.left + this.def.hitbox.width;
  }

  get attackLeft(): number {
    return this.x + this.def.attackBox.left;
  }

  get attackRight(): number {
    return this.x + this.def.attackBox.left + this.def.attackBox.width;
  }

  /** Walking or eating with its head on: can be targeted, eat, and reach the house. */
  get active(): boolean {
    return this.state === 'walking' || this.state === 'eating';
  }

  /** Still occupies the lane for collisions (projectiles, mowers). */
  get collidable(): boolean {
    return this.state !== 'dead';
  }

  /** Body plus remaining armor health. */
  get totalHealth(): number {
    let total = Math.max(0, this.health);
    for (const layer of this.armor) total += layer.health;
    return total;
  }

  setAnim(name: string, tick: number): void {
    this.anim = name;
    this.animTick = tick;
  }
}

export class Projectile {
  readonly kind = 'projectile';
  alive = true;
  x: number;
  prevX: number;
  /** Horizontal speed in px per tick. */
  readonly vx: number;

  constructor(
    readonly id: number,
    readonly def: ProjectileDef,
    readonly row: number,
    x: number,
    readonly y: number,
    readonly ownerId: number,
  ) {
    this.x = x;
    this.prevX = x;
    this.vx = def.speed / 100;
  }
}

export type PickupKind = 'sun' | 'reward';
export type PickupMotion = 'sky' | 'toss' | 'drop';
export type PickupState = 'falling' | 'resting' | 'collecting';

export class Pickup {
  readonly kind: PickupKind;
  alive = true;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx = 0;
  vy = 0;
  state: PickupState = 'falling';
  /** Ticks spent resting on the ground. */
  age = 0;

  constructor(
    readonly id: number,
    kind: PickupKind,
    readonly value: number,
    x: number,
    y: number,
    readonly motion: PickupMotion,
    readonly landY: number,
    /** Resting ticks before it disappears; 0 means it never expires. */
    readonly lifetime: number,
    readonly rewards: readonly RewardSpec[] = [],
  ) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
  }

  get collectible(): boolean {
    return this.state !== 'collecting';
  }
}

export type MowerState = 'idle' | 'running' | 'gone';

export class LawnMower {
  readonly kind = 'mower';
  alive = true;
  state: MowerState = 'idle';
  x: number;
  prevX: number;

  constructor(
    readonly id: number,
    readonly row: number,
    x: number,
    readonly width: number,
    /** px per tick */
    readonly speed: number,
  ) {
    this.x = x;
    this.prevX = x;
  }
}

export type Entity = Plant | Zombie | Projectile | Pickup | LawnMower;
