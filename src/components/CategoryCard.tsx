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
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-900">
        <span>{icons[category] ?? ""}</span>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Describe your ideal ${label.toLowerCase()}...`}
        rows={3}
        className="w-full resize-y rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
      />
    </div>
  );
}
