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
  /** Projectiles per attack (Repeater fires 2). */
  readonly burst?: number;
  /** Time between projectiles of one burst. */
  readonly burstGap?: Seconds;
  /** Only targets zombies within this many pixels of the plant's right edge. */
  readonly range?: number;
  /** Hides and stops attacking while a zombie is this close (Scaredy-shroom). */
  readonly hideWithin?: number;
}

/** Lane attack that hits every zombie in range at once (Fume-shroom). */
export interface FumeSpec extends BehaviorSpec {
  readonly type: 'fume';
  readonly damage: number;
  readonly interval: Seconds;
  readonly intervalJitter: Seconds;
  readonly fireDelay: Seconds;
  /** Reach in pixels past the plant's right edge. */
  readonly range: number;
}

/** Instant plants that blow up after a fuse (Cherry Bomb, Doom-shroom). */
export interface ExplodeSpec extends BehaviorSpec {
  readonly type: 'explode';
  readonly fuse: Seconds;
  readonly damage: number;
  /** Cells reached on each side of the plant: 1 x 1 means a 3x3 square. */
  readonly cols: number;
  readonly rows: number;
  /** Visual and sound cue. */
  readonly effect: string;
  /** Leaves a crater that blocks planting for this long. */
  readonly crater?: Seconds;
}

/** Freezes every zombie on the lawn (Ice-shroom). */
export interface FreezeAllSpec extends BehaviorSpec {
  readonly type: 'freeze-all';
  readonly fuse: Seconds;
  readonly damage: number;
  readonly freeze: Seconds;
  /** Chill applied after the freeze wears off. */
  readonly chill: Seconds;
}

export interface MineSpec extends BehaviorSpec {
  readonly type: 'mine';
  readonly armTime: Seconds;
  readonly damage: number;
  /** Blast span around the mine's cell, in pixels on each side. */
  readonly blast: number;
}

export interface ChomperSpec extends BehaviorSpec {
  readonly type: 'chomper';
  /** How far past the plant's cell a zombie can be bitten, in pixels. */
  readonly reach: number;
  readonly biteDelay: Seconds;
  readonly chewTime: Seconds;
  /** Damage dealt to zombies too large to swallow. */
  readonly largeDamage: number;
}

/** Turns the zombie that bites it (Hypno-shroom). */
export interface HypnotizeSpec extends BehaviorSpec {
  readonly type: 'hypnotize';
}

export interface GraveBusterSpec extends BehaviorSpec {
  readonly type: 'grave-buster';
  readonly time: Seconds;
}

/** Rolls down the lane on placement (Wall-nut Bowling). */
export interface BowlSpec extends BehaviorSpec {
  readonly type: 'bowl';
  readonly speed: number;
  readonly damage: number;
  readonly explode: boolean;
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
  /** Grows after this long and then produces `grownAmount` (Sun-shroom). */
  readonly growAfter?: Seconds;
  readonly grownAmount?: number;
}

export interface WalkerSpec extends BehaviorSpec {
  readonly type: 'walker';
}

/** Runs, then vaults over the first plant it reaches (Pole Vaulting Zombie). */
export interface PoleVaultSpec extends BehaviorSpec {
  readonly type: 'pole-vault';
  readonly runSpeed: readonly [number, number];
  readonly vaultTime: Seconds;
}

/** Speeds up once its newspaper is destroyed. */
export interface RageSpec extends BehaviorSpec {
  readonly type: 'rage';
  /** Armor id whose loss triggers the rage. */
  readonly armor: string;
  readonly shock: Seconds;
  readonly speed: readonly [number, number];
}

/** Moonwalks in, summons backup dancers and dances (Dancing Zombie). */
export interface DancerSpec extends BehaviorSpec {
  readonly type: 'dancer';
  readonly backup: string;
  readonly moonwalkSpeed: number;
  /** Stops moonwalking once its hitbox passes this x. */
  readonly stopX: number;
  readonly summonTime: Seconds;
  readonly resummonEvery: Seconds;
}

/** Walk-pause rhythm shared by a dance group. */
export interface DanceStepSpec extends BehaviorSpec {
  readonly type: 'dance-step';
  readonly walk: Seconds;
  readonly pause: Seconds;
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
  /** Mushrooms sleep on daytime boards. */
  readonly nocturnal?: boolean;
  /** Placed on a grid item instead of an empty cell (Grave Buster on graves). */
  readonly placeOn?: 'grave';
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
  /** Disappears after travelling this far (Puff-shroom spores). */
  readonly maxDistance?: number;
  /** Chills the zombie it hits for this long (Snow Pea). */
  readonly chill?: Seconds;
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
  /** Daytime boards make nocturnal plants sleep. */
  readonly daytime: boolean;
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
  /** conveyor: no seed bank; packets arrive on a belt and cost no sun. */
  readonly mode: 'choose' | 'preset' | 'conveyor';
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

/** PvZ 1 style wave building from zombie budgets; see WaveGenerator. */
export interface WaveGeneratorSpec {
  readonly waves: number;
  readonly flagEvery?: number;
  /** Zombie types the generator may pick. */
  readonly zombies: readonly string[];
  /** A zombie type new to this level, guaranteed in the first wave. */
  readonly introduce?: string;
  /** Leads every flag wave. */
  readonly flagZombie?: string;
}

export interface ConveyorSpec {
  readonly plants: readonly { readonly plant: string; readonly weight: number }[];
  /** Seconds between deliveries while the belt has room. */
  readonly interval: Seconds;
  readonly capacity: number;
}

export interface GraveSpec {
  readonly count: number;
  /** First column graves may occupy. */
  readonly minCol: number;
}

export type ScriptTrigger =
  | { readonly on: 'start' }
  | { readonly on: 'time'; readonly at: Seconds }
  | { readonly on: 'planted'; readonly count: number; readonly plant?: string }
  | { readonly on: 'sun-collected'; readonly count: number }
  | { readonly on: 'dug'; readonly count: number }
  | { readonly on: 'killed'; readonly count: number }
  | { readonly on: 'wave'; readonly wave: number }
  | { readonly on: 'after'; readonly script: string; readonly delay: Seconds };

export type ScriptAction =
  | { readonly do: 'message'; readonly text: string; readonly duration?: Seconds }
  | { readonly do: 'hold-waves' }
  | { readonly do: 'release-waves'; readonly delay?: Seconds }
  | { readonly do: 'hold-sky-sun' }
  | { readonly do: 'release-sky-sun' }
  | { readonly do: 'drop-sun'; readonly x?: number }
  | { readonly do: 'add-sun'; readonly amount: number }
  | { readonly do: 'spawn-zombie'; readonly zombie: string; readonly row: number; readonly x?: number }
  | { readonly do: 'start-conveyor' }
  | { readonly do: 'stop-conveyor' };

/** Level scripting: when the trigger first holds, the actions run once, in order. */
export interface ScriptSpec {
  readonly id: string;
  readonly when: ScriptTrigger;
  readonly actions: readonly ScriptAction[];
}

export interface LevelDef {
  readonly id: string;
  readonly era: Era;
  readonly world: string;
  readonly name: string;
  /** Short label shown in level lists, for example "1-1". */
  readonly label: string;
  readonly board: string;
  /** Per-row surface override; unsodded rows are 'dirt'. */
  readonly lanes?: readonly SurfaceType[];
  readonly startingSun: number;
  readonly seedSelection: SeedSelectionSpec;
  /** Written-out waves; ignored when `waveGenerator` is set. */
  readonly waves: readonly WaveSpec[];
  readonly waveGenerator?: WaveGeneratorSpec;
  readonly firstWaveDelay?: Seconds;
  readonly skySun: boolean;
  readonly mowers: boolean;
  /** Plants already on the lawn when the level starts. */
  readonly startingPlants?: readonly { readonly plant: string; readonly row: number; readonly col: number }[];
  readonly graves?: GraveSpec;
  /** Zombies of the final wave also rise from every grave. */
  readonly gravesRiseOnFinalWave?: boolean;
  /** Plants may only go in the first N columns (Wall-nut Bowling). */
  readonly plantableCols?: number;
  readonly conveyor?: ConveyorSpec;
  /** Gameplay variant; 'whack' spawns zombies from graves and arms the mallet. */
  readonly mode?: 'normal' | 'whack';
  /** true: the shovel is offered even before the profile owns it. false: never offered here. */
  readonly shovel?: boolean;
  readonly scripts?: readonly ScriptSpec[];
  /** Extra simulation systems (world mechanics) installed for this level. */
  readonly systems?: readonly SystemSpec[];
  readonly music?: string;
  readonly environment?: string;
  readonly rewards?: readonly RewardSpec[];
  readonly status?: ContentStatus;
}

/** Accuracy status mirrored in COMPATIBILITY.md. */
export type ContentStatus = 'exact' | 'close' | 'incomplete' | 'missing';
