import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { RadarChart } from "./RadarChart";

export function DimensionBreakdown() {
  const insights = useQuery(api.dashboard.dimensionInsights);
  if (!insights) return null;

  return (
    <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-4">
      <h2 className="text-sm font-medium text-[var(--ink)]">
        Dimension Balance
      </h2>

      <div className="flex items-center justify-center">
        <RadarChart
          data={insights.dimensions.map((d) => ({
            name: d.name,
            value: d.avgAlignmentScore,
          }))}
        />
      </div>

      {/* Dimension list */}
      <div className="flex flex-col gap-2">
        {insights.dimensions.map((dim) => (
          <div
            key={dim.name}
            className="flex items-center justify-between text-xs"
          >
            <span className="capitalize text-[var(--ink)]">{dim.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-[var(--ink-light)]">
                {dim.entryCount} entries
              </span>
              <span className="font-medium text-[var(--ink)]">
                {dim.avgAlignmentScore}/10
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Neglect callouts */}
      {insights.mostNeglected.length > 0 && (
        <div className="border-t border-[rgba(26,26,26,0.08)] pt-3">
          <p className="text-xs text-[var(--vermillion)]">
            Most neglected: {insights.mostNeglected.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
