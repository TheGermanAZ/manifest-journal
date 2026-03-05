// convex/users.ts
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
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

// One-off cleanup: delete old Convex Auth user records that lack betterAuthId.
// Run via dashboard: `bunx convex run users:clearLegacyUsers`
// Safe to remove after running once.
export const clearLegacyUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    let deleted = 0;
    for (const user of allUsers) {
      if (!("betterAuthId" in user) || !user.betterAuthId) {
        // Delete related entries and conversation turns first
        const entries = await ctx.db
          .query("entries")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        for (const entry of entries) {
          const turns = await ctx.db
            .query("conversationTurns")
            .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
            .collect();
          for (const turn of turns) {
            await ctx.db.delete(turn._id);
          }
          await ctx.db.delete(entry._id);
        }
        await ctx.db.delete(user._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

export const updatePreferences = mutation({
  args: {
    graceDaysPerWeek: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    if (args.graceDaysPerWeek < 0 || args.graceDaysPerWeek > 2) {
      throw new Error("Grace days must be 0, 1, or 2");
    }
    await ctx.db.patch(userId, {
      preferences: { graceDaysPerWeek: args.graceDaysPerWeek },
    });
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

    // Before patching, snapshot the current profile for evolution tracking
    const user = await ctx.db.get(userId);
    if (user?.dreamProfile) {
      const changedFields: string[] = [];
      if (user.dreamProfile.manifesto !== args.manifesto) {
        changedFields.push("manifesto");
      }
      for (const key of Object.keys(args.categories) as Array<
        keyof typeof args.categories
      >) {
        if (user.dreamProfile.categories[key] !== args.categories[key]) {
          changedFields.push(key);
        }
      }
      if (changedFields.length > 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.dreamProfileVersions.snapshotCurrentProfile,
          {
            userId,
            manifesto: user.dreamProfile.manifesto,
            categories: user.dreamProfile.categories,
            changedFields,
          }
        );
      }
    }

    await ctx.db.patch(userId, {
      dreamProfile: {
        manifesto: args.manifesto,
        categories: args.categories,
      },
    });
  },
});
