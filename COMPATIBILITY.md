# Compatibility

What PVZ Complete reproduces, and how closely. PvZ 1 and PvZ 2 have separate sections for readability; they are parts of the same game.

| Status | Meaning |
| --- | --- |
| Exact | Matches the original's documented or measured behavior. |
| Close | Implemented with the right structure; one or more values or details are approximate or not yet verified against the game. The note says which. |
| Incomplete | Partly implemented, or implemented in a simplified form that is known to differ. |
| Missing | Not implemented. |

Sources are observed gameplay and community-documented values (wiki pages and research tables). "Unverified" means the value was entered from documentation or memory and has not been measured against the running game in this project. Times are given in seconds and, for PvZ 1, centiseconds (cs), which are also simulation ticks.

## PvZ 1: core mechanics

| Mechanic | Status | Notes |
| --- | --- | --- |
| Board update rate | Exact | 100 ticks per second, the original's centisecond board update. |
| Day lawn geometry | Close | 5x9 grid of 80x100 cells starting at (40, 80) in 800x600 screen space. |
| Starting sun | Exact | 50. |
| Sun value | Exact | 25 per sky sun and per Sunflower sun. |
| Sky sun timing | Close | Next drop after min(950, 425 + 10n) + random 0..274 cs, n = suns fallen. Matches community docs; unverified here. |
| Sky sun fall speed and landing area | Close | 0.67 px/cs; lands at y 170..500, x 140..690. Approximate. |
| Sun lifetime | Close | Disappears 7.5 s after landing, blinking for the last 1.5 s. Unverified. |
| Sun crediting | Close | Credited when the flying sun reaches the bank, not on click. Unverified. |
| Seed recharge | Exact | 7.5 s for Peashooter and Sunflower, 30 s for Wall-nut. |
| Recharge at level start | Close | 30 s plants start with 20 s remaining (50 s plants would start with 35 s). From community docs; unverified. |
| Picking a packet | Close | Recharging or unaffordable packets buzz and cannot be picked up; the sun counter flashes when sun is short. |
| Planting | Close | One main plant per grass cell; translucent preview on valid cells; right click or Escape drops the plant. |
| Shovel | Missing | Planned for 1-5, where the original introduces it. |
| Zombie bite | Close | 4 damage every 4 cs (100 per second). First bite one interval after contact; unverified. |
| Zombie walking speed | Close | Rolled once per zombie in 0.23..0.32 px/cs. The original moves zombies along the walk animation's ground track, so its motion is stepped; only the average is reproduced. |
| Zombie hitboxes | Close | Body span 36..78 and bite span 50..70 from the zombie anchor. |
| Arm and head loss | Close | Arm falls below 180 body health, head below 90 (10 peas for a basic zombie, matching the documented value). |
| Headless zombies | Close | Keep walking, absorb projectiles, are not targeted, cannot eat, lose 1 health per cs. Drain rate unverified. |
| Helmet overflow | Close | Damage beyond a helmet's remaining health hits the body, giving the documented 28 peas for a Conehead. |
| Pea | Close | 20 damage (exact), 3.33 px/cs, hits the leftmost overlapping zombie in its lane. |
| Shooter timing | Close | Launch counter resets to 150 minus random 0..14 cs; a target is checked only when it expires; the pea is released 35 cs after the decision. The 35 cs release delay and the counter's value at planting are unverified. |
| Shooter targeting | Close | Active zombie in the same lane whose body has entered the screen and has not passed the plant. |
| Sunflower | Close | First sun 3..12.5 s after planting, then every 23.5..25 s; glows 1 s before producing. |
| Lawn mowers | Close | One per lane; starts when an active zombie's body reaches it; kills every zombie it touches; one use. Speed 3.33 px/cs, unverified. |
| Losing | Close | An active zombie past the house line ends the game; the camera pans to the house and the zombie walks in. |
| Wave pacing | Close | Next wave 25..31 s after the last; once 4 s have passed and the wave's remaining health is at or below a random 50..65% of its starting health, the countdown drops to 2 s. From community docs; unverified. |
| First wave delay | Close | 18 s. Unverified. |
| Huge wave | Close | "A Huge Wave of Zombies is Approaching!" then a 7.5 s hold before the flag wave. |
| Final wave | Close | "FINAL WAVE" banner when the last wave spawns. |
| Wave composition | Incomplete | Waves are written out per level. The PvZ 1 wave budget generator (zombie values, weights, the first wave each type may appear in, flag wave extras) is not implemented; definitions already carry `spawn.value` and `spawn.weight`. |
| Spawn lanes | Close | Weighted pick that makes recently used lanes less likely. The weighting is this project's own, not the original's. |
| Spawn position | Close | x 780..819 from the zombie anchor. |
| Level progress meter | Close | Appears with the first wave, fills toward flag markers. |
| Level end and reward | Close | The last zombie drops the reward; clicking it wins and records progress. |
| Ready, Set, Plant | Close | Shown after seed selection. Timing approximate. |
| Seed selection | Close | Camera pans to the street with a preview of the level's zombies; Let's Rock needs a full bank or every available plant. |
| Pause | Close | Menu button and Escape; also pauses when the tab is hidden. |
| Status effects | Missing | Chill, freeze, butter, stun, and the rest arrive with the plants that cause them. |

## PvZ 1: plants

| Plant | Status | Notes |
| --- | --- | --- |
| Peashooter | Close | 100 sun, 7.5 s, 300 health. See shooter timing above. |
| Sunflower | Close | 50 sun, 7.5 s, 300 health. |
| Cherry Bomb | Missing | |
| Wall-nut | Close | 50 sun, 30 s, 4000 health (exact). Cracked looks at 2/3 and 1/3 health. |
| Potato Mine | Missing | |
| Snow Pea | Missing | |
| Chomper | Missing | |
| Repeater | Missing | |
| Puff-shroom, Sun-shroom, Fume-shroom, Grave Buster, Hypno-shroom, Scaredy-shroom, Ice-shroom, Doom-shroom | Missing | Night plants. |
| Lily Pad, Squash, Threepeater, Tangle Kelp, Jalapeno, Spikeweed, Torchwood, Tall-nut | Missing | Pool plants. |
| Sea-shroom, Plantern, Cactus, Blover, Split Pea, Starfruit, Pumpkin, Magnet-shroom | Missing | Fog plants. |
| Cabbage-pult, Flower Pot, Kernel-pult, Coffee Bean, Garlic, Umbrella Leaf, Marigold, Melon-pult | Missing | Roof plants. |
| Gatling Pea, Twin Sunflower, Gloom-shroom, Cattail, Winter Melon, Gold Magnet, Spikerock, Cob Cannon | Missing | Upgrade plants from the shop. |
| Imitater | Missing | |

## PvZ 1: zombies

| Zombie | Status | Notes |
| --- | --- | --- |
| Zombie | Close | 270 health. |
| Flag Zombie | Close | 270 health; speed 0.45 px/cs, unverified. |
| Conehead Zombie | Close | 370 health cone over 270 body; cone shows three damage stages. |
| Pole Vaulting, Buckethead, Newspaper, Screen Door, Football, Dancing, Backup Dancer | Missing | |
| Ducky Tube, Snorkel, Zomboni, Zombie Bobsled Team, Dolphin Rider | Missing | |
| Jack-in-the-Box, Balloon, Digger, Pogo, Zombie Yeti | Missing | |
| Bungee, Ladder, Catapult, Gargantuar, Imp | Missing | |
| Dr. Zomboss (Zombot) | Missing | |
| Mini-game zombies (Peashooter, Wall-nut, Jalapeno, Gatling Pea, Squash, Tall-nut Zombies, Giga-gargantuar) | Missing | |

## PvZ 1: areas and adventure levels

| Content | Status | Notes |
| --- | --- | --- |
| Day 1-1 | Incomplete | Milestone 1 slice in the 1-1 slot: full 5 lanes, Peashooter plus lent Sunflower and Wall-nut, 10 hand-written waves with Conehead and a final flag wave, Sunflower reward. The original is a single sod lane, Peashooter only, with tutorial prompts. Replaced in Milestone 2. |
| Day 1-2 to 1-10 | Missing | Includes 1-5 (shovel, Wall-nut Bowling) and 1-10 (conveyor belt). |
| Day area rules | Close | Sky sun, mowers, grass lanes. |
| Night | Missing | No sky sun, graves, sleeping mushrooms, Coffee Bean later. 2-5 is Whack a Zombie. |
| Pool | Missing | Water lanes, pool cleaners, swimming zombies. |
| Fog | Missing | Fog cover, Plantern and Blover clearing. 4-5 is Vasebreaker. |
| Roof | Missing | Roof slope, flower pots, lobbed projectiles, catapults, bungees. 5-5 is Bungee Blitz. |
| Dr. Zomboss (5-10) | Missing | |
| Crazy Dave dialogue and notes | Missing | |
| Second adventure playthrough | Missing | |

## PvZ 1: modes and side content

| Content | Status | Notes |
| --- | --- | --- |
| Mini-games | Missing | ZomBotany, Wall-nut Bowling, Slot Machine, It's Raining Seeds, Beghouled, Invisi-ghoul, Seeing Stars, Zombiquarium, Beghouled Twist, Big Trouble Little Zombie, Portal Combat, Column Like You See 'Em, Bobsled Bonanza, Zombie Nimble Zombie Quick, Whack a Zombie, Last Stand, ZomBotany 2, Wall-nut Bowling 2, Pogo Party, Dr. Zomboss's Revenge. |
| Vasebreaker (puzzle) | Missing | |
| I, Zombie (puzzle) | Missing | |
| Survival (normal, hard, Endless) | Missing | |
| Conveyor belt levels | Missing | |
| Zen Garden | Missing | |
| Tree of Wisdom | Missing | |
| Crazy Dave's shop | Missing | Coins are already a profile currency. |
| Coins and money drops | Missing | |
| Almanac | Close | Plant and zombie entries with stats and descriptions; plants appear once owned, zombies once a level containing them opens. Layout and original flavor texts are not reproduced. |
| Achievements | Missing | Profile has a place for them. |

## PvZ 1: presentation

| Item | Status | Notes |
| --- | --- | --- |
| Art | Incomplete | Procedural placeholder art. Supplied sprites, frame sequences, spritesheets and layered clips replace it by logical id. Seed packet icons and the almanac still draw placeholders. |
| Sound and music | Incomplete | Procedural placeholder sounds and original placeholder music loops; supplied files replace them by id. |
| Menus | Incomplete | Same structure (profiles, main menu, adventure, almanac, settings, pause, results); not the original layouts. |

## PvZ 2: systems

| System | Status | Notes |
| --- | --- | --- |
| Time-travel transition | Missing | Campaign mechanism in place (auto transition node, feature rewards, tested). |
| World map | Missing | |
| Plant Food | Missing | |
| Power-ups (pinch, flick, zap) | Missing | |
| Level objectives (endangered plants, sun quotas, plant limits, zombie lines, no-plant tiles) | Missing | |
| Special tiles and environmental hazards | Missing | Boards already support per-cell surface overrides. |
| Conveyor levels | Missing | |
| Boss fights and multi-stage encounters | Missing | |
| Modern seed selection | Missing | |
| PvZ 2 plant and zombie values (era profiles) | Missing | Profile mechanism implemented and tested. |
| Stars, keys, coins, gems | Missing | Profile has currencies and per-world progress. |

## PvZ 2: worlds

| World | Status | Signature mechanics |
| --- | --- | --- |
| Player's House (tutorial) | Missing | |
| Ancient Egypt | Missing | Tombstones, sandstorms, Ra Zombie stealing sun. |
| Pirate Seas | Missing | Planks over water, swashbucklers swinging in, imp cannons. |
| Wild West | Missing | Minecarts on rails. |
| Far Future | Missing | Power tiles. |
| Dark Ages | Missing | Necromancy graves. |
| Big Wave Beach | Missing | Moving low tide line. |
| Frostbite Caves | Missing | Freezing wind, ice blocks, slider tiles. |
| Lost City | Missing | Gold tiles. |
| Neon Mixtape Tour | Missing | Music jams that change zombie behavior. |
| Jurassic Marsh | Missing | Dinosaurs acting on zombies, amber. |
| Modern Day | Missing | Portals. |
