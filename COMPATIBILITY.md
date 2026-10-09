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
| Day and Night lawn geometry | Close | 5x9 grid of 80x100 cells starting at (40, 80) in 800x600 screen space. |
| Starting sun | Exact | 50, except where a level sets its own (1-1 starts with 150). |
| Sun value | Exact | 25 per sky sun and per Sunflower sun. |
| Sky sun timing | Close | Next drop after min(950, 425 + 10n) + random 0..274 cs, n = suns fallen. Matches community docs; unverified here. |
| Sky sun fall speed and landing area | Close | 0.67 px/cs; lands at y 170..500, x 140..690. Approximate. |
| Sun lifetime | Close | Disappears 7.5 s after landing, blinking for the last 1.5 s. Unverified. |
| Sun crediting | Close | Credited when the flying sun reaches the bank, not on click. Unverified. |
| Seed recharge | Exact | 7.5 s, 30 s or 50 s per plant, as listed below. |
| Recharge at level start | Close | 30 s plants start with 20 s remaining, 50 s plants with 35 s. From community docs; unverified. |
| Picking a packet | Close | Recharging or unaffordable packets buzz and cannot be picked up; the sun counter flashes when sun is short. |
| Planting | Close | One plant per grass cell; translucent preview on valid cells; right click or Escape drops the plant. Graves and craters block planting; Grave Buster can only go on a grave. |
| Unsodded lanes | Close | 1-1 has one grass lane and 1-2 and 1-3 have three; the dirt rows take no plants and get no zombies or mowers. |
| Shovel | Close | Given at the start of 1-5 and kept afterwards. Digs up any plant; no sun is refunded. |
| Zombie bite | Close | 4 damage every 4 cs (100 per second). First bite one interval after contact; unverified. |
| Zombie walking speed | Close | Rolled once per zombie in 0.23..0.32 px/cs. The original moves zombies along the walk animation's ground track, so its motion is stepped; only the average is reproduced. |
| Zombie hitboxes | Close | Body span 36..78 and bite span 50..70 from the zombie anchor. |
| Arm and head loss | Close | Arm falls below 2/3 of body health, head below 1/3 (10 peas for a basic zombie, 17 for the 500 health zombies, matching documented counts). |
| Headless zombies | Close | Keep walking, absorb projectiles, are not targeted, cannot eat, lose 1 health per cs. Drain rate unverified. |
| Helmets | Close | Cone, bucket and football helmet. Damage beyond a helmet's remaining health hits the body, giving the documented 28 peas for a Conehead and 65 for a Buckethead. |
| Shields | Close | Newspaper and screen door. Straight projectiles and bowling nuts stop at the shield with no overflow; fumes hit shield and body at full damage; explosion and mallet damage left over after breaking the shield carries into the body; Chomper swallows the zombie, shield and all. |
| Damage kinds | Close | Projectile, fume, explosion, bowling, bite and mallet damage follow the shield rules above. Lobbed damage exists in the engine for the Roof plants. |
| Chill | Close | Snow peas and Ice-shroom halve movement and bite rate. Snow pea chill lasts 10 s (documented). A shield hit does not chill. |
| Freeze | Close | Ice-shroom stops movement and biting for 4 s, then chills for 20 s. Durations unverified. |
| Hypnosis | Close | A hypnotized zombie turns around, walks right, eats zombies it meets and is ignored by plants, explosions and Ice-shroom and does not set off mowers (a running mower still flattens it). It leaves the lawn at the right edge. Whether the original's Ice-shroom freezes hypnotized zombies is unverified. |
| Graves | Close | Placed at random in the right five columns at level start; zombies of the final wave also climb out of every grave. Grave counts per level are unverified. |
| Craters | Close | Doom-shroom leaves a crater that blocks planting for 180 s (documented 3 minutes). |
| Mushrooms by day | Close | Mushrooms planted on a day lawn sleep and do nothing. Coffee Bean, which wakes them, belongs to the Roof plants. |
| Pea | Close | 20 damage (exact), 3.33 px/cs, hits the leftmost overlapping zombie in its lane. |
| Shooter timing | Close | Launch counter resets to 150 minus random 0..14 cs; a target is checked only when it expires; the pea is released 35 cs after the decision. The 35 cs release delay and the counter's value at planting are unverified. |
| Shooter targeting | Close | Hostile zombie in the same lane whose body has entered the screen, has not passed the plant and is within range for short range shooters. |
| Lawn mowers | Close | One per grass lane; starts when a hostile zombie's body reaches it; kills every zombie it touches; one use. Speed 3.33 px/cs, unverified. |
| Losing | Close | A hostile zombie past the house line ends the game; the camera pans to the house and the zombie walks in. |
| Wave pacing | Close | Next wave 25..31 s after the last; once 4 s have passed and the wave's remaining health is at or below a random 50..65% of its starting health, the countdown drops to 2 s. From community docs; unverified. |
| First wave delay | Close | 18 s. Unverified. |
| Huge wave | Close | "A Huge Wave of Zombies is Approaching!" then a 7.5 s hold before the flag wave. |
| Final wave | Close | "FINAL WAVE" banner when the last wave spawns. |
| Wave composition | Close | Generated from a budget of floor(n / 3) + 1 for wave n (from 0), times 2.5 on flag waves, spent on the level's zombie list by `spawn.value` and `spawn.weight`. A flag zombie leads every tenth wave and the last one; a zombie new to the level fills wave 1. The original also limits which wave each type may first appear in; that rule is not reproduced. Budget formula from community docs, unverified. |
| Spawn lanes | Close | Weighted pick that makes recently used lanes less likely. The weighting is this project's own, not the original's. |
| Spawn position | Close | x 780..819 from the zombie anchor. |
| Level progress meter | Close | Appears with the first wave, fills toward flag markers. |
| Level end and reward | Close | The last zombie drops the reward; clicking it wins and records progress. |
| Ready, Set, Plant | Close | Shown after seed selection. Timing approximate. |
| Seed selection | Close | Camera pans to the street with a preview of the level's zombies; Let's Rock needs a full bank or every available plant. Skipped when the player owns no more plants than slots. |
| Seed slots | Close | Six slots from the start of the game. Buying more from the shop is not implemented. |
| Conveyor belt | Close | Packets arrive on a belt, cost no sun and slide left until the belt fills. Delivery interval 3 s, belt capacity and plant weights per level are unverified; repeats of the last delivered plant are made less likely. |
| Pause | Close | Menu button and Escape; also pauses when the tab is hidden. |
| Butter, stun and the remaining status effects | Missing | Arrive with the plants and zombies that cause them. |

## PvZ 1: plants

| Plant | Status | Notes |
| --- | --- | --- |
| Peashooter | Close | 100 sun, 7.5 s, 300 health. See shooter timing above. |
| Sunflower | Close | 50 sun, 7.5 s, 300 health. |
| Cherry Bomb | Close | 150 sun, 50 s. Explodes 1.2 s after planting for 1800 damage to every zombie whose body overlaps the 3x3 cells around it. Fuse time unverified. |
| Wall-nut | Close | 50 sun, 30 s, 4000 health (exact). Cracked looks at 2/3 and 1/3 health. |
| Potato Mine | Close | 25 sun, 30 s. Arms after 15 s (documented); an armed mine explodes for 1800 damage on the first zombie that steps on it and hits every zombie within 20 px of its cell. An unarmed mine is eaten like any plant. Blast span unverified. |
| Snow Pea | Close | 175 sun, 7.5 s. Pea damage plus 10 s chill. |
| Chomper | Close | 150 sun, 7.5 s. Swallows a zombie up to 60 px past its cell 0.7 s after deciding to bite, then chews for 42 s (documented) and can be eaten meanwhile. Reach and bite delay unverified. Zombies too large to swallow arrive with Gargantuar. |
| Repeater | Close | 200 sun, 7.5 s. Two peas 0.15 s apart per attack. Gap unverified. |
| Puff-shroom | Close | Free, 7.5 s. 20 damage spores at zombies within 3 tiles; spores fade after 280 px. |
| Sun-shroom | Close | 25 sun, 7.5 s. Makes 15 sun at Sunflower's rate, then 25 after growing at 120 s (documented). |
| Fume-shroom | Close | 75 sun, 7.5 s. 20 damage to every zombie within 4 tiles of its lane, through shields. Release delay unverified. |
| Grave Buster | Close | 75 sun, 7.5 s. Planted on a grave and eats it in 4.5 s, then disappears. Time unverified. |
| Hypno-shroom | Close | 75 sun, 30 s. The zombie that bites it is hypnotized and the mushroom is used up. |
| Scaredy-shroom | Close | 25 sun, 7.5 s. Full-range spores; hides and stops shooting while a zombie is within 80 px. Distance unverified. |
| Ice-shroom | Close | 75 sun, 50 s. After 1 s, every hostile zombie on the lawn takes 20 damage and freezes. See Freeze. |
| Doom-shroom | Close | 125 sun, 50 s. After 1 s, 1800 damage to every zombie within 3 columns and 2 rows of it; leaves a crater. The original's blast is a circle of documented radius; this uses a cell rectangle. |
| Wall-nut Bowling nuts | Close | Wall-nut and Explode-o-nut packets from the 1-5 conveyor. Nuts roll at 250 px/s and deal 1800 damage; a wall-nut bounces diagonally to a neighbouring lane after each hit, an Explode-o-nut explodes over 3x3 cells. Speed unverified. |
| Lily Pad, Squash, Threepeater, Tangle Kelp, Jalapeno, Spikeweed, Torchwood, Tall-nut | Missing | Pool plants. Lily Pad is the original's 2-10 reward and is not given yet. |
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
| Pole Vaulting Zombie | Close | 500 health. Runs at 0.66..0.68 px/cs, vaults over the first plant it reaches in 0.9 s, then walks and eats normally. Vault time unverified. Tall-nut stopping the vault arrives with Tall-nut. |
| Buckethead Zombie | Close | 1100 health metal bucket over 270 body. |
| Newspaper Zombie | Close | 150 health paper shield over 270 body. When the paper is destroyed it stops for 1.5 s, then walks and eats at 0.89..0.91 px/cs. Values unverified. |
| Screen Door Zombie | Close | 1100 health metal shield over 270 body. |
| Football Zombie | Close | 1400 health helmet over 270 body, 0.66..0.68 px/cs. Speed unverified. |
| Dancing Zombie | Close | 500 health. Moonwalks in at 0.55 px/cs until x 640, then summons four Backup Dancers (above, below, ahead, behind; lanes that do not exist are skipped) and dances left. Replaces missing dancers every 10 s. All dancers step and pause together (1.2 s walking, 0.8 s pause). Timings and the stopping point are unverified. |
| Backup Dancer | Close | 270 health. Rises from the ground in 1.5 s, then dances in step with its leader. |
| Ducky Tube, Snorkel, Zomboni, Zombie Bobsled Team, Dolphin Rider | Missing | |
| Jack-in-the-Box, Balloon, Digger, Pogo, Zombie Yeti | Missing | |
| Bungee, Ladder, Catapult, Gargantuar, Imp | Missing | |
| Dr. Zomboss (Zombot) | Missing | |
| Mini-game zombies (Peashooter, Wall-nut, Jalapeno, Gatling Pea, Squash, Tall-nut Zombies, Giga-gargantuar) | Missing | |

## PvZ 1: areas and adventure levels

Rewards follow the original where known: 1-1 Sunflower, 1-2 Cherry Bomb, 1-3 Wall-nut, 1-4 the Almanac, 1-5 the shovel and Potato Mine, 1-6 Snow Pea, 1-7 Chomper, 1-8 Repeater, 1-9 a note, 1-10 Puff-shroom, 2-1 Sun-shroom, 2-2 Fume-shroom, 2-3 Grave Buster, 2-4 Hypno-shroom, 2-5 Scaredy-shroom, 2-6 Ice-shroom, 2-7 Doom-shroom, 2-9 a note. The 1-4, 1-9, 2-8 and 2-9 rewards are unverified. Wave counts (10 per Day level, 10 or 20 at Night) are this project's estimates.

| Content | Status | Notes |
| --- | --- | --- |
| Day 1-1 | Close | One grass lane, Peashooter only, 150 starting sun, tutorial advice. Waves wait until the first Peashooter is planted. Four written waves; the original's tutorial prompts and timing are paraphrased. |
| Day 1-2 to 1-4 | Close | Three lanes in 1-2 and 1-3, all five from 1-4. Conehead introduced in 1-3. |
| Day 1-5 | Close | Dig up the three planted Peashooters with the new shovel, then Wall-nut Bowling: nuts arrive on a conveyor (about 15% Explode-o-nuts) and go left of the red line. |
| Day 1-6 to 1-9 | Close | Pole Vaulting Zombie in 1-6, Buckethead in 1-9. |
| Day 1-10 | Close | Conveyor belt level with the Day plants and no sky sun. |
| Day area rules | Close | Sky sun, mowers, grass lanes. |
| Night 2-1 to 2-4, 2-6 to 2-9 | Close | No sky sun, graves, mushrooms awake. Newspaper in 2-1, Screen Door in 2-3, Football in 2-6, Dancing in 2-8. |
| Night 2-5 | Close | Whack a Zombie: no plants, zombies climb out of graves and the mallet deals 500 damage per whack to the front zombie under the cursor. Mallet damage unverified. |
| Night 2-10 | Close | Conveyor belt level with the Night plants. Its Lily Pad reward waits for the Pool. |
| Pool | Missing | Water lanes, pool cleaners, swimming zombies. |
| Fog | Missing | Fog cover, Plantern and Blover clearing. 4-5 is Vasebreaker. |
| Roof | Missing | Roof slope, flower pots, lobbed projectiles, catapults, bungees. 5-5 is Bungee Blitz. |
| Dr. Zomboss (5-10) | Missing | |
| Crazy Dave dialogue | Incomplete | Tutorial and level advice appear in a message box with this project's wording. Dave himself and his scenes are not shown. |
| Notes | Incomplete | The 1-9 and 2-9 notes are granted and recorded in the profile; the note screen is not drawn. |
| Second adventure playthrough | Missing | |

## PvZ 1: modes and side content

| Content | Status | Notes |
| --- | --- | --- |
| Wall-nut Bowling | Close | In adventure 1-5. Bowling combo coin bonuses are missing with coins. |
| Whack a Zombie | Close | In adventure 2-5. |
| Conveyor belt levels | Close | 1-10 and 2-10. |
| Other mini-games | Missing | ZomBotany, Slot Machine, It's Raining Seeds, Beghouled, Invisi-ghoul, Seeing Stars, Zombiquarium, Beghouled Twist, Big Trouble Little Zombie, Portal Combat, Column Like You See 'Em, Bobsled Bonanza, Zombie Nimble Zombie Quick, Last Stand, ZomBotany 2, Wall-nut Bowling 2, Pogo Party, Dr. Zomboss's Revenge, and the mini-game list screen. |
| Vasebreaker (puzzle) | Missing | |
| I, Zombie (puzzle) | Missing | |
| Survival (normal, hard, Endless) | Missing | |
| Zen Garden | Missing | |
| Tree of Wisdom | Missing | |
| Crazy Dave's shop | Missing | Coins are already a profile currency. |
| Coins and money drops | Missing | |
| Almanac | Close | Plant entries once owned; the zombie section opens with the 1-4 Almanac reward and lists zombies once a level containing them opens. Layout and original flavor texts are not reproduced. |
| Achievements | Missing | Profile has a place for them. |

## PvZ 1: presentation

| Item | Status | Notes |
| --- | --- | --- |
| Art | Incomplete | Procedural placeholder art for every Day and Night plant, zombie, grave and lawn, with part animations (mine arming, Chomper jaw, sleeping eyes, armor damage stages, rising from the ground). Supplied sprites, frame sequences, spritesheets and layered clips replace it by logical id. Run `npm run dev` and open `/gallery.html` to see every placeholder. |
| Sound and music | Incomplete | Procedural placeholder sounds and original placeholder music loops (Day, Night, mini-game); supplied files replace them by id. |
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
| Conveyor levels | Missing | The PvZ 1 conveyor system is in place; PvZ 2 conveyor rules (no recharge, packet order) are not. |
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
