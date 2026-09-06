import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TitleScene } from '@/game/scenes/TitleScene';
import { SkinSelectScene } from '@/game/scenes/SkinSelectScene';
import { MapSelectScene } from '@/game/scenes/MapSelectScene';
import { ResultScene } from '@/game/scenes/ResultScene';
import { PauseOverlay } from '@/ui/PauseOverlay';
import { SaveStorage } from '@/game/storage/SaveStorage';
import { AudioEngine } from '@/game/audio/AudioEngine';
import { RenderHost } from '@/game/systems/RenderHost';
import type { GameScene, SceneContext } from '@/game/scenes/Scene';

// DOM contracts are tested without creating WebGL contexts in jsdom.
const stage = vi.hoisted(() => ({ dispose: vi.fn(), selectSkin: vi.fn(), mapThumbnail: vi.fn(), skinThumbnail: vi.fn() }));
vi.mock('@/game/scenes/MenuStage', () => ({
  MenuStage: class {
    dispose = stage.dispose;
    selectSkin = stage.selectSkin;
    mapThumbnail = stage.mapThumbnail;
    skinThumbnail = stage.skinThumbnail;
  },
}));
vi.mock('@/game/systems/RenderHost', () => ({ RenderHost: class {} }));

let ctx: SceneContext;
let current: GameScene | undefined;

function button(name: string): HTMLButtonElement {
  const found = Array.from(ctx.uiOverlay.querySelectorAll('button')).find((candidate) => candidate.textContent?.includes(name));
  if (!found) throw new Error(`Missing button: ${name}`);
  return found;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  const storage = new SaveStorage();
  const overlay = document.createElement('div');
  overlay.id = 'ui-overlay';
  const root = document.createElement('div');
  root.id = 'hud';
  document.body.append(root, overlay);
  ctx = {
    rootEl: root, uiOverlay: overlay, canvas: document.createElement('canvas'),
    renderHost: new RenderHost(document.createElement('canvas')),
    save: storage.get(), saveUpdate: vi.fn(), selectMap: vi.fn(), selectSkin: vi.fn(),
    goto: vi.fn(), audio: new AudioEngine(),
  };
  vi.spyOn(ctx.audio, 'startBgm').mockImplementation(() => {});
  vi.spyOn(ctx.audio, 'playSfx').mockImplementation(() => {});
  stage.skinThumbnail.mockReturnValue('data:image/png;base64,skin');
  stage.mapThumbnail.mockReturnValue('data:image/png;base64,map');
});

afterEach(() => {
  current?.exit();
  current = undefined;
  document.body.replaceChildren();
});

describe('Toy park menu contracts', () => {
  it('keeps all difficulty choices and announces the selected choice', () => {
    current = new TitleScene();
    current.enter(ctx);
    button('むずかしい').click();
    expect(ctx.saveUpdate).toHaveBeenCalledWith({ difficulty: 'hard' });
    expect(button('むずかしい').getAttribute('aria-pressed')).toBe('true');
    expect(button('かんたん').getAttribute('aria-pressed')).toBe('false');
  });

  it('preserves every ability, locked condition and selected mascot', () => {
    current = new SkinSelectScene();
    current.enter(ctx);
    expect(stage.skinThumbnail).toHaveBeenCalledTimes(5);
    expect(button('ねこさん').textContent).toContain('れんしゃ +4%');
    expect(button('さかなちゃん').textContent).toContain('5かい かつ');
    button('ねこさん').click();
    expect(ctx.selectSkin).not.toHaveBeenCalled();
    button('うさちゃん').click();
    expect(ctx.selectSkin).toHaveBeenCalledWith('usagi');
    expect(stage.selectSkin).toHaveBeenCalledWith('usagi');
    expect(button('うさちゃん').getAttribute('aria-pressed')).toBe('true');
  });

  it('uses world thumbnails and preserves one-tap map launch', () => {
    current = new MapSelectScene();
    current.enter(ctx);
    expect(stage.mapThumbnail).toHaveBeenCalledTimes(3);
    button('プールパーク').click();
    expect(ctx.selectMap).toHaveBeenCalledWith('pool-park');
    expect(ctx.goto).toHaveBeenCalledWith({ id: 'battle', mapId: 'pool-park' });
  });

  it.each([true, false])('shows the full friendly result and cleans up the preview (victory=%s)', (victory) => {
    current = new ResultScene({ victory, rank: victory ? 1 : 4, totalPlayers: 7, eliminations: 2, durationSec: 89.6 });
    current.enter(ctx);
    expect(ctx.uiOverlay.querySelector('h1')?.textContent).toBe(victory ? 'ゆうしょう！' : '4い');
    expect(ctx.uiOverlay.querySelector('dl')?.textContent).toContain('89');
    expect(ctx.uiOverlay.querySelector('dl')?.textContent).toContain('2');
    button('もういっかい').click();
    expect(ctx.goto).toHaveBeenCalledWith({ id: 'map-select' });
    button('さいしょへ').click();
    expect(ctx.goto).toHaveBeenCalledWith({ id: 'title' });
    current.exit();
    current = undefined;
    expect(stage.dispose).toHaveBeenCalledTimes(1);
    expect(ctx.uiOverlay.children).toHaveLength(0);
  });
});

describe('Rest dialog keyboard access', () => {
  it('moves focus inside, traps Tab, and restores focus and background interactivity', () => {
    const trigger = document.createElement('button');
    ctx.rootEl.appendChild(trigger);
    trigger.focus();
    const pause = new PauseOverlay(ctx.uiOverlay, { onResume: vi.fn(), onRestart: vi.fn(), onQuit: vi.fn() });
    pause.show();
    expect(trigger.inert).toBe(true);
    expect(document.activeElement?.textContent).toContain('つづける');
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement?.textContent).toContain('タイトルへ');
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement?.textContent).toContain('つづける');
    pause.hide();
    expect(trigger.inert).toBeFalsy();
    expect(document.activeElement).toBe(trigger);
    pause.destroy();
  });
});
