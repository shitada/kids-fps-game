import type { BuildPieceConfig, BuildPieceKind } from '@/types';

export const BUILD_PIECE_SIZE = 4;

export const BUILD_PIECES: Record<BuildPieceKind, BuildPieceConfig> = {
  wall: { kind: 'wall', costMaterial: 5, hp: 120 },
  floor: { kind: 'floor', costMaterial: 5, hp: 100 },
  stair: { kind: 'stair', costMaterial: 6, hp: 100 },
};

export const BUILD_ORDER: BuildPieceKind[] = ['wall', 'floor', 'stair'];
