import { SaveStorage } from '@/game/storage/SaveStorage';
import { AudioEngine } from '@/game/audio/AudioEngine';
import { TitleScene } from '@/game/scenes/TitleScene';
import { SkinSelectScene } from '@/game/scenes/SkinSelectScene';
import { MapSelectScene } from '@/game/scenes/MapSelectScene';
import { BattleScene } from '@/game/scenes/BattleScene';
import { ResultScene } from '@/game/scenes/ResultScene';
import type { GameScene, SceneContext, SceneTarget } from '@/game/scenes/Scene';
import type { SkinId } from '@/types';
import { RenderHost } from '@/game/systems/RenderHost';
import '@/ui/theme.css';

class App {
  private rootEl: HTMLElement;
  private uiOverlay: HTMLElement;
  private canvas: HTMLCanvasElement;
  private save = new SaveStorage();
  private audio = new AudioEngine();
  private currentScene: GameScene | null = null;
  private selectedMapId = 'pool-park';
  private renderHost: RenderHost;
  private transitioning = false;
  private renderingFailed = false;

  constructor() {
    this.rootEl = document.getElementById('hud') as HTMLElement;
    this.uiOverlay = document.getElementById('ui-overlay') as HTMLElement;
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderHost = new RenderHost(this.canvas);
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.renderingFailed = true;
      this.audio.stopBgm();
      if (this.currentScene) void Promise.resolve(this.currentScene.exit()).catch(showFatalError);
      showFatalError(new Error('WebGL context lost'));
    });
    this.audio.init();
    this.audio.setSfxVolume(this.save.get().sfxVolume);
    this.audio.setBgmVolume(this.save.get().bgmVolume);
    window.addEventListener('click', () => this.audio.resume(), { once: true });
    window.addEventListener('pointerdown', () => this.audio.resume(), { once: true });
  }

  ctx(): SceneContext {
    return {
      rootEl: this.rootEl,
      uiOverlay: this.uiOverlay,
      canvas: this.canvas,
      renderHost: this.renderHost,
      save: this.save.get(),
      saveUpdate: (patch) => this.save.update(patch),
      selectMap: (id) => { this.selectedMapId = id; },
      selectSkin: (id: SkinId) => this.save.setSkin(id),
      goto: (target) => this.goto(target),
      audio: this.audio,
    };
  }

  async goto(target: SceneTarget): Promise<void> {
    if (this.transitioning || this.renderingFailed) return;
    this.transitioning = true;
    try {
      if (this.currentScene) await this.currentScene.exit();
      let next: GameScene;
      switch (target.id) {
        case 'title': next = new TitleScene(); break;
        case 'skin-select': next = new SkinSelectScene(); break;
        case 'map-select': next = new MapSelectScene(); break;
        case 'battle': next = new BattleScene(target.mapId); break;
        case 'result': next = new ResultScene(target.result); break;
      }
      this.currentScene = next;
      await next.enter(this.ctx());
    } catch (error) {
      showFatalError(error);
    } finally {
      this.transitioning = false;
    }
  }
}

function showFatalError(error: unknown): void {
  console.error('Splash Kids could not continue:', error);
  const overlay = document.getElementById('ui-overlay');
  if (!overlay || document.getElementById('render-error')) return;
  const panel = document.createElement('div');
  panel.id = 'render-error';
  panel.setAttribute('role', 'alert');
  panel.style.cssText = 'position:absolute;inset:0;z-index:100;display:grid;place-content:center;gap:20px;text-align:center;padding:24px;background:#fff3d9;color:#183f52;pointer-events:auto;';
  const message = document.createElement('p');
  message.textContent = 'うまく ひらけなかったよ。もういちど ためしてね';
  const button = document.createElement('button');
  button.textContent = 'もういちど ひらく';
  button.style.cssText = 'padding:18px;border:0;border-radius:20px;background:#167c87;color:white;font:inherit;';
  button.onclick = () => window.location.reload();
  panel.append(message, button);
  overlay.append(panel);
}

try {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('review')) {
    void import('@/game/scenes/VisualReview').then(({ startVisualReview }) => {
      const canvas = document.getElementById('game-canvas');
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Game canvas not found');
      startVisualReview(canvas);
    }).catch(showFatalError);
  } else {
    const app = new App();
    void app.goto({ id: 'title' });
  }
} catch (error) {
  showFatalError(error);
}
