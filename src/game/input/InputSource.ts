import type { InputState } from '@/types';

export interface InputSource {
  attach(): void;
  detach(): void;
  consume(state: InputState): void;
}

export function createEmptyInputState(): InputState {
  return {
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
}

export function resetTransientInput(state: InputState): void {
  state.jump = false;
  state.reload = false;
  state.toggleBuild = false;
  state.buildIndex = -1;
  state.rotateBuild = false;
  state.pointerDeltaX = 0;
  state.pointerDeltaY = 0;
  state.pause = false;
}
