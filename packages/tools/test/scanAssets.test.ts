import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanAssetDirectory } from '../src/scanAssets';

describe('scanAssetDirectory', () => {
  it('maps the folder conventions to manifest entries', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pvz-assets-'));
    const touch = (path: string, text = '') => writeFileSync(join(dir, path), text);
    mkdirSync(join(dir, 'plant.peashooter.idle'));
    touch('plant.peashooter.idle/frame10.png');
    touch('plant.peashooter.idle/frame2.png');
    touch('plant.peashooter.idle/anim.json', JSON.stringify({ fps: 24, events: { '3': 'release' } }));
    touch('bg.pvz1.day.jpg');
    touch('zombie.basic.walk.json', '{}');
    touch('zombie.basic.walk.png');
    mkdirSync(join(dir, 'audio.splat'));
    touch('audio.splat/1.ogg');
    touch('audio.splat/2.ogg');
    touch('music.day.mp3');
    touch('README.md');

    const { assets } = scanAssetDirectory(dir);
    expect(assets['plant.peashooter.idle']).toEqual({
      type: 'frames',
      frames: ['plant.peashooter.idle/frame2.png', 'plant.peashooter.idle/frame10.png'],
      fps: 24,
      events: { '3': 'release' },
    });
    expect(assets['bg.pvz1.day']).toEqual({ type: 'image', url: 'bg.pvz1.day.jpg' });
    expect(assets['zombie.basic.walk']).toEqual({ type: 'spritesheet', url: 'zombie.basic.walk.json' });
    expect(assets['audio.splat']).toEqual({ type: 'audio', urls: ['audio.splat/1.ogg', 'audio.splat/2.ogg'] });
    expect(assets['music.day']).toEqual({ type: 'audio', urls: ['music.day.mp3'] });
    expect(Object.keys(assets)).toHaveLength(5);
  });
});
