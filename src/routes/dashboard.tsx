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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400 text-sm">
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
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-stone-900">Momentum</h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:border-stone-400"
          >
            Journal
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-stone-900">
              {stats.streak}
            </span>
            <span className="text-xs text-stone-400">day streak</span>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-stone-900">
              {stats.totalEntries}
            </span>
            <span className="text-xs text-stone-400">entries</span>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-stone-900 capitalize">
              {topTone ? topTone[0] : "--"}
            </span>
            <span className="text-xs text-stone-400">top tone</span>
          </div>
        </div>

        {/* Alignment trend */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-stone-700">
            Alignment Trend
          </h2>
          <AlignmentChart data={stats.alignmentTrend} />
        </div>

        {/* Emotional arc */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-stone-700">Emotional Arc</h2>
          {Object.keys(stats.toneCounts).length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">
              No emotional data yet
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.toneCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([tone, count]) => (
                  <span
                    key={tone}
                    className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium"
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
          className="text-sm text-stone-500 underline underline-offset-2 text-center hover:text-stone-700"
        >
          View &amp; edit dream profile
        </button>
      </div>
    </div>
  );
}
