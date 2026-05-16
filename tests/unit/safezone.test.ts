import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SafeZone } from '@/game/systems/SafeZone';

describe('SafeZone', () => {
  it('shrinks over time but not below minRadius', () => {
    const z = new SafeZone(50, 10, 100);
    expect(z.radius).toBe(50);
    z.update(50);
    expect(z.radius).toBeLessThan(50);
    z.update(1000);
    expect(z.radius).toBe(10);
  });

  it('isOutside is true beyond radius', () => {
    const z = new SafeZone(30);
    expect(z.isOutside(new THREE.Vector3(0, 0, 0))).toBe(false);
    expect(z.isOutside(new THREE.Vector3(40, 0, 0))).toBe(true);
  });

  it('isOutside uses XZ distance only', () => {
    const z = new SafeZone(10);
    expect(z.isOutside(new THREE.Vector3(0, 100, 0))).toBe(false);
    expect(z.isOutside(new THREE.Vector3(20, 0, 0))).toBe(true);
  });
});
