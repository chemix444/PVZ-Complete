export interface Identified {
  readonly id: string;
}

export class Registry<T extends Identified> {
  private readonly items = new Map<string, T>();

  constructor(readonly name: string, entries: readonly T[] = []) {
    for (const entry of entries) this.register(entry);
  }

  register(entry: T): void {
    if (this.items.has(entry.id)) {
      throw new Error(`${this.name}: duplicate id "${entry.id}"`);
    }
    this.items.set(entry.id, entry);
  }

  get(id: string): T {
    const entry = this.items.get(id);
    if (!entry) throw new Error(`${this.name}: unknown id "${id}"`);
    return entry;
  }

  find(id: string): T | undefined {
    return this.items.get(id);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  all(): T[] {
    return [...this.items.values()];
  }

  ids(): string[] {
    return [...this.items.keys()];
  }

  get size(): number {
    return this.items.size;
  }
}
