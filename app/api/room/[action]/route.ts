import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { getRoom, saveRoom, deleteRoom } from "@/lib/roomStore";
import { makeBoards, makeGrids, clampConfig, makeRoomCode } from "@/lib/gameLogic";
import { COUNTDOWN_MS, DEFAULT_CONFIG, RoomState, Player } from "@/lib/types";

const genId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function loadAndAuthorize(
  body: Record<string, unknown>
): Promise<{ room?: RoomState; player?: Player; error?: string }> {
  const code = String(body.code || "").toUpperCase();
  const playerId = String(body.playerId || "");
  const room = await getRoom(code);
  if (!room) return { error: "Room not found" };
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Not in this room" };
  return { room, player };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  if (action !== "state") return bad("Unknown action", 404);
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return bad("Missing code");
  const room = await getRoom(code);
  if (!room) return bad("Room not found", 404);
  return NextResponse.json({ ok: true, room });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  switch (action) {
    case "create": {
      const name = String(body.name || "Player 1").slice(0, 20);
      let code = makeRoomCode();
      for (let i = 0; i < 5 && (await getRoom(code)); i++) code = makeRoomCode();
      const playerId = genId();
      const room: RoomState = {
        code,
        players: [{ id: playerId, name, isHost: true }],
        config: { ...DEFAULT_CONFIG },
        phase: "lobby",
        runnerId: null,
        seekerId: null,
        target: null,
        countdownUntil: null,
        boards: {},
        grids: {},
        winnerId: null,
        updatedAt: Date.now(),
      };
      await saveRoom(room);
      return NextResponse.json({ ok: true, code, playerId });
    }

    case "join": {
      const code = String(body.code || "").toUpperCase();
      const name = String(body.name || "Player 2").slice(0, 20);
      const room = await getRoom(code);
      if (!room) return bad("Room not found", 404);
      if (room.players.length >= 2) return bad("Room is full");
      const playerId = genId();
      room.players.push({ id: playerId, name, isHost: false });
      await saveRoom(room);
      return NextResponse.json({ ok: true, code, playerId });
    }

    case "config": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "lobby") return bad("Game already started");
      if (!player.isHost) return bad("Only host can change settings", 403);
      room.config = {
        ...room.config,
        ...clampConfig((body.config as object) || {}),
      };
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "start": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "lobby") return bad("Game already started");
      if (!player.isHost) return bad("Only host can start", 403);
      if (room.players.length !== 2) return bad("Need 2 players");

      const ids = room.players.map((p) => p.id);
      room.boards = makeBoards(room.config, ids);
      room.grids = makeGrids(room.config, ids);
      room.winnerId = null;
      room.target = null;
      room.countdownUntil = null;
      const first = ids[Math.floor(Math.random() * ids.length)];
      room.runnerId = first;
      room.seekerId = ids.find((id) => id !== first) ?? null;
      room.phase = "picking";
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "pick": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "picking") return bad("Not picking phase");
      if (room.runnerId !== player.id) return bad("Not your turn", 403);
      const value = Number(body.value);
      const board = room.boards[player.id];
      if (!board || !board.includes(value)) return bad("Invalid number");
      room.target = value;
      room.phase = "active";
      room.countdownUntil = Date.now() + COUNTDOWN_MS;
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "cross": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "active") return bad("Not active");
      if (room.runnerId !== player.id) return bad("Not your turn", 403);
      if (!room.countdownUntil || Date.now() < room.countdownUntil)
        return bad("Wait for countdown");
      const index = Number(body.index);
      const grid = room.grids[player.id];
      if (!grid || index < 0 || index >= grid.length || grid[index])
        return bad("Invalid square");
      grid[index] = true;
      if (grid.every(Boolean)) {
        room.phase = "gameover";
        room.winnerId = player.id;
      }
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "found": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "active") return bad("Not active");
      if (room.seekerId !== player.id) return bad("Not your turn", 403);
      if (!room.countdownUntil || Date.now() < room.countdownUntil)
        return bad("Wait for countdown");

      const oldRunner = room.runnerId;
      const oldSeeker = room.seekerId;
      room.runnerId = oldSeeker;
      room.seekerId = oldRunner;
      room.target = null;
      room.countdownUntil = null;
      room.phase = "picking";
      if (room.config.reshuffle) {
        room.boards = makeBoards(
          room.config,
          room.players.map((p) => p.id)
        );
      }
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "play-again": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "gameover") return bad("Game not over");
      if (!player.isHost) return bad("Only host can restart", 403);
      room.phase = "lobby";
      room.runnerId = null;
      room.seekerId = null;
      room.target = null;
      room.countdownUntil = null;
      room.winnerId = null;
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "leave": {
      const code = String(body.code || "").toUpperCase();
      const playerId = String(body.playerId || "");
      const room = await getRoom(code);
      if (!room) return NextResponse.json({ ok: true });
      room.players = room.players.filter((p) => p.id !== playerId);
      if (room.players.length === 0) {
        await deleteRoom(code);
        return NextResponse.json({ ok: true });
      }
      if (!room.players.some((p) => p.isHost)) room.players[0].isHost = true;
      room.phase = "lobby";
      room.runnerId = null;
      room.seekerId = null;
      room.target = null;
      room.countdownUntil = null;
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    default:
      return bad("Unknown action", 404);
  }
}
