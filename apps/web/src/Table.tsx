import React, { useMemo, useState } from 'react';
import type { TableState, Card } from '@poker/engine';

export default function Table({ state, onAction, onNextHand, onPlaceBet }:{ state: TableState; onAction: (type: string) => void; onNextHand?: () => void; onPlaceBet?: (size: number) => void }) {
  const n = state.players.length;
  const positions = useMemo(() => seatPositions(n), [n]);
  const legalNote = `Hand ${state.handId} • ${state.street.toUpperCase()}${state.street==='showdown'?' • Showdown':''}`;
  const [betInput, setBetInput] = useState<string>('');
  const humanIndex = state.players.findIndex(p => p.isHuman) ?? 0;
  const currentHighest = Math.max(...state.players.map(pp=>pp.committed));
  const toCall = Math.max(0, currentHighest - (state.players[humanIndex]?.committed ?? 0));
  return (
    <div style={{ fontFamily:'system-ui', padding:16 }}>
      <h2 style={{ margin:'0 0 12px 0' }}>Poker Practice</h2>
      <div style={{ marginBottom:8, color:'#555' }}>{legalNote}</div>
      <div style={{ position:'relative', width:'100%', maxWidth:900, aspectRatio:'16/9', background:'#0a4d2a', borderRadius:16, margin:'0 auto', boxShadow:'0 6px 20px rgba(0,0,0,0.25)' }}>
        {/* Table felt center with board */}
        <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%, -50%)', width:'64%', height:'54%', background:'#0f6b3b', borderRadius:'50%', boxShadow:'inset 0 0 40px rgba(0,0,0,0.35)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
          <CenterActionTag state={state} />
          <Board board={state.board} />
          <div style={{ color:'#ffd66b', fontWeight:600 }}>Pot: {immediatePot(state)}</div>
        </div>
        {/* Seats around table */}
        {state.players.map((p, idx) => (
          <Seat
            key={p.id}
            x={positions[idx].x}
            y={positions[idx].y}
            isDealer={idx === state.buttonIndex}
            isToAct={idx === state.toActIndex && state.street !== 'showdown' && !p.hasFolded && !p.allIn}
            name={p.name}
            stack={p.stack}
            committed={p.committed}
            lastAction={lastActionFor(state, p.id)}
            hole={p.isHuman || state.street==='showdown' ? p.hole : undefined}
            folded={p.hasFolded}
            allIn={p.allIn}
          />
        ))}
        {state.street === 'showdown' && (
          <ShowdownOverlay state={state} onNextHand={onNextHand} />
        )}
      </div>
      <div style={{ marginTop:16, display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', alignItems:'center' }}>
        <Button variant="muted" onClick={()=>onAction('FOLD')}>Fold</Button>
        <Button variant="muted" onClick={()=>onAction('CHECK')}>Check</Button>
  <Button variant="primary" onClick={()=>onAction('CALL')}>{toCall > 0 ? `Call ${toCall}` : 'Call'}</Button>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input
            type="number"
            step={state.bigBlind}
            min={state.minRaise ?? state.bigBlind}
            value={betInput}
            onChange={e=>{
              // clamp to numeric and to min
              const raw = e.target.value;
              const n = Number(raw);
              if (Number.isNaN(n)) { setBetInput(''); return; }
              const min = state.minRaise ?? state.bigBlind;
              setBetInput(String(Math.max(n, min)));
            }}
            placeholder={`${state.bigBlind}`}
            style={{ width:100, padding:6, borderRadius:6, border:'1px solid rgba(255,255,255,0.12)', background:'#0b2f1c', color:'#fff' }}
          />
          <Button onClick={() => { const v = Number(betInput || state.bigBlind); if (onPlaceBet) onPlaceBet(v); }}>Bet</Button>
        </div>
        <Button variant="accent" onClick={()=>onAction('RAISE')}>Raise Min</Button>
      </div>
    </div>
  );
}

function Button({ children, onClick, variant='default' as 'default'|'primary'|'muted'|'accent' }:{ children: React.ReactNode; onClick?: () => void; variant?: 'default'|'primary'|'muted'|'accent' }) {
  const base: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:700 };
  const styles: Record<string, React.CSSProperties> = {
    default: { background:'#111827', color:'#e5e7eb', boxShadow:'0 4px 12px rgba(0,0,0,0.35)' },
    primary: { background:'#10b981', color:'#042f1f', boxShadow:'0 6px 18px rgba(16,185,129,0.12)' },
    muted: { background:'#374151', color:'#e5e7eb' },
    accent: { background:'#ffd66b', color:'#111' },
  };
  const style = { ...base, ...(styles[variant] || styles.default) };
  return <button style={style} onClick={onClick}>{children}</button>;
}

function Board({ board }:{ board: Card[] }) {
  return (
    <div style={{ display:'flex', gap:8 }}>
      {[0,1,2,3,4].map(i => (
        <CardView key={i} card={board[i]} faceDown={board[i] == null} />
      ))}
    </div>
  );
}

function Seat(props: {
  x: number; y: number; isDealer: boolean; isToAct: boolean;
  name: string; stack: number; committed: number; hole?: [Card, Card];
  lastAction?: string;
  folded: boolean; allIn: boolean;
}) {
  const { x, y, isDealer, isToAct, name, stack, committed, hole, lastAction, folded, allIn } = props;
  return (
    <div style={{ position:'absolute', left:`${x}%`, top:`${y}%`, transform:'translate(-50%, -50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', padding:'8px 10px', borderRadius:10, background: folded? '#2a2a2a' : '#1f2937', color:'#fff', minWidth:140, boxShadow: isToAct ? '0 0 0 3px #ffd66b' : '0 2px 8px rgba(0,0,0,0.4)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {isDealer && <div style={{ width:18, height:18, borderRadius:9, background:'#ffd66b', color:'#000', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>D</div>}
            <div style={{ fontWeight:700 }}>{name}</div>
          </div>
          <div style={{ fontVariantNumeric:'tabular-nums', opacity:0.9 }}>₵{stack}</div>
        </div>
        <div style={{ marginTop:4, fontSize:12, color:'#d1d5db' }}>
          {lastAction ? <span style={{ color:'#ffd66b' }}>{lastAction}</span> : '—'}
          <span> • Committed: {committed}</span>
          {allIn?' • ALL-IN':''}
          {folded?' • FOLDED':''}
        </div>
        <div style={{ marginTop:6, display:'flex', gap:6, justifyContent:'center' }}>
          <CardView card={hole?.[0]} faceDown={!hole} small />
          <CardView card={hole?.[1]} faceDown={!hole} small />
        </div>
      </div>
    </div>
  );
}

function CardView({ card, faceDown=false, small=false }:{ card?: Card; faceDown?: boolean; small?: boolean }) {
  const { rank, suit, color } = parseCard(card);
  const w = small ? 36 : 50;
  const h = small ? 52 : 70;
  return (
    <div style={{ width:w, height:h, borderRadius:6, background: faceDown? '#123' : '#fff', border:'1px solid rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.3)' }}>
      {!faceDown && card && (
        <div style={{ color, fontWeight:800, fontSize: small? 14 : 18, lineHeight:1 }}>
          <span>{rank}</span>
          <span style={{ marginLeft:2 }}>{suit}</span>
        </div>
      )}
    </div>
  );
}

function parseCard(card?: Card): { rank: string; suit: string; color: string } {
  if (!card) return { rank:'', suit:'', color:'#000' };
  const rank = card[0];
  const s = card[1];
  const suitMap: Record<string, { sym: string; color: string }> = {
    'c': { sym:'♣', color:'#111' },
    'd': { sym:'♦', color:'#c1121f' },
    'h': { sym:'♥', color:'#c1121f' },
    's': { sym:'♠', color:'#111' }
  };
  const info = suitMap[s] || { sym:'?', color:'#111' };
  return { rank, suit: info.sym, color: info.color };
}

function seatPositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const center = { x: 50, y: 50 };
  // radius within container percentage
  const rx = 40;
  const ry = 34;
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i * (2 * Math.PI / count));
    const x = center.x + rx * Math.cos(angle);
    const y = center.y + ry * Math.sin(angle);
    positions.push({ x, y });
  }
  return positions;
}

function immediatePot(state: TableState): number {
  const committed = state.players.reduce((a,p)=>a+p.committed,0);
  return state.pot + committed;
}

function lastActionFor(state: TableState, playerId: string): string | undefined {
  const street = state.street;
  // Find latest action on or before current street for this player
  const actions = state.handHistory
    .filter(a => a.actor === playerId && a.handId === state.handId)
    .filter(a => orderIndex(a.street) === orderIndex(street))
    .sort((a,b)=> b.ts - a.ts);
  const a = actions[0];
  if (!a) return undefined;
  if (a.type === 'CHECK') return 'Check';
  if (a.type === 'CALL') return `Call ${a.size ?? ''}`.trim();
  if (a.type === 'BET') return `Bet ${a.size ?? ''}`.trim();
  if (a.type === 'RAISE') return `Raise ${a.size ?? ''}`.trim();
  if (a.type === 'FOLD') return 'Fold';
  return a.type;
}

function orderIndex(street: TableState['street']): number {
  const order: Record<string, number> = { preflop:0, flop:1, turn:2, river:3, showdown:4 };
  return order[street] ?? 0;
}

function ShowdownOverlay({ state, onNextHand }:{ state: TableState; onNextHand?: () => void }) {
  const results = state.showdown?.results || [];
  const winners = new Set(state.showdown?.winners || []);
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.12)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'110px 0 0 0', pointerEvents:'auto' }}>
      <div style={{ background:'rgba(17,24,39,0.78)', color:'#e5e7eb', borderRadius:12, padding:16, width:520, maxWidth:'96%', boxShadow:'0 10px 30px rgba(0,0,0,0.28)', marginTop:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Showdown</div>
          <div style={{ opacity:0.8 }}>Pot {state.showdown?.totalPot ?? state.pot}</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:8 }}>
          {results
            .slice()
            .sort((a,b)=> b.payout - a.payout || b.score - a.score)
            .map(r => (
            <React.Fragment key={r.playerId}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {winners.has(r.playerId) && <span style={{ color:'#ffd66b', fontWeight:700 }}>★</span>}
                <span>Seat {r.seat}</span>
                <span style={{ opacity:0.9 }}>{state.players.find(p=>p.id===r.playerId)?.name}</span>
              </div>
              <div style={{ textAlign:'right', color:'#9ca3af' }}>{r.label}</div>
              <div style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', color: r.payout>0 ? '#34d399' : '#9ca3af' }}>{r.payout>0?`+${r.payout}`:r.payout}</div>
            </React.Fragment>
          ))}
        </div>
        {/* Next Hand button moved below modal so it doesn't overlap top player's cards */}
      </div>
      {onNextHand && (
        <div style={{ position:'absolute', left:'50%', top:'58%', transform:'translate(-50%, -50%)', pointerEvents:'auto' }}>
          <button onClick={onNextHand} style={{ padding:'8px 12px', borderRadius:8, background:'#ffd66b', color:'#111', fontWeight:700 }}>Next Hand</button>
        </div>
      )}
    </div>
  );
}

function CenterActionTag({ state }:{ state: TableState }) {
  const latest = latestAction(state);
  if (!latest) return null;
  const actor = state.players.find(p => p.id === latest.actor);
  const label = formatAction(latest);
  return (
    <div style={{ position:'absolute', top:-28, background:'rgba(17,24,39,0.9)', color:'#fff', padding:'4px 8px', borderRadius:6, fontSize:12, display:'flex', gap:8, alignItems:'center' }}>
      <span style={{ opacity:0.85 }}>{actor?.name}</span>
      <span style={{ color:'#ffd66b', fontWeight:700 }}>{label}</span>
    </div>
  );
}

function latestAction(state: TableState) {
  const targetStreet = state.street;
  const list = state.handHistory
    .filter(a => a.handId === state.handId && a.street === targetStreet)
    .sort((a,b)=> b.ts - a.ts);
  return list[0];
}

function formatAction(a: { type: string; size?: number }): string {
  if (a.type === 'CHECK') return 'Check';
  if (a.type === 'CALL') return `Call ${a.size ?? ''}`.trim();
  if (a.type === 'BET') return `Bet ${a.size ?? ''}`.trim();
  if (a.type === 'RAISE') return `Raise ${a.size ?? ''}`.trim();
  if (a.type === 'FOLD') return 'Fold';
  return a.type;
}

