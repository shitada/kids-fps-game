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
  trail: THREE.Mesh;
}

const balloonGeo = new THREE.SphereGeometry(0.22, 10, 8);
const waterGeo = new THREE.SphereGeometry(0.12, 8, 6);
const bubbleGeo = new THREE.SphereGeometry(0.14, 8, 6);
const trailGeo = new THREE.BoxGeometry(0.08, 0.08, 0.72);

const balloonMat = new THREE.MeshBasicMaterial({ color: 0xb7edff });
const waterMat = new THREE.MeshBasicMaterial({ color: 0xe9fbff });
const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xc9efff, transparent: true, opacity: 0.9 });
const waterTrailMat = new THREE.MeshBasicMaterial({ color: 0x8fdfff, transparent: true, opacity: 0.48, depthWrite: false });
const balloonTrailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34, depthWrite: false });
const bubbleTrailMat = new THREE.MeshBasicMaterial({ color: 0xe9fbff, transparent: true, opacity: 0.28, depthWrite: false });
const projectileForward = new THREE.Vector3(0, 0, -1);
const projectileDirection = new THREE.Vector3();

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
    case 'balloon-launcher':
      geo = balloonGeo;
      mat = balloonMat;
      break;
    case 'bubble-shower':
      geo = bubbleGeo;
      mat = bubbleMat;
      break;
    default:
      geo = waterGeo;
      mat = waterMat;
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.kind = 'projectile';
  const trail = makeTrail(weaponId);
  mesh.add(trail);
  mesh.position.copy(origin);
  scene.add(mesh);

  const velocity = direction.clone().multiplyScalar(weaponConfig.projectileSpeed);
  syncProjectileVisual({ position: origin, velocity, mesh, trail });
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
    trail,
  };
}

export function syncProjectileVisual(p: Pick<Projectile, 'position' | 'velocity' | 'mesh' | 'trail'>): void {
  p.mesh.position.copy(p.position);
  if (p.velocity.lengthSq() > 0.0001) {
    projectileDirection.copy(p.velocity).normalize();
    p.mesh.quaternion.setFromUnitVectors(projectileForward, projectileDirection);
  }
  const speedRatio = THREE.MathUtils.clamp(p.velocity.length() / 26, 0.65, 1.35);
  p.trail.scale.z = speedRatio;
}

export function disposeProjectile(scene: THREE.Scene, p: Projectile): void {
  scene.remove(p.mesh);
}

function makeTrail(weaponId: WeaponConfig['id']): THREE.Mesh {
  let mat: THREE.Material;
  let width = 1;
  let length = 1;
  switch (weaponId) {
    case 'balloon-launcher':
      mat = balloonTrailMat;
      width = 1.7;
      length = 0.9;
      break;
    case 'bubble-shower':
      mat = bubbleTrailMat;
      width = 1.15;
      length = 0.65;
      break;
    default:
      mat = waterTrailMat;
      width = 1;
      length = 1;
  }
  const trail = new THREE.Mesh(trailGeo, mat);
  trail.name = 'projectile-trail';
  trail.userData.kind = 'projectile-trail';
  trail.position.z = 0.42 * length;
  trail.scale.set(width, width, length);
  return trail;
}
