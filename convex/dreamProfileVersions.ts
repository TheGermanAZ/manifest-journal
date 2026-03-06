// convex/dreamProfileVersions.ts
import { query, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAppUserId } from "./lib/authHelper";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

export const snapshotCurrentProfile = internalMutation({
  args: {
    userId: v.id("users"),
    manifesto: v.string(),
    categories: v.object({
      career: v.string(),
      relationships: v.string(),
      health: v.string(),
      wealth: v.string(),
      creative: v.string(),
    }),
    changedFields: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current version count
    const existing = await ctx.db
      .query("dreamProfileVersions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const version = existing.length + 1;

    const versionId = await ctx.db.insert("dreamProfileVersions", {
      userId: args.userId,
      version,
      manifesto: args.manifesto,
      categories: args.categories,
      changedFields: args.changedFields,
    });

    // Schedule AI commentary generation if there's a previous version to compare
    if (existing.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.dreamProfileVersions.generateEvolutionCommentary,
        {
          versionId,
          previousManifesto: existing[existing.length - 1].manifesto,
          currentManifesto: args.manifesto,
          changedFields: args.changedFields,
        }
      );
    }

    return versionId;
  },
});

export const generateEvolutionCommentary = internalAction({
  args: {
    versionId: v.id("dreamProfileVersions"),
    previousManifesto: v.string(),
    currentManifesto: v.string(),
    changedFields: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: "google/gemini-3.1-flash-lite-preview",
        max_tokens: 150,
        messages: [
          {
            role: "system",
            content:
              "You are a manifestation coach observing how someone's dream profile evolves. Note shifts in ambition, clarity, or focus. 2-3 sentences max.",
          },
          {
            role: "user",
            content: `The user updated their dream profile. Changed fields: ${args.changedFields.join(", ")}.\n\nPrevious manifesto:\n${args.previousManifesto.slice(0, 500)}\n\nNew manifesto:\n${args.currentManifesto.slice(0, 500)}\n\nWhat does this evolution reveal?`,
          },
        ],
      });
      const commentary =
        response.choices[0]?.message?.content?.trim() ?? "";
      await ctx.runMutation(
        internal.dreamProfileVersions.updateCommentary,
        {
          versionId: args.versionId,
          aiCommentary: commentary,
        }
      );
    } catch {
      // Silently fail - commentary is optional
    }
  },
});

export const updateCommentary = internalMutation({
  args: {
    versionId: v.id("dreamProfileVersions"),
    aiCommentary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.versionId, { aiCommentary: args.aiCommentary });
  },
});

export const listVersions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("dreamProfileVersions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getVersion = query({
  args: { versionId: v.id("dreamProfileVersions") },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;
    const version = await ctx.db.get(args.versionId);
    if (!version || version.userId !== userId) return null;
    return version;
  },
});
