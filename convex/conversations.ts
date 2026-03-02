import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const addTurn = mutation({
  args: {
    entryId: v.id("entries"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("conversationTurns")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .order("asc")
      .collect();
  },
});
