import * as THREE from 'three';
import type { BuildPieceKind } from '@/types';
import { BUILD_PIECES, BUILD_PIECE_SIZE } from '@/game/config/build';
import { CollisionWorld, makeAABB } from '@/game/systems/CollisionWorld';
import { disposeObject3D } from '@/game/systems/disposeObject';
import { roundedBox, sharedGeometry, toyMaterial } from '@/game/systems/VisualResources';

export interface BuildPiece {
  id: string;
  kind: BuildPieceKind;
  hp: number;
  ownerId: string;
  mesh: THREE.Object3D;
  colliderId: string;
}

let buildCounter = 0;

export function createBuildVisual(
  kind: BuildPieceKind,
  ownerColor: number,
  previewMaterial?: THREE.Material,
  outlineMaterial?: THREE.LineBasicMaterial,
): THREE.Group {
  const tint = new THREE.Color(ownerColor).lerp(new THREE.Color(0xfff3d9), 0.45).getHex();
  const body = previewMaterial ?? toyMaterial(tint, 0.55);
  const trim = previewMaterial ?? toyMaterial(0xfff3d9, 0.5);
  const group = new THREE.Group();
  group.name = `toy-build-${kind}`;
  const size = BUILD_PIECE_SIZE;
  const block = (w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(roundedBox(w, h, d, 0.1), material);
    mesh.position.set(x, y, z);
    if (outlineMaterial) {
      const edges = sharedGeometry(`build-boundary-${w}-${h}-${d}`, () => {
        const boundary = new THREE.BoxGeometry(w, h, d);
        const geometry = new THREE.EdgesGeometry(boundary);
        boundary.dispose();
        return geometry;
      });
      const outline = new THREE.LineSegments(edges, outlineMaterial);
      outline.name = 'build-preview-outline';
      mesh.add(outline);
    }
    group.add(mesh);
  };
  if (kind === 'wall') {
    for (let row = 0; row < 4; row++) {
      block(size, 0.98, 0.4, row % 2 ? body : trim, 0, -1.5 + row);
    }
    block(0.28, 3.7, 0.42, body, -1.72);
    block(0.28, 3.7, 0.42, body, 1.72);
  } else if (kind === 'floor') {
    block(size, 0.4, size, body);
    for (let x = 0; x < 2; x++) {
      for (let z = 0; z < 2; z++) {
        block(1.72, 0.02, 1.72, trim, x * 1.9 - 0.95, 0.2, z * 1.9 - 0.95);
      }
    }
  } else {
    for (let i = 0; i < 4; i++) {
      block(size, i + 1, 1, i % 2 ? trim : body, 0, -size / 2 + (i + 1) / 2, 1.5 - i);
    }
  }
  return group;
}

export function snapToGrid(pos: THREE.Vector3): THREE.Vector3 {
  const s = BUILD_PIECE_SIZE;
  return new THREE.Vector3(
    Math.round(pos.x / s) * s,
    pos.y,
    Math.round(pos.z / s) * s,
  );
}

export function placePieceAabb(kind: BuildPieceKind, centerCandidate: THREE.Vector3, yawIndex: number): { center: THREE.Vector3; size: THREE.Vector3 } {
  const s = BUILD_PIECE_SIZE;
  const c = centerCandidate.clone();
  if (kind === 'wall') {
    const horizontal = yawIndex % 2 === 0;
    const size = horizontal
      ? new THREE.Vector3(s, s, 0.4)
      : new THREE.Vector3(0.4, s, s);
    c.y = s / 2;
    return { center: c, size };
  }
  if (kind === 'floor') {
    c.y = 0.2;
    return { center: c, size: new THREE.Vector3(s, 0.4, s) };
  }
  c.y = s / 2;
  return { center: c, size: new THREE.Vector3(s, s, s) };
}

export class BuildManager {
  private scene: THREE.Scene;
  private collision: CollisionWorld;
  private pieces = new Map<string, BuildPiece>();

  constructor(scene: THREE.Scene, collision: CollisionWorld) {
    this.scene = scene;
    this.collision = collision;
  }

  /** そこに置けるか（素材は見ない）。プレビューの色分けに使う。 */
  isBlocked(kind: BuildPieceKind, centerCandidate: THREE.Vector3, yawIndex: number): boolean {
    const { center, size } = placePieceAabb(kind, centerCandidate, yawIndex);
    const aabb = makeAABB(center, size);
    for (const c of this.collision.movingColliders()) {
      if (aabbIntersect(aabb, c.aabb)) return true;
    }
    return false;
  }

  tryPlace(
    kind: BuildPieceKind,
    centerCandidate: THREE.Vector3,
    yawIndex: number,
    ownerId: string,
    ownerColor: number,
  ): BuildPiece | null {
    const conf = BUILD_PIECES[kind];
    const { center, size } = placePieceAabb(kind, centerCandidate, yawIndex);
    const aabb = makeAABB(center, size);

    // 既存コライダー（壁・床・キャラのアタリ）と重なるなら設置不可
    for (const c of this.collision.movingColliders()) {
      if (aabbIntersect(aabb, c.aabb)) return null;
    }

    const mesh = createBuildVisual(kind, ownerColor);
    mesh.position.copy(center);
    if (kind === 'wall' && yawIndex % 2 !== 0) {
      mesh.rotation.y = Math.PI / 2;
    }
    if (kind === 'stair') {
      mesh.rotation.y = (yawIndex * Math.PI) / 2;
    }
    this.scene.add(mesh);

    const colliderId = `build-${buildCounter++}`;
    this.collision.add({
      id: colliderId,
      aabb,
      blocksMovement: true,
      blocksProjectile: true,
    });

    const piece: BuildPiece = {
      id: colliderId,
      kind,
      hp: conf.hp,
      ownerId,
      mesh,
      colliderId,
    };
    this.pieces.set(piece.id, piece);
    return piece;
  }

  damagePiece(id: string, amount: number): boolean {
    const p = this.pieces.get(id);
    if (!p) return false;
    p.hp -= amount;
    if (p.hp <= 0) {
      this.remove(p.id);
      return true;
    }
    return false;
  }

  remove(id: string): void {
    const p = this.pieces.get(id);
    if (!p) return;
    this.scene.remove(p.mesh);
    // ピースはグループなので、中のジオメトリ／マテリアルもまとめて破棄する
    disposeObject3D(p.mesh);
    this.collision.remove(p.colliderId);
    this.pieces.delete(id);
  }

  clear(): void {
    for (const id of Array.from(this.pieces.keys())) this.remove(id);
  }

  getPiece(id: string): BuildPiece | undefined {
    return this.pieces.get(id);
  }
}

function aabbIntersect(a: { min: THREE.Vector3; max: THREE.Vector3 }, b: { min: THREE.Vector3; max: THREE.Vector3 }): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}
