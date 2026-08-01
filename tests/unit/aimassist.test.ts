import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyAimAssist, aimAssistParamsFor } from '@/game/systems/AimAssist';

const origin = new THREE.Vector3(0, 1.5, 0);
const forward = new THREE.Vector3(0, 0, -1);

describe('applyAimAssist', () => {
  it('does nothing when strength is zero', () => {
    const result = applyAimAssist(
      origin,
      forward,
      [{ id: 'a', point: new THREE.Vector3(2, 1.5, -10) }],
      { maxAngleRad: 0.5, maxDistance: 40, strength: 0 },
    );
    expect(result.targetId).toBeNull();
    expect(result.direction.z).toBeCloseTo(-1, 5);
  });

  it('nudges the aim toward a target inside the cone without snapping fully', () => {
    const target = new THREE.Vector3(1, 1.5, -10);
    const result = applyAimAssist(origin, forward, [{ id: 'a', point: target }], {
      maxAngleRad: 0.4,
      maxDistance: 40,
      strength: 0.5,
    });
    expect(result.targetId).toBe('a');
    expect(result.direction.x).toBeGreaterThan(0);
    const exact = target.clone().sub(origin).normalize();
    expect(result.direction.x).toBeLessThan(exact.x);
  });

  it('ignores targets outside the cone', () => {
    const result = applyAimAssist(origin, forward, [{ id: 'a', point: new THREE.Vector3(20, 1.5, -1) }], {
      maxAngleRad: 0.2,
      maxDistance: 40,
      strength: 0.8,
    });
    expect(result.targetId).toBeNull();
  });

  it('ignores targets that are too far away', () => {
    const result = applyAimAssist(origin, forward, [{ id: 'a', point: new THREE.Vector3(0, 1.5, -100) }], {
      maxAngleRad: 0.4,
      maxDistance: 40,
      strength: 0.8,
    });
    expect(result.targetId).toBeNull();
  });

  it('skips targets without line of sight', () => {
    const result = applyAimAssist(
      origin,
      forward,
      [{ id: 'a', point: new THREE.Vector3(0.5, 1.5, -10) }],
      { maxAngleRad: 0.4, maxDistance: 40, strength: 0.8 },
      () => false,
    );
    expect(result.targetId).toBeNull();
  });

  it('picks the target closest to the centre of the screen', () => {
    const result = applyAimAssist(
      origin,
      forward,
      [
        { id: 'far', point: new THREE.Vector3(3, 1.5, -10) },
        { id: 'near', point: new THREE.Vector3(0.3, 1.5, -10) },
      ],
      { maxAngleRad: 0.5, maxDistance: 40, strength: 0.6 },
    );
    expect(result.targetId).toBe('near');
  });

  it('always returns a normalised direction', () => {
    const result = applyAimAssist(origin, forward, [{ id: 'a', point: new THREE.Vector3(2, 3, -10) }], {
      maxAngleRad: 0.5,
      maxDistance: 40,
      strength: 0.7,
    });
    expect(result.direction.length()).toBeCloseTo(1, 5);
  });
});

describe('aimAssistParamsFor', () => {
  it('helps touch players more than mouse players', () => {
    expect(aimAssistParamsFor(true, 'normal').strength).toBeGreaterThan(aimAssistParamsFor(false, 'normal').strength);
    expect(aimAssistParamsFor(true, 'normal').maxAngleRad).toBeGreaterThan(
      aimAssistParamsFor(false, 'normal').maxAngleRad,
    );
  });

  it('helps easy difficulty more than hard difficulty', () => {
    expect(aimAssistParamsFor(true, 'easy').strength).toBeGreaterThan(aimAssistParamsFor(true, 'hard').strength);
    expect(aimAssistParamsFor(false, 'easy').strength).toBeGreaterThan(aimAssistParamsFor(false, 'hard').strength);
  });

  it('never snaps the aim completely', () => {
    for (const touch of [true, false]) {
      for (const difficulty of ['easy', 'normal', 'hard'] as const) {
        const params = aimAssistParamsFor(touch, difficulty);
        expect(params.strength).toBeGreaterThan(0);
        expect(params.strength).toBeLessThanOrEqual(1);
      }
    }
  });
});
