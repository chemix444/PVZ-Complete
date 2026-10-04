import { describe, expect, it } from 'vitest';
import { AnimationPlayer, mergeManifests, resolveManifestUrls } from '@pvz/assets/core';

describe('AnimationPlayer', () => {
  it('loops frames at the clip rate', () => {
    const player = new AnimationPlayer({ frameCount: 4, fps: 10, loop: true });
    player.advance(0.25);
    expect(player.frame).toBe(2);
    player.advance(0.2);
    expect(player.frame).toBe(0);
  });

  it('holds the last frame of a one-shot clip and reports it finished', () => {
    const player = new AnimationPlayer({ frameCount: 3, fps: 10, loop: false });
    player.advance(1);
    expect(player.frame).toBe(2);
    expect(player.finished).toBe(true);
  });

  it('fires frame events once per pass, including across loops', () => {
    const player = new AnimationPlayer({ frameCount: 4, fps: 10, loop: true, events: { '2': 'release' } });
    expect(player.advance(0.15)).toEqual([]);
    expect(player.advance(0.1)).toEqual(['release']);
    expect(player.advance(0.4)).toEqual(['release']);
  });

  it('seeks without firing events', () => {
    const player = new AnimationPlayer({ frameCount: 4, fps: 10, loop: false, events: { '1': 'x' } });
    player.seek(0.35);
    expect(player.frame).toBe(3);
    expect(player.advance(0)).toEqual([]);
  });
});

describe('Asset manifests', () => {
  it('resolves relative urls against the manifest location and lets later manifests win', () => {
    const local = resolveManifestUrls(
      { version: 1, assets: { 'plant.peashooter.idle': { type: 'frames', frames: ['pea/0.png', '/abs.png'] } } },
      '/local-assets/manifest.json',
    );
    expect(local.assets['plant.peashooter.idle']).toMatchObject({ frames: ['/local-assets/pea/0.png', '/abs.png'] });
    const merged = mergeManifests(
      { version: 1, assets: { a: { type: 'image', url: 'x.png' }, b: { type: 'image', url: 'y.png' } } },
      { version: 1, assets: { a: { type: 'image', url: 'z.png' } } },
    );
    expect(merged.assets.a).toMatchObject({ url: 'z.png' });
    expect(merged.assets.b).toMatchObject({ url: 'y.png' });
  });
});
