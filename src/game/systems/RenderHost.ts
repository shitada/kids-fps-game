import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { QUALITY } from '@/game/config/visuals';
import { RenderQuality } from '@/game/config/RenderQuality';
import { isTouchDevice } from '@/game/input/touchDevice';
import { disposeSharedVisualResources } from './VisualResources';

export class RenderHost {
  readonly renderer: THREE.WebGLRenderer;
  readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private environment: THREE.WebGLRenderTarget;
  private quality: RenderQuality;
  private lastFrame = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.quality = new RenderQuality(Math.min(window.devicePixelRatio || 1,
      isTouchDevice() ? QUALITY.touchPixelRatio : QUALITY.desktopPixelRatio));
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(this.renderer);
    this.environment = generator.fromScene(room, 0.04);
    room.dispose();
    generator.dispose();
    this.resize();
  }

  prepareScene(scene: THREE.Scene): void {
    scene.environment = this.environment.texture;
    scene.environmentIntensity = 0.65;
    this.lastFrame = 0;
    this.quality.reset();
  }

  resize(): { width: number; height: number } {
    const width = Math.max(1, Math.round(window.visualViewport?.width ?? window.innerWidth));
    const height = Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight));
    this.renderer.setSize(width, height, false);
    return { width, height };
  }

  render(scene: THREE.Scene, camera: THREE.Camera, measure = true): void {
    const now = performance.now();
    const frameMs = now - this.lastFrame;
    if (measure && this.lastFrame > 0 && !document.hidden) {
      const ratio = this.quality.sample(frameMs);
      if (this.renderer.getPixelRatio() !== ratio) {
        this.renderer.setPixelRatio(ratio);
        this.resize();
      }
    } else if (!measure || document.hidden) {
      this.quality.reset();
    }
    this.lastFrame = measure && !document.hidden ? now : 0;
    this.renderer.render(scene, camera);
    this.canvas.dataset.pixelRatio = this.quality.pixelRatio.toFixed(2);
    this.canvas.dataset.drawCalls = String(this.renderer.info.render.calls);
    this.canvas.dataset.triangles = String(this.renderer.info.render.triangles);
    this.canvas.dataset.geometries = String(this.renderer.info.memory.geometries);
    this.canvas.dataset.textures = String(this.renderer.info.memory.textures);
  }

  dispose(): void {
    this.environment.dispose();
    disposeSharedVisualResources();
    this.renderer.dispose();
  }
}
