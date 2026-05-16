import { SaveStorage } from '@/game/storage/SaveStorage';
import { AudioEngine } from '@/game/audio/AudioEngine';
import { TitleScene } from '@/game/scenes/TitleScene';
import { SkinSelectScene } from '@/game/scenes/SkinSelectScene';
import { MapSelectScene } from '@/game/scenes/MapSelectScene';
import { BattleScene } from '@/game/scenes/BattleScene';
import { ResultScene } from '@/game/scenes/ResultScene';
import type { GameScene, SceneContext, SceneTarget } from '@/game/scenes/Scene';
import type { SkinId } from '@/types';

class App {
  private rootEl: HTMLElement;
  private uiOverlay: HTMLElement;
  private canvas: HTMLCanvasElement;
  private save = new SaveStorage();
  private audio = new AudioEngine();
  private currentScene: GameScene | null = null;
  private selectedMapId = 'pool-park';

  constructor() {
    this.rootEl = document.getElementById('hud') as HTMLElement;
    this.uiOverlay = document.getElementById('ui-overlay') as HTMLElement;
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
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
      save: this.save.get(),
      saveUpdate: (patch) => this.save.update(patch),
      selectMap: (id) => { this.selectedMapId = id; },
      selectSkin: (id: SkinId) => this.save.setSkin(id),
      goto: (target) => this.goto(target),
      audio: this.audio,
    };
  }

  async goto(target: SceneTarget): Promise<void> {
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
  }
}

const app = new App();
app.goto({ id: 'title' });
