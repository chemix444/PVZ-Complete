import { Container, Graphics, Text } from 'pixi.js';
import type { PlantDef } from '@pvz/engine';
import { CanvasButton, SeedPacketView } from './packet';

const COLUMNS = 8;
const X = 6;
const Y = 96;
const W = 470;
const H = 490;

/** PvZ 1 style "Choose your plants" panel under the seed bank. */
export class SeedChooser extends Container {
  readonly chosen: PlantDef[] = [];
  private readonly packets = new Map<string, SeedPacketView>();
  private readonly info: Text;
  private readonly rock: CanvasButton;

  constructor(
    private readonly available: readonly PlantDef[],
    private readonly slots: number,
    private readonly forced: ReadonlySet<string>,
    private readonly onChange: () => void,
    onConfirm: () => void,
  ) {
    super();
    const bg = new Graphics()
      .roundRect(0, 0, W, H, 12)
      .fill(0x7a4a22)
      .stroke({ width: 4, color: 0x4a2a10 })
      .roundRect(12, 46, W - 24, 330, 8)
      .fill(0x4a2a10)
      .roundRect(12, 386, W - 24, 46, 8)
      .fill(0xf2e6c2);
    const title = new Text({
      text: 'Choose your plants!',
      style: { fontFamily: 'Trebuchet MS', fontSize: 24, fontWeight: 'bold', fill: 0xffe36b, stroke: { color: 0x3a2410, width: 4 } },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 10);
    this.info = new Text({
      text: 'Click a seed packet to add it to your seed bank.',
      style: { fontFamily: 'Trebuchet MS', fontSize: 13, fill: 0x2b1d0e, wordWrap: true, wordWrapWidth: W - 44 },
    });
    this.info.position.set(22, 392);
    this.rock = new CanvasButton("Let's Rock!", 180, 40, onConfirm);
    this.rock.position.set((W - 180) / 2, H - 50);
    this.addChild(bg, title, this.info, this.rock);

    available.forEach((def, i) => {
      const packet = new SeedPacketView(def);
      packet.position.set(24 + (i % COLUMNS) * 54, 56 + Math.floor(i / COLUMNS) * 78);
      packet.on('pointerdown', (event) => {
        event.stopPropagation();
        this.toggle(def);
      });
      packet.on('pointerover', () => (this.info.text = `${def.name} (${def.cost} sun): ${def.description ?? ''}`));
      this.packets.set(def.id, packet);
      this.addChild(packet);
    });
    for (const def of available) if (forced.has(def.id)) this.add(def);
    this.position.set(X, Y);
    this.refresh();
  }

  /** The bank is full, or every available plant is in it. */
  get ready(): boolean {
    return this.chosen.length >= Math.min(this.slots, this.available.length);
  }

  toggle(def: PlantDef): void {
    if (this.chosen.includes(def)) this.remove(def);
    else this.add(def);
  }

  remove(def: PlantDef): boolean {
    if (this.forced.has(def.id)) return false;
    const index = this.chosen.indexOf(def);
    if (index < 0) return false;
    this.chosen.splice(index, 1);
    this.refresh();
    this.onChange();
    return true;
  }

  private add(def: PlantDef): void {
    if (this.chosen.length >= this.slots || this.chosen.includes(def)) return;
    this.chosen.push(def);
    this.refresh();
    this.onChange();
  }

  private refresh(): void {
    for (const [id, packet] of this.packets) {
      const picked = this.chosen.some((d) => d.id === id);
      packet.setState({ charge: 1, affordable: !picked, held: false });
      packet.alpha = picked ? 0.35 : 1;
    }
    this.rock.enabled = this.ready;
  }
}
