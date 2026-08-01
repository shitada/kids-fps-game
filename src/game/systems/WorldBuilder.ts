import * as THREE from 'three';
import type { Decoration, MapConfig, ScatterGroup, ScatterKind } from '@/types';
import { CollisionWorld, makeAABB } from '@/game/systems/CollisionWorld';

export interface BuiltWorld {
  scene: THREE.Scene;
  collision: CollisionWorld;
  ground: THREE.Mesh;
  /** 毎フレーム呼ぶと雲などがゆっくり動く。 */
  update: (dt: number) => void;
}

const GROUND_TILE = 6;
const CLOUD_COUNT = 24;

export function buildWorld(map: MapConfig): BuiltWorld {
  const scene = new THREE.Scene();
  const skyBottom = new THREE.Color(map.skyColor);
  const skyTop = new THREE.Color(map.skyTopColor ?? shiftColor(map.skyColor, -0.02, -0.22));
  scene.background = skyBottom.clone();
  scene.fog = new THREE.Fog(skyBottom.getHex(), map.sizeMeters * 0.6, map.sizeMeters * 2.0);

  addSkyDome(scene, map, skyTop, skyBottom);
  addLighting(scene, map);

  const ground = buildGround(map);
  scene.add(ground);
  scene.add(buildGroundGrid(map));

  const updaters: Array<(dt: number) => void> = [];
  updaters.push(addClouds(scene, map));

  const collision = new CollisionWorld();

  map.decorations.forEach((d, idx) => {
    const group = buildDecoration(d);
    scene.add(group);
    const center = new THREE.Vector3(d.position[0], d.position[1], d.position[2]);
    const size = new THREE.Vector3(d.size[0], d.size[1], d.size[2]);
    collision.add({
      id: `deco-${idx}`,
      aabb: makeAABB(center, size),
      blocksMovement: true,
      blocksProjectile: true,
    });
  });

  (map.scatter ?? []).forEach((group, idx) => {
    const mesh = buildScatter(group, map, idx);
    if (mesh) scene.add(mesh);
  });

  addBoundaryFence(scene, map);

  // 周囲に見えない壁を作って外に出られないようにする
  const half = map.sizeMeters / 2;
  const wallHeight = 30;
  const wallThickness = 2;
  const walls: Array<[number, number, number, number]> = [
    [0, half + wallThickness / 2, map.sizeMeters + wallThickness * 2, wallThickness],
    [0, -(half + wallThickness / 2), map.sizeMeters + wallThickness * 2, wallThickness],
    [half + wallThickness / 2, 0, wallThickness, map.sizeMeters + wallThickness * 2],
    [-(half + wallThickness / 2), 0, wallThickness, map.sizeMeters + wallThickness * 2],
  ];
  walls.forEach(([x, z, sx, sz], i) => {
    const center = new THREE.Vector3(x, wallHeight / 2, z);
    const size = new THREE.Vector3(sx, wallHeight, sz);
    collision.add({
      id: `bound-${i}`,
      aabb: makeAABB(center, size),
      blocksMovement: true,
      blocksProjectile: true,
    });
  });

  const update = (dt: number): void => {
    for (const fn of updaters) fn(dt);
  };

  return { scene, collision, ground, update };
}

function addLighting(scene: THREE.Scene, map: MapConfig): void {
  const hemi = new THREE.HemisphereLight(0xffffff, map.groundColor, 0.85);
  scene.add(hemi);

  // かげになった面がまっ暗にならないように、うすい環境光を足す
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4d6, 0.85);
  sun.position.set(40, 80, 20);
  scene.add(sun);

  // 逆側からの弱い光。影側がまっ黒にならないようにする。
  const fill = new THREE.DirectionalLight(0xcfe9ff, 0.28);
  fill.position.set(-50, 35, -30);
  scene.add(fill);
}

function addSkyDome(scene: THREE.Scene, map: MapConfig, top: THREE.Color, bottom: THREE.Color): void {
  const radius = map.sizeMeters * 2.1;
  const geo = new THREE.SphereGeometry(radius, 24, 16);
  const position = geo.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const t = THREE.MathUtils.clamp((position.getY(i) / radius) * 0.5 + 0.5, 0, 1);
    c.copy(bottom).lerp(top, smoothStep(t));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const dome = new THREE.Mesh(geo, mat);
  dome.name = 'sky-dome';
  dome.renderOrder = -2;
  scene.add(dome);

  const sunDir = new THREE.Vector3(0.42, 0.5, 0.28).normalize();
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.13, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff1a8, fog: false, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  glow.position.copy(sunDir).multiplyScalar(radius * 0.9);
  glow.lookAt(0, 0, 0);
  glow.renderOrder = -1;

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.06, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff8d6, fog: false, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  sunDisc.position.copy(sunDir).multiplyScalar(radius * 0.89);
  sunDisc.lookAt(0, 0, 0);
  sunDisc.renderOrder = -1;

  scene.add(glow, sunDisc);
}

/**
 * 地面を細かいタイルに分けて頂点カラーでまだら模様にする。
 * 単色の平面だと自分が動いているのかどうか分かりにくいので、
 * 市松＋ゆらぎで進んでいる感覚が出るようにしている。
 */
function buildGround(map: MapConfig): THREE.Mesh {
  const span = map.sizeMeters * 2.4;
  const segments = Math.max(8, Math.round(span / GROUND_TILE));
  const geo = new THREE.PlaneGeometry(span, span, segments, segments);
  const base = new THREE.Color(map.groundColor);
  const accent = new THREE.Color(map.groundAccentColor ?? shiftColor(map.groundColor, 0.02, -0.1));
  const position = geo.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const tileX = Math.floor((x + span / 2) / GROUND_TILE + 0.5);
    const tileY = Math.floor((y + span / 2) / GROUND_TILE + 0.5);
    const checker = (tileX + tileY) % 2 === 0 ? 0 : 1;
    const wobble = pseudoRandom(tileX * 31 + tileY * 17);
    const t = THREE.MathUtils.clamp(checker * 0.6 + wobble * 0.3, 0, 1);
    c.copy(base).lerp(accent, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const ground = new THREE.Mesh(geo, mat);
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  return ground;
}

/** 距離感をつかみやすくするための、うっすらしたグリッド線。 */
function buildGroundGrid(map: MapConfig): THREE.LineSegments {
  const span = map.sizeMeters;
  const step = 8;
  const points: number[] = [];
  for (let v = -span / 2; v <= span / 2 + 0.001; v += step) {
    points.push(-span / 2, 0, v, span / 2, 0, v);
    points.push(v, 0, -span / 2, v, 0, span / 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
  const grid = new THREE.LineSegments(geo, mat);
  grid.name = 'ground-grid';
  grid.position.y = 0.02;
  return grid;
}

/** 遊び場のまわりを囲むカラフルな柵。どこまで行けるかが見て分かるようにする。 */
function addBoundaryFence(scene: THREE.Scene, map: MapConfig): void {
  const half = map.sizeMeters / 2;
  const step = 5;
  const postGeo = new THREE.CylinderGeometry(0.18, 0.24, 2.4, 6);
  const palette = [0xff8a65, 0xffd166, 0x8fdfff, 0xb0e57c];
  const perSide = Math.floor(map.sizeMeters / step) + 1;
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const instanced = new THREE.InstancedMesh(postGeo, mat, perSide * 4);
  instanced.name = 'boundary-fence';
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let index = 0;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < perSide; i++) {
      const t = -half + i * step;
      const x = side < 2 ? t : side === 2 ? -half : half;
      const z = side === 0 ? -half : side === 1 ? half : t;
      dummy.position.set(x, 1.2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
      instanced.setColorAt(index, color.setHex(palette[(i + side) % palette.length]));
      index++;
    }
  }
  instanced.count = index;
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  scene.add(instanced);
}

function addClouds(scene: THREE.Scene, map: MapConfig): (dt: number) => void {
  const geo = new THREE.SphereGeometry(1, 10, 7);
  // 雲は光の当たり方で灰色に見えるとさびしいので、白いベタ塗りにする
  const mat = new THREE.MeshBasicMaterial({ color: 0xfdfdff, transparent: true, opacity: 0.93, fog: false });
  const lobesPerCloud = 3;
  const instanced = new THREE.InstancedMesh(geo, mat, CLOUD_COUNT * lobesPerCloud);
  instanced.name = 'clouds';
  const dummy = new THREE.Object3D();
  const seeds: Array<{ angle: number; radius: number; y: number; scale: number; ox: number; oy: number; oz: number }> = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const angle = (i / CLOUD_COUNT) * Math.PI * 2 + pseudoRandom(i) * 0.3;
    const radius = map.sizeMeters * (0.72 + pseudoRandom(i * 3) * 0.5);
    const y = 24 + pseudoRandom(i * 5) * 16;
    const scale = 3.6 + pseudoRandom(i * 7) * 3;
    for (let lobe = 0; lobe < lobesPerCloud; lobe++) {
      const lobeScale = scale * (lobe === 1 ? 1 : 0.62 + pseudoRandom(i * 11 + lobe) * 0.26);
      seeds.push({
        angle,
        radius,
        y,
        scale: lobeScale,
        ox: (lobe - 1) * scale * 0.9,
        oy: lobe === 1 ? scale * 0.24 : 0,
        oz: (pseudoRandom(i * 13 + lobe) - 0.5) * scale * 0.5,
      });
    }
  }

  let drift = 0;
  const apply = (): void => {
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const a = s.angle + drift;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      dummy.position.set(cos * s.radius - sin * s.ox, s.y + s.oy, sin * s.radius + cos * s.ox + s.oz);
      dummy.rotation.set(0, a, 0);
      dummy.scale.set(s.scale, s.scale * 0.55, s.scale);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
  };
  apply();
  scene.add(instanced);

  return (dt: number) => {
    drift += dt * 0.008;
    apply();
  };
}

function buildScatter(group: ScatterGroup, map: MapConfig, groupIndex: number): THREE.InstancedMesh | null {
  const geo = scatterGeometry(group.kind);
  if (!geo || group.count <= 0) return null;
  const transparent = group.kind === 'cloudlet';
  // InstancedMesh の setColorAt を使うときは vertexColors を立てない。
  // 立てるとジオメトリの color 属性（存在しない）を読みにいって真っ黒になる。
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent, opacity: transparent ? 0.85 : 1 });
  const instanced = new THREE.InstancedMesh(geo, mat, group.count);
  instanced.name = `scatter-${group.kind}-${groupIndex}`;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const base = new THREE.Color(group.color);
  // 柵の外にも置けるようにして、まわりを森でかこむ表現ができるようにする
  const limit = map.sizeMeters * 1.25;
  const golden = Math.PI * (3 - Math.sqrt(5));
  let placed = 0;
  for (let i = 0; i < group.count; i++) {
    const angle = i * golden + groupIndex * 1.7;
    const t = (i + 0.5) / group.count;
    const radius = group.radius[0] + (group.radius[1] - group.radius[0]) * Math.sqrt(t);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) > limit || Math.abs(z) > limit) continue;
    const scale = group.scale[0] + (group.scale[1] - group.scale[0]) * pseudoRandom(i + groupIndex * 31);
    dummy.position.set(x, (group.height ?? 0) + scatterYOffset(group.kind) * scale, z);
    dummy.rotation.set(group.kind === 'floaty' ? Math.PI / 2 : 0, angle * 2.3, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    instanced.setMatrixAt(placed, dummy.matrix);
    color.copy(base).multiplyScalar(0.86 + pseudoRandom(i * 7 + groupIndex) * 0.28);
    instanced.setColorAt(placed, color);
    placed++;
  }
  instanced.count = placed;
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  return placed > 0 ? instanced : null;
}

function scatterGeometry(kind: ScatterKind): THREE.BufferGeometry | null {
  switch (kind) {
    case 'tree':
      return new THREE.ConeGeometry(1.1, 3.2, 7);
    case 'bush':
      return new THREE.SphereGeometry(0.85, 8, 6);
    case 'flower':
      return new THREE.ConeGeometry(0.3, 0.7, 5);
    case 'ball':
      return new THREE.SphereGeometry(0.55, 10, 8);
    case 'floaty':
      return new THREE.TorusGeometry(0.7, 0.24, 8, 14);
    case 'cloudlet':
      return new THREE.SphereGeometry(1.4, 8, 6);
    default:
      return null;
  }
}

function scatterYOffset(kind: ScatterKind): number {
  switch (kind) {
    case 'tree':
      return 1.7;
    case 'bush':
      return 0.7;
    case 'flower':
      return 0.35;
    case 'ball':
      return 0.55;
    case 'floaty':
      return 0.26;
    case 'cloudlet':
      return 1.2;
    default:
      return 0;
  }
}

function buildDecoration(d: Decoration): THREE.Group {
  const group = new THREE.Group();
  const mesh = buildDecorationMesh(d);
  mesh.position.set(d.position[0], d.position[1], d.position[2]);
  group.add(mesh);

  // 接地感を出すためのうっすらした丸い影（リアルタイム影は使わない）
  const shadowRadius = Math.max(d.size[0], d.size[2]) * 0.58;
  if (shadowRadius > 0.4) {
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(shadowRadius, 16),
      new THREE.MeshBasicMaterial({ color: 0x2f4858, transparent: true, opacity: 0.16, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(d.position[0], 0.03, d.position[2]);
    group.add(shadow);
  }
  return group;
}

function buildDecorationMesh(d: Decoration): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  switch (d.kind) {
    case 'box':
      geo = new THREE.BoxGeometry(d.size[0], d.size[1], d.size[2]);
      break;
    case 'cylinder':
      geo = new THREE.CylinderGeometry(d.size[0] / 2, d.size[0] / 2, d.size[1], 18);
      break;
    case 'pyramid':
      geo = new THREE.ConeGeometry(d.size[0] / 2, d.size[1], 4);
      break;
    case 'sphere':
      geo = new THREE.SphereGeometry(d.size[0] / 2, 18, 12);
      break;
  }
  const mat = new THREE.MeshLambertMaterial({ color: d.color });
  return new THREE.Mesh(geo, mat);
}

function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

function pseudoRandom(seed: number): number {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function shiftColor(hex: number, hueShift: number, lightnessShift: number): number {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(
    (hsl.h + hueShift + 1) % 1,
    THREE.MathUtils.clamp(hsl.s * 1.05, 0, 1),
    THREE.MathUtils.clamp(hsl.l + lightnessShift, 0.04, 0.98),
  );
  return c.getHex();
}
