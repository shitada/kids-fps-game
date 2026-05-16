import * as THREE from 'three';

export class WaterSplashPool {
  private scene: THREE.Scene;
  private active: Array<{ mesh: THREE.Mesh; life: number; max: number; velocity: THREE.Vector3 }> = [];
  private geo: THREE.SphereGeometry;
  private mat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geo = new THREE.SphereGeometry(0.18, 6, 6);
    this.mat = new THREE.MeshBasicMaterial({ color: 0x6ec6ff, transparent: true, opacity: 0.85 });
  }

  burst(position: THREE.Vector3, count = 8, force = 4): void {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.geo, this.mat.clone());
      mesh.position.copy(position);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const v = new THREE.Vector3(
        Math.cos(theta) * Math.cos(phi),
        Math.sin(phi) + 0.5,
        Math.sin(theta) * Math.cos(phi),
      ).multiplyScalar(force);
      this.scene.add(mesh);
      this.active.push({ mesh, life: 0, max: 0.5 + Math.random() * 0.3, velocity: v });
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life += dt;
      p.velocity.y -= 9.8 * dt;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      const t = p.life / p.max;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - t));
      p.mesh.scale.setScalar(1 + t);
      if (p.life >= p.max) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.active.splice(i, 1);
      }
    }
  }
}
