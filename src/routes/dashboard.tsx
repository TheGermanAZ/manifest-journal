import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { AlignmentChart } from "../components/AlignmentChart";
import { DimensionBreakdown } from "../components/DimensionBreakdown";
import { MoodCalendar } from "../components/MoodCalendar";
import { milestoneConfig } from "../lib/milestoneConfig";
import { WeeklySummaryCard } from "../components/WeeklySummaryCard";
import { ShareDialog } from "../components/ShareDialog";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  ),
});

function formatWritingTime(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1m";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function DashboardPage() {
  const stats = useQuery(api.dashboard.dashboardStats);
  const milestones = useQuery(api.milestones.allMilestones);
  const weeklySummaries = useQuery(api.weeklySummary.listWeeklySummaries);
  const navigate = useNavigate();
  const [showShare, setShowShare] = useState(false);

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
          <div className="flex gap-2">
            <button
              onClick={() => setShowShare(true)}
              className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
            >
              Share
            </button>
            <button
              onClick={() => navigate({ to: "/weekly" })}
              className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
            >
              Weekly
            </button>
            <button
              onClick={() => navigate({ to: "/" })}
              className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
            >
              Journal
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">
              {stats.streak}
            </span>
            <span className="text-xs text-[var(--ink-light)]">day streak</span>
            {stats.graceDaysPerWeek > 0 && (
              <div className="flex gap-1 mt-1" title={`${stats.graceDaysUsedThisWeek} of ${stats.graceDaysPerWeek} grace days used this week`}>
                {Array.from({ length: stats.graceDaysPerWeek }).map((_, i) => (
                  <span
                    key={i}
                    className={`inline-block w-2 h-2 rounded-full border border-[var(--ink)] ${
                      i < stats.graceDaysUsedThisWeek
                        ? "bg-[var(--ink)]"
                        : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            )}
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

        {/* Writing stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">
              {(stats.totalWords ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-[var(--ink-light)]">total words</span>
          </div>
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">
              {stats.avgWordCount ?? 0}
            </span>
            <span className="text-xs text-[var(--ink-light)]">avg words/entry</span>
          </div>
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">
              {formatWritingTime(stats.totalWritingTimeMs ?? 0)}
            </span>
            <span className="text-xs text-[var(--ink-light)]">writing time</span>
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

        {/* Mood calendar heatmap */}
        <MoodCalendar />

        {/* Dimension balance */}
        <DimensionBreakdown />

        {/* Latest weekly summary */}
        {weeklySummaries && weeklySummaries.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--ink)]">Latest Weekly Reflection</h2>
              <button
                onClick={() => navigate({ to: "/weekly" })}
                className="text-xs text-[var(--ink-light)] underline underline-offset-2 hover:text-[var(--vermillion)] transition-colors"
              >
                View all
              </button>
            </div>
            <WeeklySummaryCard summary={weeklySummaries[0]} />
          </div>
        )}

        {/* Milestones */}
        {milestones && milestones.length > 0 && (
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-3">
            <h2 className="text-sm font-medium text-[var(--ink)]">Milestones</h2>
            <div className="flex flex-wrap gap-2">
              {milestones.map((m) => {
                const config = milestoneConfig[m.type];
                return (
                  <span key={m._id} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                    {config?.icon ?? "\u2726"} {config?.title ?? m.type}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile link */}
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="text-sm text-[var(--ink-light)] underline underline-offset-2 text-center hover:text-[var(--vermillion)] transition-colors"
        >
          View &amp; edit dream profile
        </button>
      </div>

      {showShare && (
        <ShareDialog
          onClose={() => setShowShare(false)}
          variants={[
            { variant: "streak", data: { streak: stats.streak } },
            ...(topTone
              ? [{ variant: "tone" as const, data: { tone: topTone[0] } }]
              : []),
            ...(stats.alignmentTrend.length > 0
              ? [
                  {
                    variant: "alignment" as const,
                    data: {
                      alignmentScore:
                        stats.alignmentTrend[stats.alignmentTrend.length - 1]
                          ?.score ?? 0,
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
