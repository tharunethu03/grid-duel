"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GameConfig, GameMode } from "@/lib/types";
import { MODE_INFO } from "@/lib/modeInfo";
import { recommendedConfig, recommendedMode } from "@/lib/recommend";
import Modal from "./Modal";

const USER_PATH =
  "M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z";
const USERS_PATH =
  "M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959 2.32 2.32 0 00.025.654 4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z";

function IconUsers({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d={USERS_PATH} />
    </svg>
  );
}

function IconDuo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" fill="currentColor" className={className}>
      <g transform="translate(-2,0) scale(0.85)">
        <path d={USER_PATH} />
      </g>
      <g opacity="0.55" transform="translate(13,0) scale(0.85)">
        <path d={USER_PATH} />
      </g>
    </svg>
  );
}

function IconRotate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 20" fill="currentColor" className={className}>
      <g transform="translate(-1,-1) scale(1.05)">
        <path d={USER_PATH} />
      </g>
      <g opacity="0.6" transform="translate(15,2) scale(0.78)">
        <path d={USERS_PATH} />
      </g>
    </svg>
  );
}

const MODES: { value: GameMode; label: string; Icon: (p: { className?: string }) => React.JSX.Element }[] = [
  { value: "classic", label: "Classic", Icon: IconDuo },
  { value: "teams", label: "Team", Icon: IconUsers },
  { value: "cycle", label: "Cycle", Icon: IconRotate },
];

function ModeSelector({
  value,
  editable,
  recommendedValue,
  onChange,
}: {
  value: GameMode;
  editable: boolean;
  recommendedValue: GameMode;
  onChange: (mode: GameMode) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [highlight, setHighlight] = useState<{ left: number; width: number } | null>(null);
  const [infoFor, setInfoFor] = useState<GameMode | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const btn = btnRefs.current[value];
    if (!track || !btn) return;
    setHighlight({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [value]);

  useEffect(() => {
    const recompute = () => {
      const track = trackRef.current;
      const btn = btnRefs.current[value];
      if (!track || !btn) return;
      setHighlight({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [value]);

  const info = infoFor ? MODE_INFO[infoFor] : null;

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-2.5 text-[var(--muted)]">
        Mode
      </label>
      <div
        ref={trackRef}
        className="relative flex gap-1 p-1 rounded-2xl bg-[var(--surface)] border border-[var(--border)]"
      >
        {highlight && (
          <div
            className="absolute top-1 bottom-1 rounded-xl bg-[var(--accent)] shadow-md transition-[transform,width] duration-300 ease-out"
            style={{ width: highlight.width, transform: `translateX(${highlight.left - 4}px)` }}
          />
        )}
        {MODES.map((m) => {
          const selected = value === m.value;
          const recommended = m.value === recommendedValue;
          return (
            <button
              key={m.value}
              ref={(el) => {
                btnRefs.current[m.value] = el;
              }}
              type="button"
              disabled={!editable}
              onClick={() => onChange(m.value)}
              className={`relative z-10 flex-1 flex flex-col items-center gap-2 py-4 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                selected ? "text-white" : "text-[var(--accent)]"
              }`}
            >
              {recommended && (
                <span
                  className={`absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide whitespace-nowrap ${
                    selected ? "bg-white text-[var(--accent)]" : "bg-[var(--accent)] text-white"
                  }`}
                >
                  RECOMMENDED
                </span>
              )}
              <span
                role="button"
                tabIndex={0}
                aria-label={`About ${m.label} mode`}
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoFor(m.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    e.preventDefault();
                    setInfoFor(m.value);
                  }
                }}
                className={`absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold border cursor-pointer ${
                  selected
                    ? "border-white/70 text-white/90"
                    : "border-[var(--accent)]/50 text-[var(--accent)]"
                }`}
              >
                ?
              </span>
              <m.Icon className="h-7 w-11" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      <Modal open={!!info} onClose={() => setInfoFor(null)}>
        {info && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="text-4xl mb-2">{info.emoji}</div>
              <h3 className="text-xl font-bold">{info.title} mode</h3>
              <p className="text-sm text-[var(--muted)]">{info.tagline}</p>
            </div>
            <div className="flex flex-col gap-3">
              {info.steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-[var(--accent-soft)]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary w-full py-3"
              onClick={() => setInfoFor(null)}
            >
              Got it
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function NumberField({
  label,
  value,
  editable,
  recommended,
  onCommit,
  onDirtyChange,
}: {
  label: string;
  value: number;
  editable: boolean;
  recommended: number;
  onCommit: (value: number) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(text, 10);
    if (Number.isFinite(parsed)) {
      onCommit(parsed);
      onDirtyChange(true);
    } else setText(String(value));
  };

  const isRecommended = value === recommended;

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-2.5 text-[var(--muted)]">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          min={4}
          max={500}
          value={text}
          disabled={!editable}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="input w-full pl-4 pr-9 py-3 text-base"
          style={{ paddingRight: isRecommended ? 108 : 84 }}
        />
        {isRecommended ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wide text-[var(--muted)] whitespace-nowrap">
            RECOMMENDED
          </span>
        ) : (
          editable && (
            <button
              type="button"
              onClick={() => {
                setText(String(recommended));
                onCommit(recommended);
                onDirtyChange(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--accent)] px-2 py-1 rounded-lg hover:bg-[var(--accent-soft)] whitespace-nowrap"
            >
              Use {recommended}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function GameConfigForm({
  config,
  editable,
  playerCount,
  onChange,
}: {
  config: GameConfig;
  editable: boolean;
  playerCount: number;
  onChange: (config: Partial<GameConfig>) => void;
}) {
  const recommendedModeValue = recommendedMode(playerCount);
  const recommended = recommendedConfig(playerCount, config.mode);

  // Once the host manually edits a field it stops auto-following the
  // recommendation (until they explicitly hit "Use <recommended>" again).
  const [numberRangeDirty, setNumberRangeDirty] = useState(false);
  const [gridSizeDirty, setGridSizeDirty] = useState(false);

  useEffect(() => {
    if (!editable) return;
    const updates: Partial<GameConfig> = {};
    if (!numberRangeDirty && config.numberRange !== recommended.numberRange) {
      updates.numberRange = recommended.numberRange;
    }
    if (!gridSizeDirty && config.gridSize !== recommended.gridSize) {
      updates.gridSize = recommended.gridSize;
    }
    if (Object.keys(updates).length > 0) onChange(updates);
  }, [
    editable,
    recommended.numberRange,
    recommended.gridSize,
    numberRangeDirty,
    gridSizeDirty,
    config.numberRange,
    config.gridSize,
    onChange,
  ]);

  return (
    <div className="flex flex-col gap-5">
      <ModeSelector
        value={config.mode}
        editable={editable}
        recommendedValue={recommendedModeValue}
        onChange={(mode) => onChange({ mode })}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberField
          label="Number range (1-x)"
          value={config.numberRange}
          editable={editable}
          recommended={recommended.numberRange}
          onCommit={(numberRange) => onChange({ numberRange })}
          onDirtyChange={setNumberRangeDirty}
        />
        <NumberField
          label="Grid squares"
          value={config.gridSize}
          editable={editable}
          recommended={recommended.gridSize}
          onCommit={(gridSize) => onChange({ gridSize })}
          onDirtyChange={setGridSizeDirty}
        />
      </div>

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

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Sabotage 🥚</p>
          <p className="text-xs text-[var(--muted)]">
            Finders can plant eggs on a crosser who&apos;s 2/3 done
          </p>
        </div>
        <button
          disabled={!editable}
          onClick={() => onChange({ sabotage: !config.sabotage })}
          className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${
            config.sabotage ? "bg-[var(--accent)]" : "bg-[var(--border)]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              config.sabotage ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
