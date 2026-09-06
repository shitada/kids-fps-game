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
const MAX_RINGS = 24;
const MAX_CLOUDS = 7;

export class WaterSplashPool {
  private mesh: THREE.InstancedMesh;
  private ringMesh: THREE.InstancedMesh;
  private cloudMesh: THREE.InstancedMesh;
  private particles: SplashParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    life: 1, max: 1, spin: 0, baseScale: 1, velocity: new THREE.Vector3(), position: new THREE.Vector3(),
  }));
  private rings = Array.from({ length: MAX_RINGS }, () => ({
    life: 1, max: 1, position: new THREE.Vector3(), radius: 1,
  }));
  private clouds = Array.from({ length: MAX_CLOUDS }, () => ({
    life: 1, max: 1, position: new THREE.Vector3(),
  }));
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private cursor = 0;

  constructor(private scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.23, metalness: 0, envMapIntensity: 0.6 }),
      MAX_PARTICLES,
    );
    this.mesh.name = 'water-splash-pool';
    this.ringMesh = new THREE.InstancedMesh(
      new THREE.TorusGeometry(0.7, 0.035, 5, 24),
      new THREE.MeshBasicMaterial({ color: 0xcaf8ff, transparent: true, opacity: 0.72, depthWrite: false }),
      MAX_RINGS,
    );
    this.ringMesh.name = 'water-splash-rings';
    this.cloudMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 10, 7),
      new THREE.MeshBasicMaterial({ color: 0xf7ffff }),
      MAX_CLOUDS * 5,
    );
    this.cloudMesh.name = 'farewell-clouds';
    for (const mesh of [this.mesh, this.ringMesh, this.cloudMesh]) {
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
    }
  }

  burst(position: THREE.Vector3, count = 8, force = 4): void {
    let spawned = 0;
    for (let searched = 0; searched < MAX_PARTICLES && spawned < count; searched++) {
      const p = this.particles[this.cursor++ % MAX_PARTICLES];
      if (p.life < p.max) continue;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      p.life = 0;
      p.max = 0.42 + Math.random() * 0.3;
      p.spin = theta;
      p.baseScale = 0.7 + Math.random() * 0.9;
      p.position.copy(position);
      p.velocity.set(Math.cos(theta) * Math.cos(phi), Math.sin(phi) + 0.6, Math.sin(theta) * Math.cos(phi)).multiplyScalar(force);
      spawned++;
    }
    if (count >= 6) {
      const ring = this.rings.find((r) => r.life >= r.max);
      if (ring) {
        ring.life = 0;
        ring.max = 0.42;
        ring.position.copy(position);
        ring.radius = 0.5 + force * 0.16;
      }
    }
  }

  cloudBurst(position: THREE.Vector3): void {
    const cloud = this.clouds.find((c) => c.life >= c.max);
    if (!cloud) return;
    cloud.position.copy(position);
    cloud.position.y += 0.8;
    cloud.life = 0;
    cloud.max = 1.2;
    this.burst(cloud.position, 18, 6);
  }

  update(dt: number): void {
    let particleIndex = 0;
    for (const p of this.particles) {
      if (p.life >= p.max) continue;
      p.life += dt;
      if (p.life >= p.max) continue;
      p.velocity.y -= 11 * dt;
      p.position.addScaledVector(p.velocity, dt);
      if (p.position.y < 0.06) {
        p.position.y = 0.06;
        p.velocity.y = Math.abs(p.velocity.y) * 0.24;
      }
      const t = p.life / p.max;
      const scale = p.baseScale * (1 - t * t);
      this.dummy.position.copy(p.position);
      this.dummy.rotation.set(p.spin + t * 2, p.spin, 0);
      this.dummy.scale.set(scale * 0.75, scale * 1.65, scale * 0.75);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(particleIndex, this.dummy.matrix);
      this.color.setHex(particleIndex % 3 === 0 ? 0xf3ffff : 0x73d8eb);
      this.mesh.setColorAt(particleIndex++, this.color);
    }
    this.mesh.count = particleIndex;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    let ringIndex = 0;
    for (const ring of this.rings) {
      if (ring.life >= ring.max) continue;
      ring.life += dt;
      if (ring.life >= ring.max) continue;
      const t = ring.life / ring.max;
      this.dummy.position.copy(ring.position);
      this.dummy.position.y = Math.max(0.07, ring.position.y - 0.1);
      this.dummy.rotation.set(-Math.PI / 2, 0, 0);
      const size = ring.radius * (0.35 + t * 1.8);
      this.dummy.scale.set(size, size, Math.max(0.01, 1 - t));
      this.dummy.updateMatrix();
      this.ringMesh.setMatrixAt(ringIndex++, this.dummy.matrix);
    }
    this.ringMesh.count = ringIndex;
    this.ringMesh.instanceMatrix.needsUpdate = true;

    let cloudIndex = 0;
    for (const cloud of this.clouds) {
      if (cloud.life >= cloud.max) continue;
      cloud.life += dt;
      if (cloud.life >= cloud.max) continue;
      const t = cloud.life / cloud.max;
      const envelope = Math.sin(Math.PI * t) * 0.8;
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 0.4;
        this.dummy.position.set(
          cloud.position.x + Math.cos(angle) * t,
          cloud.position.y + t * 1.4 + Math.sin(angle) * 0.24,
          cloud.position.z + Math.sin(angle) * t * 0.65,
        );
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(envelope, envelope * 0.8, envelope);
        this.dummy.updateMatrix();
        this.cloudMesh.setMatrixAt(cloudIndex++, this.dummy.matrix);
      }
    }
    this.cloudMesh.count = cloudIndex;
    this.cloudMesh.instanceMatrix.needsUpdate = true;
  }

  get activeCount(): number {
    let count = 0;
    for (const p of this.particles) if (p.life < p.max) count++;
    return count;
  }

  dispose(): void {
    for (const mesh of [this.mesh, this.ringMesh, this.cloudMesh]) {
      this.scene.remove(mesh);
      mesh.dispose();
      mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    }
    for (const particle of this.particles) particle.life = particle.max;
    for (const ring of this.rings) ring.life = ring.max;
    for (const cloud of this.clouds) cloud.life = cloud.max;
  }
}
