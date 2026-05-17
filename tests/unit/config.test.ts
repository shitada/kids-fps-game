import { describe, it, expect } from 'vitest';
import { SKINS, SKIN_ORDER, isUnlocked, skinPowerScore } from '@/game/config/skins';
import { WEAPONS, WEAPON_ORDER } from '@/game/config/weapons';
import { MAPS, getMapById } from '@/game/config/maps';
import { BUILD_PIECES, BUILD_ORDER } from '@/game/config/build';
import { PICKUPS } from '@/game/config/pickups';
import { DIFFICULTY } from '@/game/config/difficulty';

describe('config integrity', () => {
  it('every skin in SKIN_ORDER has a definition', () => {
    for (const id of SKIN_ORDER) {
      expect(SKINS[id]).toBeDefined();
      expect(SKINS[id].nameHiragana.length).toBeGreaterThan(0);
      expect(SKINS[id].icon.length).toBeGreaterThan(0);
      expect(SKINS[id].abilityLabels.length).toBeGreaterThan(0);
    }
  });

  it('skin abilities get stronger from left to right', () => {
    const scores = SKIN_ORDER.map((id) => skinPowerScore(SKINS[id]));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });

  it('isUnlocked respects threshold', () => {
    expect(isUnlocked(SKINS.kuma, 0)).toBe(true);
    expect(isUnlocked(SKINS.robo, 2)).toBe(false);
    expect(isUnlocked(SKINS.robo, 3)).toBe(true);
  });

  it('every weapon in WEAPON_ORDER has a definition with positive stats', () => {
    for (const id of WEAPON_ORDER) {
      const w = WEAPONS[id];
      expect(w).toBeDefined();
      expect(w.damage).toBeGreaterThan(0);
      expect(w.rangeMeters).toBeGreaterThan(0);
      expect(w.ammoMax).toBeGreaterThan(0);
      expect(w.cooldownMs).toBeGreaterThan(0);
    }
  });

  it('all 3 maps are reachable by id', () => {
    expect(MAPS).toHaveLength(3);
    for (const m of MAPS) {
      const lookup = getMapById(m.id);
      expect(lookup.id).toBe(m.id);
      expect(m.spawnPoints.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('build pieces have non-negative cost', () => {
    for (const id of BUILD_ORDER) {
      expect(BUILD_PIECES[id].costMaterial).toBeGreaterThan(0);
      expect(BUILD_PIECES[id].hp).toBeGreaterThan(0);
    }
  });

  it('pickups carry hiragana names and positive amounts', () => {
    for (const k of Object.keys(PICKUPS) as Array<keyof typeof PICKUPS>) {
      const p = PICKUPS[k];
      expect(p.nameHiragana.length).toBeGreaterThan(0);
      expect(p.amount).toBeGreaterThan(0);
      expect(p.respawnMs).toBeGreaterThan(0);
    }
  });

  it('difficulty params are monotonic where expected', () => {
    expect(DIFFICULTY.easy.damageMultiplier).toBeLessThan(DIFFICULTY.hard.damageMultiplier);
    expect(DIFFICULTY.easy.aimErrorRad).toBeGreaterThan(DIFFICULTY.hard.aimErrorRad);
    expect(DIFFICULTY.easy.firingChancePerSec).toBeLessThan(DIFFICULTY.hard.firingChancePerSec);
  });
});
