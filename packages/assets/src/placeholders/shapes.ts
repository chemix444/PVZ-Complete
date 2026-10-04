import type { Graphics } from 'pixi.js';

export interface StrokeStyle {
  readonly width: number;
  readonly color: number;
}

/** Filled ellipse rotated by angle (radians), as a polygon. */
export function rotatedEllipse(
  g: Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angle: number,
  color: number,
  stroke?: StrokeStyle,
): Graphics {
  const points: number[] = [];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    points.push(cx + x * cos - y * sin, cy + x * sin + y * cos);
  }
  g.poly(points).fill(color);
  if (stroke) g.stroke(stroke);
  return g;
}
