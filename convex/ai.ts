import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthUserId } from "@convex-dev/auth/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EMOTIONAL_TONES = [
  "hopeful", "anxious", "stuck", "clear",
  "resistant", "expansive", "grief", "excited",
] as const;

type AnalysisResult = {
  patternInsight: string;
  nudge: string;
  emotionalTone: (typeof EMOTIONAL_TONES)[number];
  alignmentScore: number;
  alignmentRationale: string;
};

function formatDreamProfile(profile: {
  manifesto: string;
  categories: Record<string, string>;
}) {
  return `MANIFESTO:\n${profile.manifesto}\n\nCATEGORIES:\n${Object.entries(
    profile.categories
  )
    .map(([k, val]) => `${k.toUpperCase()}: ${val}`)
    .join("\n")}`;
}

export const analyzeEntry = action({
  args: {
    entryId: v.id("entries"),
    content: v.string(),
    dreamProfile: v.object({
      manifesto: v.string(),
      categories: v.object({
        career: v.string(),
        relationships: v.string(),
        health: v.string(),
        wealth: v.string(),
        creative: v.string(),
      }),
    }),
    recentEntryContents: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<AnalysisResult> => {
    // Auth check: verify caller is authenticated before expensive API call
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Ownership check: verify the entry belongs to this user
    const entry = await ctx.runQuery(api.entries.getEntry, { entryId: args.entryId });
    if (!entry) {
      throw new Error("Entry not found or not owned by user");
    }

    const recentContext = args.recentEntryContents.length
      ? `\nRECENT ENTRIES (last ${args.recentEntryContents.length}):\n${args.recentEntryContents
          .map((e, i) => `[${i + 1}] ${e.slice(0, 300)}`)
          .join("\n\n")}`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are a manifestation coach. The user's dream life profile is:\n\n${formatDreamProfile(args.dreamProfile)}${recentContext}\n\nAnalyze journal entries and return JSON only. No explanation outside the JSON.`,
      messages: [
        {
          role: "user",
          content: `Analyze this journal entry. Return ONLY valid JSON matching this exact shape:
{
  "patternInsight": "1-2 sentences about a recurring theme or mental block",
  "nudge": "1 reframe or provocative question, max 40 words",
  "emotionalTone": "one of: hopeful|anxious|stuck|clear|resistant|expansive|grief|excited",
  "alignmentScore": 7,
  "alignmentRationale": "1 sentence explaining the score"
}

ENTRY:
${args.content}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned) as AnalysisResult;

    // Validate emotional tone
    if (!EMOTIONAL_TONES.includes(parsed.emotionalTone)) {
      parsed.emotionalTone = "hopeful";
    }

    // Clamp alignment score to 1-10
    parsed.alignmentScore = Math.max(1, Math.min(10, Math.round(parsed.alignmentScore)));

    // Store analysis on the entry
    await ctx.runMutation(api.entries.updateEntryAnalysis, {
      entryId: args.entryId,
      analysis: parsed,
    });

    return parsed;
  },
});

export const generateDailyPrompt = action({
  args: {
    dreamProfile: v.object({
      manifesto: v.string(),
      categories: v.object({
        career: v.string(),
        relationships: v.string(),
        health: v.string(),
        wealth: v.string(),
        creative: v.string(),
      }),
    }),
    recentEntryContents: v.array(v.string()),
  },
  handler: async (_ctx, args): Promise<string> => {
    const recentContext = args.recentEntryContents.length
      ? `\nRECENT ENTRIES:\n${args.recentEntryContents
          .map((e, i) => `[${i + 1}] ${e.slice(0, 200)}`)
          .join("\n\n")}`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      system: `You are a manifestation coach. Dream profile:\n${formatDreamProfile(args.dreamProfile)}${recentContext}`,
      messages: [
        {
          role: "user",
          content: `Generate one journaling prompt (max 50 words) that:
- Draws from a theme the user hasn't fully explored yet
- Pulls them toward their dream life vision
- Feels personal, not generic
Return ONLY the prompt text. Nothing else.`,
        },
      ],
    });

    return message.content[0].type === "text"
      ? message.content[0].text.trim()
      : "What would the person you're becoming do differently today?";
  },
});

export const conversationalTurn = action({
  args: {
    dreamProfile: v.object({
      manifesto: v.string(),
      categories: v.object({
        career: v.string(),
        relationships: v.string(),
        health: v.string(),
        wealth: v.string(),
        creative: v.string(),
      }),
    }),
    history: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    userMessage: v.string(),
  },
  handler: async (_ctx, args): Promise<string> => {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system: `You are a manifestation coach. Dream profile:\n${formatDreamProfile(args.dreamProfile)}\n\nBe warm, probing, never preachy. Max 100 words. End with a question.`,
      messages: [
        ...args.history.map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user" as const, content: args.userMessage },
      ],
    });

    return message.content[0].type === "text"
      ? message.content[0].text.trim()
      : "Tell me more about that.";
  },
});
