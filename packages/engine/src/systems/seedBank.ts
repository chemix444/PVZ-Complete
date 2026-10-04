import type { PlantDef } from '../defs';
import { ticks } from '../core/time';
import type { Simulation } from '../simulation';
import type { SimSystem } from './types';

export class SeedPacket {
  readonly cost: number;
  readonly rechargeTicks: number;
  /** Ticks until usable. */
  remaining: number;
  /** Length of the current recharge, for drawing the cooldown overlay. */
  rechargeTotal: number;

  constructor(readonly def: PlantDef) {
    this.cost = def.cost;
    this.rechargeTicks = ticks(def.recharge);
    this.remaining = ticks(def.rechargeAtStart ?? 0);
    this.rechargeTotal = this.remaining;
  }

  get ready(): boolean {
    return this.remaining <= 0;
  }

  /** 0 when just used, 1 when ready. */
  get charge(): number {
    return this.rechargeTotal <= 0 ? 1 : 1 - this.remaining / this.rechargeTotal;
  }

  startRecharge(): void {
    this.remaining = this.rechargeTicks;
    this.rechargeTotal = this.rechargeTicks;
  }
}

export class SeedBankSystem implements SimSystem {
  readonly id = 'seed-bank';

  update(sim: Simulation): void {
    for (const packet of sim.seedBank) {
      if (packet.remaining > 0) packet.remaining--;
    }
  }
}
