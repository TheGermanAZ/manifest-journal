const icons: Record<string, string> = {
  career: "\uD83D\uDCBC",
  relationships: "\u2764\uFE0F",
  health: "\uD83C\uDF3F",
  wealth: "\u2728",
  creative: "\uD83C\uDFA8",
};

interface CategoryCardProps {
  category: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function CategoryCard({
  category,
  label,
  value,
  onChange,
}: CategoryCardProps) {
  return (
    <div className="border border-[rgba(26,26,26,0.12)] bg-[rgba(255,255,255,0.5)] p-4">
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
        <span>{icons[category] ?? ""}</span>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Describe your ideal ${label.toLowerCase()}...`}
        rows={3}
        className="w-full resize-y border border-[rgba(26,26,26,0.15)] bg-transparent px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-light)] focus:outline-none focus:border-[var(--ink)] transition-colors"
      />
    </div>
  );
}
