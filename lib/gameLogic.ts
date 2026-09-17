import type { GameConfig, GameMode, Player, RoomState } from "./types";
import {
  MIN_NUMBER_RANGE,
  MAX_NUMBER_RANGE,
  MIN_GRID_SIZE,
  MAX_GRID_SIZE,
  SABOTAGE_THRESHOLD_NUM,
  SABOTAGE_THRESHOLD_DEN,
} from "./types";

export function shuffledBoard(numberRange: number): number[] {
  const values = Array.from({ length: numberRange }, (_, i) => i + 1);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function makeBoards(config: GameConfig, playerIds: string[]) {
  const boards: Record<string, number[]> = {};
  for (const id of playerIds) boards[id] = shuffledBoard(config.numberRange);
  return boards;
}

export function makeGrids(config: GameConfig, playerIds: string[]) {
  const grids: Record<string, boolean[]> = {};
  for (const id of playerIds) grids[id] = new Array(config.gridSize).fill(false);
  return grids;
}

export function clampConfig(config: Partial<GameConfig>): Partial<GameConfig> {
  const clamped: Partial<GameConfig> = { ...config };
  if (typeof clamped.numberRange === "number") {
    clamped.numberRange = Math.round(
      Math.min(MAX_NUMBER_RANGE, Math.max(MIN_NUMBER_RANGE, clamped.numberRange))
    );
  }
  if (typeof clamped.gridSize === "number") {
    clamped.gridSize = Math.round(
      Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, clamped.gridSize))
    );
  }
  if (
    typeof clamped.mode === "string" &&
    !["classic", "teams", "cycle"].includes(clamped.mode)
  ) {
    delete clamped.mode;
  }
  return clamped;
}

export function assignInitialRoles(
  mode: GameMode,
  players: Player[]
): { finderIds: string[]; crosserIds: string[] } | { error: string } {
  const ids = players.map((p) => p.id);

  if (mode === "classic") {
    if (players.length !== 2) return { error: "Classic mode needs exactly 2 players" };
    const finder = ids[Math.floor(Math.random() * ids.length)];
    return { finderIds: [finder], crosserIds: ids.filter((id) => id !== finder) };
  }

  if (mode === "teams") {
    if (players.length < 2) return { error: "Need at least 2 players" };
    const teamA = players.filter((p) => p.teamId === "A").map((p) => p.id);
    const teamB = players.filter((p) => p.teamId === "B").map((p) => p.id);
    if (teamA.length === 0 || teamB.length === 0 || teamA.length + teamB.length !== players.length) {
      return { error: "Everyone must join Team A or Team B" };
    }
    return Math.random() < 0.5
      ? { finderIds: teamA, crosserIds: teamB }
      : { finderIds: teamB, crosserIds: teamA };
  }

  // cycle
  if (players.length < 2) return { error: "Need at least 2 players" };
  const finder = ids[Math.floor(Math.random() * ids.length)];
  return { finderIds: [finder], crosserIds: ids.filter((id) => id !== finder) };
}

// Called after the finding side wins a round, to assign roles for the next
// round. Cycle mode hands the finder role to whoever crossed the fewest
// squares during the round that just ended (ties broken randomly); classic
// and teams just swap the two sides wholesale.
export function advanceRound(mode: GameMode, room: RoomState): void {
  if (mode === "cycle") {
    let best: string[] = [];
    let bestDelta = Infinity;
    for (const id of room.crosserIds) {
      const crossed = room.grids[id]?.filter(Boolean).length ?? 0;
      const delta = crossed - (room.roundStartCrossed[id] ?? 0);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = [id];
      } else if (delta === bestDelta) {
        best.push(id);
      }
    }
    const nextFinder = best[Math.floor(Math.random() * best.length)] ?? room.crosserIds[0];
    room.finderIds = [nextFinder];
    room.crosserIds = room.players.map((p) => p.id).filter((id) => id !== nextFinder);
    return;
  }

  const prevFinders = room.finderIds;
  const prevCrossers = room.crosserIds;
  room.finderIds = prevCrossers;
  room.crosserIds = prevFinders;
}

export function randomizeTeamAssignment(players: Player[]): void {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  shuffled.forEach((p, i) => {
    p.teamId = i % 2 === 0 ? "A" : "B";
  });
}

// True once a crosser has crossed at least SABOTAGE_THRESHOLD_NUM/DEN of
// their grid — checked with integer math (crossed*den >= len*num) so it's
// exact regardless of grid size.
export function meetsSabotageThreshold(grid: boolean[]): boolean {
  if (grid.length === 0) return false;
  const crossed = grid.filter(Boolean).length;
  return crossed * SABOTAGE_THRESHOLD_DEN >= grid.length * SABOTAGE_THRESHOLD_NUM;
}

// A crack's radius scales in coarse tiers with grid size — a fixed radius of
// 1 would wipe out most of a small grid's progress but barely register on a
// huge one, so bigger grids get a wider blast to keep the setback meaningful.
export function sabotageRadiusFor(gridSize: number): number {
  if (gridSize <= 30) return 1;
  if (gridSize <= 150) return 2;
  return 3;
}

// Egg count scales the same way, roughly one egg per ~12 squares, clamped to
// a sane range so it's never a single lonely egg nor an overwhelming field.
export function sabotageEggCountFor(gridSize: number): number {
  return Math.min(15, Math.max(3, Math.round(gridSize / 12)));
}

// Randomly selects up to `count` of the crosser's still-empty squares to
// plant eggs on.
export function pickSabotageIndices(grid: boolean[], count: number): number[] {
  const empty: number[] = [];
  for (let i = 0; i < grid.length; i++) if (!grid[i]) empty.push(i);
  for (let i = empty.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[j]] = [empty[j], empty[i]];
  }
  return empty.slice(0, Math.min(count, empty.length));
}

// Crosses `index` (assumed to hold a live egg — always empty beforehand,
// since eggs only ever land on empty squares and an already-crossed square
// can't be clicked) and clears any already-crossed squares in a radius
// around it that scales with grid size, sending that progress back to zero.
export function applySabotageCrack(grid: boolean[], index: number): void {
  grid[index] = true;
  const radius = sabotageRadiusFor(grid.length);
  const cols = Math.ceil(Math.sqrt(grid.length));
  const row = Math.floor(index / cols);
  const col = index % cols;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || c < 0 || c >= cols) continue;
      const ni = r * cols + c;
      if (ni >= 0 && ni < grid.length) grid[ni] = false;
    }
  }
}

export function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
