// convex/entries.ts
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

async function requireAppUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q: any) =>
      q.eq("betterAuthId", authUser.userId)
    )
    .unique();
  if (!user) throw new Error("User not provisioned");
  return user._id;
}

async function getAppUserId(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q: any) =>
      q.eq("betterAuthId", authUser.userId)
    )
    .unique();
  return user?._id ?? null;
}

export const createEntry = mutation({
  args: {
    content: v.string(),
    mode: v.union(v.literal("open"), v.literal("guided"), v.literal("conversational")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    if (args.content.length > 50000) throw new Error("Content too long");
    return ctx.db.insert("entries", {
      userId,
      content: args.content,
      mode: args.mode,
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

export const recentEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 7);
  },
});
