interface InsightCardProps {
  type: "pattern" | "nudge" | "tone";
  title: string;
  content: string;
  badge?: string;
}

const typeStyles: Record<InsightCardProps["type"], string> = {
  pattern: "bg-blue-50 border-blue-100",
  nudge: "bg-amber-50 border-amber-100",
  tone: "bg-emerald-50 border-emerald-100",
};

export function InsightCard({ type, title, content, badge }: InsightCardProps) {
  return (
    <div className={`rounded-2xl border p-5 ${typeStyles[type]}`}>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {title}
        </p>
        {badge && (
          <span className="inline-block rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-stone-600">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-stone-700 leading-relaxed">{content}</p>
    </div>
  );
}
