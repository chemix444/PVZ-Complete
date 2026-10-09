import type { Application, Container } from 'pixi.js';
import { plantArt, zombieArtFor } from '@pvz/assets';
import { PlantRegistry, ZombieRegistry } from '@pvz/content';

const cache = new Map<string, Promise<string>>();

/** PNG data URLs of placeholder art, for DOM screens such as the almanac. */
export function plantIcon(app: Application, id: string): Promise<string> {
  return render(app, `plant:${id}`, () => plantArt(id, PlantRegistry.find(id)?.name ?? id).root);
}

export function zombieIcon(app: Application, id: string): Promise<string> {
  return render(app, `zombie:${id}`, () => zombieArtFor(ZombieRegistry.get(id).id).root);
}

function render(app: Application, key: string, build: () => Container): Promise<string> {
  let icon = cache.get(key);
  if (!icon) {
    const target = build();
    icon = app.renderer.extract.base64({ target, resolution: 2 }).finally(() => target.destroy({ children: true }));
    cache.set(key, icon);
  }
  return icon;
}
