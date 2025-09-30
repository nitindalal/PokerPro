import type { Action, Card, Player, TableState } from './types';
import { makeShuffledDeck } from './deck';
import { rank7, label7 } from './evaluate';

export function createTable(players: Omit<Player, 'hasFolded'|'allIn'|'committed'|'hole'>[], opts: {
  smallBlind: number; bigBlind: number; buttonIndex?: number; seed?: string;
}): TableState {
  if (players.length < 2) throw new Error('Need at least 2 players');
  const seed = opts.seed ?? '12345';
  const deck = makeShuffledDeck(hashSeed(seed));
  const enriched: Player[] = players.map(p => ({...p, hasFolded:false, allIn:false, committed:0 }));
  return {
    handId: 1,
    players: enriched,
    buttonIndex: opts.buttonIndex ?? 0,
    smallBlind: opts.smallBlind,
    bigBlind: opts.bigBlind,
    pot: 0,
    sidePots: [],
    board: [],
    deck,
    street: 'preflop',
    toActIndex: nextToActIndex(enriched, (opts.buttonIndex ?? 0) + 3),
    minRaise: opts.bigBlind,
    handHistory: [],
    rngSeed: seed,
  };
}

export function dealHole(state: TableState): TableState {
  const s = clone(state);
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < s.players.length; i++) {
      const p = s.players[i];
      if (!p.hasFolded) {
        p.hole = p.hole ?? [take(s), take(s)] as [Card, Card];
      }
    }
  }
  return s;
}

export function postBlinds(state: TableState): TableState {
  const s = clone(state);
  const sb = (state.buttonIndex + 1) % s.players.length;
  const bb = (state.buttonIndex + 2) % s.players.length;
  postBet(s, sb, s.smallBlind);
  s.handHistory.push({ handId: s.handId, actor: s.players[sb].id, street: s.street, type: 'BET', size: s.smallBlind, ts: Date.now() });
  postBet(s, bb, s.bigBlind);
  s.handHistory.push({ handId: s.handId, actor: s.players[bb].id, street: s.street, type: 'BET', size: s.bigBlind, ts: Date.now() });
  s.toActIndex = nextActiveIndex(s, bb + 1);
  s.minRaise = s.bigBlind;
  return s;
}

export function applyAction(state: TableState, playerIndex: number, action: Action): TableState {
  // Minimal action application; expand with betting logic.
  const s = clone(state);
  const p = s.players[playerIndex];
  if (p.hasFolded || p.allIn) return s;
  if (playerIndex !== s.toActIndex) return s;
  if (action.type === 'FOLD') { p.hasFolded = true; s.handHistory.push({ handId: s.handId, actor: p.id, street: s.street, type: 'FOLD', ts: Date.now() }); s.toActIndex = nextActiveIndex(s, playerIndex + 1); return s; }
  if (action.type === 'CHECK') {
    s.handHistory.push({ handId: s.handId, actor: p.id, street: s.street, type: 'CHECK', ts: Date.now() });
    s.toActIndex = nextActiveIndex(s, playerIndex + 1);
    return s;
  }
  if (action.type === 'CALL') {
    const toCall = maxCommitted(s) - p.committed;
    if (toCall <= 0) {
      // Nothing to call; treat as CHECK
      s.handHistory.push({ handId: s.handId, actor: p.id, street: s.street, type: 'CHECK', ts: Date.now() });
      s.toActIndex = nextActiveIndex(s, playerIndex + 1);
      return s;
    }
    const size = Math.min(toCall, p.stack);
    postBet(s, playerIndex, size);
    s.handHistory.push({ handId: s.handId, actor: p.id, street: s.street, type: 'CALL', size, ts: Date.now() });
    s.toActIndex = nextActiveIndex(s, playerIndex + 1);
    return s;
  }
  if (action.type === 'BET' || action.type === 'RAISE') {
    const size = action.size ?? 0;
    if (size <= 0) throw new Error('Invalid bet/raise size');
    const currentHighest = Math.max(...s.players.map(pp=>pp.committed));
    const toCall = currentHighest - p.committed;
    if (toCall <= 0) {
      // This is a BET (opening the round)
      // Enforce size at least bigBlind
      if (size < s.bigBlind) throw new Error('Bet size below big blind');
      postBet(s, playerIndex, size);
      s.minRaise = Math.max(s.minRaise, size);
      s.handHistory.push({ handId: s.handId, actor: p.id, street: s.street, type: 'BET', size, ts: Date.now() });
      s.toActIndex = nextActiveIndex(s, playerIndex + 1);
      return s;
    } else {
      // This is a RAISE: player must at least call then add raise increment
      const minRaiseAmount = s.minRaise ?? s.bigBlind;
      const required = toCall + minRaiseAmount;
      if (size < required) throw new Error('Raise size below minimum');
      postBet(s, playerIndex, size);
      // Update minRaise to the increment amount (size - toCall)
      s.minRaise = Math.max(s.minRaise, size - toCall);
      s.handHistory.push({ handId: s.handId, actor: p.id, street: s.street, type: 'RAISE', size, ts: Date.now() });
      s.toActIndex = nextActiveIndex(s, playerIndex + 1);
      return s;
    }
  }
  return s;
}

export function maybeAdvanceStreet(state: TableState): TableState {
  const s = clone(state);
  // End betting round when either only one non-folded remains or all stacks equalized (or all-in)
  const active = s.players.filter(p => !p.hasFolded);
  if (active.length <= 1) { return showdown(s); }
  const equalized = s.players.every(p => p.hasFolded || p.allIn || p.committed === maxCommitted(s));
  if (!equalized) return s;
  // Require that each active (not folded, not all-in) player has at least one
  // action recorded on this street before auto-advancing. This ensures that
  // players get an opportunity to 'check' if there is no outstanding bet.
  // Exceptions: if all active players are all-in (no actions possible) or
  // only one active player remains (handled above as showdown).
  const activePlayers = s.players.filter(p => !p.hasFolded);
  const allActiveAllIn = activePlayers.length > 0 && activePlayers.every(p => p.allIn);
  if (!allActiveAllIn) {
    const actorsWithActions = new Set(s.handHistory
      .filter(a => a.handId === s.handId && a.street === s.street)
      .map(a => a.actor));
    const requiredActors = activePlayers.filter(p => !p.allIn).map(p => p.id);
    const allHaveActed = requiredActors.every(id => actorsWithActions.has(id));
    if (!allHaveActed) return s;
  }
  // Move committed to pot, reset committed, deal board cards
  const roundSum = s.players.reduce((a,p)=>a+p.committed,0);
  s.pot += roundSum; s.players.forEach(p=>p.committed=0);
  // Reset per-round raise tracking when we move to the next betting round.
  // Without this, a large raise on one street can force subsequent streets to
  // require that same large amount to open (because computeLegalActions uses
  // Math.max(bigBlind, minRaise) when offering a BET). Resetting to the
  // big blind implements the typical behaviour where each betting round
  // starts with a minimum bet equal to the big blind.
  if (s.street === 'preflop') { s.board.push(take(s), take(s), take(s)); s.street = 'flop'; s.toActIndex = firstToActPostflop(s); s.minRaise = s.bigBlind; s.lastAggressorIndex = undefined; }
  else if (s.street === 'flop') { s.board.push(take(s)); s.street = 'turn'; s.toActIndex = firstToActPostflop(s); s.minRaise = s.bigBlind; s.lastAggressorIndex = undefined; }
  else if (s.street === 'turn') { s.board.push(take(s)); s.street = 'river'; s.toActIndex = firstToActPostflop(s); s.minRaise = s.bigBlind; s.lastAggressorIndex = undefined; }
  else if (s.street === 'river') { return showdown(s); }
  return s;
}

export function showdown(state: TableState): TableState {
  // Evaluate hands of active players, distribute pot (no side-pots yet), and mark showdown
  const s = clone(state);
  const total = s.pot + s.players.reduce((a,p)=>a+p.committed,0);
  // Move any remaining committed into pot to finalize
  s.pot = total;
  s.players.forEach(p=>p.committed=0);

  const activeIndexes = s.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.hasFolded);

  if (activeIndexes.length === 0) {
    // Edge case: everyone folded? Should be handled earlier, but just in case, leave pot as is
    s.street = 'showdown';
    return s;
  }

  // Rank hands; players without hole cards get lowest score
  const scored = activeIndexes.map(({ p, i }) => ({
    index: i,
    playerId: p.id,
    seat: p.seat,
    score: p.hole ? rank7(p.hole, s.board) : -Infinity,
    label: label7(p.hole, s.board)
  }));
  const maxScore = Math.max(...scored.map(x => x.score));
  const winners = scored.filter(x => x.score === maxScore).map(x => x.index);

  if (s.pot > 0) {
    const baseShare = Math.floor(s.pot / winners.length);
    let remainder = s.pot % winners.length;
    // Payout base share to all winners
    for (const wi of winners) { s.players[wi].stack += baseShare; }
    // Distribute remainder by seat order among winners
    const sortedWinners = [...winners].sort((a,b)=>a-b);
    for (let k = 0; k < remainder; k++) {
      s.players[sortedWinners[k]].stack += 1;
    }
  }

  const payoutsMap = new Map<number, number>();
  for (let i = 0; i < s.players.length; i++) payoutsMap.set(i, 0);
  // We derived payouts by comparing stacks before and after is complex, so compute from shares directly
  if (total > 0) {
    const baseShare = Math.floor(total / winners.length);
    let remainder = total % winners.length;
    const sortedWinners = [...winners].sort((a,b)=>a-b);
    for (const wi of winners) payoutsMap.set(wi, (payoutsMap.get(wi) || 0) + baseShare);
    for (let k = 0; k < remainder; k++) payoutsMap.set(sortedWinners[k], (payoutsMap.get(sortedWinners[k]) || 0) + 1);
  }

  s.showdown = {
    results: scored.map(r => ({ playerId: r.playerId, seat: r.seat, score: r.score, label: r.label, payout: payoutsMap.get(r.index) || 0 })),
    winners: winners.map(wi => s.players[wi].id),
    totalPot: total
  };

  s.pot = 0;
  s.street = 'showdown';
  return s;
}

export function startNextHand(state: TableState): TableState {
  // Prepare next hand: rotate button, reset flags, new deck, deal hole, post blinds
  const s = clone(state);
  // Ensure pot and commitments are cleared after showdown
  s.pot = 0;
  s.players.forEach(p => { p.committed = 0; p.allIn = false; p.hasFolded = false; p.hole = undefined; });
  s.board = [];
  s.sidePots = [];
  s.handId = s.handId + 1;
  s.buttonIndex = (s.buttonIndex + 1) % s.players.length;
  // Derive a new seed deterministically from prior seed + handId
  const newSeed = `${s.rngSeed}-${s.handId}`;
  s.rngSeed = newSeed;
  s.deck = makeShuffledDeck(hashSeed(newSeed));
  s.street = 'preflop';
  s.toActIndex = nextToActIndex(s.players, s.buttonIndex + 3);
  s.minRaise = s.bigBlind;
  // Deal and post blinds, and advance to flop if equalized
  const afterDeal = dealHole(s);
  const afterBlinds = postBlinds(afterDeal);
  return maybeAdvanceStreet(afterBlinds);
}

// Helpers
function clone<T>(x: T): T { return structuredClone(x); }
function take(s: TableState): Card { const c = s.deck.pop(); if (!c) throw new Error('Deck empty'); return c; }
function maxCommitted(s: TableState): number { return Math.max(...s.players.map(p=>p.committed)); }
function nextToActIndex(players: Player[], start: number): number { return start % players.length; }
function nextActiveIndex(s: TableState, start: number): number {
  const n = s.players.length;
  for (let k = 0; k < n; k++) {
    const idx = (start + k) % n;
    const p = s.players[idx];
    if (!p.hasFolded && !p.allIn) return idx;
  }
  return s.toActIndex;
}

function firstToActPostflop(s: TableState): number {
  // First active player to left of the dealer (buttonIndex + 1)
  const start = (s.buttonIndex + 1) % s.players.length;
  return nextActiveIndex(s, start);
}
function postBet(s: TableState, idx: number, size: number) {
  const p = s.players[idx];
  if (size >= p.stack) { p.committed += p.stack; p.stack = 0; p.allIn = true; }
  else { p.committed += size; p.stack -= size; }
}
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i=0;i<seed.length;i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 0xFFFFFFFF;
}
