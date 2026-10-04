import { TICK_MS, type Simulation } from '@pvz/engine';

// At most this much simulated time per rendered frame; a stalled tab resumes
// smoothly instead of fast-forwarding through seconds of gameplay.
const MAX_STEPS_PER_FRAME = 60;

/** Drives the simulation at a fixed timestep from variable-length frames. */
export class LevelRunner {
  speed = 1;
  paused = false;
  private accumulator = 0;
  /** Exponential average of one step's cost in milliseconds. */
  stepCostMs = 0;
  ticksLastSecond = 0;
  private tickWindow: number[] = [];

  constructor(readonly sim: Simulation) {}

  /** 0..1 position between the last two ticks, for interpolating positions. */
  get alpha(): number {
    return this.accumulator / TICK_MS;
  }

  update(dtMs: number, now: number): number {
    if (this.paused || this.sim.finished) return 0;
    this.accumulator += Math.min(dtMs, 250) * this.speed;
    let steps = 0;
    while (this.accumulator >= TICK_MS && steps < MAX_STEPS_PER_FRAME) {
      this.step();
      this.accumulator -= TICK_MS;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    this.tickWindow.push(now, steps);
    while (this.tickWindow.length > 0 && this.tickWindow[0] < now - 1000) this.tickWindow.splice(0, 2);
    let total = 0;
    for (let i = 1; i < this.tickWindow.length; i += 2) total += this.tickWindow[i];
    this.ticksLastSecond = total;
    return steps;
  }

  /** Advances exactly one tick (used by the developer tools while paused). */
  step(): void {
    const start = performance.now();
    this.sim.step();
    this.stepCostMs += (performance.now() - start - this.stepCostMs) * 0.05;
  }
}
