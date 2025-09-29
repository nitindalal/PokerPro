import React, { useCallback } from 'react';
import Table from './Table';
import { useGame } from './useGame';

export default function App() {
  const { state, act, legalForSeat0, nextHand } = useGame();

  const onAction = useCallback((type: string) => {
    const legal = legalForSeat0.find(a => a.type === (type as any));
    if (!legal) return alert('Illegal action right now');
    act(0, legal);
  }, [legalForSeat0, act]);

  return <Table state={state} onAction={onAction} onNextHand={nextHand} />;
}

