import type { SaveData, SkinId } from '@/types';

export interface SceneContext {
  rootEl: HTMLElement;
  uiOverlay: HTMLElement;
  canvas: HTMLCanvasElement;
  save: SaveData;
  saveUpdate: (patch: Partial<SaveData>) => void;
  selectMap: (mapId: string) => void;
  selectSkin: (skin: SkinId) => void;
  goto: (scene: SceneTarget) => void;
  audio: import('@/game/audio/AudioEngine').AudioEngine;
}

export type SceneTarget =
  | { id: 'title' }
  | { id: 'skin-select' }
  | { id: 'map-select' }
  | { id: 'battle'; mapId: string }
  | { id: 'result'; result: import('@/types').MatchResult };

export interface GameScene {
  enter(ctx: SceneContext): Promise<void> | void;
  update?(dt: number): void;
  resize?(width: number, height: number): void;
  exit(): Promise<void> | void;
}
