import type { GameMode } from "./types";
import {
  MIN_NUMBER_RANGE,
  MAX_NUMBER_RANGE,
  MIN_GRID_SIZE,
  MAX_GRID_SIZE,
} from "./types";

// 2 players -> Classic (the original 1v1). An even lobby of exactly 4 splits
// neatly into two teams. Everything else (odd counts, or more than 4) rotates
// the finder role fastest as Cycle.
export function recommendedMode(playerCount: number): GameMode {
  if (playerCount <= 2) return "classic";
  if (playerCount === 4) return "teams";
  return "cycle";
}

// How many players act as finders (searching for their number) and crossers
// (racing to fill their grid) at once in a given mode — used to scale board
// size so a round takes roughly as long regardless of player count.
function roleSplit(mode: GameMode, playerCount: number) {
  const n = Math.max(playerCount, 2);
  if (mode === "classic") return { finders: 1, crossers: 1 };
  if (mode === "teams") {
    const finders = Math.max(1, Math.floor(n / 2));
    return { finders, crossers: n - finders };
  }
  return { finders: 1, crossers: n - 1 }; // cycle: always a single finder
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function recommendedConfig(playerCount: number, mode: GameMode) {
  const n = Math.max(playerCount, 2);
  const { finders, crossers } = roleSplit(mode, n);

  // More simultaneous finders means the number pool is searched faster, so
  // widen it to compensate. More simultaneous crossers fill squares faster,
  // so grow the grid to match.
  const numberRange = clamp(
    roundToStep(50 + 15 * n + 15 * (finders - 1), 10),
    MIN_NUMBER_RANGE,
    MAX_NUMBER_RANGE
  );
  const gridSize = clamp(
    roundToStep(80 + 20 * n + 15 * (crossers - 1), 10),
    MIN_GRID_SIZE,
    MAX_GRID_SIZE
  );

  return { numberRange, gridSize };
}
