"use client";

import { useEffect, useState } from "react";
import type { GameConfig } from "@/lib/types";

function NumberField({
  label,
  value,
  editable,
  onCommit,
}: {
  label: string;
  value: number;
  editable: boolean;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(text, 10);
    if (Number.isFinite(parsed)) onCommit(parsed);
    else setText(String(value));
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">
        {label}
      </label>
      <input
        type="number"
        min={4}
        max={500}
        value={text}
        disabled={!editable}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="input w-full px-4 py-3 text-base"
      />
    </div>
  );
}

export default function GameConfigForm({
  config,
  editable,
  onChange,
}: {
  config: GameConfig;
  editable: boolean;
  onChange: (config: Partial<GameConfig>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <NumberField
        label="Number range (1 – x)"
        value={config.numberRange}
        editable={editable}
        onCommit={(numberRange) => onChange({ numberRange })}
      />
      <NumberField
        label="Grid squares"
        value={config.gridSize}
        editable={editable}
        onCommit={(gridSize) => onChange({ gridSize })}
      />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Reshuffle each round</p>
          <p className="text-xs text-[var(--muted)]">
            Randomize number positions after every round
          </p>
        </div>
        <button
          disabled={!editable}
          onClick={() => onChange({ reshuffle: !config.reshuffle })}
          className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${
            config.reshuffle ? "bg-[var(--accent)]" : "bg-[var(--border)]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              config.reshuffle ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
