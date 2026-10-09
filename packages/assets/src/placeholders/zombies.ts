import { Container, Graphics } from 'pixi.js';

// Zombies are drawn relative to their simulation anchor: x = 0 is the
// anchor (the hitbox starts 36 px to the right) and y = 0 is the row's top.
// Feet rest near y = 98.

const SKIN = 0xa3b58c;
const SKIN_DARK = 0x8a9c74;
const SKIN_LINE = { width: 2, color: 0x55613f };
const HAND_LINE = { width: 1.5, color: 0x55613f };

export interface ZombieArt {
  readonly root: Container;
  readonly body: Container;
  readonly head: Container;
  readonly armFront: Container;
  readonly armBack: Container;
  readonly legFront: Container;
  readonly legBack: Container;
  /** Armor appearance stages per armor id: [intact, damaged, badly damaged]. */
  readonly armor: Readonly<Record<string, readonly Container[]>>;
  readonly armorRoot: Readonly<Record<string, Container>>;
  /** Vaulting pole held in both hands, pivoting on the front hand. */
  readonly pole?: Container;
}

export type ZombieShield = 'newspaper' | 'screen-door';
export type ZombieOutfit = 'basic' | 'pole' | 'football' | 'dancer' | 'backup';

export interface ZombieArtOptions {
  readonly armor?: readonly string[];
  readonly flag?: boolean;
  readonly shield?: ZombieShield;
  readonly outfit?: ZombieOutfit;
  readonly pole?: boolean;
}

function limb(pivotX: number, pivotY: number, draw: (g: Graphics) => void): Container {
  const c = new Container();
  c.pivot.set(pivotX, pivotY);
  c.position.set(pivotX, pivotY);
  const g = new Graphics();
  draw(g);
  c.addChild(g);
  return c;
}

function wrap(g: Graphics): Container {
  const c = new Container();
  c.addChild(g);
  return c;
}

function zombieFace(hair: boolean): Graphics {
  const g = new Graphics();
  g.circle(57, 6, 16).fill(SKIN).stroke(SKIN_LINE);
  g.ellipse(72, 8, 3, 5).fill(SKIN).stroke(HAND_LINE);
  g.circle(49, 2, 5.5).fill(0xf4f1e1).stroke({ width: 1, color: 0x55613f });
  g.circle(61, 0, 6.5).fill(0xf4f1e1).stroke({ width: 1, color: 0x55613f });
  g.circle(48, 3, 2).fill(0x1a1a1a);
  g.circle(60, 1.5, 2.2).fill(0x1a1a1a);
  g.roundRect(46, 13, 14, 6, 2).fill(0x3a2a1a);
  g.rect(48, 13, 3, 3).fill(0xf0ead0);
  g.rect(54, 13, 3, 3).fill(0xf0ead0);
  if (hair) {
    g.moveTo(52, -10).quadraticCurveTo(50, -18, 44, -16).stroke({ width: 2, color: 0x3a3a2a });
    g.moveTo(58, -10).quadraticCurveTo(60, -19, 66, -17).stroke({ width: 2, color: 0x3a3a2a });
  }
  return g;
}

export function zombieHeadArt(): Container {
  return wrap(zombieFace(true));
}

function afro(color: number, front: boolean): Graphics {
  const g = new Graphics();
  const line = { width: 1.5, color: 0x0e0804 };
  const puffs: readonly (readonly [number, number, number])[] = front
    ? [
        [44, -5, 7],
        [51, -10, 8],
        [60, -11, 8.5],
        [68, -7, 7.5],
      ]
    : [
        [38, 0, 10],
        [41, -14, 11],
        [53, -22, 12],
        [67, -21, 12],
        [77, -10, 11],
        [78, 4, 9],
      ];
  for (const [x, y, r] of puffs) g.circle(x, y, r).fill(color).stroke(line);
  if (!front) g.ellipse(58, -6, 20, 16).fill(color);
  return g;
}

function sunglasses(): Graphics {
  const g = new Graphics();
  const frame = { width: 1.5, color: 0xd4b440 };
  g.moveTo(68, 0).lineTo(73, 4).stroke(frame);
  g.roundRect(41.5, -3, 13, 9, 3.5).fill(0x16121e).stroke(frame);
  g.roundRect(55, -5, 14, 10, 3.5).fill(0x16121e).stroke(frame);
  g.moveTo(44, 0).lineTo(47, -2).moveTo(58, -2).lineTo(61, -4).stroke({ width: 1.5, color: 0xffffff, alpha: 0.6 });
  return g;
}

function coneStage(stage: number): Container {
  const g = new Graphics();
  const tip = stage === 2 ? -30 : -44;
  if (stage === 2) {
    g.poly([42, -6, 72, -6, 63, -30, 51, -30]).fill(0xf08c1e).stroke({ width: 2, color: 0x9c4d08 });
  } else {
    g.poly([42, -6, 72, -6, 57, tip]).fill(0xf08c1e).stroke({ width: 2, color: 0x9c4d08 });
  }
  g.poly([47, -17, 67, -17, 64, -25, 50, -25]).fill({ color: 0xfff1d6, alpha: 0.85 });
  g.ellipse(57, -6, 17, 4).fill(0xd06f10).stroke({ width: 1.5, color: 0x9c4d08 });
  if (stage >= 1) {
    g.poly([60, -14, 66, -12, 62, -8]).fill(0x8a420a);
    g.poly([48, -24, 52, -21, 47, -19]).fill(0x8a420a);
  }
  if (stage === 2) g.poly([53, -30, 58, -26, 61, -30]).fill(0x8a420a);
  return wrap(g);
}

function bucketStage(stage: number): Container {
  const g = new Graphics();
  const line = { width: 2, color: 0x464a52 };
  const dent = { width: 2, color: 0x5a5f68, cap: 'round' as const };
  const top = stage === 2 ? [72, -27, 64, -23, 57, -28, 46, -31] : [70, -32, 46, -32];
  g.poly([40, -4, 76, -4, ...top]).fill(0xa8aeb6).stroke(line);
  g.poly([45, -6, 50, -6, 51, -29, 48, -29]).fill({ color: 0xffffff, alpha: 0.4 });
  g.poly([66, -6, 72, -6, 67, -28, 63, -28]).fill({ color: 0x000000, alpha: 0.12 });
  if (stage < 2) g.ellipse(58, -32, 12, 2.5).fill(0x8a9098).stroke({ width: 1.5, color: 0x464a52 });
  g.moveTo(43, -18).quadraticCurveTo(58, -9, 73, -18).stroke({ width: 1.5, color: 0x50545c });
  g.circle(43, -18, 2).fill(0x6a7078);
  g.circle(73, -18, 2).fill(0x6a7078);
  g.roundRect(38, -8, 40, 6, 2).fill(0x8a9098).stroke(line);
  if (stage >= 1) {
    g.moveTo(54, -27).quadraticCurveTo(59, -23, 56, -18).stroke(dent);
    g.ellipse(56, -23, 3.5, 4).fill({ color: 0x000000, alpha: 0.15 });
    g.moveTo(64, -14).quadraticCurveTo(68, -12, 67, -9).stroke(dent);
  }
  if (stage === 2) {
    g.moveTo(45, -20).quadraticCurveTo(50, -16, 47, -11).stroke(dent);
    g.ellipse(62, -20, 3, 2).fill(0x2a2a30);
    g.poly([39, -8, 44, -8, 42, -3]).fill(0x5a5f68);
  }
  return wrap(g);
}

function footballHelmetStage(stage: number): Container {
  const g = new Graphics();
  const red = 0xc0261e;
  const line = { width: 2, color: 0x5e0e0a };
  const bar = { width: 2.5, color: 0x9a9ca2, cap: 'round' as const };
  if (stage === 2) {
    g.moveTo(40, -5).bezierCurveTo(38, -20, 48, -22, 54, -18).lineTo(58, -12).lineTo(63, -20).lineTo(68, -14).bezierCurveTo(77, -10, 79, -3, 78, 4);
  } else {
    g.moveTo(40, -5).bezierCurveTo(38, -28, 80, -26, 78, 4);
  }
  g.lineTo(77, 17).quadraticCurveTo(72, 21, 68, 17).lineTo(68, 3).quadraticCurveTo(56, -10, 40, -5).fill(red).stroke(line);
  g.circle(73, 8, 2.2).fill(0x3a0806);
  if (stage < 2) g.moveTo(45, -13).bezierCurveTo(52, -21, 68, -21, 76, -8).stroke({ width: 3, color: 0xf2f2f2 });
  g.ellipse(49, -12, 5, 2.5).fill({ color: 0xffffff, alpha: 0.35 });
  g.moveTo(68, 9).lineTo(38, 8.5).stroke(bar);
  g.moveTo(40, -3).quadraticCurveTo(33, 9, 42, 20).stroke(bar);
  if (stage < 2) g.moveTo(68, 14).lineTo(40, 16).stroke(bar);
  else g.moveTo(68, 14).lineTo(56, 21).stroke(bar);
  if (stage >= 1) {
    g.moveTo(62, -17).lineTo(58, -11).lineTo(63, -7).stroke({ width: 1.5, color: 0x3a0806 });
    g.moveTo(71, -2).lineTo(75, -5).stroke({ width: 1.5, color: 0xe8a0a0 });
  }
  if (stage === 2) g.moveTo(46, -9).lineTo(50, -4).lineTo(47, -1).stroke({ width: 1.5, color: 0x3a0806 });
  return wrap(g);
}

/** Jagged edge between two points; offsets alternate so the line reads as torn paper. */
function ragged(x1: number, y1: number, x2: number, y2: number, steps: number, depth: number): number[] {
  const points: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jag = i === 0 || i === steps ? 0 : (i % 2 === 0 ? 1 : -1) * depth;
    points.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + jag);
  }
  return points;
}

function newspaperPage(g: Graphics, outline: number[], lines: readonly (readonly [number, number, number])[], headline?: readonly [number, number]): void {
  g.poly(outline).fill(0xefeadb).stroke({ width: 1.5, color: 0x7a7668 });
  if (headline) g.rect(headline[0], headline[1], 14, 4).fill(0x3a3a3a);
  for (const [x, y, w] of lines) g.moveTo(x, y).lineTo(x + w, y + 0.6).stroke({ width: 1.5, color: 0xa8a496 });
}

function newspaperStage(stage: number): Container {
  const g = new Graphics();
  const rows = (x: number, from: number, to: number, w: number): [number, number, number][] => {
    const out: [number, number, number][] = [];
    for (let y = from; y <= to; y += 5) out.push([x, y, w]);
    return out;
  };
  if (stage === 0) {
    newspaperPage(g, [3, 17, 26, 22, 26, 66, 3, 61], rows(7, 32, 57, 15), [7, 23]);
    newspaperPage(g, [26, 22, 49, 17, 49, 61, 26, 66], rows(30, 40, 58, 15));
    g.rect(30, 24, 15, 11).fill(0xb4b0a2);
  } else if (stage === 1) {
    newspaperPage(g, [3, 17, 26, 22, 26, 66, 3, 61], rows(7, 32, 57, 15), [7, 23]);
    newspaperPage(g, [26, 22, ...ragged(36, 22, 49, 34, 4, 2.5), 49, 61, 26, 66], rows(30, 42, 58, 15));
    g.poly([10, 44, 16, 40, 20, 47, 14, 52]).fill(0x4a3a2a);
  } else {
    newspaperPage(g, [3, 38, ...ragged(8, 30, 26, 40, 5, 3), 26, 66, 3, 61], rows(7, 47, 57, 15));
    newspaperPage(g, [26, 48, ...ragged(32, 38, 49, 46, 4, 3), 49, 61, 26, 66], rows(30, 52, 58, 15));
    g.poly([38, 54, 43, 51, 45, 57]).fill(0x4a3a2a);
  }
  g.moveTo(26, stage === 2 ? 42 : 22).lineTo(26, 66).stroke({ width: 1.5, color: 0x7a7668 });
  return wrap(g);
}

function screenDoorStage(stage: number): Container {
  const g = new Graphics();
  const left = 4;
  const right = 42;
  const top = 0;
  const bottom = 92;
  const bend = stage === 2 ? 5 : 0;
  // Top edge of the mesh still in the frame at x; anything above it is torn away.
  const tear = (x: number): number => {
    if (stage === 1 && x > 9 && x < 27) return 26 - Math.abs(x - 18) * 1.6;
    if (stage === 2) return 46 + ((x * 7) % 9);
    return top + 4;
  };
  const mesh: number[] = [];
  for (let x = left + 4; x <= right - 4; x += 2) mesh.push(x, tear(x));
  mesh.push(right - 4, bottom - 4, left + 4, bottom - 4);
  g.poly(mesh).fill({ color: 0x9aa6b0, alpha: 0.45 });
  const wire = { width: 1, color: 0x4e5862, alpha: 0.55 };
  for (let x = left + 4; x <= right - 4; x += 4) g.moveTo(x, tear(x)).lineTo(x, bottom - 4);
  for (let y = top + 4; y <= bottom - 4; y += 4) {
    for (let x = left + 4; x < right - 4; x += 4) {
      if (y >= tear(x) && y >= tear(x + 4)) g.moveTo(x, y).lineTo(x + 4, y);
    }
  }
  g.stroke(wire);
  const frame = { width: 4, color: 0x6c5034, join: 'round' as const };
  g.moveTo(left + bend, top + bend).lineTo(right, top).lineTo(right, bottom).lineTo(left, bottom).closePath().stroke(frame);
  g.moveTo(left, 48 + bend).lineTo(right, 48).stroke(frame);
  g.rect(right - 7, 52, 4, 8).fill(0x3a3a3a);
  if (stage === 1) {
    g.poly([10, 4, 18, 26, 14, 12, 26, 4]).fill({ color: 0x6e7a84, alpha: 0.8 });
  }
  if (stage === 2) {
    g.poly([10, 46, 16, 34, 20, 47]).fill({ color: 0x6e7a84, alpha: 0.8 });
    g.poly([28, 48, 34, 38, 36, 49]).fill({ color: 0x6e7a84, alpha: 0.8 });
  }
  return wrap(g);
}

function flagArt(): Container {
  const g = new Graphics();
  g.moveTo(22, 46).lineTo(22, -46).stroke({ width: 3, color: 0x6b4a2e });
  g.poly([22, -46, 58, -42, 56, -14, 22, -18]).fill(0x8f1d14).stroke({ width: 2, color: 0x5a110b });
  g.ellipse(39, -30, 9, 7).fill(0xe89aa8).stroke({ width: 1.5, color: 0xa85a68 });
  g.moveTo(39, -36).lineTo(39, -24).stroke({ width: 1, color: 0xa85a68 });
  return wrap(g);
}

function poleArt(): Container {
  const c = new Container();
  c.pivot.set(22, 35);
  c.position.set(22, 35);
  const g = new Graphics();
  const y = (x: number): number => 16 + ((x + 34) * 35) / 120;
  g.moveTo(-34, y(-34)).lineTo(86, y(86)).stroke({ width: 4.5, color: 0x8a5a2a, cap: 'round' });
  g.moveTo(-33, y(-33) - 1).lineTo(85, y(85) - 1).stroke({ width: 1.2, color: 0xd8a86a });
  for (const x of [-31, 14, 46]) g.moveTo(x, y(x)).lineTo(x + 5, y(x + 5)).stroke({ width: 5.5, color: 0xe8e0c8 });
  c.addChild(g);
  return c;
}

interface Outfit {
  /** Torso, coat or shirt color. */
  readonly top: number;
  readonly topDark: number;
  readonly pants: number;
  readonly pantsLine: number;
  readonly shoe: number;
  /** Extra half-width at the trouser cuff, for bell-bottoms. */
  readonly flare: number;
  /** Sleeve color, or null for bare arms. */
  readonly sleeve: number | null;
  readonly cuff?: number;
  readonly afro?: number;
  readonly shades?: boolean;
  readonly torso: (g: Graphics, o: Outfit) => void;
  readonly leg?: (g: Graphics, x: number, shoeX: number, shoeRx: number) => void;
}

const TORSO_SHAPE = [44, 20, 72, 20, 76, 64, 40, 64];

function digit(g: Graphics, value: number, x: number, y: number, color: number): void {
  // Seven segments a..g, clockwise from the top, then the middle bar.
  const on = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'][value];
  const w = 6;
  const h = 7;
  const seg: Record<string, [number, number, number, number]> = {
    a: [0, 0, w, 0],
    b: [w, 0, w, h],
    c: [w, h, w, h * 2],
    d: [0, h * 2, w, h * 2],
    e: [0, h, 0, h * 2],
    f: [0, 0, 0, h],
    g: [0, h, w, h],
  };
  for (const s of on) {
    const [x1, y1, x2, y2] = seg[s];
    g.moveTo(x + x1, y + y1).lineTo(x + x2, y + y2);
  }
  g.stroke({ width: 2.5, color, cap: 'round' });
}

function discoTorso(g: Graphics, o: Outfit, shirt: number, collar: number): void {
  g.poly(TORSO_SHAPE).fill(o.top).stroke({ width: 2, color: o.topDark });
  g.poly([52, 20, 64, 20, 58, 42]).fill(shirt);
  g.poly([54, 20, 62, 20, 58, 31]).fill(SKIN);
  g.poly([52, 20, 42, 33, 55, 27]).fill(collar).stroke({ width: 1, color: 0x9a8aa0 });
  g.poly([64, 20, 74, 33, 61, 27]).fill(collar).stroke({ width: 1, color: 0x9a8aa0 });
  g.rect(41, 56, 34, 5).fill(0x1e1424);
  g.roundRect(54, 55, 8, 7, 1.5).fill(0xe8c440);
}

const OUTFITS: Record<ZombieOutfit, Outfit> = {
  basic: {
    top: 0x6b4a2e,
    topDark: 0x4a321d,
    pants: 0x46506e,
    pantsLine: 0x2c3247,
    shoe: 0x2a2016,
    flare: 0,
    sleeve: 0x6b4a2e,
    torso: (g, o) => {
      g.poly(TORSO_SHAPE).fill(o.top).stroke({ width: 2, color: o.topDark });
      g.poly([53, 20, 63, 20, 61, 46, 55, 46]).fill(0xe6e0cc);
      g.poly([57, 22, 60, 22, 61, 40, 58.5, 45, 56, 40]).fill(0xb3261e);
      g.moveTo(66, 44).lineTo(72, 44).stroke({ width: 1.5, color: o.topDark });
    },
  },
  pole: {
    top: 0xd2352a,
    topDark: 0x7a1610,
    pants: 0xf2f0ea,
    pantsLine: 0x9a968c,
    shoe: 0xf2f2f2,
    flare: 0,
    sleeve: null,
    torso: (g, o) => {
      g.poly([46, 20, 70, 20, 72, 30, 76, 64, 40, 64, 44, 30]).fill(o.top).stroke({ width: 2, color: o.topDark });
      g.moveTo(50, 20).quadraticCurveTo(58, 33, 66, 20).fill(SKIN).stroke(HAND_LINE);
      g.poly([42, 38, 46, 38, 44, 64, 40, 64]).fill(0xf6f2ea);
      g.poly([70, 38, 74, 38, 76, 64, 72, 64]).fill(0xf6f2ea);
      g.rect(41, 57, 34, 7).fill(0xf6f2ea);
      g.moveTo(41, 60.5).lineTo(75, 60.5).stroke({ width: 1.5, color: o.top });
    },
    leg: (g, x, shoeX, shoeRx) => {
      g.rect(x, 74, 9, 14).fill(SKIN).stroke(HAND_LINE);
      g.rect(x - 1, 58, 12, 17).fill(0xf2f0ea).stroke({ width: 1.5, color: 0x9a968c });
      g.moveTo(x - 1, 72).lineTo(x + 11, 72).stroke({ width: 2, color: 0xd2352a });
      g.rect(x, 86, 9, 8).fill(0xf6f6f6);
      g.moveTo(x, 88).lineTo(x + 9, 88).stroke({ width: 1.5, color: 0xd2352a });
      g.ellipse(shoeX, 96, shoeRx, 4).fill(0xf2f2f2).stroke({ width: 1.5, color: 0x8a8a8a });
      g.moveTo(shoeX - shoeRx + 4, 95).lineTo(shoeX + 2, 95).stroke({ width: 1.5, color: 0xd2352a });
    },
  },
  football: {
    top: 0xc62a22,
    topDark: 0x6e120c,
    pants: 0xe6e2d8,
    pantsLine: 0x8a867a,
    shoe: 0x161616,
    flare: 0,
    sleeve: 0xc62a22,
    cuff: 0xf2f2f2,
    torso: (g, o) => {
      g.poly(TORSO_SHAPE).fill(o.top).stroke({ width: 2, color: o.topDark });
      digit(g, 4, 51, 36, 0xffffff);
      digit(g, 2, 61, 36, 0xffffff);
      g.roundRect(34, 15, 48, 15, 7.5).fill(0xd8382e).stroke({ width: 2, color: o.topDark });
      g.moveTo(39, 23).quadraticCurveTo(58, 17, 77, 23).stroke({ width: 1.5, color: o.topDark });
      g.moveTo(37, 19).lineTo(37, 27).moveTo(79, 19).lineTo(79, 27).stroke({ width: 2, color: 0xf2f2f2 });
      g.ellipse(44, 19, 5, 2).fill({ color: 0xffffff, alpha: 0.35 });
    },
    leg: (g, x, shoeX, shoeRx) => {
      g.rect(x - 1, 58, 12, 26).fill(0xe6e2d8).stroke({ width: 1.5, color: 0x8a867a });
      g.moveTo(x + 9, 59).lineTo(x + 9, 83).stroke({ width: 2, color: 0xc62a22 });
      g.rect(x + 0.5, 84, 9, 9).fill(0xc62a22).stroke({ width: 1, color: 0x6e120c });
      g.ellipse(shoeX, 96, shoeRx, 4.5).fill(0x161616);
      for (let i = -1; i <= 1; i++) g.rect(shoeX + i * 5 - 1, 99, 2, 2.5).fill(0x161616);
    },
  },
  dancer: {
    top: 0x7a2a9e,
    topDark: 0x3e0e56,
    pants: 0x7a2a9e,
    pantsLine: 0x3e0e56,
    shoe: 0xf2f0ea,
    flare: 5,
    sleeve: 0x7a2a9e,
    cuff: 0xf2f0ea,
    afro: 0x2a1a10,
    shades: true,
    torso: (g, o) => discoTorso(g, o, 0xf6c8ea, 0xf8f4f8),
  },
  backup: {
    top: 0x2f9aa8,
    topDark: 0x145660,
    pants: 0x2a2f5e,
    pantsLine: 0x141838,
    shoe: 0x1a1a1a,
    flare: 3,
    sleeve: 0x2f9aa8,
    afro: 0x3a2414,
    torso: (g, o) => discoTorso(g, o, 0xf2e2a0, 0xf2e2a0),
  },
};

function drawLeg(g: Graphics, o: Outfit, x: number, shoeX: number, shoeRx: number): void {
  if (o.leg) {
    o.leg(g, x, shoeX, shoeRx);
    return;
  }
  g.poly([x, 58, x + 10, 58, x + 10 + o.flare * 0.6, 94, x - o.flare, 94]).fill(o.pants).stroke({ width: 1.5, color: o.pantsLine });
  g.ellipse(shoeX, 96, shoeRx, 4).fill(o.shoe);
  if (o.flare > 0) g.rect(shoeX - shoeRx + 2, 97, shoeRx * 2 - 4, 2.5).fill(0x8a8a8a);
}

function drawArm(g: Graphics, o: Outfit, shoulder: number, hand: number, front: boolean): void {
  const handRadius = front ? 5.5 : 5;
  if (o.sleeve === null) {
    g.poly([shoulder, 24, shoulder + 3, 30, hand + 4, 37.5, hand + 2, 32]).fill(front ? SKIN : SKIN_DARK);
    if (front) g.stroke(HAND_LINE);
  } else {
    g.poly([shoulder, 23, shoulder + 4, 31, hand + 4, 38, hand + 2, 31]).fill(front ? o.sleeve : o.topDark);
    if (front) g.stroke({ width: 1.5, color: o.topDark });
    if (o.cuff !== undefined) g.poly([hand + 2, 31, hand + 7, 29.6, hand + 9, 36.8, hand + 4, 38]).fill(o.cuff);
  }
  g.circle(hand, 35, handRadius).fill(SKIN).stroke(HAND_LINE);
}

interface ArmorPiece {
  readonly stage: (stage: number) => Container;
  readonly slot: 'head' | 'shield';
  readonly hidesHair?: boolean;
}

const ARMOR: Record<string, ArmorPiece> = {
  cone: { stage: coneStage, slot: 'head' },
  bucket: { stage: bucketStage, slot: 'head', hidesHair: true },
  'football-helmet': { stage: footballHelmetStage, slot: 'head', hidesHair: true },
  newspaper: { stage: newspaperStage, slot: 'shield' },
  'screen-door': { stage: screenDoorStage, slot: 'shield' },
};

export function zombieArt(options: ZombieArtOptions = {}): ZombieArt {
  const outfit = OUTFITS[options.outfit ?? 'basic'];
  const root = new Container();
  const body = new Container();
  body.pivot.set(57, 96);
  body.position.set(57, 96);

  const legBack = limb(62, 60, (g) => drawLeg(g, outfit, 57, 60, 10));
  const legFront = limb(52, 60, (g) => drawLeg(g, outfit, 47, 47, 11));
  const armBack = limb(66, 28, (g) => drawArm(g, outfit, 66, 40, false));
  const armFront = limb(50, 28, (g) => drawArm(g, outfit, 50, 22, true));
  const torso = new Graphics();
  outfit.torso(torso, outfit);

  const ids = [...new Set([...(options.armor ?? []), ...(options.shield ? [options.shield] : [])])].filter((id) => ARMOR[id]);
  const hair = outfit.afro === undefined && !ids.some((id) => ARMOR[id].hidesHair);

  const head = new Container();
  head.pivot.set(58, 22);
  head.position.set(58, 22);
  if (outfit.afro !== undefined) head.addChild(afro(outfit.afro, false));
  head.addChild(zombieFace(hair));
  if (outfit.afro !== undefined) head.addChild(afro(outfit.afro, true));
  if (outfit.shades) head.addChild(sunglasses());

  const armor: Record<string, Container[]> = {};
  const armorRoot: Record<string, Container> = {};
  const shields: Container[] = [];
  for (const id of ids) {
    const piece = ARMOR[id];
    const stages = [piece.stage(0), piece.stage(1), piece.stage(2)];
    const holder = new Container();
    for (const stage of stages) holder.addChild(stage);
    stages[1].visible = stages[2].visible = false;
    if (piece.slot === 'head') head.addChild(holder);
    else shields.push(holder);
    armor[id] = stages;
    armorRoot[id] = holder;
  }

  if (options.flag) armFront.addChildAt(flagArt(), 0);
  const pole = options.pole ? poleArt() : undefined;

  body.addChild(armBack, legBack, legFront, torso, head);
  if (pole) body.addChild(pole);
  body.addChild(armFront, ...shields);
  const shadow = new Graphics().ellipse(57, 97, 24, 5).fill({ color: 0x000000, alpha: 0.22 });
  root.addChild(shadow, body);
  return { root, body, head, armFront, armBack, legFront, legBack, armor, armorRoot, pole };
}

const ZOMBIE_OPTIONS: Record<string, ZombieArtOptions> = {
  basic: {},
  flag: { flag: true },
  conehead: { armor: ['cone'] },
  'pole-vaulting': { outfit: 'pole', pole: true },
  buckethead: { armor: ['bucket'] },
  newspaper: { shield: 'newspaper' },
  'screen-door': { shield: 'screen-door' },
  football: { outfit: 'football', armor: ['football-helmet'] },
  dancing: { outfit: 'dancer' },
  'backup-dancer': { outfit: 'backup' },
};

/** Zombie ids that zombieArtFor draws with their own look. */
export const zombieArtIds: readonly string[] = Object.keys(ZOMBIE_OPTIONS);

/** Placeholder art for a game zombie id; unknown ids get the basic zombie. */
export function zombieArtFor(id: string): ZombieArt {
  return zombieArt(ZOMBIE_OPTIONS[id] ?? {});
}
