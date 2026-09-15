"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoom } from "@/lib/RoomContext";
import ScatterBoard from "@/components/ScatterBoard";
import CrossGrid from "@/components/CrossGrid";
import Countdown from "@/components/Countdown";
import GameConfigForm from "@/components/GameConfigForm";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || "").toUpperCase();
  const router = useRouter();
  const {
    state,
    playerId,
    playerName,
    setPlayerName,
    error,
    clearError,
    connect,
    joinRoom,
    updateConfig,
    startGame,
    pickNumber,
    crossSquare,
    foundNumber,
    playAgain,
    leaveRoom,
  } = useRoom();

  const [joining, setJoining] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);
  const [wrongValue, setWrongValue] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(true);

  useEffect(() => {
    connect(code);
  }, [code, connect]);

  useEffect(() => {
    setNameInput(playerName);
  }, [playerName]);

  const isMember = useMemo(
    () => !!state && !!playerId && state.players.some((p) => p.id === playerId),
    [state, playerId]
  );

  useEffect(() => {
    if (state?.phase !== "active" || !state.countdownUntil) {
      setRevealed(true);
      return;
    }
    const remaining = state.countdownUntil - Date.now();
    if (remaining <= 0) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), remaining);
    return () => clearTimeout(t);
  }, [state?.phase, state?.countdownUntil]);

  const handleJoin = async () => {
    if (!nameInput.trim()) return;
    setJoining(true);
    setPlayerName(nameInput);
    await joinRoom(code, nameInput);
    setJoining(false);
  };

  if (!state || !isMember) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="card w-full max-w-sm p-6 flex flex-col gap-4">
          <div className="text-center">
            <p className="text-sm text-[var(--muted)]">Joining room</p>
            <p className="text-2xl font-bold tracking-[0.2em]">{code}</p>
          </div>
          <input
            className="input w-full px-4 py-3 text-base"
            placeholder="Your name"
            value={nameInput}
            maxLength={20}
            onChange={(e) => setNameInput(e.target.value)}
          />
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button
            className="btn btn-primary w-full py-3"
            disabled={joining}
            onClick={handleJoin}
          >
            Join Room
          </button>
          <button
            className="text-sm text-[var(--muted)]"
            onClick={() => {
              clearError();
              router.push("/");
            }}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const me = state.players.find((p) => p.id === playerId);
  const opponent = state.players.find((p) => p.id !== playerId);
  const isHost = !!me?.isHost;
  const isRunner = state.runnerId === playerId;
  const isSeeker = state.seekerId === playerId;
  const myGrid = playerId ? state.grids[playerId] : undefined;
  const myBoard = playerId ? state.boards[playerId] : undefined;
  const opponentGrid = opponent ? state.grids[opponent.id] : undefined;
  const showCountdown = state.phase === "active" && !!state.countdownUntil && !revealed;

  const handleWrongClick = (value: number) => {
    setWrongValue(value);
    setTimeout(() => setWrongValue(null), 500);
  };

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 gap-6 w-full max-w-2xl mx-auto">
      {showCountdown && state.countdownUntil && <Countdown until={state.countdownUntil} />}

      <div className="flex items-center justify-between w-full">
        <div>
          <p className="text-xs text-[var(--muted)]">Room</p>
          <p className="font-mono font-semibold tracking-widest">{code}</p>
        </div>
        <button
          className="text-sm text-[var(--muted)] hover:text-[var(--danger)]"
          onClick={() => {
            leaveRoom();
            router.push("/");
          }}
        >
          Leave
        </button>
      </div>

      {state.phase === "lobby" && (
        <div className="card w-full p-6 flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-semibold mb-3">Players</h2>
            <div className="flex flex-col gap-2">
              {state.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--accent-soft)]"
                >
                  <span className="font-medium">
                    {p.name} {p.id === playerId && "(you)"}
                  </span>
                  {p.isHost && (
                    <span className="text-xs font-semibold text-[var(--accent)]">
                      HOST
                    </span>
                  )}
                </div>
              ))}
              {state.players.length < 2 && (
                <div className="px-4 py-3 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)] text-sm">
                  Waiting for opponent to join with code{" "}
                  <span className="font-semibold">{code}</span>...
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Game settings</h2>
            <GameConfigForm
              config={state.config}
              editable={isHost}
              onChange={updateConfig}
            />
          </div>

          {isHost ? (
            <button
              className="btn btn-primary w-full py-3"
              disabled={state.players.length !== 2}
              onClick={startGame}
            >
              {state.players.length === 2 ? "Start Game" : "Waiting for opponent…"}
            </button>
          ) : (
            <p className="text-center text-sm text-[var(--muted)]">
              Waiting for host to start the game…
            </p>
          )}
        </div>
      )}

      {state.phase === "picking" && (
        <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
          {isRunner ? (
            <>
              <h2 className="text-xl font-semibold">
                Pick a number for {opponent?.name} to find
              </h2>
              {myBoard && (
                <ScatterBoard board={myBoard} onTileClick={pickNumber} />
              )}
            </>
          ) : (
            <div className="card p-10 text-center">
              <p className="text-lg font-medium">
                {opponent?.name} is picking a number…
              </p>
              <p className="text-sm text-[var(--muted)] mt-1">Get ready to search!</p>
            </div>
          )}
        </div>
      )}

      {state.phase === "active" && (
        <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
          {isRunner && myGrid && (
            <>
              <h2 className="text-xl font-semibold">
                Cross the grid before {opponent?.name} finds the number!
              </h2>
              <p className="text-sm text-[var(--muted)]">
                {myGrid.filter(Boolean).length} / {myGrid.length} crossed
              </p>
              <CrossGrid grid={myGrid} onSquareClick={crossSquare} disabled={!revealed} />
            </>
          )}
          {isSeeker && myBoard && (
            <>
              <div className="card px-6 py-4 text-center animate-pop-in">
                <p className="text-sm text-[var(--muted)]">Find this number</p>
                <p className="text-4xl font-bold text-[var(--accent)]">
                  {state.target}
                </p>
              </div>
              {opponentGrid && (
                <p className="text-sm text-[var(--muted)]">
                  {opponent?.name}: {opponentGrid.filter(Boolean).length} /{" "}
                  {opponentGrid.length} crossed
                </p>
              )}
              <ScatterBoard
                board={myBoard}
                wrongValue={wrongValue}
                disabled={!revealed}
                onTileClick={(value) => {
                  if (value === state.target) foundNumber();
                  else handleWrongClick(value);
                }}
              />
            </>
          )}
        </div>
      )}

      {state.phase === "gameover" && (
        <div className="card w-full p-10 text-center flex flex-col items-center gap-4 animate-fade-in">
          <div className="text-5xl">{state.winnerId === playerId ? "🏆" : "🙈"}</div>
          <h2 className="text-2xl font-bold">
            {state.winnerId === playerId
              ? "You win!"
              : `${state.players.find((p) => p.id === state.winnerId)?.name} wins!`}
          </h2>
          {isHost ? (
            <button className="btn btn-primary px-8 py-3" onClick={playAgain}>
              Play Again
            </button>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Waiting for host to start a new game…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
