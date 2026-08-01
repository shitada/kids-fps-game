import type * as THREE from 'three';

export type SceneId = 'title' | 'skin-select' | 'map-select' | 'battle' | 'result';

export type WeaponId = 'water-gun' | 'balloon-launcher' | 'bubble-shower';

export interface WeaponConfig {
  id: WeaponId;
  nameHiragana: string;
  emoji: string;
  damage: number;
  rangeMeters: number;
  cooldownMs: number;
  ammoMax: number;
  ammoPerShot: number;
  reloadMs: number;
  projectileSpeed: number;
  gravity: number;
  splashRadius: number;
  pellets: number;
  spreadRad: number;
  /** せなかのタンクから自動で回復する量（1びょうあたり）。0 なら回復しない。 */
  refillPerSecond: number;
  /** 撃つのをやめてから回復が始まるまでの時間（ミリびょう） */
  refillDelayMs: number;
}

export type BuildPieceKind = 'wall' | 'floor' | 'stair';

export interface BuildPieceConfig {
  kind: BuildPieceKind;
  costMaterial: number;
  hp: number;
}

export type MaterialKind = 'wood' | 'stone';

export type PickupKind = 'water-tank' | 'weapon-chest' | 'wood-node' | 'stone-node';

export interface PickupConfig {
  kind: PickupKind;
  nameHiragana: string;
  emoji: string;
  amount: number;
  respawnMs: number;
}

export type SkinId = 'kuma' | 'usagi' | 'neko' | 'robo' | 'sakana';

export interface SkinAbilityConfig {
  hpBonus: number;
  speedMultiplier: number;
  waterAmmoBonus: number;
  cooldownMultiplier: number;
  materialBonus: number;
}

export interface SkinConfig {
  id: SkinId;
  nameHiragana: string;
  color: number;
  accent: number;
  unlockWins: number;
  icon: string;
  abilities: SkinAbilityConfig;
  abilityLabels: string[];
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface MapConfig {
  id: string;
  nameHiragana: string;
  emoji: string;
  groundColor: number;
  /** 地面のまだら模様に使う 2 色目。省略時は groundColor から自動生成する。 */
  groundAccentColor?: number;
  skyColor: number;
  /** 天頂の空の色。地平線側は skyColor を使う。 */
  skyTopColor?: number;
  sizeMeters: number;
  spawnPoints: Array<[number, number]>;
  waterTanks: Array<[number, number]>;
  weaponChests: Array<[number, number]>;
  woodNodes: Array<[number, number]>;
  stoneNodes: Array<[number, number]>;
  decorations: Decoration[];
  /** InstancedMesh でばらまく小物。見た目のにぎやかさ用で当たり判定は持たない。 */
  scatter?: ScatterGroup[];
}

export interface Decoration {
  kind: 'box' | 'cylinder' | 'pyramid' | 'sphere';
  position: [number, number, number];
  size: [number, number, number];
  color: number;
}

export type ScatterKind = 'tree' | 'bush' | 'flower' | 'ball' | 'floaty' | 'cloudlet';

export interface ScatterGroup {
  kind: ScatterKind;
  count: number;
  color: number;
  /** 中心からの配置半径（min, max） */
  radius: [number, number];
  /** 個体ごとのスケール倍率（min, max） */
  scale: [number, number];
  /** 配置する高さ。省略時は地面（0）。 */
  height?: number;
}

export interface SaveData {
  totalWins: number;
  totalMatches: number;
  selectedSkin: SkinId;
  difficulty: Difficulty;
  unlockedSkins: SkinId[];
  badges: string[];
  bestRank: number;
  tutorialSeen: boolean;
  sfxVolume: number;
  bgmVolume: number;
  totalPlayMinutes: number;
}

export interface InputState {
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

export interface DamageEvent {
  victimId: string;
  attackerId: string | null;
  amount: number;
  weapon: WeaponId | 'zone' | 'fall';
  position: THREE.Vector3;
}

export interface MatchResult {
  rank: number;
  totalPlayers: number;
  eliminations: number;
  durationSec: number;
  victory: boolean;
}
