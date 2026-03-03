// convex/conversations.ts
import { mutation, query } from "./_generated/server";
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

export const addTurn = mutation({
  args: {
    entryId: v.id("entries"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) throw new Error("Not found");
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
