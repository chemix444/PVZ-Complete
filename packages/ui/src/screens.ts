/** A full-screen UI state. Screens own their DOM and any canvas content. */
export interface Screen {
  mount(root: HTMLElement): void;
  unmount(): void;
  /** Called every frame while the screen is active. */
  update?(dtMs: number): void;
  /** Keyboard events reach the active screen first. */
  onKey?(event: KeyboardEvent): boolean | void;
}

export class ScreenManager {
  private current: Screen | null = null;

  constructor(private readonly root: HTMLElement) {}

  get active(): Screen | null {
    return this.current;
  }

  show(screen: Screen): void {
    this.current?.unmount();
    this.root.replaceChildren();
    this.current = screen;
    screen.mount(this.root);
  }

  update(dtMs: number): void {
    this.current?.update?.(dtMs);
  }

  key(event: KeyboardEvent): boolean {
    return this.current?.onKey?.(event) === true;
  }
}
