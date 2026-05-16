import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld, makeAABB, aabbIntersect, rayAabbDistance } from '@/game/systems/CollisionWorld';

describe('CollisionWorld AABB', () => {
  it('makeAABB centers the box correctly', () => {
    const aabb = makeAABB(new THREE.Vector3(1, 2, 3), new THREE.Vector3(2, 4, 6));
    expect(aabb.min.x).toBeCloseTo(0);
    expect(aabb.min.y).toBeCloseTo(0);
    expect(aabb.min.z).toBeCloseTo(0);
    expect(aabb.max.x).toBeCloseTo(2);
    expect(aabb.max.y).toBeCloseTo(4);
    expect(aabb.max.z).toBeCloseTo(6);
  });

  it('intersects overlapping AABBs', () => {
    const a = makeAABB(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2));
    const b = makeAABB(new THREE.Vector3(1, 1, 1), new THREE.Vector3(2, 2, 2));
    expect(aabbIntersect(a, b)).toBe(true);
  });

  it('rejects non-overlapping AABBs', () => {
    const a = makeAABB(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2));
    const b = makeAABB(new THREE.Vector3(10, 0, 0), new THREE.Vector3(2, 2, 2));
    expect(aabbIntersect(a, b)).toBe(false);
  });

  it('rayAabbDistance returns positive distance for ray hitting box', () => {
    const box = makeAABB(new THREE.Vector3(5, 0, 0), new THREE.Vector3(2, 2, 2));
    const t = rayAabbDistance(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), box);
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThan(0);
    expect(t!).toBeLessThan(5);
  });

  it('rayAabbDistance returns null for ray missing box', () => {
    const box = makeAABB(new THREE.Vector3(0, 100, 0), new THREE.Vector3(2, 2, 2));
    const t = rayAabbDistance(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), box);
    expect(t).toBeNull();
  });
});

describe('CollisionWorld capsule resolution', () => {
  it('blocks horizontal motion into a wall', () => {
    const w = new CollisionWorld();
    w.add({
      id: 'wall',
      aabb: makeAABB(new THREE.Vector3(5, 1, 0), new THREE.Vector3(2, 4, 4)),
      blocksMovement: true,
      blocksProjectile: true,
    });
    const res = w.resolveCapsuleMove(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0.45, 0.85, 0.45),
      new THREE.Vector3(10, 1, 0),
    );
    expect(res.hitWall).toBe(true);
    expect(res.position.x).toBeLessThan(10);
  });

  it('detects ground when falling onto floor', () => {
    const w = new CollisionWorld();
    const res = w.resolveCapsuleMove(
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(0.45, 0.85, 0.45),
      new THREE.Vector3(0, -1, 0),
    );
    expect(res.onGround).toBe(true);
    expect(res.position.y).toBeCloseTo(0.85);
  });

  it('raycast finds nearest collider', () => {
    const w = new CollisionWorld();
    w.add({
      id: 'near',
      aabb: makeAABB(new THREE.Vector3(5, 0, 0), new THREE.Vector3(2, 2, 2)),
      blocksMovement: true,
      blocksProjectile: true,
    });
    w.add({
      id: 'far',
      aabb: makeAABB(new THREE.Vector3(15, 0, 0), new THREE.Vector3(2, 2, 2)),
      blocksMovement: true,
      blocksProjectile: true,
    });
    const hit = w.raycast(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 100);
    expect(hit).not.toBeNull();
    expect(hit!.collider.id).toBe('near');
  });

  it('raycast ignores specified id', () => {
    const w = new CollisionWorld();
    w.add({
      id: 'self',
      aabb: makeAABB(new THREE.Vector3(2, 0, 0), new THREE.Vector3(2, 2, 2)),
      blocksMovement: false,
      blocksProjectile: true,
    });
    w.add({
      id: 'other',
      aabb: makeAABB(new THREE.Vector3(8, 0, 0), new THREE.Vector3(2, 2, 2)),
      blocksMovement: false,
      blocksProjectile: true,
    });
    const hit = w.raycast(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 100, 'self');
    expect(hit!.collider.id).toBe('other');
  });
});
