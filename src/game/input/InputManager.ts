import type { InputState } from '@/types';
import { KeyboardMouseInput } from './KeyboardMouseInput';
import { TouchInput } from './TouchInput';
import { createEmptyInputState, type InputSource } from './InputSource';

export class InputManager {
  private sources: InputSource[] = [];
  private state: InputState = createEmptyInputState();

  attachKeyboardMouse(element: HTMLElement): void {
    const src = new KeyboardMouseInput(element);
    src.attach();
    this.sources.push(src);
  }

  attachTouch(container: HTMLElement): void {
    const src = new TouchInput(container);
    src.attach();
    this.sources.push(src);
  }

  detach(): void {
    this.sources.forEach((s) => s.detach());
    this.sources = [];
  }

  poll(): InputState {
    this.state.forward = 0;
    this.state.right = 0;
    this.state.jump = false;
    this.state.fire = false;
    this.state.reload = false;
    this.state.toggleBuild = false;
    this.state.buildIndex = -1;
    this.state.rotateBuild = false;
    this.state.pointerDeltaX = 0;
    this.state.pointerDeltaY = 0;
    this.state.pause = false;
    for (const src of this.sources) src.consume(this.state);
    this.state.forward = Math.max(-1, Math.min(1, this.state.forward));
    this.state.right = Math.max(-1, Math.min(1, this.state.right));
    return this.state;
  }
}
