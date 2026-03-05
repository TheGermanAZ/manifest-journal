interface WeeklySummaryCardProps {
  summary: {
    weekStarting: string;
    weekEnding: string;
    entryCount: number;
    summary: {
      emotionalArc: string;
      alignmentTrendSummary: string;
      crossEntryPatterns: string;
      coachingMessage: string;
      suggestedFocus: string;
      averageAlignmentScore: number;
      dominantTone: string;
      neglectedDimensions: string[];
    };
  };
}

export function WeeklySummaryCard({ summary }: WeeklySummaryCardProps) {
  const { summary: s } = summary;
  const startDate = new Date(summary.weekStarting + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endDate = new Date(summary.weekEnding + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--ink)]">
          {startDate} — {endDate}
        </h3>
        <div className="flex items-center gap-2 text-xs text-[var(--ink-light)]">
          <span>{summary.entryCount} entries</span>
          <span>·</span>
          <span>Avg {s.averageAlignmentScore}/10</span>
          <span>·</span>
          <span className="capitalize">{s.dominantTone}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--ink-light)] font-medium mb-1">
            Emotional Arc
          </p>
          <p className="text-xs text-[var(--ink)] leading-relaxed">{s.emotionalArc}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--ink-light)] font-medium mb-1">
            Patterns
          </p>
          <p className="text-xs text-[var(--ink)] leading-relaxed">{s.crossEntryPatterns}</p>
        </div>

        <div className="border-l-2 border-[var(--vermillion)] pl-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--ink-light)] font-medium mb-1">
            Coach Says
          </p>
          <p className="text-xs text-[var(--ink)] leading-relaxed italic">{s.coachingMessage}</p>
        </div>

        {s.neglectedDimensions.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--ink-light)] font-medium mb-1">
              Focus Next Week
            </p>
            <p className="text-xs text-[var(--ink)]">{s.suggestedFocus}</p>
          </div>
        )}
      </div>
    </div>
  );
}
