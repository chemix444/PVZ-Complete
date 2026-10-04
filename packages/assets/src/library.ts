import { Assets, Texture, type Spritesheet } from 'pixi.js';
import type { ClipTiming } from './animation';
import { mergeManifests, resolveManifestUrls, type AssetEntry, type AssetManifest, type Vec2 } from './manifest';

export interface AnimationClip {
  readonly id: string;
  readonly frames: readonly Texture[];
  readonly timing: ClipTiming;
  readonly anchor: Vec2;
  readonly offset: Vec2;
  readonly scale: number;
  readonly attachments: Readonly<Record<string, Vec2>>;
}

export interface ImageAsset {
  readonly texture: Texture;
  readonly anchor: Vec2;
  readonly offset: Vec2;
  readonly scale: number;
}

const ORIGIN: Vec2 = [0, 0];

/** Loads manifests and their textures, and answers lookups by logical id. */
export class AssetLibrary {
  private manifest: AssetManifest = { version: 1, assets: {} };
  private readonly images = new Map<string, ImageAsset>();
  private readonly clips = new Map<string, AnimationClip>();
  readonly loadedManifests: string[] = [];

  /**
   * Adds a manifest if one is served at the url. Missing manifests are normal
   * (no local assets supplied) and return false.
   */
  async addManifest(url: string): Promise<boolean> {
    const response = await fetch(url);
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return false;
    const manifest = resolveManifestUrls((await response.json()) as AssetManifest, url);
    this.manifest = mergeManifests(this.manifest, manifest);
    this.loadedManifests.push(url);
    return true;
  }

  async preload(onProgress?: (done: number, total: number) => void): Promise<void> {
    const entries = Object.entries(this.manifest.assets);
    let done = 0;
    for (const [id, entry] of entries) {
      await this.loadEntry(id, entry);
      onProgress?.(++done, entries.length);
    }
  }

  has(id: string): boolean {
    return id in this.manifest.assets;
  }

  entry(id: string): AssetEntry | undefined {
    return this.manifest.assets[id];
  }

  ids(): string[] {
    return Object.keys(this.manifest.assets);
  }

  image(id: string): ImageAsset | null {
    return this.images.get(id) ?? null;
  }

  clip(id: string): AnimationClip | null {
    return this.clips.get(id) ?? null;
  }

  audioUrls(id: string): readonly string[] | null {
    const entry = this.manifest.assets[id];
    return entry?.type === 'audio' ? entry.urls : null;
  }

  private async loadEntry(id: string, entry: AssetEntry): Promise<void> {
    switch (entry.type) {
      case 'image': {
        const texture = await Assets.load<Texture>(entry.url);
        this.images.set(id, {
          texture,
          anchor: entry.anchor ?? ORIGIN,
          offset: entry.offset ?? ORIGIN,
          scale: entry.scale ?? 1,
        });
        return;
      }
      case 'frames': {
        const frames = await Promise.all(entry.frames.map((url) => Assets.load<Texture>(url)));
        this.clips.set(id, makeClip(id, frames, entry));
        return;
      }
      case 'spritesheet': {
        const sheet = await Assets.load<Spritesheet>(entry.url);
        const frames = entry.animation ? sheet.animations[entry.animation] : Object.values(sheet.textures);
        if (!frames || frames.length === 0) throw new Error(`Asset ${id}: spritesheet has no animation "${entry.animation}"`);
        this.clips.set(id, makeClip(id, frames, entry));
        return;
      }
      case 'layered':
      case 'audio':
        return;
    }
  }
}

function makeClip(
  id: string,
  frames: readonly Texture[],
  entry: Extract<AssetEntry, { type: 'frames' | 'spritesheet' }>,
): AnimationClip {
  return {
    id,
    frames,
    timing: { frameCount: frames.length, fps: entry.fps ?? 12, loop: entry.loop ?? true, events: entry.events },
    anchor: entry.anchor ?? ORIGIN,
    offset: entry.offset ?? ORIGIN,
    scale: entry.scale ?? 1,
    attachments: entry.attachments ?? {},
  };
}

export { Texture };
