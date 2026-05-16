import type { SaveData, SkinId, Difficulty } from '@/types';

const STORAGE_KEY = 'skb_save_v1';

const DEFAULT_SAVE: SaveData = {
  totalWins: 0,
  totalMatches: 0,
  selectedSkin: 'kuma',
  difficulty: 'easy',
  unlockedSkins: ['kuma', 'usagi'],
  badges: [],
  bestRank: 999,
  tutorialSeen: false,
  sfxVolume: 0.7,
  bgmVolume: 0.5,
  totalPlayMinutes: 0,
};

function safeLocalStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (_) {
    return null;
  }
  return null;
}

export class SaveStorage {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    const ls = safeLocalStorage();
    if (!ls) return { ...DEFAULT_SAVE };
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    try {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return { ...DEFAULT_SAVE, ...parsed };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  save(): void {
    const ls = safeLocalStorage();
    if (!ls) return;
    ls.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  get(): SaveData {
    return this.data;
  }

  update(patch: Partial<SaveData>): void {
    this.data = { ...this.data, ...patch };
    this.save();
  }

  recordMatch(victory: boolean, rank: number): void {
    this.data.totalMatches += 1;
    if (victory) this.data.totalWins += 1;
    if (rank < this.data.bestRank) this.data.bestRank = rank;
    this.recomputeUnlocks();
    this.save();
  }

  setSkin(id: SkinId): void {
    this.data.selectedSkin = id;
    this.save();
  }

  setDifficulty(d: Difficulty): void {
    this.data.difficulty = d;
    this.save();
  }

  addBadge(badge: string): void {
    if (!this.data.badges.includes(badge)) {
      this.data.badges.push(badge);
      this.save();
    }
  }

  markTutorialSeen(): void {
    if (!this.data.tutorialSeen) {
      this.data.tutorialSeen = true;
      this.save();
    }
  }

  private recomputeUnlocks(): void {
    const wins = this.data.totalWins;
    const unlocks: SkinId[] = ['kuma', 'usagi'];
    if (wins >= 1) unlocks.push('neko');
    if (wins >= 3) unlocks.push('robo');
    if (wins >= 5) unlocks.push('sakana');
    this.data.unlockedSkins = unlocks;
  }
}
