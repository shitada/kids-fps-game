import * as THREE from 'three';

export interface AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export function makeAABB(center: THREE.Vector3, size: THREE.Vector3): AABB {
  const half = size.clone().multiplyScalar(0.5);
  return {
    min: center.clone().sub(half),
    max: center.clone().add(half),
  };
}

export function aabbIntersect(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

export function pointInAABB(p: THREE.Vector3, b: AABB): boolean {
  return (
    p.x >= b.min.x && p.x <= b.max.x &&
    p.y >= b.min.y && p.y <= b.max.y &&
    p.z >= b.min.z && p.z <= b.max.z
  );
}

export function distanceXZ(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export interface Collider {
  aabb: AABB;
  blocksProjectile: boolean;
  blocksMovement: boolean;
  id: string;
}

export class CollisionWorld {
  private colliders: Collider[] = [];
  private byId = new Map<string, Collider>();

  add(c: Collider): void {
    this.colliders.push(c);
    this.byId.set(c.id, c);
  }

  remove(id: string): void {
    const c = this.byId.get(id);
    if (!c) return;
    this.byId.delete(id);
    const idx = this.colliders.indexOf(c);
    if (idx >= 0) this.colliders.splice(idx, 1);
  }

  clear(): void {
    this.colliders = [];
    this.byId.clear();
  }

  movingColliders(): Collider[] {
    return this.colliders.filter((c) => c.blocksMovement);
  }

  projectileColliders(): Collider[] {
    return this.colliders.filter((c) => c.blocksProjectile);
  }

  /**
   * 移動 AABB（プレイヤーやエージェントの体）と環境の AABB の衝突を
   * 軸別に解消する。返り値は補正後の中心座標。
   * 大きな移動は半径より小さなサブステップに分割してトンネリングを防ぐ。
   */
  resolveCapsuleMove(
    currentCenter: THREE.Vector3,
    halfExtents: THREE.Vector3,
    desiredCenter: THREE.Vector3,
  ): { position: THREE.Vector3; onGround: boolean; hitWall: boolean } {
    const delta = desiredCenter.clone().sub(currentCenter);
    const maxStep = Math.min(halfExtents.x, halfExtents.z, halfExtents.y) * 0.8;
    const dist = delta.length();
    const steps = Math.max(1, Math.ceil(dist / Math.max(0.001, maxStep)));
    let pos = currentCenter.clone();
    let onGround = false;
    let hitWall = false;
    for (let i = 0; i < steps; i++) {
      const target = pos.clone().add(delta.clone().multiplyScalar(1 / steps));
      const r = this.resolveStep(pos, halfExtents, target);
      pos = r.position;
      if (r.onGround) onGround = true;
      if (r.hitWall) hitWall = true;
    }
    return { position: pos, onGround, hitWall };
  }

  private resolveStep(
    currentCenter: THREE.Vector3,
    halfExtents: THREE.Vector3,
    desiredCenter: THREE.Vector3,
  ): { position: THREE.Vector3; onGround: boolean; hitWall: boolean } {
    const out = currentCenter.clone();
    let onGround = false;
    let hitWall = false;

    const tryAxis = (axis: 'x' | 'y' | 'z'): void => {
      const before = out[axis];
      out[axis] = desiredCenter[axis];
      const aabb = makeAABB(out, halfExtents.clone().multiplyScalar(2));
      for (const c of this.colliders) {
        if (!c.blocksMovement) continue;
        if (!aabbIntersect(aabb, c.aabb)) continue;
        if (axis === 'y') {
          if (desiredCenter.y < before) {
            out.y = c.aabb.max.y + halfExtents.y + 0.001;
            onGround = true;
          } else {
            out.y = c.aabb.min.y - halfExtents.y - 0.001;
          }
        } else {
          out[axis] = before;
          hitWall = true;
          break;
        }
      }
    };

    tryAxis('x');
    tryAxis('z');
    tryAxis('y');

    if (out.y - halfExtents.y <= 0.001) {
      out.y = halfExtents.y;
      onGround = true;
    }
    return { position: out, onGround, hitWall };
  }

  /** レイ vs AABB の最近接コライダーと距離を返す */
  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    ignoreId?: string,
  ): { collider: Collider; distance: number; point: THREE.Vector3 } | null {
    let nearest: { collider: Collider; distance: number; point: THREE.Vector3 } | null = null;
    for (const c of this.colliders) {
      if (!c.blocksProjectile) continue;
      if (ignoreId && c.id === ignoreId) continue;
      const t = rayAabbDistance(origin, direction, c.aabb);
      if (t === null || t < 0 || t > maxDistance) continue;
      if (!nearest || t < nearest.distance) {
        const point = origin.clone().add(direction.clone().multiplyScalar(t));
        nearest = { collider: c, distance: t, point };
      }
    }
    return nearest;
  }
}

export function rayAabbDistance(origin: THREE.Vector3, dir: THREE.Vector3, b: AABB): number | null {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (const axis of ['x', 'y', 'z'] as const) {
    const o = origin[axis];
    const d = dir[axis];
    const min = b.min[axis];
    const max = b.max[axis];
    if (Math.abs(d) < 1e-8) {
      if (o < min || o > max) return null;
    } else {
      const t1 = (min - o) / d;
      const t2 = (max - o) / d;
      const tNear = Math.min(t1, t2);
      const tFar = Math.max(t1, t2);
      if (tNear > tmin) tmin = tNear;
      if (tFar < tmax) tmax = tFar;
      if (tmin > tmax) return null;
      if (tmax < 0) return null;
    }
  }
  return tmin >= 0 ? tmin : tmax;
}
