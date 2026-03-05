import { query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAppUserId } from "./lib/authHelper";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const generateWeeklySummary = internalAction({
  args: {
    userId: v.id("users"),
    weekStarting: v.string(),
    weekEnding: v.string(),
  },
  handler: async (ctx, args) => {
    const startMs = new Date(args.weekStarting).getTime();
    const endMs = new Date(args.weekEnding).getTime() + 86400000; // include end day

    const entries = await ctx.runQuery(internal.entries.entriesInDateRange, {
      userId: args.userId,
      startMs,
      endMs,
    });

    if (entries.length === 0) return;

    // Aggregate data
    const tones: string[] = [];
    const scores: number[] = [];
    const neglected: string[] = [];

    const entrySummaries = entries
      .map((e: any) => {
        if (e.analysis?.emotionalTone) tones.push(e.analysis.emotionalTone);
        if (e.analysis?.alignmentScore) scores.push(e.analysis.alignmentScore);
        if (e.analysis?.neglectedDimensions)
          neglected.push(...e.analysis.neglectedDimensions);
        return `[${new Date(e._creationTime).toLocaleDateString()}] Tone: ${e.analysis?.emotionalTone ?? "unknown"}, Alignment: ${e.analysis?.alignmentScore ?? "N/A"}\n${e.content.slice(0, 200)}`;
      })
      .join("\n\n---\n\n");

    const avgAlignment =
      scores.length > 0
        ? Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
          ) / 10
        : 0;

    // Find dominant tone
    const toneCounts: Record<string, number> = {};
    for (const t of tones) toneCounts[t] = (toneCounts[t] ?? 0) + 1;
    const dominantTone =
      Object.entries(toneCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ??
      "clear";

    // Find neglected dimensions
    const neglectCounts: Record<string, number> = {};
    for (const n of neglected) neglectCounts[n] = (neglectCounts[n] ?? 0) + 1;
    const topNeglected = Object.entries(neglectCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([name]) => name);

    try {
      const response = await openai.chat.completions.create({
        model: "google/gemini-3.1-flash-lite-preview",
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "You are a manifestation coach reviewing a week of journal entries. Provide a thoughtful week-in-review analysis.",
          },
          {
            role: "user",
            content: `Review this week's ${entries.length} journal entries (${args.weekStarting} to ${args.weekEnding}):

${entrySummaries}

Return ONLY valid JSON:
{
  "emotionalArc": "2-3 sentences describing the emotional journey through the week",
  "alignmentTrendSummary": "1-2 sentences about how alignment scores changed",
  "crossEntryPatterns": "2-3 sentences about recurring themes, beliefs, or concerns across entries",
  "coachingMessage": "2-3 sentences of direct coaching advice for next week",
  "suggestedFocus": "One specific life dimension to focus on next week, max 30 words"
}`,
          },
        ],
      });

      const text = response.choices[0]?.message?.content ?? "{}";
      const cleaned = text
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          emotionalArc: "Unable to analyze this week's entries.",
          alignmentTrendSummary: "Insufficient data.",
          crossEntryPatterns: "Keep journaling to reveal patterns.",
          coachingMessage: "Stay consistent with your practice.",
          suggestedFocus: "Continue exploring all dimensions.",
        };
      }

      await ctx.runMutation(internal.weeklySummary.storeWeeklySummary, {
        userId: args.userId,
        weekStarting: args.weekStarting,
        weekEnding: args.weekEnding,
        entryCount: entries.length,
        summary: {
          emotionalArc: parsed.emotionalArc ?? "",
          alignmentTrendSummary: parsed.alignmentTrendSummary ?? "",
          crossEntryPatterns: parsed.crossEntryPatterns ?? "",
          coachingMessage: parsed.coachingMessage ?? "",
          suggestedFocus: parsed.suggestedFocus ?? "",
          averageAlignmentScore: avgAlignment,
          dominantTone,
          neglectedDimensions: topNeglected,
        },
      });
    } catch {
      // Silently fail - will retry next week
    }
  },
});

export const storeWeeklySummary = internalMutation({
  args: {
    userId: v.id("users"),
    weekStarting: v.string(),
    weekEnding: v.string(),
    entryCount: v.number(),
    summary: v.object({
      emotionalArc: v.string(),
      alignmentTrendSummary: v.string(),
      crossEntryPatterns: v.string(),
      coachingMessage: v.string(),
      suggestedFocus: v.string(),
      averageAlignmentScore: v.number(),
      dominantTone: v.string(),
      neglectedDimensions: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("weeklySummaries", args);
  },
});

export const processAllUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all users
    const users = await ctx.runQuery(internal.weeklySummary.getAllUsers);

    const now = new Date();
    const weekEnding = new Date(now);
    weekEnding.setDate(weekEnding.getDate() - weekEnding.getDay()); // Last Sunday
    const weekStarting = new Date(weekEnding);
    weekStarting.setDate(weekStarting.getDate() - 6); // Previous Monday

    const weekStartStr = weekStarting.toISOString().split("T")[0];
    const weekEndStr = weekEnding.toISOString().split("T")[0];

    for (const userId of users) {
      await ctx.scheduler.runAfter(
        0,
        internal.weeklySummary.generateWeeklySummary,
        {
          userId,
          weekStarting: weekStartStr,
          weekEnding: weekEndStr,
        },
      );
    }
  },
});

export const getAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => u._id);
  },
});

export const listWeeklySummaries = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("weeklySummaries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getWeeklySummary = query({
  args: { summaryId: v.id("weeklySummaries") },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;
    const summary = await ctx.db.get(args.summaryId);
    if (!summary || summary.userId !== userId) return null;
    return summary;
  },
});
