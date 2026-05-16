import * as THREE from 'three';
import type { PickupKind, WeaponId } from '@/types';
import { PICKUPS } from '@/game/config/pickups';
import { WEAPON_ORDER } from '@/game/config/weapons';

export interface Pickup {
  id: string;
  kind: PickupKind;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  available: boolean;
  respawnAt: number;
  containedWeapon?: WeaponId;
}

let pickupCounter = 0;

function meshFor(kind: PickupKind): THREE.Mesh {
  switch (kind) {
    case 'water-tank': {
      const geo = new THREE.CylinderGeometry(0.6, 0.6, 1.4, 14);
      const mat = new THREE.MeshLambertMaterial({ color: 0x4fc3f7 });
      const m = new THREE.Mesh(geo, mat);
      return m;
    }
    case 'weapon-chest': {
      const geo = new THREE.BoxGeometry(1, 0.7, 1);
      const mat = new THREE.MeshLambertMaterial({ color: 0xffc107 });
      return new THREE.Mesh(geo, mat);
    }
    case 'wood-node': {
      const geo = new THREE.CylinderGeometry(0.4, 0.5, 1.8, 8);
      const mat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
      return new THREE.Mesh(geo, mat);
    }
    case 'stone-node': {
      const geo = new THREE.SphereGeometry(0.7, 10, 8);
      const mat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
      return new THREE.Mesh(geo, mat);
    }
  }
}

export function createPickup(scene: THREE.Scene, kind: PickupKind, xz: [number, number]): Pickup {
  const mesh = meshFor(kind);
  mesh.position.set(xz[0], 0.7, xz[1]);
  scene.add(mesh);
  const pickup: Pickup = {
    id: `pickup-${pickupCounter++}`,
    kind,
    mesh,
    position: mesh.position.clone(),
    available: true,
    respawnAt: 0,
    containedWeapon: kind === 'weapon-chest'
      ? (WEAPON_ORDER[1 + Math.floor(Math.random() * 2)] as WeaponId)
      : undefined,
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
  pickup.mesh.rotation.y += dt * 1.2;
  pickup.mesh.position.y = pickup.position.y + Math.sin(performance.now() / 400) * 0.1;
}
