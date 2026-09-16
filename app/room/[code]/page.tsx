"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoom } from "@/lib/RoomContext";
import ScatterBoard from "@/components/ScatterBoard";
import CrossGrid from "@/components/CrossGrid";
import Countdown from "@/components/Countdown";
import GameConfigForm from "@/components/GameConfigForm";
import TeamAssign from "@/components/TeamAssign";
import Avatar from "@/components/Avatar";

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
    setTeam,
    randomizeTeams,
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
  const [submittingFound, setSubmittingFound] = useState(false);
  const [armedFinderId, setArmedFinderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    connect(code);
  }, [code, connect]);

  useEffect(() => {
    setNameInput(playerName);
  }, [playerName]);

  // Any fresh room state (including the phase swap after a correct guess)
  // means our last "found" submission has been resolved one way or another.
  useEffect(() => {
    setSubmittingFound(false);
  }, [state]);

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
  const isHost = !!me?.isHost;
  const mode = state.config.mode;
  const isFinder = !!playerId && state.finderIds.includes(playerId);
  const isCrosser = !!playerId && state.crosserIds.includes(playerId);
  const myGrid = playerId ? state.grids[playerId] : undefined;
  const myBoard = playerId ? state.boards[playerId] : undefined;
  const myTarget = playerId ? state.targets[playerId] : undefined;
  const showCountdown = state.phase === "active" && !!state.countdownUntil && !revealed;

  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? "Someone";
  const crosserNames = state.crosserIds.map(nameOf).join(", ");
  const openFinderIds = state.finderIds.filter((id) => !(id in state.targets));
  const crossedTotal = state.crosserIds.reduce(
    (sum, id) => sum + (state.grids[id]?.filter(Boolean).length ?? 0),
    0
  );
  const squaresTotal = state.crosserIds.reduce(
    (sum, id) => sum + (state.grids[id]?.length ?? 0),
    0
  );

  const teamACount = state.players.filter((p) => p.teamId === "A").length;
  const teamBCount = state.players.filter((p) => p.teamId === "B").length;
  let canStart = state.players.length >= 2;
  let startLabel = "Start Game";
  if (state.players.length < 2) {
    startLabel = "Waiting for players…";
  } else if (mode === "classic" && state.players.length !== 2) {
    canStart = false;
    startLabel = "Classic mode needs exactly 2 players";
  } else if (mode === "teams" && (teamACount === 0 || teamBCount === 0)) {
    canStart = false;
    startLabel = "Everyone needs a team";
  }

  const handleWrongClick = (value: number) => {
    setWrongValue(value);
    setTimeout(() => setWrongValue(null), 500);
  };

  const handleTileClick = async (value: number) => {
    if (value !== myTarget) {
      handleWrongClick(value);
      return;
    }
    setSubmittingFound(true);
    const ack = await foundNumber();
    if (ack && !ack.ok) setSubmittingFound(false);
  };

  const handleScatterPick = (value: number) => {
    const forId = armedFinderId ?? (openFinderIds.length === 1 ? openFinderIds[0] : null);
    if (!forId) return;
    pickNumber(value, forId);
    setArmedFinderId(null);
  };

  const winner = state.players.find((p) => p.id === state.winnerId);
  const winnerLabel =
    mode === "teams" && winner?.teamId
      ? `Team ${winner.teamId} wins!`
      : winner
      ? `${winner.name} wins!`
      : "";

  return (
    <div className="dot-grid-panel flex flex-1 flex-col w-full">
      {showCountdown && state.countdownUntil && <Countdown until={state.countdownUntil} />}

      <div className="w-full px-5 sm:px-8 pt-8 pb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            Room Code
          </p>
          <button
            type="button"
            onClick={handleCopyCode}
            title="Click to copy"
            className="relative mt-1 block font-mono text-4xl sm:text-5xl font-extrabold tracking-[0.12em] text-white hover:text-white/80 active:scale-95 transition-all cursor-pointer"
          >
            {code}
            {copied && (
              <span className="absolute left-1/2 -bottom-7 -translate-x-1/2 text-xs font-semibold text-white bg-[var(--accent)] px-3 py-1 rounded-full whitespace-nowrap animate-toast-in shadow-md">
                Copied!
              </span>
            )}
          </button>
        </div>
        <button
          className="mt-1 text-base font-medium text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
          onClick={() => {
            leaveRoom();
            router.push("/");
          }}
        >
          Leave
        </button>
      </div>

      <div className="w-full px-4 sm:px-6 pb-10">
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
          {error && (
            <div
              className="w-full text-center text-sm text-[var(--danger)] cursor-pointer"
              onClick={clearError}
            >
              {error}
            </div>
          )}

          {state.phase === "lobby" && (
            <div className="w-full flex flex-col gap-8 animate-fade-in">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-[var(--muted)]">
                  Players
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-4">
                  {state.players.map((p) => (
                    <Avatar
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      isHost={p.isHost}
                      isYou={p.id === playerId}
                    />
                  ))}
                </div>
                {state.players.length < 2 && (
                  <div className="mt-4 px-4 py-3 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)] text-sm">
                    Waiting for others to join with code{" "}
                    <span className="font-semibold">{code}</span>...
                  </div>
                )}
              </div>

              <GameConfigForm
                config={state.config}
                editable={isHost}
                playerCount={state.players.length}
                onChange={updateConfig}
              />

              {mode === "teams" && (
                <TeamAssign
                  players={state.players}
                  myId={playerId}
                  isHost={isHost}
                  onSetTeam={setTeam}
                  onRandomize={randomizeTeams}
                />
              )}

              {isHost ? (
                <button
                  className="btn btn-primary w-full py-4 text-lg"
                  disabled={!canStart}
                  onClick={startGame}
                >
                  {startLabel}
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
              {isCrosser ? (
                <>
                  <h2 className="text-xl font-semibold text-center">
                    {openFinderIds.length > 0
                      ? "Pick a number to hide"
                      : "Waiting for the round to start…"}
                  </h2>
                  {openFinderIds.length > 1 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {openFinderIds.map((id) => (
                        <button
                          key={id}
                          onClick={() => setArmedFinderId(id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            armedFinderId === id
                              ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                              : "border-[var(--border)] text-[var(--muted)]"
                          }`}
                        >
                          For {nameOf(id)}
                        </button>
                      ))}
                    </div>
                  )}
                  {myBoard && openFinderIds.length > 0 && (
                    <ScatterBoard board={myBoard} onTileClick={handleScatterPick} />
                  )}
                </>
              ) : (
                <div className="card p-10 text-center">
                  <p className="text-lg font-medium">
                    {crosserNames} {state.crosserIds.length > 1 ? "are" : "is"} picking a
                    number{isFinder ? " for you" : ""}…
                  </p>
                  <p className="text-sm text-[var(--muted)] mt-1">Get ready to search!</p>
                </div>
              )}
            </div>
          )}

          {state.phase === "active" && (
            <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
              {isCrosser && myGrid && (
                <>
                  <h2 className="text-xl font-semibold text-center">
                    Cross the grid before they find the number!
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    {myGrid.filter(Boolean).length} / {myGrid.length} crossed
                  </p>
                  {state.finderIds.length > 1 && (
                    <p className="text-sm text-[var(--muted)]">
                      {state.foundIds.length} / {state.finderIds.length} found their number
                    </p>
                  )}
                  <CrossGrid grid={myGrid} onSquareClick={crossSquare} disabled={!revealed} />
                </>
              )}
              {isFinder && myBoard && (
                <>
                  <div className="card px-6 py-4 text-center animate-pop-in">
                    <p className="text-sm text-[var(--muted)]">Find this number</p>
                    <p className="text-4xl font-bold text-[var(--accent)]">{myTarget}</p>
                  </div>
                  {squaresTotal > 0 && (
                    <p className="text-sm text-[var(--muted)]">
                      {crosserNames}: {crossedTotal} / {squaresTotal} crossed
                    </p>
                  )}
                  <ScatterBoard
                    board={myBoard}
                    wrongValue={wrongValue}
                    disabled={!revealed || submittingFound}
                    onTileClick={handleTileClick}
                  />
                </>
              )}
            </div>
          )}

          {state.phase === "gameover" && (
            <div className="card w-full p-10 text-center flex flex-col items-center gap-4 animate-fade-in">
              <div className="text-5xl">
                {state.winnerId === playerId || (mode === "teams" && winner?.teamId === me?.teamId)
                  ? "🏆"
                  : "🙈"}
              </div>
              <h2 className="text-2xl font-bold">{winnerLabel}</h2>
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
      </div>
    </div>
  );
}
