// convex/entries.ts
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAppUser, getAppUserId } from "./lib/authHelper";

export const createEntry = mutation({
  args: {
    content: v.string(),
    mode: v.union(
      v.literal("open"),
      v.literal("guided"),
      v.literal("conversational"),
      v.literal("check-in"),
    ),
    writingDurationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    if (args.content.length > 50000) throw new Error("Content too long");
    const wordCount = args.content.trim().split(/\s+/).filter(Boolean).length;
    const entryId = await ctx.db.insert("entries", {
      userId,
      content: args.content,
      mode: args.mode,
      wordCount,
      ...(args.writingDurationMs !== undefined && {
        writingDurationMs: args.writingDurationMs,
      }),
    });

    // Schedule embedding generation
    await ctx.scheduler.runAfter(0, internal.ai.embedAndStoreEntry, {
      entryId,
      content: args.content,
    });

    return entryId;
  },
});

export const createCheckIn = mutation({
  args: {
    selectedTone: v.union(
      v.literal("hopeful"), v.literal("anxious"), v.literal("stuck"),
      v.literal("clear"), v.literal("resistant"), v.literal("expansive"),
      v.literal("grief"), v.literal("excited")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    const content = args.note?.trim() || "";
    const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;

    return ctx.db.insert("entries", {
      userId,
      content,
      mode: "check-in" as const,
      wordCount,
      analysis: {
        patternInsight: "",
        nudge: "",
        emotionalTone: args.selectedTone,
        alignmentScore: 0,
        alignmentRationale: "Quick check-in",
      },
    });
  },
});

export const updateEntryAnalysis = internalMutation({
  args: {
    entryId: v.id("entries"),
    analysis: v.object({
      patternInsight: v.string(),
      nudge: v.string(),
      emotionalTone: v.union(
        v.literal("hopeful"), v.literal("anxious"), v.literal("stuck"),
        v.literal("clear"), v.literal("resistant"), v.literal("expansive"),
        v.literal("grief"), v.literal("excited")
      ),
      alignmentScore: v.number(),
      alignmentRationale: v.string(),
      breakthroughScore: v.optional(v.number()),
      dimensions: v.optional(v.array(v.object({
        name: v.string(),
        relevance: v.number(),
        alignmentScore: v.number(),
      }))),
      neglectedDimensions: v.optional(v.array(v.string())),
      dimensionPrompt: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { analysis: args.analysis });
  },
});

export const listEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(args.limit ?? 50, 100));
  },
});

export const getEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) return null;
    return entry;
  },
});

export const toggleBookmark = mutation({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.entryId, { bookmarked: !entry.bookmarked });
  },
});

export const listBookmarkedEntries = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return entries.filter(
      (e) =>
        e.bookmarked ||
        (e.analysis?.breakthroughScore != null &&
          e.analysis.breakthroughScore >= 7)
    );
  },
});

export const recentEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(args.limit ?? 7, 50));
  },
});

export const entriesInDateRange = internalQuery({
  args: {
    userId: v.id("users"),
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return entries.filter(
      (e) => e._creationTime >= args.startMs && e._creationTime <= args.endMs,
    );
  },
});
