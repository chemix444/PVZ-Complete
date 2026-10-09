import type { ProducerSpec } from '../defs';
import type { Plant } from '../entities';
import type { Simulation } from '../simulation';
import { ticks } from '../core/time';
import { registerPlantBehavior, type PlantBehavior } from './types';

export class ProducerBehavior implements PlantBehavior {
  readonly type = 'producer';
  counter: number;
  private readonly glowLead: number;
  /** Ticks until a growing producer (Sun-shroom) grows up, -1 once grown or if it never grows. */
  growIn: number;

  constructor(private readonly spec: ProducerSpec, sim: Simulation) {
    this.counter = sim.rng.range(ticks(spec.firstDelay[0]), ticks(spec.firstDelay[1]));
    this.glowLead = ticks(spec.glowLead ?? 0);
    this.growIn = spec.growAfter === undefined ? -1 : ticks(spec.growAfter);
  }

  get grown(): boolean {
    return this.growIn < 0;
  }

  update(sim: Simulation, plant: Plant): void {
    if (this.growIn > 0 && --this.growIn === 0) {
      this.growIn = -1;
      plant.setAnim('grow', sim.tick);
    }
    this.counter--;
    if (this.glowLead > 0 && this.counter === this.glowLead) {
      plant.setAnim('glow', sim.tick);
      sim.emit({ type: 'plant-glow', plantId: plant.id });
    }
    if (this.counter > 0) return;
    this.counter = sim.rng.range(ticks(this.spec.interval[0]), ticks(this.spec.interval[1]));
    const grownAmount = this.spec.grownAmount;
    sim.spawnPlantSun(plant, this.spec.growAfter !== undefined && this.grown && grownAmount ? grownAmount : this.spec.amount);
    plant.setAnim('idle', sim.tick);
  }

  debug(): Record<string, unknown> {
    return { counter: this.counter, growIn: this.growIn };
  }
}

registerPlantBehavior('producer', (spec, _plant, sim) => new ProducerBehavior(spec as ProducerSpec, sim));
