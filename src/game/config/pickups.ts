import type { PickupConfig, PickupKind } from '@/types';

export const PICKUPS: Record<PickupKind, PickupConfig> = {
  'water-tank': {
    kind: 'water-tank',
    nameHiragana: 'きゅうすいタンク',
    emoji: '💧',
    amount: 40,
    respawnMs: 12000,
  },
  'weapon-chest': {
    kind: 'weapon-chest',
    nameHiragana: 'たからばこ',
    emoji: '📦',
    amount: 1,
    respawnMs: 25000,
  },
  'wood-node': {
    kind: 'wood-node',
    nameHiragana: 'き',
    emoji: '🌳',
    amount: 30,
    respawnMs: 15000,
  },
  'stone-node': {
    kind: 'stone-node',
    nameHiragana: 'いし',
    emoji: '🪨',
    amount: 30,
    respawnMs: 18000,
  },
};
