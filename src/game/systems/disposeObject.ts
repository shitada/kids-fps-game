import * as THREE from 'three';

/**
 * Object3D 以下のジオメトリとマテリアルをまとめて破棄する。
 * three.js の `WebGLRenderer.dispose()` では GPU バッファは解放されず、
 * ジオメトリ／マテリアルの `dispose()` を呼ぶ必要がある。
 * バトルをやりなおすたびにシーンを作り直すので、ここを怠るとリークする。
 */
export function disposeObject3D(root: THREE.Object3D): number {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((obj) => {
    const withGeometry = obj as Partial<THREE.Mesh>;
    if (withGeometry.geometry) geometries.add(withGeometry.geometry);
    const material = (obj as Partial<THREE.Mesh>).material;
    if (Array.isArray(material)) {
      for (const m of material) materials.add(m);
    } else if (material) {
      materials.add(material);
    }
    if (obj instanceof THREE.InstancedMesh) obj.dispose();
  });

  let released = 0;
  for (const g of geometries) {
    if (!g.userData.sharedVisualResource) {
      g.dispose();
      released++;
    }
  }
  for (const m of materials) {
    if (!m.userData.sharedVisualResource) {
      m.dispose();
      released++;
    }
  }

  root.clear();
  return released;
}
