type JournalMode = "open" | "guided" | "conversational";

interface ModeSelectorProps {
  selected: JournalMode;
  onSelect: (mode: JournalMode) => void;
  pathInfo?: { currentDay: number; totalDays: number } | null;
  showCheckIn?: boolean;
  onCheckInToggle?: () => void;
}

const modes: { value: JournalMode; label: string; description: string }[] = [
  { value: "open", label: "Open Canvas", description: "Write freely" },
  { value: "guided", label: "Guided", description: "AI gives you a prompt" },
  {
    value: "conversational",
    label: "Conversational",
    description: "Back-and-forth with coach",
  },
];

export function ModeSelector({ selected, onSelect, pathInfo, showCheckIn, onCheckInToggle }: ModeSelectorProps) {
  return (
    <div className="flex gap-2">
      {modes.map((m) => {
        const isSelected = m.value === selected && !showCheckIn;
        const showPathBadge = m.value === "guided" && pathInfo;
        return (
          <button
            key={m.value}
            onClick={() => onSelect(m.value)}
            className={`flex-1 border px-3 py-2.5 text-left transition-colors ${
              isSelected
                ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]"
                : "bg-transparent text-[var(--ink)] border-[rgba(26,26,26,0.15)] hover:border-[var(--ink)]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-medium">{m.label}</span>
              {showPathBadge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? "bg-[var(--vermillion)] text-[var(--paper)]"
                      : "bg-[rgba(194,59,34,0.1)] text-[var(--vermillion)]"
                  }`}
                >
                  Day {pathInfo.currentDay}/{pathInfo.totalDays}
                </span>
              )}
            </span>
            <span
              className={`block text-xs mt-0.5 ${
                isSelected ? "opacity-50" : "text-[var(--ink-light)]"
              }`}
            >
              {m.description}
            </span>
          </button>
        );
      })}
      {onCheckInToggle && (
        <button
          onClick={onCheckInToggle}
          className={`flex-1 border px-3 py-2.5 text-left transition-colors ${
            showCheckIn
              ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]"
              : "bg-transparent text-[var(--ink)] border-[rgba(26,26,26,0.15)] hover:border-[var(--ink)]"
          }`}
        >
          <span className="text-sm font-medium">Quick check-in</span>
          <span
            className={`block text-xs mt-0.5 ${
              showCheckIn ? "opacity-50" : "text-[var(--ink-light)]"
            }`}
          >
            Log your mood
          </span>
        </button>
      )}
    </div>
  );
}
