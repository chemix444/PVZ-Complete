import type { WaveGeneratorSpec, WaveSpec, ZombieDef } from '../defs';
import type { Rng } from '../core/rng';
import { ticks } from '../core/time';
import type { SimContent, Simulation } from '../simulation';
import type { SimSystem } from './types';

// PvZ 1 wave pacing. After a wave spawns the next one is due in 2500..3100
// ticks. Once at least 401 ticks have passed, if the wave's remaining health
// falls to a random 50-65% of what it spawned with, the countdown drops to 200.
// A flag wave is preceded by the "huge wave" warning and a 750 tick hold.
export const WAVE_INTERVAL = 2500;
export const WAVE_INTERVAL_RANDOM = 600;
export const WAVE_ACCELERATED = 200;
export const WAVE_ACCELERATE_AFTER = 400;
export const WAVE_HEALTH_MIN = 0.5;
export const WAVE_HEALTH_MAX = 0.65;
export const HUGE_WAVE_HOLD = 750;
export const DEFAULT_FIRST_WAVE_DELAY = 18;

export class WaveSystem implements SimSystem {
  readonly id = 'waves';
  readonly total: number;
  readonly waves: readonly WaveSpec[];
  spawned = 0;
  countdown: number;
  countdownStart: number;
  waveHealthStart = 0;
  healthToNext = 0;
  hugeWaveWarned = false;
  /** Set by level scripts: the countdown does not run. */
  held = false;
  /** Picks since each row was last chosen; drives spawn row smoothing. */
  private readonly sinceLastPick: number[];
  private readonly rowWeights: number[];
  private readonly risers: ZombieDef[];

  constructor(sim: Simulation) {
    const level = sim.level;
    this.waves = level.waveGenerator ? generateWaves(level.waveGenerator, sim.rng, sim.content) : level.waves;
    this.total = this.waves.length;
    this.countdown = ticks(level.firstWaveDelay ?? DEFAULT_FIRST_WAVE_DELAY);
    this.countdownStart = this.countdown;
    this.sinceLastPick = new Array(sim.lawn.rows).fill(3);
    this.rowWeights = new Array(sim.lawn.rows).fill(0);
    const riserIds = new Set<string>();
    for (const wave of this.waves) for (const entry of wave.zombies) riserIds.add(typeof entry === 'string' ? entry : entry.zombie);
    this.risers = [...riserIds].map((id) => sim.content.zombie(id)).filter((def) => def.spawn && def.spawn.weight > 0);
  }

  get finished(): boolean {
    return this.spawned >= this.total;
  }

  wave(index: number): WaveSpec {
    return this.waves[index];
  }

  /** Lets a held countdown run again, optionally restarting it `delay` ticks from now. */
  release(delay?: number): void {
    this.held = false;
    if (delay !== undefined && this.spawned === 0) {
      // Scripts run before this system in the same tick, so count this tick too.
      this.countdown = Math.max(1, delay) + 1;
      this.countdownStart = this.countdown;
    }
  }

  update(sim: Simulation): void {
    if (sim.phase !== 'playing' || this.finished || this.held) return;
    this.countdown--;
    if (
      this.spawned > 0 &&
      !this.hugeWaveWarned &&
      this.countdown > WAVE_ACCELERATED &&
      this.countdownStart - this.countdown > WAVE_ACCELERATE_AFTER &&
      this.currentWaveHealth(sim) <= this.healthToNext
    ) {
      this.countdown = WAVE_ACCELERATED;
    }
    if (this.countdown > 0) return;

    const next = this.waves[this.spawned];
    if (next.flag && !this.hugeWaveWarned) {
      this.hugeWaveWarned = true;
      this.countdown = HUGE_WAVE_HOLD;
      sim.emit({ type: 'huge-wave-warning', wave: this.spawned + 1 });
      return;
    }
    this.spawnWave(sim, next);
  }

  /** Forces the next wave (or the huge wave warning) on the next tick. */
  skip(): void {
    if (!this.finished) {
      this.countdown = 1;
      this.held = false;
    }
  }

  /** Remaining health of hostile zombies from the most recent wave. */
  currentWaveHealth(sim: Simulation): number {
    const wave = this.spawned - 1;
    let total = 0;
    for (const zombie of sim.zombies) {
      if (zombie.wave === wave && zombie.hostile) total += zombie.totalHealth;
    }
    return total;
  }

  /** Level progress meter fill, 0..1. */
  progress(): number {
    if (this.total === 0 || this.finished) return 1;
    if (this.spawned === 0) return 0;
    const elapsed = this.hugeWaveWarned
      ? 1
      : Math.min(1, Math.max(0, (this.countdownStart - this.countdown) / this.countdownStart));
    return (this.spawned + elapsed) / this.total;
  }

  private spawnWave(sim: Simulation, wave: WaveSpec): void {
    const index = this.spawned++;
    this.hugeWaveWarned = false;
    const board = sim.board;
    const fromGraves = sim.level.mode === 'whack';
    for (const entry of wave.zombies) {
      const id = typeof entry === 'string' ? entry : entry.zombie;
      const fixedRow = typeof entry === 'string' ? undefined : entry.row;
      const grave = fromGraves ? sim.randomGrave() : null;
      if (grave) {
        sim.spawnZombie(id, grave.row, sim.zombieXForCell(grave.col, id), index, true);
        continue;
      }
      const row = fixedRow ?? this.pickRow(sim);
      sim.spawnZombie(id, row, board.zombieSpawnX + sim.rng.int(board.zombieSpawnJitter), index);
    }
    sim.emit({ type: 'wave-spawned', wave: index + 1, total: this.total, flag: wave.flag === true });
    if (this.finished) {
      sim.emit({ type: 'final-wave' });
      if (sim.level.gravesRiseOnFinalWave) this.raiseFromGraves(sim, index);
    }

    this.waveHealthStart = this.currentWaveHealth(sim);
    this.healthToNext = Math.floor(this.waveHealthStart * sim.rng.floatRange(WAVE_HEALTH_MIN, WAVE_HEALTH_MAX));
    if (!this.finished) {
      this.countdown = WAVE_INTERVAL + sim.rng.int(WAVE_INTERVAL_RANDOM + 1);
      this.countdownStart = this.countdown;
    }
  }

  // Night levels: on the final wave a zombie climbs out of every grave.
  private raiseFromGraves(sim: Simulation, wave: number): void {
    if (this.risers.length === 0) return;
    for (const grave of sim.graves()) {
      const def = pickWeighted(sim.rng, this.risers, Infinity) ?? this.risers[0];
      sim.spawnZombie(def.id, grave.row, sim.zombieXForCell(grave.col, def.id), wave, true);
    }
  }

  // Rows picked recently are less likely to be picked again. PvZ 1 smooths
  // row picks in a similar way; the exact weights here are an approximation.
  private pickRow(sim: Simulation): number {
    const rows = sim.lawn.rows;
    let total = 0;
    for (let row = 0; row < rows; row++) {
      const weight = sim.lawn.isLane(row) ? Math.min(2, 0.25 + 0.5 * this.sinceLastPick[row]) : 0;
      this.rowWeights[row] = weight;
      total += weight;
    }
    if (total === 0) throw new Error(`Board ${sim.board.id} has no lane zombies can spawn in`);
    let roll = sim.rng.float() * total;
    let picked = -1;
    for (let row = 0; row < rows; row++) {
      if (this.rowWeights[row] === 0) continue;
      picked = row;
      roll -= this.rowWeights[row];
      if (roll < 0) break;
    }
    for (let row = 0; row < rows; row++) this.sinceLastPick[row]++;
    this.sinceLastPick[picked] = 0;
    return picked;
  }
}

/** Weighted pick among zombies whose wave value fits the budget. */
function pickWeighted(rng: Rng, pool: readonly ZombieDef[], budget: number): ZombieDef | null {
  let total = 0;
  for (const def of pool) if (def.spawn!.value <= budget) total += def.spawn!.weight;
  if (total <= 0) return null;
  let roll = rng.float() * total;
  for (const def of pool) {
    if (def.spawn!.value > budget) continue;
    roll -= def.spawn!.weight;
    if (roll < 0) return def;
  }
  return null;
}

// PvZ 1 adventure waves: wave i (from 0) has a budget of floor(i / 3) + 1,
// multiplied by 2.5 on flag waves, which also start with the flag zombie.
// Zombies are drawn by pick weight among types whose value fits the remaining
// budget. A newly introduced zombie leads the first wave. This follows the
// original's structure; its extra per-level rules are not reproduced.
export function generateWaves(spec: WaveGeneratorSpec, rng: Rng, content: SimContent): WaveSpec[] {
  const flagEvery = spec.flagEvery ?? 10;
  const pool = spec.zombies.map((id) => content.zombie(id)).filter((def) => def.spawn && def.spawn.weight > 0);
  const waves: WaveSpec[] = [];
  for (let i = 0; i < spec.waves; i++) {
    const flag = (i + 1) % flagEvery === 0 || i === spec.waves - 1;
    let budget = Math.floor(i / 3) + 1;
    if (flag) budget = Math.floor(budget * 2.5);
    const zombies: string[] = [];
    if (flag && spec.flagZombie) zombies.push(spec.flagZombie);
    if (i === 0 && spec.introduce) {
      zombies.push(spec.introduce);
      budget -= content.zombie(spec.introduce).spawn?.value ?? budget;
    }
    while (budget > 0) {
      const def = pickWeighted(rng, pool, budget);
      if (!def) break;
      zombies.push(def.id);
      budget -= def.spawn!.value;
    }
    waves.push({ flag, zombies });
  }
  return waves;
}
