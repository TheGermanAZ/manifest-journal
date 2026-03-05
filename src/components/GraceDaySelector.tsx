import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function GraceDaySelector() {
  const user = useQuery(api.users.currentUser);
  const updatePrefs = useMutation(api.users.updatePreferences);
  const current = user?.preferences?.graceDaysPerWeek ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[var(--ink)]">Grace Days Per Week</label>
      <p className="text-sm text-[var(--ink-light)]">
        Allow missed days without breaking your streak
      </p>
      <div className="flex gap-0 border border-[rgba(26,26,26,0.12)]">
        {[0, 1, 2].map((n) => (
          <button
            key={n}
            onClick={() => updatePrefs({ graceDaysPerWeek: n })}
            className={`flex-1 py-2 text-base font-medium transition-colors ${
              current === n
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-transparent text-[var(--ink-light)] hover:text-[var(--ink)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
