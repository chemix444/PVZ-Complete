import { Container, Graphics } from 'pixi.js';

/** Centered on (0, 0). */
export function peaArt(): Graphics {
  return new Graphics()
    .circle(0, 0, 10)
    .fill(0x7bd23c)
    .stroke({ width: 2, color: 0x3d7a12 })
    .circle(-3, -3, 3.5)
    .fill({ color: 0xffffff, alpha: 0.5 });
}

export interface SunArt {
  readonly root: Container;
  readonly rays: Graphics;
  readonly glow: Graphics;
}

/** Centered on (0, 0), about 70 px across. */
export function sunArt(): SunArt {
  const root = new Container();
  const glow = new Graphics().circle(0, 0, 36).fill({ color: 0xfff3a0, alpha: 0.35 });
  const rays = new Graphics();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const b = a + 0.18;
    const c = a - 0.18;
    rays.poly([Math.cos(b) * 19, Math.sin(b) * 19, Math.cos(a) * 33, Math.sin(a) * 33, Math.cos(c) * 19, Math.sin(c) * 19]).fill(0xffc61a);
  }
  const core = new Graphics()
    .circle(0, 0, 21)
    .fill(0xffe14d)
    .stroke({ width: 2.5, color: 0xf5a700 })
    .circle(-6, -7, 7)
    .fill({ color: 0xffffff, alpha: 0.45 });
  root.addChild(glow, rays, core);
  return { root, rays, glow };
}

/** Left edge at x = 0, row top at y = 0. */
export function lawnMowerArt(): Container {
  const g = new Graphics();
  g.ellipse(32, 92, 30, 5).fill({ color: 0x000000, alpha: 0.25 });
  g.moveTo(8, 70).lineTo(-6, 36).stroke({ width: 3, color: 0x3a3a3a });
  g.moveTo(-10, 36).lineTo(-2, 36).stroke({ width: 4, color: 0x1a1a1a, cap: 'round' });
  g.roundRect(4, 62, 54, 22, 6).fill(0xc8321e).stroke({ width: 2, color: 0x7a1a0e });
  g.roundRect(18, 52, 26, 14, 4).fill(0x9a9a9a).stroke({ width: 2, color: 0x4a4a4a });
  g.rect(24, 48, 6, 6).fill(0x4a4a4a);
  g.circle(14, 86, 8).fill(0x1f1f1f).circle(14, 86, 3).fill(0x9a9a9a);
  g.circle(50, 86, 8).fill(0x1f1f1f).circle(50, 86, 3).fill(0x9a9a9a);
  const c = new Container();
  c.addChild(g);
  return c;
}

/** Bag of coins dropped when a level has no plant reward. Centered on (0, 0). */
export function moneyBagArt(): Graphics {
  return new Graphics()
    .ellipse(0, 6, 22, 20)
    .fill(0x9c7a3c)
    .stroke({ width: 2, color: 0x5a4218 })
    .poly([-8, -12, 8, -12, 12, -20, -12, -20])
    .fill(0x9c7a3c)
    .stroke({ width: 2, color: 0x5a4218 })
    .circle(0, 6, 9)
    .fill(0xffd23f)
    .stroke({ width: 2, color: 0xc79100 });
}
