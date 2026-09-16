"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoom } from "@/lib/RoomContext";
import Toast from "@/components/Toast";
import pkg from "@/package.json";

// Reading the URL's search params opts a route into client-side rendering up
// to the nearest Suspense boundary, so this is isolated in its own component
// rather than called directly in Home (which stays prerenderable).
function RemovedNotice({ onNotice }: { onNotice: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("notice") === "removed") {
      onNotice();
      router.replace("/");
    }
  }, [searchParams, router, onNotice]);

  return null;
}

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
    <div className="dot-grid-panel flex flex-1 flex-col w-full">
      <Suspense fallback={null}>
        <RemovedNotice onNotice={() => setError("You were removed from the room")} />
      </Suspense>
      <Toast message={error || null} onDismiss={() => setError("")} />

      <div className="w-full px-5 sm:px-8 pt-14 pb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
          Welcome to
        </p>
        <h1 className="mt-1 font-mono text-4xl sm:text-5xl font-extrabold tracking-[0.06em] text-white">
          Grid Duel
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Find the number. Cross the grid. Beat your friends.
        </p>
      </div>

      <div className="w-full px-4 sm:px-6 pb-10">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
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

          {mode === "none" ? (
            <div className="flex flex-col gap-3">
              <button
                className="btn btn-primary w-full py-4 text-base"
                disabled={loading}
                onClick={handleCreate}
              >
                Create Room
              </button>
              <button
                className="btn btn-secondary w-full py-4 text-base"
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
                className="btn btn-primary w-full py-4 text-base"
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

      <p className="pb-6 text-center text-[11px] text-[var(--muted)]">v{pkg.version}</p>
    </div>
  );
}
