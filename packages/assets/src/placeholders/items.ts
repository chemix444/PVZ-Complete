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

/** Frozen pea fired by a snow pea. Centered on (0, 0). */
export function snowPeaArt(): Graphics {
  return new Graphics()
    .circle(0, 0, 10)
    .fill(0x9fe0ff)
    .stroke({ width: 2, color: 0x3a8ab8 })
    .circle(2, 2, 5)
    .fill({ color: 0x6cc2ea, alpha: 0.6 })
    .circle(-3, -3, 3.5)
    .fill({ color: 0xffffff, alpha: 0.75 })
    .moveTo(4, -7)
    .lineTo(6, -3)
    .moveTo(7, -6)
    .lineTo(3, -4)
    .stroke({ width: 1, color: 0xffffff });
}

/** Small puff fired by puff-shrooms and fume-shrooms. Centered on (0, 0). */
export function sporeArt(): Graphics {
  const g = new Graphics();
  for (const [x, y, r] of [
    [-3, 1, 4.5],
    [3, 1.5, 4.5],
    [0, -2.5, 5],
  ] as const) {
    g.circle(x, y, r).fill(0xb07ad8);
  }
  g.circle(0, 0, 4).fill(0xd2a8f0);
  g.circle(-1.5, -2.5, 1.6).fill({ color: 0xffffff, alpha: 0.7 });
  return g;
}

/** Tombstone in a lawn cell, in cell space (80x100, ground near y = 90). */
export function graveArt(variant: number): Container {
  const g = new Graphics();
  const stone = 0x8e8e96;
  const line = { width: 2, color: 0x44444c };
  const carve = { width: 2, color: 0x5e5e66, cap: 'round' as const };
  g.ellipse(40, 90, 30, 5).fill({ color: 0x000000, alpha: 0.2 });
  const shape = ((variant % 3) + 3) % 3;
  if (shape === 0) {
    g.moveTo(24, 88).lineTo(24, 50).bezierCurveTo(24, 26, 56, 26, 56, 50).lineTo(56, 88).closePath().fill(stone).stroke(line);
    g.moveTo(32, 50).lineTo(48, 50).moveTo(32, 58).lineTo(48, 58).moveTo(34, 66).lineTo(46, 66).stroke(carve);
  } else if (shape === 1) {
    g.poly([35, 88, 35, 52, 22, 52, 22, 42, 35, 42, 35, 30, 45, 30, 45, 42, 58, 42, 58, 52, 45, 52, 45, 88]).fill(stone).stroke(line);
    g.moveTo(40, 36).lineTo(40, 70).stroke({ width: 1.5, color: 0x6e6e76 });
  } else {
    g.poly([23, 88, 22, 44, 31, 34, 51, 36, 58, 46, 57, 88]).fill(stone).stroke(line);
    g.moveTo(34, 50).lineTo(46, 50).moveTo(40, 45).lineTo(40, 64).stroke(carve);
  }
  g.ellipse(30, 44, 3, 6).fill({ color: 0xffffff, alpha: 0.2 });
  g.moveTo(50, 62).lineTo(46, 68).lineTo(50, 74).stroke({ width: 1.5, color: 0x55555c });
  g.ellipse(28, 82, 6, 3).fill({ color: 0x5a7a3a, alpha: 0.8 });
  g.ellipse(40, 90, 26, 6).fill(0x6b4a24).stroke({ width: 1.5, color: 0x3e2a12 });
  for (const x of [22, 32, 44, 56]) g.ellipse(x, 86 + (x % 3), 5, 3).fill(0x86603a);
  return wrapGraphics(g);
}

/** Scorched hole left by a doom-shroom, in cell space. */
export function craterArt(): Container {
  const g = new Graphics();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    g.moveTo(40 + Math.cos(a) * 30, 78 + Math.sin(a) * 12).lineTo(40 + Math.cos(a) * 40, 78 + Math.sin(a) * 17);
  }
  g.stroke({ width: 3, color: 0x2a1c10, alpha: 0.6, cap: 'round' });
  g.ellipse(40, 78, 36, 15).fill(0x4a3218).stroke({ width: 2, color: 0x2a1a0c });
  g.ellipse(40, 76, 32, 11).fill(0x6a4a26);
  g.ellipse(40, 79, 27, 9).fill(0x1a1008);
  g.ellipse(40, 81, 18, 5).fill(0x0a0604);
  for (const [x, y] of [
    [14, 70],
    [64, 72],
    [22, 88],
    [58, 89],
  ] as const) {
    g.circle(x, y, 2).fill(0x3a2a18);
  }
  g.circle(46, 76, 1.5).fill({ color: 0xff8a3a, alpha: 0.8 });
  g.circle(33, 79, 1.2).fill({ color: 0xff8a3a, alpha: 0.6 });
  return wrapGraphics(g);
}

function wrapGraphics(g: Graphics): Container {
  const c = new Container();
  c.addChild(g);
  return c;
}
