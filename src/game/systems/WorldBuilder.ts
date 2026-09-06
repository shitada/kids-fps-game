import * as THREE from 'three';
import type { Decoration, MapConfig, ParkDecoration, PrimitiveDecoration } from '@/types';
import { CollisionWorld, makeAABB } from '@/game/systems/CollisionWorld';
import {
  contactShadow, ellipsoid, flatMaterial, roundedBox, sharedBasicMaterial, sharedGeometry, toyBox, toyMaterial,
} from '@/game/systems/VisualResources';

export interface BuiltWorld {
  scene: THREE.Scene;
  collision: CollisionWorld;
  ground: THREE.Mesh;
  update: (dt: number) => void;
}

const C = {
  cream: 0xf8dfac, white: 0xfffcf0, aqua: 0x2eaebd, coral: 0xef7567,
  yellow: 0xf2be48, mint: 0x65b890, leaf: 0x4a9673, ink: 0x326577,
};
type XYZ = [number, number, number];
type PartCollider = (name: string, center: XYZ, size: XYZ) => void;
const TAU = Math.PI * 2;

/** Only scenery changes between parks: the whole playable base remains y=0. */
export function buildWorld(map: MapConfig): BuiltWorld {
  const scene = new THREE.Scene();
  scene.name = `park-${map.id}`;
  scene.background = new THREE.Color(map.skyColor);
  scene.fog = new THREE.Fog(map.skyColor, map.sizeMeters * 1.3, map.sizeMeters * 2.5);
  addSky(scene, map);
  addLighting(scene);

  const ground = new THREE.Mesh(unitPlane(), toyMaterial(map.groundColor, 0.85));
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  const span = map.theme === 'cloud' ? map.sizeMeters : map.sizeMeters * 6;
  ground.scale.set(span, span, 1);
  scene.add(ground);
  addPaths(scene, map);

  const collision = new CollisionWorld();
  map.decorations.forEach((decoration, index) => addDecoration(scene, collision, decoration, index));
  addBoundary(scene, collision, map);
  addGardens(scene, map);
  addLegacyScatter(scene, map);
  prepareFloorInlays(scene);

  // Every static repeated part, including different prefab instances, shares a
  // draw call. Keep the ground separate: callers retain this exact mesh.
  batchStaticParts(scene, ground);

  const update = addWaterRipples(scene, map);
  return { scene, collision, ground, update };
}

function addWaterRipples(scene: THREE.Scene, map: MapConfig): (dt: number) => void {
  const surfaces: Array<{ x: number; y: number; z: number; radius: number }> = [];
  for (const decoration of map.decorations) {
    const [x, y, z] = decoration.position;
    if (decoration.kind === 'splash-pad') {
      for (const dx of [-4.8, 4.8]) {
        for (const dz of [-4.8, 4.8]) surfaces.push({ x: x + dx, y: y + 0.065, z: z + dz, radius: 1.45 });
      }
    } else if (decoration.kind === 'fountain') {
      surfaces.push({ x, y: y + 0.595, z, radius: decoration.size[0] * 0.36 });
    }
  }
  if (!surfaces.length) return () => {};
  const mesh = new THREE.InstancedMesh(
    sharedGeometry('park-water-ripple', () => new THREE.RingGeometry(0.975, 1, 32)),
    sharedBasicMaterial('park-water-ripple', {
      color: 0xecffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }),
    surfaces.length * 2,
  );
  mesh.name = 'park-water-ripples';
  mesh.userData.visualAnimation = true;
  mesh.renderOrder = 70;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  const dummy = new THREE.Object3D();
  let elapsed = 0;
  const reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const update = (dt: number): void => {
    if (!reducedMotion) elapsed += dt;
    for (let i = 0; i < mesh.count; i++) {
      const surface = surfaces[Math.floor(i / 2)];
      const phase = (elapsed * 0.32 + i * 0.5) % 1;
      const radius = surface.radius * (0.25 + phase * 0.75);
      dummy.position.set(surface.x, surface.y, surface.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return update;
}

function addLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xf5fcff, 0xadc6af, 0.8));
  const sun = new THREE.DirectionalLight(0xffefd3, 1.65);
  sun.position.set(-35, 65, 30);
  const fill = new THREE.DirectionalLight(0xcceaff, 0.3);
  fill.position.set(40, 25, -30);
  scene.add(sun, fill);
}

function addSky(scene: THREE.Scene, map: MapConfig): void {
  const geometry = sharedGeometry(`park-sky-${map.skyColor}-${map.skyTopColor}`, () => {
    const sphere = new THREE.SphereGeometry(1, 24, 16);
    const position = sphere.getAttribute('position');
    const colors = new Float32Array(position.count * 3);
    const bottom = new THREE.Color(map.skyColor);
    const top = new THREE.Color(map.skyTopColor ?? map.skyColor);
    const color = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
      const t = THREE.MathUtils.smoothstep(position.getY(i), -0.15, 0.85);
      color.copy(bottom).lerp(top, t);
      color.toArray(colors, i * 3);
    }
    sphere.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return sphere;
  });
  const dome = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  dome.name = 'sky-dome';
  dome.scale.setScalar(map.sizeMeters * 2.6);
  dome.renderOrder = -2;
  scene.add(dome);
  const sun = ellipsoid(15, 15, 3, C.cream);
  sun.material = flatMaterial(C.cream);
  sun.position.set(-map.sizeMeters * 0.7, map.sizeMeters, -map.sizeMeters);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
}

function place<T extends THREE.Object3D>(parent: THREE.Object3D, object: T, x: number, y: number, z: number): T {
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function box(parent: THREE.Object3D, size: XYZ, position: XYZ, color: number, radius = 0.18): THREE.Mesh {
  return place(parent, toyBox(...size, color, radius), ...position);
}

function unitPlane(): THREE.BufferGeometry {
  return sharedGeometry('park-plane', () => new THREE.PlaneGeometry(1, 1));
}

function cylinder(parent: THREE.Object3D, radius: number, height: number, position: XYZ, color: number): THREE.Mesh {
  const geometry = sharedGeometry('park-cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 24));
  const mesh = place(parent, new THREE.Mesh(geometry, toyMaterial(color)), ...position);
  mesh.scale.set(radius, height, radius);
  return mesh;
}

function backdropLobe(width: number, height: number, depth: number, color: number): THREE.Mesh {
  const geometry = sharedGeometry('park-backdrop-sphere', () => new THREE.SphereGeometry(0.5, 16, 10));
  const mesh = new THREE.Mesh(geometry, toyMaterial(color));
  mesh.scale.set(width, height, depth);
  return mesh;
}

function disc(parent: THREE.Object3D, x: number, z: number, radius: number, color: number, y = 0.015): THREE.Mesh {
  const geometry = sharedGeometry('park-disc', () => new THREE.CircleGeometry(1, 64));
  const mesh = place(parent, new THREE.Mesh(geometry, toyMaterial(color, 0.85)), x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.setScalar(radius);
  mesh.userData.floorLayer = y;
  return mesh;
}

function ring(parent: THREE.Object3D, x: number, z: number, inner: number, outer: number, color: number, y = 0.02): THREE.Mesh {
  const geometry = sharedGeometry(`park-ring-${inner}-${outer}`, () => new THREE.RingGeometry(inner, outer, 64));
  const mesh = place(parent, new THREE.Mesh(geometry, toyMaterial(color, 0.85)), x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.floorLayer = y;
  return mesh;
}

function floorStripe(parent: THREE.Object3D, x: number, z: number, width: number, depth: number, color: number, y = 0.018): THREE.Mesh {
  const mesh = place(parent, new THREE.Mesh(unitPlane(), toyMaterial(color, 0.85)), x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(width, depth, 1);
  mesh.userData.floorLayer = y;
  return mesh;
}

function shadow(parent: THREE.Object3D, width: number, depth: number, x = 0, z = 0): void {
  const mesh = contactShadow(width, depth);
  mesh.position.set(x, 0.035, z);
  parent.add(mesh);
}

/** Layered inlays never fight the base depth at long distances. Their depth
 * test still hides them behind actors/cover; they add no collision or height. */
function prepareFloorInlays(scene: THREE.Scene): void {
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || typeof object.userData.floorLayer !== 'number'
      || !(object.material instanceof THREE.MeshStandardMaterial)) return;
    const color = object.material.color.getHex();
    let material = materials.get(color);
    if (!material) {
      // These special depth settings are world-owned; do not mutate shared
      // toy materials also used by characters or another menu preview.
      material = new THREE.MeshStandardMaterial({
        color, roughness: 0.85, metalness: 0, envMapIntensity: 0.6,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      });
      materials.set(color, material);
    }
    object.material = material;
    object.renderOrder = Math.round(object.userData.floorLayer * 1000);
  });
}

function addPaths(scene: THREE.Scene, map: MapConfig): void {
  const path = map.groundAccentColor ?? C.cream;
  const radius = map.theme === 'cloud' ? 23 : map.theme === 'castle' ? 29 : 20;
  const width = map.theme === 'castle' ? 10 : 8;
  floorStripe(scene, 0, 0, width, map.sizeMeters, path);
  floorStripe(scene, 0, 0, map.sizeMeters, width, path);
  ring(scene, 0, 0, radius - 3.5, radius + 3.5, path);
  ring(scene, 0, 0, radius + 3.6, radius + 3.85, C.white);
  disc(scene, 0, 0, 11, path, 0.022);

  // Edge pavers and entrance strips convey scale without a noisy full grid.
  for (let i = -map.sizeMeters / 2 + 3; i < map.sizeMeters / 2; i += 4) {
    if (Math.abs(i) < 11 || Math.abs(Math.abs(i) - radius) < 5) continue;
    for (const side of [-1, 1]) {
      floorStripe(scene, side * (width / 2 + 0.6), i, 0.7, 1.1, C.white);
      floorStripe(scene, i, side * (width / 2 + 0.6), 1.1, 0.7, C.white);
    }
  }
  if (map.theme === 'castle') {
    // A second courtyard is reached through the arch, not through solid walls.
    floorStripe(scene, 0, -29, 21, 13, path, 0.021);
    for (const x of [-6, 6]) {
      for (const z of [-28, -24, 4, 8]) {
        const tile = floorStripe(scene, x, z, 1.2, 1.2, C.aqua, 0.028);
        tile.rotation.z = Math.PI / 4;
      }
    }
    ring(scene, 0, 0, 7.6, 8, C.yellow, 0.026);
  } else if (map.theme === 'cloud') {
    box(scene, [map.sizeMeters, 2, map.sizeMeters], [0, -1.03, 0], C.aqua, 0.65);
    const star = place(scene, new THREE.Mesh(starGeometry(), toyMaterial(C.yellow, 0.85)), 0, 0.03, 0);
    star.name = 'plaza-star';
    star.rotation.x = -Math.PI / 2;
    star.scale.set(4.2, 4.2, 0.02);
    star.userData.floorLayer = 0.045;
    ring(scene, 0, 0, 8.8, 9.1, C.aqua, 0.026);
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * TAU;
      disc(scene, Math.cos(angle) * radius, Math.sin(angle) * radius, 0.34, C.yellow, 0.027);
    }
  } else {
    // Blue tiled lane markings on the four entrances to the splash plaza.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        floorStripe(scene, (i - 2) * 1.2, side * 29, 0.7, 3.2, C.aqua, 0.026);
        floorStripe(scene, side * 29, (i - 2) * 1.2, 3.2, 0.7, C.aqua, 0.026);
      }
    }
  }
}

function addDecoration(scene: THREE.Scene, collision: CollisionWorld, d: Decoration, index: number): void {
  const root = new THREE.Group();
  root.name = `${d.kind}-${index}`;
  root.position.set(...d.position);
  if ('quarterTurns' in d) root.rotation.y = (d.quarterTurns ?? 0) * Math.PI / 2;
  root.updateMatrix();
  scene.add(root);
  const collider: PartCollider = (name, center, size) => {
    // Transform each part independently; never enclose an entire arch/prefab.
    const bounds = new THREE.Box3(
      new THREE.Vector3(...center).addScaledVector(new THREE.Vector3(...size), -0.5),
      new THREE.Vector3(...center).addScaledVector(new THREE.Vector3(...size), 0.5),
    ).applyMatrix4(root.matrix);
    collision.add({
      id: `deco-${index}-${name}`, aabb: { min: bounds.min, max: bounds.max },
      blocksMovement: true, blocksProjectile: true,
    });
  };

  switch (d.kind) {
    case 'splash-pad': splashPad(root, d); break;
    case 'inflatable': inflatable(root, d, collider); break;
    case 'parasol': parasol(root, d, collider); break;
    case 'fountain-pipes': fountainPipes(root, d, collider); break;
    case 'slide-tower': slideTower(root, d); break;
    case 'castle-gate': castleGate(root, d, collider); break;
    case 'castle-tower': castleTower(root, d, collider); break;
    case 'hedge': hedge(root, d, collider); break;
    case 'fountain': fountain(root, d, collider); break;
    case 'rainbow-gate': rainbowGate(root, d, collider); break;
    case 'cloud-cover': cloudCover(root, d, collider); break;
    case 'balloon': balloon(root, d); break;
    default: legacyDecoration(root, d, collider);
  }
}

function splashPad(root: THREE.Group, d: ParkDecoration): void {
  const radius = d.size[0] / 2;
  disc(root, 0, 0, radius, d.color, 0.03);
  ring(root, 0, 0, radius - 0.45, radius, C.white, 0.033);
  ring(root, 0, 0, radius - 1.2, radius - 1.05, C.cream, 0.034);
  // Flush stepping lanes make the walkable surface legible from first person.
  floorStripe(root, 0, 0, 4.6, radius * 2, C.cream, 0.038);
  floorStripe(root, 0, 0, radius * 2, 4.6, C.cream, 0.038);
  disc(root, 0, 0, 3.2, C.cream, 0.04);
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * TAU;
    const tile = floorStripe(root, Math.cos(angle) * (radius - 0.72), Math.sin(angle) * (radius - 0.72), 0.4, 0.45, C.white, 0.037);
    tile.rotation.z = -angle;
  }
  for (const x of [-4.8, 4.8]) {
    for (const z of [-4.8, 4.8]) {
      ring(root, x, z, 0.8, 0.9, C.white, 0.04);
      ring(root, x, z, 1.25, 1.31, C.white, 0.04);
    }
  }
}

function inflatable(root: THREE.Group, d: ParkDecoration, collider: PartCollider): void {
  const [w, h, depth] = d.size;
  shadow(root, w + 1.5, depth + 1.5);
  box(root, [w, h, depth], [0, h / 2, 0], d.color, 0.65);
  // Raised piping, a soft inset face and round valve distinguish vinyl cover.
  box(root, [w * 0.84, h * 0.65, depth + 0.06], [0, h * 0.53, 0], d.accent ?? C.cream, 0.45);
  box(root, [w * 0.76, h * 0.52, depth + 0.1], [0, h * 0.53, 0], d.color, 0.4);
  const valve = cylinder(root, 0.14, 0.09, [w * 0.32, 0.55, depth / 2 + 0.08], C.white);
  valve.rotation.x = Math.PI / 2;
  collider('cushion', [0, h / 2, 0], [w, h, depth]);
}

function parasol(root: THREE.Group, d: ParkDecoration, collider: PartCollider): void {
  const [w, h] = d.size;
  shadow(root, w, w);
  cylinder(root, 0.8, 0.35, [0, 0.175, 0], d.color);
  cylinder(root, 0.14, h - 0.5, [0, (h - 0.5) / 2, 0], C.cream);
  const canopy = sharedGeometry('park-parasol-panel', () => new THREE.LatheGeometry([
    new THREE.Vector2(0.015, 1), new THREE.Vector2(0.2, 0.95),
    new THREE.Vector2(0.52, 0.75), new THREE.Vector2(0.82, 0.32),
    new THREE.Vector2(1, 0.08), new THREE.Vector2(1.01, 0),
    new THREE.Vector2(0.96, -0.05), new THREE.Vector2(0.8, 0.18),
    new THREE.Vector2(0.5, 0.6), new THREE.Vector2(0.18, 0.84),
    new THREE.Vector2(0.015, 0.9),
  ], 4, 0, TAU / 12));
  for (let i = 0; i < 12; i++) {
    const panel = place(root, new THREE.Mesh(canopy, toyMaterial(i % 2 ? d.color : C.cream)), 0, h - 1.5, 0);
    panel.scale.set(w / 2, 1.35, w / 2);
    panel.rotation.y = i / 12 * TAU;
    const angle = (i + 0.5) / 12 * TAU;
    place(root, ellipsoid(1.05, 0.45, 0.5, i % 2 ? d.color : C.cream),
      Math.sin(angle) * (w / 2 - 0.15), h - 1.48, Math.cos(angle) * (w / 2 - 0.15)).rotation.y = angle;
  }
  place(root, ellipsoid(0.45, 0.45, 0.45, C.yellow), 0, h - 0.05, 0);
  collider('foot', [0, 0.175, 0], [1.6, 0.35, 1.6]);
  collider('pole', [0, (h - 0.5) / 2, 0], [0.28, h - 0.5, 0.28]);
  // Canopy is overhead; there is deliberately no solid box beneath it.
}

function pipeCurve(points: XYZ[], radius: number, key: string): THREE.BufferGeometry {
  return sharedGeometry(key, () => new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), 28, radius, 8, false,
  ));
}

function fountainPipes(root: THREE.Group, d: ParkDecoration, collider: PartCollider): void {
  shadow(root, d.size[0] + 1, d.size[2] + 1);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 1.25;
    const h = d.size[1] - Math.abs(i - 1) * 0.75;
    const pipe = pipeCurve([[0, 0.3, 0], [0, h - 0.7, 0], [0, h, 0.35], [0, h - 0.2, 0.85]],
      0.24, `park-pipe-${h}`);
    place(root, new THREE.Mesh(pipe, toyMaterial(i === 1 ? d.accent ?? C.yellow : d.color)), x, 0, 0);
    cylinder(root, 0.42, 0.3, [x, 0.15, 0], C.cream);
    const outlet = place(root, ellipsoid(0.38, 0.18, 0.38, C.ink), x, h - 0.25, 0.85);
    outlet.rotation.x = 0.4;
    for (let j = 0; j < 3; j++) {
      place(root, ellipsoid(0.18, 0.35, 0.18, C.aqua), x, h - 0.85 - j * 0.65, 1);
    }
    ring(root, x, 1, 0.35, 0.45, C.white, 0.03);
    collider(`pipe-${i}`, [x, (h - 0.6) / 2, 0], [0.5, h - 0.6, 0.5]);
    collider(`elbow-${i}`, [x, h - 0.4, 0.45], [0.5, 0.9, 1.25]);
  }
}

function slideTower(root: THREE.Group, d: ParkDecoration): void {
  const h = d.size[1];
  shadow(root, 12, 12);
  box(root, [6, 1.5, 6], [0, 0.75, 0], C.cream, 0.45);
  box(root, [3.4, h - 4, 3.4], [0, (h - 4) / 2 + 1, 0], d.color, 0.5);
  for (const x of [-2.4, 2.4]) {
    for (const z of [-2.4, 2.4]) cylinder(root, 0.3, h - 4, [x, (h - 4) / 2, z], C.cream);
  }
  box(root, [6, 0.65, 6], [0, h - 4, 0], C.yellow, 0.28);
  const roof = roofGeometry();
  const mesh = place(root, new THREE.Mesh(roof, toyMaterial(d.accent ?? C.aqua)), 0, h - 3.6, 0);
  mesh.scale.set(4.2, 3, 4.2);
  const points: XYZ[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const a = t * TAU * 1.35;
    points.push([Math.cos(a) * 4.1, h - 4.3 - t * (h - 7), Math.sin(a) * 4.1]);
  }
  const chute = pipeCurve(points, 0.82, `park-spiral-slide-${h}`);
  root.add(new THREE.Mesh(chute, toyMaterial(d.accent ?? C.aqua)));
  for (let y = 3; y < h - 4; y += 3) {
    box(root, [1.4, 1.3, 0.15], [0, y, 1.72], C.cream, 0.25);
    box(root, [1, 0.9, 0.17], [0, y, 1.76], C.ink, 0.2);
  }
  flag(root, 0, h - 0.5, 0, C.coral, 1.4);
}

function roofGeometry(): THREE.BufferGeometry {
  return sharedGeometry('park-rounded-roof', () => new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.92, 0),
    new THREE.Vector2(1, 0.07), new THREE.Vector2(0.96, 0.15),
    new THREE.Vector2(0.72, 0.25), new THREE.Vector2(0.42, 0.65),
    new THREE.Vector2(0.14, 0.96), new THREE.Vector2(0, 1),
  ], 24));
}

function flag(root: THREE.Group, x: number, y: number, z: number, color: number, scale = 1): void {
  cylinder(root, 0.075, scale * 2, [x, y + scale, z], C.cream);
  const geometry = sharedGeometry('park-flag', () => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.5, 0.25, 1, -0.35, 1.5, 0.05);
    shape.lineTo(1.25, -0.5);
    shape.lineTo(1.5, -0.95);
    shape.bezierCurveTo(1, -1.35, 0.5, -0.75, 0, -1);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false, curveSegments: 6 });
  });
  place(root, new THREE.Mesh(geometry, toyMaterial(color)), x, y + scale * 1.9, z).scale.setScalar(scale);
  place(root, ellipsoid(0.25, 0.25, 0.25, C.yellow), x, y + scale * 2.1, z);
}

function castleGate(root: THREE.Group, d: ParkDecoration, collider: PartCollider): void {
  const [w, h, depth] = d.size;
  const opening = 4;
  const spring = 4.5;
  const geometry = sharedGeometry(`park-castle-gate-${w}-${h}-${depth}`, () => {
    // One original contour, including a real arched opening from the floor.
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(-w / 2, h);
    shape.lineTo(w / 2, h);
    shape.lineTo(w / 2, 0);
    shape.lineTo(opening, 0);
    shape.lineTo(opening, spring);
    shape.absarc(0, spring, opening, 0, Math.PI, false);
    shape.lineTo(-opening, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth - 0.32, bevelEnabled: true, bevelThickness: 0.16,
      bevelSize: 0.16, bevelSegments: 2, curveSegments: 16, steps: 1,
    });
    geo.translate(0, 0, -(depth - 0.32) / 2);
    return geo;
  });
  root.add(new THREE.Mesh(geometry, toyMaterial(d.color, 0.5)));
  const supportWidth = w / 2 - opening;
  for (const side of [-1, 1]) {
    const x = side * (opening + supportWidth / 2);
    shadow(root, supportWidth + 1, depth + 1, x, 0);
    collider(`support-${side}`, [x, h / 2, 0], [supportWidth, h, depth]);
    box(root, [supportWidth - 0.8, 0.5, depth + 0.15], [x, 0.35, 0], C.aqua, 0.12);
    for (const face of [-1, 1]) {
      const badge = place(root, new THREE.Mesh(starGeometry(), toyMaterial(d.accent ?? C.coral)), x, 6.3, face * (depth / 2 + 0.18));
      badge.scale.set(1.15, 1.15, 0.7);
      for (const y of [2.2, 4, 8.8]) {
        box(root, [supportWidth - 0.65, 0.08, 0.12], [x, y, face * (depth / 2 + 0.12)], C.cream, 0.035);
      }
    }
  }
  // Narrow overhead slices stay above the curved opening. No enclosing wall
  // blocks the doorway or the reactive CPU's straight north/south route.
  for (let x = -opening; x < opening; x++) {
    const closest = Math.min(Math.abs(x), Math.abs(x + 1));
    const bottom = spring + Math.sqrt(opening * opening - closest * closest);
    collider(`arch-${x}`, [x + 0.5, (bottom + h) / 2, 0], [1, h - bottom, depth]);
  }
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 3;
    box(root, [2.2, 1.55, depth], [x, h + 0.6, 0], i % 2 ? C.cream : C.yellow, 0.28);
    collider(`battlement-${i}`, [x, h + 0.6, 0], [2.2, 1.55, depth]);
  }
  flag(root, 0, h + 1.4, 0, d.accent ?? C.coral, 1.1);
}

function castleTower(root: THREE.Group, d: ParkDecoration, collider: PartCollider): void {
  const [w, h, depth] = d.size;
  const bodyHeight = h * 0.68;
  shadow(root, w + 2, depth + 2);
  box(root, [w, bodyHeight, depth], [0, bodyHeight / 2, 0], d.color, 0.7);
  for (const y of [0.35, bodyHeight * 0.52, bodyHeight - 0.35]) {
    box(root, [w + 0.16, 0.42, depth + 0.16], [0, y, 0], y === 0.35 ? C.aqua : C.cream, 0.2);
  }
  for (let side = 0; side < 4; side++) {
    const window = new THREE.Group();
    window.rotation.y = side * Math.PI / 2;
    root.add(window);
    box(window, [1.45, 2.1, 0.22], [0, bodyHeight * 0.64, depth / 2 + 0.09], d.accent ?? C.aqua, 0.5);
    box(window, [0.85, 1.5, 0.24], [0, bodyHeight * 0.64, depth / 2 + 0.15], C.ink, 0.38);
    box(window, [1.6, 0.22, 0.45], [0, bodyHeight * 0.64 - 1, depth / 2 + 0.15], C.cream, 0.1);
  }
  const roof = place(root, new THREE.Mesh(roofGeometry(), toyMaterial(d.accent ?? C.aqua)), 0, bodyHeight, 0);
  roof.scale.set(w * 0.72, h - bodyHeight, depth * 0.72);
  flag(root, 0, h, 0, C.coral, 0.9);
  collider('tower', [0, bodyHeight / 2, 0], [w + 0.16, bodyHeight, depth + 0.16]);
}

function hedge(root: THREE.Group, d: ParkDecoration, collider: PartCollider): void {
  const [w, h, depth] = d.size;
  shadow(root, w + 1, depth + 1);
  box(root, [w, 0.5, depth], [0, 0.25, 0], C.cream, 0.24);
  box(root, [w - 0.2, h - 0.35, depth - 0.2], [0, (h + 0.35) / 2, 0], C.leaf, 0.45);
  const count = Math.ceil(w / 1.4);
  for (let i = 0; i < count; i++) {
    place(root, ellipsoid(1.65, 0.75, depth - 0.1, d.color), -w / 2 + 0.8 + i * (w - 1.6) / (count - 1), h - 0.15, 0);
  }
  collider('planter', [0, h / 2, 0], [w, h, depth]);
}

function fountain(root: THREE.Group, d: ParkDecoration, collider: PartCollider): void {
  const radius = d.size[0] / 2;
  shadow(root, radius * 2 + 1, radius * 2 + 1);
  // Turned basin profile: broad rounded rim, recessed blue water, central dish.
  const basin = sharedGeometry('park-fountain-basin', () => new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.88, 0),
    new THREE.Vector2(0.96, 0.12), new THREE.Vector2(1, 0.58),
    new THREE.Vector2(0.98, 0.76), new THREE.Vector2(0.88, 0.8),
    new THREE.Vector2(0.8, 0.65), new THREE.Vector2(0.79, 0.4),
    new THREE.Vector2(0, 0.4),
  ], 32));
  place(root, new THREE.Mesh(basin, toyMaterial(d.color)), 0, 0, 0).scale.set(radius, 1, radius);
  disc(root, 0, 0, radius * 0.83, d.accent ?? C.aqua, 0.58);
  cylinder(root, 0.36, 2.4, [0, 1.6, 0], d.color);
  place(root, new THREE.Mesh(basin, toyMaterial(d.color)), 0, 2.35, 0).scale.set(radius * 0.4, 0.6, radius * 0.4);
  place(root, ellipsoid(0.5, 1.2, 0.5, C.aqua), 0, 3.35, 0);
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * TAU;
    const stream = place(root, ellipsoid(0.17, 1.45, 0.17, C.aqua), Math.cos(angle) * radius * 0.33, 1.8, Math.sin(angle) * radius * 0.33);
    stream.rotation.z = Math.cos(angle) * 0.1;
  }
  // Two crossed strips follow the round basin much more closely than a
  // full square whose invisible corners would catch passing players.
  collider('basin-x', [0, 0.4, 0], [radius * 1.8, 0.8, radius * 1.05]);
  collider('basin-z', [0, 0.4, 0], [radius * 1.05, 0.8, radius * 1.8]);
  collider('stem', [0, 1.8, 0], [0.72, 2.6, 0.72]);
  collider('dish', [0, 2.58, 0], [radius * 0.8, 0.48, radius * 0.8]);
}

function archBand(inner: number, outer: number, depth: number): THREE.BufferGeometry {
  return sharedGeometry(`park-arch-${inner}-${outer}-${depth}`, () => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outer, 0, Math.PI, false);
    shape.lineTo(-inner, 0);
    shape.absarc(0, 0, inner, Math.PI, 0, true);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth - 0.14, bevelEnabled: true, bevelThickness: 0.07,
      bevelSize: 0.07, bevelSegments: 2, curveSegments: 20, steps: 1,
    });
    geometry.translate(0, 0, -(depth - 0.14) / 2);
    return geometry;
  });
}

function rainbowGate(root: THREE.Group, d: ParkDecoration, collider: PartCollider): void {
  const outer = d.size[0] / 2;
  const spring = d.size[1] - outer;
  const band = 0.58;
  const colors = [C.coral, C.yellow, C.cream, C.mint, C.aqua];
  const inner = outer - colors.length * band;
  for (let i = 0; i < colors.length; i++) {
    const r = outer - i * band;
    place(root, new THREE.Mesh(archBand(r - band, r, d.size[2]), toyMaterial(colors[i])), 0, spring, 0);
    for (const side of [-1, 1]) {
      box(root, [band, spring, d.size[2]], [side * (r - band / 2), spring / 2, 0], colors[i], 0.08);
    }
  }
  for (const side of [-1, 1]) {
    const x = side * (inner + (outer - inner) / 2);
    shadow(root, outer - inner + 1, d.size[2] + 2, x, 0);
    collider(`support-${side}`, [x, spring / 2, 0], [outer - inner, spring, d.size[2]]);
  }
  // Small AABBs fit INSIDE the curved rainbow instead of boxing its void.
  const segments = 20;
  for (let i = 0; i < segments; i++) {
    const left = -outer + i * outer * 2 / segments;
    const right = left + outer * 2 / segments;
    const near = Math.min(Math.abs(left), Math.abs(right));
    const far = Math.max(Math.abs(left), Math.abs(right));
    const bottom = spring + Math.sqrt(Math.max(0, inner * inner - near * near));
    const top = spring + Math.sqrt(Math.max(0, outer * outer - far * far));
    if (top > bottom) collider(`arc-${i}`, [(left + right) / 2, (top + bottom) / 2, 0], [right - left, top - bottom, d.size[2]]);
  }
}

function cloudCover(root: THREE.Group, d: ParkDecoration, collider: PartCollider): void {
  const [w, h, depth] = d.size;
  shadow(root, w + 1, depth + 1);
  box(root, [w, h * 0.7, depth], [0, h * 0.35, 0], d.accent ?? C.aqua, 0.65);
  box(root, [w, h * 0.5, depth], [0, h * 0.61, 0], d.color, 0.6);
  for (let i = 0; i < 3; i++) {
    const height = i === 1 ? h * 0.72 : h * 0.55;
    const width = w * 0.46;
    const x = (i - 1) * w * 0.26;
    place(root, ellipsoid(width, height, depth, d.color), x, h - height / 2, 0);
  }
  // The scalloped top is cosmetic; the broad lower cushion is solid cover.
  collider('cushion', [0, h * 0.45, 0], [w, h * 0.9, depth]);
}

function balloon(root: THREE.Group, d: ParkDecoration): void {
  const [w, h] = d.size;
  const envelope = sharedGeometry('park-balloon-panel', () => new THREE.LatheGeometry([
    new THREE.Vector2(0.08, 0), new THREE.Vector2(0.23, 0.12),
    new THREE.Vector2(0.43, 0.38), new THREE.Vector2(0.5, 0.62),
    new THREE.Vector2(0.46, 0.81), new THREE.Vector2(0.29, 0.96),
    new THREE.Vector2(0, 1),
  ], 5, 0, TAU / 12));
  for (let i = 0; i < 12; i++) {
    const panel = place(root, new THREE.Mesh(envelope, toyMaterial(i % 2 ? d.color : C.cream)), 0, h * 0.25, 0);
    panel.scale.set(w, h * 0.75, w);
    panel.rotation.y = i / 12 * TAU;
  }
  box(root, [w * 0.28, h * 0.09, w * 0.25], [0, h * 0.045, 0], C.cream, 0.35);
  box(root, [w * 0.29, h * 0.025, w * 0.26], [0, h * 0.1, 0], d.color, 0.14);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) cylinder(root, 0.05, h * 0.22, [x * w * 0.11, h * 0.2, z * w * 0.09], C.cream);
  }
}

function starGeometry(): THREE.BufferGeometry {
  return sharedGeometry('park-star', () => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + i / 10 * TAU;
      const radius = i % 2 ? 0.48 : 1;
      if (i === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  });
}

function addBoundary(scene: THREE.Scene, collision: CollisionWorld, map: MapConfig): void {
  const half = map.sizeMeters / 2;
  for (let side = 0; side < 4; side++) {
    const edge = new THREE.Group();
    edge.rotation.y = side * Math.PI / 2;
    scene.add(edge);
    // The visible inner face and the collision boundary both start at half.
    box(edge, [map.sizeMeters + 1, 0.55, 1], [0, 0.275, half + 0.5], C.cream, 0.18);
    box(edge, [map.sizeMeters + 1, 0.2, 0.3], [0, 1.2, half + 0.5], C.aqua, 0.08);
    const count = Math.ceil(map.sizeMeters / 4);
    for (let i = 0; i <= count; i++) {
      const x = -half + i * map.sizeMeters / count;
      box(edge, [0.35, 1.7, 0.35], [x, 0.85, half + 0.5], C.cream, 0.17);
      place(edge, backdropLobe(0.55, 0.55, 0.55, i % 3 === 0 ? C.coral : C.yellow), x, 1.7, half + 0.5);
      if (map.theme === 'cloud') {
        const lobe = place(edge, backdropLobe(6.2, 3.5 + i % 3, 5, C.white), x, -0.5, half + 3.1);
        lobe.name = 'perimeter-cloud';
      }
    }
    const horizontal = side % 2 === 0;
    const direction = side < 2 ? 1 : -1;
    const center = new THREE.Vector3(horizontal ? 0 : direction * (half + 1), 15, horizontal ? direction * (half + 1) : 0);
    collision.add({
      id: `bound-${side}`,
      aabb: makeAABB(center, new THREE.Vector3(horizontal ? map.sizeMeters + 4 : 2, 30, horizontal ? 2 : map.sizeMeters + 4)),
      blocksMovement: true, blocksProjectile: true,
    });
  }
}

function addGardens(scene: THREE.Scene, map: MapConfig): void {
  const desktop = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const half = map.sizeMeters / 2;
  const count = desktop ? 32 : 20;
  for (let i = 0; i < count; i++) {
    const angle = i / count * TAU + 0.17;
    // Square perimeter, not a circle which would put trees in playable corners.
    const distance = (half + 8 + (i % 3) * 3) / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    if (map.theme === 'cloud') {
      for (let lobe = 0; lobe < 3; lobe++) {
        place(scene, backdropLobe(8, 4 + lobe, 6, C.white), x + (lobe - 1) * 3, -4 - i % 4, z);
      }
      if (i % 4 === 0) {
        const star = place(scene, new THREE.Mesh(starGeometry(), toyMaterial(C.yellow)), x, 7 + i % 3, z);
        star.scale.setScalar(1.5);
        star.rotation.y = -angle;
      }
    } else {
      const height = 5 + i % 3;
      cylinder(scene, 0.5, height * 0.8, [x, height * 0.4, z], C.cream);
      place(scene, backdropLobe(5, height, 4.5, i % 3 ? C.mint : C.leaf), x, height, z);
      place(scene, backdropLobe(3, 3.8, 3, C.mint), x + 1.6, height - 1.2, z + 0.5);
    }
  }
  // Flowers are curated, low floor inlays, not randomly scattered obstacles.
  for (const xSide of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const x = xSide * (half - 7);
      const z = zSide * (half - 7);
      disc(scene, x, z, 3, map.theme === 'cloud' ? C.white : C.leaf);
      for (let i = 0; i < 5; i++) {
        const angle = i / 5 * TAU;
        const fx = x + Math.cos(angle) * 1.8;
        const fz = z + Math.sin(angle) * 1.8;
        for (let petal = 0; petal < 5; petal++) {
          const a = petal / 5 * TAU;
          disc(scene, fx + Math.cos(a) * 0.25, fz + Math.sin(a) * 0.25, 0.24, C.cream, 0.035);
        }
        disc(scene, fx, fz, 0.18, C.yellow, 0.039);
      }
    }
  }
  const clouds = desktop ? 18 : 12;
  for (let i = 0; i < clouds; i++) {
    const angle = i / clouds * TAU;
    const radius = map.sizeMeters * 1.05;
    for (let lobe = 0; lobe < 3; lobe++) {
      const cloud = place(scene, backdropLobe(8, lobe === 1 ? 5 : 3.6, 5, C.white),
        Math.cos(angle) * radius + (lobe - 1) * 3.5, 29 + i % 4 * 4, Math.sin(angle) * radius);
      cloud.material = flatMaterial(C.white);
    }
  }
}

function legacyDecoration(root: THREE.Group, d: PrimitiveDecoration, collider: PartCollider): void {
  let geometry: THREE.BufferGeometry;
  switch (d.kind) {
    case 'box': geometry = roundedBox(...d.size); break;
    case 'cylinder':
      geometry = sharedGeometry('park-legacy-cylinder', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 24)); break;
    case 'sphere':
      geometry = sharedGeometry('sphere-20-14', () => new THREE.SphereGeometry(0.5, 20, 14)); break;
    case 'pyramid':
      geometry = sharedGeometry('park-legacy-pyramid', () => new THREE.ConeGeometry(0.5, 1, 4)); break;
  }
  const mesh = new THREE.Mesh(geometry, toyMaterial(d.color));
  if (d.kind !== 'box') mesh.scale.set(...d.size);
  root.add(mesh);
  collider('body', [0, 0, 0], d.size);
}

function addLegacyScatter(scene: THREE.Scene, map: MapConfig): void {
  for (const [groupIndex, group] of (map.scatter ?? []).entries()) {
    for (let i = 0; i < group.count; i++) {
      const angle = i * 2.399963 + groupIndex;
      const radius = THREE.MathUtils.lerp(...group.radius, Math.sqrt((i + 0.5) / group.count));
      const scale = THREE.MathUtils.lerp(...group.scale, (i * 0.618034) % 1);
      const mesh = ellipsoid(scale, scale, scale, group.color);
      place(scene, mesh, Math.cos(angle) * radius, (group.height ?? 0) + scale / 2, Math.sin(angle) * radius);
    }
  }
}

/** Shared geometry/material pairs become one instance buffer per world. */
function batchStaticParts(scene: THREE.Scene, ground: THREE.Mesh): void {
  scene.updateMatrixWorld(true);
  const batches = new Map<string, THREE.Mesh[]>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object === ground || object.material instanceof Array) return;
    // Transparent contact shadows retain sorting and are inexpensive quads.
    if (object.material.transparent || !object.geometry.userData.sharedVisualResource) return;
    const key = `${object.geometry.uuid}-${object.material.uuid}-${object.renderOrder}`;
    const entries = batches.get(key);
    if (entries) entries.push(object);
    else batches.set(key, [object]);
  });
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const first = meshes[0];
    const instanced = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    instanced.name = `park-parts-${first.geometry.type}`;
    instanced.renderOrder = first.renderOrder;
    for (let i = 0; i < meshes.length; i++) {
      instanced.setMatrixAt(i, meshes[i].matrixWorld);
      meshes[i].removeFromParent();
    }
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
    scene.add(instanced);
  }
}
