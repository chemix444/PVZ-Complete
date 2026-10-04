// The simulation runs at 100 ticks per second. PvZ 1 updates its board in
// centiseconds, so documented PvZ 1 timings map onto ticks one to one.
export const TICKS_PER_SECOND = 100;
export const TICK_MS = 1000 / TICKS_PER_SECOND;

export function ticks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

export function perTick(perSecond: number): number {
  return perSecond / TICKS_PER_SECOND;
}
