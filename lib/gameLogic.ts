import type { GameConfig } from "./types";
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
  return clamped;
}

export function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
