import type { WaveSpec } from '../defs';
import { ticks } from '../core/time';
import type { Simulation } from '../simulation';
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
  spawned = 0;
  countdown: number;
  countdownStart: number;
  waveHealthStart = 0;
  healthToNext = 0;
  hugeWaveWarned = false;
  /** Picks since each row was last chosen; drives spawn row smoothing. */
  private readonly sinceLastPick: number[];
  private readonly rowWeights: number[];

  constructor(sim: Simulation, private readonly waves: readonly WaveSpec[]) {
    this.total = waves.length;
    this.countdown = ticks(sim.level.firstWaveDelay ?? DEFAULT_FIRST_WAVE_DELAY);
    this.countdownStart = this.countdown;
    this.sinceLastPick = new Array(sim.lawn.rows).fill(3);
    this.rowWeights = new Array(sim.lawn.rows).fill(0);
  }

  get finished(): boolean {
    return this.spawned >= this.total;
  }

  wave(index: number): WaveSpec {
    return this.waves[index];
  }

  update(sim: Simulation): void {
    if (sim.phase !== 'playing' || this.finished) return;
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
    if (!this.finished) this.countdown = 1;
  }

  /** Remaining health of active zombies from the most recent wave. */
  currentWaveHealth(sim: Simulation): number {
    const wave = this.spawned - 1;
    let total = 0;
    for (const zombie of sim.zombies) {
      if (zombie.wave === wave && zombie.active) total += zombie.totalHealth;
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
    for (const entry of wave.zombies) {
      const id = typeof entry === 'string' ? entry : entry.zombie;
      const fixedRow = typeof entry === 'string' ? undefined : entry.row;
      const row = fixedRow ?? this.pickRow(sim);
      sim.spawnZombie(id, row, board.zombieSpawnX + sim.rng.int(board.zombieSpawnJitter), index);
    }
    sim.emit({ type: 'wave-spawned', wave: index + 1, total: this.total, flag: wave.flag === true });
    if (this.finished) sim.emit({ type: 'final-wave' });

    this.waveHealthStart = this.currentWaveHealth(sim);
    this.healthToNext = Math.floor(this.waveHealthStart * sim.rng.floatRange(WAVE_HEALTH_MIN, WAVE_HEALTH_MAX));
    if (!this.finished) {
      this.countdown = WAVE_INTERVAL + sim.rng.int(WAVE_INTERVAL_RANDOM + 1);
      this.countdownStart = this.countdown;
    }
  }

  // Rows picked recently are less likely to be picked again. PvZ 1 smooths
  // row picks in a similar way; the exact weights here are an approximation.
  private pickRow(sim: Simulation): number {
    const rows = sim.lawn.rows;
    let total = 0;
    for (let row = 0; row < rows; row++) {
      const weight = sim.lawn.surface(row, sim.lawn.cols - 1) === 'grass'
        ? Math.min(2, 0.25 + 0.5 * this.sinceLastPick[row])
        : 0;
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
