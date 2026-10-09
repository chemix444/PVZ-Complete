import { Container, Graphics, Text } from 'pixi.js';
import { plantArt } from '@pvz/assets';
import type { PlantDef } from '@pvz/engine';

export const PACKET_WIDTH = 50;
export const PACKET_HEIGHT = 70;

export interface PacketState {
  /** 0 = just used, 1 = ready. */
  readonly charge: number;
  readonly affordable: boolean;
  /** Picked up and following the cursor. */
  readonly held: boolean;
}

/** A seed packet card: plant picture, sun cost and cooldown shading. */
export class SeedPacketView extends Container {
  private readonly cooldown = new Graphics();
  private readonly dim = new Graphics();
  private readonly frame = new Graphics();
  private lastCharge = -1;

  constructor(
    readonly def: PlantDef,
    showCost = true,
  ) {
    super();
    const card = new Graphics()
      .roundRect(0, 0, PACKET_WIDTH, PACKET_HEIGHT, 5)
      .fill(0xf2e6c2)
      .stroke({ width: 2, color: 0x6b4a2a })
      .roundRect(4, 4, PACKET_WIDTH - 8, 48, 3)
      .fill(0xb9dc8e)
      .rect(4, 54, PACKET_WIDTH - 8, 13)
      .fill(0xfff8e0);
    const art = plantArt(def.id, def.name).root;
    art.scale.set(0.5);
    art.position.set(5, 3);
    const icon = new Container();
    icon.addChild(art);
    const iconMask = new Graphics().roundRect(4, 4, PACKET_WIDTH - 8, 48, 3).fill(0xffffff);
    icon.mask = iconMask;
    const cost = new Text({
      text: String(def.cost),
      style: { fontFamily: 'Trebuchet MS', fontSize: 12, fontWeight: 'bold', fill: 0x2b1d0e },
    });
    cost.anchor.set(0.5);
    cost.position.set(PACKET_WIDTH / 2, 61);
    cost.visible = showCost;
    this.dim.roundRect(0, 0, PACKET_WIDTH, PACKET_HEIGHT, 5).fill({ color: 0x000000, alpha: 0.4 });
    this.frame.roundRect(-2, -2, PACKET_WIDTH + 4, PACKET_HEIGHT + 4, 6).stroke({ width: 3, color: 0xffe14d });
    this.frame.visible = false;
    this.addChild(card, iconMask, icon, cost, this.cooldown, this.dim, this.frame);
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  setState(state: PacketState): void {
    const charge = Math.max(0, Math.min(1, state.charge));
    if (charge !== this.lastCharge) {
      this.lastCharge = charge;
      this.cooldown.clear();
      if (charge < 1) {
        this.cooldown.roundRect(0, 0, PACKET_WIDTH, PACKET_HEIGHT * (1 - charge), 5).fill({ color: 0x000000, alpha: 0.45 });
      }
    }
    this.dim.visible = state.held || !state.affordable || charge < 1;
    this.frame.visible = state.held;
  }

  setHighlight(on: boolean): void {
    this.frame.visible = on;
  }
}

/** Rounded button drawn in the canvas (HUD and chooser). */
export class CanvasButton extends Container {
  private readonly bg = new Graphics();
  private readonly caption: Text;
  private enabledState = true;

  constructor(
    text: string,
    private readonly w: number,
    private readonly h: number,
    onClick: () => void,
  ) {
    super();
    this.caption = new Text({
      text,
      style: {
        fontFamily: 'Trebuchet MS',
        fontSize: Math.round(h * 0.5),
        fontWeight: 'bold',
        fill: 0xfff8e1,
        stroke: { color: 0x3a2410, width: 3 },
      },
    });
    this.caption.anchor.set(0.5);
    this.caption.position.set(w / 2, h / 2);
    this.addChild(this.bg, this.caption);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', (event) => {
      event.stopPropagation();
      if (this.enabledState) onClick();
    });
    this.on('pointerover', () => this.draw(true));
    this.on('pointerout', () => this.draw(false));
    this.draw(false);
  }

  set enabled(value: boolean) {
    this.enabledState = value;
    this.cursor = value ? 'pointer' : 'default';
    this.draw(false);
  }

  get enabled(): boolean {
    return this.enabledState;
  }

  private draw(hover: boolean): void {
    const color = !this.enabledState ? 0x7a7a70 : hover ? 0x6ccc48 : 0x4fa82e;
    this.bg
      .clear()
      .roundRect(0, 3, this.w, this.h, 10)
      .fill({ color: 0x000000, alpha: 0.35 })
      .roundRect(0, 0, this.w, this.h, 10)
      .fill(color)
      .stroke({ width: 3, color: 0x3a2410 });
  }
}
