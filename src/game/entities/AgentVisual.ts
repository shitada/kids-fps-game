import * as THREE from 'three';
import type { SkinConfig, WeaponId } from '@/types';
import {
  ellipsoid, flatMaterial, roundedBox, sharedGeometry, toyBox, toyMaterial,
} from '@/game/systems/VisualResources';
import { createToolVisual, setToolFiring } from '@/game/entities/ToolVisual';

const CREAM = 0xfff4de;
const INK = 0x253c50;
const CORAL = 0xf29c98;
const WATER = 0x77d7e3;
const FIRE_VISUAL_DURATION_SEC = 0.3;
const HIT_VISUAL_DURATION_SEC = 0.32;

interface SpringPart {
  pivot: THREE.Group;
  restZ: number;
  phase: number;
  amount: number;
}

interface WetDrop {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
}

interface AgentVisualParts {
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  toolMount: THREE.Group;
  tool: THREE.Group;
  eyes: THREE.Group[];
  springs: SpringPart[];
  wetDrops: WetDrop[];
  wetMaterial: THREE.MeshBasicMaterial;
}

export interface AgentVisualState {
  elapsedSec: number;
  moveSpeed: number;
  onGround: boolean;
  aimPitch: number;
  hpRatio: number;
}

/** Rounded, approximately 2.5-head toys. Feet are at y=0; faces look down -Z. */
export class AgentVisual {
  readonly root: THREE.Group;
  private readonly parts: AgentVisualParts;
  private readonly skin: SkinConfig;
  private readonly tools = new Map<WeaponId, THREE.Group>();
  private weapon: WeaponId = 'water-gun';
  private firePulseUntilSec = 0;
  private hitPulseUntilSec = 0;

  constructor(skin: SkinConfig) {
    this.skin = skin;
    this.root = new THREE.Group();
    this.root.name = `agent-visual-${skin.id}`;
    this.root.userData.kind = 'agent-visual';
    this.root.userData.skin = skin.id;
    this.parts = buildParts(this.root, skin);
    this.tools.set('water-gun', this.parts.tool);
  }

  /** Called before update by Agent. Only a weapon change builds/swaps a toy. */
  setWeapon(weapon: WeaponId): void {
    if (this.weapon === weapon) return;
    setToolFiring(this.parts.tool, 0);
    this.parts.toolMount.remove(this.parts.tool);
    let tool = this.tools.get(weapon);
    if (!tool) {
      tool = createToolVisual(weapon, this.skin);
      this.tools.set(weapon, tool);
    }
    this.parts.tool = tool;
    this.parts.toolMount.add(tool);
    this.weapon = weapon;
  }

  update(state: AgentVisualState): void {
    const speed = THREE.MathUtils.clamp(state.moveSpeed / 7.5, 0, 1.4);
    const moving = state.onGround && speed > 0.05;
    const phase = state.elapsedSec * (6 + speed * 4);
    const swing = moving ? Math.sin(phase) * speed : 0;
    const breath = Math.sin(state.elapsedSec * 2.2);
    const bob = moving ? Math.abs(Math.sin(phase)) * 0.035 * speed : (breath + 1) * 0.006;
    const firePulse = THREE.MathUtils.clamp((this.firePulseUntilSec - state.elapsedSec) / FIRE_VISUAL_DURATION_SEC, 0, 1);
    const fireKick = firePulse * (2 - firePulse);
    const hitPulse = THREE.MathUtils.clamp((this.hitPulseUntilSec - state.elapsedSec) / HIT_VISUAL_DURATION_SEC, 0, 1);
    const hitKick = hitPulse * (2 - hitPulse);
    const airborne = state.onGround ? 0 : 1;
    const squash = hitKick * 0.065;

    this.parts.body.position.y = bob + hitKick * 0.035;
    this.parts.body.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
    this.parts.body.rotation.x = -fireKick * 0.035 + hitKick * 0.045;
    this.parts.body.rotation.z = swing * 0.025 + breath * 0.009;
    this.parts.leftLeg.rotation.x = swing * 0.5 - airborne * 0.18;
    this.parts.rightLeg.rotation.x = -swing * 0.5 + airborne * 0.18;
    // Lift only the travelling foot, keeping the short, rounded soles above y=0.
    this.parts.leftLeg.position.y = 0.34 + Math.max(0, swing) * 0.035;
    this.parts.rightLeg.position.y = 0.34 + Math.max(0, -swing) * 0.035;

    this.parts.leftArm.rotation.x = 0.25 + swing * 0.3 - airborne * 0.3 + hitKick * 0.2;
    this.parts.leftArm.rotation.z = 0.15 + airborne * 0.3 + hitKick * 0.1;
    this.parts.rightArm.rotation.x = 0.95 - state.aimPitch * 0.2 - fireKick * 0.16;
    this.parts.rightArm.rotation.z = -0.08 - hitKick * 0.1;
    // Cancel the holding pose so every tool's outlet really points forward.
    this.parts.toolMount.rotation.x = -this.parts.rightArm.rotation.x + THREE.MathUtils.clamp(state.aimPitch, -0.7, 0.7);
    this.parts.tool.position.z = fireKick * 0.035;
    this.parts.tool.scale.setScalar(1 + fireKick * 0.06);
    setToolFiring(this.parts.tool, fireKick);

    this.parts.head.rotation.x = THREE.MathUtils.clamp(-state.aimPitch * 0.22 - hitKick * 0.07, -0.2, 0.2);
    this.parts.head.rotation.y = Math.sin(state.elapsedSec * 1.15) * 0.025 + hitKick * 0.07;
    this.parts.head.rotation.z = -swing * 0.022;
    // A brief blink every few seconds; no timers, textures or material mutation.
    const blinkPhase = state.elapsedSec % 4.6;
    const blink = blinkPhase > 4.42 ? 0.16 + Math.abs(blinkPhase - 4.51) / 0.09 * 0.84 : 1;
    for (const eye of this.parts.eyes) eye.scale.y = blink;
    for (const spring of this.parts.springs) {
      spring.pivot.rotation.z = spring.restZ
        + Math.sin(state.elapsedSec * 3 + spring.phase) * spring.amount * 0.35
        + swing * spring.amount + hitKick * spring.amount * 1.8;
      spring.pivot.rotation.x = Math.sin(phase - 0.7 + spring.phase) * (moving ? 0.06 : 0.018) + fireKick * 0.06;
    }

    const wet = THREE.MathUtils.clamp((1 - state.hpRatio) * 1.4 + hitKick * 0.45, 0, 0.9);
    // This material belongs to this one mascot, never the global material cache.
    this.parts.wetMaterial.opacity = wet;
    for (const drop of this.parts.wetDrops) {
      drop.mesh.visible = wet > 0.05;
      const swell = 1 + hitKick * 0.35;
      drop.mesh.scale.set(drop.x * swell, drop.y * swell, drop.z * swell);
    }
  }

  playFire(nowSec: number): void {
    this.firePulseUntilSec = nowSec + FIRE_VISUAL_DURATION_SEC;
  }

  playHit(nowSec: number): void {
    this.hitPulseUntilSec = nowSec + HIT_VISUAL_DURATION_SEC;
  }
}

export function buildAgentMesh(skin: SkinConfig): THREE.Group {
  return new AgentVisual(skin).root;
}

/**
 * Compatibility for callers predating ToolVisual. The old flash name is an
 * alias wrapper; new code should use createToolVisual / `tool-nozzle`.
 */
export function createFirstPersonWaterGun(skin: SkinConfig): THREE.Group {
  const gun = createToolVisual('water-gun', skin);
  gun.name = 'first-person-water-gun';
  gun.visible = false;
  const nozzle = gun.getObjectByName('tool-nozzle');
  if (nozzle) {
    const alias = new THREE.Group();
    alias.name = 'first-person-water-gun-nozzle';
    alias.position.copy(nozzle.position);
    alias.visible = false;
    gun.add(alias);
    alias.add(nozzle);
    nozzle.position.set(0, 0, 0);
    nozzle.visible = true;
  }
  return gun;
}

function buildParts(root: THREE.Group, skin: SkinConfig): AgentVisualParts {
  const body = group('mascot-body', root);
  const robot = skin.id === 'robo';
  const rabbit = skin.id === 'usagi';
  const fish = skin.id === 'sakana';
  const torso = robot
    ? toyBox(0.65, 0.76, 0.51, skin.color, 0.18)
    : ellipsoid(rabbit ? 0.62 : 0.76, 0.88, fish ? 0.56 : 0.59, skin.color);
  torso.name = 'mascot-torso';
  torso.position.y = 0.77;
  body.add(torso);
  const belly = robot
    ? toyBox(0.4, 0.37, 0.07, CREAM, 0.1)
    : ellipsoid(rabbit ? 0.38 : 0.49, 0.5, 0.075, skin.accent);
  belly.name = robot ? 'robot-belly-panel' : 'mascot-belly';
  belly.position.set(0, 0.71, -0.272);
  body.add(belly);
  if (robot) addRobotButtons(body);

  const head = group('mascot-head', body);
  head.position.y = 1.35;
  const shell = robot
    ? toyBox(0.82, 0.66, 0.64, skin.color, 0.2)
    : ellipsoid(fish ? 0.94 : rabbit ? 0.8 : 0.88, 0.7, fish ? 0.7 : 0.66, skin.color);
  shell.name = `${skin.id}-head-shell`;
  head.add(shell);
  const eyes = addFace(head, skin);
  const springs: SpringPart[] = [];
  addSpeciesSilhouette(body, head, skin, springs);
  addWaterPack(body, skin);

  const leftArm = makeArm(body, -1, skin);
  const rightArm = makeArm(body, 1, skin);
  const leftLeg = makeLeg(body, -1, skin);
  const rightLeg = makeLeg(body, 1, skin);
  const toolMount = group('mascot-tool-mount', rightArm);
  toolMount.position.set(0, -0.29, -0.035);
  toolMount.rotation.x = -0.95;
  toolMount.scale.setScalar(0.78);
  const tool = createToolVisual('water-gun', skin);
  toolMount.add(tool);

  const wetMaterial = new THREE.MeshBasicMaterial({
    color: 0x3fbded, transparent: true, opacity: 0, depthWrite: false,
  });
  const wetDrops = addWetDrops(body, head, wetMaterial, robot ? -0.395 : fish ? -0.239 : -0.218);
  return {
    body, head, leftArm, rightArm, leftLeg, rightLeg, toolMount, tool, eyes, springs, wetDrops, wetMaterial,
  };
}

function makeArm(body: THREE.Group, side: -1 | 1, skin: SkinConfig): THREE.Group {
  const arm = group(side === -1 ? 'mascot-arm-left' : 'mascot-arm-right', body);
  arm.position.set(side * (skin.id === 'usagi' ? 0.33 : 0.39), 1.02, -0.015);
  arm.rotation.set(side === 1 ? 0.95 : 0.25, 0, side === 1 ? -0.08 : 0.15);
  const limb = ellipsoid(0.19, 0.3, 0.21, skin.color);
  limb.position.y = -0.13;
  arm.add(limb);
  const hand = ellipsoid(0.22, 0.19, 0.23, skin.id === 'robo' ? skin.accent : skin.color);
  hand.name = 'mascot-mitten';
  hand.position.set(0, -0.285, -0.025);
  arm.add(hand);
  if (skin.id === 'robo') {
    const joint = ellipsoid(0.21, 0.21, 0.22, CREAM);
    arm.add(joint);
  }
  return arm;
}

function makeLeg(body: THREE.Group, side: -1 | 1, skin: SkinConfig): THREE.Group {
  const leg = group(side === -1 ? 'mascot-leg-left' : 'mascot-leg-right', body);
  leg.position.set(side * 0.19, 0.34, 0);
  const limb = ellipsoid(0.22, 0.32, 0.24, skin.color);
  limb.position.y = -0.09;
  leg.add(limb);
  const foot = skin.id === 'robo'
    ? toyBox(0.29, 0.18, 0.37, skin.accent, 0.07)
    : ellipsoid(skin.id === 'usagi' ? 0.24 : 0.29, 0.2, skin.id === 'usagi' ? 0.4 : 0.37, skin.color);
  foot.name = 'mascot-foot';
  foot.position.set(0, skin.id === 'robo' ? -0.25 : -0.24, -0.075);
  leg.add(foot);
  return leg;
}

function addFace(head: THREE.Group, skin: SkinConfig): THREE.Group[] {
  const robot = skin.id === 'robo';
  const fish = skin.id === 'sakana';
  if (robot) {
    const surround = toyBox(0.72, 0.45, 0.08, CREAM, 0.13);
    surround.name = 'robot-face-surround';
    surround.position.set(0, 0.005, -0.301);
    head.add(surround);
    const panel = new THREE.Mesh(roundedBox(0.64, 0.37, 0.07, 0.11), flatMaterial(INK));
    panel.name = 'robot-face-panel';
    panel.position.set(0, 0.005, -0.34);
    head.add(panel);
  } else {
    const muzzle = ellipsoid(fish ? 0.3 : skin.id === 'kuma' ? 0.43 : 0.37, fish ? 0.18 : 0.235, 0.15, CREAM);
    muzzle.name = 'mascot-muzzle';
    muzzle.position.set(0, -0.12, fish ? -0.337 : -0.31);
    head.add(muzzle);
    if (!fish) {
      const nose = ellipsoid(skin.id === 'usagi' ? 0.075 : 0.11, 0.067, 0.055, skin.id === 'usagi' ? 0xd37d94 : INK);
      nose.name = 'mascot-nose';
      nose.position.set(0, -0.065, -0.395);
      head.add(nose);
    }
  }
  const eyes: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const eye = group(side === -1 ? 'mascot-eye-left' : 'mascot-eye-right', head);
    eye.position.set(side * (fish ? 0.205 : 0.17), 0.055, robot ? -0.387 : -0.302);
    const pupil = ellipsoid(robot ? 0.085 : 0.078, robot ? 0.115 : 0.108, 0.042, INK);
    pupil.material = flatMaterial(robot ? 0x9df2e6 : INK);
    eye.add(pupil);
    const catchlight = ellipsoid(0.026, 0.032, 0.012, 0xffffff);
    catchlight.name = 'eye-catchlight';
    catchlight.material = flatMaterial(0xffffff);
    catchlight.position.set(-0.014, 0.027, -0.024);
    eye.add(catchlight);
    eyes.push(eye);
    const cheek = ellipsoid(0.105, 0.06, 0.032, robot ? 0x78bccc : CORAL);
    cheek.name = 'mascot-cheek';
    cheek.position.set(side * 0.275, -0.073, robot ? -0.378 : -0.275);
    head.add(cheek);
  }
  const smile = new THREE.Mesh(sharedGeometry('mascot-gentle-smile', () => {
    const path = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.07, 0.025, 0),
      new THREE.Vector3(0, -0.055, -0.008),
      new THREE.Vector3(0.07, 0.025, 0),
    );
    return new THREE.TubeGeometry(path, 12, 0.011, 5, false);
  }), flatMaterial(robot ? 0x9df2e6 : INK));
  smile.name = 'mascot-smile';
  smile.position.set(0, -0.15, robot ? -0.387 : fish ? -0.42 : -0.391);
  head.add(smile);
  return eyes;
}

function addSpeciesSilhouette(
  body: THREE.Group, head: THREE.Group, skin: SkinConfig, springs: SpringPart[],
): void {
  switch (skin.id) {
    case 'kuma':
      for (const side of [-1, 1]) {
        const ear = springGroup(head, `bear-ear-${side < 0 ? 'left' : 'right'}`, side * 0.32, 0.265, 0, side * -0.13, 0.06, springs);
        ear.add(ellipsoid(0.27, 0.28, 0.18, skin.color));
        const inset = ellipsoid(0.15, 0.16, 0.035, skin.accent);
        inset.position.z = -0.086;
        ear.add(inset);
      }
      addRoundTail(body, 'bear-button-tail', skin.color, 0.22, springs);
      break;
    case 'usagi':
      for (const side of [-1, 1]) {
        const ear = springGroup(head, `rabbit-ear-${side < 0 ? 'left' : 'right'}`, side * 0.19, 0.24, 0.035, side * -0.16, 0.18, springs);
        const shell = new THREE.Mesh(rabbitEarGeometry(), toyMaterial(skin.color));
        shell.name = 'rabbit-soft-ear';
        ear.add(shell);
        const inset = ellipsoid(0.085, 0.37, 0.04, CORAL);
        inset.position.set(0.013, 0.265, -0.073);
        inset.rotation.z = -0.07;
        ear.add(inset);
      }
      addRoundTail(body, 'rabbit-pom-tail', CREAM, 0.28, springs);
      break;
    case 'neko':
      for (const side of [-1, 1]) {
        const ear = springGroup(head, `cat-ear-${side < 0 ? 'left' : 'right'}`, side * 0.28, 0.235, 0.015, side * -0.22, 0.055, springs);
        const shell = new THREE.Mesh(catEarGeometry(), toyMaterial(skin.color));
        ear.add(shell);
        const inset = new THREE.Mesh(catEarGeometry(), toyMaterial(CORAL));
        inset.scale.set(0.55, 0.58, 0.28);
        inset.position.set(0, 0.045, -0.075);
        ear.add(inset);
      }
      {
        const tail = springGroup(body, 'cat-curled-tail', 0.18, 0.48, 0.22, 0, 0.16, springs);
        const mesh = new THREE.Mesh(sharedGeometry('mascot-cat-curled-tail', () => {
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.2, 0.03, 0.15),
            new THREE.Vector3(0.36, 0.23, 0.17),
            new THREE.Vector3(0.31, 0.4, 0.14),
            new THREE.Vector3(0.2, 0.42, 0.12),
          ]);
          return new THREE.TubeGeometry(curve, 18, 0.065, 8, false);
        }), toyMaterial(skin.color));
        tail.add(mesh);
        const tip = ellipsoid(0.135, 0.135, 0.135, skin.accent);
        tip.position.set(0.2, 0.42, 0.12);
        tail.add(tip);
      }
      break;
    case 'robo':
      {
        const antenna = springGroup(head, 'robot-spring-antenna', 0.17, 0.31, 0.025, -0.1, 0.15, springs);
        const stem = toyBox(0.052, 0.16, 0.052, CREAM, 0.02);
        stem.position.y = 0.06;
        antenna.add(stem);
        const orb = ellipsoid(0.13, 0.13, 0.13, skin.accent);
        orb.position.y = 0.16;
        antenna.add(orb);
      }
      for (const side of [-1, 1]) {
        const pod = ellipsoid(0.15, 0.24, 0.24, skin.accent);
        pod.name = `robot-ear-pod-${side}`;
        pod.position.set(side * 0.42, 0, 0);
        head.add(pod);
      }
      break;
    case 'sakana':
      {
        const crest = springGroup(head, 'fish-dorsal-fin', 0, 0.28, 0.04, 0, 0.12, springs);
        const fin = new THREE.Mesh(finGeometry(), toyMaterial(skin.accent));
        fin.rotation.y = Math.PI / 2;
        crest.add(fin);
      }
      for (const side of [-1, 1]) {
        const fin = springGroup(head, `fish-side-fin-${side < 0 ? 'left' : 'right'}`, side * 0.4, -0.07, 0.055, side * -0.9, 0.13, springs);
        fin.add(new THREE.Mesh(finGeometry(), toyMaterial(skin.accent)));
      }
      {
        const tail = springGroup(body, 'fish-fan-tail', 0, 0.51, 0.27, 0, 0.18, springs);
        tail.rotation.y = -Math.PI / 2;
        for (const side of [-1, 1]) {
          const lobe = ellipsoid(0.37, 0.21, 0.09, skin.accent);
          lobe.position.set(0.2, side * 0.08, 0);
          lobe.rotation.z = side * 0.4;
          tail.add(lobe);
        }
      }
      break;
  }
}

function addWaterPack(body: THREE.Group, skin: SkinConfig): void {
  const pack = group('mascot-water-pack', body);
  pack.position.set(0, 0.85, 0.32);
  const tank = ellipsoid(0.45, 0.59, 0.35, WATER);
  tank.name = 'mascot-water-tank';
  pack.add(tank);
  const base = toyBox(0.4, 0.12, 0.3, skin.accent, 0.05);
  base.position.y = -0.22;
  pack.add(base);
  const cap = toyBox(0.16, 0.08, 0.15, CREAM, 0.025);
  cap.position.y = 0.3;
  pack.add(cap);
  const window = ellipsoid(0.2, 0.3, 0.045, 0xcaf5f2);
  window.name = 'tank-water-window';
  window.position.set(0, 0.015, 0.175);
  pack.add(window);
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(sharedGeometry('mascot-tank-strap', () => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.5, -0.21),
        new THREE.Vector3(0, 0.81, -0.28),
        new THREE.Vector3(0, 1.095, -0.14),
        new THREE.Vector3(0, 1.13, 0.1),
        new THREE.Vector3(0, 0.92, 0.29),
      ]);
      return new THREE.TubeGeometry(curve, 14, 0.032, 6, false);
    }), toyMaterial(skin.id === 'neko' ? skin.accent : 0x4b9ba7));
    strap.name = side < 0 ? 'tank-strap-left' : 'tank-strap-right';
    strap.position.x = side * 0.225;
    body.add(strap);
  }
}

function addRobotButtons(body: THREE.Group): void {
  for (let i = 0; i < 3; i++) {
    const button = ellipsoid(0.075, 0.075, 0.035, [0x7edcc7, 0xffbd71, CORAL][i]);
    button.name = `robot-belly-button-${i}`;
    button.position.set((i - 1) * 0.105, 0.69, -0.316);
    body.add(button);
  }
}

function addRoundTail(body: THREE.Group, name: string, color: number, size: number, springs: SpringPart[]): void {
  const tail = springGroup(body, name, 0, 0.47, 0.285, 0, 0.12, springs);
  tail.add(ellipsoid(size, size, size, color));
}

function addWetDrops(body: THREE.Group, head: THREE.Group, material: THREE.MeshBasicMaterial, headZ: number): WetDrop[] {
  const geometry = sharedGeometry('mascot-wet-drop', () => new THREE.SphereGeometry(0.5, 10, 8));
  const drops: WetDrop[] = [];
  const places: Array<[THREE.Group, number, number, number, number]> = [
    [body, -0.12, 0.77, -0.32, 1],
    [body, 0.11, 0.57, -0.306, 0.8],
    [head, 0.285, 0.16, headZ, 0.7],
  ];
  for (const [parent, x, y, z, size] of places) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `mascot-wet-drop-${drops.length}`;
    mesh.userData.kind = 'wet-drop';
    mesh.position.set(x, y, z);
    mesh.scale.set(0.07 * size, 0.12 * size, 0.035 * size);
    mesh.visible = false;
    parent.add(mesh);
    drops.push({ mesh, x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z });
  }
  return drops;
}

function rabbitEarGeometry(): THREE.BufferGeometry {
  return sharedGeometry('mascot-rabbit-soft-ear', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.073, 0);
    shape.bezierCurveTo(-0.12, 0.24, -0.07, 0.53, 0.025, 0.55);
    shape.bezierCurveTo(0.15, 0.55, 0.12, 0.23, 0.07, 0);
    shape.quadraticCurveTo(0, -0.045, -0.073, 0);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.065, steps: 1, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.025, bevelSegments: 2, curveSegments: 10,
    });
    geometry.translate(0, 0, -0.035);
    return geometry;
  });
}

function catEarGeometry(): THREE.BufferGeometry {
  return sharedGeometry('mascot-cat-rounded-ear', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.125, 0);
    shape.quadraticCurveTo(-0.14, 0.04, -0.025, 0.25);
    shape.quadraticCurveTo(0.005, 0.3, 0.045, 0.24);
    shape.quadraticCurveTo(0.16, 0.04, 0.125, 0);
    shape.quadraticCurveTo(0, -0.04, -0.125, 0);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.075, steps: 1, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.025, bevelSegments: 2, curveSegments: 8,
    });
    geometry.translate(0, 0, -0.04);
    return geometry;
  });
}

function finGeometry(): THREE.BufferGeometry {
  return sharedGeometry('mascot-soft-fin', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.1, 0);
    shape.bezierCurveTo(-0.16, 0.12, -0.09, 0.3, -0.005, 0.28);
    shape.bezierCurveTo(0.045, 0.18, 0.17, 0.11, 0.14, 0.04);
    shape.quadraticCurveTo(0.07, -0.02, -0.1, 0);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.035, steps: 1, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.018, bevelSegments: 2, curveSegments: 8,
    });
    geometry.translate(0, 0, -0.018);
    return geometry;
  });
}

function group(name: string, parent: THREE.Object3D): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = name;
  parent.add(pivot);
  return pivot;
}

function springGroup(
  parent: THREE.Group, name: string, x: number, y: number, z: number, restZ: number, amount: number, springs: SpringPart[],
): THREE.Group {
  const pivot = group(name, parent);
  pivot.position.set(x, y, z);
  pivot.rotation.z = restZ;
  springs.push({ pivot, restZ, amount, phase: x < 0 ? 1.5 : 0 });
  return pivot;
}
