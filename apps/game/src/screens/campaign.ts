import { button, h, type Screen } from '@pvz/ui';
import { LevelRegistry, WorldRegistry, type WorldDef } from '@pvz/content';
import type { Era } from '@pvz/engine';
import { requireProfile, type GameContext } from '../context';

const CHAPTERS: { era: Era; title: string }[] = [
  { era: 'pvz1', title: 'Plants vs. Zombies' },
  { era: 'pvz2', title: "Plants vs. Zombies 2: It's About Time" },
];

/** Level select over the one campaign graph. Chapters appear once they have worlds. */
export class CampaignScreen implements Screen {
  constructor(
    private readonly ctx: GameContext,
    private readonly focusWorld?: string,
  ) {}

  mount(root: HTMLElement): void {
    this.ctx.audio.playMusic('music.menu');
    const chapters = CHAPTERS.map(({ era, title }) => {
      const worlds = WorldRegistry.all().filter((world) => world.era === era);
      if (worlds.length === 0) return null;
      return h('div', { class: 'chapter' }, h('h2', null, title), ...worlds.map((world) => this.worldCard(world)));
    });
    root.append(
      h(
        'div',
        { class: 'screen' },
        h('div', { class: 'back' }, button('Back', () => this.ctx.nav.menu(), 'secondary')),
        h('h1', null, 'Campaign'),
        ...chapters,
      ),
    );
    root.querySelector('.world-card.focus')?.scrollIntoView({ block: 'center' });
  }

  unmount(): void {}

  onKey(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      this.ctx.nav.menu();
      return true;
    }
    return false;
  }

  private worldCard(world: WorldDef): HTMLElement {
    const ctx = this.ctx;
    const profile = requireProfile(ctx);
    const nodes = ctx.campaign.order.filter((node) => node.world === world.id && node.level);
    const done = nodes.filter((node) => ctx.campaign.isCompleted(profile, node.id)).length;
    const tiles = nodes.map((node) => {
      const level = LevelRegistry.get(node.level!);
      const status = ctx.campaign.status(profile, node.id);
      const tile = h(
        'button',
        { class: `level-tile ${status}`, type: 'button', disabled: status === 'locked', title: `${level.name} ${level.label}` },
        level.label,
        h('small', null, status === 'completed' ? 'Replay' : status === 'available' ? 'Play' : 'Locked'),
      );
      tile.addEventListener('click', () => ctx.nav.level(level.id));
      return tile;
    });
    return h(
      'div',
      { class: `world-card${world.id === this.focusWorld ? ' focus' : ''}` },
      h('h3', null, world.name, h('span', null, `${done}/${nodes.length} complete`)),
      h('div', { class: 'level-grid' }, ...tiles),
    );
  }
}
