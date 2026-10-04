import type { ProducerSpec } from '../defs';
import type { Plant } from '../entities';
import type { Simulation } from '../simulation';
import { ticks } from '../core/time';
import { registerPlantBehavior, type PlantBehavior } from './types';

export class ProducerBehavior implements PlantBehavior {
  readonly type = 'producer';
  counter: number;
  private readonly glowLead: number;

  constructor(private readonly spec: ProducerSpec, sim: Simulation) {
    this.counter = sim.rng.range(ticks(spec.firstDelay[0]), ticks(spec.firstDelay[1]));
    this.glowLead = ticks(spec.glowLead ?? 0);
  }

  update(sim: Simulation, plant: Plant): void {
    this.counter--;
    if (this.glowLead > 0 && this.counter === this.glowLead) {
      plant.setAnim('glow', sim.tick);
      sim.emit({ type: 'plant-glow', plantId: plant.id });
    }
    if (this.counter > 0) return;
    this.counter = sim.rng.range(ticks(this.spec.interval[0]), ticks(this.spec.interval[1]));
    sim.spawnPlantSun(plant, this.spec.amount);
    plant.setAnim('idle', sim.tick);
  }

  debug(): Record<string, unknown> {
    return { counter: this.counter };
  }
}

registerPlantBehavior('producer', (spec, _plant, sim) => new ProducerBehavior(spec as ProducerSpec, sim));
