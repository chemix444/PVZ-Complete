import { AnimatedSprite, Container, Sprite } from 'pixi.js';
import { AnimationPlayer, type AnimationClip, type AssetLibrary } from '@pvz/assets';

interface Layer {
  readonly sprite: AnimatedSprite;
  readonly player: AnimationPlayer;
}

/**
 * Sprite animation from supplied assets. Each logical animation id is
 * `${prefix}.${name}` and may be a clip, a still image or a layered stack of
 * clips; missing names fall back in order. Views seek clips to simulation
 * time so art never drives gameplay timing.
 */
export class ClipVisual {
  readonly root = new Container();
  private layers: Layer[] = [];
  private currentId: string | null = null;

  constructor(
    private readonly assets: AssetLibrary,
    private readonly prefix: string,
    private readonly fallbacks: readonly string[],
  ) {
    this.root.sortableChildren = true;
  }

  static available(assets: AssetLibrary, prefix: string, names: readonly string[]): boolean {
    return names.some((name) => hasVisual(assets, `${prefix}.${name}`));
  }

  /** Shows animation `name` at `seconds` into it. */
  show(name: string, seconds: number): void {
    const id = [name, ...this.fallbacks].map((n) => `${this.prefix}.${n}`).find((candidate) => hasVisual(this.assets, candidate));
    if (!id) return;
    if (id !== this.currentId) this.build(id);
    for (const layer of this.layers) layer.sprite.currentFrame = layer.player.frameAt(seconds);
  }

  private build(id: string): void {
    for (const layer of this.layers) layer.sprite.destroy();
    this.layers = [];
    this.currentId = id;
    const entry = this.assets.entry(id);
    const parts = entry?.type === 'layered' ? entry.layers : [{ asset: id }];
    for (const part of parts) {
      const clip = clipFor(this.assets, part.asset);
      if (!clip) continue;
      const sprite = new AnimatedSprite({ textures: clip.frames as AnimatedSprite['textures'], autoUpdate: false });
      sprite.anchor.set(clip.anchor[0], clip.anchor[1]);
      const offset = 'offset' in part && part.offset ? part.offset : [0, 0];
      sprite.position.set(clip.offset[0] + offset[0], clip.offset[1] + offset[1]);
      sprite.scale.set(clip.scale);
      sprite.zIndex = 'z' in part && part.z !== undefined ? part.z : 0;
      this.root.addChild(sprite);
      this.layers.push({ sprite, player: new AnimationPlayer(clip.timing) });
    }
  }
}

function hasVisual(assets: AssetLibrary, id: string): boolean {
  return assets.clip(id) !== null || assets.image(id) !== null || assets.entry(id)?.type === 'layered';
}

/** A clip, or a still image as a one-frame clip. */
function clipFor(assets: AssetLibrary, id: string): AnimationClip | null {
  const clip = assets.clip(id);
  if (clip) return clip;
  const image = assets.image(id);
  if (!image) return null;
  return {
    id,
    frames: [image.texture],
    timing: { frameCount: 1, fps: 1, loop: true },
    anchor: image.anchor,
    offset: image.offset,
    scale: image.scale,
    attachments: {},
  };
}

/** A single static image from the manifest, positioned by its offset. */
export function imageSprite(assets: AssetLibrary, id: string): Sprite | null {
  const image = assets.image(id);
  if (!image) return null;
  const sprite = new Sprite(image.texture);
  sprite.anchor.set(image.anchor[0], image.anchor[1]);
  sprite.position.set(image.offset[0], image.offset[1]);
  sprite.scale.set(image.scale);
  return sprite;
}
