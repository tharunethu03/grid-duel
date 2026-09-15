export type Phase = "lobby" | "picking" | "countdown" | "active" | "gameover";

export interface GameConfig {
  numberRange: number; // numbers 1..numberRange scattered on the board
  gridSize: number; // total squares in the crossing grid
  reshuffle: boolean; // reshuffle scattered board every round
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export interface RoomState {
  code: string;
  players: Player[];
  config: GameConfig;
  phase: Phase;
  runnerId: string | null;
  seekerId: string | null;
  target: number | null;
  boards: Record<string, number[]>; // playerId -> scattered numbers (0 = empty cell)
  grids: Record<string, boolean[]>; // playerId -> crossed squares
  winnerId: string | null;
}

export const DEFAULT_CONFIG: GameConfig = {
  numberRange: 20,
  gridSize: 25,
  reshuffle: false,
};
