import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getAppUserId } from "./lib/authHelper";

export const exportEntries = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    bookmarkedOnly: v.optional(v.boolean()),
    includeAnalysis: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];

    const startMs = args.startDate
      ? new Date(args.startDate).getTime()
      : undefined;
    const endMs = args.endDate
      ? new Date(args.endDate).getTime() + 86400000
      : undefined;

    let entries;
    if (startMs !== undefined && endMs !== undefined) {
      entries = await ctx.db
        .query("entries")
        .withIndex("by_user", (q) =>
          q
            .eq("userId", userId)
            .gte("_creationTime", startMs)
            .lt("_creationTime", endMs),
        )
        .order("desc")
        .collect();
    } else if (startMs !== undefined) {
      entries = await ctx.db
        .query("entries")
        .withIndex("by_user", (q) =>
          q.eq("userId", userId).gte("_creationTime", startMs),
        )
        .order("desc")
        .collect();
    } else if (endMs !== undefined) {
      entries = await ctx.db
        .query("entries")
        .withIndex("by_user", (q) =>
          q.eq("userId", userId).lt("_creationTime", endMs),
        )
        .order("desc")
        .collect();
    } else {
      entries = await ctx.db
        .query("entries")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }

    // Bookmark filtering
    if (args.bookmarkedOnly) {
      entries = entries.filter((e) => e.bookmarked);
    }

    // Strip analysis if not requested
    if (!args.includeAnalysis) {
      return entries.map(({ analysis, embedding, ...rest }) => rest);
    }

    return entries.map(({ embedding, ...rest }) => rest);
  },
});

export const prepareExport = action({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    bookmarkedOnly: v.optional(v.boolean()),
    includeAnalysis: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return ctx.runQuery(api.export.exportEntries, args);
  },
});
