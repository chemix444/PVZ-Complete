# Local assets

Put your own copies of game art and audio here. Nothing in this folder except
this README is committed.

After adding files, run `npm run assets:scan` from the repository root. It
writes `manifest.json` in this folder, which the game loads at startup. Any
logical id listed there replaces the procedural placeholder for that id.

Naming conventions the scanner understands (paths relative to this folder):

| On disk | Becomes |
| --- | --- |
| `plant.peashooter.idle.png` | image `plant.peashooter.idle` |
| `plant.peashooter.idle/0001.png, 0002.png, ...` | frame animation (12 fps, looping) |
| `plant.peashooter.idle/anim.json` | overrides `fps`, `loop`, `anchor`, `offset`, `scale`, `events`, `attachments` |
| `zombie.basic.walk.json` + its `.png` | Pixi/TexturePacker spritesheet |
| `audio.splat.ogg` | sound `audio.splat` |
| `audio.splat/1.ogg, 2.ogg` | random variants of `audio.splat` |
| `music.day.mp3` | music track `music.day` |

You can also edit `manifest.json` by hand; see CONTENT_FORMAT.md for the format.
