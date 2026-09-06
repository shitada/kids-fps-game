import * as THREE from 'three';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MAPS } from '@/game/config/maps';
import { buildWorld, type BuiltWorld } from '@/game/systems/WorldBuilder';
import type { Collider } from '@/game/systems/CollisionWorld';
import type { MapConfig } from '@/types';

type XZ = [number, number];
const worlds: BuiltWorld[] = [];

function build(map: MapConfig): BuiltWorld {
  const world = buildWorld(map);
  worlds.push(world);
  return world;
}

function pickups(map: MapConfig): XZ[] {
  return [...map.waterTanks, ...map.weaponChests, ...map.woodNodes, ...map.stoneNodes];
}

function isClear(colliders: Collider[], x: number, z: number, radius: number): boolean {
  return !colliders.some(({ aabb: { min, max } }) =>
    min.y < 1.8 && max.y > 0 &&
    x + radius >= min.x && x - radius <= max.x &&
    z + radius >= min.z && z - radius <= max.z);
}

/** One-metre, four-neighbour flood; inflated blockers allow room for CPU turns. */
function routes(world: BuiltWorld, size: number, clearance: number): Set<string> {
  const colliders = world.collision.movingColliders();
  const visited = new Set<string>(['0,0']);
  const queue: XZ[] = [[0, 0]];
  const limit = size / 2 - 2;
  for (let head = 0; head < queue.length; head++) {
    const [x, z] = queue[head];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      const key = `${nx},${nz}`;
      if (Math.abs(nx) > limit || Math.abs(nz) > limit || visited.has(key)) continue;
      if (!isClear(colliders, nx, nz, clearance)) continue;
      visited.add(key);
      queue.push([nx, nz]);
    }
  }
  return visited;
}

function collisionSnapshot(world: BuiltWorld): Array<{ id: string; min: number[]; max: number[] }> {
  return world.collision.movingColliders().map(({ id, aabb }) => ({
    id, min: aabb.min.toArray(), max: aabb.max.toArray(),
  }));
}

function instanceSnapshot(world: BuiltWorld): number[][] {
  const result: number[][] = [];
  world.scene.traverse((object) => {
    if (object instanceof THREE.InstancedMesh && !object.userData.visualAnimation) {
      result.push(Array.from(object.instanceMatrix.array));
    }
  });
  return result;
}

afterEach(() => vi.unstubAllGlobals());
afterAll(() => {
  // Shared geometries/materials are application-owned, not world-owned.
  for (const world of worlds) {
    world.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (!object.geometry.userData.sharedVisualResource) object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material.userData.sharedVisualResource) material.dispose();
      }
    });
  }
});

describe.each(MAPS)('$nameHiragana world', (map) => {
  let world: BuiltWorld;
  beforeAll(() => { world = build(map); });

  it('preserves the public world API and a continuous zero-height ground', () => {
    expect(world.scene).toBeInstanceOf(THREE.Scene);
    expect(world.ground).toBeInstanceOf(THREE.Mesh);
    expect(world.ground.parent).toBe(world.scene);
    expect(world.ground.position.y).toBe(0);
    world.ground.updateMatrixWorld();
    const bounds = new THREE.Box3().setFromObject(world.ground);
    expect(bounds.min.x).toBeLessThanOrEqual(-map.sizeMeters / 2);
    expect(bounds.max.x).toBeGreaterThanOrEqual(map.sizeMeters / 2);
    expect(bounds.min.z).toBeLessThanOrEqual(-map.sizeMeters / 2);
    expect(bounds.max.z).toBeGreaterThanOrEqual(map.sizeMeters / 2);
    expect(Math.abs(bounds.max.y)).toBeLessThan(0.00001);
    expect(typeof world.update).toBe('function');
  });

  it('has finite, positive, unique colliders and aligned outer bounds', () => {
    const all = world.collision.movingColliders();
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    for (const { id, aabb: { min, max } } of all) {
      for (const axis of ['x', 'y', 'z'] as const) {
        expect(Number.isFinite(min[axis]), `${id}.${axis}`).toBe(true);
        expect(Number.isFinite(max[axis]), `${id}.${axis}`).toBe(true);
        expect(max[axis] - min[axis], `${id}.${axis}`).toBeGreaterThan(0);
      }
      if (id.startsWith('bound-')) continue;
      expect(Math.max(Math.abs(min.x), Math.abs(max.x))).toBeLessThan(map.sizeMeters / 2);
      expect(Math.max(Math.abs(min.z), Math.abs(max.z))).toBeLessThan(map.sizeMeters / 2);
      expect(min.y).toBeGreaterThanOrEqual(-0.001);
    }
    const half = map.sizeMeters / 2;
    expect(world.collision.get('bound-0')?.aabb.min.z).toBe(half);
    expect(world.collision.get('bound-1')?.aabb.min.x).toBe(half);
    expect(world.collision.get('bound-2')?.aabb.max.z).toBe(-half);
    expect(world.collision.get('bound-3')?.aabb.max.x).toBe(-half);
  });

  it('keeps at least seven separated spawns clear with generous clearance', () => {
    const colliders = world.collision.movingColliders();
    expect(map.spawnPoints.length).toBeGreaterThanOrEqual(7);
    map.spawnPoints.forEach(([x, z], index) => {
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeLessThan(map.sizeMeters / 2 - 2);
      expect(isClear(colliders, x, z, 1.35), `spawn ${index} at ${x},${z}`).toBe(true);
      for (const other of map.spawnPoints.slice(index + 1)) {
        expect(Math.hypot(x - other[0], z - other[1])).toBeGreaterThan(7);
      }
    });
  });

  it('never overlaps pickups with each other, scenery, or spawns', () => {
    const colliders = world.collision.movingColliders();
    const all = pickups(map);
    for (const entries of [map.waterTanks, map.weaponChests, map.woodNodes, map.stoneNodes]) {
      expect(entries.length).toBeGreaterThan(0);
    }
    all.forEach(([x, z], index) => {
      expect(isClear(colliders, x, z, 1), `pickup ${index} at ${x},${z}`).toBe(true);
      for (const other of all.slice(index + 1)) {
        expect(Math.hypot(x - other[0], z - other[1]), `pickups ${index}/${all.indexOf(other)}`).toBeGreaterThan(2.5);
      }
      for (const spawn of map.spawnPoints) {
        expect(Math.hypot(x - spawn[0], z - spawn[1])).toBeGreaterThan(2.5);
      }
    });
  });

  it('connects every spawn and supply to the center by broad ground routes', () => {
    const reachable = routes(world, map.sizeMeters, 1.35);
    for (const [x, z] of [...map.spawnPoints, ...pickups(map)]) {
      expect(reachable.has(`${x},${z}`), `unreachable ${x},${z}`).toBe(true);
    }
    // No disconnected gameplay pockets or narrow routes required by pickups.
    const colliders = world.collision.movingColliders();
    const limit = map.sizeMeters / 2 - 2;
    for (let x = -limit; x <= limit; x++) {
      for (let z = -limit; z <= limit; z++) {
        if (isClear(colliders, x, z, 1.35)) expect(reachable.has(`${x},${z}`), `${x},${z}`).toBe(true);
      }
    }
  });

  it('leaves the entire final ten-metre safe circle walkable', () => {
    const colliders = world.collision.movingColliders();
    for (let x = -10; x <= 10; x++) {
      for (let z = -10; z <= 10; z++) {
        if (x * x + z * z > 100) continue;
        expect(isClear(colliders, x, z, 0.55), `safe-circle ${x},${z}`).toBe(true);
      }
    }
  });

  it('uses shared PBR, bounded resource counts and static instancing', () => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    let meshes = 0;
    let instances = 0;
    let triangles = 0;
    world.scene.traverse((object) => {
      if (object instanceof THREE.Light) expect(object.castShadow).toBe(false);
      if (!(object instanceof THREE.Mesh)) return;
      meshes++;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        expect(material).not.toBeInstanceOf(THREE.MeshLambertMaterial);
        if (material instanceof THREE.MeshStandardMaterial) expect(material.envMapIntensity).toBe(0.6);
      }
      const count = object instanceof THREE.InstancedMesh ? object.count : 1;
      if (object instanceof THREE.InstancedMesh) instances += count;
      triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3 * count;
    });
    expect(instances).toBeGreaterThan(200);
    expect(meshes).toBeLessThan(150);
    expect(geometries.size).toBeLessThan(65);
    expect(materials.size).toBeLessThan(30);
    expect(triangles).toBeLessThan(180_000);
    for (const geometry of geometries) expect(geometry.userData.sharedVisualResource).toBe(true);
  });

  it('has deterministic placements and unchanged collision during update', () => {
    const duplicate = build(map);
    expect(instanceSnapshot(duplicate)).toEqual(instanceSnapshot(world));
    const before = collisionSnapshot(world);
    const instances = instanceSnapshot(world);
    world.update(0);
    world.update(1 / 60);
    world.update(60);
    expect(instanceSnapshot(world)).toEqual(instances);
    expect(collisionSnapshot(world)).toEqual(before);
  });

  it('changes only non-colliding backdrop density for desktop media', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    const desktop = build(map);
    expect(collisionSnapshot(desktop)).toEqual(collisionSnapshot(world));
  });
});

describe('park landmarks', () => {
  it('animates water only, without changing colliders or static scenery', () => {
    const world = build(MAPS[0]);
    const ripple = world.scene.getObjectByName('park-water-ripples');
    expect(ripple).toBeInstanceOf(THREE.InstancedMesh);
    if (!(ripple instanceof THREE.InstancedMesh)) throw new Error('Missing ripple pool');
    const before = Array.from(ripple.instanceMatrix.array);
    const collision = collisionSnapshot(world);
    world.update(0.5);
    expect(Array.from(ripple.instanceMatrix.array)).not.toEqual(before);
    expect(collisionSnapshot(world)).toEqual(collision);
  });

  it('keeps ambient water still for reduced-motion preferences', () => {
    vi.stubGlobal('window', { matchMedia: (query: string) => ({ matches: query.includes('reduced-motion') }) });
    const world = build(MAPS[0]);
    const ripple = world.scene.getObjectByName('park-water-ripples');
    if (!(ripple instanceof THREE.InstancedMesh)) throw new Error('Missing ripple pool');
    const before = Array.from(ripple.instanceMatrix.array);
    world.update(2);
    expect(Array.from(ripple.instanceMatrix.array)).toEqual(before);
  });

  it('preserves IDs, names, sizes, and a unique semantic theme', () => {
    expect(MAPS.map(({ id, nameHiragana, sizeMeters, theme }) => [id, nameHiragana, sizeMeters, theme])).toEqual([
      ['pool-park', 'プールパーク', 90, 'pool'],
      ['castle-garden', 'おしろのおにわ', 100, 'castle'],
      ['cloud-plaza', 'くものうえひろば', 80, 'cloud'],
    ]);
  });

  it.each(['castle-garden', 'cloud-plaza'])('%s has an actual traversable arch, not a group-sized collider', (id) => {
    const map = MAPS.find((entry) => entry.id === id)!;
    const world = build(map);
    const gate = map.decorations.findIndex((d) => d.kind === 'castle-gate' || d.kind === 'rainbow-gate');
    const parts = world.collision.movingColliders().filter((c) => c.id.startsWith(`deco-${gate}-`));
    expect(parts.length).toBeGreaterThan(3);
    expect(world.collision.raycast(new THREE.Vector3(0, 1, -26), new THREE.Vector3(0, 0, 1), 16)).toBeNull();
    const move = world.collision.resolveCapsuleMove(
      new THREE.Vector3(0, 0.9, -26), new THREE.Vector3(0.5, 0.9, 0.5), new THREE.Vector3(0, 0.9, -10),
    );
    expect(move.hitWall).toBe(false);
    expect(move.position.z).toBeCloseTo(-10);
    const supportX = id === 'castle-garden' ? 6 : 8;
    expect(world.collision.raycast(new THREE.Vector3(supportX, 1, -26), new THREE.Vector3(0, 0, 1), 16)).not.toBeNull();
  });

  it('supports legacy primitives without browser-only APIs', () => {
    vi.stubGlobal('window', undefined);
    const map: MapConfig = {
      ...MAPS[0], theme: undefined, decorations: [
        { kind: 'box', position: [5, 1, 5], size: [2, 2, 2], color: 0xffffff },
        { kind: 'cylinder', position: [-5, 1, 5], size: [2, 2, 2], color: 0xffffff },
        { kind: 'pyramid', position: [5, 1, -5], size: [2, 2, 2], color: 0xffffff },
        { kind: 'sphere', position: [-5, 1, -5], size: [2, 2, 2], color: 0xffffff },
      ],
    };
    const world = build(map);
    expect(world.collision.get('deco-0-body')?.aabb.min.toArray()).toEqual([4, 0, 4]);
    expect(world.collision.movingColliders()).toHaveLength(8);
  });

  it('draws the cloud plaza star above ordered floor inlays without depth fighting', () => {
    const world = build(MAPS[2]);
    const star = world.scene.getObjectByName('plaza-star');
    expect(star).toBeInstanceOf(THREE.Mesh);
    expect(star?.renderOrder).toBe(45);
    if (star instanceof THREE.Mesh && star.material instanceof THREE.MeshStandardMaterial) {
      expect(star.material.depthWrite).toBe(false);
      expect(star.material.polygonOffset).toBe(true);
      expect(star.material.userData.sharedVisualResource).toBeUndefined();
    }
  });
});
