import type { GameConfig, GameMode, Player, RoomState } from "./types";
import {
  MIN_NUMBER_RANGE,
  MAX_NUMBER_RANGE,
  MIN_GRID_SIZE,
  MAX_GRID_SIZE,
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

export function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
