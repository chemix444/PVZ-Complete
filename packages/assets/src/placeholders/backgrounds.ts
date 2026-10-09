import { Container, Graphics } from 'pixi.js';

export interface LawnGeometry {
  readonly origin: { readonly x: number; readonly y: number };
  readonly tile: { readonly width: number; readonly height: number };
  readonly rows: number;
  readonly cols: number;
  readonly view: { readonly minX: number; readonly maxX: number; readonly height: number };
}

export type LawnTime = 'day' | 'night';

interface LawnPalette {
  readonly ground: number;
  readonly siding: number;
  readonly sidingLine: number;
  readonly door: number;
  readonly doorLine: number;
  readonly knob: number;
  readonly window: number;
  readonly windowFrame: number;
  readonly porch: number;
  readonly porchLine: number;
  readonly backdrop: number;
  readonly fence: number;
  readonly fenceLine: number;
  readonly rail: number;
  /** Cell shades: [even row light, even row dark, odd row light, odd row dark]. */
  readonly grass: readonly [number, number, number, number];
  readonly blade: number;
  readonly dirt: number;
  readonly walk: number;
  readonly walkLine: number;
  readonly curb: number;
  readonly street: number;
  readonly stripe: number;
}

const PALETTES: Record<LawnTime, LawnPalette> = {
  day: {
    ground: 0x4f8f2a,
    siding: 0xd9c99c,
    sidingLine: 0xb8a77a,
    door: 0x7a4a22,
    doorLine: 0x4a2a10,
    knob: 0xd8b040,
    window: 0x9fc7e0,
    windowFrame: 0xf2efe6,
    porch: 0xa49c8c,
    porchLine: 0x8a8274,
    backdrop: 0x2f6b1c,
    fence: 0xe8dcc0,
    fenceLine: 0xa8987a,
    rail: 0xd8ccb0,
    grass: [0x74c23f, 0x66b534, 0x6dbb39, 0x5fab2f],
    blade: 0x4f9a26,
    dirt: 0x6b4a24,
    walk: 0xbdb7aa,
    walkLine: 0x9a9488,
    curb: 0x8a857a,
    street: 0x4b4b50,
    stripe: 0xe8d870,
  },
  night: {
    ground: 0x2a4a2e,
    siding: 0x6a6684,
    sidingLine: 0x55526e,
    door: 0x3e2a2a,
    doorLine: 0x221616,
    knob: 0x9a8a50,
    window: 0xe8d890,
    windowFrame: 0x9a98b0,
    porch: 0x56566a,
    porchLine: 0x464658,
    backdrop: 0x1c1a3c,
    fence: 0x8a88a4,
    fenceLine: 0x5a5874,
    rail: 0x7a7894,
    grass: [0x3e6a4a, 0x355f42, 0x3a6446, 0x30583e],
    blade: 0x284a34,
    dirt: 0x3a2c22,
    walk: 0x6e6c7a,
    walkLine: 0x5a5866,
    curb: 0x4e4c5a,
    street: 0x26262e,
    stripe: 0x9a9060,
  },
};

/** PvZ 1 front yard by day or night: house on the left, striped lawn, sidewalk and street on the right. */
export function lawnArt(board: LawnGeometry, time: LawnTime): Container {
  const { origin, tile, rows, cols, view } = board;
  const p = PALETTES[time];
  const g = new Graphics();
  const lawnRight = origin.x + cols * tile.width;
  const lawnBottom = origin.y + rows * tile.height;

  g.rect(view.minX, 0, view.maxX - view.minX, view.height).fill(p.ground);

  // House and porch.
  const houseRight = -30;
  g.rect(view.minX, 0, houseRight - view.minX, view.height).fill(p.siding);
  for (let y = 12; y < view.height; y += 18) {
    g.moveTo(view.minX, y).lineTo(houseRight, y).stroke({ width: 1.5, color: p.sidingLine });
  }
  g.rect(view.minX + 40, 190, 70, 150).fill(p.door).stroke({ width: 4, color: p.doorLine });
  g.circle(view.minX + 98, 268, 4).fill(p.knob);
  g.rect(view.minX + 130, 120, 50, 60).fill(p.window).stroke({ width: 4, color: p.windowFrame });
  g.rect(houseRight, 40, origin.x - houseRight - 6, view.height - 40).fill(p.porch);
  for (let y = 40; y < view.height; y += 40) {
    g.moveTo(houseRight, y).lineTo(origin.x - 6, y).stroke({ width: 1, color: p.porchLine });
  }

  // Back fence above the lawn, against a hedge by day and the sky at night.
  g.rect(origin.x - 6, 0, view.maxX - origin.x, origin.y - 14).fill(p.backdrop);
  if (time === 'night') {
    for (let i = 0; i < 26; i++) {
      const x = origin.x + ((i * 173) % (view.maxX - origin.x));
      g.circle(x, 4 + ((i * 37) % 12), i % 3 === 0 ? 1.4 : 0.9).fill({ color: 0xffffff, alpha: 0.8 });
    }
    const moonX = lawnRight - 140;
    g.circle(moonX, 15, 20).fill({ color: 0xfff6d0, alpha: 0.12 });
    g.circle(moonX, 15, 12).fill(0xf4efd2);
    g.circle(moonX - 4, 12, 3).fill(0xdcd6b4);
    g.circle(moonX + 4, 19, 2).fill(0xdcd6b4);
  }
  // The night fence sits lower so the moon above it stays in view.
  const fenceTop = time === 'night' ? 30 : 18;
  for (let x = origin.x; x < lawnRight + 60; x += 34) {
    g.roundRect(x, fenceTop, 24, origin.y - 8 - fenceTop, 4).fill(p.fence).stroke({ width: 2, color: p.fenceLine });
  }
  g.rect(origin.x - 6, 40, lawnRight - origin.x + 70, 8).fill(p.rail);

  // Lawn cells, alternating shades like mown stripes.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const light = (row + col) % 2 === 0;
      const shade = p.grass[(row % 2) * 2 + (light ? 0 : 1)];
      g.rect(origin.x + col * tile.width, origin.y + row * tile.height, tile.width, tile.height).fill(shade);
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = origin.x + ((i * 97) % (cols * tile.width));
    const y = origin.y + ((i * 53) % (rows * tile.height)) + 8;
    g.moveTo(x, y).lineTo(x - 3, y - 7).moveTo(x + 4, y).lineTo(x + 5, y - 8).stroke({ width: 1.5, color: p.blade });
  }
  g.rect(origin.x, lawnBottom, lawnRight - origin.x + 60, view.height - lawnBottom).fill(p.dirt);

  // Sidewalk, curb and street.
  const walk = lawnRight + 60;
  g.rect(walk, origin.y - 14, 80, view.height).fill(p.walk);
  for (let y = origin.y; y < view.height; y += 50) g.moveTo(walk, y).lineTo(walk + 80, y).stroke({ width: 1.5, color: p.walkLine });
  g.rect(walk + 80, origin.y - 14, 10, view.height).fill(p.curb);
  g.rect(walk + 90, origin.y - 14, view.maxX - walk - 90, view.height).fill(p.street);
  for (let y = origin.y; y < view.height; y += 70) g.rect(walk + 210, y, 6, 36).fill(p.stripe);

  const c = new Container();
  c.addChild(g);
  return c;
}

export function dayLawnArt(board: LawnGeometry): Container {
  return lawnArt(board, 'day');
}
