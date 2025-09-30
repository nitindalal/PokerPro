import React, { useCallback } from 'react';
import Table from './Table';
import Start from './Start';
import { useGame } from './useGame';

export default function App() {
  const [started, setStarted] = React.useState(false);
  const [numBots, setNumBots] = React.useState(2);

  if (!started) return <Start onStart={(n)=>{ setNumBots(n); setStarted(true); }} />;

  return <Game numBots={numBots} />;
}

function Game({ numBots }:{ numBots: number }) {
  const { state, act, legalForSeat0, nextHand } = useGame(numBots);

  const onAction = React.useCallback((type: string) => {
    const legal = legalForSeat0.find(a => a.type === (type as any));
    if (!legal) return alert('Illegal action right now');
    act(0, legal);
  }, [legalForSeat0, act]);

  const onPlaceBet = React.useCallback((size: number) => {
    // Enforce minimum raise and big blind increments
    const min = state.minRaise ?? state.bigBlind;
    if (size < min) return alert(`Minimum bet is ${min}`);
    if ((size - min) % state.bigBlind !== 0) return alert(`Bet must be in increments of big blind (${state.bigBlind})`);
    act(0, { type: 'BET', size } as any);
  }, [state, act]);

  return <Table state={state} onAction={onAction} onNextHand={nextHand} onPlaceBet={onPlaceBet} />;
}

