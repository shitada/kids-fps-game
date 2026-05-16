import * as THREE from 'three';

export class SafeZone {
  center = new THREE.Vector3(0, 0, 0);
  radius: number;
  maxRadius: number;
  minRadius: number;
  shrinkRate: number;
  damagePerSecond = 6;
  visual: THREE.Mesh;

  constructor(initialRadius: number, minRadius = 8, shrinkSeconds = 180) {
    this.maxRadius = initialRadius;
    this.minRadius = minRadius;
    this.radius = initialRadius;
    this.shrinkRate = (initialRadius - minRadius) / shrinkSeconds;
    const geo = new THREE.RingGeometry(initialRadius, initialRadius + 0.6, 64);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6f3c, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
    this.visual = new THREE.Mesh(geo, mat);
    this.visual.rotation.x = -Math.PI / 2;
    this.visual.position.y = 0.05;
  }

  attach(scene: THREE.Scene): void {
    scene.add(this.visual);
  }

  update(dt: number): void {
    this.radius = Math.max(this.minRadius, this.radius - this.shrinkRate * dt);
    const geo = new THREE.RingGeometry(this.radius, this.radius + 0.6, 64);
    this.visual.geometry.dispose();
    this.visual.geometry = geo;
  }

  isOutside(p: THREE.Vector3): boolean {
    const dx = p.x - this.center.x;
    const dz = p.z - this.center.z;
    return Math.hypot(dx, dz) > this.radius;
  }
}
