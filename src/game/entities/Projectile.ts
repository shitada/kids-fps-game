import * as THREE from 'three';
import type { WeaponConfig } from '@/types';

export interface Projectile {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  gravity: number;
  damage: number;
  splashRadius: number;
  attackerId: string;
  weaponConfig: WeaponConfig;
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
}

const balloonGeo = new THREE.SphereGeometry(0.22, 10, 8);
const waterGeo = new THREE.SphereGeometry(0.08, 6, 6);
const bubbleGeo = new THREE.SphereGeometry(0.14, 8, 6);

const balloonMat = new THREE.MeshBasicMaterial({ color: 0x80d4ff });
const waterMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7 });
const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xc9efff, transparent: true, opacity: 0.85 });

let projCounter = 0;

export function spawnProjectile(
  scene: THREE.Scene,
  weaponId: WeaponConfig['id'],
  weaponConfig: WeaponConfig,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  attackerId: string,
  damage: number,
): Projectile {
  let geo: THREE.BufferGeometry;
  let mat: THREE.Material;
  switch (weaponId) {
    case 'balloon-launcher': geo = balloonGeo; mat = balloonMat; break;
    case 'bubble-shower': geo = bubbleGeo; mat = bubbleMat; break;
    default: geo = waterGeo; mat = waterMat;
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(origin);
  scene.add(mesh);

  const velocity = direction.clone().multiplyScalar(weaponConfig.projectileSpeed);
  return {
    id: `proj-${projCounter++}`,
    position: origin.clone(),
    velocity,
    gravity: weaponConfig.gravity,
    damage,
    splashRadius: weaponConfig.splashRadius,
    attackerId,
    weaponConfig,
    life: 0,
    maxLife: 3,
    mesh,
  };
}

export function disposeProjectile(scene: THREE.Scene, p: Projectile): void {
  scene.remove(p.mesh);
}
