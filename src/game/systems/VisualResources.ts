import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const geometries = new Map<string, THREE.BufferGeometry>();
const materials = new Map<string, THREE.Material>();
const textures = new Set<THREE.Texture>();

export function sharedGeometry(key: string, create: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let geometry = geometries.get(key);
  if (!geometry) {
    geometry = create();
    geometry.userData.sharedVisualResource = true;
    geometries.set(key, geometry);
  }
  return geometry;
}

export function toyMaterial(color: number, roughness = 0.4): THREE.MeshStandardMaterial {
  const key = `toy-${color}-${roughness}`;
  const existing = materials.get(key);
  if (existing instanceof THREE.MeshStandardMaterial) return existing;
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, envMapIntensity: 0.6 });
  material.userData.sharedVisualResource = true;
  materials.set(key, material);
  return material;
}

export function flatMaterial(color: number): THREE.MeshBasicMaterial {
  const key = `flat-${color}`;
  const existing = materials.get(key);
  if (existing instanceof THREE.MeshBasicMaterial) return existing;
  const material = new THREE.MeshBasicMaterial({ color });
  material.userData.sharedVisualResource = true;
  materials.set(key, material);
  return material;
}

export function sharedBasicMaterial(key: string, options: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
  const id = `basic-${key}`;
  const existing = materials.get(id);
  if (existing instanceof THREE.MeshBasicMaterial) return existing;
  const material = new THREE.MeshBasicMaterial(options);
  material.userData.sharedVisualResource = true;
  materials.set(id, material);
  return material;
}

export function roundedBox(width: number, height: number, depth: number, radius = 0.12): THREE.BufferGeometry {
  const bevel = Math.min(radius, width / 2, height / 2, depth / 2);
  return sharedGeometry(`box-${width}-${height}-${depth}-${bevel}`, () =>
    new RoundedBoxGeometry(width, height, depth, 2, bevel));
}

export function toyBox(width: number, height: number, depth: number, color: number, radius = 0.12): THREE.Mesh {
  return new THREE.Mesh(roundedBox(width, height, depth, radius), toyMaterial(color));
}

export function ellipsoid(width: number, height: number, depth: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    sharedGeometry('sphere-20-14', () => new THREE.SphereGeometry(0.5, 20, 14)),
    toyMaterial(color),
  );
  mesh.scale.set(width, height, depth);
  return mesh;
}

export function contactShadow(width: number, depth: number): THREE.Mesh {
  let material = materials.get('contact-shadow');
  if (!material) {
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const distance = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
        const i = (y * size + x) * 4;
        data[i] = 25;
        data[i + 1] = 70;
        data[i + 2] = 82;
        data[i + 3] = Math.round(Math.max(0, 1 - distance) ** 1.6 * 95);
      }
    }
    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    textures.add(texture);
    material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
    material.userData.sharedVisualResource = true;
    materials.set('contact-shadow', material);
  }
  const mesh = new THREE.Mesh(sharedGeometry('shadow-plane', () => new THREE.PlaneGeometry(1, 1)), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(width, depth, 1);
  mesh.position.y = 0.025;
  mesh.name = 'contact-shadow';
  return mesh;
}

export function disposeSharedVisualResources(): void {
  for (const resource of geometries.values()) resource.dispose();
  for (const resource of materials.values()) resource.dispose();
  for (const texture of textures) texture.dispose();
  geometries.clear();
  materials.clear();
  textures.clear();
}
