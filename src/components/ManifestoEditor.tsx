interface ManifestoEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ManifestoEditor({ value, onChange }: ManifestoEditorProps) {
  const wordCount = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
  const isMinReached = wordCount >= 200;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="My ideal life looks like... (write freely, 200–1000 words)"
        rows={12}
        className="w-full resize-y border border-[rgba(26,26,26,0.15)] bg-transparent px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-light)] focus:outline-none focus:border-[var(--ink)] transition-colors"
      />
      <div className="flex items-center gap-1.5 text-sm">
        {isMinReached ? (
          <>
            <span className="text-green-600">&#10003;</span>
            <span className="text-[var(--ink-light)]">{wordCount} words</span>
          </>
        ) : (
          <span className="text-amber-600">
            {wordCount} words ({200 - wordCount} more to go)
          </span>
        )}
      </div>
    </div>
  );
}
