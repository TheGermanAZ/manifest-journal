import { action, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { authComponent } from "./auth";

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

const MODEL = "google/gemini-3.1-flash-lite-preview";

const EMOTIONAL_TONES = [
  "hopeful", "anxious", "stuck", "clear",
  "resistant", "expansive", "grief", "excited",
] as const;

type DimensionData = {
  name: string;
  relevance: number;
  alignmentScore: number;
};

type AnalysisResult = {
  patternInsight: string;
  nudge: string;
  emotionalTone: (typeof EMOTIONAL_TONES)[number];
  alignmentScore: number;
  alignmentRationale: string;
  breakthroughScore: number;
  dimensions: DimensionData[];
  neglectedDimensions: string[];
  dimensionPrompt: string;
};

type RecentEntry = {
  content: string;
  date: string;
  tone?: string;
  alignmentScore?: number;
};

function formatRecentEntries(entries: RecentEntry[]): string {
  if (entries.length === 0) return "";
  return `\nRECENT ENTRIES (with dates and tones):\n${entries
    .map(
      (e, i) =>
        `[${i + 1}] (${e.date}${e.tone ? `, tone: ${e.tone}` : ""}${e.alignmentScore != null ? `, alignment: ${e.alignmentScore}/10` : ""}) ${e.content.slice(0, 300)}`
    )
    .join("\n\n")}`;
}

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
    recentEntries: v.array(
      v.object({
        content: v.string(),
        date: v.string(),
        tone: v.optional(v.string()),
        alignmentScore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args): Promise<AnalysisResult> => {
    await authComponent.getAuthUser(ctx);

    const entry = await ctx.runQuery(api.entries.getEntry, { entryId: args.entryId });
    if (!entry) {
      throw new Error("Entry not found or not owned by user");
    }

    const recent = args.recentEntries.slice(0, 10);
    const recentContext = formatRecentEntries(recent);

    const response = await getOpenAI().chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are a manifestation coach with deep psychological insight. You notice patterns others miss. You hold the user accountable to their goals while being warm and direct.

DREAM PROFILE:
${formatDreamProfile(args.dreamProfile)}
${recentContext}

Analyze this entry. Look for:
- Recurring patterns or beliefs across entries
- Areas where the user is STUCK (repeating the same concern without progress)
- Moments of INSPIRATION or breakthrough
- Whether they're making progress toward their stated goals
- Which life dimensions (career/relationships/health/wealth/creative) are getting attention vs. neglected

Hold them accountable: if they wrote about a goal last week but aren't acting on it, call that out gently.`,
        },
        {
          role: "user",
          content: `Analyze this journal entry. Return ONLY valid JSON:
{
  "patternInsight": "2-3 sentences about patterns, stuck points, or breakthroughs across entries",
  "nudge": "1 direct reframe or accountability question, max 40 words",
  "emotionalTone": "one of: hopeful|anxious|stuck|clear|resistant|expansive|grief|excited",
  "alignmentScore": 7,
  "alignmentRationale": "1 sentence explaining the score",
  "breakthroughScore": 3,
  "dimensions": [{"name": "career", "relevance": 8, "alignmentScore": 7}],
  "neglectedDimensions": ["wealth", "creative"],
  "dimensionPrompt": "One prompt for the most neglected dimension, max 40 words"
}

breakthroughScore: 0-10 how much this represents a breakthrough in self-awareness or action. 7+ = significant shift.
dimensions: array of objects for each relevant dimension (career/relationships/health/wealth/creative). relevance and alignmentScore are 0-10.
neglectedDimensions: dimensions not mentioned or addressed in the entry.
dimensionPrompt: a journaling prompt targeting the most neglected dimension.

ENTRY:
${args.content}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "{}";

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    let parsed: AnalysisResult;
    try {
      parsed = JSON.parse(cleaned) as AnalysisResult;
    } catch {
      parsed = {
        patternInsight: "Unable to analyze this entry. Please try again.",
        nudge: "What matters most to you right now?",
        emotionalTone: "hopeful",
        alignmentScore: 5,
        alignmentRationale: "Analysis could not be completed.",
        breakthroughScore: 3,
        dimensions: [],
        neglectedDimensions: [],
        dimensionPrompt: "",
      };
    }

    // Validate emotional tone
    if (!EMOTIONAL_TONES.includes(parsed.emotionalTone)) {
      parsed.emotionalTone = "hopeful";
    }

    // Clamp alignment score to 1-10
    parsed.alignmentScore = Math.max(1, Math.min(10, Math.round(parsed.alignmentScore)));

    // Clamp breakthroughScore to 0-10
    parsed.breakthroughScore = Math.max(0, Math.min(10, Math.round(parsed.breakthroughScore ?? 3)));

    // Validate and clamp dimensions
    const validDimensionNames = ["career", "relationships", "health", "wealth", "creative"];
    parsed.dimensions = (Array.isArray(parsed.dimensions) ? parsed.dimensions : [])
      .filter((d) => validDimensionNames.includes(d.name))
      .map((d) => ({
        name: d.name,
        relevance: Math.max(0, Math.min(10, Math.round(d.relevance ?? 0))),
        alignmentScore: Math.max(0, Math.min(10, Math.round(d.alignmentScore ?? 0))),
      }));

    // Validate neglectedDimensions
    parsed.neglectedDimensions = (Array.isArray(parsed.neglectedDimensions) ? parsed.neglectedDimensions : [])
      .filter((d) => validDimensionNames.includes(d));

    // Validate dimensionPrompt
    if (typeof parsed.dimensionPrompt !== "string") {
      parsed.dimensionPrompt = "";
    }

    // Store analysis on the entry
    await ctx.runMutation(internal.entries.updateEntryAnalysis, {
      entryId: args.entryId,
      analysis: parsed,
    });

    // Trigger milestone check
    await ctx.runMutation(internal.milestones.checkMilestones, { userId: entry!.userId });

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
    recentEntries: v.array(
      v.object({
        content: v.string(),
        date: v.string(),
        tone: v.optional(v.string()),
        alignmentScore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    await authComponent.getAuthUser(ctx);

    const recent = args.recentEntries.slice(0, 10);
    const recentContext = formatRecentEntries(recent);

    const response = await getOpenAI().chat.completions.create({
      model: MODEL,
      max_tokens: 100,
      messages: [
        {
          role: "system",
          content: `You are a manifestation coach. You know the user deeply.

DREAM PROFILE:
${formatDreamProfile(args.dreamProfile)}
${recentContext}

Generate a journaling prompt that:
- Addresses patterns you see (stuck points, neglected dimensions)
- If user seems stuck on a topic, gently redirect
- If user has been inspired, deepen that exploration
- Checks in on specific goals from their dream profile
- Feels deeply personal, not generic`,
        },
        {
          role: "user",
          content: `Generate one journaling prompt (max 50 words).
Return ONLY the prompt text. Nothing else.`,
        },
      ],
    });

    return response.choices[0]?.message?.content?.trim()
      ?? "What would the person you're becoming do differently today?";
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
  handler: async (ctx, args): Promise<string> => {
    await authComponent.getAuthUser(ctx);

    const history = args.history.slice(-20);

    const response = await getOpenAI().chat.completions.create({
      model: MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are a manifestation coach with deep psychological insight. You know the user's dream profile and recent patterns.

DREAM PROFILE:
${formatDreamProfile(args.dreamProfile)}

Be warm, probing, never preachy. Max 100 words. End with a question.
When appropriate, hold the user accountable to their stated goals and gently challenge stuck patterns.`,
        },
        ...history.map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user" as const, content: args.userMessage },
      ],
    });

    return response.choices[0]?.message?.content?.trim()
      ?? "Tell me more about that.";
  },
});

export const generateEmbedding = internalAction({
  args: { text: v.string() },
  handler: async (_ctx, args): Promise<number[]> => {
    // Use OpenAI-compatible embedding via OpenRouter
    const response = await getOpenAI().embeddings.create({
      model: "openai/text-embedding-3-small",
      input: args.text.slice(0, 8000), // Limit input length
    });
    return response.data[0].embedding;
  },
});

export const embedAndStoreEntry = internalAction({
  args: { entryId: v.id("entries"), content: v.string() },
  handler: async (ctx, args) => {
    try {
      const embedding = await ctx.runAction(internal.ai.generateEmbedding, { text: args.content });
      await ctx.runMutation(internal.ai.storeEmbedding, { entryId: args.entryId, embedding });
    } catch {
      // Silently fail - embeddings are optional enhancement
    }
  },
});

export const storeEmbedding = internalMutation({
  args: { entryId: v.id("entries"), embedding: v.array(v.float64()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { embedding: args.embedding });
  },
});
