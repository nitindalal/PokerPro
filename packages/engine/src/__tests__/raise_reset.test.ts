import { describe, it, expect } from 'vitest';
import { createTable, dealHole, postBlinds, maybeAdvanceStreet } from '../state';

describe('raise reset across streets', () => {
  it('minRaise resets to bigBlind when advancing street', () => {
    const players = [
      { id: 'P0', name: 'A', seat: 0, stack: 1000, isHuman: true },
      { id: 'P1', name: 'B', seat: 1, stack: 1000, isHuman: false },
      { id: 'P2', name: 'C', seat: 2, stack: 1000, isHuman: false },
    ];
    let s = createTable(players, { smallBlind: 5, bigBlind: 10, seed: 'test-seed' });
    s = dealHole(s);
    s = postBlinds(s);

    // Simulate we've already reached the flop and a previous street had a big raise
    s.street = 'flop';
    s.minRaise = 1000;
    // Add a trivial CHECK action for every active player on this street so
    // maybeAdvanceStreet will allow advancing under the stricter requirement
    for (const p of s.players) {
      s.handHistory.push({ handId: s.handId, actor: p.id, street: 'flop', type: 'CHECK', ts: Date.now() });
      p.committed = 0;
    }

    const advanced = maybeAdvanceStreet(s);
    expect(advanced.street).toBe('turn');
    expect(advanced.minRaise).toBe(advanced.bigBlind);
    expect(advanced.lastAggressorIndex).toBeUndefined();
  });
});
