// convex/dashboard.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAppUserId } from "./lib/authHelper";

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    const graceDaysPerWeek = user?.preferences?.graceDaysPerWeek ?? 0;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(30);

    const { streak, graceDaysUsedThisWeek } = calculateStreak(entries, graceDaysPerWeek);
    const last7 = entries.slice(0, 7).reverse();
    const alignmentTrend = last7
      .filter((e) => e.analysis && e.analysis.alignmentScore > 0)
      .map((e) => ({
        date: new Date(e._creationTime).toLocaleDateString("en-US", { weekday: "short" }),
        score: e.analysis!.alignmentScore,
      }));

    const toneCounts: Record<string, number> = {};
    let totalWords = 0;
    let totalWritingTimeMs = 0;
    entries.forEach((e) => {
      if (e.analysis?.emotionalTone) {
        toneCounts[e.analysis.emotionalTone] = (toneCounts[e.analysis.emotionalTone] ?? 0) + 1;
      }
      totalWords += (e as any).wordCount ?? 0;
      totalWritingTimeMs += (e as any).writingDurationMs ?? 0;
    });

    const totalEntries = entries.length;
    const avgWordCount = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0;

    return { streak, graceDaysUsedThisWeek, graceDaysPerWeek, alignmentTrend, toneCounts, totalEntries, totalWords, avgWordCount, totalWritingTimeMs };
  },
});

export const dimensionInsights = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    const dimensionScores: Record<string, { totalAlignment: number; totalRelevance: number; count: number }> = {};
    const allDimensions = ["career", "relationships", "health", "wealth", "creative"];

    for (const dim of allDimensions) {
      dimensionScores[dim] = { totalAlignment: 0, totalRelevance: 0, count: 0 };
    }

    for (const entry of entries) {
      if (entry.analysis?.dimensions) {
        for (const dim of entry.analysis.dimensions) {
          if (dimensionScores[dim.name]) {
            dimensionScores[dim.name].totalAlignment += dim.alignmentScore;
            dimensionScores[dim.name].totalRelevance += dim.relevance;
            dimensionScores[dim.name].count++;
          }
        }
      }
    }

    const dimensions = allDimensions.map((name) => {
      const data = dimensionScores[name];
      return {
        name,
        avgAlignmentScore: data.count > 0 ? Math.round((data.totalAlignment / data.count) * 10) / 10 : 0,
        avgRelevance: data.count > 0 ? Math.round((data.totalRelevance / data.count) * 10) / 10 : 0,
        entryCount: data.count,
      };
    });

    // Find most frequently neglected
    const neglectCounts: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.analysis?.neglectedDimensions) {
        for (const dim of entry.analysis.neglectedDimensions) {
          neglectCounts[dim] = (neglectCounts[dim] ?? 0) + 1;
        }
      }
    }

    const mostNeglected = Object.entries(neglectCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([name]) => name);

    return { dimensions, mostNeglected };
  },
});

export function calculateStreak(
  entries: Array<{ _creationTime: number }>,
  graceDaysPerWeek: number = 0
): { streak: number; graceDaysUsedThisWeek: number } {
  if (entries.length === 0) return { streak: 0, graceDaysUsedThisWeek: 0 };

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
  if (gapToMostRecent > 1) return { streak: 0, graceDaysUsedThisWeek: 0 };

  // Helper: get ISO week key for a date
  function getISOWeek(d: Date): string {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / ONE_DAY - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${date.getFullYear()}-W${weekNum}`;
  }

  let streak = 1;
  const graceUsedByWeek: Record<string, number> = {};

  // Track grace usage for the most recent day's week
  const currentWeekKey = getISOWeek(uniqueDays[0]);

  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = (uniqueDays[i - 1].getTime() - uniqueDays[i].getTime()) / ONE_DAY;
    if (diff === 1) {
      streak++;
    } else if (diff === 2 && graceDaysPerWeek > 0) {
      // 1-day gap - check if we can use a grace day
      const gapDay = new Date(uniqueDays[i].getTime() + ONE_DAY);
      const weekKey = getISOWeek(gapDay);
      const used = graceUsedByWeek[weekKey] ?? 0;
      if (used < graceDaysPerWeek) {
        graceUsedByWeek[weekKey] = used + 1;
        streak++; // Gap bridged by grace day
      } else {
        break; // No more grace days this week
      }
    } else {
      break;
    }
  }

  // Count grace days used in the current week
  const currentWeekGraceUsed = graceUsedByWeek[currentWeekKey] ?? 0;

  return { streak, graceDaysUsedThisWeek: currentWeekGraceUsed };
}

export const calendarData = query({
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Group entries by day
    const dayMap: Record<
      string,
      { tones: string[]; alignmentScores: number[]; count: number }
    > = {};

    for (const entry of entries) {
      const d = new Date(entry._creationTime);
      if (d.getFullYear() !== args.year || d.getMonth() + 1 !== args.month)
        continue;

      const dayKey = d.getDate().toString();
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { tones: [], alignmentScores: [], count: 0 };
      }
      dayMap[dayKey].count++;
      if (entry.analysis?.emotionalTone) {
        dayMap[dayKey].tones.push(entry.analysis.emotionalTone);
      }
      if (entry.analysis?.alignmentScore) {
        dayMap[dayKey].alignmentScores.push(entry.analysis.alignmentScore);
      }
    }

    // Compute dominant tone and avg alignment per day
    const days: Record<
      string,
      { dominantTone: string; avgAlignment: number; count: number }
    > = {};
    for (const [day, data] of Object.entries(dayMap)) {
      const toneCounts: Record<string, number> = {};
      for (const tone of data.tones) {
        toneCounts[tone] = (toneCounts[tone] ?? 0) + 1;
      }
      const dominantTone =
        Object.entries(toneCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ??
        "clear";
      const avgAlignment =
        data.alignmentScores.length > 0
          ? Math.round(
              (data.alignmentScores.reduce((a, b) => a + b, 0) /
                data.alignmentScores.length) *
                10,
            ) / 10
          : 0;
      days[day] = { dominantTone, avgAlignment, count: data.count };
    }

    return { year: args.year, month: args.month, days };
  },
});
