// Usage: npm run assets:scan [-- <folder>]
// Writes manifest.json into the folder (default apps/game/public/local-assets).
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { scanAssetDirectory } from '../packages/tools/src/scanAssets.ts';

const dir = resolve(process.argv[2] ?? 'apps/game/public/local-assets');
const manifest = scanAssetDirectory(dir);
writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${Object.keys(manifest.assets).length} asset ids to ${join(dir, 'manifest.json')}`);
