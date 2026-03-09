import { action, internalAction, internalQuery, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { AuthError } from "./lib/errors";

async function requireSearchUserId(
  ctx: ActionCtx,
) {
  const user = await ctx.runQuery(api.users.currentUser, {});
  if (!user) throw new AuthError("User not provisioned");
  return user._id;
}

export const searchEntries = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSearchUserId(ctx);

    // Generate embedding for the search query
    const queryEmbedding = await ctx.runAction(internal.ai.generateEmbedding, {
      text: args.query,
    });

    // Get the user's entries via vector search
    const results = await ctx.vectorSearch("entries", "by_embedding", {
      vector: queryEmbedding,
      limit: 10,
      filter: (q) => q.eq("userId", userId),
    });

    // Fetch full entries
    const entries = await Promise.all(
      results.map(async (r) => {
        const entry = await ctx.runQuery(api.entries.getEntry, { entryId: r._id });
        return entry ? { ...entry, score: r._score } : null;
      })
    );

    return entries.filter(Boolean);
  },
});

export const findRelatedEntries = action({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSearchUserId(ctx);

    const queryEmbedding = await ctx.runAction(internal.ai.generateEmbedding, {
      text: args.content.slice(0, 500),
    });

    const results = await ctx.vectorSearch("entries", "by_embedding", {
      vector: queryEmbedding,
      limit: 3,
      filter: (q) => q.eq("userId", userId),
    });

    const entries = await Promise.all(
      results.map(async (r) => {
        const entry = await ctx.runQuery(api.entries.getEntry, { entryId: r._id });
        return entry ? { ...entry, score: r._score } : null;
      })
    );

    return entries.filter(Boolean);
  },
});

export const backfillEmbeddings = internalAction({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.runQuery(internal.search.getEntriesWithoutEmbeddings);

    for (const entry of entries) {
      await ctx.runAction(internal.ai.embedAndStoreEntry, {
        entryId: entry._id,
        content: entry.content,
      });
    }
  },
});

export const getEntriesWithoutEmbeddings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("entries").collect();
    return entries
      .filter((e) => !e.embedding)
      .map((e) => ({ _id: e._id, content: e.content }));
  },
});
