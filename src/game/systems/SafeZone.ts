import * as THREE from 'three';

export interface SafeZoneOptions {
  /** 縮み始めるまでのゆうよ（びょう）。すぐ縮むと開始直後にぬれてしまう。 */
  graceSeconds?: number;
  minRadius?: number;
  shrinkSeconds?: number;
  damagePerSecond?: number;
}

const WALL_HEIGHT = 1.4;

/**
 * 「おひさまが つよくて そとは あつい」エリア。
 * 見えないと子供には理解できないので、地面のリングに加えて半とうめいの壁も出す。
 */
export class SafeZone {
  center = new THREE.Vector3(0, 0, 0);
  radius: number;
  maxRadius: number;
  minRadius: number;
  shrinkRate: number;
  damagePerSecond: number;
  graceSeconds: number;
  elapsed = 0;
  visual: THREE.Group;
  private ring: THREE.Mesh;
  private wall: THREE.Mesh;

  constructor(initialRadius: number, minRadiusOrOptions: number | SafeZoneOptions = 8, shrinkSeconds = 180) {
    const options: SafeZoneOptions =
      typeof minRadiusOrOptions === 'number' ? { minRadius: minRadiusOrOptions, shrinkSeconds } : minRadiusOrOptions;

    this.maxRadius = initialRadius;
    this.minRadius = options.minRadius ?? 8;
    this.radius = initialRadius;
    this.graceSeconds = options.graceSeconds ?? 0;
    this.damagePerSecond = options.damagePerSecond ?? 6;
    const seconds = options.shrinkSeconds ?? shrinkSeconds;
    this.shrinkRate = (initialRadius - this.minRadius) / Math.max(1, seconds);

    this.visual = new THREE.Group();
    this.visual.name = 'safe-zone';

    // 半径 1 で作っておき、以降はスケールだけ変える（毎フレームのジオメトリ再生成を避ける）
    const ringGeo = new THREE.RingGeometry(1, 1.025, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffc36a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.06;
    this.visual.add(this.ring);

    const wallGeo = new THREE.CylinderGeometry(1, 1, WALL_HEIGHT, 40, 1, true);
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0xffdb89,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    this.wall = new THREE.Mesh(wallGeo, wallMat);
    this.wall.position.y = WALL_HEIGHT / 2;
    this.visual.add(this.wall);

    const markers = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.006, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe5a8 }),
      48,
    );
    markers.name = 'sunshine-boundary-dots';
    const marker = new THREE.Object3D();
    for (let i = 0; i < 48; i++) {
      const angle = i / 48 * Math.PI * 2;
      marker.position.set(Math.cos(angle), 0, Math.sin(angle));
      marker.updateMatrix();
      markers.setMatrixAt(i, marker.matrix);
    }
    markers.position.y = 0.16;
    this.wall.add(markers);

    this.applyRadius();
  }

  attach(scene: THREE.Scene): void {
    scene.add(this.visual);
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed > this.graceSeconds) {
      this.radius = Math.max(this.minRadius, this.radius - this.shrinkRate * dt);
    }
    this.applyRadius();
  }

  /** 縮み始めるまでの残り秒数。すでに縮み始めていれば 0。 */
  get secondsUntilShrink(): number {
    return Math.max(0, this.graceSeconds - this.elapsed);
  }

  private applyRadius(): void {
    this.ring.scale.set(this.radius, this.radius, 1);
    this.wall.scale.set(this.radius, 1, this.radius);
  }

  isOutside(p: THREE.Vector3): boolean {
    const dx = p.x - this.center.x;
    const dz = p.z - this.center.z;
    return Math.hypot(dx, dz) > this.radius;
  }

  /** 安全圏の外に出ている距離。0 なら圏内。 */
  distanceOutside(p: THREE.Vector3): number {
    const dx = p.x - this.center.x;
    const dz = p.z - this.center.z;
    return Math.max(0, Math.hypot(dx, dz) - this.radius);
  }
}
