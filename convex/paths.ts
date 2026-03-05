import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAppUserId, requireAppUser } from "./lib/authHelper";
import { SEED_PATHS } from "./pathSeedData";

// Seed paths if none exist
export const seedPaths = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("paths").collect();
    if (existing.length > 0) return;
    for (const path of SEED_PATHS) {
      await ctx.db.insert("paths", path);
    }
  },
});

export const listPaths = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("paths").collect();
  },
});

export const getActivePath = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;
    const progress = await ctx.db
      .query("pathProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const active = progress.find((p) => p.status === "active");
    if (!active) return null;
    const path = await ctx.db.get(active.pathId);
    if (!path) return null;
    return { path, progress: active };
  },
});

export const startPath = mutation({
  args: { pathId: v.id("paths") },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);

    // Check no active path
    const existing = await ctx.db
      .query("pathProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const active = existing.find((p) => p.status === "active");
    if (active) throw new Error("Already on a path. Complete or abandon it first.");

    return ctx.db.insert("pathProgress", {
      userId,
      pathId: args.pathId,
      currentDay: 1,
      startedAt: Date.now(),
      status: "active",
      dayCompletions: [],
    });
  },
});

export const completeDayAndAdvance = mutation({
  args: {
    progressId: v.id("pathProgress"),
    entryId: v.id("entries"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    const progress = await ctx.db.get(args.progressId);
    if (!progress || progress.userId !== userId || progress.status !== "active") {
      throw new Error("Invalid path progress");
    }

    const path = await ctx.db.get(progress.pathId);
    if (!path) throw new Error("Path not found");

    const newCompletions = [
      ...progress.dayCompletions,
      {
        day: progress.currentDay,
        entryId: args.entryId,
        completedAt: Date.now(),
      },
    ];

    if (progress.currentDay >= path.duration) {
      // Path complete
      await ctx.db.patch(args.progressId, {
        dayCompletions: newCompletions,
        status: "completed",
        completedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.progressId, {
        currentDay: progress.currentDay + 1,
        dayCompletions: newCompletions,
      });
    }
  },
});

export const abandonPath = mutation({
  args: { progressId: v.id("pathProgress") },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    const progress = await ctx.db.get(args.progressId);
    if (!progress || progress.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.progressId, { status: "abandoned" });
  },
});
