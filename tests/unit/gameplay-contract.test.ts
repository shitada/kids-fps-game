import { beforeEach, describe, expect, it } from 'vitest';
import { WEAPONS, WEAPON_ORDER } from '@/game/config/weapons';
import { BUILD_PIECES, BUILD_PIECE_SIZE } from '@/game/config/build';
import { SKINS, SKIN_ORDER } from '@/game/config/skins';
import { DIFFICULTY } from '@/game/config/difficulty';
import { SaveStorage } from '@/game/storage/SaveStorage';
import type { SaveData } from '@/types';

describe('visual rebuild preserves gameplay contracts', () => {
  beforeEach(() => localStorage.clear());

  it('retains weapon damage, timing, ammo and ballistics', () => {
    expect(WEAPON_ORDER.map((id) => {
      const w = WEAPONS[id];
      return [id, w.damage, w.rangeMeters, w.cooldownMs, w.ammoMax, w.ammoPerShot,
        w.reloadMs, w.projectileSpeed, w.gravity, w.splashRadius, w.pellets,
        w.spreadRad, w.refillPerSecond, w.refillDelayMs];
    })).toEqual([
      ['water-gun', 8, 35, 130, 60, 1, 1200, 42, 5, 0, 1, 0.012, 6, 1100],
      ['balloon-launcher', 32, 40, 900, 6, 1, 1800, 26, 16, 3.6, 1, 0.02, 0, 0],
      ['bubble-shower', 7, 12, 700, 12, 1, 1600, 34, 6, 0, 7, 0.22, 0, 0],
    ]);
  });

  it('retains all five skin abilities and win thresholds independently of their art', () => {
    expect(SKIN_ORDER.map((id) => {
      const skin = SKINS[id];
      const a = skin.abilities;
      return [id, skin.unlockWins, a.hpBonus, a.speedMultiplier, a.waterAmmoBonus, a.cooldownMultiplier, a.materialBonus];
    })).toEqual([
      ['kuma', 0, 0, 1, 0, 1, 0],
      ['usagi', 0, 0, 1.04, 0, 0.98, 0],
      ['neko', 1, 5, 1.06, 4, 0.96, 0],
      ['robo', 3, 15, 1.04, 6, 0.95, 10],
      ['sakana', 5, 20, 1.08, 10, 0.92, 12],
    ]);
  });

  it('retains building prices and CPU difficulty values', () => {
    expect(BUILD_PIECE_SIZE).toBe(4);
    expect(BUILD_PIECES).toEqual({
      wall: { kind: 'wall', costMaterial: 5, hp: 120 },
      floor: { kind: 'floor', costMaterial: 5, hp: 100 },
      stair: { kind: 'stair', costMaterial: 6, hp: 100 },
    });
    expect(Object.values(DIFFICULTY).map((d) => [
      d.aimErrorRad, d.reactionMs, d.firingChancePerSec, d.buildChance, d.moveSpeed, d.damageMultiplier,
    ])).toEqual([
      [0.18, 700, 0.5, 0, 5.5, 0.6],
      [0.07, 420, 1.1, 0.35, 7, 0.85],
      [0.025, 220, 2, 0.7, 8, 1],
    ]);
  });

  it('loads existing progress without a migration or reset', () => {
    const existing: SaveData = {
      totalWins: 6, totalMatches: 11, selectedSkin: 'sakana', difficulty: 'hard',
      unlockedSkins: ['kuma', 'usagi', 'neko', 'robo', 'sakana'],
      badges: ['first-win'], bestRank: 1, tutorialSeen: true,
      sfxVolume: 0.3, bgmVolume: 0.2, totalPlayMinutes: 39,
    };
    localStorage.setItem('skb_save_v1', JSON.stringify(existing));
    const storage = new SaveStorage();
    expect(storage.get()).toEqual(existing);
    storage.setSkin('robo');
    expect(new SaveStorage().get()).toEqual({ ...existing, selectedSkin: 'robo' });
  });
});
