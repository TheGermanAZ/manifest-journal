import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { AlignmentChart } from "../components/AlignmentChart";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  ),
});

function DashboardPage() {
  const stats = useQuery(api.dashboard.dashboardStats);
  const navigate = useNavigate();

  if (stats === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--ink-light)] text-sm">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (stats === null) return null;

  const topTone = Object.entries(stats.toneCounts).sort(
    ([, a], [, b]) => b - a,
  )[0];

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="display-title font-normal text-lg text-[var(--ink)]">Momentum</h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
          >
            Journal
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">
              {stats.streak}
            </span>
            <span className="text-xs text-[var(--ink-light)]">day streak</span>
          </div>
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">
              {stats.totalEntries}
            </span>
            <span className="text-xs text-[var(--ink-light)]">entries</span>
          </div>
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)] capitalize">
              {topTone ? topTone[0] : "--"}
            </span>
            <span className="text-xs text-[var(--ink-light)]">top tone</span>
          </div>
        </div>

        {/* Alignment trend */}
        <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-[var(--ink)]">
            Alignment Trend
          </h2>
          <AlignmentChart data={stats.alignmentTrend} />
        </div>

        {/* Emotional arc */}
        <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-[var(--ink)]">Emotional Arc</h2>
          {Object.keys(stats.toneCounts).length === 0 ? (
            <p className="text-sm text-[var(--ink-light)] text-center py-4">
              No emotional data yet
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.toneCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([tone, count]) => (
                  <span
                    key={tone}
                    className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-medium"
                  >
                    {tone} x {count}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Profile link */}
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="text-sm text-[var(--ink-light)] underline underline-offset-2 text-center hover:text-[var(--vermillion)] transition-colors"
        >
          View &amp; edit dream profile
        </button>
      </div>
    </div>
  );
}
