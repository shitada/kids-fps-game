import type { MapConfig } from '@/types';

const poolPark: MapConfig = {
  id: 'pool-park',
  nameHiragana: 'プールパーク',
  emoji: '🏊',
  groundColor: 0x9ad6ff,
  skyColor: 0xbeefff,
  sizeMeters: 90,
  spawnPoints: [
    [-30, -30], [30, -30], [-30, 30], [30, 30],
    [0, -35], [0, 35], [-35, 0], [35, 0],
  ],
  waterTanks: [
    [0, 0], [-15, 15], [15, -15], [-15, -15], [15, 15],
  ],
  weaponChests: [
    [-20, 0], [20, 0], [0, -20], [0, 20],
  ],
  woodNodes: [
    [-25, 5], [25, -5], [10, 25], [-10, -25],
  ],
  stoneNodes: [
    [-5, 25], [5, -25], [25, 10], [-25, -10],
  ],
  decorations: [
    { kind: 'box', position: [0, 0.5, 0], size: [10, 1, 10], color: 0x66c2ff },
    { kind: 'cylinder', position: [-18, 1.5, 18], size: [2, 3, 2], color: 0xffd6e0 },
    { kind: 'cylinder', position: [18, 1.5, -18], size: [2, 3, 2], color: 0xffd6e0 },
    { kind: 'box', position: [-25, 1, -5], size: [3, 2, 8], color: 0xc8a888 },
    { kind: 'box', position: [25, 1, 5], size: [3, 2, 8], color: 0xc8a888 },
    { kind: 'pyramid', position: [12, 2, 12], size: [4, 4, 4], color: 0xffe066 },
    { kind: 'pyramid', position: [-12, 2, -12], size: [4, 4, 4], color: 0xffe066 },
    { kind: 'box', position: [0, 1, 30], size: [16, 2, 3], color: 0xffb56b },
    { kind: 'box', position: [0, 1, -30], size: [16, 2, 3], color: 0xffb56b },
  ],
};

const castleGarden: MapConfig = {
  id: 'castle-garden',
  nameHiragana: 'おしろのおにわ',
  emoji: '🏰',
  groundColor: 0x9bd49b,
  skyColor: 0xb5e1ff,
  sizeMeters: 100,
  spawnPoints: [
    [-35, -35], [35, -35], [-35, 35], [35, 35],
    [0, -40], [0, 40], [-40, 0], [40, 0],
  ],
  waterTanks: [
    [0, 0], [-20, 20], [20, -20],
  ],
  weaponChests: [
    [-25, 0], [25, 0], [0, -25], [0, 25], [0, 0],
  ],
  woodNodes: [
    [-15, -15], [15, 15], [-30, 10], [30, -10], [10, -30], [-10, 30],
  ],
  stoneNodes: [
    [-15, 15], [15, -15], [-30, -10], [30, 10],
  ],
  decorations: [
    { kind: 'box', position: [0, 4, 0], size: [12, 8, 12], color: 0xd9c5a0 },
    { kind: 'pyramid', position: [0, 11, 0], size: [10, 4, 10], color: 0xb91c1c },
    { kind: 'cylinder', position: [-6, 6, -6], size: [2, 12, 2], color: 0xeae0c8 },
    { kind: 'cylinder', position: [6, 6, -6], size: [2, 12, 2], color: 0xeae0c8 },
    { kind: 'cylinder', position: [-6, 6, 6], size: [2, 12, 2], color: 0xeae0c8 },
    { kind: 'cylinder', position: [6, 6, 6], size: [2, 12, 2], color: 0xeae0c8 },
    { kind: 'box', position: [-20, 1, 0], size: [4, 2, 30], color: 0x88a06b },
    { kind: 'box', position: [20, 1, 0], size: [4, 2, 30], color: 0x88a06b },
    { kind: 'box', position: [0, 1, -25], size: [40, 2, 3], color: 0xc8a888 },
    { kind: 'box', position: [0, 1, 25], size: [40, 2, 3], color: 0xc8a888 },
  ],
};

const cloudPlaza: MapConfig = {
  id: 'cloud-plaza',
  nameHiragana: 'くものうえひろば',
  emoji: '☁️',
  groundColor: 0xfdf5ff,
  skyColor: 0xfff0fa,
  sizeMeters: 80,
  spawnPoints: [
    [-25, -25], [25, -25], [-25, 25], [25, 25],
    [0, -30], [0, 30], [-30, 0], [30, 0],
  ],
  waterTanks: [
    [0, 0], [-12, 12], [12, -12], [-12, -12], [12, 12],
  ],
  weaponChests: [
    [-18, 0], [18, 0], [0, -18], [0, 18],
  ],
  woodNodes: [
    [-22, 8], [22, -8],
  ],
  stoneNodes: [
    [8, 22], [-8, -22],
  ],
  decorations: [
    { kind: 'sphere', position: [-10, 3, -10], size: [5, 5, 5], color: 0xffffff },
    { kind: 'sphere', position: [10, 4, 10], size: [6, 6, 6], color: 0xffffff },
    { kind: 'sphere', position: [-15, 5, 15], size: [4, 4, 4], color: 0xffffff },
    { kind: 'sphere', position: [15, 6, -15], size: [4, 4, 4], color: 0xffffff },
    { kind: 'box', position: [0, 6, 0], size: [6, 1, 6], color: 0xfff0fa },
    { kind: 'box', position: [-20, 4, 0], size: [4, 1, 8], color: 0xfff0fa },
    { kind: 'box', position: [20, 4, 0], size: [4, 1, 8], color: 0xfff0fa },
    { kind: 'box', position: [0, 4, -20], size: [8, 1, 4], color: 0xfff0fa },
    { kind: 'box', position: [0, 4, 20], size: [8, 1, 4], color: 0xfff0fa },
  ],
};

export const MAPS: MapConfig[] = [poolPark, castleGarden, cloudPlaza];

export function getMapById(id: string): MapConfig {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}
