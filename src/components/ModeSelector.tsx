type JournalMode = "open" | "guided" | "conversational";

interface ModeSelectorProps {
  selected: JournalMode;
  onSelect: (mode: JournalMode) => void;
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

export function ModeSelector({ selected, onSelect }: ModeSelectorProps) {
  return (
    <div className="flex gap-2">
      {modes.map((m) => {
        const isSelected = m.value === selected;
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
            <span className="block text-sm font-medium">{m.label}</span>
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
    </div>
  );
}
