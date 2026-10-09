import { Container, Graphics, Text } from 'pixi.js';
import { rotatedEllipse, type StrokeStyle } from './shapes';

// Plants are drawn in cell space: (0, 0) is the cell's top-left corner and a
// cell is 80x100. Each art object exposes the parts its view animates.

const OUTLINE = { width: 2, color: 0x24420f };
const LEAF = 0x4f9e24;
const STEM = 0x3c8a1c;
const DIRT = 0x6b4a24;
const DIRT_LIGHT = 0x86603a;
const POTATO = 0xc08a4a;
const POTATO_LINE = { width: 2, color: 0x5e3a14 };

export interface PlantArt {
  readonly root: Container;
  /** Part that bobs, recoils or sways. */
  readonly head: Container;
  /** Shown while the plant is about to produce. */
  readonly glow?: Graphics;
  /** Damage appearance stages, index 0 = first damage stage. */
  readonly damage?: readonly Graphics[];
  /** Extra animated parts by name, such as a chomper's `jaw` or a mushroom's `sleepEyes`. */
  readonly parts?: Readonly<Record<string, Container>>;
}

/** Container whose pivot and position are the same point, so it scales and rotates in place. */
function pivoted(x: number, y: number): Container {
  const c = new Container();
  c.pivot.set(x, y);
  c.position.set(x, y);
  return c;
}

function shadow(rx: number): Graphics {
  return new Graphics().ellipse(40, 92, rx, 4.5).fill({ color: 0x000000, alpha: 0.2 });
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

interface ShooterStyle {
  readonly face: number;
  readonly line: number;
  readonly mouth: number;
  /** Drawn behind the head. */
  readonly back: (g: Graphics) => void;
  /** Drawn over the head. */
  readonly front?: (g: Graphics) => void;
}

function shooterArt(style: ShooterStyle): PlantArt {
  const root = new Container();
  const head = pivoted(38, 52);
  const outline = { width: 2, color: style.line };
  const g = new Graphics();
  style.back(g);
  g.roundRect(46, 29, 25, 21, 7).fill(style.face).stroke(outline);
  g.ellipse(70, 39.5, 5, 9).fill(style.mouth);
  g.circle(36, 40, 19).fill(style.face).stroke(outline);
  g.ellipse(28, 32, 6, 4).fill({ color: 0xffffff, alpha: 0.35 });
  g.circle(41, 33, 5).fill(0x111111);
  g.circle(42.5, 31.5, 1.8).fill(0xffffff);
  style.front?.(g);
  head.addChild(g);
  root.addChild(stem(90, 54, 8), baseLeaves(), head);
  return { root, head };
}

export function peashooterArt(): PlantArt {
  return shooterArt({
    face: 0x8bd34a,
    line: 0x24420f,
    mouth: 0x1d3d0b,
    back: (g) => g.poly([22, 32, 6, 22, 12, 40]).fill(0x5fae2e).stroke(OUTLINE),
  });
}

export function snowPeaPlantArt(): PlantArt {
  const ice = { width: 1.5, color: 0x5f9fc4 };
  return shooterArt({
    face: 0x9fdcf2,
    line: 0x2a6f93,
    mouth: 0x1b4560,
    back: (g) => {
      g.poly([20, 36, 2, 24, 26, 28]).fill(0xd4f2ff).stroke(ice);
      g.poly([23, 29, 10, 6, 31, 24]).fill(0xe8f9ff).stroke(ice);
      g.poly([29, 25, 30, 1, 38, 23]).fill(0xd4f2ff).stroke(ice);
      g.poly([36, 23, 48, 6, 44, 26]).fill(0xe8f9ff).stroke(ice);
    },
    front: (g) => {
      g.moveTo(24, 46).lineTo(28, 50).moveTo(28, 46).lineTo(24, 50).stroke({ width: 1.2, color: 0xffffff });
      g.circle(33, 52, 1.2).fill(0xffffff);
    },
  });
}

export function repeaterArt(): PlantArt {
  const line = { width: 2, color: 0x173208 };
  return shooterArt({
    face: 0x5fae2e,
    line: 0x173208,
    mouth: 0x0f2606,
    back: (g) => {
      g.poly([22, 32, 6, 22, 12, 40]).fill(0x3f8a1c).stroke(line);
      rotatedEllipse(g, 18, 25, 12, 4.5, -0.35, 0x3f8a1c, line);
    },
    front: (g) => {
      g.moveTo(22, 30).quadraticCurveTo(30, 16, 50, 27).quadraticCurveTo(36, 24, 22, 30).fill(0x3f8a1c).stroke(line);
    },
  });
}

export function sunflowerArt(): PlantArt {
  const root = new Container();
  const head = pivoted(40, 52);
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

interface NutStyle {
  readonly body: number;
  readonly line: number;
  readonly vein: number;
  readonly crack: number;
  readonly angry: boolean;
}

function nutArt(style: NutStyle): PlantArt {
  const root = new Container();
  const head = pivoted(40, 92);
  const g = new Graphics();
  g.ellipse(40, 92, 26, 5).fill({ color: 0x000000, alpha: 0.2 });
  g.ellipse(40, 58, 28, 35).fill(style.body).stroke({ width: 3, color: style.line });
  g.ellipse(47, 64, 19, 26).fill({ color: style.line, alpha: 0.15 });
  g.ellipse(30, 40, 7, 11).fill({ color: 0xffffff, alpha: 0.25 });
  g.moveTo(24, 70).quadraticCurveTo(28, 78, 34, 82).stroke({ width: 2, color: style.vein });
  g.moveTo(52, 30).quadraticCurveTo(58, 36, 60, 44).stroke({ width: 2, color: style.vein });
  g.ellipse(32, 50, 6.5, 8.5).fill(0xffffff).stroke({ width: 1.5, color: style.line });
  g.ellipse(49, 50, 6.5, 8.5).fill(0xffffff).stroke({ width: 1.5, color: style.line });
  g.circle(33.5, 52, 3).fill(0x1a1a1a);
  g.circle(50.5, 52, 3).fill(0x1a1a1a);
  if (style.angry) {
    g.poly([23, 37, 39, 43, 38, 46.5, 23, 41]).fill(style.crack);
    g.poly([58, 37, 42, 43, 43, 46.5, 58, 41]).fill(style.crack);
    g.moveTo(35, 72).quadraticCurveTo(41, 67, 47, 72).stroke({ width: 2.5, color: style.crack, cap: 'round' });
  }
  const crack1 = new Graphics()
    .moveTo(42, 24)
    .lineTo(37, 33)
    .lineTo(43, 38)
    .lineTo(39, 46)
    .stroke({ width: 2, color: style.crack });
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
    .stroke({ width: 2, color: style.crack });
  crack1.visible = false;
  crack2.visible = false;
  head.addChild(g, crack1, crack2);
  root.addChild(head);
  return { root, head, damage: [crack1, crack2] };
}

export function wallnutArt(): PlantArt {
  return nutArt({ body: 0xc98d3e, line: 0x6b4416, vein: 0x8f5d22, crack: 0x4a2c0b, angry: false });
}

export function explodeONutArt(): PlantArt {
  return nutArt({ body: 0xc8452c, line: 0x6a1a0c, vein: 0x962e18, crack: 0x3a0e04, angry: true });
}

function cherry(g: Graphics, x: number, y: number): void {
  const ink = 0x2a0805;
  g.circle(x, y, 17).fill(0xd8231a).stroke({ width: 2, color: 0x6e0d07 });
  g.ellipse(x - 8, y - 8, 5, 3.5).fill({ color: 0xffffff, alpha: 0.45 });
  g.ellipse(x - 5, y, 3.2, 4).fill(0xffffff);
  g.ellipse(x + 5, y, 3.2, 4).fill(0xffffff);
  g.circle(x - 4, y + 1, 1.9).fill(ink);
  g.circle(x + 4, y + 1, 1.9).fill(ink);
  g.poly([x - 10, y - 8, x - 2, y - 4, x - 2.5, y - 2, x - 10, y - 5.5]).fill(ink);
  g.poly([x + 10, y - 8, x + 2, y - 4, x + 2.5, y - 2, x + 10, y - 5.5]).fill(ink);
  g.moveTo(x - 5, y + 10).quadraticCurveTo(x, y + 6, x + 5, y + 10).stroke({ width: 2, color: ink, cap: 'round' });
}

export function cherryBombArt(): PlantArt {
  const root = new Container();
  const head = pivoted(40, 90);
  const g = new Graphics();
  const twig = { width: 3, color: 0x3d2a12, cap: 'round' as const };
  g.moveTo(26, 56).quadraticCurveTo(27, 36, 41, 27).stroke(twig);
  g.moveTo(55, 59).quadraticCurveTo(52, 38, 41, 27).stroke(twig);
  rotatedEllipse(g, 49, 23, 10, 4.5, -0.45, LEAF, OUTLINE);
  g.moveTo(42, 26).lineTo(56, 20).stroke({ width: 1, color: 0x24420f });
  cherry(g, 25, 70);
  cherry(g, 55, 73);
  head.addChild(g);
  root.addChild(shadow(30), head);
  return { root, head };
}

function dirtMound(g: Graphics, rx: number): void {
  g.ellipse(40, 89, rx, 7).fill(DIRT).stroke({ width: 1.5, color: 0x3e2a12 });
  for (let i = 0; i < 5; i++) {
    const x = 40 - rx * 0.7 + (i * rx * 1.4) / 4;
    g.ellipse(x, 84 + (i % 2), 6, 3.5).fill(DIRT_LIGHT);
  }
  g.circle(40 - rx * 0.5, 91, 1.5).fill(0x3e2a12);
  g.circle(40 + rx * 0.35, 92, 1.5).fill(0x3e2a12);
  g.circle(40 + rx * 0.05, 90, 1.2).fill(0xa08060);
}

export function potatoMineArt(): PlantArt {
  const root = new Container();
  const armed = pivoted(40, 92);
  const g = new Graphics();
  g.moveTo(40, 60).quadraticCurveTo(42, 52, 40, 46).stroke({ width: 2, color: 0x4a4a4a });
  g.ellipse(40, 74, 22, 17).fill(POTATO).stroke(POTATO_LINE);
  g.ellipse(31, 66, 7, 4).fill({ color: 0xffffff, alpha: 0.3 });
  g.circle(25, 76, 2).fill(0x8a5a26);
  g.circle(55, 70, 1.8).fill(0x8a5a26);
  g.circle(49, 62, 1.5).fill(0x8a5a26);
  g.ellipse(34, 72, 3.5, 4.5).fill(0xffffff).stroke({ width: 1, color: 0x5e3a14 });
  g.ellipse(46, 72, 3.5, 4.5).fill(0xffffff).stroke({ width: 1, color: 0x5e3a14 });
  g.circle(35, 73, 2).fill(0x111111);
  g.circle(47, 73, 2).fill(0x111111);
  g.moveTo(36, 79).quadraticCurveTo(40, 82, 44, 79).stroke({ width: 1.5, color: 0x5e3a14, cap: 'round' });
  dirtMound(g, 30);
  const light = new Graphics()
    .circle(40, 44, 5)
    .fill(0xff2a1a)
    .stroke({ width: 1.5, color: 0x7a0c06 })
    .circle(38.5, 42.5, 1.6)
    .fill({ color: 0xffffff, alpha: 0.75 });
  armed.addChild(g, light);

  const unarmed = new Container();
  const u = new Graphics();
  u.moveTo(40, 77).lineTo(40, 72).stroke({ width: 1.5, color: 0x4a4a4a });
  u.circle(40, 71, 2).fill(0x8a2a1a);
  u.ellipse(40, 85, 15, 9).fill(POTATO).stroke(POTATO_LINE);
  u.circle(35.5, 81.5, 1.6).fill(0x111111);
  u.circle(44.5, 81.5, 1.6).fill(0x111111);
  dirtMound(u, 26);
  unarmed.addChild(u);
  unarmed.visible = false;

  root.addChild(shadow(30), unarmed, armed);
  return { root, head: armed, parts: { armed, unarmed, light } };
}

export function chomperArt(): PlantArt {
  const root = new Container();
  const head = pivoted(32, 62);
  const purple = 0x9a3db8;
  const line = { width: 2, color: 0x4a1258 };
  const tooth = { width: 1, color: 0x8a8090 };

  const jaw = pivoted(25, 48);
  const j = new Graphics();
  j.poly([25, 48, 56, 13, 70, 20, 77, 48]).fill(0x5c0d24);
  j.moveTo(34, 48).quadraticCurveTo(50, 36, 66, 44).quadraticCurveTo(52, 52, 34, 48).fill(0xe0507a);
  j.moveTo(24, 48).lineTo(76, 48).quadraticCurveTo(74, 66, 50, 66).quadraticCurveTo(28, 64, 24, 48).fill(0x8a32a6).stroke(line);
  j.ellipse(62, 58, 4, 2.5).fill({ color: 0xffffff, alpha: 0.2 });
  for (const x of [38, 49, 60, 70]) j.poly([x - 3.5, 48, x, 41, x + 3.5, 48]).fill(0xffffff).stroke(tooth);
  jaw.addChild(j);

  const upper = new Graphics();
  upper.moveTo(22, 50).bezierCurveTo(16, 6, 50, 4, 54, 8).quadraticCurveTo(80, 10, 78, 40).lineTo(77, 48).lineTo(22, 50).fill(purple).stroke(line);
  upper.ellipse(36, 22, 7, 4).fill({ color: 0xffffff, alpha: 0.25 });
  for (const [x, y, r] of [
    [44, 18, 4],
    [60, 16, 3],
    [32, 34, 3.5],
    [68, 30, 3],
    [50, 32, 2.5],
  ] as const) {
    upper.circle(x, y, r).fill(0xc77ade);
  }
  upper.moveTo(26, 47).lineTo(76, 46).stroke({ width: 3, color: 0x6fae2e });
  for (const x of [33, 43, 53, 63, 72]) upper.poly([x - 3.5, 47, x, 55, x + 3.5, 47]).fill(0xffffff).stroke(tooth);

  head.addChild(jaw, upper);
  const trunk = new Graphics()
    .moveTo(40, 92)
    .quadraticCurveTo(46, 74, 32, 60)
    .stroke({ width: 8, color: STEM, cap: 'round' });
  rotatedEllipse(trunk, 50, 78, 10, 4, -0.9, LEAF, OUTLINE);
  root.addChild(shadow(26), trunk, baseLeaves(), head);
  return { root, head, parts: { jaw } };
}

interface MushroomFace {
  readonly eyes: Graphics;
  readonly sleepEyes: Graphics;
}

/** Open and closed eye pairs drawn in place; views swap them while the plant sleeps. */
function mushroomFace(left: number, right: number, y: number, rx: number, ry: number, ink = 0x1a1020): MushroomFace {
  const eyes = new Graphics();
  const sleepEyes = new Graphics();
  for (const x of [left, right]) {
    eyes.ellipse(x, y, rx, ry).fill(ink);
    eyes.circle(x + rx * 0.3, y - ry * 0.45, Math.max(0.9, rx * 0.42)).fill(0xffffff);
    sleepEyes.moveTo(x - rx - 0.8, y).quadraticCurveTo(x, y + ry + 1, x + rx + 0.8, y).stroke({ width: 1.8, color: ink, cap: 'round' });
  }
  sleepEyes.visible = false;
  return { eyes, sleepEyes };
}

/** Dome-shaped cap resting on baseY with a slightly curved underside. */
function cap(g: Graphics, cx: number, baseY: number, rx: number, height: number, color: number, line: StrokeStyle): Graphics {
  const lift = height * 1.33;
  return g
    .moveTo(cx - rx, baseY)
    .bezierCurveTo(cx - rx, baseY - lift, cx + rx, baseY - lift, cx + rx, baseY)
    .quadraticCurveTo(cx, baseY + height * 0.28, cx - rx, baseY)
    .fill(color)
    .stroke(line);
}

/** Short tube mouth pointing right, starting at x and ending in an open rim. */
function mouthTube(g: Graphics, x: number, y: number, length: number, size: number, color: number, line: StrokeStyle): void {
  g.roundRect(x, y - size / 2, length, size, size / 2).fill(color).stroke(line);
  g.ellipse(x + length, y, size * 0.4, size * 0.62).fill(color).stroke(line);
  g.ellipse(x + length + 0.4, y, size * 0.22, size * 0.38).fill(0x2a1830);
}

function mushroomArt(build: (head: Container) => MushroomFace): PlantArt {
  const root = new Container();
  const head = pivoted(40, 92);
  const face = build(head);
  head.addChild(face.eyes, face.sleepEyes);
  root.addChild(shadow(22), head);
  return { root, head, parts: { eyes: face.eyes, sleepEyes: face.sleepEyes } };
}

const STALK = 0xeee2cc;

export function puffShroomArt(): PlantArt {
  return mushroomArt((head) => {
    const line = { width: 1.5, color: 0x5a3a72 };
    const g = new Graphics();
    g.roundRect(31, 72, 18, 20, 7).fill(STALK).stroke(line);
    mouthTube(g, 45, 86, 10, 6, STALK, line);
    cap(g, 40, 74, 19, 17, 0x8a4fb8, { width: 2, color: 0x4a2468 });
    g.circle(32, 66, 3.5).fill(0xc9a6ea);
    g.circle(45, 62, 2.6).fill(0xc9a6ea);
    g.circle(51, 70, 2).fill(0xc9a6ea);
    g.circle(26, 72, 1.8).fill(0xc9a6ea);
    head.addChild(g);
    return mushroomFace(37, 44, 80.5, 1.8, 2.6);
  });
}

export function sunShroomArt(): PlantArt {
  const glow = new Graphics().circle(40, 72, 28).fill({ color: 0xfff6b0, alpha: 0.55 });
  glow.visible = false;
  const art = mushroomArt((head) => {
    const line = { width: 1.5, color: 0x8a5a1a };
    const g = new Graphics();
    g.roundRect(30, 70, 20, 22, 8).fill(STALK).stroke(line);
    cap(g, 40, 72, 21, 19, 0xffc93a, { width: 2, color: 0xb0680e });
    g.circle(31, 64, 3.5).fill(0xf28a1e);
    g.circle(44, 59, 3).fill(0xf28a1e);
    g.circle(53, 67, 2.5).fill(0xf28a1e);
    g.ellipse(34, 60, 5, 2.5).fill({ color: 0xffffff, alpha: 0.4 });
    g.moveTo(37, 86).quadraticCurveTo(40, 89, 43, 86).stroke({ width: 1.5, color: 0x5a3a12, cap: 'round' });
    g.circle(33, 84, 2).fill({ color: 0xff8a70, alpha: 0.6 });
    g.circle(47, 84, 2).fill({ color: 0xff8a70, alpha: 0.6 });
    head.addChild(glow, g);
    return mushroomFace(36, 44, 81, 2, 2.8, 0x2b1608);
  });
  return { ...art, glow };
}

export function fumeShroomArt(): PlantArt {
  return mushroomArt((head) => {
    const line = { width: 2, color: 0x46226a };
    const g = new Graphics();
    g.roundRect(20, 56, 34, 36, 13).fill(0xe6dcf0).stroke({ width: 2, color: 0x6a4a80 });
    g.poly([48, 70, 66, 60, 66, 90, 48, 82]).fill(0xa47ad4).stroke(line);
    g.ellipse(68, 75, 6.5, 15.5).fill(0xb48ae0).stroke(line);
    g.ellipse(69, 75, 4, 11.5).fill(0x2a1438);
    cap(g, 37, 60, 31, 27, 0x8e58c8, line);
    g.circle(24, 50, 4.5).fill(0xc6a4ec);
    g.circle(38, 41, 4).fill(0xc6a4ec);
    g.circle(52, 47, 3.5).fill(0xc6a4ec);
    g.circle(60, 56, 2.5).fill(0xc6a4ec);
    g.circle(14, 58, 2.2).fill(0xc6a4ec);
    g.ellipse(26, 41, 6, 3).fill({ color: 0xffffff, alpha: 0.3 });
    head.addChild(g);
    return mushroomFace(30, 40, 74, 2.6, 3.6);
  });
}

export function graveBusterArt(): PlantArt {
  return mushroomArt((head) => {
    const g = new Graphics();
    rotatedEllipse(g, 13, 82, 15, 6, 0.5, LEAF, OUTLINE);
    rotatedEllipse(g, 67, 82, 15, 6, -0.5, LEAF, OUTLINE);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.1 + (i * 0.8) / 6);
      rotatedEllipse(g, 40 + Math.cos(a) * 26, 70 + Math.sin(a) * 20, 10, 4.5, a, 0x3f8a1c, OUTLINE);
    }
    g.ellipse(40, 72, 30, 21).fill(0x62b032).stroke(OUTLINE);
    g.ellipse(30, 58, 8, 4).fill({ color: 0xffffff, alpha: 0.25 });
    g.ellipse(40, 77, 21, 12).fill(0x4a0c14).stroke({ width: 2, color: 0x24420f });
    g.ellipse(40, 84, 10, 4).fill(0xc04060);
    for (const x of [26, 33, 40, 47, 54]) g.poly([x - 3.5, 66.5, x, 74, x + 3.5, 66.5]).fill(0xfffbe8);
    for (const x of [30, 37, 44, 51]) g.poly([x - 3, 88, x, 82, x + 3, 88]).fill(0xfffbe8);
    g.poly([24, 53, 36, 57, 35, 59.5, 24, 56]).fill(0x24420f);
    g.poly([56, 53, 44, 57, 45, 59.5, 56, 56]).fill(0x24420f);
    head.addChild(g);
    return mushroomFace(31, 49, 61, 3, 3.6);
  });
}

export function hypnoShroomArt(): PlantArt {
  return mushroomArt((head) => {
    const g = new Graphics();
    g.roundRect(30, 64, 20, 28, 8).fill(STALK).stroke({ width: 1.5, color: 0x8a4a78 });
    cap(g, 40, 66, 25, 30, 0xf06ab8, { width: 2, color: 0x7a2058 });
    for (const [offset, color] of [
      [0, 0x6a2a9a],
      [Math.PI, 0x2ab0a8],
    ] as const) {
      const turns = Math.PI * 2 * 1.6;
      g.moveTo(40, 52);
      for (let t = 0.2; t <= turns; t += 0.2) {
        const r = t / turns;
        g.lineTo(40 + Math.cos(t + offset) * r * 19, 52 + Math.sin(t + offset) * r * 13);
      }
      g.stroke({ width: 3, color, cap: 'round', join: 'round' });
    }
    g.circle(40, 52, 2.5).fill(0xfff0fa);
    g.moveTo(37, 86).quadraticCurveTo(40, 88.5, 43, 86).stroke({ width: 1.5, color: 0x3a1a30, cap: 'round' });
    head.addChild(g);
    return mushroomFace(36, 44, 77, 2, 3);
  });
}

export function scaredyShroomArt(): PlantArt {
  return mushroomArt((head) => {
    const line = { width: 1.5, color: 0x6a5a82 };
    const g = new Graphics();
    g.moveTo(32, 92).quadraticCurveTo(36, 68, 34.5, 44).lineTo(46.5, 44).quadraticCurveTo(45, 68, 49, 92).closePath().fill(STALK).stroke(line);
    mouthTube(g, 43, 60, 19, 5, STALK, line);
    cap(g, 40, 45, 19, 18, 0xc8a8e6, { width: 2, color: 0x6a4a8a });
    g.circle(33, 37, 3).fill(0xece0f8);
    g.circle(45, 33, 2.4).fill(0xece0f8);
    g.circle(51, 40, 1.8).fill(0xece0f8);
    head.addChild(g);
    return mushroomFace(38, 44, 53.5, 1.6, 2.4);
  });
}

function capSpikes(g: Graphics, cx: number, cy: number, rx: number, ry: number, count: number, length: number, color: number, line: StrokeStyle): void {
  for (let i = 0; i < count; i++) {
    const a = Math.PI * (1.04 + (i * 0.92) / (count - 1));
    const point = (angle: number, grow: number): [number, number] => [
      cx + Math.cos(angle) * (rx + grow),
      cy + Math.sin(angle) * (ry + grow),
    ];
    g.poly([...point(a - 0.16, -3), ...point(a, length), ...point(a + 0.16, -3)]).fill(color).stroke(line);
  }
}

export function iceShroomArt(): PlantArt {
  return mushroomArt((head) => {
    const frost = { width: 1.2, color: 0x6aaed6 };
    const g = new Graphics();
    g.roundRect(28, 62, 24, 30, 10).fill(0xe2f4fc).stroke({ width: 1.5, color: 0x3a7aa8 });
    capSpikes(g, 40, 64, 26, 24, 9, 9, 0xeefaff, frost);
    cap(g, 40, 64, 27, 25, 0x6cc2ea, { width: 2, color: 0x2a6a98 });
    for (const [x, y] of [
      [18, 65],
      [25, 66.5],
      [55, 66.5],
      [62, 65],
    ] as const) {
      g.poly([x - 2.5, y - 1, x, y + 6, x + 2.5, y - 1]).fill(0xeefaff).stroke(frost);
    }
    g.ellipse(30, 48, 7, 3.5).fill({ color: 0xffffff, alpha: 0.5 });
    g.circle(46, 44, 2).fill(0xffffff);
    g.circle(54, 54, 1.5).fill(0xffffff);
    g.circle(38, 56, 1.4).fill(0xffffff);
    g.moveTo(37, 86).quadraticCurveTo(40, 84, 43, 86).stroke({ width: 1.5, color: 0x1a3a58, cap: 'round' });
    head.addChild(g);
    return mushroomFace(35, 45, 79, 2.2, 3, 0x12304a);
  });
}

export function doomShroomArt(): PlantArt {
  return mushroomArt((head) => {
    const dark = { width: 2, color: 0x0e0614 };
    const g = new Graphics();
    g.roundRect(25, 60, 30, 32, 11).fill(0x8a7a9c).stroke({ width: 2, color: 0x2a1a38 });
    capSpikes(g, 40, 64, 27, 26, 7, 11, 0x24122e, dark);
    cap(g, 40, 64, 29, 27, 0x3a2050, dark);
    for (const [x, y, r] of [
      [27, 52, 4.5],
      [43, 44, 5],
      [55, 56, 3.5],
      [36, 60, 2.5],
    ] as const) {
      g.circle(x, y, r).fill(0xa8306a);
      g.circle(x, y, r * 0.45).fill(0x4a0a2a);
    }
    g.poly([30, 69, 38, 73, 37.5, 75, 30, 72]).fill(0x1a0a24);
    g.poly([52, 69, 44, 73, 44.5, 75, 52, 72]).fill(0x1a0a24);
    g.moveTo(35, 86).quadraticCurveTo(41, 82, 47, 86).stroke({ width: 2, color: 0x1a0a24, cap: 'round' });
    head.addChild(g);
    return mushroomFace(35, 47, 78, 2.6, 3.2, 0x1a0a24);
  });
}

/** Fallback for plants that have neither real art nor a dedicated placeholder. */
export function genericPlantArt(name: string): PlantArt {
  const root = new Container();
  const head = pivoted(40, 90);
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
  'cherry-bomb': cherryBombArt,
  'wall-nut': wallnutArt,
  'potato-mine': potatoMineArt,
  'snow-pea': snowPeaPlantArt,
  chomper: chomperArt,
  repeater: repeaterArt,
  'puff-shroom': puffShroomArt,
  'sun-shroom': sunShroomArt,
  'fume-shroom': fumeShroomArt,
  'grave-buster': graveBusterArt,
  'hypno-shroom': hypnoShroomArt,
  'scaredy-shroom': scaredyShroomArt,
  'ice-shroom': iceShroomArt,
  'doom-shroom': doomShroomArt,
  'wall-nut-bowling': wallnutArt,
  'explode-o-nut': explodeONutArt,
};

/** Plant ids that have a dedicated placeholder drawing. */
export const plantArtIds: readonly string[] = Object.keys(builders);

export function plantArt(id: string, name = id): PlantArt {
  return builders[id]?.() ?? genericPlantArt(name);
}
