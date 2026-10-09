// Player and debug input. Commands are queued and applied at the start of the
// next tick, so a recorded command log replays deterministically.
export type Command =
  | { type: 'plant'; slot: number; row: number; col: number }
  | { type: 'plant-conveyor'; packetId: number; row: number; col: number }
  | { type: 'whack'; x: number; y: number }
  | { type: 'collect'; pickupId: number }
  | { type: 'dig'; row: number; col: number }
  | { type: 'debug-add-sun'; amount: number }
  | { type: 'debug-spawn-zombie'; zombie: string; row: number; x?: number }
  | { type: 'debug-spawn-plant'; plant: string; row: number; col: number }
  | { type: 'debug-set-health'; entityId: number; health: number }
  | { type: 'debug-skip-wave' }
  | { type: 'debug-kill-zombies' }
  | { type: 'debug-recharge-all' };

export interface TimedCommand {
  readonly tick: number;
  readonly command: Command;
}
