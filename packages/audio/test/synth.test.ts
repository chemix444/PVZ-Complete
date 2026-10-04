import { describe, expect, it } from 'vitest';
import { placeholderMusicNames, placeholderSoundNames, renderMusic, renderPlaceholderSound } from '@pvz/audio';
import { AudioRegistry } from '@pvz/content';

describe('Placeholder audio', () => {
  it('has a generator for every sound the content registry declares', () => {
    const known = new Set([...placeholderSoundNames(), ...placeholderMusicNames()]);
    for (const def of AudioRegistry.all()) expect(known.has(def.placeholder), def.id).toBe(true);
  });

  it('renders bounded, non-silent, deterministic samples', () => {
    for (const name of placeholderSoundNames()) {
      const a = renderPlaceholderSound(name, 22050)!;
      const b = renderPlaceholderSound(name, 22050)!;
      expect(a).toEqual(b);
      let peak = 0;
      for (const v of a) peak = Math.max(peak, Math.abs(v));
      expect(peak, name).toBeGreaterThan(0.05);
      expect(peak, name).toBeLessThanOrEqual(1);
    }
  });

  it('renders whole-bar music loops', () => {
    const day = renderMusic('music-day', 8000)!;
    const expected = Math.ceil(8 * 16 * (60 / 112 / 4) * 8000);
    expect(day.length).toBe(expected);
    expect(renderMusic('missing', 8000)).toBeNull();
  });
});
