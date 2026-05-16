import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { snapToGrid, placePieceAabb, BuildManager } from '@/game/entities/BuildPiece';
import { CollisionWorld, makeAABB } from '@/game/systems/CollisionWorld';

describe('BuildPiece grid math', () => {
  it('snapToGrid rounds to nearest 4m', () => {
    expect(snapToGrid(new THREE.Vector3(3.4, 0, 9.9)).x).toBe(4);
    expect(snapToGrid(new THREE.Vector3(3.4, 0, 9.9)).z).toBe(8);
  });

  it('placePieceAabb returns correct dims for each kind', () => {
    const wall = placePieceAabb('wall', new THREE.Vector3(0, 0, 0), 0);
    expect(wall.size.x).toBe(4);
    expect(wall.size.z).toBeCloseTo(0.4);
    const wallRot = placePieceAabb('wall', new THREE.Vector3(0, 0, 0), 1);
    expect(wallRot.size.x).toBeCloseTo(0.4);
    expect(wallRot.size.z).toBe(4);
    const floor = placePieceAabb('floor', new THREE.Vector3(0, 0, 0), 0);
    expect(floor.size.y).toBeCloseTo(0.4);
  });
});

describe('BuildManager', () => {
  it('places a piece that does not overlap existing colliders', () => {
    const collision = new CollisionWorld();
    const scene = { add: () => {}, remove: () => {} } as unknown as THREE.Scene;
    const mgr = new BuildManager(scene, collision);
    const piece = mgr.tryPlace('wall', new THREE.Vector3(4, 0, 0), 0, 'p1', 0xff0000);
    expect(piece).not.toBeNull();
  });

  it('rejects placement that overlaps an existing collider', () => {
    const collision = new CollisionWorld();
    collision.add({
      id: 'blocker',
      aabb: makeAABB(new THREE.Vector3(4, 2, 0), new THREE.Vector3(4, 4, 4)),
      blocksMovement: true,
      blocksProjectile: true,
    });
    const scene = { add: () => {}, remove: () => {} } as unknown as THREE.Scene;
    const mgr = new BuildManager(scene, collision);
    const piece = mgr.tryPlace('wall', new THREE.Vector3(4, 0, 0), 0, 'p1', 0xff0000);
    expect(piece).toBeNull();
  });

  it('damagePiece returns true when piece is destroyed', () => {
    const collision = new CollisionWorld();
    const scene = { add: () => {}, remove: () => {} } as unknown as THREE.Scene;
    const mgr = new BuildManager(scene, collision);
    const piece = mgr.tryPlace('wall', new THREE.Vector3(4, 0, 0), 0, 'p1', 0xff0000)!;
    expect(mgr.damagePiece(piece.id, 50)).toBe(false);
    expect(mgr.damagePiece(piece.id, 200)).toBe(true);
    expect(mgr.getPiece(piece.id)).toBeUndefined();
  });
});
