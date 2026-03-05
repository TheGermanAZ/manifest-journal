import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";

const moods = [
  { tone: "hopeful", emoji: "\u{1F331}", label: "Hopeful" },
  { tone: "anxious", emoji: "\u{1F630}", label: "Anxious" },
  { tone: "stuck", emoji: "\u{1FAA8}", label: "Stuck" },
  { tone: "clear", emoji: "\u{1F48E}", label: "Clear" },
  { tone: "resistant", emoji: "\u{1F6E1}\uFE0F", label: "Resistant" },
  { tone: "expansive", emoji: "\u2728", label: "Expansive" },
  { tone: "grief", emoji: "\u{1F327}\uFE0F", label: "Grief" },
  { tone: "excited", emoji: "\u26A1", label: "Excited" },
] as const;

export function MoodCheckIn() {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createCheckIn = useMutation(api.entries.createCheckIn);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await createCheckIn({
        selectedTone: selected as any,
        note: note.trim() || undefined,
      });
      navigate({ to: "/dashboard" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-[rgba(26,26,26,0.12)] bg-[rgba(255,255,255,0.5)] p-5 flex flex-col gap-4">
      <p className="text-sm text-[var(--ink-light)]">How are you feeling right now?</p>

      <div className="grid grid-cols-4 gap-2">
        {moods.map((mood) => (
          <button
            key={mood.tone}
            onClick={() => setSelected(mood.tone)}
            className={`flex flex-col items-center gap-1 p-3 border transition-all ${
              selected === mood.tone
                ? "border-[var(--ink)] bg-[rgba(26,26,26,0.04)]"
                : "border-[rgba(26,26,26,0.08)] hover:border-[var(--ink-light)]"
            }`}
          >
            <span className="text-xl">{mood.emoji}</span>
            <span className="text-[10px] text-[var(--ink-light)]">{mood.label}</span>
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note..."
        rows={3}
        className="w-full resize-none text-[var(--ink)] text-sm leading-relaxed bg-transparent border border-[rgba(26,26,26,0.08)] p-3 focus:outline-none focus:border-[var(--ink-light)] placeholder:text-[var(--ink-light)] placeholder:opacity-50"
      />

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!selected || isSubmitting}
          className="ink-cta py-2 px-5 text-sm disabled:opacity-40"
        >
          {isSubmitting ? "Saving..." : "Check in"}
        </button>
      </div>
    </div>
  );
}
