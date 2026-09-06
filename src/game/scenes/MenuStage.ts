import * as THREE from 'three';
import type { MapConfig, SkinId } from '@/types';
import { SKINS } from '@/game/config/skins';
import { AgentVisual, type AgentVisualState } from '@/game/entities/AgentVisual';
import { buildWorld } from '@/game/systems/WorldBuilder';
import { disposeObject3D } from '@/game/systems/disposeObject';
import { contactShadow, ellipsoid, sharedGeometry, toyBox, toyMaterial } from '@/game/systems/VisualResources';
import type { SceneContext } from './Scene';

const skinThumbnails = new Map<SkinId, string>();
const mapThumbnails = new Map<string, string>();

/** A menu owns its models and animation, never the application's renderer/environment. */
export class MenuStage {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 120);
  private mascot: AgentVisual | null = null;
  private friends: AgentVisual[] = [];
  private raf = 0;
  private observer: ResizeObserver;
  private menu: Element | null;
  private disposed = false;
  private state: AgentVisualState = { elapsedSec: 0, moveSpeed: 0, onGround: true, aimPitch: 0, hpRatio: 1 };

  constructor(
    private ctx: SceneContext,
    private viewport: HTMLElement,
    skin: SkinId,
    private mode: 'title' | 'skin' | 'result' | 'map',
  ) {
    this.scene.background = new THREE.Color(0xd7eee8);
    this.scene.add(new THREE.HemisphereLight(0xfffaf0, 0x80b4ab, 2));
    const sun = new THREE.DirectionalLight(0xfff4db, 2.5);
    sun.position.set(-4, 8, 5);
    this.scene.add(sun);
    ctx.renderHost.prepareScene(this.scene);
    this.camera.position.set(3.1, 2.7, 7);
    this.camera.lookAt(0, 1, 0);
    this.makePark();
    this.selectSkin(skin);
    if (mode === 'title') {
      for (const [id, x, z] of [['usagi', -1.65, -0.55], ['robo', 1.6, -0.8]] as const) {
        const friend = new AgentVisual(SKINS[id]);
        friend.root.position.set(x, 0.32, z);
        friend.root.rotation.y = Math.PI + 0.3;
        friend.root.scale.setScalar(0.8);
        this.friends.push(friend);
        this.scene.add(friend.root);
        const shadow = contactShadow(1.4, 1.1);
        shadow.position.set(x, 0.33, z);
        this.scene.add(shadow);
      }
    }
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(viewport);
    this.menu = viewport.closest('.park-menu');
    this.menu?.addEventListener('scroll', this.resize, { passive: true });
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    this.resize();
    if (!ctx.renderHost.reducedMotion) this.raf = requestAnimationFrame(this.frame);
  }

  selectSkin(skin: SkinId): void {
    if (this.mascot) {
      this.scene.remove(this.mascot.root);
      disposeObject3D(this.mascot.root);
    }
    this.mascot = new AgentVisual(SKINS[skin]);
    this.mascot.root.position.y = 0.32;
    this.mascot.root.rotation.y = Math.PI + 0.32;
    this.mascot.update(this.state);
    this.scene.add(this.mascot.root);
    this.ctx.renderHost.render(this.scene, this.camera, false);
  }

  /** Synchronous copies happen before the drawing buffer clears. One renderer, no retained worlds. */
  skinThumbnail(skin: SkinId): string {
    const cached = skinThumbnails.get(skin);
    if (cached) return cached;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaf4ed);
    scene.add(new THREE.HemisphereLight(0xfffaf0, 0x89b7ac, 2.3));
    const light = new THREE.DirectionalLight(0xfff3de, 2.5);
    light.position.set(-3, 5, 4);
    scene.add(light);
    const visual = new AgentVisual(SKINS[skin]);
    visual.root.rotation.y = Math.PI + 0.25;
    visual.update(this.state);
    scene.add(visual.root, contactShadow(1.6, 1.2));
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
    camera.position.set(1.4, 1.7, 4.5);
    camera.lookAt(0, 1, 0);
    const image = this.snapshot(scene, camera, 256, 256);
    skinThumbnails.set(skin, image);
    return image;
  }

  mapThumbnail(map: MapConfig): string {
    const cached = mapThumbnails.get(map.id);
    if (cached) return cached;
    const world = buildWorld(map);
    world.update(0);
    // A clear elevated three-quarter view of the actual playable world.
    world.scene.fog = null;
    const camera = new THREE.PerspectiveCamera(38, 1.65, 0.1, 600);
    const size = map.sizeMeters;
    camera.position.set(size * 0.64, size * 0.73, size * 0.82);
    camera.lookAt(0, 0, 0);
    const image = this.snapshot(world.scene, camera, 528, 320);
    mapThumbnails.set(map.id, image);
    return image;
  }

  private snapshot(scene: THREE.Scene, camera: THREE.Camera, width: number, height: number): string {
    const host = this.ctx.renderHost;
    try {
      host.prepareScene(scene);
      host.renderer.setSize(width, height, false);
      host.render(scene, camera, false);
      const copy = document.createElement('canvas');
      copy.width = width;
      copy.height = height;
      const painter = copy.getContext('2d');
      if (!painter) throw new Error('Menu preview canvas is unavailable');
      painter.drawImage(host.renderer.domElement, 0, 0, width, height);
      return copy.toDataURL('image/png');
    } finally {
      disposeObject3D(scene);
      scene.clear();
      host.prepareScene(this.scene);
      this.resize();
    }
  }

  private makePark(): void {
    const floor = toyBox(100, 0.3, 100, 0xd7eee8);
    floor.position.y = -0.5;
    this.scene.add(floor);
    const plinth = new THREE.Mesh(
      sharedGeometry('menu-plinth', () => new THREE.CylinderGeometry(3.1, 3.15, 0.5, 64)),
      toyMaterial(0xfff4d9, 0.65),
    );
    plinth.position.y = 0.06;
    this.scene.add(plinth);
    const ring = new THREE.Mesh(
      sharedGeometry('menu-pool-rim', () => new THREE.TorusGeometry(3.12, 0.12, 10, 64)),
      toyMaterial(0x53bfb5),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    this.scene.add(ring);
    const shadow = contactShadow(2, 1.5);
    shadow.position.y = 0.325;
    this.scene.add(shadow);
    // A miniature water-park gateway, rather than a flat decorative backdrop.
    for (const [index, color] of [0xf07b69, 0xffd283, 0x71c9bf].entries()) {
      const arch = new THREE.Mesh(
        sharedGeometry(`menu-arch-${index}`, () => new THREE.TorusGeometry(1.7 + index * 0.22, 0.105, 8, 36, Math.PI)),
        toyMaterial(color),
      );
      arch.position.set(0, 0.8, -2.1);
      this.scene.add(arch);
    }
    for (const x of [-2.2, 2.2]) {
      const tower = toyBox(0.5, 1.3, 0.5, 0x78c9c0, 0.2);
      tower.position.set(x, 0.75, -1.75);
      const cap = ellipsoid(0.8, 0.25, 0.8, 0xffcc7b);
      cap.position.set(x, 1.5, -1.75);
      this.scene.add(tower, cap);
    }
    if (this.mode === 'result') {
      for (let i = 0; i < 9; i++) {
        const ball = ellipsoid(0.16, 0.16, 0.16, [0xf07b69, 0xffcc7b, 0x53bfb5][i % 3]);
        ball.position.set(Math.cos(i * 2.4) * 2.4, 1.7 + Math.sin(i * 1.7), Math.sin(i * 2.4) * 1.2);
        this.scene.add(ball);
      }
    }
  }

  private resize = (): void => {
    if (this.disposed) return;
    const { width, height } = this.ctx.renderHost.resize();
    const rect = this.viewport.getBoundingClientRect();
    const span = (this.mode === 'title' ? 4.8 : 4.3) * height / Math.max(100, rect.height);
    this.camera.left = -span * width / height / 2;
    this.camera.right = span * width / height / 2;
    this.camera.top = span / 2;
    this.camera.bottom = -span / 2;
    this.camera.setViewOffset(width, height, width / 2 - rect.left - rect.width / 2, height / 2 - rect.top - rect.height / 2, width, height);
    this.camera.updateProjectionMatrix();
    this.ctx.renderHost.render(this.scene, this.camera, false);
  };

  private frame = (now: number): void => {
    if (this.disposed) return;
    if (!document.hidden) {
      this.state.elapsedSec = now / 1000;
      this.mascot?.update(this.state);
      for (const friend of this.friends) friend.update(this.state);
      if (this.mascot && this.mode === 'result') {
        this.mascot.root.position.y = 0.32 + Math.abs(Math.sin(now / 420)) * 0.16;
        this.mascot.root.rotation.y = Math.PI + 0.32 + Math.sin(now / 700) * 0.12;
      }
      this.ctx.renderHost.render(this.scene, this.camera, false);
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.menu?.removeEventListener('scroll', this.resize);
    window.removeEventListener('resize', this.resize);
    window.visualViewport?.removeEventListener('resize', this.resize);
    disposeObject3D(this.scene);
    this.scene.clear();
    this.friends = [];
    this.mascot = null;
  }
}
