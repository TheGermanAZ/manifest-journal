// convex/conversations.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAppUser, getAppUserId } from "./lib/authHelper";
import { NotFoundError } from "./lib/errors";

export const addTurn = mutation({
  args: {
    entryId: v.id("entries"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) throw new NotFoundError("Entry");
    return ctx.db.insert("conversationTurns", {
      entryId: args.entryId,
      userId,
      role: args.role,
      content: args.content,
    });
  },
});

export const getTurns = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) return [];
    return ctx.db
      .query("conversationTurns")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .order("asc")
      .collect();
  },
});
