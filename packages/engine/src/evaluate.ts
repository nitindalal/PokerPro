import type { Card } from './types';

// Placeholder 7-card evaluator adapter. Replace with a real one later.
// Returns a numeric rank where bigger is better.
// Deterministic but simplistic: counts pairs/sets/straights/flushes minimally.
// Improved 7-card evaluator (still simplified): returns a numeric score where
// larger is better. Score is composed as: category * 1e10 + tiebreaker encoding.
// Categories (increasing): 0=High Card,1=Pair,2=Two Pair,3=Trips,4=Full House,5=Quads
export function rank7(hole: [Card, Card], board: Card[]): number {
  const cards = [...hole, ...board].slice(0, 7);
  const order = '23456789TJQKA';
  const rankValue = (r: string) => order.indexOf(r) + 2; // 2..14

  // Count ranks
  const counts = new Map<number, number>();
  for (const c of cards) {
    const v = rankValue(c[0]);
    counts.set(v, (counts.get(v) || 0) + 1);
  }

  // Group ranks by count
  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (const [r, n] of counts) {
    if (n >= 4) quads.push(r);
    else if (n === 3) trips.push(r);
    else if (n === 2) pairs.push(r);
    else singles.push(r);
  }

  // Sort descending
  quads.sort((a,b)=>b-a);
  trips.sort((a,b)=>b-a);
  pairs.sort((a,b)=>b-a);
  singles.sort((a,b)=>b-a);

  // Helper to encode an array of ranks into a single number with base 16
  const encode = (arr: number[]) => arr.reduce((acc, r) => acc * 16 + r, 0);

  // Determine category and tiebreaker ranks
  // Category order: 5=Quads,4=FullHouse,3=Trips,2=TwoPair,1=Pair,0=HighCard
  if (quads.length > 0) {
    const quadRank = quads[0];
    const kickers = [...singles, ...pairs, ...trips].filter(r=>r!==quadRank).sort((a,b)=>b-a);
    return 5 * 1e10 + quadRank * 1e6 + encode(kickers.slice(0,1));
  }
  if (trips.length > 0 && pairs.length > 0) {
    // Full house: highest trip then highest pair
    const tripRank = trips[0];
    const pairRank = pairs[0] || trips[1] || 0;
    return 4 * 1e10 + tripRank * 1e6 + pairRank * 1e4;
  }
  if (trips.length > 0) {
    const tripRank = trips[0];
    const kickers = [...singles, ...pairs].filter(r=>r!==tripRank).sort((a,b)=>b-a);
    return 3 * 1e10 + tripRank * 1e6 + encode(kickers.slice(0,2));
  }
  if (pairs.length >= 2) {
    const highPair = pairs[0];
    const lowPair = pairs[1];
    const kickers = [...singles, ...trips].filter(r=>r!==highPair && r!==lowPair).sort((a,b)=>b-a);
    return 2 * 1e10 + highPair * 1e6 + lowPair * 1e4 + encode(kickers.slice(0,1));
  }
  if (pairs.length === 1) {
    const pairRank = pairs[0];
    const kickers = [...singles, ...trips].filter(r=>r!==pairRank).sort((a,b)=>b-a);
    return 1 * 1e10 + pairRank * 1e6 + encode(kickers.slice(0,3));
  }
  // High card: encode top five ranks
  const top = [...singles, ...pairs, ...trips].sort((a,b)=>b-a).slice(0,5);
  return 0 * 1e10 + encode(top);
}

// Very naive label aligned to rank7 bonuses; replace with real evaluator labels later
export function label7(hole: [Card, Card] | undefined, board: Card[]): string {
  if (!hole) return '—';
  const cards = [...hole, ...board].slice(0, 7);
  const order = '23456789TJQKA';
  const rankValue = (r: string) => order.indexOf(r) + 2;
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(rankValue(c[0]), (counts.get(rankValue(c[0])) || 0) + 1);
  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (const [r, n] of counts) {
    if (n >= 4) quads.push(r);
    else if (n === 3) trips.push(r);
    else if (n === 2) pairs.push(r);
    else singles.push(r);
  }
  if (quads.length > 0) return 'Four of a Kind';
  if (trips.length > 0 && pairs.length > 0) return 'Full House';
  if (trips.length > 0) return 'Three of a Kind';
  if (pairs.length >= 2) return 'Two Pair';
  if (pairs.length === 1) return 'Pair';
  return 'High Card';
}
