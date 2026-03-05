interface PathCardProps {
  path: {
    _id: string;
    name: string;
    description: string;
    duration: number;
    category: string;
  };
  onStart: (pathId: string) => void;
  disabled?: boolean;
}

export function PathCard({ path, onStart, disabled }: PathCardProps) {
  return (
    <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--ink)]">{path.name}</h3>
        <span className="text-[10px] text-[var(--ink-light)]">
          {path.duration} days
        </span>
      </div>
      <p className="text-xs text-[var(--ink-light)]">{path.description}</p>
      <button
        onClick={() => onStart(path._id)}
        disabled={disabled}
        className="ink-cta py-1.5 px-4 text-xs self-start mt-1 disabled:opacity-40"
      >
        Start Path
      </button>
    </div>
  );
}
