import * as THREE from 'three';
import type { PickupKind, WeaponId } from '@/types';
import { PICKUPS } from '@/game/config/pickups';
import { WEAPON_ORDER } from '@/game/config/weapons';
import { ellipsoid, flatMaterial, sharedGeometry, toyBox, toyMaterial } from '@/game/systems/VisualResources';

export interface Pickup {
  id: string;
  kind: PickupKind;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  available: boolean;
  respawnAt: number;
  containedWeapon?: WeaponId;
  phase: number;
}

let pickupCounter = 0;

export function createPickupVisual(kind: PickupKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `pickup-${kind}`;
  const colors: Record<PickupKind, number> = {
    'water-tank': 0x36c8dc, 'weapon-chest': 0xffce67, 'wood-node': 0xcf9368, 'stone-node': 0x98b8cc,
  };
  const color = colors[kind];
  const ring = new THREE.Mesh(
    sharedGeometry('pickup-ring', () => new THREE.TorusGeometry(0.77, 0.035, 6, 32)),
    flatMaterial(color),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.65;
  group.add(ring);

  if (kind === 'water-tank') {
    const bottle = toyBox(0.75, 1.1, 0.6, color, 0.25);
    const cap = toyBox(0.48, 0.18, 0.4, 0xfff3d9, 0.07);
    cap.position.y = 0.63;
    const handle = new THREE.Mesh(
      sharedGeometry('bottle-handle', () => new THREE.TorusGeometry(0.2, 0.065, 8, 16, Math.PI)),
      toyMaterial(0xfff3d9),
    );
    handle.position.set(0, 0.68, 0);
    const badge = ellipsoid(0.32, 0.42, 0.06, 0xf3ffff);
    badge.position.set(0, 0.02, -0.31);
    badge.rotation.z = -0.2;
    const spout = toyBox(0.22, 0.22, 0.24, 0xffd367, 0.06);
    spout.position.set(0.42, 0.38, 0);
    group.add(bottle, cap, handle, badge, spout);
  } else if (kind === 'weapon-chest') {
    const base = toyBox(1.05, 0.66, 0.75, color, 0.17);
    const lid = toyBox(1.12, 0.28, 0.82, 0xff866e, 0.13);
    lid.position.y = 0.38;
    const handle = new THREE.Mesh(
      sharedGeometry('kit-handle', () => new THREE.TorusGeometry(0.2, 0.055, 8, 16, Math.PI)),
      toyMaterial(0xfff3d9),
    );
    handle.position.y = 0.54;
    const clasp = toyBox(0.19, 0.27, 0.08, 0xfff3d9, 0.04);
    clasp.position.set(0, 0.08, -0.4);
    group.add(base, lid, handle, clasp);
  } else if (kind === 'wood-node') {
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(
        sharedGeometry('toy-log', () => new THREE.CylinderGeometry(0.19, 0.19, 0.95, 12)),
        toyMaterial(i === 2 ? 0xdca47a : color, 0.8),
      );
      log.rotation.x = Math.PI / 2;
      log.position.set(i === 2 ? 0 : i * 0.4 - 0.2, i === 2 ? 0.24 : -0.1, 0);
      const end = new THREE.Mesh(
        sharedGeometry('log-end', () => new THREE.CircleGeometry(0.135, 12)),
        flatMaterial(0xffdeb0),
      );
      end.rotation.x = -Math.PI / 2;
      end.position.y = 0.48;
      log.add(end);
      group.add(log);
    }
    const strap = toyBox(0.84, 0.64, 0.16, 0x81cbb6, 0.08);
    group.add(strap);
  } else {
    const positions = [[-0.24, -0.18, 0], [0.24, -0.16, 0.1], [0, 0.18, 0]] as const;
    for (let i = 0; i < positions.length; i++) {
      const stone = toyBox(0.57, 0.48, 0.58, i === 1 ? 0xc5d8df : color, 0.21);
      const position = positions[i];
      stone.position.set(position[0], position[1], position[2]);
      stone.rotation.y = i * 0.65;
      group.add(stone);
    }
  }
  return group;
}

export function createPickup(scene: THREE.Scene, kind: PickupKind, xz: [number, number]): Pickup {
  const mesh = createPickupVisual(kind);
  mesh.position.set(xz[0], 0.9, xz[1]);
  scene.add(mesh);
  return {
    id: `pickup-${pickupCounter++}`,
    kind, mesh, position: mesh.position.clone(), available: true, respawnAt: 0,
    phase: Math.random() * Math.PI * 2,
    containedWeapon: kind === 'weapon-chest' ? WEAPON_ORDER[1 + Math.floor(Math.random() * 2)] : undefined,
  };
}

export function setPickupAvailable(pickup: Pickup, available: boolean, nowMs: number): void {
  pickup.available = available;
  pickup.mesh.visible = available;
  if (!available) pickup.respawnAt = nowMs + PICKUPS[pickup.kind].respawnMs;
}

export function refreshPickupRotation(pickup: Pickup, dt: number): void {
  if (!pickup.available) return;
  pickup.mesh.rotation.y += dt * 0.65;
  const t = performance.now() / 1000;
  pickup.mesh.position.y = pickup.position.y + Math.sin(t * 2.4 + pickup.phase) * 0.1;
}
