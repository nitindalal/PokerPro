export type Suit = 'c'|'d'|'h'|'s';
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A';
export type Card = `${Rank}${Suit}`;

export type Street = 'preflop'|'flop'|'turn'|'river'|'showdown';
export type ActionType = 'FOLD'|'CHECK'|'CALL'|'BET'|'RAISE';

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  seat: number;
  stack: number;       // chips remaining
  isHuman: boolean;
  hasFolded: boolean;
  allIn: boolean;
  committed: number;   // this round only
  hole?: [Card, Card];
}

export interface ActionRecord {
  handId: number;
  actor: PlayerId;
  street: Street;
  type: ActionType;
  size?: number;
  ts: number;
}

export interface TableState {
  handId: number;
  players: Player[];          // seating order 0..n-1
  buttonIndex: number;
  smallBlind: number;
  bigBlind: number;
  pot: number;
  sidePots: { amount: number; eligible: Set<PlayerId> }[];
  board: Card[];              // 0..5
  deck: Card[];               // remaining deck top at end
  street: Street;
  toActIndex: number;         // whose turn in seating order
  minRaise: number;           // tracks legal min raise
  lastAggressorIndex?: number;
  handHistory: ActionRecord[];
  rngSeed: string;
  showdown?: {
    results: Array<{ playerId: PlayerId; seat: number; score: number; label: string; payout: number }>;
    winners: PlayerId[];
    totalPot: number;
  };
}

export interface PublicStateView extends Omit<TableState, 'deck'> {
  players: Array<Omit<Player, 'hole'> & { hole?: [Card, Card] | undefined }>; // hole hidden for others at UI layer
}

export interface Action {
  type: ActionType;
  size?: number;
}
