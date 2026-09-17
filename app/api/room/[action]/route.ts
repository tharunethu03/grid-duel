import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { getRoom, saveRoom, deleteRoom } from "@/lib/roomStore";
import {
  makeBoards,
  makeGrids,
  clampConfig,
  makeRoomCode,
  assignInitialRoles,
  advanceRound,
  randomizeTeamAssignment,
  meetsSabotageThreshold,
  pickSabotageIndices,
  applySabotageCrack,
  sabotageEggCountFor,
} from "@/lib/gameLogic";
import {
  COUNTDOWN_MS,
  COUNTDOWN_GRACE_MS,
  DEFAULT_CONFIG,
  MAX_PLAYERS,
  ROOM_LIFETIME_MS,
  SABOTAGE_EGG_DURATION_MS,
  SABOTAGE_COOLDOWN_MS,
  RoomState,
  Player,
  TeamId,
} from "@/lib/types";

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

function resetRound(room: RoomState) {
  room.phase = "lobby";
  room.finderIds = [];
  room.crosserIds = [];
  room.targets = {};
  room.foundIds = [];
  room.roundStartCrossed = {};
  room.countdownUntil = null;
  room.eggs = {};
  room.sabotageCooldowns = {};
}

function admitWaitlist(room: RoomState) {
  if (room.waiting.length === 0) return;
  room.players.push(...room.waiting);
  room.waiting = [];
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
        players: [{ id: playerId, name, isHost: true, teamId: null }],
        waiting: [],
        config: { ...DEFAULT_CONFIG },
        phase: "lobby",
        finderIds: [],
        crosserIds: [],
        targets: {},
        foundIds: [],
        roundStartCrossed: {},
        countdownUntil: null,
        boards: {},
        grids: {},
        eggs: {},
        sabotageCooldowns: {},
        winnerId: null,
        expiresAt: Date.now() + ROOM_LIFETIME_MS,
        updatedAt: Date.now(),
      };
      await saveRoom(room);
      return NextResponse.json({ ok: true, code, playerId });
    }

    case "join": {
      const code = String(body.code || "").toUpperCase();
      const name = String(body.name || "Player").slice(0, 20);
      const room = await getRoom(code);
      if (!room) return bad("Room not found", 404);
      if (room.players.length + room.waiting.length >= MAX_PLAYERS) {
        return bad("Room is full");
      }
      const playerId = genId();
      const player: Player = { id: playerId, name, isHost: false, teamId: null };
      // A round in progress can't take new players mid-round; queue them
      // instead and admit them once the round ends (see admitWaitlist).
      const roundLive = room.phase === "picking" || room.phase === "active";
      if (roundLive) room.waiting.push(player);
      else room.players.push(player);
      await saveRoom(room);
      return NextResponse.json({ ok: true, code, playerId, waiting: roundLive });
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

    case "team": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "lobby") return bad("Game already started");
      const teamId = body.teamId as TeamId | null;
      if (teamId !== "A" && teamId !== "B" && teamId !== null) {
        return bad("Invalid team");
      }
      const forId = body.forId ? String(body.forId) : player.id;
      if (forId !== player.id && !player.isHost) {
        return bad("Only host can move other players", 403);
      }
      const target = room.players.find((p) => p.id === forId);
      if (!target) return bad("Player not found", 404);
      target.teamId = teamId;
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "randomize-teams": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "lobby") return bad("Game already started");
      if (!player.isHost) return bad("Only host can randomize teams", 403);
      randomizeTeamAssignment(room.players);
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "start": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "lobby") return bad("Game already started");
      if (!player.isHost) return bad("Only host can start", 403);

      const roles = assignInitialRoles(room.config.mode, room.players);
      if ("error" in roles) return bad(roles.error);

      const ids = room.players.map((p) => p.id);
      room.boards = makeBoards(room.config, ids);
      room.grids = makeGrids(room.config, ids);
      room.winnerId = null;
      room.targets = {};
      room.foundIds = [];
      room.roundStartCrossed = {};
      room.countdownUntil = null;
      room.finderIds = roles.finderIds;
      room.crosserIds = roles.crosserIds;
      room.phase = "picking";
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "pick": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "picking") return bad("Not picking phase");
      if (!room.crosserIds.includes(player.id)) return bad("Not your turn", 403);
      const value = Number(body.value);
      const forId = String(body.forId || "");
      const board = room.boards[player.id];
      if (!board || !board.includes(value)) return bad("Invalid number");
      if (!room.finderIds.includes(forId) || room.targets[forId] !== undefined) {
        return bad("Invalid target");
      }
      room.targets[forId] = value;
      if (room.finderIds.every((id) => room.targets[id] !== undefined)) {
        room.phase = "active";
        room.countdownUntil = Date.now() + COUNTDOWN_MS;
        for (const id of room.crosserIds) {
          room.roundStartCrossed[id] = room.grids[id]?.filter(Boolean).length ?? 0;
        }
      }
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "cross": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "active") return bad("Not active");
      if (!room.crosserIds.includes(player.id)) return bad("Not your turn", 403);
      if (!room.countdownUntil || Date.now() < room.countdownUntil - COUNTDOWN_GRACE_MS)
        return bad("Wait for countdown");
      const index = Number(body.index);
      const grid = room.grids[player.id];
      if (!grid || index < 0 || index >= grid.length || grid[index])
        return bad("Invalid square");

      const egg = room.eggs[player.id];
      const hitEgg = !!egg && egg.expiresAt > Date.now() && egg.indices.includes(index);
      if (hitEgg && egg) {
        applySabotageCrack(grid, index);
        const remaining = egg.indices.filter((i) => i !== index);
        if (remaining.length > 0) {
          room.eggs[player.id] = { indices: remaining, expiresAt: egg.expiresAt };
        } else {
          delete room.eggs[player.id];
        }
      } else {
        grid[index] = true;
      }

      if (grid.every(Boolean)) {
        room.phase = "gameover";
        room.winnerId = player.id;
        admitWaitlist(room);
      }
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "found": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "active") return bad("Not active");
      if (!room.finderIds.includes(player.id)) return bad("Not your turn", 403);
      if (!room.countdownUntil || Date.now() < room.countdownUntil - COUNTDOWN_GRACE_MS)
        return bad("Wait for countdown");
      if (room.foundIds.includes(player.id)) return bad("Already found");

      room.foundIds.push(player.id);
      if (room.foundIds.length === room.finderIds.length) {
        advanceRound(room.config.mode, room);
        room.targets = {};
        room.foundIds = [];
        room.roundStartCrossed = {};
        room.countdownUntil = null;
        room.phase = "picking";
        if (room.config.reshuffle) {
          room.boards = makeBoards(
            room.config,
            room.players.map((p) => p.id)
          );
        }
      }
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "play-again": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (room.phase !== "gameover") return bad("Game not over");
      if (!player.isHost) return bad("Only host can restart", 403);
      resetRound(room);
      room.winnerId = null;
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "leave": {
      const code = String(body.code || "").toUpperCase();
      const playerId = String(body.playerId || "");
      const room = await getRoom(code);
      if (!room) return NextResponse.json({ ok: true });
      const wasPlayer = room.players.some((p) => p.id === playerId);
      room.players = room.players.filter((p) => p.id !== playerId);
      room.waiting = room.waiting.filter((p) => p.id !== playerId);
      if (room.players.length === 0 && room.waiting.length === 0) {
        await deleteRoom(code);
        return NextResponse.json({ ok: true });
      }
      if (wasPlayer) {
        if (room.players.length === 0) {
          admitWaitlist(room);
        }
        if (!room.players.some((p) => p.isHost) && room.players.length > 0) {
          room.players[0].isHost = true;
        }
        resetRound(room);
      }
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "kick": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (!player.isHost) return bad("Only host can remove players", 403);
      const targetId = String(body.targetId || "");
      if (targetId === player.id) return bad("Use leave to remove yourself");
      const wasPlayer = room.players.some((p) => p.id === targetId);
      const wasWaiting = room.waiting.some((p) => p.id === targetId);
      if (!wasPlayer && !wasWaiting) return bad("Player not found", 404);
      room.players = room.players.filter((p) => p.id !== targetId);
      room.waiting = room.waiting.filter((p) => p.id !== targetId);
      if (room.players.length === 0 && room.waiting.length === 0) {
        await deleteRoom(room.code);
        return NextResponse.json({ ok: true });
      }
      if (wasPlayer) {
        if (room.players.length === 0) {
          admitWaitlist(room);
        }
        if (!room.players.some((p) => p.isHost) && room.players.length > 0) {
          room.players[0].isHost = true;
        }
        resetRound(room);
      }
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "end-game": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (!player.isHost) return bad("Only host can end the game", 403);
      if (room.phase === "lobby") return bad("Game not in progress");
      admitWaitlist(room);
      resetRound(room);
      room.winnerId = null;
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "sabotage": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (!room.config.sabotage) return bad("Sabotage is disabled");
      if (room.phase !== "active") return bad("Not active");
      if (!room.finderIds.includes(player.id)) return bad("Not your turn", 403);
      if (!room.countdownUntil || Date.now() < room.countdownUntil - COUNTDOWN_GRACE_MS)
        return bad("Wait for countdown");
      const now = Date.now();
      if (now < (room.sabotageCooldowns[player.id] ?? 0)) {
        return bad("Sabotage is on cooldown");
      }
      const targetId = String(body.targetId || "");
      if (!room.crosserIds.includes(targetId)) return bad("Invalid target", 404);
      const grid = room.grids[targetId];
      if (!grid || !meetsSabotageThreshold(grid)) {
        return bad("Target hasn't crossed enough squares yet");
      }
      const indices = pickSabotageIndices(grid, sabotageEggCountFor(grid.length));
      if (indices.length === 0) return bad("No squares left to sabotage");
      room.eggs[targetId] = { indices, expiresAt: now + SABOTAGE_EGG_DURATION_MS };
      room.sabotageCooldowns[player.id] = now + SABOTAGE_COOLDOWN_MS;
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    case "make-host": {
      const { room, player, error } = await loadAndAuthorize(body);
      if (error || !room || !player) return bad(error || "Not found", 404);
      if (!player.isHost) return bad("Only host can transfer host", 403);
      const targetId = String(body.targetId || "");
      if (targetId === player.id) return bad("Already host");
      const target = room.players.find((p) => p.id === targetId);
      if (!target) return bad("Player not found", 404);
      player.isHost = false;
      target.isHost = true;
      await saveRoom(room);
      return NextResponse.json({ ok: true });
    }

    default:
      return bad("Unknown action", 404);
  }
}
