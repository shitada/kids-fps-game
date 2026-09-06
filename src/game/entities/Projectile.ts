import * as THREE from 'three';
import type { WeaponConfig } from '@/types';
import { flatMaterial, sharedBasicMaterial, sharedGeometry, toyMaterial } from '@/game/systems/VisualResources';

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
  /** 撃った本人（プレイヤー）の弾かどうか。見やすさを変えるのに使う。 */
  fromPlayer: boolean;
}

// 子供でも弾すじが目で追えるように、見た目はかなり大きめにしている。
const balloonGeo = sharedGeometry('balloon-projectile', () => new THREE.SphereGeometry(0.34, 16, 12));
const waterGeo = sharedGeometry('water-projectile', () => new THREE.SphereGeometry(0.2, 12, 8).scale(0.85, 0.85, 1.45));
const bubbleGeo = sharedGeometry('bubble-projectile', () => new THREE.SphereGeometry(0.22, 12, 10));
// しっぽを -Z（進行方向の後ろ）へ伸ばしたいので、ジオメトリ自体を寝かせておく。
// メッシュ側を回すと scale.z が長さではなく太さに効いてしまうため。
const trailGeo = sharedGeometry('water-trail', () => new THREE.CylinderGeometry(0.02, 0.09, 1, 8, 1, true).rotateX(Math.PI / 2));
const haloGeo = sharedGeometry('projectile-halo', () => new THREE.TorusGeometry(0.3, 0.026, 5, 16));

const balloonMat = toyMaterial(0xffc36a, 0.24);
const waterMat = toyMaterial(0x79dcec, 0.2);
const bubbleMat = toyMaterial(0xc1eeff, 0.18);
const waterTrailMat = sharedBasicMaterial('water-trail', { color: 0x7fd8ff, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide });
const balloonTrailMat = sharedBasicMaterial('balloon-trail', { color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
const bubbleTrailMat = sharedBasicMaterial('bubble-trail', { color: 0xe9fbff, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
const enemyHaloMat = flatMaterial(0xffa46d);

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
  fromPlayer = false,
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
  mesh.frustumCulled = false;
  const glint = new THREE.Mesh(
    sharedGeometry('projectile-glint', () => new THREE.SphereGeometry(0.055, 8, 6)),
    flatMaterial(0xffffff),
  );
  glint.position.set(-0.07, 0.09, -0.14);
  glint.scale.set(0.7, 1, 1.5);
  mesh.add(glint);
  if (weaponId === 'balloon-launcher') {
    const knot = new THREE.Mesh(
      sharedGeometry('balloon-knot', () => new THREE.ConeGeometry(0.065, 0.14, 8)),
      balloonMat,
    );
    knot.rotation.x = Math.PI / 2;
    knot.position.z = 0.37;
    mesh.add(knot);
  }

  const trail = makeTrail(weaponId);
  mesh.add(trail);

  // 相手の水には、明るい輪を付けて見分けやすくする。
  if (!fromPlayer) {
    const halo = new THREE.Mesh(haloGeo, enemyHaloMat);
    halo.name = 'projectile-halo';
    halo.scale.setScalar(weaponId === 'balloon-launcher' ? 1.35 : 1);
    mesh.add(halo);
  }

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
    fromPlayer,
  };
}

export function syncProjectileVisual(p: Pick<Projectile, 'position' | 'velocity' | 'mesh' | 'trail'>): void {
  p.mesh.position.copy(p.position);
  if (p.velocity.lengthSq() > 0.0001) {
    projectileDirection.copy(p.velocity).normalize();
    p.mesh.quaternion.setFromUnitVectors(projectileForward, projectileDirection);
  }
  const speedRatio = THREE.MathUtils.clamp(p.velocity.length() / 26, 0.7, 2.2);
  p.trail.scale.z = speedRatio;
  p.trail.position.z = speedRatio * 0.5;
}

export function disposeProjectile(scene: THREE.Scene, p: Projectile): void {
  scene.remove(p.mesh);
}

function makeTrail(weaponId: WeaponConfig['id']): THREE.Mesh {
  let mat: THREE.Material;
  let width = 1;
  switch (weaponId) {
    case 'balloon-launcher':
      mat = balloonTrailMat;
      width = 2.1;
      break;
    case 'bubble-shower':
      mat = bubbleTrailMat;
      width = 1.4;
      break;
    default:
      mat = waterTrailMat;
      width = 1.35;
  }
  const trail = new THREE.Mesh(trailGeo, mat);
  trail.name = 'projectile-trail';
  trail.userData.kind = 'projectile-trail';
  trail.scale.set(width, width, 1);
  trail.frustumCulled = false;
  return trail;
}
