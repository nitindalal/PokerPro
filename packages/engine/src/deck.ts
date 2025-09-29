import type { Card } from './types';
import { mulberry32 } from './rng';

export function makeShuffledDeck(seed: number): Card[] {
  const ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'] as const;
  const suits = ['c','d','h','s'] as const;
  const deck: Card[] = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}` as Card);
  const rand = mulberry32(seed);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
