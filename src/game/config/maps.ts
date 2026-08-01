import type { MapConfig } from '@/types';

const poolPark: MapConfig = {
  id: 'pool-park',
  nameHiragana: 'プールパーク',
  emoji: '🏊',
  groundColor: 0x7ec8a9,
  groundAccentColor: 0x9fdcbb,
  skyColor: 0xcdf1ff,
  skyTopColor: 0x4fa8e8,
  sizeMeters: 90,
  spawnPoints: [
    [0, -24], [0, 24], [-24, 0], [24, 0],
    [-16, -16], [16, 16], [14, -14], [-14, 14],
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
    // まんなかの大きなプール
    { kind: 'box', position: [0, 0.35, 0], size: [14, 0.7, 14], color: 0x4fc3f7 },
    { kind: 'box', position: [0, 0.9, -7.4], size: [15, 1.8, 1.2], color: 0xfff3d6 },
    { kind: 'box', position: [0, 0.9, 7.4], size: [15, 1.8, 1.2], color: 0xfff3d6 },
    { kind: 'box', position: [-7.4, 0.9, 0], size: [1.2, 1.8, 15], color: 0xfff3d6 },
    { kind: 'box', position: [7.4, 0.9, 0], size: [1.2, 1.8, 15], color: 0xfff3d6 },
    // ウォータースライダーのやぐら
    { kind: 'box', position: [-18, 3, 18], size: [5, 6, 5], color: 0xffb56b },
    { kind: 'pyramid', position: [-18, 7.6, 18], size: [7, 3.2, 7], color: 0xff7043 },
    { kind: 'box', position: [18, 3, -18], size: [5, 6, 5], color: 0x9fd6ff },
    { kind: 'pyramid', position: [18, 7.6, -18], size: [7, 3.2, 7], color: 0x42a5f5 },
    // パラソルと売店
    { kind: 'cylinder', position: [-18, 1.4, -18], size: [1, 2.8, 1], color: 0xfff3d6 },
    { kind: 'pyramid', position: [-18, 3.5, -18], size: [6, 1.6, 6], color: 0xff8a80 },
    { kind: 'cylinder', position: [18, 1.4, 18], size: [1, 2.8, 1], color: 0xfff3d6 },
    { kind: 'pyramid', position: [18, 3.5, 18], size: [6, 1.6, 6], color: 0xffe066 },
    // かくれられるブロック
    { kind: 'box', position: [-27, 1.3, -6], size: [2.6, 2.6, 9], color: 0xffe3bd },
    { kind: 'box', position: [27, 1.3, 6], size: [2.6, 2.6, 9], color: 0xffe3bd },
    { kind: 'box', position: [0, 1.3, 30], size: [15, 2.6, 2.4], color: 0xffd0a3 },
    { kind: 'box', position: [0, 1.3, -30], size: [15, 2.6, 2.4], color: 0xffd0a3 },
    { kind: 'box', position: [-30, 2.2, 28], size: [6, 4.4, 6], color: 0xb39ddb },
    { kind: 'box', position: [30, 2.2, -28], size: [6, 4.4, 6], color: 0x80cbc4 },
    { kind: 'cylinder', position: [-10, 2, -34], size: [3, 4, 3], color: 0xf48fb1 },
    { kind: 'cylinder', position: [10, 2, 34], size: [3, 4, 3], color: 0xf48fb1 },
  ],
  scatter: [
    { kind: 'tree', count: 54, color: 0x4caf50, radius: [50, 100], scale: [1.1, 2.2] },
    { kind: 'tree', count: 10, color: 0x66bb6a, radius: [34, 42], scale: [0.8, 1.2] },
    { kind: 'bush', count: 30, color: 0x66bb6a, radius: [20, 44], scale: [0.5, 0.9] },
    { kind: 'flower', count: 90, color: 0xffd166, radius: [10, 44], scale: [0.7, 1.2] },
    { kind: 'flower', count: 50, color: 0xff8fb1, radius: [12, 42], scale: [0.6, 1.1] },
    { kind: 'ball', count: 14, color: 0xff7043, radius: [10, 36], scale: [0.7, 1.1] },
    { kind: 'floaty', count: 8, color: 0x4fc3f7, radius: [4.5, 6.5], scale: [1, 1.4], height: 0.72 },
  ],
};

const castleGarden: MapConfig = {
  id: 'castle-garden',
  nameHiragana: 'おしろのおにわ',
  emoji: '🏰',
  groundColor: 0x86c86e,
  groundAccentColor: 0xa8dd8c,
  skyColor: 0xd6efff,
  skyTopColor: 0x3f8fd8,
  sizeMeters: 100,
  spawnPoints: [
    [0, -38], [0, 38], [-38, 0], [38, 0],
    [-26, -26], [26, -26], [-26, 26], [26, 26],
  ],
  waterTanks: [
    [0, 0], [-20, 20], [20, -20], [20, 20], [-20, -20],
  ],
  weaponChests: [
    [-25, 0], [25, 0], [0, -25], [0, 25],
  ],
  woodNodes: [
    [-15, -15], [15, 15], [-30, 10], [30, -10], [10, -30], [-10, 30],
  ],
  stoneNodes: [
    [-15, 15], [15, -15], [-30, -10], [30, 10],
  ],
  decorations: [
    // 中央のおしろ
    { kind: 'box', position: [0, 4, 0], size: [12, 8, 12], color: 0xf0e2c0 },
    { kind: 'pyramid', position: [0, 11, 0], size: [11, 5, 11], color: 0xef5350 },
    { kind: 'cylinder', position: [-6, 6, -6], size: [2.4, 12, 2.4], color: 0xfaf3e0 },
    { kind: 'pyramid', position: [-6, 13.4, -6], size: [3.6, 3, 3.6], color: 0x42a5f5 },
    { kind: 'cylinder', position: [6, 6, -6], size: [2.4, 12, 2.4], color: 0xfaf3e0 },
    { kind: 'pyramid', position: [6, 13.4, -6], size: [3.6, 3, 3.6], color: 0x42a5f5 },
    { kind: 'cylinder', position: [-6, 6, 6], size: [2.4, 12, 2.4], color: 0xfaf3e0 },
    { kind: 'pyramid', position: [-6, 13.4, 6], size: [3.6, 3, 3.6], color: 0x42a5f5 },
    { kind: 'cylinder', position: [6, 6, 6], size: [2.4, 12, 2.4], color: 0xfaf3e0 },
    { kind: 'pyramid', position: [6, 13.4, 6], size: [3.6, 3, 3.6], color: 0x42a5f5 },
    // 生けがき
    { kind: 'box', position: [-20, 1.4, 0], size: [4, 2.8, 30], color: 0x5d9c4a },
    { kind: 'box', position: [20, 1.4, 0], size: [4, 2.8, 30], color: 0x5d9c4a },
    { kind: 'box', position: [0, 1.4, -25], size: [40, 2.8, 3], color: 0x5d9c4a },
    { kind: 'box', position: [0, 1.4, 25], size: [40, 2.8, 3], color: 0x5d9c4a },
    // 見はりとう
    { kind: 'cylinder', position: [-32, 3.5, -32], size: [5, 7, 5], color: 0xe8d9b5 },
    { kind: 'pyramid', position: [-32, 8.5, -32], size: [7, 3, 7], color: 0xab47bc },
    { kind: 'cylinder', position: [32, 3.5, 32], size: [5, 7, 5], color: 0xe8d9b5 },
    { kind: 'pyramid', position: [32, 8.5, 32], size: [7, 3, 7], color: 0xab47bc },
    { kind: 'box', position: [32, 1.6, -32], size: [8, 3.2, 8], color: 0xffcc80 },
    { kind: 'box', position: [-32, 1.6, 32], size: [8, 3.2, 8], color: 0xffcc80 },
    // ふんすい
    { kind: 'cylinder', position: [-14, 0.6, 14], size: [6, 1.2, 6], color: 0x81d4fa },
    { kind: 'cylinder', position: [14, 0.6, -14], size: [6, 1.2, 6], color: 0x81d4fa },
  ],
  scatter: [
    { kind: 'tree', count: 62, color: 0x388e3c, radius: [56, 112], scale: [1.2, 2.4] },
    { kind: 'tree', count: 12, color: 0x4caf50, radius: [38, 47], scale: [0.9, 1.3] },
    { kind: 'bush', count: 38, color: 0x4c9a3f, radius: [16, 47], scale: [0.5, 0.9] },
    { kind: 'flower', count: 110, color: 0xf06292, radius: [8, 47], scale: [0.7, 1.2] },
    { kind: 'flower', count: 60, color: 0xfff176, radius: [10, 46], scale: [0.6, 1.1] },
    { kind: 'ball', count: 12, color: 0xffd54f, radius: [12, 40], scale: [0.7, 1.1] },
  ],
};

const cloudPlaza: MapConfig = {
  id: 'cloud-plaza',
  nameHiragana: 'くものうえひろば',
  emoji: '☁️',
  groundColor: 0xd4dcff,
  groundAccentColor: 0xffbde6,
  skyColor: 0xffdff2,
  skyTopColor: 0x5fa4ea,
  sizeMeters: 80,
  spawnPoints: [
    [0, -30], [0, 30], [-30, 0], [30, 0],
    [-18, -18], [18, -18], [-18, 18], [18, 18],
  ],
  waterTanks: [
    [0, 0], [-12, 12], [12, -12], [-12, -12], [12, 12],
  ],
  weaponChests: [
    [-18, 0], [18, 0], [0, -18], [0, 18],
  ],
  woodNodes: [
    [-22, 8], [22, -8], [8, 22], [-8, -22],
  ],
  stoneNodes: [
    [8, 22], [-8, -22], [22, 14], [-22, -14],
  ],
  decorations: [
    // 中央のうかぶ島
    { kind: 'cylinder', position: [0, 2.5, 0], size: [9, 5, 9], color: 0xd8e6ff },
    { kind: 'cylinder', position: [0, 5.4, 0], size: [7, 0.8, 7], color: 0xfff6ff },
    // まわりのくもの足場
    { kind: 'box', position: [-16, 2.2, 0], size: [6, 1.2, 8], color: 0xe3ecff },
    { kind: 'box', position: [16, 2.2, 0], size: [6, 1.2, 8], color: 0xe3ecff },
    { kind: 'box', position: [0, 2.2, -16], size: [8, 1.2, 6], color: 0xe3ecff },
    { kind: 'box', position: [0, 2.2, 16], size: [8, 1.2, 6], color: 0xe3ecff },
    // にじ色のとう
    { kind: 'cylinder', position: [-24, 4, -24], size: [4, 8, 4], color: 0xff8ec6 },
    { kind: 'pyramid', position: [-24, 9.4, -24], size: [5.6, 3, 5.6], color: 0xfff6ff },
    { kind: 'cylinder', position: [24, 4, 24], size: [4, 8, 4], color: 0x6ec6ff },
    { kind: 'pyramid', position: [24, 9.4, 24], size: [5.6, 3, 5.6], color: 0xfff6ff },
    { kind: 'cylinder', position: [24, 4, -24], size: [4, 8, 4], color: 0xb388ff },
    { kind: 'pyramid', position: [24, 9.4, -24], size: [5.6, 3, 5.6], color: 0xfff6ff },
    { kind: 'cylinder', position: [-24, 4, 24], size: [4, 8, 4], color: 0xffd54f },
    { kind: 'pyramid', position: [-24, 9.4, 24], size: [5.6, 3, 5.6], color: 0xfff6ff },
    // かくれられるくも（見とおしをふさがない大きさにする）
    { kind: 'sphere', position: [-11, 1.6, -11], size: [5, 5, 5], color: 0xeef3ff },
    { kind: 'sphere', position: [11, 1.8, 11], size: [5.4, 5.4, 5.4], color: 0xeef3ff },
    { kind: 'sphere', position: [-14, 1.6, 14], size: [4.4, 4.4, 4.4], color: 0xffe9f7 },
    { kind: 'sphere', position: [14, 1.6, -14], size: [4.4, 4.4, 4.4], color: 0xffe9f7 },
  ],
  scatter: [
    { kind: 'cloudlet', count: 46, color: 0xffffff, radius: [46, 92], scale: [1, 2.4] },
    { kind: 'cloudlet', count: 14, color: 0xf4f8ff, radius: [18, 36], scale: [0.45, 0.7] },
    { kind: 'flower', count: 80, color: 0xff5fa8, radius: [8, 37], scale: [0.7, 1.1] },
    { kind: 'ball', count: 16, color: 0x8f5cff, radius: [10, 35], scale: [0.7, 1.1] },
    { kind: 'bush', count: 18, color: 0x7fb6ff, radius: [14, 35], scale: [0.5, 0.85] },
  ],
};

export const MAPS: MapConfig[] = [poolPark, castleGarden, cloudPlaza];

export function getMapById(id: string): MapConfig {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}
