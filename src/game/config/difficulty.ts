import type { Difficulty } from '@/types';

export interface DifficultyParams {
  aimErrorRad: number;
  reactionMs: number;
  firingChancePerSec: number;
  buildChance: number;
  moveSpeed: number;
  damageMultiplier: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyParams> = {
  easy: {
    aimErrorRad: 0.18,
    reactionMs: 700,
    firingChancePerSec: 0.5,
    buildChance: 0,
    moveSpeed: 5.5,
    damageMultiplier: 0.6,
  },
  normal: {
    aimErrorRad: 0.07,
    reactionMs: 420,
    firingChancePerSec: 1.1,
    buildChance: 0.35,
    moveSpeed: 7.0,
    damageMultiplier: 0.85,
  },
  hard: {
    aimErrorRad: 0.025,
    reactionMs: 220,
    firingChancePerSec: 2.0,
    buildChance: 0.7,
    moveSpeed: 8.0,
    damageMultiplier: 1.0,
  },
};
