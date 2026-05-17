import * as THREE from 'three';
import type { SkinConfig, SkinId } from '@/types';

interface AgentVisualParts {
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  wetDrops: THREE.Mesh[];
}

export interface AgentVisualState {
  elapsedSec: number;
  moveSpeed: number;
  onGround: boolean;
  aimPitch: number;
  hpRatio: number;
}

interface SkinPalette {
  face: number;
  hair: number;
  shirt: number;
  shorts: number;
  shoes: number;
}

const GEOMETRIES = {
  torso: new THREE.CapsuleGeometry(0.28, 0.46, 4, 12),
  head: new THREE.SphereGeometry(0.28, 18, 14),
  neck: new THREE.CylinderGeometry(0.09, 0.1, 0.16, 12),
  limb: new THREE.CylinderGeometry(0.075, 0.09, 0.62, 10),
  hand: new THREE.SphereGeometry(0.09, 10, 8),
  shoe: new THREE.BoxGeometry(0.18, 0.1, 0.28),
  eye: new THREE.SphereGeometry(0.035, 8, 6),
  brow: new THREE.BoxGeometry(0.1, 0.018, 0.018),
  mouth: new THREE.BoxGeometry(0.16, 0.025, 0.018),
  ear: new THREE.SphereGeometry(0.09, 10, 8),
  bunnyEar: new THREE.CapsuleGeometry(0.045, 0.28, 3, 8),
  catEar: new THREE.ConeGeometry(0.09, 0.18, 3),
  fin: new THREE.ConeGeometry(0.09, 0.24, 4),
  backpack: new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12),
  strap: new THREE.BoxGeometry(0.055, 0.56, 0.035),
  tankCap: new THREE.SphereGeometry(0.13, 12, 8),
  waterGunBody: new THREE.BoxGeometry(0.16, 0.12, 0.2),
  waterGunTank: new THREE.SphereGeometry(0.09, 10, 8),
  waterGunBarrel: new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8),
  waterDrop: new THREE.SphereGeometry(0.04, 8, 6),
};

const materialCache = new Map<string, THREE.Material>();

export class AgentVisual {
  readonly root: THREE.Group;
  private parts: AgentVisualParts;

  constructor(skin: SkinConfig) {
    this.root = new THREE.Group();
    this.root.name = `agent-visual-${skin.id}`;
    this.root.userData.kind = 'agent-visual';
    this.parts = buildParts(this.root, skin);
  }

  update(state: AgentVisualState): void {
    const speedRatio = THREE.MathUtils.clamp(state.moveSpeed / 7.5, 0, 1.4);
    const moving = state.onGround && speedRatio > 0.05;
    const walkPhase = state.elapsedSec * (5.5 + speedRatio * 4);
    const swing = moving ? Math.sin(walkPhase) * speedRatio : 0;
    const bob = moving ? Math.abs(Math.sin(walkPhase)) * 0.035 * speedRatio : Math.sin(state.elapsedSec * 2.2) * 0.01;

    this.parts.body.position.y = bob;
    this.parts.body.rotation.z = moving ? Math.sin(walkPhase) * 0.035 : Math.sin(state.elapsedSec * 1.4) * 0.015;

    this.parts.leftLeg.rotation.x = swing * 0.48;
    this.parts.rightLeg.rotation.x = -swing * 0.48;

    const aimRaise = 0.72 - THREE.MathUtils.clamp(state.aimPitch, -0.55, 0.55) * 0.35;
    this.parts.leftArm.rotation.x = aimRaise + swing * 0.16;
    this.parts.rightArm.rotation.x = aimRaise - swing * 0.12;
    this.parts.leftArm.rotation.z = 0.18;
    this.parts.rightArm.rotation.z = -0.18;

    this.parts.head.rotation.x = THREE.MathUtils.clamp(-state.aimPitch * 0.25, -0.18, 0.18);
    this.parts.head.rotation.y = moving ? Math.sin(walkPhase * 0.5) * 0.04 : Math.sin(state.elapsedSec * 1.1) * 0.025;

    const wetOpacity = THREE.MathUtils.clamp((1 - state.hpRatio) * 1.4, 0, 0.75);
    for (const drop of this.parts.wetDrops) {
      drop.visible = wetOpacity > 0.05;
      const mat = drop.material;
      if (mat instanceof THREE.MeshBasicMaterial) mat.opacity = wetOpacity;
    }
  }
}

export function buildAgentMesh(skin: SkinConfig): THREE.Group {
  return new AgentVisual(skin).root;
}

function buildParts(root: THREE.Group, skin: SkinConfig): AgentVisualParts {
  const palette = paletteFor(skin);
  const body = new THREE.Group();
  root.add(body);

  const torso = mesh(GEOMETRIES.torso, lambert(palette.shirt));
  torso.position.y = 0.92;
  torso.scale.set(1.05, 1, 0.82);
  body.add(torso);

  const shorts = mesh(new THREE.BoxGeometry(0.52, 0.22, 0.36), lambert(palette.shorts));
  shorts.position.y = 0.48;
  body.add(shorts);

  const neck = mesh(GEOMETRIES.neck, lambert(palette.face));
  neck.position.y = 1.38;
  body.add(neck);

  const head = new THREE.Group();
  head.position.y = 1.58;
  body.add(head);

  const face = mesh(GEOMETRIES.head, lambert(palette.face));
  face.scale.set(1, 1.05, 0.95);
  head.add(face);

  addFace(head);
  addHairAndAccessory(head, skin, palette);
  addWaterPack(body, skin);

  const leftArm = makeArm(-1, palette);
  const rightArm = makeArm(1, palette);
  leftArm.position.set(-0.36, 1.16, -0.01);
  rightArm.position.set(0.36, 1.16, -0.01);
  body.add(leftArm, rightArm);
  addWaterGun(rightArm, skin);

  const leftLeg = makeLeg(-1, palette);
  const rightLeg = makeLeg(1, palette);
  leftLeg.position.set(-0.16, 0.48, 0);
  rightLeg.position.set(0.16, 0.48, 0);
  body.add(leftLeg, rightLeg);

  const wetDrops = addWetDrops(torso);

  return { body, head, leftArm, rightArm, leftLeg, rightLeg, wetDrops };
}

function makeArm(side: -1 | 1, palette: SkinPalette): THREE.Group {
  const arm = new THREE.Group();
  arm.rotation.z = side * -0.18;

  const sleeve = mesh(GEOMETRIES.limb, lambert(palette.shirt));
  sleeve.position.y = -0.28;
  arm.add(sleeve);

  const hand = mesh(GEOMETRIES.hand, lambert(palette.face));
  hand.position.y = -0.63;
  arm.add(hand);

  return arm;
}

function makeLeg(side: -1 | 1, palette: SkinPalette): THREE.Group {
  const leg = new THREE.Group();

  const limb = mesh(GEOMETRIES.limb, lambert(palette.shorts));
  limb.position.y = -0.28;
  leg.add(limb);

  const shoe = mesh(GEOMETRIES.shoe, lambert(palette.shoes));
  shoe.position.set(side * 0.015, -0.62, -0.07);
  leg.add(shoe);

  return leg;
}

function addFace(head: THREE.Group): void {
  const eyeMat = basic(0x111827);
  const browMat = basic(0x4a2c21);
  const mouthMat = basic(0x7a2f3a);

  const eyeL = mesh(GEOMETRIES.eye, eyeMat);
  eyeL.position.set(-0.095, 0.04, -0.255);
  const eyeR = mesh(GEOMETRIES.eye, eyeMat);
  eyeR.position.set(0.095, 0.04, -0.255);

  const browL = mesh(GEOMETRIES.brow, browMat);
  browL.position.set(-0.095, 0.12, -0.245);
  browL.rotation.z = 0.15;
  const browR = mesh(GEOMETRIES.brow, browMat);
  browR.position.set(0.095, 0.12, -0.245);
  browR.rotation.z = -0.15;

  const mouth = mesh(GEOMETRIES.mouth, mouthMat);
  mouth.position.set(0, -0.1, -0.26);

  head.add(eyeL, eyeR, browL, browR, mouth);
}

function addHairAndAccessory(head: THREE.Group, skin: SkinConfig, palette: SkinPalette): void {
  const hair = mesh(new THREE.SphereGeometry(0.286, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), lambert(palette.hair));
  hair.position.y = 0.045;
  hair.rotation.x = -0.1;
  head.add(hair);

  switch (skin.id) {
    case 'kuma':
      addRoundEars(head, skin.color, 0.18);
      break;
    case 'usagi':
      addBunnyEars(head, skin.color);
      break;
    case 'neko':
      addCatEars(head, skin.color);
      break;
    case 'robo':
      addRoboVisor(head, skin.accent);
      break;
    case 'sakana':
      addFishFin(head, skin.accent);
      break;
  }
}

function addRoundEars(head: THREE.Group, color: number, y: number): void {
  const mat = lambert(color);
  for (const side of [-1, 1] as const) {
    const ear = mesh(GEOMETRIES.ear, mat);
    ear.position.set(side * 0.2, y, 0.02);
    head.add(ear);
  }
}

function addBunnyEars(head: THREE.Group, color: number): void {
  const mat = lambert(color);
  for (const side of [-1, 1] as const) {
    const ear = mesh(GEOMETRIES.bunnyEar, mat);
    ear.position.set(side * 0.13, 0.36, 0.02);
    ear.rotation.z = side * -0.18;
    head.add(ear);
  }
}

function addCatEars(head: THREE.Group, color: number): void {
  const mat = lambert(color);
  for (const side of [-1, 1] as const) {
    const ear = mesh(GEOMETRIES.catEar, mat);
    ear.position.set(side * 0.17, 0.26, 0.02);
    ear.rotation.z = side * -0.28;
    head.add(ear);
  }
}

function addRoboVisor(head: THREE.Group, accent: number): void {
  const visor = mesh(new THREE.BoxGeometry(0.36, 0.09, 0.035), basic(accent));
  visor.position.set(0, 0.02, -0.27);
  head.add(visor);
}

function addFishFin(head: THREE.Group, accent: number): void {
  const fin = mesh(GEOMETRIES.fin, lambert(accent));
  fin.position.set(0, 0.28, 0.02);
  fin.rotation.x = Math.PI * 0.5;
  head.add(fin);
}

function addWaterPack(body: THREE.Group, skin: SkinConfig): void {
  const pack = mesh(GEOMETRIES.backpack, lambert(0x6ec6ff));
  pack.position.set(0, 0.94, 0.31);
  pack.rotation.x = Math.PI * 0.5;
  body.add(pack);

  const cap = mesh(GEOMETRIES.tankCap, basic(0xc9efff, 0.7));
  cap.position.set(0, 0.94, 0.31);
  cap.scale.set(0.75, 0.75, 1.2);
  body.add(cap);

  const strapMat = lambert(skin.accent);
  for (const side of [-1, 1] as const) {
    const strap = mesh(GEOMETRIES.strap, strapMat);
    strap.position.set(side * 0.16, 0.94, 0.12);
    body.add(strap);
  }
}

function addWaterGun(rightArm: THREE.Group, skin: SkinConfig): void {
  const gun = new THREE.Group();
  gun.position.set(0.02, -0.62, -0.15);
  gun.rotation.x = Math.PI * 0.5;
  rightArm.add(gun);

  const body = mesh(GEOMETRIES.waterGunBody, lambert(skin.accent));
  const tank = mesh(GEOMETRIES.waterGunTank, basic(0x9fe8ff, 0.78));
  tank.position.set(0, 0.08, 0);

  const barrel = mesh(GEOMETRIES.waterGunBarrel, basic(0x4fc3f7));
  barrel.position.y = -0.24;

  gun.add(body, tank, barrel);
}

function addWetDrops(torso: THREE.Mesh): THREE.Mesh[] {
  const drops: THREE.Mesh[] = [];
  const mat = new THREE.MeshBasicMaterial({ color: 0x42c5ff, transparent: true, opacity: 0 });
  const positions: Array<[number, number, number, number]> = [
    [-0.14, 0.16, -0.235, 1.1],
    [0.08, -0.02, -0.245, 0.85],
    [0.17, 0.27, -0.22, 0.7],
  ];

  for (const [x, y, z, scale] of positions) {
    const drop = mesh(GEOMETRIES.waterDrop, mat);
    drop.position.set(x, y, z);
    drop.scale.set(0.8 * scale, 1.25 * scale, 0.45 * scale);
    drop.userData.kind = 'wet-drop';
    drop.visible = false;
    torso.add(drop);
    drops.push(drop);
  }

  return drops;
}

function paletteFor(skin: SkinConfig): SkinPalette {
  const palettes: Record<SkinId, SkinPalette> = {
    kuma: { face: 0xffd8b5, hair: 0x5b3a24, shirt: skin.color, shorts: 0x345995, shoes: 0x4a2c21 },
    usagi: { face: 0xffdfc8, hair: 0x6d4c41, shirt: skin.color, shorts: 0xffffff, shoes: 0xd17da3 },
    neko: { face: 0xf3c6a7, hair: 0x222222, shirt: skin.color, shorts: 0x6c63ff, shoes: 0x111111 },
    robo: { face: 0xd9f5ff, hair: 0x90a4ae, shirt: skin.color, shorts: 0x1976d2, shoes: 0x455a64 },
    sakana: { face: 0xffd4b8, hair: 0x1e88e5, shirt: skin.color, shorts: 0xff8a65, shoes: 0x006064 },
  };
  return palettes[skin.id];
}

function mesh<T extends THREE.BufferGeometry>(geometry: T, material: THREE.Material): THREE.Mesh<T, THREE.Material> {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

function lambert(color: number): THREE.MeshLambertMaterial {
  const key = `lambert:${color.toString(16)}`;
  const cached = materialCache.get(key);
  if (cached instanceof THREE.MeshLambertMaterial) return cached;
  const mat = new THREE.MeshLambertMaterial({ color });
  materialCache.set(key, mat);
  return mat;
}

function basic(color: number, opacity = 1): THREE.MeshBasicMaterial {
  const key = `basic:${color.toString(16)}:${opacity}`;
  const cached = materialCache.get(key);
  if (cached instanceof THREE.MeshBasicMaterial) return cached;
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  materialCache.set(key, mat);
  return mat;
}
