import type { SkinConfig, SkinId } from '@/types';

export const SKINS: Record<SkinId, SkinConfig> = {
  kuma: { id: 'kuma', nameHiragana: 'くまくん', color: 0x8b5a2b, accent: 0xfff2c0, unlockWins: 0 },
  usagi: { id: 'usagi', nameHiragana: 'うさちゃん', color: 0xffd1dc, accent: 0xffffff, unlockWins: 0 },
  neko: { id: 'neko', nameHiragana: 'ねこさん', color: 0x222222, accent: 0xfff200, unlockWins: 1 },
  robo: { id: 'robo', nameHiragana: 'ロボくん', color: 0x6ec6ff, accent: 0x1976d2, unlockWins: 3 },
  sakana: { id: 'sakana', nameHiragana: 'さかなちゃん', color: 0x29b6f6, accent: 0xff8a65, unlockWins: 5 },
};

export const SKIN_ORDER: SkinId[] = ['kuma', 'usagi', 'neko', 'robo', 'sakana'];

export function isUnlocked(skin: SkinConfig, wins: number): boolean {
  return wins >= skin.unlockWins;
}
