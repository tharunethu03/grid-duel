"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { Channel } from "pusher-js";
import { getPusherClient } from "./pusherClient";
import type { GameConfig, RoomState, TeamId } from "./types";

interface Ack {
  ok: boolean;
  code?: string;
  playerId?: string;
  error?: string;
}

function playerKey(code: string) {
  return `gd-player-${code}`;
}

async function api(action: string, body: Record<string, unknown> = {}): Promise<Ack> {
  try {
    const res = await fetch(`/api/room/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as Ack;
  } catch {
    return { ok: false, error: "Network error" };
  }
}

interface RoomContextValue {
  state: RoomState | null;
  playerId: string | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  error: string | null;
  clearError: () => void;
  connect: (code: string) => void;
  createRoom: (name: string) => Promise<Ack>;
  joinRoom: (code: string, name: string) => Promise<Ack>;
  updateConfig: (config: Partial<GameConfig>) => void;
  setTeam: (teamId: TeamId | null, forId?: string) => void;
  randomizeTeams: () => void;
  startGame: () => Promise<Ack | undefined>;
  pickNumber: (value: number, forId: string) => void;
  crossSquare: (index: number) => void;
  foundNumber: () => Promise<Ack | undefined>;
  playAgain: () => void;
  leaveRoom: () => void;
  kickPlayer: (targetId: string) => void;
  makeHost: (targetId: string) => void;
  endGame: () => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerNameState] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("gd-name") || "" : ""
  );
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const codeRef = useRef<string | null>(null);

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    if (typeof window !== "undefined") localStorage.setItem("gd-name", name);
  }, []);

  const teardown = useCallback(() => {
    if (channelRef.current && codeRef.current) {
      channelRef.current.unbind_all();
      getPusherClient().unsubscribe(`room-${codeRef.current}`);
    }
    channelRef.current = null;
  }, []);

  const connect = useCallback(
    (rawCode: string) => {
      const code = rawCode.toUpperCase();
      if (codeRef.current === code && channelRef.current) return;
      teardown();
      codeRef.current = code;

      const saved = typeof window !== "undefined" ? localStorage.getItem(playerKey(code)) : null;
      if (saved) setPlayerId(saved);

      fetch(`/api/room/state?code=${code}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            setState(data.room);
            setError(null);
          } else {
            setError(data.error || "Room not found");
          }
        })
        .catch(() => setError("Network error"));

      const channel = getPusherClient().subscribe(`room-${code}`);
      channel.bind("room-state", (room: RoomState) => setState(room));
      channelRef.current = channel;
    },
    [teardown]
  );

  const createRoom = useCallback(async (name: string) => {
    const ack = await api("create", { name });
    if (ack.ok && ack.code && ack.playerId) {
      localStorage.setItem(playerKey(ack.code), ack.playerId);
      setPlayerId(ack.playerId);
    } else if (ack.error) setError(ack.error);
    return ack;
  }, []);

  const joinRoom = useCallback(async (code: string, name: string) => {
    const ack = await api("join", { code: code.toUpperCase(), name });
    if (ack.ok && ack.code && ack.playerId) {
      localStorage.setItem(playerKey(ack.code), ack.playerId);
      setPlayerId(ack.playerId);
    } else if (ack.error) setError(ack.error);
    return ack;
  }, []);

  const withRoom = useCallback(
    (action: string, extra: Record<string, unknown> = {}): Promise<Ack | undefined> => {
      if (!codeRef.current || !playerId) return Promise.resolve(undefined);
      return api(action, { code: codeRef.current, playerId, ...extra }).then((ack) => {
        if (!ack.ok && ack.error) setError(ack.error);
        return ack;
      });
    },
    [playerId]
  );

  const updateConfig = useCallback(
    (config: Partial<GameConfig>) => withRoom("config", { config }),
    [withRoom]
  );
  const setTeam = useCallback(
    (teamId: TeamId | null, forId?: string) => withRoom("team", { teamId, forId }),
    [withRoom]
  );
  const randomizeTeams = useCallback(() => withRoom("randomize-teams"), [withRoom]);
  const startGame = useCallback(() => withRoom("start"), [withRoom]);
  const pickNumber = useCallback(
    (value: number, forId: string) => withRoom("pick", { value, forId }),
    [withRoom]
  );

  // Crossing a square marks it locally right away instead of waiting on the
  // server round trip + Pusher broadcast, since that chain is slow enough
  // per click to make rapid crossing feel laggy. The optimistic mark is
  // rolled back if the server rejects the action.
  const crossSquare = useCallback(
    (index: number) => {
      if (!playerId) return;
      setState((prev) => {
        if (!prev) return prev;
        const grid = prev.grids[playerId];
        if (!grid || grid[index]) return prev;
        const nextGrid = [...grid];
        nextGrid[index] = true;
        return { ...prev, grids: { ...prev.grids, [playerId]: nextGrid } };
      });
      withRoom("cross", { index }).then((ack) => {
        if (ack && !ack.ok) {
          setState((prev) => {
            if (!prev) return prev;
            const grid = prev.grids[playerId];
            if (!grid) return prev;
            const nextGrid = [...grid];
            nextGrid[index] = false;
            return { ...prev, grids: { ...prev.grids, [playerId]: nextGrid } };
          });
        }
      });
    },
    [withRoom, playerId]
  );

  const foundNumber = useCallback(() => withRoom("found"), [withRoom]);
  const playAgain = useCallback(() => withRoom("play-again"), [withRoom]);
  const kickPlayer = useCallback(
    (targetId: string) => withRoom("kick", { targetId }),
    [withRoom]
  );
  const makeHost = useCallback(
    (targetId: string) => withRoom("make-host", { targetId }),
    [withRoom]
  );
  const endGame = useCallback(() => withRoom("end-game"), [withRoom]);
  const leaveRoom = useCallback(() => {
    withRoom("leave");
    teardown();
    codeRef.current = null;
    setState(null);
  }, [withRoom, teardown]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <RoomContext.Provider
      value={{
        state,
        playerId,
        playerName,
        setPlayerName,
        error,
        clearError,
        connect,
        createRoom,
        joinRoom,
        updateConfig,
        setTeam,
        randomizeTeams,
        startGame,
        pickNumber,
        crossSquare,
        foundNumber,
        playAgain,
        leaveRoom,
        kickPlayer,
        makeHost,
        endGame,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within RoomProvider");
  return ctx;
}
