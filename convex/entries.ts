import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const createEntry = mutation({
  args: {
    content: v.string(),
    mode: v.union(v.literal("open"), v.literal("guided"), v.literal("conversational")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return ctx.db.insert("entries", {
      userId,
      content: args.content,
      mode: args.mode,
    });
  },
});

export const updateEntryAnalysis = mutation({
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
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.entryId, { analysis: args.analysis });
  },
});

export const listEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) return null;
    return entry;
  },
});

export const recentEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 7);
  },
});
