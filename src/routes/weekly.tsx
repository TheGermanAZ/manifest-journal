import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { WeeklySummaryCard } from "../components/WeeklySummaryCard";

export const Route = createFileRoute("/weekly")({
  component: () => (
    <AuthGuard>
      <WeeklyPage />
    </AuthGuard>
  ),
});

function WeeklyPage() {
  const summaries = useQuery(api.weeklySummary.listWeeklySummaries);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="display-title font-normal text-lg text-[var(--ink)]">
            Weekly Reflections
          </h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
          >
            Journal
          </button>
        </div>

        {summaries === undefined ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-[var(--ink-light)] text-sm">Loading...</div>
          </div>
        ) : summaries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[var(--ink-light)] text-sm">
              No weekly summaries yet. They generate automatically each Monday.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {summaries.map((s) => (
              <WeeklySummaryCard key={s._id} summary={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
