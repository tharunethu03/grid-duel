const AVATAR_COLORS = [
  "#3b82f6",
  "#f4415e",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Avatar({
  id,
  name,
  isHost,
  isYou,
  size = 72,
}: {
  id: string;
  name: string;
  isHost?: boolean;
  isYou?: boolean;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2" style={{ width: Math.max(size + 16, 92) }}>
      <div className="relative">
        {isHost && (
          <span
            className="absolute -top-5 left-1/2 -translate-x-1/2 text-xl select-none"
            aria-label="Host"
            title="Host"
          >
            👑
          </span>
        )}
        <div
          className="flex items-center justify-center rounded-full font-bold text-white shadow-lg"
          style={{
            width: size,
            height: size,
            background: colorForId(id),
            fontSize: size * 0.34,
          }}
        >
          {initialsFor(name)}
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm font-medium text-center leading-tight break-words">
          {name}
        </span>
        {isYou && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            You
          </span>
        )}
      </div>
    </div>
  );
}
