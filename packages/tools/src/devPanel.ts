import { Plant, Zombie, type Simulation } from '@pvz/engine';
import { h } from '@pvz/ui';
import type { DevHost, DevSession } from './types';

type Tab = 'sim' | 'spawn' | 'inspect' | 'levels' | 'campaign' | 'plants';

const TABS: [Tab, string][] = [
  ['sim', 'Sim'],
  ['spawn', 'Spawn'],
  ['inspect', 'Inspect'],
  ['levels', 'Levels'],
  ['campaign', 'Campaign'],
  ['plants', 'Plants'],
];

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8];

/** In-browser developer interface. Toggle with the backquote key. */
export class DevPanel {
  private readonly root: HTMLDivElement;
  private readonly live: HTMLDivElement;
  private tab: Tab = 'sim';
  private visible = false;
  private nextLive = 0;
  private lastSession: DevSession | null = null;

  constructor(private readonly host: DevHost) {
    this.live = h('div', { class: 'dev-live' });
    this.root = h('div', { class: 'dev-panel', hidden: true, role: 'dialog', 'aria-label': 'Developer tools' });
    document.body.append(this.root);
  }

  get isOpen(): boolean {
    return this.visible;
  }

  toggle(open = !this.visible): void {
    this.visible = open;
    this.root.hidden = !open;
    if (open) this.render();
  }

  /** Called every frame; refreshes live readouts a few times per second. */
  update(now: number): void {
    if (!this.visible) return;
    const session = this.host.session();
    if (session !== this.lastSession) {
      this.lastSession = session;
      this.render();
      return;
    }
    if (now < this.nextLive) return;
    this.nextLive = now + 200;
    this.renderLive();
  }

  render(): void {
    const tabs = h(
      'div',
      { class: 'dev-tabs', role: 'tablist' },
      ...TABS.map(([id, label]) => {
        const b = h('button', { type: 'button', role: 'tab', 'aria-selected': String(this.tab === id) }, label);
        b.addEventListener('click', () => {
          this.tab = id;
          this.render();
        });
        return b;
      }),
    );
    const close = h('button', { type: 'button', class: 'dev-close', 'aria-label': 'Close developer tools' }, '×');
    close.addEventListener('click', () => this.toggle(false));
    this.root.replaceChildren(
      h('div', { class: 'dev-header' }, h('strong', null, 'Developer Tools'), close),
      tabs,
      h('div', { class: 'dev-body' }, this.body(), this.live),
    );
    this.renderLive();
  }

  private body(): HTMLElement {
    switch (this.tab) {
      case 'sim':
        return this.simTab();
      case 'spawn':
        return this.spawnTab();
      case 'inspect':
        return this.inspectTab();
      case 'levels':
        return this.levelsTab();
      case 'campaign':
        return this.campaignTab();
      case 'plants':
        return this.plantsTab();
    }
  }

  private renderLive(): void {
    const session = this.host.session();
    this.live.replaceChildren();
    if (!session) return;
    if (this.tab === 'sim') this.live.append(simReadout(session));
    if (this.tab === 'inspect') this.live.append(inspectReadout(session));
  }

  private needsLevel(): HTMLElement {
    return h('p', { class: 'dev-note' }, 'Start a level to use this tab (see Levels).');
  }

  private simTab(): HTMLElement {
    const session = this.host.session();
    if (!session) return this.needsLevel();
    const act = (label: string, fn: () => void) => this.button(label, fn);
    const overlay = (key: keyof DevSession['overlays'], label: string) => {
      const input = h('input', { type: 'checkbox', checked: session.overlays[key] });
      input.addEventListener('change', () => (session.overlays[key] = input.checked));
      return h('label', { class: 'dev-check' }, input, label);
    };
    return h(
      'div',
      null,
      h(
        'div',
        { class: 'dev-row' },
        'Speed',
        ...SPEEDS.map((speed) => {
          const b = this.button(`${speed}x`, () => {
            session.speed = speed;
            this.render();
          });
          if (session.speed === speed) b.classList.add('on');
          return b;
        }),
      ),
      h(
        'div',
        { class: 'dev-row' },
        act(session.paused ? 'Resume' : 'Pause', () => {
          session.paused = !session.paused;
          this.render();
        }),
        act('Step 1 tick', () => session.stepTick()),
        act('Step 10', () => {
          for (let i = 0; i < 10; i++) session.stepTick();
        }),
      ),
      h(
        'div',
        { class: 'dev-row' },
        'Sun',
        act('+50', () => session.issue({ type: 'debug-add-sun', amount: 50 })),
        act('+500', () => session.issue({ type: 'debug-add-sun', amount: 500 })),
        act('+9000', () => session.issue({ type: 'debug-add-sun', amount: 9000 })),
      ),
      h(
        'div',
        { class: 'dev-row' },
        act('Skip wave', () => session.issue({ type: 'debug-skip-wave' })),
        act('Kill zombies', () => session.issue({ type: 'debug-kill-zombies' })),
        act('Recharge seeds', () => session.issue({ type: 'debug-recharge-all' })),
      ),
      h('div', { class: 'dev-row' }, overlay('hitboxes', 'Hitboxes'), overlay('targeting', 'Targeting'), overlay('grid', 'Grid')),
    );
  }

  private spawnTab(): HTMLElement {
    const session = this.host.session();
    if (!session) return this.needsLevel();
    const tool = session.tool;
    const pick = (kind: 'plant' | 'zombie', id: string, name: string) => {
      const b = this.button(name, () => {
        session.tool = tool?.kind === kind && tool.id === id ? null : { kind, id };
        this.render();
      });
      if (tool && tool.kind === kind && tool.id === id) b.classList.add('on');
      return b;
    };
    const rows = session.sim?.lawn.rows ?? 5;
    const zombieRows =
      tool?.kind === 'zombie'
        ? h(
            'div',
            { class: 'dev-row' },
            'Spawn at edge, row',
            ...Array.from({ length: rows }, (_, row) =>
              this.button(String(row + 1), () => session.issue({ type: 'debug-spawn-zombie', zombie: tool.id, row })),
            ),
          )
        : null;
    return h(
      'div',
      null,
      h('p', { class: 'dev-note' }, tool ? `Click the lawn to place ${tool.kind === 'inspect' ? 'nothing' : tool.id}.` : 'Pick something, then click the lawn.'),
      h('h4', null, 'Plants (free, ignores cooldown)'),
      h('div', { class: 'dev-row wrap' }, ...this.host.plants().map((p) => pick('plant', p.id, p.name))),
      h('h4', null, 'Zombies'),
      h('div', { class: 'dev-row wrap' }, ...this.host.zombies().map((z) => pick('zombie', z.id, z.name))),
      zombieRows,
      tool ? this.button('Stop placing', () => {
        session.tool = null;
        this.render();
      }) : null,
    );
  }

  private inspectTab(): HTMLElement {
    const session = this.host.session();
    if (!session) return this.needsLevel();
    const inspecting = session.tool?.kind === 'inspect';
    const health = h('input', { type: 'number', min: '0', step: '10', placeholder: 'health', 'aria-label': 'New health' });
    return h(
      'div',
      null,
      h(
        'div',
        { class: 'dev-row' },
        this.button(inspecting ? 'Stop inspecting' : 'Click to inspect', () => {
          session.tool = inspecting ? null : { kind: 'inspect' };
          this.render();
        }),
        this.button('Clear', () => {
          session.selectedId = null;
          this.render();
        }),
      ),
      h(
        'div',
        { class: 'dev-row' },
        health,
        this.button('Set health', () => {
          if (session.selectedId !== null && health.value !== '') {
            session.issue({ type: 'debug-set-health', entityId: session.selectedId, health: Number(health.value) });
          }
        }),
        this.button('Kill', () => {
          if (session.selectedId !== null) session.issue({ type: 'debug-set-health', entityId: session.selectedId, health: 0 });
        }),
      ),
    );
  }

  private levelsTab(): HTMLElement {
    const levels = this.host.levels();
    return h(
      'div',
      null,
      h('h4', null, 'Level browser'),
      h(
        'table',
        { class: 'dev-table' },
        h('tr', null, h('th', null, 'Level'), h('th', null, 'Name'), h('th', null, 'Era'), h('th', null, '')),
        ...levels.map((level) =>
          h(
            'tr',
            null,
            h('td', null, level.label),
            h('td', null, level.name),
            h('td', null, level.era),
            h('td', null, this.button('Start', () => this.host.startLevel(level.id))),
          ),
        ),
      ),
      h('h4', null, 'Worlds'),
      h('div', { class: 'dev-row wrap' }, ...this.host.worlds().map((w) => this.button(`${w.name} (${w.era})`, () => this.host.openWorld(w.id)))),
    );
  }

  private campaignTab(): HTMLElement {
    const name = this.host.profileName();
    if (!name) return h('p', { class: 'dev-note' }, 'Sign in to a profile first.');
    return h(
      'div',
      null,
      h('p', { class: 'dev-note' }, `Profile: ${name}`),
      h(
        'table',
        { class: 'dev-table' },
        h('tr', null, h('th', null, 'Node'), h('th', null, 'Status'), h('th', null, '')),
        ...this.host.campaignNodes().map((node) =>
          h(
            'tr',
            null,
            h('td', { title: node.id }, `${node.title}`, h('small', null, ` ${node.kind} · ${node.era}`)),
            h('td', null, node.status),
            h(
              'td',
              null,
              this.button('Complete', () => {
                this.host.completeNode(node.id);
                this.render();
              }),
              this.button('Unlock', () => {
                this.host.unlockNode(node.id);
                this.render();
              }),
              node.level ? this.button('Jump', () => this.host.jumpTo(node.id)) : null,
            ),
          ),
        ),
      ),
      h(
        'div',
        { class: 'dev-row' },
        this.button('Reset campaign progress', () => {
          if (confirm('Reset all campaign progress and plants for this profile?')) {
            this.host.resetProgress();
            this.render();
          }
        }),
      ),
    );
  }

  private plantsTab(): HTMLElement {
    if (!this.host.profileName()) return h('p', { class: 'dev-note' }, 'Sign in to a profile first.');
    return h(
      'div',
      null,
      h(
        'div',
        { class: 'dev-row' },
        `Seed slots: ${this.host.seedSlots()}`,
        this.button('-', () => {
          this.host.setSeedSlots(Math.max(1, this.host.seedSlots() - 1));
          this.render();
        }),
        this.button('+', () => {
          this.host.setSeedSlots(Math.min(10, this.host.seedSlots() + 1));
          this.render();
        }),
      ),
      h(
        'div',
        { class: 'dev-list' },
        ...this.host.plants().map((plant) => {
          const input = h('input', { type: 'checkbox', checked: plant.owned });
          input.addEventListener('change', () => this.host.setPlantOwned(plant.id, input.checked));
          return h('label', { class: 'dev-check' }, input, `${plant.name} (${plant.era})`);
        }),
      ),
    );
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = h('button', { type: 'button' }, label);
    b.addEventListener('click', onClick);
    return b;
  }
}

function simReadout(session: DevSession): HTMLElement {
  const sim = session.sim;
  const stats = session.stats;
  const lines = [
    `level ${session.levelId}  seed ${session.rngSeed ?? '-'}`,
    `fps ${stats.fps.toFixed(0)}  ticks/s ${stats.ticksPerSecond}  step ${stats.stepCostMs.toFixed(3)} ms`,
  ];
  if (sim) {
    lines.push(
      `tick ${sim.tick} (${(sim.tick / 100).toFixed(2)} s)  phase ${sim.phase}  sun ${sim.sun}`,
      `wave ${sim.waves.spawned}/${sim.waves.total}  next in ${sim.waves.finished ? '-' : sim.waves.countdown}  ` +
        `wave hp ${sim.waves.currentWaveHealth(sim)}/${sim.waves.waveHealthStart} (next at ${sim.waves.healthToNext})`,
      `sky sun ${sim.skySun ? `next in ${sim.skySun.countdown}, fallen ${sim.skySun.fallen}` : 'off'}`,
      `entities: ${sim.plants.length} plants, ${sim.zombies.length} zombies, ${sim.projectiles.length} projectiles, ` +
        `${sim.pickups.length} pickups, ${sim.mowers.length} mowers`,
      `killed ${sim.stats.zombiesKilled}  sun collected ${sim.stats.sunCollected}`,
    );
  } else {
    lines.push('choosing seeds');
  }
  return h('pre', { class: 'dev-pre' }, lines.join('\n'));
}

function inspectReadout(session: DevSession): HTMLElement {
  const sim = session.sim;
  if (!sim || session.selectedId === null) return h('p', { class: 'dev-note' }, 'Nothing selected.');
  const entity = sim.entity(session.selectedId);
  if (!entity) return h('p', { class: 'dev-note' }, `Entity ${session.selectedId} is gone.`);
  return h('pre', { class: 'dev-pre' }, JSON.stringify(describe(entity, sim), null, 1));
}

function describe(entity: NonNullable<ReturnType<Simulation['entity']>>, sim: Simulation): Record<string, unknown> {
  if (entity instanceof Plant) {
    return {
      id: entity.id,
      plant: entity.def.id,
      cell: [entity.row, entity.col],
      health: `${entity.health}/${entity.maxHealth}`,
      anim: entity.anim,
      age: sim.tick - entity.plantedTick,
      behaviors: entity.behaviors.map((b) => ({ type: b.type, ...b.debug?.() })),
    };
  }
  if (entity instanceof Zombie) {
    return {
      id: entity.id,
      zombie: entity.def.id,
      row: entity.row,
      x: Number(entity.x.toFixed(2)),
      speed: Number((entity.speed * 100).toFixed(2)),
      state: entity.state,
      health: `${Math.ceil(entity.health)}/${entity.maxHealth}`,
      armor: entity.armor.map((a) => `${a.spec.id} ${a.health}/${a.spec.health}`),
      eating: entity.eating?.id ?? null,
      wave: entity.wave,
      behaviors: entity.behaviors.map((b) => ({ type: b.type, ...b.debug?.() })),
    };
  }
  return { id: entity.id, kind: entity.kind };
}
