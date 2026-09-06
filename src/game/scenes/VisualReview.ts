import * as THREE from 'three';
import { RenderHost } from '@/game/systems/RenderHost';
import { buildWorld } from '@/game/systems/WorldBuilder';
import { MAPS } from '@/game/config/maps';
import { SKINS, SKIN_ORDER } from '@/game/config/skins';
import { AgentVisual } from '@/game/entities/AgentVisual';
import { contactShadow, toyBox } from '@/game/systems/VisualResources';
import { disposeObject3D } from '@/game/systems/disposeObject';

/** Development-only, deterministic views of the same assets used during play. */
export function startVisualReview(canvas: HTMLCanvasElement): void {
  const params = new URLSearchParams(location.search);
  const mode = params.get('review');
  const host = new RenderHost(canvas);
  let scene: THREE.Scene;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  if (mode === 'mascots') {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc7edf4);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8bbcab, 2));
    const sun = new THREE.DirectionalLight(0xffeed6, 2.5);
    sun.position.set(-4, 8, -5);
    scene.add(sun);
    const stage = toyBox(12, 0.24, 4, 0xfff3d9, 0.12);
    stage.position.y = -0.12;
    scene.add(stage);
    SKIN_ORDER.forEach((id, i) => {
      const actor = new AgentVisual(SKINS[id]);
      actor.root.position.x = (i - 2) * 1.9;
      actor.update({ elapsedSec: 0.5, moveSpeed: 0, onGround: true, aimPitch: 0, hpRatio: 1 });
      scene.add(actor.root);
      const shadow = contactShadow(1.5, 1.3);
      shadow.position.x = actor.root.position.x;
      scene.add(shadow);
    });
    camera.position.set(0, 2.8, -12);
    camera.lookAt(0, 0.9, 0);
  } else {
    const map = MAPS.find((candidate) => candidate.id === mode);
    if (!map) {
      host.dispose();
      throw new Error(`Unknown visual review: ${mode}`);
    }
    scene = buildWorld(map).scene;
    if (params.get('view') === 'eye') {
      camera.fov = 74;
      camera.position.set(map.spawnPoints[0][0], 0.68, map.spawnPoints[0][1]);
      camera.lookAt(0, 0.68, 0);
    } else {
      camera.position.set(map.sizeMeters * 0.56, map.sizeMeters * 0.55, -map.sizeMeters * 0.66);
      camera.lookAt(0, 0, 0);
    }
  }
  host.prepareScene(scene);
  const resize = () => {
    const size = host.resize();
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  let frame = 0;
  const draw = () => {
    host.render(scene, camera, false);
    frame = requestAnimationFrame(draw);
  };
  draw();
  canvas.dataset.review = mode ?? '';
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('resize', resize);
    disposeObject3D(scene);
    host.dispose();
  }, { once: true });
}
