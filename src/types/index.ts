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

export interface SkinConfig {
  id: SkinId;
  nameHiragana: string;
  color: number;
  accent: number;
  unlockWins: number;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface MapConfig {
  id: string;
  nameHiragana: string;
  emoji: string;
  groundColor: number;
  skyColor: number;
  sizeMeters: number;
  spawnPoints: Array<[number, number]>;
  waterTanks: Array<[number, number]>;
  weaponChests: Array<[number, number]>;
  woodNodes: Array<[number, number]>;
  stoneNodes: Array<[number, number]>;
  decorations: Decoration[];
}

export interface Decoration {
  kind: 'box' | 'cylinder' | 'pyramid' | 'sphere';
  position: [number, number, number];
  size: [number, number, number];
  color: number;
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
