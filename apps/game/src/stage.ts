import { Application, Container, Graphics, Rectangle } from 'pixi.js';

export const VIEW_WIDTH = 800;
export const VIEW_HEIGHT = 600;

/**
 * Letterboxed 800x600 logical viewport shared by the Pixi scene and the DOM
 * overlay, so canvas content and menus use the same coordinates.
 */
export class Stage {
  readonly scene = new Container();
  readonly overlay: HTMLDivElement;
  scale = 1;

  private constructor(
    readonly app: Application,
    readonly host: HTMLElement,
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'game-overlay';
    host.append(app.canvas, this.overlay);

    this.scene.eventMode = 'static';
    this.scene.hitArea = new Rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    const mask = new Graphics().rect(0, 0, VIEW_WIDTH, VIEW_HEIGHT).fill(0xffffff);
    this.scene.addChild(mask);
    this.scene.mask = mask;
    app.stage.addChild(this.scene);

    window.addEventListener('resize', () => this.layout());
    this.layout();
  }

  static async create(host: HTMLElement): Promise<Stage> {
    const app = new Application();
    await app.init({
      resizeTo: window,
      background: 0x0d1a08,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    return new Stage(app, host);
  }

  layout(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.scale = Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT);
    const x = Math.round((width - VIEW_WIDTH * this.scale) / 2);
    const y = Math.round((height - VIEW_HEIGHT * this.scale) / 2);
    this.scene.scale.set(this.scale);
    this.scene.position.set(x, y);
    this.overlay.style.transform = `translate(${x}px, ${y}px) scale(${this.scale})`;
  }
}
