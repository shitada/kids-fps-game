import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WaterSplashPool } from '@/game/effects/WaterSplash';
import { createBuildVisual } from '@/game/entities/BuildPiece';
import { createPickupVisual } from '@/game/entities/Pickup';
import { disposeObject3D } from '@/game/systems/disposeObject';

describe('toy park effects', () => {
  it('caps and reuses droplets and removes all instanced buffers on exit', () => {
    const scene = new THREE.Scene();
    const effects = new WaterSplashPool(scene);
    const origin = new THREE.Vector3(0, 2, 0);
    effects.burst(origin, 500);
    expect(effects.activeCount).toBe(220);
    effects.update(1);
    expect(effects.activeCount).toBe(0);
    effects.burst(origin, 12);
    expect(effects.activeCount).toBe(12);
    effects.cloudBurst(origin);
    effects.update(0.1);
    const clouds = scene.getObjectByName('farewell-clouds');
    expect(clouds).toBeInstanceOf(THREE.InstancedMesh);
    if (clouds instanceof THREE.InstancedMesh) expect(clouds.count).toBe(5);
    effects.dispose();
    expect(scene.children).toHaveLength(0);
    expect(effects.activeCount).toBe(0);
  });

  it.each(['wall', 'floor', 'stair'] as const)('uses the actual %s geometry in its placement preview', (kind) => {
    const previewMaterial = new THREE.MeshBasicMaterial({ transparent: true });
    const preview = createBuildVisual(kind, 0xaabbcc, previewMaterial);
    const placed = createBuildVisual(kind, 0xaabbcc);
    expect(preview.children.length).toBe(placed.children.length);
    const previewBounds = new THREE.Box3().setFromObject(preview);
    const placedBounds = new THREE.Box3().setFromObject(placed);
    expect(previewBounds.equals(placedBounds)).toBe(true);
    preview.traverse((object) => {
      if (object instanceof THREE.Mesh) expect(object.material).toBe(previewMaterial);
    });
    disposeObject3D(preview);
    disposeObject3D(placed);
  });

  it('gives all four pickups distinct composite silhouettes', () => {
    for (const kind of ['water-tank', 'weapon-chest', 'wood-node', 'stone-node'] as const) {
      const model = createPickupVisual(kind);
      expect(model.name).toBe(`pickup-${kind}`);
      expect(model.children.length).toBeGreaterThanOrEqual(4);
      const bounds = new THREE.Box3().setFromObject(model);
      expect(bounds.isEmpty()).toBe(false);
      disposeObject3D(model);
    }
  });

  it('outlines every stair segment so its direction is readable in a translucent preview', () => {
    const fill = new THREE.MeshBasicMaterial({ transparent: true });
    const line = new THREE.LineBasicMaterial();
    const stairs = createBuildVisual('stair', 0xaabbcc, fill, line);
    expect(stairs.children).toHaveLength(4);
    for (const step of stairs.children) {
      const outline = step.getObjectByName('build-preview-outline');
      expect(outline).toBeInstanceOf(THREE.LineSegments);
      if (outline instanceof THREE.LineSegments) {
        expect(outline.geometry.getAttribute('position').count).toBe(24);
      }
    }
    disposeObject3D(stairs);
  });
});
