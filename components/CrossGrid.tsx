"use client";

export default function CrossGrid({
  grid,
  onSquareClick,
  disabled,
}: {
  grid: boolean[];
  onSquareClick?: (index: number) => void;
  disabled?: boolean;
}) {
  const cols = Math.ceil(Math.sqrt(grid.length));

  return (
    <div className="w-full max-w-lg mx-auto card p-3 max-h-[70vh] overflow-y-auto">
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {grid.map((crossed, i) => (
          <button
            key={i}
            disabled={disabled || crossed}
            onClick={() => onSquareClick?.(i)}
            className={`aspect-square rounded-lg border flex items-center justify-center text-sm font-semibold
              transition-all duration-150
              ${
                crossed
                  ? "bg-[var(--accent)] border-[var(--accent)] text-white scale-95"
                  : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--accent-soft)] active:scale-90"
              }
              ${disabled && !crossed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {crossed ? "✕" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
