import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server, Socket } from "socket.io";
import { customAlphabet } from "nanoid";
import type { GameConfig, RoomState, Player } from "./lib/types";
import { DEFAULT_CONFIG } from "./lib/types";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

interface Room extends RoomState {
  sockets: Record<string, string>; // playerId -> socketId
}

const rooms = new Map<string, Room>();

function shuffledBoard(numberRange: number): number[] {
  const values = Array.from({ length: numberRange }, (_, i) => i + 1);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

const MIN_NUMBER_RANGE = 4;
const MAX_NUMBER_RANGE = 500;
const MIN_GRID_SIZE = 4;
const MAX_GRID_SIZE = 500;

function clampConfig(config: Partial<GameConfig>): Partial<GameConfig> {
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

function makeBoards(config: GameConfig, playerIds: string[]) {
  const boards: Record<string, number[]> = {};
  for (const id of playerIds) {
    boards[id] = shuffledBoard(config.numberRange);
  }
  return boards;
}

function makeGrids(config: GameConfig, playerIds: string[]) {
  const grids: Record<string, boolean[]> = {};
  for (const id of playerIds) {
    grids[id] = new Array(config.gridSize).fill(false);
  }
  return grids;
}

function publicState(room: Room): RoomState {
  const { sockets: _sockets, ...state } = room;
  return state;
}

function broadcast(io: Server, room: Room) {
  io.to(room.code).emit("room-state", publicState(room));
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer);

  io.on("connection", (socket: Socket) => {
    socket.on("create-room", ({ name }: { name: string }, ack: Function) => {
      const code = makeCode();
      const playerId = socket.id;
      const player: Player = { id: playerId, name: name?.trim() || "Player 1", isHost: true };
      const room: Room = {
        code,
        players: [player],
        config: { ...DEFAULT_CONFIG },
        phase: "lobby",
        runnerId: null,
        seekerId: null,
        target: null,
        boards: {},
        grids: {},
        winnerId: null,
        sockets: { [playerId]: socket.id },
      };
      rooms.set(code, room);
      socket.join(code);
      socket.data.roomCode = code;
      socket.data.playerId = playerId;
      ack({ ok: true, code, playerId });
      broadcast(io, room);
    });

    socket.on(
      "join-room",
      ({ code, name }: { code: string; name: string }, ack: Function) => {
        const room = rooms.get(code?.toUpperCase());
        if (!room) return ack({ ok: false, error: "Room not found" });
        if (room.players.length >= 2)
          return ack({ ok: false, error: "Room is full" });

        const playerId = socket.id;
        const player: Player = {
          id: playerId,
          name: name?.trim() || "Player 2",
          isHost: false,
        };
        room.players.push(player);
        room.sockets[playerId] = socket.id;
        socket.join(room.code);
        socket.data.roomCode = room.code;
        socket.data.playerId = playerId;
        ack({ ok: true, code: room.code, playerId });
        broadcast(io, room);
      }
    );

    socket.on("update-config", (config: Partial<GameConfig>) => {
      const room = getRoom(socket);
      if (!room || room.phase !== "lobby") return;
      const player = room.players.find((p) => p.id === socket.data.playerId);
      if (!player?.isHost) return;
      room.config = { ...room.config, ...clampConfig(config) };
      broadcast(io, room);
    });

    socket.on("start-game", () => {
      const room = getRoom(socket);
      if (!room || room.phase !== "lobby") return;
      const player = room.players.find((p) => p.id === socket.data.playerId);
      if (!player?.isHost || room.players.length !== 2) return;

      const ids = room.players.map((p) => p.id);
      room.boards = makeBoards(room.config, ids);
      room.grids = makeGrids(room.config, ids);
      room.winnerId = null;
      room.target = null;
      const first = ids[Math.floor(Math.random() * ids.length)];
      room.runnerId = first;
      room.seekerId = ids.find((id) => id !== first) || null;
      room.phase = "picking";
      broadcast(io, room);
    });

    socket.on("pick-number", (value: number) => {
      const room = getRoom(socket);
      if (!room || room.phase !== "picking" || !room.runnerId) return;
      if (socket.data.playerId !== room.runnerId) return;
      const board = room.boards[room.runnerId];
      if (!board || !board.includes(value)) return;

      room.target = value;
      room.phase = "countdown";
      broadcast(io, room);

      setTimeout(() => {
        const r = rooms.get(room.code);
        if (!r || r.phase !== "countdown") return;
        r.phase = "active";
        broadcast(io, r);
      }, 3000);
    });

    socket.on("cross-square", (index: number) => {
      const room = getRoom(socket);
      if (!room || room.phase !== "active") return;
      const runnerId = room.runnerId;
      if (!runnerId || socket.data.playerId !== runnerId) return;
      const grid = room.grids[runnerId];
      if (!grid || index < 0 || index >= grid.length || grid[index]) return;

      grid[index] = true;
      if (grid.every(Boolean)) {
        room.phase = "gameover";
        room.winnerId = runnerId;
      }
      broadcast(io, room);
    });

    socket.on("found-number", () => {
      const room = getRoom(socket);
      if (!room || room.phase !== "active") return;
      if (socket.data.playerId !== room.seekerId) return;

      const oldRunner = room.runnerId;
      const oldSeeker = room.seekerId;
      room.runnerId = oldSeeker;
      room.seekerId = oldRunner;
      room.target = null;
      room.phase = "picking";

      if (room.config.reshuffle) {
        room.boards = makeBoards(room.config, room.players.map((p) => p.id));
      }
      broadcast(io, room);
    });

    socket.on("play-again", () => {
      const room = getRoom(socket);
      if (!room || room.phase !== "gameover") return;
      const player = room.players.find((p) => p.id === socket.data.playerId);
      if (!player?.isHost) return;
      room.phase = "lobby";
      room.runnerId = null;
      room.seekerId = null;
      room.target = null;
      room.winnerId = null;
      broadcast(io, room);
    });

    socket.on("leave-room", () => leaveRoom(socket));
    socket.on("disconnect", () => leaveRoom(socket));

    function leaveRoom(s: Socket) {
      const code = s.data.roomCode as string | undefined;
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      room.players = room.players.filter((p) => p.id !== s.data.playerId);
      if (room.players.length === 0) {
        rooms.delete(code);
        return;
      }
      if (!room.players.some((p) => p.isHost)) room.players[0].isHost = true;
      room.phase = "lobby";
      room.runnerId = null;
      room.seekerId = null;
      room.target = null;
      broadcast(io, room);
    }
  });

  function getRoom(s: Socket): Room | undefined {
    const code = s.data.roomCode as string | undefined;
    if (!code) return undefined;
    return rooms.get(code);
  }

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
