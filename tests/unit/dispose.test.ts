import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { disposeObject3D } from '@/game/systems/disposeObject';

describe('disposeObject3D', () => {
  it('disposes every geometry and material under the root', () => {
    const root = new THREE.Group();
    const geoA = new THREE.BoxGeometry(1, 1, 1);
    const matA = new THREE.MeshBasicMaterial();
    const geoB = new THREE.SphereGeometry(1);
    const matB = new THREE.MeshLambertMaterial();
    const child = new THREE.Group();
    child.add(new THREE.Mesh(geoB, matB));
    root.add(new THREE.Mesh(geoA, matA), child);

    let geometryDisposals = 0;
    let materialDisposals = 0;
    geoA.addEventListener('dispose', () => geometryDisposals++);
    geoB.addEventListener('dispose', () => geometryDisposals++);
    matA.addEventListener('dispose', () => materialDisposals++);
    matB.addEventListener('dispose', () => materialDisposals++);

    disposeObject3D(root);

    expect(geometryDisposals).toBe(2);
    expect(materialDisposals).toBe(2);
    expect(root.children).toHaveLength(0);
  });

  it('disposes shared resources only once', () => {
    const root = new THREE.Group();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial();
    root.add(new THREE.Mesh(geo, mat), new THREE.Mesh(geo, mat), new THREE.Mesh(geo, mat));

    let disposals = 0;
    geo.addEventListener('dispose', () => disposals++);
    disposeObject3D(root);
    expect(disposals).toBe(1);
  });

  it('handles multi-material meshes', () => {
    const root = new THREE.Group();
    const mats = [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()];
    let disposals = 0;
    mats.forEach((m) => m.addEventListener('dispose', () => disposals++));
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats));
    disposeObject3D(root);
    expect(disposals).toBe(2);
  });

  it('handles objects without geometry, such as lights and cameras', () => {
    const root = new THREE.Group();
    root.add(new THREE.AmbientLight(0xffffff), new THREE.PerspectiveCamera());
    expect(() => disposeObject3D(root)).not.toThrow();
  });

  it('reports how many resources it released', () => {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    expect(disposeObject3D(root)).toBe(2);
  });
});
