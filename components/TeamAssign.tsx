"use client";

import type { Player, TeamId } from "@/lib/types";

const TEAMS: TeamId[] = ["A", "B"];

function ShuffleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

export default function TeamAssign({
  players,
  myId,
  isHost,
  onSetTeam,
  onRandomize,
}: {
  players: Player[];
  myId: string | null;
  isHost: boolean;
  onSetTeam: (teamId: TeamId | null, forId?: string) => void;
  onRandomize: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--muted)]">Teams</h3>
        {isHost && (
          <button
            type="button"
            title="Randomize teams"
            aria-label="Randomize teams"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] transition-transform active:scale-90 hover:opacity-80"
            onClick={onRandomize}
          >
            <ShuffleIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {players.map((p) => {
          const interactive = isHost || p.id === myId;
          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--accent-soft)]"
            >
              <span className="font-medium">
                {p.name} {p.id === myId && "(you)"}
              </span>
              <div className="flex gap-1 p-1 rounded-lg bg-[var(--surface)]">
                {TEAMS.map((team) => (
                  <button
                    key={team}
                    type="button"
                    disabled={!interactive}
                    onClick={() => onSetTeam(team, p.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                      p.teamId === team
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    Team {team}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
