import { Container, Graphics, Text } from 'pixi.js';
import { rotatedEllipse } from './shapes';

// Plants are drawn in cell space: (0, 0) is the cell's top-left corner and a
// cell is 80x100. Each art object exposes the parts its view animates.

const OUTLINE = { width: 2, color: 0x24420f };
const LEAF = 0x4f9e24;
const STEM = 0x3c8a1c;

export interface PlantArt {
  readonly root: Container;
  /** Part that bobs, recoils or sways. */
  readonly head: Container;
  /** Shown while the plant is about to produce. */
  readonly glow?: Graphics;
  /** Damage appearance stages, index 0 = first damage stage. */
  readonly damage?: readonly Graphics[];
}

function baseLeaves(): Graphics {
  const g = new Graphics();
  rotatedEllipse(g, 25, 91, 17, 6, -0.2, LEAF, OUTLINE);
  rotatedEllipse(g, 55, 91, 17, 6, 0.2, LEAF, OUTLINE);
  return g;
}

function stem(fromY: number, toY: number, bend: number): Graphics {
  return new Graphics()
    .moveTo(40, fromY)
    .quadraticCurveTo(40 + bend, (fromY + toY) / 2, 38, toY)
    .stroke({ width: 6, color: STEM, cap: 'round' });
}

export function peashooterArt(): PlantArt {
  const root = new Container();
  const head = new Container();
  head.pivot.set(38, 52);
  head.position.set(38, 52);
  const g = new Graphics();
  g.poly([22, 32, 6, 22, 12, 40]).fill(0x5fae2e).stroke(OUTLINE);
  g.roundRect(46, 29, 25, 21, 7).fill(0x8bd34a).stroke(OUTLINE);
  g.ellipse(70, 39.5, 5, 9).fill(0x1d3d0b);
  g.circle(36, 40, 19).fill(0x8bd34a).stroke(OUTLINE);
  g.ellipse(28, 32, 6, 4).fill({ color: 0xffffff, alpha: 0.35 });
  g.circle(41, 33, 5).fill(0x111111);
  g.circle(42.5, 31.5, 1.8).fill(0xffffff);
  head.addChild(g);
  root.addChild(stem(90, 54, 8), baseLeaves(), head);
  return { root, head };
}

export function sunflowerArt(): PlantArt {
  const root = new Container();
  const head = new Container();
  head.pivot.set(40, 52);
  head.position.set(40, 52);
  const glow = new Graphics().circle(40, 40, 36).fill({ color: 0xfff6b0, alpha: 0.55 });
  glow.visible = false;
  const g = new Graphics();
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    rotatedEllipse(g, 40 + Math.cos(angle) * 20, 40 + Math.sin(angle) * 20, 11, 5, angle, 0xffd21f, {
      width: 1.5,
      color: 0xc79100,
    });
  }
  g.circle(40, 40, 14).fill(0x9b5a1a).stroke({ width: 2, color: 0x5e3209 });
  g.ellipse(35, 37, 2.5, 3.5).fill(0x2b1608);
  g.ellipse(45, 37, 2.5, 3.5).fill(0x2b1608);
  g.moveTo(40 + 7 * Math.cos(Math.PI * 0.15), 41 + 7 * Math.sin(Math.PI * 0.15))
    .arc(40, 41, 7, Math.PI * 0.15, Math.PI * 0.85)
    .stroke({ width: 2, color: 0x2b1608 });
  g.circle(32, 43, 2.5).fill({ color: 0xff8a70, alpha: 0.6 });
  g.circle(48, 43, 2.5).fill({ color: 0xff8a70, alpha: 0.6 });
  head.addChild(glow, g);
  root.addChild(stem(92, 52, -6), baseLeaves(), head);
  return { root, head, glow };
}

export function wallnutArt(): PlantArt {
  const root = new Container();
  const head = new Container();
  head.pivot.set(40, 92);
  head.position.set(40, 92);
  const g = new Graphics();
  g.ellipse(40, 92, 26, 5).fill({ color: 0x000000, alpha: 0.2 });
  g.ellipse(40, 58, 28, 35).fill(0xc98d3e).stroke({ width: 3, color: 0x6b4416 });
  g.ellipse(47, 64, 19, 26).fill({ color: 0x6b4416, alpha: 0.15 });
  g.ellipse(30, 40, 7, 11).fill({ color: 0xffffff, alpha: 0.25 });
  g.moveTo(24, 70).quadraticCurveTo(28, 78, 34, 82).stroke({ width: 2, color: 0x8f5d22 });
  g.moveTo(52, 30).quadraticCurveTo(58, 36, 60, 44).stroke({ width: 2, color: 0x8f5d22 });
  g.ellipse(32, 50, 6.5, 8.5).fill(0xffffff).stroke({ width: 1.5, color: 0x6b4416 });
  g.ellipse(49, 50, 6.5, 8.5).fill(0xffffff).stroke({ width: 1.5, color: 0x6b4416 });
  g.circle(33.5, 52, 3).fill(0x1a1a1a);
  g.circle(50.5, 52, 3).fill(0x1a1a1a);
  const crack1 = new Graphics()
    .moveTo(42, 24)
    .lineTo(37, 33)
    .lineTo(43, 38)
    .lineTo(39, 46)
    .stroke({ width: 2, color: 0x4a2c0b });
  const crack2 = new Graphics()
    .moveTo(20, 56)
    .lineTo(28, 62)
    .lineTo(24, 70)
    .lineTo(31, 76)
    .moveTo(62, 60)
    .lineTo(55, 68)
    .lineTo(60, 76)
    .moveTo(36, 66)
    .lineTo(44, 70)
    .stroke({ width: 2, color: 0x4a2c0b });
  crack1.visible = false;
  crack2.visible = false;
  head.addChild(g, crack1, crack2);
  root.addChild(head);
  return { root, head, damage: [crack1, crack2] };
}

/** Fallback for plants that have neither real art nor a dedicated placeholder. */
export function genericPlantArt(name: string): PlantArt {
  const root = new Container();
  const head = new Container();
  head.pivot.set(40, 90);
  head.position.set(40, 90);
  const g = new Graphics().circle(40, 55, 26).fill(0x6dbb3a).stroke(OUTLINE);
  const label = new Text({ text: name.slice(0, 2), style: { fontFamily: 'Trebuchet MS', fontSize: 20, fontWeight: 'bold', fill: 0xffffff } });
  label.anchor.set(0.5);
  label.position.set(40, 55);
  head.addChild(g, label);
  root.addChild(head);
  return { root, head };
}

const builders: Record<string, () => PlantArt> = {
  peashooter: peashooterArt,
  sunflower: sunflowerArt,
  'wall-nut': wallnutArt,
};

export function plantArt(id: string, name = id): PlantArt {
  return builders[id]?.() ?? genericPlantArt(name);
}
