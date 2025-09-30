import type { Action, TableState } from './types';

export function computeLegalActions(state: TableState, playerIndex: number): Action[] {
  const p = state.players[playerIndex];
  if (p.hasFolded || p.allIn) return [];
  // Enforce turn order
  if (playerIndex !== state.toActIndex || state.street === 'showdown') return [];
  const currentHighest = Math.max(...state.players.map(pp=>pp.committed));
  const toCall = currentHighest - p.committed;
  const actions: Action[] = [];
  if (toCall <= 0) {
    // No outstanding bet: player can check or open the betting with a BET
    actions.push({ type: 'CHECK' });
    actions.push({ type: 'BET', size: Math.max(state.bigBlind, state.minRaise) });
  } else {
    // There is an outstanding bet: player can fold, call, or raise
    actions.push({ type: 'FOLD' });
    actions.push({ type: 'CALL', size: Math.min(toCall, p.stack) });
    // Minimum raise requires at least `state.minRaise` more than currentHighest
    const minRaiseAmount = (state.minRaise ?? state.bigBlind);
    const minRaisePost = toCall + minRaiseAmount; // amount to post now (call + raise increment)
    actions.push({ type: 'RAISE', size: minRaisePost });
  }
  return actions;
}
