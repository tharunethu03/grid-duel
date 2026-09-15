import { redis } from "./redis";
import { pusherServer, roomChannel } from "./pusherServer";
import type { RoomState } from "./types";

const ROOM_TTL_SECONDS = 60 * 60 * 6; // 6 hours

function key(code: string) {
  return `room:${code}`;
}

export async function getRoom(code: string): Promise<RoomState | null> {
  const data = await redis.get<RoomState>(key(code));
  return data ?? null;
}

export async function saveRoom(room: RoomState): Promise<void> {
  room.updatedAt = Date.now();
  await redis.set(key(room.code), room, { ex: ROOM_TTL_SECONDS });
  await pusherServer.trigger(roomChannel(room.code), "room-state", room);
}

export async function deleteRoom(code: string): Promise<void> {
  await redis.del(key(code));
}
