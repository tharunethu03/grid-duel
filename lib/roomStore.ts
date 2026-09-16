import { redis } from "./redis";
import { pusherServer, roomChannel } from "./pusherServer";
import { ROOM_LIFETIME_MS, type RoomState } from "./types";

function key(code: string) {
  return `room:${code}`;
}

export async function getRoom(code: string): Promise<RoomState | null> {
  const data = await redis.get<RoomState>(key(code));
  if (!data) return null;
  // Backfill fields added after rooms may already have been persisted, so a
  // room saved by a previous deploy doesn't crash on the new shape.
  if (!data.waiting) data.waiting = [];
  if (!data.expiresAt) data.expiresAt = Date.now() + ROOM_LIFETIME_MS;
  return data;
}

export async function saveRoom(room: RoomState): Promise<void> {
  room.updatedAt = Date.now();
  // A live round keeps pushing the room's deadline out; an idle lobby or a
  // finished game does not, so it's deleted 1.5h after creation/last round.
  if (room.phase === "picking" || room.phase === "active") {
    room.expiresAt = Date.now() + ROOM_LIFETIME_MS;
  }
  const ttlSeconds = Math.max(60, Math.ceil((room.expiresAt - Date.now()) / 1000));
  await redis.set(key(room.code), room, { ex: ttlSeconds });
  await pusherServer.trigger(roomChannel(room.code), "room-state", room);
}

export async function deleteRoom(code: string): Promise<void> {
  await redis.del(key(code));
}
