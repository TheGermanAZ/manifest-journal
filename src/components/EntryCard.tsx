interface EntryCardProps {
  entry: {
    _id: string;
    content: string;
    mode: string;
    _creationTime: number;
    analysis?: {
      alignmentScore: number;
      emotionalTone: string;
      patternInsight: string;
      nudge: string;
      alignmentRationale: string;
    };
  };
  onClick: () => void;
}

const toneColors: Record<string, string> = {
  hopeful: "bg-emerald-100 text-emerald-700",
  anxious: "bg-orange-100 text-orange-700",
  stuck: "bg-slate-100 text-slate-700",
  clear: "bg-blue-100 text-blue-700",
  resistant: "bg-red-100 text-red-700",
  expansive: "bg-violet-100 text-violet-700",
  grief: "bg-stone-100 text-stone-700",
  excited: "bg-yellow-100 text-yellow-700",
};

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

  const preview =
    entry.content.length > 120
      ? entry.content.slice(0, 120) + "..."
      : entry.content;

  const analysis = entry.analysis;
  const toneClass =
    analysis?.emotionalTone && toneColors[analysis.emotionalTone]
      ? toneColors[analysis.emotionalTone]
      : "bg-stone-100 text-stone-600";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white border border-stone-200 rounded-2xl p-4 flex gap-4 items-start hover:border-stone-300 hover:shadow-sm transition-all"
    >
      {/* Date column */}
      <div className="flex flex-col items-center min-w-[40px]">
        <span className="text-xs uppercase text-stone-400 font-medium">
          {month}
        </span>
        <span className="text-lg font-semibold text-stone-900">{day}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <p className="text-sm text-stone-700 leading-relaxed">{preview}</p>

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
          </div>
        )}
      </div>
    </button>
  );
}
