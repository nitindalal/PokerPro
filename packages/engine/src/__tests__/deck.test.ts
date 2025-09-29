import { describe, it, expect } from 'vitest';
import { makeShuffledDeck } from '../deck';

describe('deck', () => {
  it('makes 52 unique cards', () => {
    const d = makeShuffledDeck(42);
    expect(d.length).toBe(52);
    expect(new Set(d).size).toBe(52);
  });
  it('is reproducible by seed', () => {
    const a = makeShuffledDeck(123);
    const b = makeShuffledDeck(123);
    expect(a).toEqual(b);
  });
});
