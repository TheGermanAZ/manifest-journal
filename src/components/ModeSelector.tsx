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
            className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition ${
              isSelected
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
            }`}
          >
            <span className="block text-sm font-medium">{m.label}</span>
            <span
              className={`block text-xs mt-0.5 ${
                isSelected ? "text-stone-300" : "text-stone-400"
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
