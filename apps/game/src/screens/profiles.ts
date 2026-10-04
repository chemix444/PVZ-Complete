import { button, h, type Screen } from '@pvz/ui';
import { createProfile, type PlayerProfile } from '@pvz/save';
import type { GameContext } from '../context';

export class ProfilesScreen implements Screen {
  private root: HTMLElement | null = null;

  constructor(private readonly ctx: GameContext) {}

  mount(root: HTMLElement): void {
    this.root = root;
    this.ctx.audio.playMusic('music.menu');
    void this.render();
  }

  unmount(): void {
    this.root = null;
  }

  private async render(): Promise<void> {
    const profiles = await this.ctx.store.list();
    if (!this.root) return;
    const input = h('input', { type: 'text', maxLength: 16, placeholder: 'Your name', 'aria-label': 'New profile name' });
    const create = () => {
      const name = input.value.trim();
      if (name) void this.create(name);
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') create();
    });
    this.root.replaceChildren(
      h(
        'div',
        { class: 'screen' },
        h('h1', null, 'PVZ Complete', h('small', null, 'ONE LAWN, ONE STORY')),
        h('p', { class: 'subtitle' }, profiles.length ? 'Who is playing?' : 'Welcome! Enter your name to start a new game.'),
        profiles.length
          ? h('div', { class: 'profile-list' }, ...profiles.map((profile) => this.row(profile)))
          : null,
        h('div', { class: 'new-profile' }, input, button('Create', create)),
      ),
    );
    input.focus();
  }

  private row(profile: PlayerProfile): HTMLElement {
    const completed = Object.keys(profile.campaign.completed).length;
    const plants = Object.keys(profile.plants).length;
    return h(
      'div',
      { class: 'profile-row' },
      h('div', { class: 'name' }, profile.name, h('div', { class: 'meta' }, `${plants} plants · ${completed} campaign steps`)),
      button('Play', () => void this.select(profile)),
      button(
        'Delete',
        () => {
          if (confirm(`Delete ${profile.name}? This cannot be undone.`)) void this.remove(profile);
        },
        'danger',
      ),
    );
  }

  private async create(name: string): Promise<void> {
    const now = Date.now();
    const profile = createProfile(name, now);
    this.ctx.campaign.start(profile, now);
    await this.ctx.store.save(profile);
    await this.select(profile);
  }

  private async select(profile: PlayerProfile): Promise<void> {
    this.ctx.campaign.start(profile, Date.now());
    this.ctx.profile = profile;
    await this.ctx.store.setActiveId(profile.id);
    await this.ctx.saveProfile();
    this.ctx.applySettings();
    this.ctx.nav.menu();
  }

  private async remove(profile: PlayerProfile): Promise<void> {
    await this.ctx.store.remove(profile.id);
    if (this.ctx.profile?.id === profile.id) this.ctx.profile = null;
    await this.render();
  }
}
