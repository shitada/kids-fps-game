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

  it('does not shrink during the grace period', () => {
    const z = new SafeZone(50, { minRadius: 10, shrinkSeconds: 100, graceSeconds: 20 });
    z.update(10);
    expect(z.radius).toBe(50);
    expect(z.secondsUntilShrink).toBeCloseTo(10);
    z.update(15);
    expect(z.radius).toBeLessThan(50);
    expect(z.secondsUntilShrink).toBe(0);
  });

  it('reports how far outside the zone a position is', () => {
    const z = new SafeZone(20);
    expect(z.distanceOutside(new THREE.Vector3(0, 0, 0))).toBe(0);
    expect(z.distanceOutside(new THREE.Vector3(25, 0, 0))).toBeCloseTo(5);
  });

  it('keeps a configurable damage rate', () => {
    const z = new SafeZone(20, { damagePerSecond: 3 });
    expect(z.damagePerSecond).toBe(3);
  });

  it('scales the visual instead of rebuilding geometry every update', () => {
    const z = new SafeZone(40, { minRadius: 10, shrinkSeconds: 50, graceSeconds: 0 });
    const geometries = z.visual.children.map((c) => (c as THREE.Mesh).geometry);
    z.update(5);
    const after = z.visual.children.map((c) => (c as THREE.Mesh).geometry);
    expect(after).toEqual(geometries);
  });
});
