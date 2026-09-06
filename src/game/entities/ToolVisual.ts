import * as THREE from 'three';
import type { SkinConfig, WeaponId } from '@/types';
import { ellipsoid, flatMaterial, sharedGeometry, toyBox, toyMaterial } from '@/game/systems/VisualResources';

const CREAM = 0xfff7e6;
const WATER = 0x75dce7;
const INK = 0x24697a;

/**
 * The same toy is used in a mascot's hand and in first person.
 * Origin: body centre / grip top. Forward: -Z. All models fit approximately
 * 0.4 × 0.65 × 0.8 units; the existing first-person scale .62 and
 * position (.32, -.3, -.9) are a useful starting point.
 *
 * `tool-nozzle` is the initially hidden water flash at the outlet, not a
 * physical piece. Animate its visibility/scale with setToolFiring().
 * Geometry/materials are shared; removing one tool must not dispose them.
 */
export function createToolVisual(weapon: WeaponId, skin: SkinConfig): THREE.Group {
  const tool = new THREE.Group();
  tool.name = `tool-${weapon}`;
  tool.userData.kind = 'toy-tool';
  tool.userData.weapon = weapon;

  const grip = toyBox(0.12, 0.23, 0.14, skin.color, 0.045);
  grip.name = 'tool-grip';
  grip.position.set(0, -0.17, 0.08);
  grip.rotation.x = -0.18;
  tool.add(grip);

  // An oversized squeeze button, rather than a realistic trigger/guard.
  const button = ellipsoid(0.08, 0.11, 0.06, CREAM);
  button.name = 'tool-squeeze-button';
  button.position.set(0, -0.105, -0.025);
  tool.add(button);

  let outlet: number;
  switch (weapon) {
    case 'water-gun':
      buildWaterPistol(tool, skin);
      outlet = -0.48;
      break;
    case 'balloon-launcher':
      buildBalloonCup(tool, skin);
      outlet = -0.61;
      break;
    case 'bubble-shower':
      buildBubbleShower(tool, skin);
      outlet = -0.45;
      break;
  }

  const nozzle = makeWaterFlash(weapon);
  nozzle.position.set(0, 0.035, outlet);
  tool.add(nozzle);
  return tool;
}

/** Strength is a 0–1 pulse; no material mutation and no per-frame allocation. */
export function setToolFiring(tool: THREE.Group, strength: number): void {
  const nozzle = tool.getObjectByName('tool-nozzle');
  if (!nozzle) return;
  const pulse = THREE.MathUtils.clamp(strength, 0, 1);
  nozzle.visible = pulse > 0.05;
  nozzle.scale.setScalar(0.65 + pulse * 0.9);
}

function buildWaterPistol(tool: THREE.Group, skin: SkinConfig): void {
  const body = toyBox(0.25, 0.21, 0.36, skin.accent, 0.085);
  body.name = 'pistol-body';
  body.position.z = -0.035;
  tool.add(body);

  const bulb = ellipsoid(0.23, 0.24, 0.25, WATER);
  bulb.name = 'pistol-bulb-tank';
  bulb.position.set(0, 0.18, 0.015);
  tool.add(bulb);
  const cap = toyBox(0.105, 0.045, 0.105, CREAM, 0.02);
  cap.position.set(0, 0.305, 0.015);
  tool.add(cap);
  const shine = ellipsoid(0.05, 0.075, 0.018, CREAM);
  shine.position.set(-0.045, 0.21, -0.095);
  tool.add(shine);

  const snout = toyBox(0.15, 0.14, 0.24, WATER, 0.06);
  snout.name = 'pistol-short-snout';
  snout.position.set(0, 0.025, -0.275);
  tool.add(snout);
  addRing(tool, 'pistol-soft-outlet', 0.074, 0.025, skin.color, -0.397, 0.025);
  const hole = disk(0.051, INK);
  hole.position.set(0, 0.025, -0.414);
  tool.add(hole);

  // The circular side badge reads as an injection-moulded toy detail.
  for (const side of [-1, 1]) {
    const badge = ellipsoid(0.025, 0.095, 0.095, CREAM);
    badge.position.set(side * 0.125, 0.01, 0.025);
    tool.add(badge);
  }
}

function buildBalloonCup(tool: THREE.Group, skin: SkinConfig): void {
  const body = toyBox(0.27, 0.2, 0.31, WATER, 0.085);
  body.name = 'balloon-cup-body';
  body.position.z = 0.005;
  tool.add(body);

  // A real rounded cup cross-section, open at the broad end, not a barrel.
  const cup = new THREE.Mesh(sharedGeometry('toy-balloon-cup', () => {
    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.085, 0),
      new THREE.Vector2(0.105, 0.035),
      new THREE.Vector2(0.15, 0.14),
      new THREE.Vector2(0.188, 0.235),
      new THREE.Vector2(0.182, 0.255),
      new THREE.Vector2(0.155, 0.255),
      new THREE.Vector2(0.14, 0.195),
      new THREE.Vector2(0.075, 0.065),
      new THREE.Vector2(0, 0.065),
    ];
    return new THREE.LatheGeometry(points, 20);
  }), toyMaterial(skin.accent));
  cup.name = 'balloon-open-cup';
  cup.rotation.x = -Math.PI / 2;
  cup.position.set(0, 0.035, -0.12);
  tool.add(cup);
  addRing(tool, 'balloon-cup-rim', 0.168, 0.027, CREAM, -0.371);

  const balloon = ellipsoid(0.27, 0.29, 0.3, 0xff927f);
  balloon.name = 'loaded-water-balloon';
  balloon.position.set(0, 0.06, -0.405);
  tool.add(balloon);
  const knot = ellipsoid(0.055, 0.06, 0.06, 0xe77273);
  knot.name = 'balloon-knot';
  knot.position.set(0, 0.035, -0.555);
  tool.add(knot);
  const highlight = ellipsoid(0.055, 0.085, 0.018, CREAM);
  highlight.position.set(-0.065, 0.135, -0.515);
  highlight.rotation.y = -0.35;
  tool.add(highlight);

  const cushion = ellipsoid(0.29, 0.13, 0.22, skin.color);
  cushion.position.set(0, 0.09, 0.1);
  tool.add(cushion);
}

function buildBubbleShower(tool: THREE.Group, skin: SkinConfig): void {
  const body = toyBox(0.22, 0.21, 0.3, skin.color, 0.075);
  body.name = 'shower-body';
  tool.add(body);
  const reservoir = ellipsoid(0.25, 0.24, 0.24, 0xb6ecd4);
  reservoir.name = 'shower-soap-reservoir';
  reservoir.position.set(0, 0.16, 0.055);
  tool.add(reservoir);

  const neck = toyBox(0.14, 0.14, 0.18, WATER, 0.055);
  neck.position.set(0, 0.035, -0.2);
  tool.add(neck);
  const head = ellipsoid(0.39, 0.36, 0.17, skin.accent);
  head.name = 'shower-round-head';
  head.position.set(0, 0.035, -0.3);
  tool.add(head);
  const plate = disk(0.143, CREAM);
  plate.name = 'shower-faceplate';
  plate.position.set(0, 0.035, -0.39);
  tool.add(plate);

  // One central outlet and six around it make the spread readable at a glance.
  for (let i = 0; i < 7; i++) {
    const angle = (i - 1) * Math.PI / 3;
    const x = i === 0 ? 0 : Math.cos(angle) * 0.093;
    const y = i === 0 ? 0 : Math.sin(angle) * 0.093;
    const hole = disk(0.024, INK);
    hole.name = `shower-hole-${i}`;
    hole.position.set(x, 0.035 + y, -0.393);
    tool.add(hole);
  }
}

function disk(radius: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    sharedGeometry(`toy-disk-${radius}`, () => new THREE.CircleGeometry(radius, 16)),
    flatMaterial(color),
  );
  mesh.rotation.y = Math.PI;
  return mesh;
}

function addRing(
  parent: THREE.Group, name: string, radius: number, tube: number, color: number, z: number, y = 0.035,
): void {
  const ring = new THREE.Mesh(
    sharedGeometry(`toy-ring-${radius}-${tube}`, () => new THREE.TorusGeometry(radius, tube, 6, 20)),
    toyMaterial(color),
  );
  ring.name = name;
  ring.position.set(0, y, z);
  parent.add(ring);
}

function makeWaterFlash(weapon: WeaponId): THREE.Group {
  const flash = new THREE.Group();
  flash.name = 'tool-nozzle';
  flash.userData.kind = 'muzzle-splash';
  flash.visible = false;
  const geometry = sharedGeometry('toy-flash-drop', () => new THREE.SphereGeometry(0.5, 8, 6));
  const count = weapon === 'bubble-shower' ? 5 : 3;
  for (let i = 0; i < count; i++) {
    const drop = new THREE.Mesh(geometry, flatMaterial(i === 0 ? 0xf1ffff : WATER));
    const side = i === 0 ? 0 : (i % 2 === 0 ? 1 : -1);
    drop.position.set(side * 0.055, i > 2 ? 0.065 : 0, -0.03 - i * 0.016);
    drop.scale.set(0.06, 0.06, i === 0 ? 0.15 : 0.09);
    flash.add(drop);
  }
  return flash;
}
