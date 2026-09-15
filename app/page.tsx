"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/lib/RoomContext";

export default function Home() {
  const router = useRouter();
  const { createRoom, joinRoom, playerName, setPlayerName } = useRoom();
  const [mode, setMode] = useState<"none" | "join">("none");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!playerName.trim()) return setError("Enter your name first");
    setError("");
    setLoading(true);
    const ack = await createRoom(playerName);
    setLoading(false);
    if (ack.ok && ack.code) router.push(`/room/${ack.code}`);
    else setError(ack.error || "Couldn't create room");
  };

  const handleJoin = async () => {
    if (!playerName.trim()) return setError("Enter your name first");
    if (joinCode.trim().length < 4) return setError("Enter a valid room code");
    setError("");
    setLoading(true);
    const ack = await joinRoom(joinCode.trim().toUpperCase(), playerName);
    setLoading(false);
    if (ack.ok && ack.code) router.push(`/room/${ack.code}`);
    else setError(ack.error || "Couldn't join room");
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-bold text-white shadow-lg">
            #
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Grid Duel</h1>
          <p className="mt-1 text-[var(--muted)]">
            Find the number. Cross the grid. Beat your friend.
          </p>
        </div>

        <div className="card p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">
              Your name
            </label>
            <input
              className="input w-full px-4 py-3 text-base"
              placeholder="e.g. Alex"
              value={playerName}
              maxLength={20}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--danger)] -mt-1">{error}</p>
          )}

          {mode === "none" ? (
            <div className="flex flex-col gap-3">
              <button
                className="btn btn-primary w-full py-3 text-base"
                disabled={loading}
                onClick={handleCreate}
              >
                Create Room
              </button>
              <button
                className="btn btn-secondary w-full py-3 text-base"
                onClick={() => setMode("join")}
              >
                Join Room
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                className="input w-full px-4 py-3 text-base text-center tracking-[0.3em] uppercase font-semibold"
                placeholder="CODE"
                value={joinCode}
                maxLength={6}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button
                className="btn btn-primary w-full py-3 text-base"
                disabled={loading}
                onClick={handleJoin}
              >
                Join
              </button>
              <button
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                onClick={() => setMode("none")}
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
