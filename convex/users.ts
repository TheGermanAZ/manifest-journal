// convex/users.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthId", authUser.userId)
      )
      .unique();

    if (existing) return existing._id;

    return ctx.db.insert("users", {
      betterAuthId: authUser.userId,
      name: authUser.user?.name ?? undefined,
    });
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;

    return ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthId", authUser.userId)
      )
      .unique();
  },
});

export const updateDreamProfile = mutation({
  args: {
    manifesto: v.string(),
    categories: v.object({
      career: v.string(),
      relationships: v.string(),
      health: v.string(),
      wealth: v.string(),
      creative: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthId", authUser.userId)
      )
      .unique();
    if (!user) throw new Error("User not found");

    if (args.manifesto.length > 5000) throw new Error("Manifesto too long");
    for (const [key, value] of Object.entries(args.categories)) {
      if (value.length > 2000) throw new Error(`Category ${key} too long`);
    }

    await ctx.db.patch(user._id, {
      dreamProfile: {
        manifesto: args.manifesto,
        categories: args.categories,
      },
    });
  },
});
