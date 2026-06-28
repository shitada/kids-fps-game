import * as THREE from 'three';

type DisposableResource = THREE.BufferGeometry | THREE.Material;

/** マテリアル単体／配列のどちらでも安全に dispose する。 */
export function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    for (const m of material) m.dispose();
  } else {
    material.dispose();
  }
}

function collectResources(obj: THREE.Object3D, sink: (resource: DisposableResource) => void): void {
  const mesh = obj as Partial<Pick<THREE.Mesh, 'geometry' | 'material'>>;
  if (mesh.geometry) sink(mesh.geometry);
  const material = mesh.material;
  if (Array.isArray(material)) {
    for (const m of material) sink(m);
  } else if (material) {
    sink(material);
  }
}

/**
 * root 以下のジオメトリ／マテリアルをすべて dispose する。
 *
 * 注意: モジュール共有のジオメトリ／マテリアル（AgentVisual の GEOMETRIES や
 * Projectile のモジュール定数など）を含むツリーには使わないこと。共有リソースを
 * 破棄すると次のバトルで描画が壊れる。各バトルで固有に生成されたサブツリー
 * （ワールド・ピックアップ・プレビューなど）専用。共有リソースを除外したい場合は
 * `skip` を渡す。
 */
export function disposeObject3D(
  root: THREE.Object3D,
  skip?: (resource: DisposableResource) => boolean,
): void {
  const seen = new Set<DisposableResource>();
  root.traverse((obj) => {
    collectResources(obj, (resource) => {
      if (seen.has(resource)) return;
      seen.add(resource);
      if (skip?.(resource)) return;
      resource.dispose();
    });
  });
}
