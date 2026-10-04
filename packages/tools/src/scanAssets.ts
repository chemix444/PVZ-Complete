// Node-only: builds an asset manifest from a folder of locally supplied files.
// See apps/game/public/local-assets/README.md for the naming conventions.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { AssetEntry, AssetManifest } from '@pvz/assets/core';

const IMAGE = /\.(png|jpe?g|webp|avif)$/i;
const AUDIO = /\.(ogg|mp3|wav|m4a|opus)$/i;
const IGNORED = new Set(['manifest.json', 'README.md', '.DS_Store']);

type ClipOptions = Omit<Extract<AssetEntry, { type: 'frames' }>, 'type' | 'frames'>;

export function scanAssetDirectory(dir: string): AssetManifest {
  const assets: Record<string, AssetEntry> = {};
  const names = readdirSync(dir).filter((name) => !IGNORED.has(name)).sort();
  const sheets = new Set(names.filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -'.json'.length)));

  for (const name of names) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      const entry = scanFolder(path, name);
      if (entry) assets[name] = entry;
      continue;
    }
    const dot = name.lastIndexOf('.');
    const id = name.slice(0, dot);
    if (name.endsWith('.json')) {
      assets[id] = { type: 'spritesheet', url: name };
    } else if (IMAGE.test(name) && !sheets.has(id)) {
      assets[id] = { type: 'image', url: name };
    } else if (AUDIO.test(name)) {
      assets[id] = { type: 'audio', urls: [name] };
    }
  }
  return { version: 1, assets };
}

function scanFolder(path: string, id: string): AssetEntry | null {
  const files = readdirSync(path).sort(naturalOrder);
  const frames = files.filter((f) => IMAGE.test(f));
  const sounds = files.filter((f) => AUDIO.test(f));
  if (frames.length > 0) {
    const options = files.includes('anim.json')
      ? (JSON.parse(readFileSync(join(path, 'anim.json'), 'utf8')) as ClipOptions)
      : {};
    return { type: 'frames', frames: frames.map((f) => `${id}/${f}`), ...options };
  }
  if (sounds.length > 0) return { type: 'audio', urls: sounds.map((f) => `${id}/${f}`) };
  return null;
}

function naturalOrder(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}
