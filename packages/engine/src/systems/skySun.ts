import type { Simulation } from '../simulation';
import type { SimSystem } from './types';

// PvZ 1 sky sun: the next drop comes after min(950, 425 + 10 * fallen) plus
// a random 0..274 ticks, so drops slow from ~4.25-7s to ~9.5-12.25s apart.
export const SKY_SUN_BASE = 425;
export const SKY_SUN_STEP = 10;
export const SKY_SUN_MAX = 950;
export const SKY_SUN_RANDOM = 275;

export class SkySunSystem implements SimSystem {
  readonly id = 'sky-sun';
  fallen = 0;
  countdown: number;

  constructor(sim: Simulation) {
    this.countdown = this.nextDelay(sim);
  }

  update(sim: Simulation): void {
    if (sim.phase !== 'playing') return;
    if (--this.countdown > 0) return;
    sim.spawnSkySun();
    this.fallen++;
    this.countdown = this.nextDelay(sim);
  }

  private nextDelay(sim: Simulation): number {
    return Math.min(SKY_SUN_MAX, SKY_SUN_BASE + this.fallen * SKY_SUN_STEP) + sim.rng.int(SKY_SUN_RANDOM);
  }
}
