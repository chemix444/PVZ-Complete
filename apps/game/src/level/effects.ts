import { Container, Graphics, Text } from 'pixi.js';
import type { EffectDef } from '@pvz/content';

interface Particle {
  readonly g: Graphics;
  vx: number;
  vy: number;
  life: number;
  readonly maxLife: number;
  readonly gravity: number;
  spin: number;
  /** Debris settles here instead of falling forever. */
  readonly floor: number;
}

/** Purely visual particles and falling debris; never touches the simulation. */
export class Effects {
  readonly layer = new Container();
  private readonly live: Particle[] = [];
  private readonly pool: Graphics[] = [];

  burst(def: EffectDef, x: number, y: number): void {
    for (let i = 0; i < def.particles; i++) {
      const g = this.pool.pop() ?? new Graphics();
      const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
      g.clear().circle(0, 0, size).fill(def.colors[i % def.colors.length]);
      g.position.set(x, y);
      g.alpha = 1;
      g.rotation = 0;
      g.scale.set(1);
      this.layer.addChild(g);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * def.spread * 2;
      const speed = def.speed[0] + Math.random() * (def.speed[1] - def.speed[0]);
      this.live.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: def.lifetime,
        maxLife: def.lifetime,
        gravity: def.gravity,
        spin: 0,
        floor: Infinity,
      });
    }
  }

  /** Sends a detached part (head, arm, cone) tumbling onto the lawn at floorY. */
  debris(part: Container, x: number, y: number, vx: number, vy: number, floorY: number): void {
    const g = new Graphics();
    g.addChild(part);
    g.position.set(x, y);
    this.layer.addChild(g);
    this.live.push({ g, vx, vy, life: 1.6, maxLife: 1.6, gravity: 900, spin: (Math.random() - 0.5) * 8, floor: floorY });
  }

  /** Floating word (SPUDOW!) that rises and fades. */
  text(word: string, x: number, y: number, color: number): void {
    const label = new Text({
      text: word,
      style: { fontFamily: 'Trebuchet MS', fontSize: 30, fontWeight: 'bold', fill: color, stroke: { color: 0x3a1a08, width: 5 } },
    });
    label.anchor.set(0.5);
    const g = new Graphics();
    g.addChild(label);
    g.position.set(x, y);
    this.layer.addChild(g);
    this.live.push({ g, vx: 0, vy: -40, life: 1, maxLife: 1, gravity: 0, spin: 0, floor: Infinity });
  }

  update(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.live.splice(i, 1);
        p.g.removeFromParent();
        if (p.g.children.length === 0) this.pool.push(p.g);
        else p.g.destroy({ children: true });
        continue;
      }
      p.vy += p.gravity * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.rotation += p.spin * dt;
      if (p.g.y >= p.floor) {
        p.g.y = p.floor;
        p.vy = 0;
        p.vx *= 0.8;
        p.spin = 0;
      }
      p.g.alpha = Math.min(1, (p.life / p.maxLife) * 2);
    }
  }

  clear(): void {
    for (const p of this.live) p.g.destroy({ children: true });
    this.live.length = 0;
  }
}
