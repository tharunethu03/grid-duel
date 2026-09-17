export default function ProgressStat({
  label,
  current,
  total,
}: {
  label: string;
  current: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="w-44 flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-[var(--muted)] truncate">{label}</span>
        <span className="text-xs font-semibold tabular-nums shrink-0">
          {current}
          <span className="text-[var(--muted)] font-normal">/{total}</span>
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
