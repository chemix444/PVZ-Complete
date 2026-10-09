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
  /** Nocturnal plants on daytime boards sleep and do nothing. */
  sleeping = false;
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
 * walking: moving and able to eat. eating: stopped on a plant (or, for
 * hypnotized zombies, on another zombie).
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
  /** What it is biting: a plant, or a zombie when hypnotized or fighting one. */
  eating: Plant | Zombie | null = null;
  armLost = false;
  headLost = false;
  /** Status timers in ticks. */
  chillTicks = 0;
  freezeTicks = 0;
  /** Still climbing out of the ground: cannot move, eat or be targeted. */
  risingTicks = 0;
  /** Walks right and fights other zombies. */
  hypnotized = false;
  /** Set by behaviors that replace normal eating (running Pole Vaulter). */
  noEat = false;
  /** Set by behaviors that move the zombie themselves (mid-vault, summoning). */
  locked = false;
  /** Shared rhythm origin for a dance group (Dancing Zombie and its backups). */
  syncTick = 0;
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

  /** Walking or eating with its head on, out of the ground. */
  get active(): boolean {
    return (this.state === 'walking' || this.state === 'eating') && this.risingTicks <= 0;
  }

  /** An active zombie on the zombies' side: targeted by plants, triggers mowers, can reach the house. */
  get hostile(): boolean {
    return this.active && !this.hypnotized;
  }

  /** Movement and bite rate multiplier from status effects. */
  get speedFactor(): number {
    if (this.freezeTicks > 0) return 0;
    return this.chillTicks > 0 ? 0.5 : 1;
  }

  /** Horizontal center of the hitbox. */
  get centerX(): number {
    return this.x + this.def.hitbox.left + this.def.hitbox.width / 2;
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
  readonly startX: number;

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
    this.startX = x;
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

export type GridItemKind = 'grave' | 'crater';

/** Something occupying a lawn cell that is not a plant (graves, craters). */
export class GridItem {
  alive = true;

  constructor(
    readonly id: number,
    readonly kind: GridItemKind,
    readonly row: number,
    readonly col: number,
    /** Ticks until it disappears; 0 means permanent. */
    public ticksLeft: number,
    /** Picks one of several looks. */
    readonly variant: number,
  ) {}
}

/** A rolling Wall-nut (Wall-nut Bowling). */
export class Roller {
  readonly kind = 'roller';
  alive = true;
  x: number;
  /** Vertical center of the nut. */
  y: number;
  prevX: number;
  prevY: number;
  /** px per tick */
  readonly vx: number;
  vy = 0;
  hits = 0;
  /** Zombie hit last, so one zombie is not hit twice in a row. */
  lastHitId = -1;

  constructor(
    readonly id: number,
    readonly def: PlantDef,
    x: number,
    y: number,
    vx: number,
    readonly damage: number,
    readonly explode: boolean,
  ) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = vx;
  }
}

export type Entity = Plant | Zombie | Projectile | Pickup | LawnMower | GridItem | Roller;
