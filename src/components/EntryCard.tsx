import { toneColors } from "../lib/toneColors";
import { BookmarkToggle } from "./BookmarkToggle";

interface EntryCardProps {
  entry: {
    _id: string;
    content: string;
    mode: string;
    _creationTime: number;
    wordCount?: number;
    bookmarked?: boolean;
    analysis?: {
      alignmentScore: number;
      emotionalTone: string;
      patternInsight: string;
      nudge: string;
      alignmentRationale: string;
      breakthroughScore?: number;
    };
  };
  onClick: () => void;
}

function scoreColorClass(score: number): string {
  if (score <= 3) return "bg-red-100 text-red-700";
  if (score <= 5) return "bg-yellow-100 text-yellow-700";
  if (score <= 7) return "bg-green-100 text-green-700";
  return "bg-emerald-100 text-emerald-700";
}

export function EntryCard({ entry, onClick }: EntryCardProps) {
  const date = new Date(entry._creationTime);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();

  const isCheckIn = entry.mode === "check-in";
  const preview = isCheckIn && !entry.content
    ? null
    : entry.content.length > 120
      ? entry.content.slice(0, 120) + "..."
      : entry.content;

  const analysis = entry.analysis;
  const toneClass =
    analysis?.emotionalTone && toneColors[analysis.emotionalTone]
      ? toneColors[analysis.emotionalTone]
      : "bg-stone-100 text-stone-600";

  const isBreakthrough =
    analysis?.breakthroughScore != null && analysis.breakthroughScore >= 7;

  return (
    <div className="relative w-full text-left bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] hover:border-[var(--ink)] transition-all">
      {/* Bookmark toggle in top-right */}
      <div className="absolute top-2 right-2 z-10">
        <BookmarkToggle
          entryId={entry._id}
          bookmarked={!!entry.bookmarked}
        />
      </div>

      <button
        type="button"
        onClick={onClick}
        className="w-full text-left p-4 flex gap-4 items-start"
      >
        {/* Date column */}
        <div className="flex flex-col items-center min-w-[40px]">
          <span className="text-xs uppercase text-[var(--ink-light)] font-medium">
            {month}
          </span>
          <span className="text-lg font-semibold text-[var(--ink)]">{day}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {isCheckIn && !entry.content ? (
            <p className="text-sm text-[var(--ink-light)] italic">Mood check-in</p>
          ) : (
            <p className="text-sm text-[var(--ink)] leading-relaxed pr-6">{preview}</p>
          )}

          {entry.wordCount !== undefined && (
            <span className="text-xs text-[var(--ink-light)] opacity-60">
              {entry.wordCount} words
            </span>
          )}

          {analysis && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Alignment score badge */}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${scoreColorClass(analysis.alignmentScore)}`}
              >
                {analysis.alignmentScore}/10
              </span>

              {/* Emotional tone pill */}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}
              >
                {analysis.emotionalTone}
              </span>

              {/* Breakthrough badge */}
              {isBreakthrough && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                  Breakthrough
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
