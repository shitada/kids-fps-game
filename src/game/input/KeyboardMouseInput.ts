import type { InputState } from '@/types';
import type { InputSource } from './InputSource';

interface InternalState {
  forward: number;
  back: number;
  left: number;
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

export class KeyboardMouseInput implements InputSource {
  private element: HTMLElement;
  private state: InternalState = {
    forward: 0,
    back: 0,
    left: 0,
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
  private pointerLocked = false;
  private listeners: Array<() => void> = [];

  constructor(element: HTMLElement) {
    this.element = element;
  }

  attach(): void {
    const onKeyDown = (e: KeyboardEvent) => this.handleKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => this.handleKey(e, false);
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this.state.fire = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this.state.fire = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (this.pointerLocked) {
        this.state.pointerDeltaX += e.movementX;
        this.state.pointerDeltaY += e.movementY;
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) this.state.buildIndex = (this.state.buildIndex + 1) % 3;
      else if (e.deltaY > 0) this.state.buildIndex = (this.state.buildIndex + 2) % 3;
    };
    const onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.element;
    };
    const onClickRequestLock = () => {
      if (!this.pointerLocked && this.element.requestPointerLock) {
        this.element.requestPointerLock();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('pointerlockchange', onPointerLockChange);
    this.element.addEventListener('click', onClickRequestLock);

    this.listeners.push(() => window.removeEventListener('keydown', onKeyDown));
    this.listeners.push(() => window.removeEventListener('keyup', onKeyUp));
    this.listeners.push(() => window.removeEventListener('mousedown', onMouseDown));
    this.listeners.push(() => window.removeEventListener('mouseup', onMouseUp));
    this.listeners.push(() => window.removeEventListener('mousemove', onMouseMove));
    this.listeners.push(() => window.removeEventListener('wheel', onWheel));
    this.listeners.push(() => document.removeEventListener('pointerlockchange', onPointerLockChange));
    this.listeners.push(() => this.element.removeEventListener('click', onClickRequestLock));
  }

  detach(): void {
    this.listeners.forEach((d) => d());
    this.listeners = [];
  }

  private handleKey(e: KeyboardEvent, down: boolean): void {
    switch (e.code) {
      case 'KeyW': this.state.forward = down ? 1 : 0; break;
      case 'KeyS': this.state.back = down ? 1 : 0; break;
      case 'KeyA': this.state.left = down ? 1 : 0; break;
      case 'KeyD': this.state.right = down ? 1 : 0; break;
      case 'Space': if (down) this.state.jump = true; break;
      case 'KeyR': if (down) this.state.reload = true; break;
      case 'KeyQ': if (down) this.state.toggleBuild = true; break;
      case 'KeyE': if (down) this.state.rotateBuild = true; break;
      case 'Digit1': if (down) this.state.buildIndex = 0; break;
      case 'Digit2': if (down) this.state.buildIndex = 1; break;
      case 'Digit3': if (down) this.state.buildIndex = 2; break;
      case 'Escape': if (down) this.state.pause = true; break;
    }
  }

  consume(out: InputState): void {
    out.forward += this.state.forward - this.state.back;
    out.right += this.state.right - this.state.left;
    out.jump = out.jump || this.state.jump;
    out.fire = out.fire || this.state.fire;
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
  }
}
