interface InsightCardProps {
  type: "pattern" | "nudge" | "tone";
  title: string;
  content: string;
  badge?: string;
  onContinue?: (prompt: string) => void;
}

const typeStyles: Record<InsightCardProps["type"], string> = {
  pattern: "bg-blue-50 border-blue-100",
  nudge: "bg-amber-50 border-amber-100",
  tone: "bg-emerald-50 border-emerald-100",
};

export function InsightCard({ type, title, content, badge, onContinue }: InsightCardProps) {
  return (
    <div className={`border p-5 ${typeStyles[type]}`}>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-light)]">
          {title}
        </p>
        {badge && (
          <span className="inline-block rounded-full bg-white/70 px-2 py-0.5 text-sm font-medium text-stone-600">
            {badge}
          </span>
        )}
      </div>
      <p className="text-base text-[var(--ink)] leading-relaxed">{content}</p>
      {onContinue && (
        <button
          onClick={() => onContinue(content)}
          className="mt-3 text-sm text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors"
        >
          Continue this conversation
        </button>
      )}
    </div>
  );
}
