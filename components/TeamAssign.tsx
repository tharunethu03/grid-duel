"use client";

import type { Player, TeamId } from "@/lib/types";

const TEAMS: TeamId[] = ["A", "B"];

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
            className="text-xs font-semibold text-[var(--accent)]"
            onClick={onRandomize}
          >
            Randomize
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
