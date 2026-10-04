// The asset manifest maps logical ids (plant.peashooter.idle, audio.splat,
// bg.pvz1.day) to files. Gameplay and rendering code only ever use ids; an id
// with no entry falls back to procedural placeholder art or sound.

export type Vec2 = readonly [number, number];

interface SpriteOptions {
  /** Texture anchor (0..1). Defaults to [0, 0]. */
  readonly anchor?: Vec2;
  /** Position of the anchor relative to the entity origin, in board pixels. */
  readonly offset?: Vec2;
  readonly scale?: number;
}

interface ClipOptions extends SpriteOptions {
  readonly fps?: number;
  readonly loop?: boolean;
  /** Frame index -> event name, used to sync effects to the art. */
  readonly events?: Readonly<Record<string, string>>;
  /** Named points (projectile mouth, held item) relative to the entity origin. */
  readonly attachments?: Readonly<Record<string, Vec2>>;
}

export type AssetEntry =
  | ({ readonly type: 'image'; readonly url: string } & SpriteOptions)
  | ({ readonly type: 'frames'; readonly frames: readonly string[] } & ClipOptions)
  | ({ readonly type: 'spritesheet'; readonly url: string; readonly animation?: string } & ClipOptions)
  | {
      readonly type: 'layered';
      readonly layers: readonly { readonly asset: string; readonly offset?: Vec2; readonly z?: number }[];
    }
  | { readonly type: 'audio'; readonly urls: readonly string[] };

export interface AssetManifest {
  readonly version: 1;
  /** Base path for relative urls, defaults to the manifest's own directory. */
  readonly base?: string;
  readonly assets: Readonly<Record<string, AssetEntry>>;
}

/** Later manifests override earlier ones id by id. */
export function mergeManifests(...manifests: AssetManifest[]): AssetManifest {
  const assets: Record<string, AssetEntry> = {};
  for (const manifest of manifests) Object.assign(assets, manifest.assets);
  return { version: 1, assets };
}

/** Rewrites relative urls in a manifest against its base. */
export function resolveManifestUrls(manifest: AssetManifest, manifestUrl: string): AssetManifest {
  const base = manifest.base ?? manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);
  const abs = (url: string) => (/^([a-z]+:|\/)/i.test(url) ? url : base + url);
  const assets: Record<string, AssetEntry> = {};
  for (const [id, entry] of Object.entries(manifest.assets)) {
    switch (entry.type) {
      case 'image':
      case 'spritesheet':
        assets[id] = { ...entry, url: abs(entry.url) };
        break;
      case 'frames':
        assets[id] = { ...entry, frames: entry.frames.map(abs) };
        break;
      case 'audio':
        assets[id] = { ...entry, urls: entry.urls.map(abs) };
        break;
      case 'layered':
        assets[id] = entry;
        break;
    }
  }
  return { version: 1, assets };
}
