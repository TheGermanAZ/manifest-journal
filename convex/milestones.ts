import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAppUserId } from "./lib/authHelper";
import { getOpenAI } from "./lib/openai";
import { createLogger } from "./lib/logger";
import { formatError } from "./lib/errors";

export interface MilestoneEntry {
  _creationTime: number;
  wordCount?: number;
  analysis?: {
    alignmentScore: number;
    emotionalTone?: string;
  } | null;
}

/** Pure function: evaluate which milestones should be awarded.
 *  Separated from the Convex handler for testability. */
export function evaluateMilestones(
  entries: MilestoneEntry[],
  achievedTypes: Set<string>,
): string[] {
  const newMilestones: string[] = [];

  // First entry
  if (entries.length >= 1 && !achievedTypes.has("first_entry")) {
    newMilestones.push("first_entry");
  }

  // Volume milestones
  if (entries.length >= 50 && !achievedTypes.has("volume_50")) newMilestones.push("volume_50");
  if (entries.length >= 100 && !achievedTypes.has("volume_100")) newMilestones.push("volume_100");

  // Word count milestone
  const totalWords = entries.reduce((sum, e) => sum + (e.wordCount ?? 0), 0);
  if (totalWords >= 10000 && !achievedTypes.has("words_10k")) newMilestones.push("words_10k");

  // Streak milestones
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
  let streak = 0;
  if (uniqueDays.length > 0) {
    const gap = (today.getTime() - uniqueDays[0].getTime()) / ONE_DAY;
    if (gap <= 1) {
      streak = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const diff = (uniqueDays[i - 1].getTime() - uniqueDays[i].getTime()) / ONE_DAY;
        if (diff === 1) streak++;
        else break;
      }
    }
  }

  if (streak >= 7 && !achievedTypes.has("streak_7")) newMilestones.push("streak_7");
  if (streak >= 30 && !achievedTypes.has("streak_30")) newMilestones.push("streak_30");
  if (streak >= 100 && !achievedTypes.has("streak_100")) newMilestones.push("streak_100");
  if (streak >= 365 && !achievedTypes.has("streak_365")) newMilestones.push("streak_365");

  // Alignment sustained: 5 consecutive entries with alignmentScore >= 7
  if (!achievedTypes.has("alignment_sustained")) {
    const analyzed = entries.filter((e) => e.analysis?.alignmentScore != null);
    let consecutive = 0;
    for (const entry of analyzed) {
      if (entry.analysis!.alignmentScore >= 7) {
        consecutive++;
        if (consecutive >= 5) break;
      } else {
        consecutive = 0;
      }
    }
    if (consecutive >= 5) newMilestones.push("alignment_sustained");
  }

  // Emotional shift: recent entry is hopeful/expansive/clear after a previous stuck/anxious
  if (!achievedTypes.has("emotional_shift") && entries.length >= 3) {
    const recentTones = entries.slice(0, 5).map((e) => e.analysis?.emotionalTone).filter(Boolean);
    const positive = ["hopeful", "expansive", "clear", "excited"];
    const negative = ["stuck", "anxious", "resistant", "grief"];
    const hasRecentPositive = recentTones.length > 0 && positive.includes(recentTones[0]!);
    const hadNegative = recentTones.some((t) => negative.includes(t!));
    if (hasRecentPositive && hadNegative) newMilestones.push("emotional_shift");
  }

  return newMilestones;
}

// Check and award milestones after each entry analysis
export const checkMilestones = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const existingMilestones = await ctx.db
      .query("milestones")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const achieved = new Set(existingMilestones.map((m) => m.type));
    const newMilestones = evaluateMilestones(entries, achieved);

    // Insert new milestones
    for (const type of newMilestones) {
      const milestoneId = await ctx.db.insert("milestones", {
        userId: args.userId,
        type,
        achievedAt: Date.now(),
        seen: false,
      });
      // Schedule AI celebration message
      await ctx.scheduler.runAfter(0, internal.milestones.generateCelebration, {
        milestoneId,
        type,
      });
    }
  },
});

// Generate a celebratory AI message for a milestone
export const generateCelebration = internalAction({
  args: { milestoneId: v.id("milestones"), type: v.string() },
  handler: async (ctx, args) => {
    const log = createLogger("milestones.generateCelebration", {
      milestoneId: args.milestoneId,
      type: args.type,
    });
    try {
      const response = await log.time("openrouter call", () => getOpenAI().chat.completions.create({
        model: "google/gemini-3.1-flash-lite-preview",
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content: "You are a warm, celebratory manifestation coach. Generate a brief celebration message (2-3 sentences max) for a journaling milestone. Be genuine and encouraging, not cheesy.",
          },
          {
            role: "user",
            content: `The user just achieved the "${args.type.replace(/_/g, " ")}" milestone. Write a brief, warm celebration message.`,
          },
        ],
      }));
      const message = response.choices[0]?.message?.content?.trim() ?? "What an incredible milestone! Keep going.";
      await ctx.runMutation(internal.milestones.updateCelebrationMessage, {
        milestoneId: args.milestoneId,
        aiMessage: message,
      });
      log.done();
    } catch (err) {
      log.error("celebration generation failed, using fallback", {
        error: formatError(err),
      });
      await ctx.runMutation(internal.milestones.updateCelebrationMessage, {
        milestoneId: args.milestoneId,
        aiMessage: "What an incredible milestone! Your consistency is building something extraordinary.",
      });
    }
  },
});

export const updateCelebrationMessage = internalMutation({
  args: { milestoneId: v.id("milestones"), aiMessage: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.milestoneId, { aiMessage: args.aiMessage });
  },
});

export const unseenMilestones = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("milestones")
      .withIndex("by_user_seen", (q) =>
        q.eq("userId", userId).eq("seen", false),
      )
      .order("desc")
      .collect();
  },
});

export const markMilestoneSeen = mutation({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return;
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || milestone.userId !== userId) return;
    await ctx.db.patch(args.milestoneId, { seen: true });
  },
});

export const allMilestones = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("milestones")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
