import { query } from "./_generated/server";
import { v } from "convex/values";
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

    let entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Date filtering
    if (args.startDate) {
      const startMs = new Date(args.startDate).getTime();
      entries = entries.filter((e) => e._creationTime >= startMs);
    }
    if (args.endDate) {
      const endMs = new Date(args.endDate).getTime() + 86400000;
      entries = entries.filter((e) => e._creationTime <= endMs);
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
