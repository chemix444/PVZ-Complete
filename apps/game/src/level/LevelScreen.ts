import { Container, Graphics, type FederatedPointerEvent } from 'pixi.js';
import { plantArt } from '@pvz/assets';
import type { CompletionResult } from '@pvz/campaign';
import { BoardRegistry, contentFor, levelZombieTypes, PlantRegistry, playableLevel } from '@pvz/content';
import { Simulation, type BoardDef, type Command, type LevelDef, type PlantDef } from '@pvz/engine';
import { recordLevelResult } from '@pvz/save';
import type { DevSession, DevTool } from '@pvz/tools';
import { button, h, modal, panel, slider, type Screen } from '@pvz/ui';
import { requireProfile, type GameContext } from '../context';
import { plantIcon } from '../icons';
import { BoardScene } from './board';
import { SeedChooser } from './chooser';
import { Banner, ConveyorBelt, malletArt, MenuButton, MessageBox, ProgressMeter, SeedBank, shovelArt, ShovelSlot } from './hud';
import { LevelRunner } from './runner';
import { LevelSounds } from './sounds';

type Phase = 'pan-in' | 'choose' | 'pan-out' | 'ready' | 'play' | 'won' | 'lost';

/** What the cursor is carrying. */
type Held = { kind: 'seed'; slot: number } | { kind: 'conveyor'; packetId: number } | { kind: 'shovel' };

export interface LevelHooks {
  onSession(session: DevSession | null): void;
  openDevTools(): void;
  fps(): number;
}

export class LevelScreen implements Screen, DevSession {
  readonly levelId: string;
  private readonly level: LevelDef;
  private readonly board: BoardDef;
  private readonly scene: BoardScene;
  private readonly hud = new Container();
  private readonly banner = new Banner();
  private readonly messages = new MessageBox();
  private readonly flash = new Graphics();
  private readonly cursorLayer = new Container();
  private readonly sounds: LevelSounds;
  private readonly available: PlantDef[];
  private readonly slots: number;
  private readonly conveyorLevel: boolean;
  private readonly whack: boolean;
  private readonly hasShovel: boolean;
  private bank: SeedBank | null = null;
  private belt: ConveyorBelt | null = null;
  private shovelSlot: ShovelSlot | null = null;
  private mallet: Container | null = null;
  private malletSwing = 0;
  private progress: ProgressMeter | null = null;
  private chooser: SeedChooser | null = null;
  private runner: LevelRunner | null = null;
  private seeds: PlantDef[] = [];
  private phase: Phase = 'pan-in';
  private phaseTime = 0;
  private now = 0;
  private held: Held | null = null;
  private cursor: Container | null = null;
  private pointer = { x: 400, y: 300 };
  private root: HTMLElement | null = null;
  private closeModal: (() => void) | null = null;
  private desiredSpeed = 1;
  private completion: CompletionResult | null = null;
  private resultShown = false;
  private recorded = false;
  private readyCue = 0;
  private readonly listeners: [string, (event: FederatedPointerEvent) => void][] = [];
  private readonly onVisibility = () => {
    if (document.hidden && this.phase === 'play' && !this.closeModal) this.pause();
  };

  rngSeed: number | null = null;
  tool: DevTool | null = null;

  constructor(
    private readonly ctx: GameContext,
    levelId: string,
    private readonly hooks: LevelHooks,
  ) {
    this.levelId = levelId;
    this.level = playableLevel(levelId);
    this.board = BoardRegistry.get(this.level.board);
    this.scene = new BoardScene(this.board, ctx.assets, this.level);
    this.sounds = new LevelSounds(ctx.audio);
    const profile = requireProfile(ctx);
    const selection = this.level.seedSelection;
    const lent = new Set([...(selection.offered ?? []), ...(selection.forced ?? [])]);
    const banned = new Set(selection.banned ?? []);
    const content = contentFor(this.level.era);
    this.available = PlantRegistry.all()
      .filter((def) => (profile.plants[def.id] || lent.has(def.id)) && !banned.has(def.id) && !def.tags.includes('minigame'))
      .map((def) => content.plant(def.id));
    this.slots = selection.slots ?? profile.seedSlots;
    this.conveyorLevel = selection.mode === 'conveyor';
    this.whack = this.level.mode === 'whack';
    this.hasShovel = this.level.shovel === true || profile.features.includes('shovel');
  }

  // ---- DevSession ----------------------------------------------------------

  get sim(): Simulation | null {
    return this.runner?.sim ?? null;
  }

  get speed(): number {
    return this.desiredSpeed;
  }

  set speed(value: number) {
    this.desiredSpeed = value;
    if (this.runner) this.runner.speed = value;
  }

  get paused(): boolean {
    return this.runner?.paused ?? false;
  }

  set paused(value: boolean) {
    if (this.runner) this.runner.paused = value;
  }

  get overlays() {
    return this.scene.overlays;
  }

  get selectedId(): number | null {
    return this.scene.selectedId;
  }

  set selectedId(id: number | null) {
    this.scene.selectedId = id;
  }

  get stats() {
    return {
      fps: this.hooks.fps(),
      ticksPerSecond: this.runner?.ticksLastSecond ?? 0,
      stepCostMs: this.runner?.stepCostMs ?? 0,
    };
  }

  stepTick(): void {
    if (!this.runner || this.runner.sim.finished) return;
    this.runner.step();
    this.processEvents();
  }

  issue(command: Command): void {
    this.runner?.sim.issue(command);
  }

  // ---- Screen --------------------------------------------------------------

  mount(root: HTMLElement): void {
    this.root = root;
    const stage = this.ctx.stage;
    stage.scene.addChild(this.scene.root, this.hud);
    this.flash.rect(0, 0, 800, 600).fill(0xffffff);
    this.flash.alpha = 0;
    // Overlays must not take part in hit testing: under an interactive parent
    // Pixi treats any passive child containing the point as an occluder.
    this.cursorLayer.eventMode = 'none';
    this.flash.eventMode = 'none';
    this.banner.eventMode = 'none';

    let right = 6;
    if (this.conveyorLevel) {
      this.belt = new ConveyorBelt(this.level.conveyor!.capacity, (packetId) => this.pickConveyor(packetId));
      this.hud.addChild(this.belt);
      right = this.belt.right;
    } else if (this.slots > 0) {
      this.bank = new SeedBank(this.slots);
      this.hud.addChild(this.bank);
      right = this.bank.right;
    }
    if (this.hasShovel) {
      this.shovelSlot = new ShovelSlot(right, () => this.pickShovel());
      this.hud.addChild(this.shovelSlot);
    }
    if (this.whack) {
      this.mallet = malletArt();
      this.cursorLayer.addChild(this.mallet);
    }
    this.hud.addChild(this.messages, this.banner, new MenuButton(() => this.pause()), this.cursorLayer, this.flash);

    this.listen('pointermove', (event) => {
      const p = event.getLocalPosition(stage.scene);
      this.pointer = { x: p.x, y: p.y };
    });
    this.listen('pointerdown', (event) => this.onPointerDown(event));
    document.addEventListener('visibilitychange', this.onVisibility);
    this.hooks.onSession(this);
    for (const reward of this.level.rewards ?? []) {
      if (reward.type === 'plant' && reward.id) void plantIcon(this.ctx.stage.app, reward.id);
    }

    this.scene.showPreview(levelZombieTypes(this.level), Math.min(10, 3 + this.level.waves.length + (this.level.waveGenerator?.waves ?? 0) / 2));
    if (this.needsChooser()) this.ctx.audio.playMusic('music.choose-seeds');
    else {
      const forced = this.level.seedSelection.forced ?? [];
      this.seeds = [
        ...this.available.filter((d) => forced.includes(d.id)),
        ...this.available.filter((d) => !forced.includes(d.id)),
      ].slice(0, this.slots);
      this.bank?.setPlants(this.seeds);
    }
    this.setPhase('pan-in');
  }

  unmount(): void {
    for (const [type, fn] of this.listeners) this.ctx.stage.scene.off(type, fn);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.closeModal?.();
    this.hooks.onSession(null);
    this.scene.destroy();
    this.hud.destroy({ children: true });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.now += dt;
    this.phaseTime += dt;
    this.scene.update(dt);
    this.banner.update(dt);
    this.messages.update(dt);

    switch (this.phase) {
      case 'pan-in':
        if (this.phaseTime > 0.6 && !this.scene.panning && this.scene.cameraX === 0) {
          this.scene.panTo(this.board.view.maxX - 800, 1.5, () => {
            if (this.needsChooser()) this.showChooser();
            else this.setPhase('choose');
          });
        }
        break;
      case 'choose':
        // Levels without seed selection only pause on the street to show the zombies.
        if (!this.chooser && this.phaseTime > 1.2) this.leaveStreet();
        break;
      case 'ready':
        this.updateReady();
        break;
      case 'play':
        this.runner!.update(dtMs, performance.now());
        this.processEvents();
        if (!this.runner!.paused) this.sounds.update(this.runner!.sim, dt * this.runner!.speed, this.now);
        break;
      case 'won':
        this.updateWon();
        break;
      case 'lost':
        this.updateLost(dt);
        break;
    }

    const sim = this.sim;
    if (sim) {
      this.scene.sync(sim, this.runner!.alpha, this.now);
      if (this.phase === 'won') this.placeReward();
      if (this.phase === 'lost') this.walkIntoHouse();
      this.progress?.update(sim.waves.progress());
    }
    this.bank?.update(sim, sim ? sim.sun : this.level.startingSun, this.held?.kind === 'seed' ? this.held.slot : -1, this.now);
    this.belt?.update(sim?.conveyor?.packets ?? [], this.held?.kind === 'conveyor' ? this.held.packetId : null, dt, this.now);
    this.shovelSlot?.setHeld(this.held?.kind === 'shovel');
    this.updateCursor(dt);
  }

  onKey(event: KeyboardEvent): boolean {
    if (event.key !== 'Escape') return false;
    if (this.held) this.drop();
    else if (this.closeModal && this.phase !== 'won' && this.phase !== 'lost') this.resume();
    else this.pause();
    return true;
  }

  // ---- phases --------------------------------------------------------------

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }

  /** PvZ 1 only shows seed selection when the player owns more plants than fit in the bank. */
  private needsChooser(): boolean {
    return this.level.seedSelection.mode === 'choose' && this.available.length > this.slots;
  }

  private showChooser(): void {
    const forced = new Set(this.level.seedSelection.forced ?? []);
    this.chooser = new SeedChooser(this.available, this.slots, forced, () => this.syncChosen(), () => this.confirmSeeds());
    this.hud.addChildAt(this.chooser, 1);
    this.setPhase('choose');
  }

  private syncChosen(): void {
    this.ctx.audio.play('audio.tap');
    this.bank!.setPlants(this.chooser!.chosen);
    this.bank!.packets.forEach((packet) => {
      packet.on('pointerdown', (event) => {
        event.stopPropagation();
        if (this.phase === 'choose') this.chooser?.remove(packet.def);
      });
    });
  }

  private confirmSeeds(): void {
    if (!this.chooser?.ready) return;
    this.seeds = [...this.chooser.chosen];
    this.chooser.destroy({ children: true });
    this.chooser = null;
    this.ctx.audio.play('audio.tap');
    this.leaveStreet();
  }

  private leaveStreet(): void {
    this.ctx.audio.playMusic(null, 1);
    this.setPhase('pan-out');
    this.scene.panTo(0, 1.4, () => {
      this.scene.clearPreview();
      this.startReady();
    });
  }

  private startReady(): void {
    this.rngSeed = (Math.random() * 0x100000000) >>> 0;
    const sim = new Simulation({
      content: contentFor(this.level.era),
      board: this.board,
      level: this.level,
      seeds: this.seeds.map((d) => d.id),
      rngSeed: this.rngSeed,
    });
    this.runner = new LevelRunner(sim);
    this.runner.speed = this.desiredSpeed;
    if (this.bank) {
      this.bank.setPlants(this.seeds);
      this.bank.packets.forEach((packet, i) => {
        packet.on('pointerdown', (event) => {
          event.stopPropagation();
          this.pickSeed(i);
        });
      });
    }
    this.ctx.audio.play('audio.ready-set-plant');
    this.setPhase('ready');
  }

  private updateReady(): void {
    const cues: [number, string, number, number][] = [
      [0, 'Ready...', 52, 0.6],
      [0.6, 'Set...', 52, 0.6],
      [1.2, 'PLANT!', 64, 0.8],
    ];
    const cue = cues[this.readyCue];
    if (cue && this.phaseTime >= cue[0]) {
      this.banner.show(cue[1], { size: cue[2], duration: cue[3] });
      this.readyCue++;
    }
    if (this.phaseTime >= 2) {
      this.ctx.audio.playMusic(this.level.music ?? null, 1.5);
      this.setPhase('play');
      // Events from setup (graves, starting plants) and the first tick's scripts.
      this.processEvents();
    }
  }

  // ---- input ---------------------------------------------------------------

  private listen(type: string, fn: (event: FederatedPointerEvent) => void): void {
    this.ctx.stage.scene.on(type, fn);
    this.listeners.push([type, fn]);
  }

  private onPointerDown(event: FederatedPointerEvent): void {
    this.ctx.audio.unlock();
    if (event.button === 2) {
      this.drop();
      return;
    }
    const sim = this.sim;
    if (this.phase !== 'play' || !sim || this.closeModal) return;
    const view = event.getLocalPosition(this.ctx.stage.scene);
    const at = this.scene.toBoard(view.x, view.y);
    if (this.tool) {
      this.useTool(this.tool, sim, at.x, at.y);
      return;
    }
    const pickup = this.scene.pickupAt(sim, at.x, at.y);
    if (pickup) {
      sim.issue({ type: 'collect', pickupId: pickup.id });
      return;
    }
    if (this.whack && !this.held) {
      sim.issue({ type: 'whack', x: at.x, y: at.y });
      this.malletSwing = 0.18;
      return;
    }
    const held = this.held;
    if (!held) return;
    const row = sim.lawn.rowAt(at.y);
    const col = sim.lawn.colAt(at.x);
    if (row < 0 || col < 0) {
      this.drop();
      return;
    }
    if (held.kind === 'shovel') {
      if (sim.lawn.topPlantAt(row, col)) {
        sim.issue({ type: 'dig', row, col });
        this.drop();
      }
      return;
    }
    if (held.kind === 'seed') {
      if (sim.checkPlanting(held.slot, row, col) !== null) return;
      sim.issue({ type: 'plant', slot: held.slot, row, col });
    } else {
      const packet = sim.conveyor?.find(held.packetId);
      if (!packet || sim.canPlace(packet.def, row, col) !== null) return;
      sim.issue({ type: 'plant-conveyor', packetId: held.packetId, row, col });
    }
    this.drop();
  }

  private canPick(): boolean {
    return this.phase === 'play' && this.sim !== null && !this.closeModal && !this.runner!.paused;
  }

  private pickSeed(slot: number): void {
    const sim = this.sim;
    if (!this.canPick() || !sim) return;
    if (this.held?.kind === 'seed' && this.held.slot === slot) {
      this.drop();
      return;
    }
    const packet = sim.seedBank[slot];
    if (!packet.ready) {
      this.ctx.audio.play('audio.buzzer');
      return;
    }
    if (sim.sun < packet.cost) {
      this.ctx.audio.play('audio.buzzer');
      this.bank?.flashSun(this.now);
      return;
    }
    this.hold({ kind: 'seed', slot }, plantArt(packet.def.id, packet.def.name).root);
  }

  private pickConveyor(packetId: number): void {
    const packet = this.sim?.conveyor?.find(packetId);
    if (!this.canPick() || !packet) return;
    if (this.held?.kind === 'conveyor' && this.held.packetId === packetId) {
      this.drop();
      return;
    }
    this.hold({ kind: 'conveyor', packetId }, plantArt(packet.def.id, packet.def.name).root);
  }

  private pickShovel(): void {
    if (!this.canPick()) return;
    if (this.held?.kind === 'shovel') {
      this.drop();
      return;
    }
    const art = shovelArt();
    art.scale.set(1.3);
    art.position.set(40, 60);
    const holder = new Container();
    holder.addChild(art);
    this.hold({ kind: 'shovel' }, holder);
  }

  private hold(held: Held, art: Container): void {
    this.drop();
    this.held = held;
    this.ctx.audio.play('audio.seed-lift');
    this.cursor = art;
    this.cursorLayer.addChild(this.cursor);
    if (this.mallet) this.mallet.visible = false;
  }

  private drop(): void {
    this.held = null;
    this.cursor?.destroy({ children: true });
    this.cursor = null;
    this.scene.setGhost(null, null, false);
    if (this.mallet) this.mallet.visible = true;
  }

  private heldPlant(): PlantDef | null {
    const sim = this.sim;
    if (!sim || !this.held) return null;
    if (this.held.kind === 'seed') return sim.seedBank[this.held.slot].def;
    if (this.held.kind === 'conveyor') return sim.conveyor?.find(this.held.packetId)?.def ?? null;
    return null;
  }

  private updateCursor(dt: number): void {
    if (this.mallet) {
      this.malletSwing = Math.max(0, this.malletSwing - dt);
      this.mallet.position.set(this.pointer.x - 10, this.pointer.y + 30);
      this.mallet.rotation = this.malletSwing > 0 ? -0.9 * (this.malletSwing / 0.18) : -0.3;
    }
    const sim = this.sim;
    if (!this.cursor || !sim || !this.held) return;
    this.cursor.position.set(this.pointer.x - 40, this.pointer.y - 60);
    const def = this.heldPlant();
    if (!def) {
      this.scene.setGhost(null, null, false);
      if (this.held.kind === 'conveyor') this.drop();
      return;
    }
    const at = this.scene.toBoard(this.pointer.x, this.pointer.y);
    const row = sim.lawn.rowAt(at.y);
    const col = sim.lawn.colAt(at.x);
    const cell = row >= 0 && col >= 0 ? { row, col } : null;
    this.scene.setGhost(def, cell, cell !== null && sim.canPlace(def, row, col) === null);
  }

  private useTool(tool: DevTool, sim: Simulation, x: number, y: number): void {
    const row = sim.lawn.rowAt(y);
    const col = sim.lawn.colAt(x);
    if (tool.kind === 'plant' && row >= 0 && col >= 0) sim.issue({ type: 'debug-spawn-plant', plant: tool.id, row, col });
    if (tool.kind === 'zombie' && row >= 0) {
      const anchor = Math.min(this.board.zombieSpawnX, x - 57);
      sim.issue({ type: 'debug-spawn-zombie', zombie: tool.id, row, x: anchor });
    }
    if (tool.kind === 'inspect') this.selectedId = this.scene.entityAt(sim, x, y)?.id ?? null;
  }

  // ---- simulation events ---------------------------------------------------

  private processEvents(): void {
    const sim = this.sim!;
    for (const event of sim.drainEvents()) {
      this.sounds.handle(event, sim);
      this.scene.handleEvent(event, sim, this.now);
      switch (event.type) {
        case 'wave-spawned':
          if (!this.progress) {
            this.progress = new ProgressMeter(this.level);
            this.progress.eventMode = 'none';
            this.hud.addChildAt(this.progress, 1);
          }
          break;
        case 'huge-wave-warning':
          this.banner.show('A Huge Wave of Zombies is Approaching!', { size: 30, duration: 4 });
          break;
        case 'final-wave':
          this.banner.show('FINAL WAVE', { size: 60, duration: 3 });
          break;
        case 'message':
          this.messages.show(event.text, event.duration);
          break;
        case 'level-won':
          this.onWon();
          break;
        case 'level-lost':
          this.onLost();
          break;
      }
    }
  }

  private async record(won: boolean): Promise<CompletionResult | null> {
    const ctx = this.ctx;
    const sim = this.sim!;
    const profile = requireProfile(ctx);
    const now = Date.now();
    recordLevelResult(profile, this.level.id, won, sim.tick);
    profile.records.zombiesKilled += sim.stats.zombiesKilled;
    profile.records.sunCollected += sim.stats.sunCollected;
    profile.records.plantsPlaced += sim.stats.plantsPlaced;
    const node = won ? ctx.campaign.nodeForLevel(this.level.id) : undefined;
    const result = node ? ctx.campaign.complete(profile, node.id, now) : null;
    await ctx.saveProfile();
    return result;
  }

  private onWon(): void {
    this.drop();
    this.messages.hide();
    this.closeModal?.();
    this.closeModal = null;
    this.setPhase('won');
    this.ctx.audio.playMusic(null, 0.6);
    this.ctx.audio.play('audio.win');
    void this.record(true).then((result) => {
      this.completion = result;
      this.recorded = true;
    });
  }

  private placeReward(): void {
    const sim = this.sim!;
    const reward = sim.rewardPickup;
    const view = reward && this.scene.pickupView(reward.id);
    if (!reward || !view) return;
    const t = Math.min(1, this.phaseTime / 1.6);
    const eased = 1 - (1 - t) ** 3;
    view.root.position.set(reward.x + (400 - reward.x) * eased, reward.y + (300 - reward.y) * eased);
    view.root.scale.set(1 + eased * 1.4);
  }

  private updateWon(): void {
    const t = this.phaseTime;
    this.flash.alpha = t < 2 ? 0 : Math.min(1, (t - 2) / 0.8);
    if (t > 3 && this.recorded && !this.resultShown) {
      this.resultShown = true;
      this.showWinResult();
    }
  }

  private onLost(): void {
    this.drop();
    this.closeModal?.();
    this.closeModal = null;
    this.setPhase('lost');
    this.ctx.audio.playMusic(null, 0.4);
    this.ctx.audio.play('audio.lose');
    this.scene.panTo(this.board.view.minX, 1.8);
    void this.record(false);
  }

  private walkIntoHouse(): void {
    const zombie = this.sim!.lostTo;
    const view = zombie && this.scene.zombieView(zombie.id);
    if (view) view.root.x = zombie.x - Math.min(this.phaseTime, 2.5) * 30;
  }

  private updateLost(dt: number): void {
    if (this.phaseTime >= 2 && this.phaseTime - dt < 2) {
      this.banner.show('THE ZOMBIES ATE YOUR BRAINS!', { size: 46, duration: 30, shake: true, color: 0x7ed957 });
    }
    if (this.phaseTime > 4.5 && !this.resultShown) {
      this.resultShown = true;
      this.showLoseResult();
    }
  }

  // ---- overlays ------------------------------------------------------------

  private pause(): void {
    if (this.phase === 'won' || this.phase === 'lost' || this.closeModal) return;
    this.drop();
    if (this.runner) this.runner.paused = true;
    this.ctx.audio.play('audio.pause');
    const profile = requireProfile(this.ctx);
    const content = h(
      'div',
      { class: 'pause-card' },
      panel(
        'Game Paused',
        slider('Music', profile.settings.musicVolume, (v) => {
          profile.settings.musicVolume = v;
          this.ctx.applySettings();
        }),
        slider('Sound', profile.settings.sfxVolume, (v) => {
          profile.settings.sfxVolume = v;
          this.ctx.applySettings();
        }),
        h(
          'div',
          { class: 'actions' },
          button('Back to Game', () => this.resume()),
          button('Restart Level', () => this.ctx.nav.level(this.level.id), 'secondary'),
          profile.settings.devTools ? button('Developer Tools', () => this.hooks.openDevTools(), 'secondary') : null,
          button('Main Menu', () => this.ctx.nav.menu(), 'danger'),
        ),
      ),
    );
    this.closeModal = modal(this.root!, content);
  }

  private resume(): void {
    this.closeModal?.();
    this.closeModal = null;
    void this.ctx.saveProfile();
    if (this.runner) this.runner.paused = false;
  }

  private showWinResult(): void {
    const ctx = this.ctx;
    const profile = requireProfile(ctx);
    const granted = this.completion?.granted ?? [];
    const plantReward = granted.find((r) => r.type === 'plant' && r.id && PlantRegistry.has(r.id));
    const otherReward = granted.find((r) => r.type === 'feature' || r.type === 'note');
    const next = profile.campaign.current ? ctx.campaign.node(profile.campaign.current) : null;
    const nextLevel = next?.level && next.level !== this.level.id ? next.level : null;
    const card = h('div', { class: 'result-card' });
    if (plantReward) {
      const def = PlantRegistry.get(plantReward.id!);
      const img = h('img', { alt: '' });
      void plantIcon(ctx.stage.app, def.id).then((src) => (img.src = src));
      card.append(panel('You got a new plant!', img, h('h3', null, def.name), h('p', null, def.description ?? '')));
    } else if (otherReward) {
      const [title, text] = REWARD_TEXT[otherReward.id ?? ''] ?? ['You found something!', ''];
      card.append(panel(title, h('p', null, text)));
    } else {
      card.append(panel('Level Complete!', h('p', null, `${this.level.name} ${this.level.label} cleared.`)));
    }
    if (plantReward && otherReward) {
      const [title, text] = REWARD_TEXT[otherReward.id ?? ''] ?? ['', ''];
      card.querySelector('.pvz-panel')!.append(h('p', null, h('strong', null, title), ' ', text));
    }
    card.querySelector('.pvz-panel')!.append(
      h(
        'div',
        { class: 'actions' },
        nextLevel ? button('Next Level', () => ctx.nav.level(nextLevel)) : null,
        button('Campaign', () => ctx.nav.campaign(this.level.world), nextLevel ? 'secondary' : 'primary'),
        button('Main Menu', () => ctx.nav.menu(), 'secondary'),
      ),
    );
    this.closeModal = modal(this.root!, card);
  }

  private showLoseResult(): void {
    const ctx = this.ctx;
    const card = h(
      'div',
      { class: 'result-card' },
      panel(
        'Game Over',
        h('p', null, 'The zombies got into the house.'),
        h(
          'div',
          { class: 'actions' },
          button('Try Again', () => ctx.nav.level(this.level.id)),
          button('Main Menu', () => ctx.nav.menu(), 'secondary'),
        ),
      ),
    );
    this.closeModal = modal(this.root!, card);
  }
}

/** Result card text for non-plant rewards. Written for this project. */
const REWARD_TEXT: Record<string, [string, string]> = {
  shovel: ['You got the shovel!', 'Dig up plants you no longer want. It sits next to your seed bank.'],
  almanac: ['You found the Almanac!', 'Look up every plant and zombie you have met from the main menu.'],
  'zombie-note-1': ['You found a note!', 'It is from the zombies. They would like to come over for dinner. They are bringing their own appetite.'],
  'zombie-note-2': ['Another note!', 'The zombies say they will visit after dark, around the pool. They hope you like swimming.'],
};
