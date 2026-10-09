import type { ConveyorSpec, PlantDef } from '../defs';
import { ticks } from '../core/time';
import type { Simulation } from '../simulation';
import type { SimSystem } from './types';

export class ConveyorPacket {
  constructor(
    readonly id: number,
    readonly def: PlantDef,
  ) {}
}

// Conveyor-belt levels: a free seed packet arrives every interval while the
// belt has room. Plants already on the belt are less likely to be picked
// again. The original's exact timing and weighting are not reproduced.
export class ConveyorSystem implements SimSystem {
  readonly id = 'conveyor';
  readonly packets: ConveyorPacket[] = [];
  running = true;
  countdown: number;
  private readonly interval: number;
  private readonly defs: PlantDef[];
  private readonly weights: number[];

  constructor(
    sim: Simulation,
    private readonly spec: ConveyorSpec,
  ) {
    this.interval = ticks(spec.interval);
    this.countdown = Math.min(this.interval, ticks(1));
    this.defs = spec.plants.map((p) => sim.content.plant(p.plant));
    this.weights = new Array(spec.plants.length).fill(0);
  }

  update(sim: Simulation): void {
    if (!this.running || sim.phase !== 'playing') return;
    if (--this.countdown > 0) return;
    this.countdown = this.interval;
    if (this.packets.length >= this.spec.capacity) return;
    const def = this.pick(sim);
    const packet = new ConveyorPacket(sim.allocateId(), def);
    this.packets.push(packet);
    sim.emit({ type: 'conveyor-packet', packetId: packet.id, plant: def.id });
  }

  find(packetId: number): ConveyorPacket | undefined {
    return this.packets.find((p) => p.id === packetId);
  }

  take(packet: ConveyorPacket): void {
    const index = this.packets.indexOf(packet);
    if (index >= 0) this.packets.splice(index, 1);
  }

  private pick(sim: Simulation): PlantDef {
    let total = 0;
    for (let i = 0; i < this.defs.length; i++) {
      let onBelt = 0;
      for (const packet of this.packets) if (packet.def === this.defs[i]) onBelt++;
      this.weights[i] = this.spec.plants[i].weight / (1 + 2 * onBelt);
      total += this.weights[i];
    }
    let roll = sim.rng.float() * total;
    for (let i = 0; i < this.defs.length; i++) {
      roll -= this.weights[i];
      if (roll < 0) return this.defs[i];
    }
    return this.defs[this.defs.length - 1];
  }
}
