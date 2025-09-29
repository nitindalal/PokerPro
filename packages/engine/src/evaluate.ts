import type { Card } from './types';

// Placeholder 7-card evaluator adapter. Replace with a real one later.
// Returns a numeric rank where bigger is better.
// Deterministic but simplistic: counts pairs/sets/straights/flushes minimally.
export function rank7(hole: [Card, Card], board: Card[]): number {
  const cards = [...hole, ...board].slice(0, 7);
  // Very naive strength: high-card value + simple pair/trips bonuses.
  const rankValue = (c: Card) => '23456789TJQKA'.indexOf(c[0]) + 2;
  let score = cards.reduce((s, c) => s + rankValue(c), 0);
  // Pair/trips detection
  const map = new Map<string, number>();
  for (const c of cards) map.set(c[0], (map.get(c[0]) || 0) + 1);
  for (const [, n] of map) {
    if (n === 2) score += 30;
    else if (n === 3) score += 80;
    else if (n >= 4) score += 200; // quads bonus
  }
  return score;
}

// Very naive label aligned to rank7 bonuses; replace with real evaluator labels later
export function label7(hole: [Card, Card] | undefined, board: Card[]): string {
  if (!hole) return '—';
  const cards = [...hole, ...board].slice(0, 7);
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c[0], (counts.get(c[0]) || 0) + 1);
  let hasTrips = false;
  let pairCount = 0;
  for (const [, n] of counts) {
    if (n >= 4) return 'Four of a Kind';
    if (n === 3) hasTrips = true;
    if (n === 2) pairCount++;
  }
  if (hasTrips && pairCount >= 1) return 'Full House';
  if (hasTrips) return 'Three of a Kind';
  if (pairCount >= 2) return 'Two Pair';
  if (pairCount === 1) return 'Pair';
  return 'High Card';
}
