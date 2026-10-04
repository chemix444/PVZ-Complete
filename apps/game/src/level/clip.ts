import { AnimatedSprite, Container, Sprite } from 'pixi.js';
import { AnimationPlayer, type AnimationClip, type AssetLibrary } from '@pvz/assets';

/**
 * Sprite animation from supplied assets. Each logical animation id is
 * `${prefix}.${name}`; missing names fall back to the first available one.
 * Views seek clips to simulation time so art never drives gameplay timing.
 */
export class ClipVisual {
  readonly root = new Container();
  private readonly sprite: AnimatedSprite | null = null;
  private current: AnimationClip | null = null;
  private player: AnimationPlayer | null = null;

  constructor(
    private readonly assets: AssetLibrary,
    private readonly prefix: string,
    private readonly fallbacks: readonly string[],
  ) {
    const first = this.find(fallbacks[0]);
    if (first) {
      this.sprite = new AnimatedSprite({ textures: first.frames as AnimatedSprite['textures'], autoUpdate: false });
      this.root.addChild(this.sprite);
      this.apply(first);
    }
  }

  static available(assets: AssetLibrary, prefix: string, names: readonly string[]): boolean {
    return names.some((name) => assets.clip(`${prefix}.${name}`) !== null || assets.image(`${prefix}.${name}`) !== null);
  }

  /** Shows `name` at `seconds` into the animation. */
  show(name: string, seconds: number): void {
    if (!this.sprite) return;
    const clip = this.find(name);
    if (!clip) return;
    if (clip !== this.current) this.apply(clip);
    this.sprite.currentFrame = this.player!.frameAt(seconds);
  }

  private apply(clip: AnimationClip): void {
    const sprite = this.sprite!;
    this.current = clip;
    this.player = new AnimationPlayer(clip.timing);
    sprite.textures = clip.frames as AnimatedSprite['textures'];
    sprite.anchor.set(clip.anchor[0], clip.anchor[1]);
    sprite.position.set(clip.offset[0], clip.offset[1]);
    sprite.scale.set(clip.scale);
  }

  private find(name: string): AnimationClip | null {
    const exact = this.assets.clip(`${this.prefix}.${name}`) ?? this.imageClip(name);
    if (exact) return exact;
    for (const fallback of this.fallbacks) {
      const clip = this.assets.clip(`${this.prefix}.${fallback}`) ?? this.imageClip(fallback);
      if (clip) return clip;
    }
    return null;
  }

  private imageClip(name: string): AnimationClip | null {
    const image = this.assets.image(`${this.prefix}.${name}`);
    if (!image) return null;
    return {
      id: `${this.prefix}.${name}`,
      frames: [image.texture],
      timing: { frameCount: 1, fps: 1, loop: true },
      anchor: image.anchor,
      offset: image.offset,
      scale: image.scale,
      attachments: {},
    };
  }
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
