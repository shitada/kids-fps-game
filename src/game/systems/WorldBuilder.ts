import * as THREE from 'three';
import type { Decoration, MapConfig } from '@/types';
import { CollisionWorld, makeAABB } from '@/game/systems/CollisionWorld';

export interface BuiltWorld {
  scene: THREE.Scene;
  collision: CollisionWorld;
  ground: THREE.Mesh;
}

export function buildWorld(map: MapConfig): BuiltWorld {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(map.skyColor);
  scene.fog = new THREE.Fog(map.skyColor, 60, 160);

  const hemi = new THREE.HemisphereLight(0xffffff, map.groundColor, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(40, 80, 20);
  scene.add(sun);

  const groundGeo = new THREE.PlaneGeometry(map.sizeMeters * 2.4, map.sizeMeters * 2.4);
  const groundMat = new THREE.MeshLambertMaterial({ color: map.groundColor });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // ふんわりした雲も配置
  for (let i = 0; i < 10; i++) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(4 + Math.random() * 3, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
    );
    const angle = (i / 10) * Math.PI * 2;
    cloud.position.set(Math.cos(angle) * (map.sizeMeters * 0.9), 30 + Math.random() * 8, Math.sin(angle) * (map.sizeMeters * 0.9));
    cloud.scale.y = 0.6;
    scene.add(cloud);
  }

  const collision = new CollisionWorld();

  map.decorations.forEach((d, idx) => {
    const mesh = buildDecorationMesh(d);
    scene.add(mesh);
    const center = new THREE.Vector3(d.position[0], d.position[1], d.position[2]);
    const size = new THREE.Vector3(d.size[0], d.size[1], d.size[2]);
    collision.add({
      id: `deco-${idx}`,
      aabb: makeAABB(center, size),
      blocksMovement: true,
      blocksProjectile: true,
    });
  });

  // 周囲に見えない壁を作って外に出られないようにする
  const half = map.sizeMeters / 2;
  const wallHeight = 30;
  const wallThickness = 2;
  const walls: Array<[number, number, number, number]> = [
    [0, half + wallThickness / 2, map.sizeMeters + wallThickness * 2, wallThickness],
    [0, -(half + wallThickness / 2), map.sizeMeters + wallThickness * 2, wallThickness],
    [half + wallThickness / 2, 0, wallThickness, map.sizeMeters + wallThickness * 2],
    [-(half + wallThickness / 2), 0, wallThickness, map.sizeMeters + wallThickness * 2],
  ];
  walls.forEach(([x, z, sx, sz], i) => {
    const center = new THREE.Vector3(x, wallHeight / 2, z);
    const size = new THREE.Vector3(sx, wallHeight, sz);
    collision.add({
      id: `bound-${i}`,
      aabb: makeAABB(center, size),
      blocksMovement: true,
      blocksProjectile: true,
    });
  });

  return { scene, collision, ground };
}

function buildDecorationMesh(d: Decoration): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  switch (d.kind) {
    case 'box':
      geo = new THREE.BoxGeometry(d.size[0], d.size[1], d.size[2]);
      break;
    case 'cylinder':
      geo = new THREE.CylinderGeometry(d.size[0] / 2, d.size[0] / 2, d.size[1], 18);
      break;
    case 'pyramid':
      geo = new THREE.ConeGeometry(d.size[0] / 2, d.size[1], 4);
      break;
    case 'sphere':
      geo = new THREE.SphereGeometry(d.size[0] / 2, 18, 12);
      break;
  }
  const mat = new THREE.MeshLambertMaterial({ color: d.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(d.position[0], d.position[1], d.position[2]);
  return mesh;
}
