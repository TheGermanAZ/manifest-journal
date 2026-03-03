// convex/dashboard.ts
import { query } from "./_generated/server";
import { getAppUserId } from "./lib/authHelper";

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(30);

    const streak = calculateStreak(entries);
    const last7 = entries.slice(0, 7).reverse();
    const alignmentTrend = last7
      .filter((e) => e.analysis)
      .map((e) => ({
        date: new Date(e._creationTime).toLocaleDateString("en-US", { weekday: "short" }),
        score: e.analysis!.alignmentScore,
      }));

    const toneCounts: Record<string, number> = {};
    entries.forEach((e) => {
      if (e.analysis?.emotionalTone) {
        toneCounts[e.analysis.emotionalTone] = (toneCounts[e.analysis.emotionalTone] ?? 0) + 1;
      }
    });

    return { streak, alignmentTrend, toneCounts, totalEntries: entries.length };
  },
});

function calculateStreak(entries: Array<{ _creationTime: number }>): number {
  if (entries.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let current = today;

  for (const entry of entries) {
    const entryDate = new Date(entry._creationTime);
    entryDate.setHours(0, 0, 0, 0);
    const diff = (current.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1) {
      streak++;
      current = entryDate;
    } else {
      break;
    }
  }
  return streak;
}
