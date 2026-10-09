import type { BoardDef, PlantSlot, SurfaceType } from './defs';
import type { GridItem, Plant } from './entities';

const SLOTS: readonly PlantSlot[] = ['base', 'main', 'cover'];

/** Grid geometry and cell occupancy for one board. */
export class Lawn {
  readonly rows: number;
  readonly cols: number;
  private readonly occupancy: (Plant | null)[];
  private readonly items: (GridItem | null)[];
  private readonly lanes: readonly SurfaceType[];

  /** `lanes` overrides the board's row surfaces (unsodded rows in early levels). */
  constructor(
    readonly def: BoardDef,
    lanes?: readonly SurfaceType[],
  ) {
    this.rows = def.rows;
    this.cols = def.cols;
    this.lanes = lanes ?? def.lanes;
    this.occupancy = new Array(def.rows * def.cols * SLOTS.length).fill(null);
    this.items = new Array(def.rows * def.cols).fill(null);
  }

  inBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  surface(row: number, col: number): SurfaceType {
    return this.def.cellOverrides?.[`${row},${col}`] ?? this.lanes[row] ?? 'none';
  }

  cellX(col: number): number {
    return this.def.origin.x + col * this.def.tile.width;
  }

  rowY(row: number): number {
    return this.def.origin.y + row * this.def.tile.height;
  }

  /** Column under a board x coordinate, or -1 outside the grid. */
  colAt(x: number): number {
    const col = Math.floor((x - this.def.origin.x) / this.def.tile.width);
    return col >= 0 && col < this.cols ? col : -1;
  }

  /** Row under a board y coordinate, or -1 outside the grid. */
  rowAt(y: number): number {
    const row = Math.floor((y - this.def.origin.y) / this.def.tile.height);
    return row >= 0 && row < this.rows ? row : -1;
  }

  plantAt(row: number, col: number, slot: PlantSlot = 'main'): Plant | null {
    return this.occupancy[this.index(row, col, slot)];
  }

  /** Topmost plant in a cell (cover, then main, then base). */
  topPlantAt(row: number, col: number): Plant | null {
    for (let i = SLOTS.length - 1; i >= 0; i--) {
      const plant = this.occupancy[this.index(row, col, SLOTS[i])];
      if (plant) return plant;
    }
    return null;
  }

  /** Rows zombies walk in and mowers guard. */
  isLane(row: number): boolean {
    const surface = this.lanes[row];
    return surface === 'grass' || surface === 'water' || surface === 'roof';
  }

  itemAt(row: number, col: number): GridItem | null {
    return this.items[row * this.cols + col];
  }

  placeItem(item: GridItem): void {
    this.items[item.row * this.cols + item.col] = item;
  }

  removeItem(item: GridItem): void {
    const index = item.row * this.cols + item.col;
    if (this.items[index] === item) this.items[index] = null;
  }

  occupy(plant: Plant): void {
    this.occupancy[this.index(plant.row, plant.col, plant.slot)] = plant;
  }

  vacate(plant: Plant): void {
    const index = this.index(plant.row, plant.col, plant.slot);
    if (this.occupancy[index] === plant) this.occupancy[index] = null;
  }

  private index(row: number, col: number, slot: PlantSlot): number {
    return (row * this.cols + col) * SLOTS.length + SLOTS.indexOf(slot);
  }
}
