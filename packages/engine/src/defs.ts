// Content definition formats understood by the simulation. Content packages
// author data against these types; the engine never reads content by path or
// compares ids directly, it only consumes resolved definitions.
//
// Units: durations are seconds, speeds are pixels per second, positions are
// board pixels. The engine converts to ticks when it builds runtime state.

export type Era = 'pvz1' | 'pvz2';
export type Seconds = number;
export type SurfaceType = 'grass' | 'water' | 'roof' | 'dirt' | 'none';

/** Which layer of a lawn cell a plant occupies. */
export type PlantSlot = 'main' | 'base' | 'cover';

export interface BehaviorSpec {
  readonly type: string;
  readonly [param: string]: unknown;
}

export interface ShooterSpec extends BehaviorSpec {
  readonly type: 'shooter';
  readonly projectile: string;
  /** Launch rate: time between target checks once the counter expires. */
  readonly interval: Seconds;
  /** A random amount in [0, intervalJitter) is subtracted from each new interval. */
  readonly intervalJitter: Seconds;
  /** Delay between deciding to attack and releasing the projectile (animation sync). */
  readonly fireDelay: Seconds;
  /** Counter value when the plant is placed. 0 means it checks on its first tick. */
  readonly initialDelay?: Seconds;
  /** Projectile spawn point relative to the cell's left edge and the row's top. */
  readonly spawnOffset: { readonly x: number; readonly y: number };
}

export interface ProducerSpec extends BehaviorSpec {
  readonly type: 'producer';
  readonly amount: number;
  /** Uniform range for the first production after planting. */
  readonly firstDelay: readonly [Seconds, Seconds];
  /** Uniform range for each later production. */
  readonly interval: readonly [Seconds, Seconds];
  /** How long before producing the plant starts glowing (presentation cue). */
  readonly glowLead?: Seconds;
}

export interface WalkerSpec extends BehaviorSpec {
  readonly type: 'walker';
}

export interface EaterSpec extends BehaviorSpec {
  readonly type: 'eater';
  readonly damage: number;
  readonly interval: Seconds;
}

export interface HitSpan {
  /** Offset from the entity's x anchor. */
  readonly left: number;
  readonly width: number;
}

export interface PlantDef {
  readonly id: string;
  readonly name: string;
  readonly era: Era;
  /** Campaign location (level or world id) where the plant is first earned. */
  readonly introducedIn: string;
  readonly cost: number;
  readonly recharge: Seconds;
  /** Recharge remaining when a level starts. Omitted means ready immediately. */
  readonly rechargeAtStart?: Seconds;
  readonly health: number;
  readonly slot?: PlantSlot;
  readonly surfaces?: readonly SurfaceType[];
  /** Horizontal span zombies collide with, relative to the cell's left edge. */
  readonly hitbox?: HitSpan;
  readonly behaviors: readonly BehaviorSpec[];
  /** Health fractions where the plant changes its damaged appearance. */
  readonly damageStages?: readonly number[];
  readonly tags: readonly string[];
  readonly description?: string;
  readonly audio?: Readonly<Record<string, string>>;
  readonly profiles?: Partial<Record<Era, PlantProfile>>;
}

export type PlantProfile = Partial<Omit<PlantDef, 'id' | 'era' | 'profiles'>>;

export type ArmorKind = 'helmet' | 'shield';

export interface ArmorSpec {
  readonly id: string;
  readonly kind: ArmorKind;
  readonly health: number;
  /** Drives impact sounds and effects, for example "plastic" for cones. */
  readonly material: string;
  /** Health fractions where the armor changes its damaged appearance. */
  readonly damageStages?: readonly number[];
}

export interface WaveSpawnSpec {
  /** PvZ 1 wave budget cost. */
  readonly value: number;
  /** Relative pick weight when generating waves. */
  readonly weight: number;
}

export interface ZombieDef {
  readonly id: string;
  readonly name: string;
  readonly era: Era;
  readonly introducedIn: string;
  /** Body health, excluding armor. */
  readonly health: number;
  /** The zombie loses its arm once body health drops below this. */
  readonly loseArmBelow?: number;
  /** The head falls off once body health drops below this; the zombie is then dying. */
  readonly dieBelow: number;
  /** Health lost per second while dying (headless). */
  readonly dyingDrain: number;
  /** Uniform walking speed range in px/s, rolled once per zombie. */
  readonly speed: readonly [number, number];
  readonly hitbox: HitSpan;
  readonly attackBox: HitSpan;
  readonly armor?: readonly ArmorSpec[];
  readonly behaviors: readonly BehaviorSpec[];
  readonly spawn?: WaveSpawnSpec;
  readonly tags: readonly string[];
  readonly description?: string;
  readonly profiles?: Partial<Record<Era, ZombieProfile>>;
}

export type ZombieProfile = Partial<Omit<ZombieDef, 'id' | 'era' | 'profiles'>>;

export interface ProjectileDef {
  readonly id: string;
  readonly era: Era;
  readonly motion: 'straight';
  readonly speed: number;
  readonly damage: number;
  readonly damageType: 'normal';
  /** Collision span starting at the projectile's x. */
  readonly width: number;
  readonly audio?: Readonly<Record<string, string>>;
}

export interface MowerSpec {
  /** Left edge of the idle mower. */
  readonly x: number;
  readonly width: number;
  readonly speed: number;
}

export interface SkySunSpec {
  readonly minX: number;
  readonly maxX: number;
  readonly startY: number;
  readonly minLandY: number;
  readonly maxLandY: number;
  readonly fallSpeed: number;
}

export interface BoardDef {
  readonly id: string;
  readonly name: string;
  readonly era: Era;
  readonly rows: number;
  readonly cols: number;
  /** Top-left corner of cell (0, 0). */
  readonly origin: { readonly x: number; readonly y: number };
  readonly tile: { readonly width: number; readonly height: number };
  /** Surface of each row; individual cells may override it. */
  readonly lanes: readonly SurfaceType[];
  readonly cellOverrides?: Readonly<Record<string, SurfaceType>>;
  readonly zombieSpawnX: number;
  readonly zombieSpawnJitter: number;
  /** Plants only target zombies whose hitbox starts left of this line (the screen edge). */
  readonly attackLimitX: number;
  /** A zombie whose hitbox passes left of this line has entered the house. */
  readonly houseX: number;
  readonly projectileLimitX: number;
  readonly mower?: MowerSpec;
  readonly skySun?: SkySunSpec;
  /** Where collected sun flies to; sun is credited on arrival. */
  readonly sunCollectTarget: { readonly x: number; readonly y: number };
  readonly view: BoardView;
}

export interface BoardView {
  readonly background: string;
  /** Horizontal extent of the background in board coordinates. */
  readonly minX: number;
  readonly maxX: number;
  readonly width: number;
  readonly height: number;
}

export interface WaveEntry {
  readonly zombie: string;
  readonly row?: number;
}

export interface WaveSpec {
  readonly flag?: boolean;
  readonly zombies: readonly (string | WaveEntry)[];
}

export interface SeedSelectionSpec {
  readonly mode: 'choose' | 'preset';
  readonly slots?: number;
  /** Plants lent for this level even if the profile does not own them. */
  readonly offered?: readonly string[];
  readonly forced?: readonly string[];
  readonly banned?: readonly string[];
}

export interface RewardSpec {
  readonly type: 'plant' | 'feature' | 'currency' | 'seed-slot' | 'note';
  readonly id?: string;
  readonly amount?: number;
}

export interface SystemSpec {
  readonly type: string;
  readonly [param: string]: unknown;
}

export interface LevelDef {
  readonly id: string;
  readonly era: Era;
  readonly world: string;
  readonly name: string;
  /** Short label shown in level lists, for example "1-1". */
  readonly label: string;
  readonly board: string;
  readonly startingSun: number;
  readonly seedSelection: SeedSelectionSpec;
  readonly waves: readonly WaveSpec[];
  readonly firstWaveDelay?: Seconds;
  readonly skySun: boolean;
  readonly mowers: boolean;
  /** Extra simulation systems (world mechanics) installed for this level. */
  readonly systems?: readonly SystemSpec[];
  readonly music?: string;
  readonly environment?: string;
  readonly rewards?: readonly RewardSpec[];
  readonly status?: ContentStatus;
}

/** Accuracy status mirrored in COMPATIBILITY.md. */
export type ContentStatus = 'exact' | 'close' | 'incomplete' | 'missing';
