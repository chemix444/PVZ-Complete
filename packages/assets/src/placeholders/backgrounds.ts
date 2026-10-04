import { Container, Graphics } from 'pixi.js';

export interface LawnGeometry {
  readonly origin: { readonly x: number; readonly y: number };
  readonly tile: { readonly width: number; readonly height: number };
  readonly rows: number;
  readonly cols: number;
  readonly view: { readonly minX: number; readonly maxX: number; readonly height: number };
}

/** PvZ 1 front yard by day: house on the left, striped lawn, sidewalk and street on the right. */
export function dayLawnArt(board: LawnGeometry): Container {
  const { origin, tile, rows, cols, view } = board;
  const g = new Graphics();
  const lawnRight = origin.x + cols * tile.width;
  const lawnBottom = origin.y + rows * tile.height;

  g.rect(view.minX, 0, view.maxX - view.minX, view.height).fill(0x4f8f2a);

  // House and porch.
  const houseRight = -30;
  g.rect(view.minX, 0, houseRight - view.minX, view.height).fill(0xd9c99c);
  for (let y = 12; y < view.height; y += 18) {
    g.moveTo(view.minX, y).lineTo(houseRight, y).stroke({ width: 1.5, color: 0xb8a77a });
  }
  g.rect(view.minX + 40, 190, 70, 150).fill(0x7a4a22).stroke({ width: 4, color: 0x4a2a10 });
  g.circle(view.minX + 98, 268, 4).fill(0xd8b040);
  g.rect(view.minX + 130, 120, 50, 60).fill(0x9fc7e0).stroke({ width: 4, color: 0xf2efe6 });
  g.rect(houseRight, 40, origin.x - houseRight - 6, view.height - 40).fill(0xa49c8c);
  for (let y = 40; y < view.height; y += 40) {
    g.moveTo(houseRight, y).lineTo(origin.x - 6, y).stroke({ width: 1, color: 0x8a8274 });
  }

  // Back fence and hedge above the lawn.
  g.rect(origin.x - 6, 0, view.maxX - origin.x, origin.y - 14).fill(0x2f6b1c);
  for (let x = origin.x; x < lawnRight + 60; x += 34) {
    g.roundRect(x, 18, 24, origin.y - 26, 4).fill(0xe8dcc0).stroke({ width: 2, color: 0xa8987a });
  }
  g.rect(origin.x - 6, 40, lawnRight - origin.x + 70, 8).fill(0xd8ccb0);

  // Lawn cells, alternating shades like mown stripes.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const light = (row + col) % 2 === 0;
      const shade = row % 2 === 0 ? (light ? 0x74c23f : 0x66b534) : light ? 0x6dbb39 : 0x5fab2f;
      g.rect(origin.x + col * tile.width, origin.y + row * tile.height, tile.width, tile.height).fill(shade);
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = origin.x + ((i * 97) % (cols * tile.width));
    const y = origin.y + ((i * 53) % (rows * tile.height)) + 8;
    g.moveTo(x, y).lineTo(x - 3, y - 7).moveTo(x + 4, y).lineTo(x + 5, y - 8).stroke({ width: 1.5, color: 0x4f9a26 });
  }
  g.rect(origin.x, lawnBottom, lawnRight - origin.x + 60, view.height - lawnBottom).fill(0x6b4a24);

  // Sidewalk, curb and street.
  const walk = lawnRight + 60;
  g.rect(walk, origin.y - 14, 80, view.height).fill(0xbdb7aa);
  for (let y = origin.y; y < view.height; y += 50) g.moveTo(walk, y).lineTo(walk + 80, y).stroke({ width: 1.5, color: 0x9a9488 });
  g.rect(walk + 80, origin.y - 14, 10, view.height).fill(0x8a857a);
  g.rect(walk + 90, origin.y - 14, view.maxX - walk - 90, view.height).fill(0x4b4b50);
  for (let y = origin.y; y < view.height; y += 70) g.rect(walk + 210, y, 6, 36).fill(0xe8d870);

  const c = new Container();
  c.addChild(g);
  return c;
}
