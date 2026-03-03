// convex/users.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { requireAppUser } from "./lib/authHelper";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    // getAuthUser throws if not authenticated — no null check needed

    const existing = await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthId", authUser._id)
      )
      .unique();

    if (existing) return existing._id;

    return ctx.db.insert("users", {
      betterAuthId: authUser._id,
      name: authUser.name ?? undefined,
    });
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) return null;

    return ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthId", authUser._id)
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
    const userId = await requireAppUser(ctx);

    if (args.manifesto.length > 5000) throw new Error("Manifesto too long");
    for (const [key, value] of Object.entries(args.categories)) {
      if (value.length > 2000) throw new Error(`Category ${key} too long`);
    }

    await ctx.db.patch(userId, {
      dreamProfile: {
        manifesto: args.manifesto,
        categories: args.categories,
      },
    });
  },
});
