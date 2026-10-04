// sfc32 seeded from splitmix32. Every random decision in the simulation goes
// through one instance so a level replays identically from the same seed and
// command log.
export class Rng {
  private a = 0;
  private b = 0;
  private c = 0;
  private d = 0;

  constructor(seed: number) {
    let s = seed >>> 0;
    const split = () => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.a = split();
    this.b = split();
    this.c = split();
    this.d = split();
    for (let i = 0; i < 12; i++) this.next();
  }

  next(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.c = (this.c + t) >>> 0;
    return t;
  }

  /** Uniform float in [0, 1). */
  float(): number {
    return this.next() / 4294967296;
  }

  /** Uniform integer in [0, n). Returns 0 when n <= 0. */
  int(n: number): number {
    if (n <= 0) return 0;
    return Math.floor(this.float() * n);
  }

  /** Uniform integer in [min, max], both inclusive. */
  range(min: number, max: number): number {
    return min + this.int(max - min + 1);
  }

  floatRange(min: number, max: number): number {
    return min + this.float() * (max - min);
  }

  getState(): [number, number, number, number] {
    return [this.a, this.b, this.c, this.d];
  }

  setState(state: readonly [number, number, number, number]): void {
    [this.a, this.b, this.c, this.d] = state;
  }
}
