import type { DancerSpec, DanceStepSpec, EaterSpec, PoleVaultSpec, RageSpec, ZombieDef } from '../defs';
import { Plant, type Zombie } from '../entities';
import type { Simulation } from '../simulation';
import { ticks } from '../core/time';
import { registerZombieBehavior, type ZombieBehavior } from './types';

/** Moves at the zombie's speed (scaled by chill and freeze) unless something else holds it. */
export class WalkerBehavior implements ZombieBehavior {
  readonly type = 'walker';

  update(_sim: Simulation, zombie: Zombie): void {
    if (zombie.locked || zombie.risingTicks > 0) return;
    if (zombie.state !== 'walking' && zombie.state !== 'dying') return;
    const step = zombie.speed * zombie.speedFactor;
    zombie.x += zombie.hypnotized ? step : -step;
  }
}

// Bites whatever overlaps the zombie's attack box: plants first, then a
// zombie of the other side. Hypnotized zombies face right and bite zombies.
// Must run before the walker so a zombie stops on the tick it reaches food.
export class EaterBehavior implements ZombieBehavior {
  readonly type = 'eater';
  private readonly damage: number;
  private readonly interval: number;
  biteCounter = 0;

  constructor(spec: EaterSpec) {
    this.damage = spec.damage;
    this.interval = Math.max(1, ticks(spec.interval));
  }

  update(sim: Simulation, zombie: Zombie): void {
    if (!zombie.active || zombie.noEat) return;
    const current = zombie.eating;
    const target = current && stillInReach(zombie, current) ? current : findFood(sim, zombie);
    if (!target) {
      if (zombie.state === 'eating') {
        zombie.state = 'walking';
        zombie.eating = null;
        zombie.setAnim('walk', sim.tick);
      }
      return;
    }
    if (target !== current) {
      // The first bite lands one full interval after contact.
      zombie.eating = target;
      zombie.state = 'eating';
      zombie.setAnim('eat', sim.tick);
      this.biteCounter = this.interval;
      if (target instanceof Plant) sim.emit({ type: 'zombie-started-eating', zombieId: zombie.id, plantId: target.id });
      return;
    }
    this.biteCounter -= zombie.speedFactor;
    if (this.biteCounter <= 0) {
      this.biteCounter += this.interval;
      if (target instanceof Plant) sim.bitePlant(target, zombie, this.damage);
      else sim.damageZombie(target, this.damage, 'bite');
    }
  }

  debug(): Record<string, unknown> {
    return { biteCounter: this.biteCounter };
  }
}

/** Attack span, mirrored to the right side for hypnotized zombies. */
export function attackSpan(zombie: Zombie): [number, number] {
  if (!zombie.hypnotized) return [zombie.attackLeft, zombie.attackRight];
  const center = zombie.centerX;
  return [2 * center - zombie.attackRight, 2 * center - zombie.attackLeft];
}

function overlapsPlant(zombie: Zombie, plant: Plant): boolean {
  return zombie.attackLeft < plant.hitRight && zombie.attackRight > plant.hitLeft;
}

function canFight(zombie: Zombie, other: Zombie): boolean {
  if (other === zombie || other.row !== zombie.row || other.hypnotized === zombie.hypnotized) return false;
  if (other.state === 'dead' || other.risingTicks > 0) return false;
  const [left, right] = attackSpan(zombie);
  return left < other.hitRight && right > other.hitLeft;
}

function stillInReach(zombie: Zombie, target: Plant | Zombie): boolean {
  if (!target.alive) return false;
  return target instanceof Plant ? overlapsPlant(zombie, target) : canFight(zombie, target);
}

function findFood(sim: Simulation, zombie: Zombie): Plant | Zombie | null {
  if (!zombie.hypnotized) {
    const plant = findPlantToEat(sim, zombie);
    if (plant) return plant;
  }
  let best: Zombie | null = null;
  for (const other of sim.zombies) {
    if (!canFight(zombie, other)) continue;
    if (!best || (zombie.hypnotized ? other.x < best.x : other.x > best.x)) best = other;
  }
  return best;
}

const SLOT_PRIORITY = { cover: 2, main: 1, base: 0 } as const;

/** The plant a zombie bites: highest layer first, then the rightmost. */
export function findPlantToEat(sim: Simulation, zombie: Zombie): Plant | null {
  let best: Plant | null = null;
  for (const plant of sim.plants) {
    if (plant.row !== zombie.row || !plant.alive || !overlapsPlant(zombie, plant)) continue;
    if (
      !best ||
      SLOT_PRIORITY[plant.slot] > SLOT_PRIORITY[best.slot] ||
      (plant.slot === best.slot && plant.hitRight > best.hitRight)
    ) {
      best = plant;
    }
  }
  return best;
}

type VaultPhase = 'running' | 'vaulting' | 'walking';

// Runs without eating until it reaches a plant, vaults over it, then walks
// and eats normally. Tall plants stop the vault. Must run before the eater.
export class PoleVaultBehavior implements ZombieBehavior {
  readonly type = 'pole-vault';
  phase: VaultPhase = 'running';
  private timer = 0;
  private fromX = 0;
  private toX = 0;
  private readonly vaultTicks: number;
  private readonly walkSpeed: number;

  constructor(spec: PoleVaultSpec, zombie: Zombie, sim: Simulation) {
    this.vaultTicks = Math.max(1, ticks(spec.vaultTime));
    this.walkSpeed = zombie.speed;
    zombie.speed = sim.rng.floatRange(spec.runSpeed[0], spec.runSpeed[1]) / 100;
    zombie.noEat = true;
    zombie.setAnim('run', sim.tick);
  }

  update(sim: Simulation, zombie: Zombie): void {
    if (this.phase === 'walking') return;
    if (!zombie.active) {
      this.land(zombie);
      return;
    }
    if (this.phase === 'running') {
      const plant = findPlantToEat(sim, zombie);
      if (!plant) return;
      if (plant.def.tags.includes('tall')) {
        this.land(zombie);
        zombie.setAnim('walk', sim.tick);
        return;
      }
      this.phase = 'vaulting';
      this.timer = this.vaultTicks;
      this.fromX = zombie.x;
      this.toX = plant.hitLeft - zombie.def.hitbox.left - zombie.def.hitbox.width - 1;
      zombie.locked = true;
      zombie.setAnim('vault', sim.tick);
      sim.emit({ type: 'zombie-vaulted', zombieId: zombie.id });
      return;
    }
    if (zombie.speedFactor === 0) return;
    this.timer--;
    zombie.x = this.fromX + (this.toX - this.fromX) * (1 - this.timer / this.vaultTicks);
    if (this.timer <= 0) {
      this.land(zombie);
      zombie.setAnim('walk', sim.tick);
    }
  }

  private land(zombie: Zombie): void {
    this.phase = 'walking';
    zombie.locked = false;
    zombie.noEat = false;
    zombie.speed = this.walkSpeed;
  }

  debug(): Record<string, unknown> {
    return { phase: this.phase, timer: this.timer };
  }
}

type RagePhase = 'calm' | 'shock' | 'angry';

/** Newspaper Zombie: when its paper is destroyed it stops in shock, then charges. */
export class RageBehavior implements ZombieBehavior {
  readonly type = 'rage';
  phase: RagePhase = 'calm';
  private timer = 0;

  constructor(private readonly spec: RageSpec) {}

  update(sim: Simulation, zombie: Zombie): void {
    if (this.phase === 'angry' || !zombie.active) return;
    if (this.phase === 'calm') {
      const paper = zombie.armor.find((layer) => layer.spec.id === this.spec.armor);
      if (paper && paper.health > 0) return;
      this.phase = 'shock';
      this.timer = Math.max(1, ticks(this.spec.shock));
      zombie.locked = true;
      zombie.noEat = true;
      zombie.eating = null;
      zombie.state = 'walking';
      zombie.setAnim('shock', sim.tick);
      sim.emit({ type: 'zombie-enraged', zombieId: zombie.id });
      return;
    }
    if (--this.timer > 0) return;
    this.phase = 'angry';
    zombie.locked = false;
    zombie.noEat = false;
    zombie.speed = sim.rng.floatRange(this.spec.speed[0], this.spec.speed[1]) / 100;
    zombie.setAnim('walk', sim.tick);
  }
}

/** Walk-pause rhythm shared through `syncTick`; holds the zombie during pauses. */
export class DanceStepBehavior implements ZombieBehavior {
  readonly type = 'dance-step';
  private readonly walk: number;
  private readonly cycle: number;

  constructor(spec: DanceStepSpec) {
    this.walk = ticks(spec.walk);
    this.cycle = this.walk + ticks(spec.pause);
  }

  update(sim: Simulation, zombie: Zombie): void {
    if (zombie.anim === 'moonwalk' || zombie.anim === 'summon') return;
    zombie.locked = zombie.active && (sim.tick - zombie.syncTick) % this.cycle >= this.walk;
  }
}

type DancerPhase = 'moonwalk' | 'summon' | 'dance';
const FORMATION = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
] as const;

// Moonwalks onto the lawn, stops to summon four backup dancers (in front,
// behind, above and below), then dances. Missing dancers are replaced
// whenever the summon timer comes round.
export class DancerBehavior implements ZombieBehavior {
  readonly type = 'dancer';
  phase: DancerPhase = 'moonwalk';
  private timer = 0;
  private resummonIn = 0;
  private readonly backups: (Zombie | null)[] = [null, null, null, null];
  private readonly backupDef: ZombieDef;

  constructor(
    private readonly spec: DancerSpec,
    zombie: Zombie,
    sim: Simulation,
  ) {
    this.backupDef = sim.content.zombie(spec.backup);
    zombie.noEat = true;
    zombie.locked = true;
    zombie.setAnim('moonwalk', sim.tick);
  }

  update(sim: Simulation, zombie: Zombie): void {
    if (!zombie.active) return;
    const factor = zombie.speedFactor;
    switch (this.phase) {
      case 'moonwalk':
        zombie.x -= (this.spec.moonwalkSpeed / 100) * factor;
        if (zombie.hitLeft < this.spec.stopX) this.startSummon(sim, zombie);
        return;
      case 'summon':
        if (factor === 0) return;
        if (--this.timer > 0) return;
        this.summon(sim, zombie);
        this.phase = 'dance';
        this.resummonIn = ticks(this.spec.resummonEvery);
        zombie.locked = false;
        zombie.noEat = false;
        zombie.setAnim('walk', sim.tick);
        return;
      case 'dance':
        if (zombie.state === 'eating' || --this.resummonIn > 0) return;
        this.resummonIn = ticks(this.spec.resummonEvery);
        if (this.backups.some((b, i) => this.slotValid(sim, zombie, i) && (!b || !b.alive || b.state === 'dead'))) {
          this.startSummon(sim, zombie);
        }
    }
  }

  private startSummon(sim: Simulation, zombie: Zombie): void {
    this.phase = 'summon';
    this.timer = Math.max(1, ticks(this.spec.summonTime));
    zombie.locked = true;
    zombie.noEat = true;
    zombie.eating = null;
    zombie.state = 'walking';
    zombie.setAnim('summon', sim.tick);
  }

  private slotValid(sim: Simulation, zombie: Zombie, slot: number): boolean {
    const row = zombie.row + FORMATION[slot][1];
    return row >= 0 && row < sim.lawn.rows && sim.lawn.isLane(row);
  }

  private summon(sim: Simulation, zombie: Zombie): void {
    zombie.syncTick = sim.tick;
    for (const backup of this.backups) if (backup && backup.alive) backup.syncTick = sim.tick;
    for (let slot = 0; slot < FORMATION.length; slot++) {
      const existing = this.backups[slot];
      if ((existing && existing.alive && existing.state !== 'dead') || !this.slotValid(sim, zombie, slot)) continue;
      const [dx, dy] = FORMATION[slot];
      const x = zombie.x + dx * sim.board.tile.width;
      const backup = sim.spawnZombie(this.backupDef.id, zombie.row + dy, x, zombie.wave, true);
      backup.syncTick = sim.tick;
      this.backups[slot] = backup;
      sim.emit({ type: 'backup-summoned', zombieId: backup.id, dancerId: zombie.id });
    }
  }

  debug(): Record<string, unknown> {
    return { phase: this.phase, timer: this.timer, resummonIn: this.resummonIn };
  }
}

registerZombieBehavior('walker', () => new WalkerBehavior());
registerZombieBehavior('eater', (spec) => new EaterBehavior(spec as EaterSpec));
registerZombieBehavior('pole-vault', (spec, zombie, sim) => new PoleVaultBehavior(spec as PoleVaultSpec, zombie, sim));
registerZombieBehavior('rage', (spec) => new RageBehavior(spec as RageSpec));
registerZombieBehavior('dance-step', (spec) => new DanceStepBehavior(spec as DanceStepSpec));
registerZombieBehavior('dancer', (spec, zombie, sim) => new DancerBehavior(spec as DancerSpec, zombie, sim));
