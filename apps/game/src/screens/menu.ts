import { button, h, type Screen } from '@pvz/ui';
import { LevelRegistry, PlantRegistry, WorldRegistry } from '@pvz/content';
import { requireProfile, type GameContext } from '../context';

export class MenuScreen implements Screen {
  constructor(
    private readonly ctx: GameContext,
    private readonly openDevTools: () => void,
  ) {}

  mount(root: HTMLElement): void {
    const ctx = this.ctx;
    const profile = requireProfile(ctx);
    ctx.audio.playMusic('music.menu');
    const current = profile.campaign.current ? ctx.campaign.node(profile.campaign.current) : null;
    const level = current?.level ? LevelRegistry.find(current.level) : undefined;
    const world = current?.world ? WorldRegistry.find(current.world) : undefined;
    const started = Object.keys(profile.levels).length > 0;

    const adventure = button('', () => level && ctx.nav.level(level.id));
    adventure.append(
      started ? 'Continue Adventure' : 'Start Adventure',
      h('small', null, level ? `${world?.name ?? ''} · Level ${level.label}` : 'All available levels complete'),
    );
    adventure.disabled = !level;

    const ownedPlants = Object.keys(profile.plants).filter((id) => PlantRegistry.has(id)).length;
    const levelsDone = ctx.campaign.order.filter((node) => node.level && ctx.campaign.isCompleted(profile, node.id)).length;
    const totalLevels = ctx.campaign.order.filter((node) => node.level).length;

    root.append(
      h(
        'div',
        { class: 'screen' },
        h('h1', null, 'PVZ Complete', h('small', null, 'PLANTS VS. ZOMBIES 1 + 2')),
        h('p', { class: 'subtitle' }, `Welcome back, ${profile.name}!`),
        h(
          'div',
          { class: 'menu-sign' },
          adventure,
          button('Campaign', () => ctx.nav.campaign(), 'secondary'),
          button('Plant Collection & Almanac', () => ctx.nav.almanac('plants'), 'secondary'),
          button('Settings', () => ctx.nav.settings(), 'secondary'),
          profile.settings.devTools ? button('Developer Tools', this.openDevTools, 'secondary') : null,
          button('Change User', () => ctx.nav.profiles(), 'secondary'),
        ),
        h(
          'div',
          { class: 'menu-footer' },
          `${ownedPlants}/${PlantRegistry.size} plants · ${levelsDone}/${totalLevels} levels · press \` for developer tools`,
        ),
      ),
    );
  }

  unmount(): void {}

  onKey(event: KeyboardEvent): boolean {
    if (event.key === 'Enter') {
      const profile = requireProfile(this.ctx);
      const node = profile.campaign.current ? this.ctx.campaign.node(profile.campaign.current) : null;
      if (node?.level) this.ctx.nav.level(node.level);
      return true;
    }
    return false;
  }
}
