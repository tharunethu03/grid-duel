"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import type { GameConfig, RoomState } from "./types";

interface Ack {
  ok: boolean;
  code?: string;
  playerId?: string;
  error?: string;
}

interface RoomContextValue {
  state: RoomState | null;
  playerId: string | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  error: string | null;
  clearError: () => void;
  createRoom: (name: string) => Promise<Ack>;
  joinRoom: (code: string, name: string) => Promise<Ack>;
  updateConfig: (config: Partial<GameConfig>) => void;
  startGame: () => void;
  pickNumber: (value: number) => void;
  crossSquare: (index: number) => void;
  foundNumber: () => void;
  playAgain: () => void;
  leaveRoom: () => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerNameState] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("gd-name") : null;
    if (saved) setPlayerNameState(saved);
  }, []);

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    if (typeof window !== "undefined") localStorage.setItem("gd-name", name);
  }, []);

  const getSocket = useCallback(() => {
    if (!socketRef.current) {
      const socket = io({ path: "/socket.io" });
      socket.on("room-state", (s: RoomState) => {
        setState(s);
        setPlayerId(socket.id ?? null);
      });
      socket.on("connect", () => setPlayerId(socket.id ?? null));
      socketRef.current = socket;
    }
    return socketRef.current;
  }, []);

  useEffect(() => {
    getSocket();
  }, [getSocket]);

  const createRoom = useCallback(
    (name: string) =>
      new Promise<Ack>((resolve) => {
        getSocket().emit("create-room", { name }, (ack: Ack) => {
          if (ack.playerId) setPlayerId(ack.playerId);
          if (!ack.ok && ack.error) setError(ack.error);
          resolve(ack);
        });
      }),
    [getSocket]
  );

  const joinRoom = useCallback(
    (code: string, name: string) =>
      new Promise<Ack>((resolve) => {
        getSocket().emit("join-room", { code, name }, (ack: Ack) => {
          if (ack.playerId) setPlayerId(ack.playerId);
          if (!ack.ok && ack.error) setError(ack.error);
          resolve(ack);
        });
      }),
    [getSocket]
  );

  const updateConfig = useCallback(
    (config: Partial<GameConfig>) => getSocket().emit("update-config", config),
    [getSocket]
  );
  const startGame = useCallback(() => getSocket().emit("start-game"), [getSocket]);
  const pickNumber = useCallback(
    (value: number) => getSocket().emit("pick-number", value),
    [getSocket]
  );
  const crossSquare = useCallback(
    (index: number) => getSocket().emit("cross-square", index),
    [getSocket]
  );
  const foundNumber = useCallback(() => getSocket().emit("found-number"), [getSocket]);
  const playAgain = useCallback(() => getSocket().emit("play-again"), [getSocket]);
  const leaveRoom = useCallback(() => {
    getSocket().emit("leave-room");
    setState(null);
  }, [getSocket]);

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
        createRoom,
        joinRoom,
        updateConfig,
        startGame,
        pickNumber,
        crossSquare,
        foundNumber,
        playAgain,
        leaveRoom,
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
