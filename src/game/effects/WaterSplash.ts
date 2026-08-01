import * as THREE from 'three';

interface SplashParticle {
  life: number;
  max: number;
  spin: number;
  baseScale: number;
  velocity: THREE.Vector3;
  position: THREE.Vector3;
}

const MAX_PARTICLES = 220;
const HIDDEN_SCALE = 0.0001;

/**
 * みずしぶきのパーティクル。
 * InstancedMesh + 固定長プールなので、毎フレームの new を出さない。
 */
export class WaterSplashPool {
  private scene: THREE.Scene;
  private mesh: THREE.InstancedMesh;
  private ringMesh: THREE.InstancedMesh;
  private particles: SplashParticle[] = [];
  private rings: Array<{ life: number; max: number; position: THREE.Vector3; radius: number }> = [];
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private tmp = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const geo = new THREE.SphereGeometry(0.2, 6, 5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.mesh.name = 'water-splash-pool';
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);

    const ringGeo = new THREE.RingGeometry(0.5, 0.85, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xbdefff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ringMesh = new THREE.InstancedMesh(ringGeo, ringMat, 24);
    this.ringMesh.name = 'water-splash-rings';
    this.ringMesh.frustumCulled = false;
    this.ringMesh.count = 0;
    scene.add(this.ringMesh);
  }

  burst(position: THREE.Vector3, count = 8, force = 4): void {
    const spawn = Math.min(count, MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < spawn; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const cosPhi = Math.cos(phi);
      this.particles.push({
        life: 0,
        max: 0.42 + Math.random() * 0.3,
        spin: Math.random() * Math.PI,
        baseScale: 0.7 + Math.random() * 0.9,
        velocity: new THREE.Vector3(Math.cos(theta) * cosPhi, Math.sin(phi) + 0.6, Math.sin(theta) * cosPhi).multiplyScalar(force),
        position: position.clone(),
      });
    }
    if (this.rings.length < 24 && count >= 6) {
      this.rings.push({ life: 0, max: 0.36, position: position.clone(), radius: 0.5 + force * 0.16 });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= 11 * dt;
      p.position.addScaledVector(p.velocity, dt);
      if (p.position.y < 0.05) {
        p.position.y = 0.05;
        p.velocity.set(p.velocity.x * 0.4, Math.abs(p.velocity.y) * 0.24, p.velocity.z * 0.4);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt;
      if (r.life >= r.max) this.rings.splice(i, 1);
    }

    this.writeParticles();
    this.writeRings();
  }

  private writeParticles(): void {
    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const t = p.life / p.max;
      // 暗くして消すと灰色のゴミに見えるので、ふくらんでから小さくして消す
      const grow = t < 0.25 ? 0.6 + (t / 0.25) * 0.7 : 1.3;
      const shrink = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      const scale = p.baseScale * grow * shrink;
      this.dummy.position.copy(p.position);
      this.dummy.rotation.set(p.spin, p.spin * 1.4, 0);
      this.dummy.scale.setScalar(Math.max(HIDDEN_SCALE, scale));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      // 出はじめは白、そのあと水色。明るさは保ったままにする。
      const fade = 1 - t;
      this.color.setRGB(0.62 + fade * 0.38, 0.9 + fade * 0.1, 1);
      this.mesh.setColorAt(i, this.color);
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  private writeRings(): void {
    const count = this.rings.length;
    for (let i = 0; i < count; i++) {
      const r = this.rings[i];
      const t = r.life / r.max;
      this.tmp.copy(r.position);
      this.tmp.y = Math.max(0.06, this.tmp.y - 0.1);
      this.dummy.position.copy(this.tmp);
      this.dummy.rotation.set(-Math.PI / 2, 0, 0);
      this.dummy.scale.setScalar(Math.max(HIDDEN_SCALE, r.radius * (0.4 + t * 1.8) * (1 - t * 0.55)));
      this.dummy.updateMatrix();
      this.ringMesh.setMatrixAt(i, this.dummy.matrix);
      this.color.setRGB(0.78, 0.96, 1);
      this.ringMesh.setColorAt(i, this.color);
    }
    this.ringMesh.count = count;
    this.ringMesh.instanceMatrix.needsUpdate = true;
    if (this.ringMesh.instanceColor) this.ringMesh.instanceColor.needsUpdate = true;
  }

  get activeCount(): number {
    return this.particles.length;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.scene.remove(this.ringMesh);
    this.mesh.geometry.dispose();
    this.ringMesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    (this.ringMesh.material as THREE.Material).dispose();
    this.particles.length = 0;
    this.rings.length = 0;
  }
}
