import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  createTable, dealHole, postBlinds, applyAction, maybeAdvanceStreet,
  computeLegalActions, startNextHand, type Action, type TableState
} from '@poker/engine';

function randomPick<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useGame() {
  const [state, setState] = useState<TableState>(() => {
    const s = createTable([
      { id:'H', name:'You', seat:0, stack:10000, isHuman:true },
      { id:'B1', name:'Bot1', seat:1, stack:10000, isHuman:false },
      { id:'B2', name:'Bot2', seat:2, stack:10000, isHuman:false }
    ], { smallBlind:50, bigBlind:100, seed:'demo' });
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