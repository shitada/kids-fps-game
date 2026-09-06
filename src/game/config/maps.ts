import type { MapConfig } from '@/types';

// Broad spokes connect every start to a clear central plaza. Tall scenery sits
// toward the edge; the final ten-metre circle never contains a solid landmark.
const cream = 0xf8dfac;
const aqua = 0x2eaebd;
const coral = 0xef7567;
const yellow = 0xf2be48;
const mint = 0x65b890;

const poolPark: MapConfig = {
  id: 'pool-park',
  nameHiragana: 'プールパーク',
  emoji: '🏊',
  theme: 'pool',
  groundColor: 0x80b9a8,
  groundAccentColor: cream,
  skyColor: 0xe0f3ee,
  skyTopColor: 0x82c7e5,
  sizeMeters: 90,
  spawnPoints: [
    [0, -35], [0, 35], [-35, 0], [35, 0],
    [-27, -27], [27, -27], [-27, 27], [27, 27],
  ],
  waterTanks: [[0, 0], [-23, 6], [23, -6], [-7, -26], [7, 26]],
  weaponChests: [[-28, 0], [28, 0], [0, -28], [0, 28]],
  woodNodes: [[-22, -18], [22, 18], [-17, 27], [17, -27]],
  stoneNodes: [[-22, 18], [22, -18], [-17, -27], [17, 27]],
  decorations: [
    // This is a flush splash-pad mosaic, not a pool to fall into or swim in.
    { kind: 'splash-pad', position: [0, 0, 0], size: [18, 0.03, 18], color: aqua, accent: cream },
    { kind: 'fountain-pipes', position: [-11, 0, 7], size: [4, 4.7, 2], color: coral, accent: yellow },
    { kind: 'fountain-pipes', position: [11, 0, -7], size: [4, 4.7, 2], color: aqua, accent: yellow, quarterTurns: 2 },
    { kind: 'inflatable', position: [-17, 0, -10], size: [6, 2.3, 3.2], color: yellow, accent: cream },
    { kind: 'inflatable', position: [17, 0, 10], size: [6, 2.3, 3.2], color: coral, accent: cream },
    { kind: 'inflatable', position: [-10, 0, 18], size: [5, 2.1, 3.2], color: aqua, accent: cream, quarterTurns: 1 },
    { kind: 'inflatable', position: [10, 0, -18], size: [5, 2.1, 3.2], color: mint, accent: cream, quarterTurns: 1 },
    { kind: 'parasol', position: [-31, 0, -17], size: [8, 6.2, 8], color: coral, accent: cream },
    { kind: 'parasol', position: [31, 0, 17], size: [8, 6.2, 8], color: yellow, accent: cream },
    { kind: 'parasol', position: [-31, 0, 17], size: [8, 6.2, 8], color: aqua, accent: cream },
    { kind: 'parasol', position: [31, 0, -17], size: [8, 6.2, 8], color: mint, accent: cream },
    // Closed display rides are beyond the fence, with no climbable entrance.
    { kind: 'slide-tower', position: [-55, 0, -25], size: [10, 17, 10], color: coral, accent: aqua },
    { kind: 'slide-tower', position: [55, 0, 25], size: [10, 17, 10], color: aqua, accent: yellow },
  ],
};

const castleGarden: MapConfig = {
  id: 'castle-garden',
  nameHiragana: 'おしろのおにわ',
  emoji: '🏰',
  theme: 'castle',
  groundColor: 0x85b577,
  groundAccentColor: cream,
  skyColor: 0xe5f0ed,
  skyTopColor: 0x99cce2,
  sizeMeters: 100,
  spawnPoints: [
    [0, -39], [0, 39], [-39, 0], [39, 0],
    [-32, -32], [32, -32], [-32, 32], [32, 32],
  ],
  waterTanks: [[0, 0], [-23, -9], [23, -9], [-18, 24], [18, 24]],
  weaponChests: [[-28, 0], [28, 0], [0, -31], [0, 29]],
  woodNodes: [[-31, -18], [31, 18], [-12, 32], [8, -35], [-38, 14], [38, -14]],
  stoneNodes: [[31, -18], [-31, 18], [12, 32], [-8, -35]],
  decorations: [
    // The castle frames the north approach; its actual arch is open at y=0.
    { kind: 'castle-gate', position: [0, 0, -18], size: [22, 11, 4], color: cream, accent: coral },
    { kind: 'castle-tower', position: [-14, 0, -18], size: [6, 14, 6], color: cream, accent: aqua },
    { kind: 'castle-tower', position: [14, 0, -18], size: [6, 14, 6], color: cream, accent: coral },
    { kind: 'castle-tower', position: [-14, 0, -31], size: [5, 11, 5], color: cream, accent: yellow },
    { kind: 'castle-tower', position: [14, 0, -31], size: [5, 11, 5], color: cream, accent: mint },
    { kind: 'hedge', position: [-24, 0, 8], size: [8, 1.5, 2.6], color: mint },
    { kind: 'hedge', position: [24, 0, 8], size: [8, 1.5, 2.6], color: mint },
    { kind: 'hedge', position: [-9, 0, 22], size: [6, 1.5, 2.6], color: mint, quarterTurns: 1 },
    { kind: 'hedge', position: [9, 0, 22], size: [6, 1.5, 2.6], color: mint, quarterTurns: 1 },
    { kind: 'hedge', position: [-32, 0, -7], size: [7, 1.5, 2.6], color: mint },
    { kind: 'hedge', position: [32, 0, -7], size: [7, 1.5, 2.6], color: mint },
    { kind: 'fountain', position: [-22, 0, 17], size: [7, 4.2, 7], color: cream, accent: aqua },
    { kind: 'fountain', position: [22, 0, 17], size: [7, 4.2, 7], color: cream, accent: aqua },
  ],
};

const cloudPlaza: MapConfig = {
  id: 'cloud-plaza',
  nameHiragana: 'くものうえひろば',
  emoji: '☁️',
  theme: 'cloud',
  groundColor: 0xb2cddd,
  groundAccentColor: cream,
  skyColor: 0xe9eef5,
  skyTopColor: 0xa0cddd,
  sizeMeters: 80,
  spawnPoints: [
    [0, -31], [0, 31], [-31, 0], [31, 0],
    [-25, -25], [25, -25], [-25, 25], [25, 25],
  ],
  waterTanks: [[0, 0], [-20, 6], [20, -6], [-6, -25], [6, 25]],
  weaponChests: [[-25, 0], [25, 0], [0, -26], [0, 26]],
  woodNodes: [[-21, -14], [14, 23], [-15, 26], [20, -23]],
  stoneNodes: [[-21, 20], [14, -25], [-15, -27], [31, 14]],
  decorations: [
    { kind: 'rainbow-gate', position: [0, 0, -18], size: [18, 12, 2.4], color: coral, accent: yellow },
    { kind: 'rainbow-gate', position: [25, 0, 14], size: [14, 10, 2.4], color: aqua, accent: mint, quarterTurns: 1 },
    { kind: 'cloud-cover', position: [-13, 0, -10], size: [6, 2.5, 3.8], color: cream, accent: aqua },
    { kind: 'cloud-cover', position: [13, 0, 10], size: [6, 2.5, 3.8], color: cream, accent: coral },
    { kind: 'cloud-cover', position: [-13, 0, 13], size: [5, 2.3, 3.6], color: cream, accent: yellow },
    { kind: 'cloud-cover', position: [14, 0, -9], size: [5, 2.3, 3.6], color: cream, accent: mint },
    { kind: 'cloud-cover', position: [-29, 0, -9], size: [5, 2.3, 3.6], color: cream, accent: mint, quarterTurns: 1 },
    // Balloon baskets are scenery outside the continuous, fenced play floor.
    { kind: 'balloon', position: [-48, 7, -23], size: [10, 20, 10], color: coral, accent: cream },
    { kind: 'balloon', position: [48, 9, 22], size: [10, 20, 10], color: aqua, accent: cream },
    { kind: 'balloon', position: [20, 12, -52], size: [8, 16, 8], color: yellow, accent: cream },
  ],
};

export const MAPS: MapConfig[] = [poolPark, castleGarden, cloudPlaza];

export function getMapById(id: string): MapConfig {
  return MAPS.find((map) => map.id === id) ?? MAPS[0];
}
