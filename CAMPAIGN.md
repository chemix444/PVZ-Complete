# Campaign

There is exactly one campaign. It begins on the PvZ 1 front lawn, runs through every PvZ 1 area and the PvZ 1 finale, opens the PvZ 1 postgame, crosses an intentional time-travel transition, and continues through the PvZ 2 worlds in their intended order. One profile tracks all of it.

## Graph model

`CampaignGraph` (`packages/campaign`) is built from `CampaignRegistry` (`packages/content/src/campaign/nodes.ts`). Each node:

| Field | Meaning |
| --- | --- |
| `id` | Stable id, for example `pvz1.day.1`. Saves refer to nodes by id. |
| `kind` | `start`, `level`, `world`, `boss`, `tutorial`, `minigame`, `unlock`, `reward`, `story`, `shop`, `side-mode`, `transition` |
| `era` | `pvz1` or `pvz2`; drives presentation (PvZ 1 level list or PvZ 2 world map) |
| `title` | Shown in menus and the developer tools |
| `world`, `level` | Links to `WorldRegistry` and `LevelRegistry` |
| `requires` | Node ids that must all be completed first |
| `rewards` | Granted once, on first completion |
| `auto` | Completes itself as soon as it opens (start markers, `unlock` and `story` events with no gameplay) |
| `side` | Playable side content that never becomes the Continue target |

A node is completed, available (all requirements completed, or opened directly by an event or the developer tools), or locked. The constructor rejects duplicate ids, unknown requirements, a level used by two nodes, and requirement cycles.

### Rewards

`plant` adds a plant to the one shared collection (a plant already owned is never granted twice), `feature` turns on a game system for the profile, `currency` adds coins or other currencies, `seed-slot` adds seed bank slots, `note` records a story note. For level nodes the rewards come from the level definition, so the reward a level drops and the reward the campaign records cannot disagree.

### Continue

After every completion the profile's `campaign.current` is set to the first available, non-auto, non-side node in campaign order. The main menu's Adventure button starts that node's level. Completed levels stay replayable from the Campaign screen; replays count completions but grant nothing new.

## Feature gates

PvZ 2 systems exist in one engine, but the campaign decides when a profile sees them. A feature is a string in `profile.features`, granted by a `feature` reward. Planned gates:

| Feature | Granted by | Effect |
| --- | --- | --- |
| `shovel` | PvZ 1 Day 1-5 | Shovel button in the HUD |
| `plant-food` | `transition.time-travel` | Plant Food drops and the Plant Food button |
| `world-map` | `transition.time-travel` | PvZ 2 world map navigation |
| `pvz2-objectives` | first Ancient Egypt level that uses one | Level objective banners and checks |
| `power-ups` | the PvZ 2 node where they are introduced | Pinch, flick and zap |

Only the mechanism is implemented today (`hasFeature`, `grantReward`); the gated features themselves arrive with their milestones.

## Planned order

```
campaign.start                    new profile, grants Peashooter
pvz1.day.1 ... pvz1.day.10        Day
pvz1.night.1 ... pvz1.night.10    Night
pvz1.pool.1 ... pvz1.pool.10      Pool
pvz1.fog.1 ... pvz1.fog.10        Fog
pvz1.roof.1 ... pvz1.roof.9       Roof
pvz1.roof.10                      Dr. Zomboss (PvZ 1 finale)
pvz1.postgame.*                   side: minigames, Vasebreaker, I, Zombie, Survival, Zen Garden, shop
transition.time-travel            story and rewards: Penny, time travel, Plant Food, world map
pvz2.player-house.*               PvZ 2 tutorial levels, played as the first stop in time
pvz2.ancient-egypt.*
pvz2.pirate-seas.*
pvz2.wild-west.*
pvz2.far-future.*
pvz2.dark-ages.*
pvz2.big-wave-beach.*
pvz2.frostbite-caves.*
pvz2.lost-city.*
pvz2.neon-mixtape-tour.*
pvz2.jurassic-marsh.*
pvz2.modern-day.*
```

Nodes are appended as their content is implemented. Ids already shipped never change, so existing saves keep their progress.

## The PvZ 1 to PvZ 2 transition

The transition is a `transition` node (`transition.time-travel`) that requires the PvZ 1 finale. It is an `auto` node: completing the finale completes it, which grants the PvZ 2 features and opens the first PvZ 2 node. Continue then points straight into PvZ 2, on the same profile and with the same plant collection.

Rules for the hand-off:

- Plants owned in PvZ 1 stay owned. Plants that exist in both games are one entry; PvZ 2 levels use their `pvz2` profile values where they differ.
- PvZ 2 plants are new rewards granted by PvZ 2 nodes.
- PvZ 2 mechanics appear progressively: Plant Food at the transition, objectives and special tiles at the levels that introduce them, world gimmicks inside their worlds.
- The UI evolves with the era of the current node: PvZ 1 areas use a level list; PvZ 2 worlds get a world map. Both read the same graph.

The graph test in `packages/campaign/test/graph.test.ts` exercises exactly this flow (last PvZ 1 node, auto transition, first PvZ 2 node) on one profile.

## Current content

| Node | Kind | Status |
| --- | --- | --- |
| `campaign.start` | start (auto) | grants Peashooter |
| `pvz1.day.1` | level `pvz1-day-01` | Milestone 1 slice; rewards Sunflower |

`pvz1-day-01` is not yet the original 1-1 (see COMPATIBILITY.md). It sits in the 1-1 slot so its completion is stored in the real campaign; Milestone 2 replaces its content with the faithful level without changing the node id.
