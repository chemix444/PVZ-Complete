# Content format

All content is TypeScript data typed against the formats in `packages/engine/src/defs.ts` (simulation formats) and `packages/content/src/types.ts` (worlds, audio, effects). Every definition is JSON compatible: no functions, no class instances. Registries are built in `packages/content/src/registries.ts`; `validateContent()` checks every cross reference and runs in the test suite and at startup.

## Conventions

- Ids are stable, lowercase, hyphenated: `peashooter`, `wall-nut`, `conehead`, `pvz1-day-01`. Never reuse or rename a shipped id; saves store them.
- Durations are seconds. Speeds are pixels per second. Positions are board pixels (PvZ 1 boards use the original 800x600 screen space).
- The simulation runs at 100 ticks per second; `0.01` seconds is one tick.
- `era` is `pvz1` or `pvz2` on every plant, zombie, projectile, board, level and world.
- `introducedIn` names the level or world where the original game first gives the player the plant or first sends the zombie. It may name content that is not implemented yet.

## Eras and profiles

A plant or zombie that exists in both games is one definition. Values that differ between the games go in `profiles`:

```ts
{
  id: 'peashooter',
  era: 'pvz1',
  cost: 100,
  recharge: 7.5,
  // ...
  profiles: {
    pvz2: { recharge: 5, behaviors: [/* PvZ 2 shooter values */] },
  },
}
```

`contentFor(era)` serves definitions to the simulation with the level's era profile shallow-merged over the base (`{ ...base, ...profile }`; arrays such as `behaviors` are replaced, not merged).

## Plants (`PlantDef`)

| Field | Type | Notes |
| --- | --- | --- |
| `id`, `name`, `era`, `introducedIn` | string | |
| `cost` | number | sun |
| `recharge` | seconds | seed packet cooldown after planting |
| `rechargeAtStart` | seconds | cooldown remaining when a level starts; omit for ready |
| `health` | number | |
| `slot` | `main` \| `base` \| `cover` | default `main`; `base` is for lily pads and pots, `cover` for pumpkins |
| `surfaces` | `grass`, `water`, `roof`, `dirt` | default `['grass']` |
| `hitbox` | `{ left, width }` | span zombies bite, relative to the cell's left edge; default `{ left: 10, width: 60 }` |
| `behaviors` | behavior specs | run every tick, in order |
| `damageStages` | health fractions | where the damaged look changes (Wall-nut cracks) |
| `nocturnal` | boolean | sleeps (runs no behaviors) on boards with `daytime: true` |
| `placeOn` | `grave` | planted on a grave instead of an empty cell (Grave Buster) |
| `tags`, `description`, `audio` | | `audio.fire` is played when a projectile is fired |
| `profiles` | per-era overrides | |

### Plant behaviors

`shooter`

| Param | Meaning |
| --- | --- |
| `projectile` | projectile id |
| `interval` | launch rate; the counter is reset to `interval - random[0, intervalJitter)` each time it expires |
| `intervalJitter` | see above |
| `fireDelay` | time from deciding to attack (animation start) to releasing the projectile |
| `initialDelay` | counter value at planting; 0 checks on the first tick |
| `spawnOffset` | `{ x, y }` projectile spawn point from the cell's top-left |
| `burst`, `burstGap` | projectiles per attack and the time between them (Repeater: 2, 0.15) |
| `range` | only targets zombies within this many px of the plant's right edge (Puff-shroom) |
| `hideWithin` | hides and holds fire while a zombie is this close (Scaredy-shroom) |

The shooter only looks for a target when its counter expires. A target is a hostile zombie in the same row whose hitbox has entered the screen (`attackLimitX`) and has not passed the plant.

`producer`

| Param | Meaning |
| --- | --- |
| `amount` | sun per production |
| `firstDelay` | `[min, max]` seconds until the first sun |
| `interval` | `[min, max]` seconds between later suns |
| `glowLead` | seconds of glow before producing (visual cue only) |
| `growAfter`, `grownAmount` | after this long the plant grows and produces `grownAmount` instead (Sun-shroom) |

Other plant behaviors:

| Type | Params | Used by |
| --- | --- | --- |
| `fume` | `damage`, `interval`, `intervalJitter`, `fireDelay`, `range` (px past the plant) | Fume-shroom |
| `explode` | `fuse`, `damage`, `cols` and `rows` (cells reached on each side), `effect`, `crater` (seconds) | Cherry Bomb, Doom-shroom |
| `freeze-all` | `fuse`, `damage`, `freeze`, `chill` (applied after the freeze) | Ice-shroom |
| `mine` | `armTime`, `damage`, `blast` (px beyond the cell on each side) | Potato Mine |
| `chomper` | `reach` (px past the cell), `biteDelay`, `chewTime`, `largeDamage` | Chomper |
| `hypnotize` | none | Hypno-shroom |
| `grave-buster` | `time` | Grave Buster |
| `bowl` | `speed`, `damage`, `explode` | Wall-nut Bowling nuts |

## Zombies (`ZombieDef`)

| Field | Notes |
| --- | --- |
| `health` | body health, armor excluded |
| `loseArmBelow` | the arm falls once body health is below this |
| `dieBelow` | the head falls once body health is below this; the zombie is then dying |
| `dyingDrain` | health lost per second while dying |
| `speed` | `[min, max]` px/s, rolled once per zombie |
| `hitbox` | `{ left, width }` body span from the zombie's x anchor; projectiles and mowers hit this |
| `attackBox` | `{ left, width }` span that bites plants |
| `armor` | layers applied before the body, in order |
| `behaviors` | `eater` must precede `walker` |
| `spawn` | `{ value, weight }`: cost and pick weight for the PvZ 1 wave generator |

Armor layer: `{ id, kind: 'helmet' | 'shield', health, material, damageStages }`. Helmet damage beyond the helmet's remaining health carries into the body. `material` picks impact sounds and effects (`audio.<material>-hit` if it exists).

### Zombie behaviors

`walker` moves left at the zombie's speed while walking or dying. `eater` (`damage`, `interval`) bites the highest-layer, rightmost plant overlapping the attack box; the first bite lands one interval after contact.

| Type | Params | Used by |
| --- | --- | --- |
| `pole-vault` | `runSpeed` (px/s range), `vaultTime` | Pole Vaulting Zombie |
| `rage` | `armor` (the shield whose loss enrages it), `shock`, `speed` | Newspaper Zombie |
| `dancer` | `backup` (zombie id), `moonwalkSpeed`, `stopX`, `summonTime`, `resummonEvery` | Dancing Zombie |
| `dance-step` | `walk`, `pause` (seconds of each step on the shared dance clock) | Dancing and Backup Dancer |

Behaviors that change movement run before `eater` and `walker` in the list.

## Projectiles (`ProjectileDef`)

`{ id, era, motion: 'straight', speed, damage, damageType: 'normal', width, maxDistance?, chill?, audio: { hit } }`. `maxDistance` removes the projectile after it travels that far (Puff-shroom spores); `chill` slows the zombie it hits for that many seconds unless a shield took the hit. A straight projectile hits the leftmost collidable zombie in its row whose hitbox overlaps `[x, x + width]`. Lobbed, homing, piercing, splash and other motions will be added as new `motion` values.

## Boards (`BoardDef`)

| Field | Notes |
| --- | --- |
| `rows`, `cols`, `origin`, `tile` | grid geometry; cell (r, c) starts at `origin + (c * tile.width, r * tile.height)` |
| `lanes` | surface per row; `cellOverrides` (`"r,c": surface`) for special tiles |
| `zombieSpawnX`, `zombieSpawnJitter` | wave zombies spawn at `zombieSpawnX + random[0, jitter)` |
| `attackLimitX` | zombies must be left of this to be targeted (the screen edge) |
| `houseX` | an active zombie whose hitbox passes this has won |
| `projectileLimitX` | projectiles are removed past this |
| `mower` | `{ x, width, speed }`, one per row when the level enables mowers |
| `skySun` | `{ minX, maxX, startY, minLandY, maxLandY, fallSpeed }` |
| `sunCollectTarget` | where collected sun flies; it is credited on arrival |
| `daytime` | nocturnal plants sleep on daytime boards |
| `view` | `{ background, minX, maxX, width, height }`; camera range and background asset id |

## Levels (`LevelDef`)

| Field | Notes |
| --- | --- |
| `id`, `era`, `world`, `name`, `label` | `label` is the short name such as `1-1` |
| `board` | board id |
| `lanes` | per-row surface override; unsodded rows are `dirt` (1-1 has one grass row, 1-2 and 1-3 three) |
| `startingSun` | |
| `seedSelection` | `{ mode: 'choose' \| 'preset' \| 'conveyor', slots, offered, forced, banned }`; `offered` lends plants the profile does not own; `conveyor` hides the seed bank |
| `waves` | list of `{ flag?, zombies: [id \| { zombie, row }] }`; ignored when `waveGenerator` is set |
| `waveGenerator` | `{ waves, flagEvery?, zombies, introduce?, flagZombie? }`; see below |
| `firstWaveDelay` | seconds before wave 1 (default 18) |
| `skySun`, `mowers` | booleans |
| `startingPlants` | `[{ plant, row, col }]` already on the lawn (the Peashooters dug up in 1-5) |
| `graves` | `{ count, minCol }`: graves placed at random in columns `minCol` and up |
| `gravesRiseOnFinalWave` | the final wave also sends a zombie out of every grave |
| `plantableCols` | plants may only go in the first N columns (the bowling line) |
| `conveyor` | `{ plants: [{ plant, weight }], interval, capacity }` |
| `mode` | `normal` or `whack` (Whack a Zombie: zombies rise from graves, the cursor is a mallet) |
| `shovel` | `true` offers the shovel before the profile owns it, `false` hides it; omitted follows the profile |
| `scripts` | level scripts; see below |
| `systems` | extra simulation systems: `[{ type, ...params }]` |
| `music`, `environment` | presentation |
| `rewards` | list of rewards; the level's campaign node grants them |
| `status` | accuracy status mirrored in COMPATIBILITY.md |

Wave pacing follows PvZ 1 rules (see COMPATIBILITY.md). A flag wave is preceded by the huge wave warning; the last wave triggers the final wave banner. The level is cleared when every wave has spawned and no zombie is left alive; the reward drops where the last zombie fell and the level is won when the player collects it.

### Wave generator

Wave n (from 0) gets a budget of `floor(n / 3) + 1`, multiplied by 2.5 on flag waves (every `flagEvery`, default 10, and the last wave). Flag waves start with `flagZombie`. The first wave holds `introduce` when the level brings in a new zombie. The rest of each budget is spent on `zombies` by `spawn.weight`, skipping types whose `spawn.value` no longer fits. Waves are generated once from the simulation's seed when the level starts, so a replay with the same seed gets the same waves.

### Scripts

```ts
scripts: [
  { id: 'intro', when: { on: 'start' }, actions: [{ do: 'hold-waves' }, { do: 'message', text: 'Click the Peashooter packet.' }] },
  { id: 'planted', when: { on: 'planted', count: 1 }, actions: [{ do: 'release-waves', delay: 20 }] },
]
```

Each script runs its actions once, in order, on the first tick its trigger holds.

| Trigger | Holds when |
| --- | --- |
| `{ on: 'start' }` | the level starts |
| `{ on: 'time', at }` | `at` seconds have passed |
| `{ on: 'planted', count, plant? }` | the player has planted `count` plants (of that id) |
| `{ on: 'sun-collected', count }` | the player has collected `count` suns |
| `{ on: 'dug', count }` | the shovel has dug up `count` plants |
| `{ on: 'killed', count }` | `count` zombies have died |
| `{ on: 'wave', wave }` | wave `wave` has spawned |
| `{ on: 'after', script, delay }` | `delay` seconds after another script ran |

Actions: `message` (`text`, `duration`), `hold-waves`, `release-waves` (`delay`), `hold-sky-sun`, `release-sky-sun`, `drop-sun` (`x`), `add-sun` (`amount`), `spawn-zombie` (`zombie`, `row`, `x`), `start-conveyor`, `stop-conveyor`.

PvZ 2 objectives will add an `objectives` list. Existing fields will not change meaning.

## Worlds (`WorldDef`)

`{ id, name, era, map: 'pvz1-area' | 'pvz2-map', levels, environment, music, boards, mechanics, plants, zombies, requires, boss, rewards }`. `mechanics` are system types that `playableLevel()` prepends to each of the world's levels' `systems`.

## Campaign nodes

See [CAMPAIGN.md](CAMPAIGN.md).

## Audio (`AudioDef`)

`{ id, channel: 'music' | 'sfx' | 'ui', placeholder, volume, maxInstances, loop }`. `placeholder` names a generator in `@pvz/audio`. Sound ids start with `audio.`, music ids with `music.`.

## Effects (`EffectDef`)

Particle bursts: `{ id, particles, colors, lifetime, speed: [min, max], size: [min, max], gravity, spread }`.

## Asset manifest

Logical asset ids:

```
bg.<board>                         backgrounds, for example bg.pvz1.day
plant.<plant id>.<animation>       idle, attack, glow
zombie.<zombie id>.<animation>     walk, eat, die, mowed
projectile.<projectile id>
ui.<name>
audio.<sound id>, music.<track id>
```

`manifest.json`:

```json
{
  "version": 1,
  "assets": {
    "bg.pvz1.day": { "type": "image", "url": "bg.pvz1.day.jpg", "offset": [-220, 0] },
    "plant.peashooter.idle": {
      "type": "frames",
      "frames": ["plant.peashooter.idle/0001.png", "plant.peashooter.idle/0002.png"],
      "fps": 12,
      "loop": true,
      "anchor": [0.5, 1],
      "offset": [40, 95],
      "events": { "6": "release" },
      "attachments": { "mouth": [62, 38] }
    },
    "zombie.basic.walk": { "type": "spritesheet", "url": "zombie.basic.walk.json", "animation": "walk", "fps": 12 },
    "zombie.basic.body": { "type": "layered", "layers": [{ "asset": "zombie.basic.walk" }, { "asset": "zombie.basic.head", "offset": [10, -40], "z": 1 }] },
    "audio.splat": { "type": "audio", "urls": ["audio.splat/1.ogg", "audio.splat/2.ogg"] }
  }
}
```

Relative urls resolve against the manifest's folder. `offset` places the texture anchor relative to the entity origin: a plant's cell top-left, a zombie's x anchor and row top. Frame `events` fire on entering that frame (presentation only); `attachments` are named points for effects and held items. Supplied audio with several urls plays a random variant each time.

`npm run assets:scan` builds the manifest from a folder:

| On disk | Entry |
| --- | --- |
| `<id>.png` / `.jpg` / `.webp` | `image` |
| `<id>/` with images (natural sort) and optional `anim.json` | `frames` (`anim.json` supplies fps, loop, anchor, offset, scale, events, attachments) |
| `<id>.json` (+ its texture) | `spritesheet` |
| `<id>.ogg` / `.mp3` / `.wav` | `audio` |
| `<id>/` with audio files | `audio` with variants |
