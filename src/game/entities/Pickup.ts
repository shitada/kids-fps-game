import * as THREE from 'three';
import type { PickupKind, WeaponId } from '@/types';
import { PICKUPS } from '@/game/config/pickups';
import { WEAPON_ORDER } from '@/game/config/weapons';

export interface Pickup {
  id: string;
  kind: PickupKind;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  available: boolean;
  respawnAt: number;
  containedWeapon?: WeaponId;
  /** ふわふわ動きの位相をずらすための種 */
  phase: number;
}

let pickupCounter = 0;

const glowGeo = new THREE.RingGeometry(0.9, 1.25, 20);

function glowRing(color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    glowGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.62;
  return mesh;
}

/** 遠くからでも「あれは とれるもの」と分かるよう、光る輪と目印を付ける。 */
function meshFor(kind: PickupKind): THREE.Object3D {
  const group = new THREE.Group();
  group.name = `pickup-${kind}`;

  switch (kind) {
    case 'water-tank': {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 1.4, 16),
        new THREE.MeshLambertMaterial({ color: 0x4fc3f7 }),
      );
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.3, 12),
        new THREE.MeshLambertMaterial({ color: 0xfff3d6 }),
      );
      cap.position.y = 0.82;
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.08, 8, 18),
        new THREE.MeshLambertMaterial({ color: 0xe1f5fe }),
      );
      band.rotation.x = Math.PI / 2;
      group.add(body, cap, band, glowRing(0x4fc3f7));
      break;
    }
    case 'weapon-chest': {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.75, 1.1),
        new THREE.MeshLambertMaterial({ color: 0xffc107 }),
      );
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.56, 1.1, 12, 1, false, 0, Math.PI),
        new THREE.MeshLambertMaterial({ color: 0xffa000 }),
      );
      lid.rotation.z = Math.PI / 2;
      lid.position.y = 0.37;
      const lock = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.28, 0.14),
        new THREE.MeshLambertMaterial({ color: 0xfff8e1 }),
      );
      lock.position.set(0, 0.05, 0.58);
      group.add(box, lid, lock, glowRing(0xffd166));
      break;
    }
    case 'wood-node': {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.42, 1.5, 10),
        new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
      );
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 1.3, 8),
        new THREE.MeshLambertMaterial({ color: 0x66bb6a }),
      );
      leaves.position.y = 1.05;
      group.add(trunk, leaves, glowRing(0x8bc34a));
      break;
    }
    case 'stone-node': {
      const main = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.7),
        new THREE.MeshLambertMaterial({ color: 0x9e9e9e, flatShading: true }),
      );
      const chip = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.34),
        new THREE.MeshLambertMaterial({ color: 0xbdbdbd, flatShading: true }),
      );
      chip.position.set(0.6, -0.2, 0.3);
      group.add(main, chip, glowRing(0xbdbdbd));
      break;
    }
  }

  return group;
}

export function createPickup(scene: THREE.Scene, kind: PickupKind, xz: [number, number]): Pickup {
  const mesh = meshFor(kind);
  mesh.position.set(xz[0], 0.9, xz[1]);
  scene.add(mesh);
  const pickup: Pickup = {
    id: `pickup-${pickupCounter++}`,
    kind,
    mesh,
    position: mesh.position.clone(),
    available: true,
    respawnAt: 0,
    phase: Math.random() * Math.PI * 2,
    containedWeapon:
      kind === 'weapon-chest' ? (WEAPON_ORDER[1 + Math.floor(Math.random() * 2)] as WeaponId) : undefined,
  };
  return pickup;
}

export function setPickupAvailable(pickup: Pickup, available: boolean, nowMs: number): void {
  pickup.available = available;
  pickup.mesh.visible = available;
  if (!available) {
    pickup.respawnAt = nowMs + PICKUPS[pickup.kind].respawnMs;
  }
}

export function refreshPickupRotation(pickup: Pickup, dt: number): void {
  if (!pickup.available) return;
  pickup.mesh.rotation.y += dt * 1.1;
  const t = performance.now() / 1000;
  pickup.mesh.position.y = pickup.position.y + Math.sin(t * 2.4 + pickup.phase) * 0.16;
}
