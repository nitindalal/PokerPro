export interface Rules {
  minPlayers: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  allowSidePots: boolean;
}

export const DEFAULT_RULES: Rules = {
  minPlayers: 2,
  maxPlayers: 9,
  smallBlind: 50,
  bigBlind: 100,
  allowSidePots: false
};
