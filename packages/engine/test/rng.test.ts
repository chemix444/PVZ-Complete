import { describe, expect, it } from 'vitest';
import { Rng, ticks } from '@pvz/engine';

describe('Rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('produces different sequences for different seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const same = Array.from({ length: 20 }, () => a.next() === b.next()).filter(Boolean).length;
    expect(same).toBeLessThan(2);
  });

  it('keeps int and range inside their bounds', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 10_000; i++) {
      const n = rng.int(15);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(15);
      const r = rng.range(300, 1250);
      expect(r).toBeGreaterThanOrEqual(300);
      expect(r).toBeLessThanOrEqual(1250);
    }
  });

  it('restores state', () => {
    const rng = new Rng(9);
    rng.next();
    const state = rng.getState();
    const expected = [rng.next(), rng.next()];
    rng.setState(state);
    expect([rng.next(), rng.next()]).toEqual(expected);
  });

  it('converts seconds to centisecond ticks', () => {
    expect(ticks(1.5)).toBe(150);
    expect(ticks(0.04)).toBe(4);
    expect(ticks(7.5)).toBe(750);
  });
});
