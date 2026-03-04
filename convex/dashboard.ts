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

  // Deduplicate to unique calendar days (entries are already sorted desc)
  const uniqueDays: Date[] = [];
  for (const entry of entries) {
    const d = new Date(entry._creationTime);
    d.setHours(0, 0, 0, 0);
    if (uniqueDays.length === 0 || uniqueDays[uniqueDays.length - 1].getTime() !== d.getTime()) {
      uniqueDays.push(d);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ONE_DAY = 1000 * 60 * 60 * 24;

  // The most recent journaled day must be today or yesterday to have an active streak
  const gapToMostRecent = (today.getTime() - uniqueDays[0].getTime()) / ONE_DAY;
  if (gapToMostRecent > 1) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = (uniqueDays[i - 1].getTime() - uniqueDays[i].getTime()) / ONE_DAY;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
