import { Container, Graphics, Text } from 'pixi.js';
import { sunArt, zombieHeadArt } from '@pvz/assets';
import type { LevelDef, PlantDef, Simulation } from '@pvz/engine';
import { CanvasButton, PACKET_HEIGHT, PACKET_WIDTH, SeedPacketView } from './packet';

const BANK_X = 6;
const PACKET_START = 86;
const PACKET_STEP = 56;

/** Seed bank with sun counter, as in PvZ 1: top-left, one slot per seed. */
export class SeedBank extends Container {
  readonly packets: SeedPacketView[] = [];
  private readonly sunText: Text;
  private readonly sunBox = new Graphics();
  private readonly slots: number;
  private flashUntil = 0;

  constructor(slots: number) {
    super();
    this.slots = slots;
    const width = PACKET_START + slots * PACKET_STEP + 4;
    const bg = new Graphics()
      .roundRect(0, 0, width, 88, 8)
      .fill(0x7a4a22)
      .stroke({ width: 3, color: 0x4a2a10 })
      .roundRect(PACKET_START - 4, 6, slots * PACKET_STEP + 4, 76, 6)
      .fill(0x5a3416);
    for (let i = 0; i < slots; i++) bg.roundRect(PACKET_START + i * PACKET_STEP, 9, PACKET_WIDTH, PACKET_HEIGHT, 5).fill(0x4a2a10);
    const sun = sunArt().root;
    sun.scale.set(0.62);
    sun.position.set(40, 32);
    this.sunBox.roundRect(10, 58, 62, 22, 6).fill(0xf2e6c2).stroke({ width: 2, color: 0x4a2a10 });
    this.sunText = new Text({ text: '0', style: { fontFamily: 'Trebuchet MS', fontSize: 17, fontWeight: 'bold', fill: 0x2b1d0e } });
    this.sunText.anchor.set(0.5);
    this.sunText.position.set(41, 69);
    this.addChild(bg, sun, this.sunBox, this.sunText);
    this.position.set(BANK_X, 0);
  }

  /** Board-space point sun flies to (centre of the sun icon). */
  static sunTarget(): { x: number; y: number } {
    return { x: BANK_X + 40, y: 32 };
  }

  setPlants(defs: readonly PlantDef[]): void {
    for (const packet of this.packets) packet.destroy({ children: true });
    this.packets.length = 0;
    defs.slice(0, this.slots).forEach((def, i) => {
      const packet = new SeedPacketView(def);
      packet.position.set(PACKET_START + i * PACKET_STEP, 9);
      this.packets.push(packet);
      this.addChild(packet);
    });
  }

  slotPosition(index: number): { x: number; y: number } {
    return { x: BANK_X + PACKET_START + index * PACKET_STEP, y: 9 };
  }

  update(sim: Simulation | null, sun: number, held: number, now: number): void {
    this.sunText.text = String(sun);
    this.sunText.style.fill = now < this.flashUntil && Math.floor(now * 10) % 2 === 0 ? 0xd02010 : 0x2b1d0e;
    this.packets.forEach((packet, i) => {
      const state = sim?.seedBank[i];
      packet.setState({
        charge: state ? state.charge : 1,
        affordable: state ? sun >= state.cost : true,
        held: held === i,
      });
    });
  }

  /** PvZ 1 flashes the sun counter when a packet is too expensive. */
  flashSun(now: number): void {
    this.flashUntil = now + 0.8;
  }
}

/** Bottom-right wave progress bar with flag markers and a zombie-head cursor. */
export class ProgressMeter extends Container {
  private readonly fill = new Graphics();
  private readonly head = new Container();
  private readonly flags: Container[] = [];
  private readonly flagPositions: number[] = [];
  private static readonly W = 150;

  constructor(level: LevelDef) {
    super();
    const w = ProgressMeter.W;
    const frame = new Graphics().roundRect(0, 0, w, 16, 7).fill(0x3a2410).stroke({ width: 2, color: 0x1f130a });
    const label = new Text({
      text: `Level ${level.label}`,
      style: { fontFamily: 'Trebuchet MS', fontSize: 15, fontWeight: 'bold', fill: 0xfff8e1, stroke: { color: 0x3a2410, width: 3 } },
    });
    label.anchor.set(1, 0.5);
    label.position.set(-8, 8);
    this.addChild(frame, this.fill);
    level.waves.forEach((wave, i) => {
      if (!wave.flag) return;
      const at = ((i + 1) / level.waves.length) * w;
      const flag = new Graphics()
        .moveTo(0, 0)
        .lineTo(0, -18)
        .stroke({ width: 2, color: 0x4a2a10 })
        .poly([0, -18, 12, -15, 0, -11])
        .fill(0xb3261e);
      flag.position.set(w - at + 2, 12);
      this.flags.push(flag);
      this.flagPositions.push((i + 1) / level.waves.length);
      this.addChild(flag);
    });
    const headArt = zombieHeadArt();
    headArt.scale.set(0.55);
    headArt.position.set(-31, -6);
    this.head.addChild(headArt);
    this.addChild(this.head, label);
    this.position.set(800 - w - 12, 600 - 26);
  }

  update(progress: number): void {
    const w = ProgressMeter.W;
    // The bar fills from right to left, like the zombies' advance.
    this.fill.clear().roundRect(w - w * progress + 2, 3, Math.max(0, w * progress - 4), 10, 5).fill(0x7bd23c);
    this.head.position.set(w - w * progress, 0);
    this.flags.forEach((flag, i) => (flag.y = progress >= this.flagPositions[i] ? 6 : 12));
  }
}

interface BannerSpec {
  readonly color?: number;
  readonly size?: number;
  readonly duration?: number;
  readonly shake?: boolean;
}

/** Centered announcement text ("Ready...", "A Huge Wave...", "FINAL WAVE"). */
export class Banner extends Container {
  private text: Text | null = null;
  private elapsed = 0;
  private spec: BannerSpec = {};

  show(message: string, spec: BannerSpec = {}): void {
    this.text?.destroy();
    this.spec = spec;
    this.elapsed = 0;
    this.text = new Text({
      text: message,
      style: {
        fontFamily: 'Trebuchet MS',
        fontSize: spec.size ?? 44,
        fontWeight: 'bold',
        fill: spec.color ?? 0xd8261a,
        stroke: { color: 0x1a0a04, width: 6 },
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 700,
      },
    });
    this.text.anchor.set(0.5);
    this.text.position.set(400, 300);
    this.addChild(this.text);
  }

  get active(): boolean {
    return this.text !== null;
  }

  update(dt: number): void {
    const text = this.text;
    if (!text) return;
    this.elapsed += dt;
    const duration = this.spec.duration ?? 2.5;
    const t = this.elapsed;
    text.scale.set(t < 0.15 ? 1.6 - (t / 0.15) * 0.6 : 1);
    text.alpha = t > duration - 0.3 ? Math.max(0, (duration - t) / 0.3) : 1;
    text.position.set(400 + (this.spec.shake ? Math.sin(t * 60) * 3 : 0), 300);
    if (t >= duration) {
      text.destroy();
      this.text = null;
    }
  }
}

export class MenuButton extends CanvasButton {
  constructor(onClick: () => void) {
    super('Menu', 96, 34, onClick);
    this.position.set(800 - 96 - 10, 8);
  }
}
