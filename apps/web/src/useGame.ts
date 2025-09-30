import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  createTable, dealHole, postBlinds, applyAction, maybeAdvanceStreet,
  computeLegalActions, startNextHand, type Action, type TableState
} from '@poker/engine';

function randomPick<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useGame(numBots = 2) {
  const [state, setState] = useState<TableState>(() => {
    // Build players: one human (seat 0) and `numBots` bots in seats 1..N
    const players = [{ id: 'H', name: 'You', seat: 0, stack: 10000, isHuman: true }];
    for (let i = 1; i <= numBots; i++) players.push({ id: `B${i}`, name: `Bot${i}`, seat: i, stack: 10000, isHuman: false });
  // Use a randomized seed so each session gets a shuffled deck. We still keep
  // the ability to override with an environment-like value if needed.
  const seed = (typeof window !== 'undefined' && (window as any).__SEED_OVERRIDE__) || `s-${Date.now()}-${Math.floor(Math.random()*1e9)}`;
  const s = createTable(players, { smallBlind: 50, bigBlind: 100, seed });
    return maybeAdvanceStreet(postBlinds(dealHole(s)));
  });

  const botStep = useCallback((s: TableState): TableState => {
    let next = s;
    for (let guard = 0; guard < 50; guard++) {
      if (next.street === 'showdown') break;
      const actor = next.players[next.toActIndex];
      if (!actor || actor.isHuman || actor.hasFolded || actor.allIn) break;
      const legal = computeLegalActions(next, next.toActIndex);
      if (legal.length === 0) break;
      const choice = randomPick(legal);
      if (!choice) break;
      const beforeStreet = next.street;
      next = maybeAdvanceStreet(applyAction(next, next.toActIndex, choice));
      if (next.street !== beforeStreet) break;
    }
    return next;
  }, []);

  const act = useCallback((playerIndex: number, action: Action) => {
    setState(s => {
      let next = maybeAdvanceStreet(applyAction(s, playerIndex, action));
      // let bots respond
      next = botStep(next);
      return next;
    });
  }, [botStep]);

  const legalForSeat0 = useMemo(() => computeLegalActions(state, 0), [state]);

  useEffect(() => {
    const actor = state.players[state.toActIndex];
    if (!actor || actor.isHuman || state.street === 'showdown') return;
    setState(prev => botStep(prev));
  }, [state, botStep]);

  const nextHand = useCallback(() => {
    setState(s => startNextHand(s));
  }, []);

  return { state, act, legalForSeat0, nextHand };
}