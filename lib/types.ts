export type Phase = "lobby" | "picking" | "active" | "gameover";
export type GameMode = "classic" | "teams" | "cycle";
export type TeamId = "A" | "B";

export interface GameConfig {
  numberRange: number; // numbers 1..numberRange scattered on the board
  gridSize: number; // total squares in the crossing grid
  reshuffle: boolean; // reshuffle scattered board every round
  sabotage: boolean; // finders can plant eggs on an ahead crosser's grid
  mode: GameMode;
}

export interface SabotageEggs {
  indices: number[]; // grid indices currently holding a live egg
  expiresAt: number; // ms epoch; eggs are inert (but not removed) after this
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
  waiting: Player[]; // joined mid-round; admitted into players once the round ends
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
  eggs: Record<string, SabotageEggs>; // crosser id -> currently-live sabotage eggs on their grid
  sabotageCooldowns: Record<string, number>; // finder id -> ms epoch when they can sabotage again
  winnerId: string | null;
  expiresAt: number; // ms epoch; room is deleted here unless a round is live (see roomStore.saveRoom)
  updatedAt: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  numberRange: 20,
  gridSize: 25,
  reshuffle: false,
  sabotage: false,
  mode: "classic",
};

export const ROOM_LIFETIME_MS = 90 * 60 * 1000; // 1.5 hours
export const COUNTDOWN_MS = 3000;
// A crosser becomes sabotage-able once they've crossed this fraction of
// their grid (checked as crossed*3 >= gridSize*2 to stay integer-exact).
export const SABOTAGE_THRESHOLD_NUM = 2;
export const SABOTAGE_THRESHOLD_DEN = 3;
export const SABOTAGE_EGG_DURATION_MS = 5000;
export const SABOTAGE_COOLDOWN_MS = 30000;
// Tolerance for clock skew / network jitter between the client's local
// countdown timer and the server's wall clock, so a click made right as the
// countdown visually ends isn't rejected by the server as "too early".
export const COUNTDOWN_GRACE_MS = 400;
export const MIN_NUMBER_RANGE = 4;
export const MAX_NUMBER_RANGE = 500;
export const MIN_GRID_SIZE = 4;
export const MAX_GRID_SIZE = 500;
export const MAX_PLAYERS = 10;
