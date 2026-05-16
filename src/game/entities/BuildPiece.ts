import * as THREE from 'three';
import type { BuildPieceKind } from '@/types';
import { BUILD_PIECES, BUILD_PIECE_SIZE } from '@/game/config/build';
import { CollisionWorld, makeAABB } from '@/game/systems/CollisionWorld';

export interface BuildPiece {
  id: string;
  kind: BuildPieceKind;
  hp: number;
  ownerId: string;
  mesh: THREE.Mesh;
  colliderId: string;
}

let buildCounter = 0;

function meshFor(kind: BuildPieceKind, ownerColor: number): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  switch (kind) {
    case 'wall':
      geo = new THREE.BoxGeometry(BUILD_PIECE_SIZE, BUILD_PIECE_SIZE, 0.4);
      break;
    case 'floor':
      geo = new THREE.BoxGeometry(BUILD_PIECE_SIZE, 0.4, BUILD_PIECE_SIZE);
      break;
    case 'stair':
      geo = new THREE.ConeGeometry(BUILD_PIECE_SIZE / 2, BUILD_PIECE_SIZE, 4);
      break;
  }
  const mat = new THREE.MeshLambertMaterial({ color: ownerColor });
  return new THREE.Mesh(geo, mat);
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

    const mesh = meshFor(kind, ownerColor);
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
