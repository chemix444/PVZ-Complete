import { AssetLibrary } from '@pvz/assets';
import { AudioEngine } from '@pvz/audio';
import { CampaignGraph } from '@pvz/campaign';
import {
  AudioRegistry,
  CampaignRegistry,
  LevelRegistry,
  PlantRegistry,
  validateContent,
  WorldRegistry,
  ZombieRegistry,
} from '@pvz/content';
import { IndexedDbProfileStore, MemoryProfileStore, type PlayerProfile, type ProfileStore } from '@pvz/save';
import { DevPanel, type DevHost, type DevSession } from '@pvz/tools';
import { ScreenManager } from '@pvz/ui';
import type { GameContext, Navigator } from './context';
import { LevelScreen } from './level/LevelScreen';
import { AlmanacScreen } from './screens/almanac';
import { CampaignScreen } from './screens/campaign';
import { MenuScreen } from './screens/menu';
import { ProfilesScreen } from './screens/profiles';
import { SettingsScreen } from './screens/settings';
import { Stage } from './stage';

export class Game implements GameContext, DevHost {
  profile: PlayerProfile | null = null;
  readonly nav: Navigator;
  private readonly screens: ScreenManager;
  private readonly devPanel: DevPanel;
  private activeSession: DevSession | null = null;
  private fps = 60;
  private readonly fpsLabel = document.createElement('div');

  private constructor(
    readonly stage: Stage,
    readonly assets: AssetLibrary,
    readonly audio: AudioEngine,
    readonly store: ProfileStore,
    readonly campaign: CampaignGraph,
  ) {
    this.screens = new ScreenManager(stage.overlay);
    this.devPanel = new DevPanel(this);
    this.fpsLabel.className = 'fps-counter';
    this.fpsLabel.hidden = true;
    document.body.append(this.fpsLabel);
    const levelHooks = {
      onSession: (session: DevSession | null) => (this.activeSession = session),
      openDevTools: () => this.devPanel.toggle(true),
      fps: () => this.fps,
    };
    this.nav = {
      profiles: () => this.screens.show(new ProfilesScreen(this)),
      menu: () => this.screens.show(new MenuScreen(this, () => this.devPanel.toggle(true))),
      campaign: (focus) => this.screens.show(new CampaignScreen(this, focus)),
      almanac: (tab = 'plants') => this.screens.show(new AlmanacScreen(this, tab)),
      settings: () => this.screens.show(new SettingsScreen(this)),
      level: (id) => this.screens.show(new LevelScreen(this, id, levelHooks)),
    };

    const unlockAudio = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    stage.app.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('keydown', (event) => {
      if (event.key === '`') {
        this.devPanel.toggle();
        event.preventDefault();
        return;
      }
      if (event.target instanceof HTMLInputElement) return;
      if (this.screens.key(event)) event.preventDefault();
    });
    stage.app.ticker.add((ticker) => {
      this.fps += (ticker.FPS - this.fps) * 0.1;
      this.screens.update(ticker.deltaMS);
      this.devPanel.update(performance.now());
      if (!this.fpsLabel.hidden) this.fpsLabel.textContent = `${this.fps.toFixed(0)} fps`;
    });
  }

  static async boot(host: HTMLElement): Promise<Game> {
    const problems = validateContent();
    if (problems.length > 0) throw new Error(`Content errors:\n${problems.join('\n')}`);

    const stage = await Stage.create(host);
    const assets = new AssetLibrary();
    await assets.addManifest(`${import.meta.env.BASE_URL}local-assets/manifest.json`);
    await assets.preload();
    const audio = new AudioEngine(AudioRegistry.all(), (id) => assets.audioUrls(id));
    const store: ProfileStore = globalThis.indexedDB ? new IndexedDbProfileStore() : new MemoryProfileStore();
    const campaign = new CampaignGraph(CampaignRegistry.all());
    const game = new Game(stage, assets, audio, store, campaign);

    const activeId = await store.getActiveId();
    const profile = activeId ? await store.load(activeId) : null;
    if (profile) {
      campaign.start(profile, Date.now());
      game.profile = profile;
      game.applySettings();
      game.nav.menu();
    } else {
      game.nav.profiles();
    }
    return game;
  }

  async saveProfile(): Promise<void> {
    if (!this.profile) return;
    this.profile.updatedAt = Date.now();
    await this.store.save(this.profile);
  }

  applySettings(): void {
    const settings = this.profile?.settings;
    if (!settings) return;
    this.audio.setVolume('music', settings.musicVolume);
    this.audio.setVolume('sfx', settings.sfxVolume);
    this.audio.setVolume('ui', settings.sfxVolume);
    this.fpsLabel.hidden = !settings.showFps;
  }

  // ---- DevHost -------------------------------------------------------------

  session(): DevSession | null {
    return this.activeSession;
  }

  levels() {
    return LevelRegistry.all().map((l) => ({ id: l.id, label: l.label, name: l.name, era: l.era, world: l.world }));
  }

  worlds() {
    return WorldRegistry.all().map((w) => ({ id: w.id, name: w.name, era: w.era }));
  }

  startLevel(levelId: string): void {
    if (this.profile) this.nav.level(levelId);
  }

  openWorld(worldId: string): void {
    if (this.profile) this.nav.campaign(worldId);
  }

  profileName(): string | null {
    return this.profile?.name ?? null;
  }

  campaignNodes() {
    const profile = this.profile;
    return this.campaign.order.map((node) => ({
      id: node.id,
      title: node.title,
      kind: node.kind,
      era: node.era,
      level: node.level,
      status: profile ? this.campaign.status(profile, node.id) : ('locked' as const),
    }));
  }

  completeNode(id: string): void {
    if (!this.profile) return;
    this.campaign.complete(this.profile, id, Date.now());
    void this.saveProfile();
  }

  unlockNode(id: string): void {
    if (!this.profile) return;
    this.campaign.unlock(this.profile, id);
    void this.saveProfile();
  }

  jumpTo(id: string): void {
    if (!this.profile) return;
    this.unlockNode(id);
    const level = this.campaign.node(id).level;
    if (level) this.nav.level(level);
  }

  resetProgress(): void {
    const profile = this.profile;
    if (!profile) return;
    profile.campaign = { current: null, completed: {}, unlocked: [], notes: [] };
    profile.plants = {};
    profile.features = [];
    profile.levels = {};
    this.campaign.start(profile, Date.now());
    void this.saveProfile();
  }

  plants() {
    return PlantRegistry.all().map((p) => ({ id: p.id, name: p.name, era: p.era, owned: !!this.profile?.plants[p.id] }));
  }

  zombies() {
    return ZombieRegistry.all().map((z) => ({ id: z.id, name: z.name, era: z.era }));
  }

  setPlantOwned(id: string, owned: boolean): void {
    const profile = this.profile;
    if (!profile) return;
    if (owned) profile.plants[id] ??= { source: 'debug', acquiredAt: Date.now() };
    else delete profile.plants[id];
    void this.saveProfile();
  }

  seedSlots(): number {
    return this.profile?.seedSlots ?? 0;
  }

  setSeedSlots(slots: number): void {
    if (!this.profile) return;
    this.profile.seedSlots = slots;
    void this.saveProfile();
  }
}
