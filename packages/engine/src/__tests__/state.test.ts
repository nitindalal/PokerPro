import { describe, it, expect } from 'vitest';
import { createTable, dealHole, postBlinds } from '../state';

const basePlayers = [
  { id:'p1', name:'P1', seat:0, stack:10000, isHuman:true },
  { id:'p2', name:'P2', seat:1, stack:10000, isHuman:false },
];

describe('state', () => {
  it('creates a table and deals hole cards', () => {
    let s = createTable(basePlayers, { smallBlind:50, bigBlind:100, seed:'seed' });
    s = dealHole(s);
    expect(s.players[0].hole).toBeTruthy();
    expect(s.players[1].hole).toBeTruthy();
  });
  it('posts blinds', () => {
    let s = createTable(basePlayers, { smallBlind:50, bigBlind:100, seed:'seed' });
    s = postBlinds(s);
    expect(s.players[1].committed).toBe(50);
  expect(s.players[0].committed + s.players[1].committed).toBe(150);
  // Committed chips should not yet be moved into the pot until the betting
  // round is resolved by maybeAdvanceStreet.
  expect(s.pot).toBe(0);
  });
});
