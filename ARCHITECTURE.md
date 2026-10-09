# Architecture

PVZ Complete is one application with one engine, one content database, one campaign, one save format and one UI. PvZ 1 and PvZ 2 are eras of the same content, never separate code paths or apps.

## Packages and dependencies

```
engine  <-  content  <-  apps/game
   ^           ^            |
   |        campaign  <-----+
   |           ^            |
 tools        save  <-------+
assets, audio, ui  <--------+
```

| Package | Responsibility | Depends on |
| --- | --- | --- |
| `@pvz/engine` | Deterministic simulation: entities, behaviors, systems, commands, events. Defines the content formats it understands. | nothing |
| `@pvz/content` | All definitions for both eras and the registries (`PlantRegistry`, `ZombieRegistry`, `ProjectileRegistry`, `BoardRegistry`, `LevelRegistry`, `WorldRegistry`, `CampaignRegistry`, `AudioRegistry`, `EffectRegistry`). Era profile resolution. Cross-reference validation. | engine, campaign (types) |
| `@pvz/campaign` | `CampaignGraph`: node status, requirements, rewards, the Continue pointer. | engine (types), save (types) |
| `@pvz/save` | `PlayerProfile`, migrations, normalization, IndexedDB and in-memory stores, export and import. | nothing |
| `@pvz/assets` | Asset manifest format, `AssetLibrary` loader, `AnimationPlayer`, procedural placeholder art. | pixi.js |
| `@pvz/audio` | `AudioEngine` (Web Audio channels, pooling, variants, music crossfade) and procedural placeholder sounds and music. | nothing |
| `@pvz/ui` | Tiny DOM builder, screen manager, widgets, shared CSS. | nothing |
| `@pvz/tools` | Developer panel (DOM) and the Node asset scanner. | engine, ui, assets (types) |
| `apps/game` | Boot, navigation, menus, the Pixi board renderer, HUD, input, level flow. | everything above |

Packages are TypeScript sources consumed directly through npm workspaces; there is no per-package build step. Vite bundles the app and Vitest runs the tests straight from source.

## Simulation

### Time

The simulation advances in fixed ticks of 10 ms (100 ticks per second). PvZ 1 updates its board in centiseconds, so documented PvZ 1 timings map onto ticks one to one. Content is written in seconds and pixels per second; behaviors convert with `ticks()` and `perTick()` when they build state.

`LevelRunner` (apps/game) feeds real frame time into an accumulator and calls `Simulation.step()` once per 10 ms of game time, at most 60 steps per frame. Rendering frame rate never changes how many ticks run or what happens in them. Game speed (developer tools) scales the accumulator input, so 4x speed runs 4 ticks per 10 ms of wall time with identical results.

### Determinism

- One seeded `Rng` (sfc32 seeded through splitmix32) per simulation. Every random decision goes through it.
- Player input is a `Command` queued with `issue()` and applied at the start of the next tick, in order. Debug actions are commands too.
- Entities update in insertion order; dead entities are compacted at the end of each tick.
- `hashSimulation()` hashes the observable state. Tests replay a full level twice from the same seed and command schedule and compare hashes every 1000 ticks.

### Entities

There is no deep class hierarchy. Each entity kind is a plain class holding data, and behavior comes from composable behavior objects created from content:

| Entity | Notes |
| --- | --- |
| `Plant` | Cell, slot (`base`, `main`, `cover`), health, hit span, behaviors, current animation name and start tick. |
| `Zombie` | Lane, x, speed, body health, armor layers, state (`walking`, `eating`, `dying`, `dead`), behaviors, status timers (`chillTicks`, `freezeTicks`, `risingTicks`), `hypnotized`, and what it is eating (a plant, or a zombie when hypnosis puts two zombies against each other). |
| `Projectile` | Lane, x, start x (for range-limited spores), horizontal speed, definition. |
| `Pickup` | Sun or level reward; falling, resting or collecting. |
| `LawnMower` | Idle, running or gone. |
| `GridItem` | Something occupying a cell that is not a plant: `grave` or `crater` (with a countdown). |
| `Roller` | A bowled nut: lane position, vertical drift while changing lanes, hit count. |

`Lawn` owns grid geometry (cell and row coordinates from the board definition) and per-cell, per-slot occupancy, so lily pads, flower pots and pumpkins fit without new structures.

Graves and craters are grid items. Ladders, Zomboni ice, vases and PvZ 2 tiles will be further grid item kinds or entity kinds when their milestones need them.

Two zombie getters carry most of the rules: `active` (walking or eating and not still climbing out of the ground) and `hostile` (active and not hypnotized). Plants target, mowers start and the house is lost only on hostile zombies.

### Behaviors

Behaviors are registered by type name and instantiated from the `behaviors` array of a definition:

```ts
registerPlantBehavior('shooter', (spec) => new ShooterBehavior(spec as ShooterSpec));
registerZombieBehavior('eater', (spec) => new EaterBehavior(spec as EaterSpec));
```

Built in today:

| Plants | |
| --- | --- |
| `shooter` | Peashooter, Snow Pea, Repeater (`burst`), Puff-shroom (`range`), Scaredy-shroom (`hideWithin`) |
| `producer` | Sunflower, Sun-shroom (`growAfter`) |
| `fume` | Fume-shroom |
| `explode` | Cherry Bomb, Doom-shroom (`crater`) |
| `freeze-all` | Ice-shroom |
| `mine` | Potato Mine |
| `chomper` | Chomper |
| `hypnotize` | Hypno-shroom, through the `onBitten` hook that runs when a zombie bites the plant |
| `grave-buster` | Grave Buster |
| `bowl` | Wall-nut Bowling nuts; turns the planted nut into a `Roller` |

| Zombies | |
| --- | --- |
| `walker` | moves at the zombie's speed times its status factor; hypnotized zombies walk right |
| `eater` | bites plants, or zombies of the other side when hypnosis is involved |
| `pole-vault` | runs, vaults the first plant, then hands over to `walker` |
| `rage` | Newspaper: shock pause and a faster speed when its shield breaks |
| `dancer`, `dance-step` | Dancing Zombie's moonwalk and summons; every dancer steps and pauses on a shared clock |

A plant or zombie can list several behaviors and they all run each tick. Behaviors expose `debug()` for the inspector. Ticking fuses use the check-then-decrement pattern (`if (fuse > 0) { fuse--; return; }`) so a 1.2 s fuse fires on exactly tick 120.

Zombie behavior order matters where one behavior gates another; `eater` runs before `walker` so a zombie stops on the tick its attack box reaches a plant.

### Damage

`Simulation.damageZombie(zombie, amount, kind)` applies damage through armor layers in order, then the body. A helmet's overflow carries into the body (this is what makes a Conehead take 28 peas). Shields depend on the damage kind: `projectile` and `bowling` stop at the shield, `fume` hits shield and body for the full amount, `explosion` and `whack` carry their overflow through, and `lobbed` skips the shield. `damageArea()` hits every non-hypnotized zombie whose body overlaps a box of rows and pixels; explosions, mines, Ice-shroom and fumes use it.

Status effects are tick counters on the zombie. `speedFactor` is 0 while frozen, 0.5 while chilled and 1 otherwise; walking and bite timers scale by it. Body thresholds come from data: `loseArmBelow` drops the arm, `dieBelow` drops the head and turns the zombie into a `dying` zombie that keeps walking, keeps absorbing projectiles, is no longer targeted, cannot eat and drains health until it collapses. Plants take damage through `damagePlant()`.

### Systems and per-tick order

Each tick runs, in order:

1. queued commands
2. `SeedBankSystem` (packet recharge)
3. `ConveyorSystem` (if the level has a conveyor)
4. `SkySunSystem` (if the level has sky sun)
5. `ScriptSystem` (if the level has scripts)
6. `WaveSystem` (written or generated waves; Whack a Zombie and final-wave grave risings)
7. `GridItemSystem` (crater countdowns)
8. `PlantSystem` (plant behaviors; sleeping mushrooms skip)
9. `ZombieSystem` (status timers, rising from the ground, collapse timers, dying drain, zombie behaviors, hypnotized zombies leaving)
10. `ProjectileSystem` (movement, range, collision, chill)
11. `RollerSystem` (bowling nuts)
12. `PickupSystem` (falling, expiry, flight to the sun bank)
13. `MowerSystem`
14. extra systems from the level's `systems` list (world mechanics)
15. `OutcomeSystem` (house reached, level cleared)
16. compaction of dead entities

World mechanics plug in with `registerSystem(type, factory)` and are switched on per level (or per world) by listing `{ "type": "<id>", ...params }` in `systems`. A world plugin gets the whole `Simulation` and can add entities, read events it emitted, and add behaviors through the registries, so new worlds extend the engine without editing it.

### Level features

Levels switch on optional engine features through data rather than code: a `waveGenerator` (PvZ 1 wave budgets), `graves`, `startingPlants`, `plantableCols` (the bowling line), `conveyor`, `mode: 'whack'`, and `scripts`. Scripts are trigger and action lists run once each by `ScriptSystem`; they hold and release waves and sky sun, show advice, drop sun, spawn zombies and start the conveyor, which is enough for the 1-1 and 1-5 tutorials without special cases in the engine. `sim.counters` (planted, sun collected, dug, killed) feeds their triggers.

### Events

The simulation never calls presentation code. Everything observable is an event in `sim.drainEvents()`: plants placed or removed, projectiles fired and hits (with the armor material that absorbed them), zombies spawning, starting to eat, losing an arm or head, dying, armor falling off, sun spawned and credited, mowers starting, wave spawned, huge wave warning, final wave, level cleared, won, lost, and the Day and Night additions (explosions, fumes, freezes, hypnosis, vaults, rage, backup dancers, Chomper bites, mines arming, graves, roller hits, conveyor packets, whacks, script messages). The game maps events to sounds (`LevelSounds`), particles and debris (`BoardScene.handleEvent`), and banners and flow (`LevelScreen`).

## Presentation

### Board rendering

`BoardScene` owns a world container that pans horizontally (the camera) over a background spanning the house, lawn and street. Each frame it syncs a view per live entity (`PlantView`, `ZombieView`, `ProjectileView`, `PickupView`, `MowerView`), creating and destroying views as entities appear and disappear. Positions are interpolated between the previous and current tick using the runner's `alpha`, so motion is smooth at any display rate without affecting the simulation.

Views animate from simulation state: a Peashooter's recoil is driven by `(tick - animTick) / fireDelay`, so the pea always leaves the mouth on the tick the simulation releases it; a zombie's walk cycle is driven by distance walked, so feet do not slide at any speed.

### Animation

If the asset manifest has a clip for `plant.<id>.<anim>` or `zombie.<id>.<anim>`, the view uses `ClipVisual`, which seeks the clip to simulation time with `AnimationPlayer`. Clip frame events (for syncing effects to art) and attachment points are part of the manifest format. Otherwise the view uses the procedural placeholder art from `@pvz/assets`, whose parts (head, arms, legs, cone stages) are transformed directly.

### HUD and menus

The in-level HUD (seed bank or conveyor belt, shovel, sun counter, progress meter, banners, message box, seed chooser) is drawn in Pixi. The seed bank, the belt and the shovel share one held-item flow in `LevelScreen` (`hold()` and `drop()`); Whack a Zombie swaps the cursor for the mallet. Menus (profiles, main menu, campaign, almanac, settings, pause and result dialogs) are DOM elements in an overlay that shares the canvas's 800x600 logical coordinate system through the same letterbox transform (`Stage`).

### Audio

`AudioEngine` has music, sfx and ui channels under a master gain, limits concurrent voices per sound id, picks a random variant when an id has several files, loops and crossfades music, and resumes its `AudioContext` on the first user gesture. Every id in `AudioRegistry` names a procedural placeholder generator; a manifest entry with the same id replaces it.

## Campaign and saves

See [CAMPAIGN.md](CAMPAIGN.md) and [SAVE_FORMAT.md](SAVE_FORMAT.md). In short: one `CampaignGraph` built from `CampaignRegistry`, evaluated against one `PlayerProfile`, persisted in IndexedDB.

## Developer tools

`DevPanel` talks to the game through two interfaces: `DevHost` (levels, worlds, campaign nodes, plants, profile) implemented by `Game`, and `DevSession` (simulation, speed, pause, single-step, overlays, placement tools, inspector, timing) implemented by `LevelScreen`. The panel issues debug commands through the normal command queue, so its actions stay deterministic and replayable.

## Testing

`npm test` runs Vitest in Node with no rendering:

- engine: attack timing, pea release delay, targeting rules, projectile speed and collision, damage and armor, shields and damage kinds, dying zombies, movement, eating, sun production, sky sun timing, collection, seed cooldowns, placement rules, wave pacing and acceleration, generated waves, huge waves, mowers, losing, winning, every Day and Night plant and zombie, graves, sleep, scripts, the conveyor, bowling, whacking, the shovel, determinism, and a scripted player that must win at least 8 of 20 seeds of 1-4
- content: cross-references, era profiles
- campaign: requirements, rewards, reward reconciliation, a full 1-1 to 2-10 run, the PvZ 1 to PvZ 2 hand-off on one profile, side content, broken graph detection
- save: migrations, normalization, refusal of newer versions, IndexedDB round trips (fake-indexeddb)
- assets, audio and tools: animation clock, manifest merging, placeholder sound coverage, asset folder scanning

## Performance notes

- The simulation loops over plain arrays with no closures or per-tick allocations in hot paths; removal is mark-and-compact.
- Projectile and zombie collision is a linear scan per lane check. That is fine for Adventure sizes; Endless-scale levels will be profiled before adding lane buckets or pooling.
- Particles reuse `Graphics` objects from a pool. Views are created once per entity.

## Adding content

- A plant or zombie that uses existing behaviors: add a definition in `packages/content/src/pvz1` (or a pvz2 folder), give it an era and `introducedIn`, and run `npm test` (validation checks references).
- A new mechanic: write a behavior class, register it, add tests in `packages/engine/test`, then reference it from data.
- A world gimmick: write a `SimSystem`, register it with `registerSystem`, list it in the world's `mechanics` and the levels' `systems`.
- A level: add a `LevelDef`, a campaign node pointing at it, and update `COMPATIBILITY.md`.
