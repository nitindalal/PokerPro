import type { Action, TableState } from './types';

export function computeLegalActions(state: TableState, playerIndex: number): Action[] {
  const p = state.players[playerIndex];
  if (p.hasFolded || p.allIn) return [];
  // Enforce turn order
  if (playerIndex !== state.toActIndex || state.street === 'showdown') return [];
  const toCall = Math.max(...state.players.map(pp=>pp.committed)) - p.committed;
  const actions: Action[] = [];
  if (toCall <= 0) actions.push({type:'CHECK'});
  else actions.push({type:'FOLD'}, {type:'CALL'});
  // Simple sizing for v1; UI can present presets
  actions.push({type:'BET', size: state.bigBlind});
  actions.push({type:'RAISE', size: Math.max(state.minRaise, state.bigBlind)});
  return actions;
}
