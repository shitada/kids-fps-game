import type { InputState } from '@/types';
import type { InputSource } from './InputSource';

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
  actionSize: number;
  actionFont: number;
  actionRight: number;
  actionBottom: number;
  actionGap: number;
}

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
  private listeners: Array<() => void> = [];
  private fireBtn: HTMLElement | null = null;
  private firePointerId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  attach(): void {
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;
    const layout = getTouchLayout();

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

    const rightArea = document.createElement('div');
    rightArea.style.cssText = `
      position: absolute; right: 0; top: 0; width: ${layout.compact ? 58 : 55}%; height: 100%;
      pointer-events: auto; touch-action: none;
    `;
    root.appendChild(rightArea);

    const fireBtn = this.makeActionButton('💦', 'うつ', layout, 0, 0);
    root.appendChild(fireBtn);
    this.fireBtn = fireBtn;

    const jumpBtn = this.makeActionButton('⬆️', 'とぶ', layout, 1, 1);
    root.appendChild(jumpBtn);

    const buildBtn = this.makeActionButton('🔨', 'つくる', layout, 0, 2);
    root.appendChild(buildBtn);

    const reloadBtn = this.makeActionButton('🔄', 'きりかえ', layout, 1, 3);
    root.appendChild(reloadBtn);

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
      if ((e.target as HTMLElement).closest('.skb-action-btn')) return;
      this.lookPointerId = e.pointerId;
      this.lookLastX = e.clientX;
      this.lookLastY = e.clientY;
      rightArea.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onLookMove = (e: PointerEvent) => {
      if (this.lookPointerId !== e.pointerId) return;
      this.state.pointerDeltaX += (e.clientX - this.lookLastX) * 1.5;
      this.state.pointerDeltaY += (e.clientY - this.lookLastY) * 1.5;
      this.lookLastX = e.clientX;
      this.lookLastY = e.clientY;
      e.preventDefault();
    };
    const onLookUp = (e: PointerEvent) => {
      if (this.lookPointerId !== e.pointerId) return;
      this.lookPointerId = null;
    };
    rightArea.addEventListener('pointerdown', onLookDown);
    rightArea.addEventListener('pointermove', onLookMove);
    rightArea.addEventListener('pointerup', onLookUp);
    rightArea.addEventListener('pointercancel', onLookUp);

    const onFireDown = (e: PointerEvent) => {
      this.state.fire = true;
      this.firePointerId = e.pointerId;
      fireBtn.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    };
    const onFireUp = (e: PointerEvent) => {
      if (this.firePointerId === e.pointerId) {
        this.state.fire = false;
        this.firePointerId = null;
      }
    };
    fireBtn.addEventListener('pointerdown', onFireDown);
    fireBtn.addEventListener('pointerup', onFireUp);
    fireBtn.addEventListener('pointercancel', onFireUp);

    jumpBtn.addEventListener('pointerdown', (e) => {
      this.state.jump = true;
      e.stopPropagation();
    });
    buildBtn.addEventListener('pointerdown', (e) => {
      this.state.toggleBuild = true;
      e.stopPropagation();
    });
    reloadBtn.addEventListener('pointerdown', (e) => {
      this.state.reload = true;
      e.stopPropagation();
    });

    this.listeners.push(() => {
      leftBase.removeEventListener('pointerdown', onLeftDown);
      leftBase.removeEventListener('pointermove', onLeftMove);
      leftBase.removeEventListener('pointerup', onLeftUp);
      leftBase.removeEventListener('pointercancel', onLeftUp);
      rightArea.removeEventListener('pointerdown', onLookDown);
      rightArea.removeEventListener('pointermove', onLookMove);
      rightArea.removeEventListener('pointerup', onLookUp);
      rightArea.removeEventListener('pointercancel', onLookUp);
    });
  }

  detach(): void {
    this.listeners.forEach((d) => d());
    this.listeners = [];
    if (this.root && this.root.parentElement) this.root.parentElement.removeChild(this.root);
    this.root = null;
  }

  private makeJoystickBase(layout: TouchLayout): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute;
      left: calc(${layout.joystickInset}px + env(safe-area-inset-left, 0px));
      bottom: calc(${layout.joystickInset}px + env(safe-area-inset-bottom, 0px));
      width: ${layout.joystickSize}px; height: ${layout.joystickSize}px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      border: 3px solid rgba(255,255,255,0.5);
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
      background: rgba(255,255,255,0.85);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    return el;
  }

  private makeActionButton(label: string, ariaLabel: string, layout: TouchLayout, column: 0 | 1, row: number): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'skb-action-btn';
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', ariaLabel);
    el.textContent = label;
    const right = layout.actionRight + column * (layout.actionSize + layout.actionGap);
    const bottom = layout.actionBottom + row * (layout.actionSize + layout.actionGap);
    el.style.cssText = `
      position: absolute;
      right: calc(${right}px + env(safe-area-inset-right, 0px));
      bottom: calc(${bottom}px + env(safe-area-inset-bottom, 0px));
      width: ${layout.actionSize}px; height: ${layout.actionSize}px;
      border-radius: 50%;
      background: rgba(255,255,255,0.85);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: auto;
      touch-action: none;
      display: flex; align-items: center; justify-content: center;
      font-size: ${layout.actionFont}px;
      user-select: none;
      -webkit-user-select: none;
    `;
    return el;
  }

  consume(out: InputState): void {
    out.forward += this.state.forward;
    out.right += this.state.right;
    out.jump = out.jump || this.state.jump;
    out.fire = out.fire || this.state.fire;
    out.reload = out.reload || this.state.reload;
    out.toggleBuild = out.toggleBuild || this.state.toggleBuild;
    if (this.state.buildIndex >= 0) out.buildIndex = this.state.buildIndex;
    out.rotateBuild = out.rotateBuild || this.state.rotateBuild;
    out.pointerDeltaX += this.state.pointerDeltaX;
    out.pointerDeltaY += this.state.pointerDeltaY;
    this.state.jump = false;
    this.state.reload = false;
    this.state.toggleBuild = false;
    this.state.buildIndex = -1;
    this.state.rotateBuild = false;
    this.state.pointerDeltaX = 0;
    this.state.pointerDeltaY = 0;
  }
}

function getTouchLayout(): TouchLayout {
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const longSide = Math.max(window.innerWidth, window.innerHeight);
  const compact = shortSide <= 430 && longSide <= 940;
  return compact
    ? {
        compact,
        joystickSize: 104,
        joystickKnob: 46,
        joystickInset: 16,
        joystickTravel: 40,
        actionSize: 58,
        actionFont: 26,
        actionRight: 16,
        actionBottom: 16,
        actionGap: 14,
      }
    : {
        compact,
        joystickSize: 130,
        joystickKnob: 56,
        joystickInset: 24,
        joystickTravel: 50,
        actionSize: 72,
        actionFont: 32,
        actionRight: 24,
        actionBottom: 24,
        actionGap: 18,
      };
}
