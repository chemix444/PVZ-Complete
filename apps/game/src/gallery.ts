import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  craterArt,
  graveArt,
  lawnArt,
  peaArt,
  plantArt,
  plantArtIds,
  snowPeaArt,
  sporeArt,
  zombieArtFor,
  zombieArtIds,
  type LawnGeometry,
  type PlantArt,
  type ZombieArt,
} from '@pvz/assets';

// Dev-only page that lays out every placeholder drawing for visual review.

const MUSHROOMS = ['puff-shroom', 'sun-shroom', 'fume-shroom', 'grave-buster', 'hypno-shroom', 'scaredy-shroom', 'ice-shroom', 'doom-shroom'];
const BOARD: LawnGeometry = {
  origin: { x: 40, y: 80 },
  tile: { width: 80, height: 100 },
  rows: 5,
  cols: 9,
  view: { minX: -220, maxX: 1180, height: 600 },
};
const CELL_STEP = 84;
const ZOMBIE_STEP = 118;

function label(text: string, x: number, y: number): Text {
  const t = new Text({ text, style: { fontFamily: 'Trebuchet MS', fontSize: 10, fill: 0xffffff } });
  t.anchor.set(0.5, 0);
  t.position.set(x, y);
  return t;
}

function cellFrame(baseline: number): Graphics {
  return new Graphics()
    .rect(0, 0, 80, 100)
    .fill({ color: 0x000000, alpha: 0.12 })
    .moveTo(0, baseline)
    .lineTo(80, baseline)
    .stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
}

class Grid {
  private index = 0;

  constructor(
    private readonly stage: Container,
    private readonly x: number,
    private readonly y: number,
    private readonly perRow: number,
    private readonly rowHeight: number,
  ) {}

  cell(art: Container, name: string, baseline = 92): void {
    const x = this.x + (this.index % this.perRow) * CELL_STEP;
    const y = this.y + Math.floor(this.index / this.perRow) * this.rowHeight;
    this.index++;
    const cell = new Container();
    cell.position.set(x, y);
    cell.addChild(cellFrame(baseline), art);
    this.stage.addChild(cell, label(name, x + 40, y + 101));
  }
}

function plantPose(id: string, pose: (art: PlantArt) => void): Container {
  const art = plantArt(id);
  pose(art);
  return art.root;
}

function sleeping(art: PlantArt): void {
  art.parts!.eyes.visible = false;
  art.parts!.sleepEyes.visible = true;
}

function addPlants(stage: Container): void {
  const grid = new Grid(stage, 8, 6, 14, 116);
  for (const id of plantArtIds) grid.cell(plantArt(id).root, id);
  grid.cell(
    plantPose('potato-mine', (art) => {
      art.parts!.armed.visible = false;
      art.parts!.unarmed.visible = true;
    }),
    'potato unarmed',
  );
  for (const id of MUSHROOMS) grid.cell(plantPose(id, sleeping), `${id} zzz`);
  grid.cell(plantPose('chomper', (art) => (art.parts!.jaw.rotation = 0.55)), 'chomper open');
  grid.cell(plantPose('cherry-bomb', (art) => art.head.scale.set(1.25)), 'cherry swell');
  grid.cell(plantPose('sun-shroom', (art) => art.head.scale.set(0.6)), 'sun-shroom 0.6');
  grid.cell(plantPose('scaredy-shroom', (art) => art.head.scale.set(1, 0.45)), 'scaredy hide');
  grid.cell(
    plantPose('sun-shroom', (art) => (art.glow!.visible = true)),
    'sun-shroom glow',
  );
}

function zombieCell(stage: Container, art: ZombieArt, name: string, x: number, y: number): void {
  const frame = new Graphics()
    .rect(36, -50, 42, 148)
    .fill({ color: 0x000000, alpha: 0.12 })
    .moveTo(-30, 98)
    .lineTo(84, 98)
    .stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
  const cell = new Container();
  cell.position.set(x, y);
  cell.addChild(frame, art.root);
  stage.addChild(cell, label(name, x + 57, y + 102));
}

function addZombies(stage: Container): void {
  const entries: { art: ZombieArt; name: string }[] = zombieArtIds.map((id) => ({ art: zombieArtFor(id), name: id }));
  for (const id of zombieArtIds) {
    for (const stageIndex of [1, 2]) {
      const art = zombieArtFor(id);
      const ids = Object.keys(art.armor);
      if (ids.length === 0) break;
      for (const key of ids) art.armor[key].forEach((c, i) => (c.visible = i === stageIndex));
      entries.push({ art, name: `${id} ${stageIndex}` });
    }
  }
  entries.forEach(({ art, name }, i) => {
    const x = 40 + (i % 10) * ZOMBIE_STEP;
    const y = 412 + Math.floor(i / 10) * 168;
    zombieCell(stage, art, name, x, y);
  });
}

function addItems(stage: Container): void {
  const y = 730;
  const projectiles: [Container, string][] = [
    [peaArt(), 'pea'],
    [snowPeaArt(), 'snow pea'],
    [sporeArt(), 'spore'],
  ];
  projectiles.forEach(([art, name], i) => {
    const x = 28 + i * 44;
    art.position.set(x, y + 50);
    stage.addChild(art, label(name, x, y + 70));
  });
  const grid = new Grid(stage, 150, y, 4, 116);
  for (let variant = 0; variant < 3; variant++) grid.cell(graveArt(variant), `grave ${variant}`, 90);
  grid.cell(craterArt(), 'crater', 90);
}

function addLawns(stage: Container): void {
  const scale = 0.24;
  (['day', 'night'] as const).forEach((time, i) => {
    const art = lawnArt(BOARD, time);
    const x = 500 + i * 350;
    art.scale.set(scale);
    art.position.set(x - BOARD.view.minX * scale, 728);
    const mask = new Graphics().rect(x, 728, (BOARD.view.maxX - BOARD.view.minX) * scale, BOARD.view.height * scale).fill(0xffffff);
    art.mask = mask;
    stage.addChild(art, mask, label(`lawn ${time}`, x + 168, 875));
  });
}

async function main(): Promise<void> {
  const app = new Application();
  await app.init({
    width: 1200,
    height: 900,
    background: 0x5a9a3a,
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
  });
  document.getElementById('app')!.append(app.canvas);
  addPlants(app.stage);
  addZombies(app.stage);
  addItems(app.stage);
  addLawns(app.stage);
}

void main();
