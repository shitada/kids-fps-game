import type { SkinConfig, SkinId } from '@/types';

export const SKINS: Record<SkinId, SkinConfig> = {
  kuma: {
    id: 'kuma',
    nameHiragana: 'くまくん',
    color: 0x8b5a2b,
    accent: 0xfff2c0,
    unlockWins: 0,
    icon: '🐻',
    abilities: { hpBonus: 0, speedMultiplier: 1, waterAmmoBonus: 0, cooldownMultiplier: 1, materialBonus: 0 },
    abilityLabels: ['きほん'],
  },
  usagi: {
    id: 'usagi',
    nameHiragana: 'うさちゃん',
    color: 0xffd1dc,
    accent: 0xffffff,
    unlockWins: 0,
    icon: '🐰',
    abilities: { hpBonus: 0, speedMultiplier: 1.04, waterAmmoBonus: 0, cooldownMultiplier: 0.98, materialBonus: 0 },
    abilityLabels: ['はやさ +4%', 'れんしゃ +2%'],
  },
  neko: {
    id: 'neko',
    nameHiragana: 'ねこさん',
    color: 0x222222,
    accent: 0xfff200,
    unlockWins: 1,
    icon: '🐱',
    abilities: { hpBonus: 5, speedMultiplier: 1.06, waterAmmoBonus: 4, cooldownMultiplier: 0.96, materialBonus: 0 },
    abilityLabels: ['はやさ +6%', 'みず +4', 'れんしゃ +4%'],
  },
  robo: {
    id: 'robo',
    nameHiragana: 'ロボくん',
    color: 0x6ec6ff,
    accent: 0x1976d2,
    unlockWins: 3,
    icon: '🤖',
    abilities: { hpBonus: 15, speedMultiplier: 1.04, waterAmmoBonus: 6, cooldownMultiplier: 0.95, materialBonus: 10 },
    abilityLabels: ['じょうぶ +15', 'みず +6', 'そざい +10'],
  },
  sakana: {
    id: 'sakana',
    nameHiragana: 'さかなちゃん',
    color: 0x29b6f6,
    accent: 0xff8a65,
    unlockWins: 5,
    icon: '🐟',
    abilities: { hpBonus: 20, speedMultiplier: 1.08, waterAmmoBonus: 10, cooldownMultiplier: 0.92, materialBonus: 12 },
    abilityLabels: ['はやさ +8%', 'みず +10', 'れんしゃ +8%'],
  },
};

export const SKIN_ORDER: SkinId[] = ['kuma', 'usagi', 'neko', 'robo', 'sakana'];

export function isUnlocked(skin: SkinConfig, wins: number): boolean {
  return wins >= skin.unlockWins;
}

export function skinPowerScore(skin: SkinConfig): number {
  const a = skin.abilities;
  return (
    a.hpBonus +
    (a.speedMultiplier - 1) * 220 +
    a.waterAmmoBonus * 1.4 +
    (1 - a.cooldownMultiplier) * 180 +
    a.materialBonus * 0.35
  );
}
