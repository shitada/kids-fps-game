import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { WEAPONS } from '@/game/config/weapons';
import { disposeProjectile, spawnProjectile, syncProjectileVisual } from '@/game/entities/Projectile';

describe('Projectile visuals', () => {
  it('spawns a visible water trail and removes it with the projectile', () => {
    const scene = new THREE.Scene();
    const origin = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3(0, 0, -1);

    const projectile = spawnProjectile(scene, 'water-gun', WEAPONS['water-gun'], origin, direction, 'cpu-1', 8);

    expect(scene.children).toContain(projectile.mesh);
    expect(projectile.mesh.userData.kind).toBe('projectile');
    expect(projectile.trail.userData.kind).toBe('projectile-trail');
    expect(projectile.mesh.children).toContain(projectile.trail);

    disposeProjectile(scene, projectile);

    expect(scene.children).not.toContain(projectile.mesh);
  });

  it('syncs the projectile visual position and travel direction', () => {
    const scene = new THREE.Scene();
    const projectile = spawnProjectile(
      scene,
      'water-gun',
      WEAPONS['water-gun'],
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(1, 0, 0),
      'cpu-1',
      8,
    );

    projectile.position.set(2, 3, 4);
    projectile.velocity.set(WEAPONS['water-gun'].projectileSpeed, 0, 0);
    syncProjectileVisual(projectile);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(projectile.mesh.quaternion);
    expect(projectile.mesh.position.x).toBe(2);
    expect(projectile.mesh.position.y).toBe(3);
    expect(projectile.mesh.position.z).toBe(4);
    expect(forward.x).toBeCloseTo(1, 5);
  });
});
