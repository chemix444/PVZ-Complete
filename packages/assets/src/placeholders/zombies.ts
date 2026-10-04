import { Container, Graphics } from 'pixi.js';

// Zombies are drawn relative to their simulation anchor: x = 0 is the
// anchor (the hitbox starts 36 px to the right) and y = 0 is the row's top.
// Feet rest near y = 98.

const SKIN = 0xa3b58c;
const SKIN_LINE = { width: 2, color: 0x55613f };
const COAT = 0x6b4a2e;
const COAT_DARK = 0x4a321d;
const PANTS = 0x46506e;
const SHOE = 0x2a2016;

export interface ZombieArt {
  readonly root: Container;
  readonly body: Container;
  readonly head: Container;
  readonly armFront: Container;
  readonly armBack: Container;
  readonly legFront: Container;
  readonly legBack: Container;
  /** Armor appearance stages per armor id: [intact, damaged, badly damaged]. */
  readonly armor: Readonly<Record<string, readonly Container[]>>;
  readonly armorRoot: Readonly<Record<string, Container>>;
}

function limb(pivotX: number, pivotY: number, draw: (g: Graphics) => void): Container {
  const c = new Container();
  c.pivot.set(pivotX, pivotY);
  c.position.set(pivotX, pivotY);
  const g = new Graphics();
  draw(g);
  c.addChild(g);
  return c;
}

export function zombieHeadArt(): Container {
  const g = new Graphics();
  g.circle(57, 6, 16).fill(SKIN).stroke(SKIN_LINE);
  g.ellipse(72, 8, 3, 5).fill(SKIN).stroke({ width: 1.5, color: 0x55613f });
  g.circle(49, 2, 5.5).fill(0xf4f1e1).stroke({ width: 1, color: 0x55613f });
  g.circle(61, 0, 6.5).fill(0xf4f1e1).stroke({ width: 1, color: 0x55613f });
  g.circle(48, 3, 2).fill(0x1a1a1a);
  g.circle(60, 1.5, 2.2).fill(0x1a1a1a);
  g.roundRect(46, 13, 14, 6, 2).fill(0x3a2a1a);
  g.rect(48, 13, 3, 3).fill(0xf0ead0);
  g.rect(54, 13, 3, 3).fill(0xf0ead0);
  g.moveTo(52, -10).quadraticCurveTo(50, -18, 44, -16).stroke({ width: 2, color: 0x3a3a2a });
  g.moveTo(58, -10).quadraticCurveTo(60, -19, 66, -17).stroke({ width: 2, color: 0x3a3a2a });
  const c = new Container();
  c.addChild(g);
  return c;
}

function coneStage(stage: number): Container {
  const g = new Graphics();
  const tip = stage === 2 ? -30 : -44;
  if (stage === 2) {
    g.poly([42, -6, 72, -6, 63, -30, 51, -30]).fill(0xf08c1e).stroke({ width: 2, color: 0x9c4d08 });
  } else {
    g.poly([42, -6, 72, -6, 57, tip]).fill(0xf08c1e).stroke({ width: 2, color: 0x9c4d08 });
  }
  g.poly([47, -17, 67, -17, 64, -25, 50, -25]).fill({ color: 0xfff1d6, alpha: 0.85 });
  g.ellipse(57, -6, 17, 4).fill(0xd06f10).stroke({ width: 1.5, color: 0x9c4d08 });
  if (stage >= 1) {
    g.poly([60, -14, 66, -12, 62, -8]).fill(0x8a420a);
    g.poly([48, -24, 52, -21, 47, -19]).fill(0x8a420a);
  }
  if (stage === 2) g.poly([53, -30, 58, -26, 61, -30]).fill(0x8a420a);
  const c = new Container();
  c.addChild(g);
  return c;
}

function flagArt(): Container {
  const g = new Graphics();
  g.moveTo(22, 46).lineTo(22, -46).stroke({ width: 3, color: 0x6b4a2e });
  g.poly([22, -46, 58, -42, 56, -14, 22, -18]).fill(0x8f1d14).stroke({ width: 2, color: 0x5a110b });
  g.ellipse(39, -30, 9, 7).fill(0xe89aa8).stroke({ width: 1.5, color: 0xa85a68 });
  g.moveTo(39, -36).lineTo(39, -24).stroke({ width: 1, color: 0xa85a68 });
  const c = new Container();
  c.addChild(g);
  return c;
}

export interface ZombieArtOptions {
  readonly armor?: readonly string[];
  readonly flag?: boolean;
}

export function zombieArt(options: ZombieArtOptions = {}): ZombieArt {
  const root = new Container();
  const body = new Container();
  body.pivot.set(57, 96);
  body.position.set(57, 96);

  const legBack = limb(62, 60, (g) => {
    g.rect(57, 58, 10, 36).fill(PANTS).stroke({ width: 1.5, color: 0x2c3247 });
    g.ellipse(60, 96, 10, 4).fill(SHOE);
  });
  const legFront = limb(52, 60, (g) => {
    g.rect(47, 58, 10, 36).fill(PANTS).stroke({ width: 1.5, color: 0x2c3247 });
    g.ellipse(47, 96, 11, 4).fill(SHOE);
  });
  const armBack = limb(66, 28, (g) => {
    g.poly([66, 23, 70, 31, 44, 38, 42, 31]).fill(COAT_DARK);
    g.circle(40, 35, 5).fill(SKIN).stroke({ width: 1.5, color: 0x55613f });
  });
  const torso = new Graphics();
  torso.poly([44, 20, 72, 20, 76, 64, 40, 64]).fill(COAT).stroke({ width: 2, color: COAT_DARK });
  torso.poly([53, 20, 63, 20, 61, 46, 55, 46]).fill(0xe6e0cc);
  torso.poly([57, 22, 60, 22, 61, 40, 58.5, 45, 56, 40]).fill(0xb3261e);
  torso.moveTo(66, 44).lineTo(72, 44).stroke({ width: 1.5, color: COAT_DARK });

  const head = new Container();
  head.pivot.set(58, 22);
  head.position.set(58, 22);
  head.addChild(zombieHeadArt());

  const armor: Record<string, Container[]> = {};
  const armorRoot: Record<string, Container> = {};
  for (const id of options.armor ?? []) {
    if (id !== 'cone') continue;
    const stages = [coneStage(0), coneStage(1), coneStage(2)];
    const holder = new Container();
    for (const stage of stages) holder.addChild(stage);
    stages[1].visible = stages[2].visible = false;
    head.addChild(holder);
    armor[id] = stages;
    armorRoot[id] = holder;
  }

  const armFront = limb(50, 28, (g) => {
    g.poly([50, 23, 54, 31, 26, 38, 24, 31]).fill(COAT).stroke({ width: 1.5, color: COAT_DARK });
    g.circle(22, 35, 5.5).fill(SKIN).stroke({ width: 1.5, color: 0x55613f });
  });
  if (options.flag) armFront.addChildAt(flagArt(), 0);

  body.addChild(armBack, legBack, legFront, torso, head, armFront);
  const shadow = new Graphics().ellipse(57, 97, 24, 5).fill({ color: 0x000000, alpha: 0.22 });
  root.addChild(shadow, body);
  return { root, body, head, armFront, armBack, legFront, legBack, armor, armorRoot };
}
