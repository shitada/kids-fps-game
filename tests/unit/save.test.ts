import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SaveStorage } from '@/game/storage/SaveStorage';

describe('SaveStorage', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('starts with default save when no data exists', () => {
    const s = new SaveStorage();
    expect(s.get().totalWins).toBe(0);
    expect(s.get().totalMatches).toBe(0);
    expect(s.get().selectedSkin).toBe('kuma');
    expect(s.get().difficulty).toBe('easy');
  });

  it('records a victory and saves', () => {
    const s = new SaveStorage();
    s.recordMatch(true, 1);
    expect(s.get().totalWins).toBe(1);
    expect(s.get().totalMatches).toBe(1);
    expect(s.get().bestRank).toBe(1);
  });

  it('unlocks neko after first win', () => {
    const s = new SaveStorage();
    expect(s.get().unlockedSkins).not.toContain('neko');
    s.recordMatch(true, 1);
    expect(s.get().unlockedSkins).toContain('neko');
  });

  it('persists across instances via localStorage', () => {
    const s = new SaveStorage();
    s.setSkin('neko');
    const s2 = new SaveStorage();
    expect(s2.get().selectedSkin).toBe('neko');
  });

  it('addBadge dedupes', () => {
    const s = new SaveStorage();
    s.addBadge('first-win');
    s.addBadge('first-win');
    expect(s.get().badges).toEqual(['first-win']);
  });
});
