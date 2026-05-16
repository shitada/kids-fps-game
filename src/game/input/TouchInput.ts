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

    const root = document.createElement('div');
    root.id = 'touch-controls';
    root.style.cssText = `
      position: absolute; inset: 0; pointer-events: none; z-index: 30;
    `;

    const leftBase = this.makeJoystickBase('left');
    const leftKnob = this.makeKnob();
    leftBase.appendChild(leftKnob);
    root.appendChild(leftBase);

    const rightArea = document.createElement('div');
    rightArea.style.cssText = `
      position: absolute; right: 0; top: 0; width: 55%; height: 100%;
      pointer-events: auto;
    `;
    root.appendChild(rightArea);

    const fireBtn = this.makeActionButton('💦', '70%', '70%');
    root.appendChild(fireBtn);
    this.fireBtn = fireBtn;

    const jumpBtn = this.makeActionButton('⬆️', '85%', '55%');
    root.appendChild(jumpBtn);

    const buildBtn = this.makeActionButton('🔨', '70%', '40%');
    root.appendChild(buildBtn);

    const reloadBtn = this.makeActionButton('🔄', '85%', '25%');
    root.appendChild(reloadBtn);

    this.container.appendChild(root);
    this.root = root;

    this.leftJoy = {
      baseX: 0,
      baseY: 0,
      knob: leftKnob,
      pointerId: -1,
      active: false,
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
      const max = 50;
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
    };
    const onLookMove = (e: PointerEvent) => {
      if (this.lookPointerId !== e.pointerId) return;
      this.state.pointerDeltaX += (e.clientX - this.lookLastX) * 1.5;
      this.state.pointerDeltaY += (e.clientY - this.lookLastY) * 1.5;
      this.lookLastX = e.clientX;
      this.lookLastY = e.clientY;
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

  private makeJoystickBase(side: 'left' | 'right'): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute;
      ${side}: 24px;
      bottom: 24px;
      width: 130px; height: 130px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      border: 3px solid rgba(255,255,255,0.5);
      pointer-events: auto;
      touch-action: none;
      display: flex; align-items: center; justify-content: center;
    `;
    return el;
  }

  private makeKnob(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `
      width: 56px; height: 56px;
      border-radius: 50%;
      background: rgba(255,255,255,0.85);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    return el;
  }

  private makeActionButton(label: string, right: string, bottom: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'skb-action-btn';
    el.textContent = label;
    el.style.cssText = `
      position: absolute;
      right: calc(100% - ${right});
      bottom: ${bottom};
      width: 72px; height: 72px;
      border-radius: 50%;
      background: rgba(255,255,255,0.85);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: auto;
      touch-action: none;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px;
      user-select: none;
    `;
    el.style.right = `calc(100vw - ${right})`;
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
