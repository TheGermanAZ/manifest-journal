interface ManifestoEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ManifestoEditor({ value, onChange }: ManifestoEditorProps) {
  const wordCount = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Anything else about your dream life that doesn't fit into the five pillars? Write as much or as little as you'd like..."
        rows={8}
        className="w-full resize-y border border-[rgba(26,26,26,0.15)] bg-transparent px-4 py-3 text-base text-[var(--ink)] placeholder:text-[var(--ink-light)] focus:outline-none focus:border-[var(--ink)] transition-colors"
      />
      {wordCount > 0 && (
        <span className="text-base text-[var(--ink-light)]">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
      )}
    </div>
  );
}
