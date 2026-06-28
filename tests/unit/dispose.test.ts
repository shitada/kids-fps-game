import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { disposeObject3D, disposeMaterial } from '@/game/util/dispose';
import { Agent } from '@/game/entities/Agent';
import { createFirstPersonWaterGun, disposeAgentResources } from '@/game/entities/AgentVisual';
import { SKINS } from '@/game/config/skins';
import { SafeZone } from '@/game/systems/SafeZone';
import { WaterSplashPool } from '@/game/effects/WaterSplash';
import { BuildManager } from '@/game/entities/BuildPiece';
import { createPickup, disposePickup } from '@/game/entities/Pickup';
import { CollisionWorld } from '@/game/systems/CollisionWorld';

function recordingScene(): { scene: THREE.Scene; added: THREE.Object3D[]; removed: THREE.Object3D[] } {
  const added: THREE.Object3D[] = [];
  const removed: THREE.Object3D[] = [];
  const scene = {
    add: (o: THREE.Object3D) => { added.push(o); },
    remove: (o: THREE.Object3D) => { removed.push(o); },
  } as unknown as THREE.Scene;
  return { scene, added, removed };
}

/** root 以下の最初の「共有」「固有」ジオメトリを other ツリーとの一致で見分ける。 */
function pickSharedAndUnique(
  root: THREE.Object3D,
  other: THREE.Object3D,
): { shared: THREE.BufferGeometry; unique: THREE.BufferGeometry } {
  const otherGeoms = new Set<THREE.BufferGeometry>();
  other.traverse((o) => {
    const g = (o as THREE.Mesh).geometry;
    if (g) otherGeoms.add(g);
  });
  let shared: THREE.BufferGeometry | undefined;
  let unique: THREE.BufferGeometry | undefined;
  root.traverse((o) => {
    const g = (o as THREE.Mesh).geometry;
    if (!g) return;
    if (otherGeoms.has(g)) shared ??= g;
    else unique ??= g;
  });
  expect(shared).toBeDefined();
  expect(unique).toBeDefined();
  return { shared: shared!, unique: unique! };
}

describe('disposeMaterial', () => {
  it('disposes a single material', () => {
    const mat = new THREE.MeshBasicMaterial();
    const spy = vi.spyOn(mat, 'dispose');
    disposeMaterial(mat);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('disposes every material in an array', () => {
    const mats = [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()];
    const spies = mats.map((m) => vi.spyOn(m, 'dispose'));
    disposeMaterial(mats);
    spies.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
  });
});

describe('disposeObject3D', () => {
  it('disposes geometries and materials across the whole tree', () => {
    const root = new THREE.Group();
    const geoA = new THREE.BoxGeometry(1, 1, 1);
    const matA = new THREE.MeshBasicMaterial();
    const geoB = new THREE.SphereGeometry(1, 6, 6);
    const matB = new THREE.MeshBasicMaterial();
    root.add(new THREE.Mesh(geoA, matA));
    const child = new THREE.Group();
    child.add(new THREE.Mesh(geoB, matB));
    root.add(child);

    const spies = [geoA, matA, geoB, matB].map((r) => vi.spyOn(r, 'dispose'));
    disposeObject3D(root);
    spies.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
  });

  it('disposes a shared geometry only once (dedup)', () => {
    const shared = new THREE.BoxGeometry(1, 1, 1);
    const root = new THREE.Group();
    root.add(new THREE.Mesh(shared, new THREE.MeshBasicMaterial()));
    root.add(new THREE.Mesh(shared, new THREE.MeshBasicMaterial()));
    const spy = vi.spyOn(shared, 'dispose');
    disposeObject3D(root);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('skips resources matched by the skip predicate', () => {
    const keep = new THREE.BoxGeometry(1, 1, 1);
    const drop = new THREE.SphereGeometry(1, 6, 6);
    const root = new THREE.Group();
    root.add(new THREE.Mesh(keep, new THREE.MeshBasicMaterial()));
    root.add(new THREE.Mesh(drop, new THREE.MeshBasicMaterial()));
    const keepSpy = vi.spyOn(keep, 'dispose');
    const dropSpy = vi.spyOn(drop, 'dispose');
    disposeObject3D(root, (r) => r === keep);
    expect(keepSpy).not.toHaveBeenCalled();
    expect(dropSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Agent.dispose (shared-aware)', () => {
  it('disposes per-instance geometry but never the module-shared geometry', () => {
    const a = new Agent('a', false, SKINS.kuma);
    const b = new Agent('b', false, SKINS.kuma);
    const { shared, unique } = pickSharedAndUnique(a.mesh, b.mesh);

    const sharedSpy = vi.spyOn(shared, 'dispose');
    const uniqueSpy = vi.spyOn(unique, 'dispose');
    a.dispose();
    expect(sharedSpy).not.toHaveBeenCalled();
    expect(uniqueSpy).toHaveBeenCalledTimes(1);
  });
});

describe('disposeAgentResources on the first-person water gun', () => {
  it('disposes unique gun geometry but keeps shared geometry', () => {
    const gunA = createFirstPersonWaterGun(SKINS.usagi);
    const gunB = createFirstPersonWaterGun(SKINS.usagi);
    const { shared, unique } = pickSharedAndUnique(gunA, gunB);

    const sharedSpy = vi.spyOn(shared, 'dispose');
    const uniqueSpy = vi.spyOn(unique, 'dispose');
    disposeAgentResources(gunA);
    expect(sharedSpy).not.toHaveBeenCalled();
    expect(uniqueSpy).toHaveBeenCalledTimes(1);
  });
});

describe('SafeZone.dispose', () => {
  it('disposes the ring geometry and material', () => {
    const z = new SafeZone(30, 8, 100);
    const geoSpy = vi.spyOn(z.visual.geometry, 'dispose');
    const matSpy = vi.spyOn(z.visual.material as THREE.Material, 'dispose');
    z.dispose();
    expect(geoSpy).toHaveBeenCalledTimes(1);
    expect(matSpy).toHaveBeenCalledTimes(1);
  });
});

describe('WaterSplashPool.dispose', () => {
  it('removes active particles and disposes particle materials plus the base geometry', () => {
    const { scene, added, removed } = recordingScene();
    const pool = new WaterSplashPool(scene);
    pool.burst(new THREE.Vector3(0, 0, 0), 3, 4);

    const particles = added.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh);
    expect(particles.length).toBe(3);
    // Particle meshes reuse the pool's single base geometry instance.
    const baseGeoSpy = vi.spyOn(particles[0].geometry, 'dispose');
    const matSpies = particles.map((p) => vi.spyOn(p.material as THREE.Material, 'dispose'));

    pool.dispose();

    particles.forEach((p) => expect(removed).toContain(p));
    expect(baseGeoSpy).toHaveBeenCalled();
    matSpies.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
  });

  it('does not throw when disposing an empty pool', () => {
    const { scene } = recordingScene();
    const pool = new WaterSplashPool(scene);
    expect(() => pool.dispose()).not.toThrow();
  });
});

describe('BuildManager.remove disposes resources', () => {
  it('disposes the piece geometry and material on removal', () => {
    const collision = new CollisionWorld();
    const { scene } = recordingScene();
    const mgr = new BuildManager(scene, collision);
    const piece = mgr.tryPlace('wall', new THREE.Vector3(4, 0, 0), 0, 'p1', 0xff0000)!;
    const geoSpy = vi.spyOn(piece.mesh.geometry, 'dispose');
    const matSpy = vi.spyOn(piece.mesh.material as THREE.Material, 'dispose');
    mgr.remove(piece.id);
    expect(geoSpy).toHaveBeenCalledTimes(1);
    expect(matSpy).toHaveBeenCalledTimes(1);
  });
});

describe('disposePickup', () => {
  it('removes the pickup mesh from the scene and disposes its resources', () => {
    const { scene, removed } = recordingScene();
    const pickup = createPickup(scene, 'water-tank', [2, 2]);
    const geoSpy = vi.spyOn(pickup.mesh.geometry, 'dispose');
    const matSpy = vi.spyOn(pickup.mesh.material as THREE.Material, 'dispose');
    disposePickup(scene, pickup);
    expect(removed).toContain(pickup.mesh);
    expect(geoSpy).toHaveBeenCalledTimes(1);
    expect(matSpy).toHaveBeenCalledTimes(1);
  });
});
