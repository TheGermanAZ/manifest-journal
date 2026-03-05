interface AlignmentChartProps {
  data: Array<{ date: string; score: number }>;
}

export function AlignmentChart({ data }: AlignmentChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-base text-[var(--ink-light)] text-center py-8">No data yet</p>
    );
  }

  return (
    <div className="flex flex-row items-end gap-1 h-24">
      {data.map((point, i) => {
        const height = (point.score / 10) * 96;
        const color =
          point.score >= 7
            ? "bg-emerald-400"
            : point.score >= 5
              ? "bg-yellow-400"
              : "bg-red-300";

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-sm ${color}`}
              style={{ height: `${height}px` }}
            />
            <span className="text-xs text-[var(--ink-light)]">{point.date}</span>
          </div>
        );
      })}
    </div>
  );
}
