# PVZ Complete

A browser recreation of Plants vs. Zombies 1 and Plants vs. Zombies 2 built as one continuous game: one profile, one save, one plant collection and one campaign that starts on the PvZ 1 front lawn and later travels through time into the PvZ 2 worlds.

No proprietary code or assets are included. Gameplay is reimplemented from observable behavior and documented values; art and sound are procedural placeholders until you supply your own files (see [Local assets](#local-assets)).

## Status

Milestone 1 is done: a playable PvZ 1 Day lawn with Peashooter, Sunflower and Wall-nut against basic, Flag and Conehead zombies, sky sun, seed selection, lawn mowers, waves, win and loss, recorded in the unified campaign save. See [COMPATIBILITY.md](COMPATIBILITY.md) for what is exact, close, incomplete or missing.

## Running it

Requires Node 22.18 or newer.

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # deterministic simulation, campaign and save tests
npm run typecheck
npm run build      # static site in apps/game/dist
```

No backend is needed; the built `dist` folder can be served by any static file host.

## Playing

- Create a profile, then Start Adventure.
- Pick plants for your seed bank and press Let's Rock.
- Click a seed packet, then a lawn tile to plant. Right click or Escape drops the plant.
- Click sun to collect it.
- Escape or the Menu button pauses.

## Developer tools

Press the backquote key (`` ` ``) anywhere to open the developer panel. It can change game speed, pause and step single ticks, add sun, skip waves, spawn any plant or zombie by clicking the lawn, toggle hitbox, targeting and grid overlays, inspect and edit entities, start any level, open any world, complete or open campaign nodes, grant plants and change seed slots. Settings has a toggle that also shows a Developer Tools button in the menus.

## Local assets

Copy your own art and audio into `apps/game/public/local-assets/`, run `npm run assets:scan`, and reload. Every logical id found there (for example `plant.peashooter.idle` or `audio.splat`) replaces its placeholder. The folder is ignored by git. Naming rules are in that folder's README and in [CONTENT_FORMAT.md](CONTENT_FORMAT.md#asset-manifest).

## Repository layout

```
apps/game          Vite app: screens, Pixi board renderer, HUD, input
packages/engine    deterministic simulation (no rendering, no DOM)
packages/content   plant, zombie, board, level, world, campaign, audio and effect data plus registries
packages/campaign  campaign graph: requirements, rewards, progression
packages/save      versioned player profiles, migrations, IndexedDB store
packages/assets    asset manifest, animation clock, placeholder art
packages/audio     Web Audio engine and procedural placeholder sounds and music
packages/ui        small DOM UI kit and shared styles
packages/tools     developer panel and the local asset scanner
tools              command-line scripts
```

Documentation: [ARCHITECTURE.md](ARCHITECTURE.md), [CAMPAIGN.md](CAMPAIGN.md), [CONTENT_FORMAT.md](CONTENT_FORMAT.md), [SAVE_FORMAT.md](SAVE_FORMAT.md), [COMPATIBILITY.md](COMPATIBILITY.md).
