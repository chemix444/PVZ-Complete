import { button, h, type Screen } from '@pvz/ui';
import { CampaignRegistry, LevelRegistry, levelZombieTypes, PlantRegistry, ZombieRegistry } from '@pvz/content';
import type { PlantDef, ZombieDef } from '@pvz/engine';
import { requireProfile, type GameContext } from '../context';
import { plantIcon, zombieIcon } from '../icons';

type Tab = 'plants' | 'zombies';

export class AlmanacScreen implements Screen {
  private root: HTMLElement | null = null;
  private selected: string | null = null;

  constructor(
    private readonly ctx: GameContext,
    private tab: Tab,
  ) {}

  mount(root: HTMLElement): void {
    this.root = root;
    this.ctx.audio.playMusic('music.menu');
    this.render();
  }

  unmount(): void {
    this.root = null;
  }

  onKey(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      this.ctx.nav.menu();
      return true;
    }
    return false;
  }

  private render(): void {
    if (!this.root) return;
    const profile = requireProfile(this.ctx);
    const seen = this.seenZombies();
    if (this.tab === 'zombies' && !profile.features.includes('almanac')) this.tab = 'plants';
    const entries =
      this.tab === 'plants'
        ? PlantRegistry.all()
            .filter((def) => !def.tags.includes('minigame'))
            .map((def) => ({ id: def.id, name: def.name, known: def.id in profile.plants }))
        : ZombieRegistry.all().map((def) => ({ id: def.id, name: def.name, known: seen.has(def.id) }));
    this.selected ??= entries.find((e) => e.known)?.id ?? null;

    const grid = h('div', { class: 'almanac-grid', role: 'listbox' });
    for (const entry of entries) {
      const img = h('img', { alt: '' });
      void (this.tab === 'plants' ? plantIcon : zombieIcon)(this.ctx.stage.app, entry.id).then((src) => (img.src = src));
      const cell = h(
        'button',
        {
          class: `almanac-entry${entry.known ? '' : ' locked'}`,
          type: 'button',
          role: 'option',
          'aria-selected': String(entry.id === this.selected),
        },
        img,
        entry.known ? entry.name : '???',
      );
      cell.addEventListener('click', () => {
        this.selected = entry.id;
        this.render();
      });
      grid.append(cell);
    }

    const tabButton = (tab: Tab, label: string) => {
      const b = button(label, () => {
        this.tab = tab;
        this.selected = null;
        this.render();
      }, 'secondary');
      b.setAttribute('aria-pressed', String(this.tab === tab));
      return b;
    };

    const collectible = PlantRegistry.all().filter((def) => !def.tags.includes('minigame'));
    const ownedCount = collectible.filter((def) => def.id in profile.plants).length;
    const zombiesTab = tabButton('zombies', 'Zombies');
    if (!profile.features.includes('almanac')) {
      zombiesTab.disabled = true;
      zombiesTab.title = 'Find the Almanac in the Day campaign to read about zombies.';
    }
    this.root.replaceChildren(
      h(
        'div',
        { class: 'screen' },
        h('div', { class: 'back' }, button('Back', () => this.ctx.nav.menu(), 'secondary')),
        h('h1', null, 'Almanac'),
        h('p', { class: 'subtitle' }, `Plant collection: ${ownedCount} of ${collectible.length}`),
        h('div', { class: 'almanac-tabs' }, tabButton('plants', 'Plants'), zombiesTab),
        h('div', { class: 'almanac' }, grid, h('div', { class: 'almanac-detail' }, this.detail(entries.find((e) => e.id === this.selected)))),
      ),
    );
  }

  private detail(entry: { id: string; known: boolean } | undefined): HTMLElement {
    if (!entry || !entry.known) {
      return h('section', { class: 'pvz-panel' }, h('p', null, entry ? 'Not discovered yet. Keep playing the campaign.' : 'Nothing here yet.'));
    }
    const img = h('img', { alt: '' });
    if (this.tab === 'plants') {
      const def = PlantRegistry.get(entry.id);
      void plantIcon(this.ctx.stage.app, def.id).then((src) => (img.src = src));
      return h('section', { class: 'pvz-panel' }, img, ...this.plantFacts(def));
    }
    const def = ZombieRegistry.get(entry.id);
    void zombieIcon(this.ctx.stage.app, def.id).then((src) => (img.src = src));
    return h('section', { class: 'pvz-panel' }, img, ...this.zombieFacts(def));
  }

  private plantFacts(def: PlantDef): HTMLElement[] {
    const owned = requireProfile(this.ctx).plants[def.id];
    const source = owned && CampaignRegistry.find(owned.source)?.title;
    return [
      h('h2', { class: 'pvz-panel-title' }, def.name, ' ', h('span', { class: 'era-badge' }, def.era === 'pvz1' ? 'PvZ 1' : 'PvZ 2')),
      h('p', null, def.description ?? ''),
      h(
        'dl',
        null,
        h('dt', null, 'Cost'),
        h('dd', null, `${def.cost} sun`),
        h('dt', null, 'Recharge'),
        h('dd', null, `${def.recharge} s`),
        h('dt', null, 'Toughness'),
        h('dd', null, `${def.health}`),
        source ? h('dt', null, 'Earned') : null,
        source ? h('dd', null, source) : null,
      ),
    ];
  }

  private zombieFacts(def: ZombieDef): HTMLElement[] {
    const armor = (def.armor ?? []).reduce((sum, layer) => sum + layer.health, 0);
    return [
      h('h2', { class: 'pvz-panel-title' }, def.name, ' ', h('span', { class: 'era-badge' }, def.era === 'pvz1' ? 'PvZ 1' : 'PvZ 2')),
      h('p', null, def.description ?? ''),
      h(
        'dl',
        null,
        h('dt', null, 'Health'),
        h('dd', null, armor ? `${def.health} + ${armor} armor` : `${def.health}`),
        h('dt', null, 'Speed'),
        h('dd', null, `${def.speed[0]}-${def.speed[1]} px/s`),
      ),
    ];
  }

  /** Zombies from every level the profile has opened. */
  private seenZombies(): Set<string> {
    const profile = requireProfile(this.ctx);
    const seen = new Set<string>();
    for (const node of this.ctx.campaign.order) {
      if (!node.level || this.ctx.campaign.status(profile, node.id) === 'locked') continue;
      for (const id of levelZombieTypes(LevelRegistry.get(node.level))) seen.add(id);
    }
    return seen;
  }
}
