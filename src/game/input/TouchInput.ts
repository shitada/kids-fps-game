import type { InputState } from '@/types';
import type { InputSource } from './InputSource';
import { isTouchDevice } from './touchDevice';

interface TouchState {
  forward: number;
  right: number;
  jump: boolean;
  fire: boolean;
  reload: boolean;
  toggleBuild: boolean;
  buildIndex: number;
  rotateBuild: boolean;
  pointerDeltaX: number;
  pointerDeltaY: number;
  pause: boolean;
}

interface Joystick {
  baseX: number;
  baseY: number;
  knob: HTMLElement;
  pointerId: number;
  active: boolean;
  max: number;
}

interface TouchLayout {
  compact: boolean;
  joystickSize: number;
  joystickKnob: number;
  joystickInset: number;
  joystickTravel: number;
  fireSize: number;
  actionSize: number;
  actionFont: number;
  edgeInset: number;
  gap: number;
  lookSensitivity: number;
}

type ActionId = 'jump' | 'build' | 'swap' | 'rotate';

const ACTION_LABELS: Record<ActionId, { icon: string; aria: string }> = {
  jump: { icon: '⬆️', aria: 'とぶ' },
  build: { icon: '🔨', aria: 'つくる' },
  swap: { icon: '🔄', aria: 'きりかえ' },
  rotate: { icon: '↩️', aria: 'むきをかえる' },
};

export class TouchInput implements InputSource {
  private container: HTMLElement;
  private state: TouchState = {
    forward: 0,
    right: 0,
    jump: false,
    fire: false,
    reload: false,
    toggleBuild: false,
    buildIndex: -1,
    rotateBuild: false,
    pointerDeltaX: 0,
    pointerDeltaY: 0,
    pause: false,
  };
  private root: HTMLDivElement | null = null;
  private leftJoy: Joystick | null = null;
  private lookPointerId: number | null = null;
  private lookLastX = 0;
  private lookLastY = 0;
  private lookStartX = 0;
  private lookStartY = 0;
  private lookMoved = false;
  private listeners: Array<() => void> = [];
  private firePointerIds = new Set<number>();
  private fireQueued = false;
  private lookSensitivity = 1;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  attach(): void {
    if (!isTouchDevice()) return;
    const layout = getTouchLayout();
    this.lookSensitivity = layout.lookSensitivity;

    const root = document.createElement('div');
    root.id = 'touch-controls';
    root.className = layout.compact ? 'skb-touch-compact' : 'skb-touch-tablet';
    root.style.cssText = `
      position: absolute; inset: 0; pointer-events: none; z-index: 30;
      touch-action: none; user-select: none; -webkit-user-select: none;
    `;

    const leftBase = this.makeJoystickBase(layout);
    const leftKnob = this.makeKnob(layout);
    leftBase.appendChild(leftKnob);
    root.appendChild(leftBase);

    // 視点ドラッグ領域。ボタン類と重ならないよう、画面下のボタン帯と
    // 右上のおやすみボタンのぶんだけよける。
    const lookArea = document.createElement('div');
    lookArea.id = 'touch-look-area';
    lookArea.style.cssText = `
      position: absolute; right: 0; top: ${layout.edgeInset + layout.actionSize}px; width: 62%;
      height: calc(100% - ${layout.fireSize + layout.edgeInset + layout.gap + layout.edgeInset + layout.actionSize}px);
      pointer-events: auto; touch-action: none;
    `;
    root.appendChild(lookArea);

    // メインの「うつ」ボタンは右下すみ。HUD の弾数表示とは重ならない位置に置く。
    const fireBtn = this.makeFireButton(layout);
    root.appendChild(fireBtn);

    // アクションはうつボタンの左に横一列。押し間違いを減らす。
    const actionRow = document.createElement('div');
    actionRow.className = 'skb-action-row';
    actionRow.style.cssText = `
      position: absolute;
      right: calc(${layout.edgeInset + layout.fireSize + layout.gap}px + env(safe-area-inset-right, 0px));
      bottom: calc(${layout.edgeInset + Math.round((layout.fireSize - layout.actionSize) / 2)}px + env(safe-area-inset-bottom, 0px));
      display: flex; flex-direction: row-reverse; gap: ${layout.gap}px;
      pointer-events: none;
    `;
    root.appendChild(actionRow);

    const jumpBtn = this.makeActionButton('jump', layout);
    const buildBtn = this.makeActionButton('build', layout);
    const swapBtn = this.makeActionButton('swap', layout);
    const rotateBtn = this.makeActionButton('rotate', layout);
    actionRow.append(jumpBtn, buildBtn, swapBtn, rotateBtn);

    this.container.appendChild(root);
    this.root = root;

    this.leftJoy = {
      baseX: 0,
      baseY: 0,
      knob: leftKnob,
      pointerId: -1,
      active: false,
      max: layout.joystickTravel,
    };

    const onLeftDown = (e: PointerEvent) => {
      const rect = leftBase.getBoundingClientRect();
      this.leftJoy!.baseX = rect.left + rect.width / 2;
      this.leftJoy!.baseY = rect.top + rect.height / 2;
      this.leftJoy!.pointerId = e.pointerId;
      this.leftJoy!.active = true;
      leftBase.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onLeftMove = (e: PointerEvent) => {
      if (!this.leftJoy?.active || this.leftJoy.pointerId !== e.pointerId) return;
      const dx = e.clientX - this.leftJoy.baseX;
      const dy = e.clientY - this.leftJoy.baseY;
      const max = this.leftJoy.max;
      const len = Math.hypot(dx, dy);
      const scale = len > max ? max / len : 1;
      const kx = dx * scale;
      const ky = dy * scale;
      leftKnob.style.transform = `translate(${kx}px, ${ky}px)`;
      this.state.right = Math.max(-1, Math.min(1, kx / max));
      this.state.forward = Math.max(-1, Math.min(1, -ky / max));
    };
    const onLeftUp = (e: PointerEvent) => {
      if (this.leftJoy?.pointerId !== e.pointerId) return;
      this.leftJoy.active = false;
      this.leftJoy.pointerId = -1;
      leftKnob.style.transform = 'translate(0, 0)';
      this.state.right = 0;
      this.state.forward = 0;
    };
    leftBase.addEventListener('pointerdown', onLeftDown);
    leftBase.addEventListener('pointermove', onLeftMove);
    leftBase.addEventListener('pointerup', onLeftUp);
    leftBase.addEventListener('pointercancel', onLeftUp);

    const onLookDown = (e: PointerEvent) => {
      if (this.lookPointerId !== null) return;
      if ((e.target as HTMLElement).closest('.skb-action-btn, .skb-pause-btn')) return;
      this.lookPointerId = e.pointerId;
      this.lookLastX = e.clientX;
      this.lookLastY = e.clientY;
      this.lookStartX = e.clientX;
      this.lookStartY = e.clientY;
      this.lookMoved = false;
      lookArea.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onLookMove = (e: PointerEvent) => {
      if (this.lookPointerId !== e.pointerId) return;
      this.state.pointerDeltaX += (e.clientX - this.lookLastX) * this.lookSensitivity;
      this.state.pointerDeltaY += (e.clientY - this.lookLastY) * this.lookSensitivity;
      if (Math.hypot(e.clientX - this.lookStartX, e.clientY - this.lookStartY) > 12) this.lookMoved = true;
      this.lookLastX = e.clientX;
      this.lookLastY = e.clientY;
      e.preventDefault();
    };
    const onLookUp = (e: PointerEvent) => {
      if (this.lookPointerId !== e.pointerId) return;
      if (!this.lookMoved) this.fireQueued = true;
      this.lookPointerId = null;
    };
    const onLookCancel = (e: PointerEvent) => {
      if (this.lookPointerId !== e.pointerId) return;
      this.lookPointerId = null;
    };
    lookArea.addEventListener('pointerdown', onLookDown);
    lookArea.addEventListener('pointermove', onLookMove);
    lookArea.addEventListener('pointerup', onLookUp);
    lookArea.addEventListener('pointercancel', onLookCancel);

    this.bindFireButton(fireBtn);
    this.bindTapButton(jumpBtn, () => {
      this.state.jump = true;
    });
    this.bindTapButton(buildBtn, () => {
      this.state.toggleBuild = true;
    });
    this.bindTapButton(swapBtn, () => {
      this.state.reload = true;
    });
    this.bindTapButton(rotateBtn, () => {
      this.state.rotateBuild = true;
    });

    this.listeners.push(() => {
      leftBase.removeEventListener('pointerdown', onLeftDown);
      leftBase.removeEventListener('pointermove', onLeftMove);
      leftBase.removeEventListener('pointerup', onLeftUp);
      leftBase.removeEventListener('pointercancel', onLeftUp);
      lookArea.removeEventListener('pointerdown', onLookDown);
      lookArea.removeEventListener('pointermove', onLookMove);
      lookArea.removeEventListener('pointerup', onLookUp);
      lookArea.removeEventListener('pointercancel', onLookCancel);
    });
  }

  detach(): void {
    this.listeners.forEach((d) => d());
    this.listeners = [];
    this.firePointerIds.clear();
    this.state.fire = false;
    this.fireQueued = false;
    this.lookPointerId = null;
    if (this.root && this.root.parentElement) this.root.parentElement.removeChild(this.root);
    this.root = null;
  }

  private makeJoystickBase(layout: TouchLayout): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'skb-joystick';
    el.style.cssText = `
      position: absolute;
      left: calc(${layout.joystickInset}px + env(safe-area-inset-left, 0px));
      bottom: calc(${layout.joystickInset}px + env(safe-area-inset-bottom, 0px));
      width: ${layout.joystickSize}px; height: ${layout.joystickSize}px;
      border-radius: 50%;
      background: rgba(255,255,255,0.22);
      border: 3px solid rgba(255,255,255,0.55);
      box-shadow: 0 2px 10px rgba(0,0,0,0.18);
      pointer-events: auto;
      touch-action: none;
      display: flex; align-items: center; justify-content: center;
    `;
    return el;
  }

  private makeKnob(layout: TouchLayout): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `
      width: ${layout.joystickKnob}px; height: ${layout.joystickKnob}px;
      border-radius: 50%;
      background: rgba(255,255,255,0.9);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    return el;
  }

  private makeFireButton(layout: TouchLayout): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'skb-action-btn skb-fire-btn';
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'うつ');
    el.textContent = '💦';
    el.style.cssText = `
      position: absolute;
      right: calc(${layout.edgeInset}px + env(safe-area-inset-right, 0px));
      bottom: calc(${layout.edgeInset}px + env(safe-area-inset-bottom, 0px));
      width: ${layout.fireSize}px; height: ${layout.fireSize}px;
      border-radius: 50%;
      background: rgba(120,213,255,0.92);
      border: 3px solid rgba(255,255,255,0.9);
      box-shadow: 0 3px 12px rgba(0,0,0,0.28);
      pointer-events: auto;
      touch-action: none;
      display: flex; align-items: center; justify-content: center;
      font-size: ${Math.round(layout.fireSize * 0.45)}px;
      user-select: none;
      -webkit-user-select: none;
    `;
    return el;
  }

  private makeActionButton(id: ActionId, layout: TouchLayout): HTMLDivElement {
    const el = document.createElement('div');
    const meta = ACTION_LABELS[id];
    el.className = `skb-action-btn skb-action-${id}`;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', meta.aria);
    el.textContent = meta.icon;
    el.style.cssText = `
      width: ${layout.actionSize}px; height: ${layout.actionSize}px;
      border-radius: 50%;
      background: rgba(255,255,255,0.88);
      border: 2px solid rgba(255,255,255,0.95);
      box-shadow: 0 3px 10px rgba(0,0,0,0.26);
      pointer-events: auto;
      touch-action: none;
      display: flex; align-items: center; justify-content: center;
      font-size: ${layout.actionFont}px;
      user-select: none;
      -webkit-user-select: none;
      flex: 0 0 auto;
    `;
    return el;
  }

  consume(out: InputState): void {
    out.forward += this.state.forward;
    out.right += this.state.right;
    out.jump = out.jump || this.state.jump;
    out.fire = out.fire || this.state.fire || this.fireQueued;
    out.reload = out.reload || this.state.reload;
    out.toggleBuild = out.toggleBuild || this.state.toggleBuild;
    if (this.state.buildIndex >= 0) out.buildIndex = this.state.buildIndex;
    out.rotateBuild = out.rotateBuild || this.state.rotateBuild;
    out.pointerDeltaX += this.state.pointerDeltaX;
    out.pointerDeltaY += this.state.pointerDeltaY;
    out.pause = out.pause || this.state.pause;
    this.state.jump = false;
    this.state.reload = false;
    this.state.toggleBuild = false;
    this.state.buildIndex = -1;
    this.state.rotateBuild = false;
    this.state.pointerDeltaX = 0;
    this.state.pointerDeltaY = 0;
    this.state.pause = false;
    this.fireQueued = false;
  }

  private bindTapButton(button: HTMLElement, onTap: () => void): void {
    const onDown = (e: PointerEvent) => {
      onTap();
      button.style.transform = 'scale(0.9)';
      e.preventDefault();
      e.stopPropagation();
    };
    const onUp = (e: PointerEvent) => {
      button.style.transform = '';
      e.stopPropagation();
    };
    button.addEventListener('pointerdown', onDown);
    button.addEventListener('pointerup', onUp);
    button.addEventListener('pointercancel', onUp);
    this.listeners.push(() => {
      button.removeEventListener('pointerdown', onDown);
      button.removeEventListener('pointerup', onUp);
      button.removeEventListener('pointercancel', onUp);
    });
  }

  /** うつボタンは押しっぱなしで連射でき、そのまま指を動かすと視点も動く。 */
  private bindFireButton(button: HTMLElement): void {
    const onFireDown = (e: PointerEvent) => {
      this.firePointerIds.add(e.pointerId);
      this.state.fire = true;
      this.fireQueued = true;
      if (this.lookPointerId === null) {
        this.lookPointerId = e.pointerId;
        this.lookLastX = e.clientX;
        this.lookLastY = e.clientY;
        this.lookStartX = e.clientX;
        this.lookStartY = e.clientY;
        this.lookMoved = false;
      }
      button.setPointerCapture(e.pointerId);
      button.style.background = 'rgba(201,239,255,0.98)';
      button.style.boxShadow = '0 0 20px rgba(111,213,255,0.85), 0 3px 12px rgba(0,0,0,0.28)';
      e.preventDefault();
      e.stopPropagation();
    };
    const onFireMove = (e: PointerEvent) => {
      if (this.lookPointerId !== e.pointerId) return;
      this.state.pointerDeltaX += (e.clientX - this.lookLastX) * this.lookSensitivity;
      this.state.pointerDeltaY += (e.clientY - this.lookLastY) * this.lookSensitivity;
      if (Math.hypot(e.clientX - this.lookStartX, e.clientY - this.lookStartY) > 12) this.lookMoved = true;
      this.lookLastX = e.clientX;
      this.lookLastY = e.clientY;
      e.preventDefault();
      e.stopPropagation();
    };
    const onFireUp = (e: PointerEvent) => {
      this.firePointerIds.delete(e.pointerId);
      this.state.fire = this.firePointerIds.size > 0;
      if (this.lookPointerId === e.pointerId) this.lookPointerId = null;
      button.style.background = 'rgba(120,213,255,0.92)';
      button.style.boxShadow = '0 3px 12px rgba(0,0,0,0.28)';
      e.preventDefault();
      e.stopPropagation();
    };
    button.addEventListener('pointerdown', onFireDown);
    button.addEventListener('pointermove', onFireMove);
    button.addEventListener('pointerup', onFireUp);
    button.addEventListener('pointercancel', onFireUp);
    this.listeners.push(() => {
      button.removeEventListener('pointerdown', onFireDown);
      button.removeEventListener('pointermove', onFireMove);
      button.removeEventListener('pointerup', onFireUp);
      button.removeEventListener('pointercancel', onFireUp);
    });
  }
}

export function getTouchLayout(
  width = window.innerWidth,
  height = window.innerHeight,
): TouchLayout {
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const compact = shortSide <= 480 && longSide <= 960;
  return compact
    ? {
        compact,
        joystickSize: 116,
        joystickKnob: 50,
        joystickInset: 16,
        joystickTravel: 44,
        fireSize: 78,
        actionSize: 54,
        actionFont: 24,
        edgeInset: 14,
        gap: 12,
        lookSensitivity: 1.15,
      }
    : {
        compact,
        joystickSize: 148,
        joystickKnob: 62,
        joystickInset: 26,
        joystickTravel: 56,
        fireSize: 104,
        actionSize: 74,
        actionFont: 32,
        edgeInset: 22,
        gap: 16,
        lookSensitivity: 0.95,
      };
}

export type { TouchLayout };
