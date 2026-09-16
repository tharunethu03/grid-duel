export type Phase = "lobby" | "picking" | "active" | "gameover";
export type GameMode = "classic" | "teams" | "cycle";
export type TeamId = "A" | "B";

export interface GameConfig {
  numberRange: number; // numbers 1..numberRange scattered on the board
  gridSize: number; // total squares in the crossing grid
  reshuffle: boolean; // reshuffle scattered board every round
  mode: GameMode;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  teamId?: TeamId | null;
}

export interface RoomState {
  code: string;
  players: Player[];
  config: GameConfig;
  phase: Phase;
  finderIds: string[]; // players searching for their target this round
  crosserIds: string[]; // players picking/crossing this round
  targets: Record<string, number>; // finder id -> assigned target value
  foundIds: string[]; // finder ids who've found their target this round
  roundStartCrossed: Record<string, number>; // crosser id -> crossed count when this round's countdown started
  countdownUntil: number | null; // ms epoch; while now < this, round hasn't "really" started yet
  boards: Record<string, number[]>; // playerId -> scattered numbers, a permutation of 1..numberRange
  grids: Record<string, boolean[]>; // playerId -> crossed squares
  winnerId: string | null;
  updatedAt: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  numberRange: 20,
  gridSize: 25,
  reshuffle: false,
  mode: "classic",
};

export const COUNTDOWN_MS = 3000;
// Tolerance for clock skew / network jitter between the client's local
// countdown timer and the server's wall clock, so a click made right as the
// countdown visually ends isn't rejected by the server as "too early".
export const COUNTDOWN_GRACE_MS = 400;
export const MIN_NUMBER_RANGE = 4;
export const MAX_NUMBER_RANGE = 500;
export const MIN_GRID_SIZE = 4;
export const MAX_GRID_SIZE = 500;
export const MAX_PLAYERS = 10;
