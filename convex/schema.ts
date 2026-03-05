// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const emotionalToneValidator = v.union(
  v.literal("hopeful"),
  v.literal("anxious"),
  v.literal("stuck"),
  v.literal("clear"),
  v.literal("resistant"),
  v.literal("expansive"),
  v.literal("grief"),
  v.literal("excited")
);

const journalModeValidator = v.union(
  v.literal("open"),
  v.literal("guided"),
  v.literal("conversational"),
  v.literal("check-in")
);

export default defineSchema({
  users: defineTable({
    betterAuthId: v.string(),
    name: v.optional(v.string()),
    dreamProfile: v.optional(
      v.object({
        manifesto: v.string(),
        categories: v.object({
          career: v.string(),
          relationships: v.string(),
          health: v.string(),
          wealth: v.string(),
          creative: v.string(),
        }),
      })
    ),
    preferences: v.optional(
      v.object({
        graceDaysPerWeek: v.number(),
      })
    ),
    notificationPreferences: v.optional(
      v.object({
        morningPromptEnabled: v.boolean(),
        deliveryHourUTC: v.number(),
        deliveryMinuteUTC: v.number(),
        email: v.string(),
        timezone: v.string(),
      })
    ),
  }).index("by_better_auth_id", ["betterAuthId"]),

  entries: defineTable({
    userId: v.id("users"),
    content: v.string(),
    mode: journalModeValidator,
    embedding: v.optional(v.array(v.float64())),
    wordCount: v.optional(v.number()),
    writingDurationMs: v.optional(v.number()),
    bookmarked: v.optional(v.boolean()),
    analysis: v.optional(
      v.object({
        patternInsight: v.string(),
        nudge: v.string(),
        emotionalTone: emotionalToneValidator,
        alignmentScore: v.number(),
        alignmentRationale: v.string(),
        breakthroughScore: v.optional(v.number()),
        dimensions: v.optional(v.array(v.object({
          name: v.string(),
          relevance: v.number(),
          alignmentScore: v.number(),
        }))),
        neglectedDimensions: v.optional(v.array(v.string())),
        dimensionPrompt: v.optional(v.string()),
      })
    ),
  })
    .index("by_user", ["userId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    }),

  conversationTurns: defineTable({
    entryId: v.id("entries"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  }).index("by_entry", ["entryId"]),

  milestones: defineTable({
    userId: v.id("users"),
    type: v.string(),
    achievedAt: v.number(),
    seen: v.boolean(),
    aiMessage: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  dreamProfileVersions: defineTable({
    userId: v.id("users"),
    version: v.number(),
    manifesto: v.string(),
    categories: v.object({
      career: v.string(),
      relationships: v.string(),
      health: v.string(),
      wealth: v.string(),
      creative: v.string(),
    }),
    aiCommentary: v.optional(v.string()),
    changedFields: v.array(v.string()),
  }).index("by_user", ["userId"]),

  weeklySummaries: defineTable({
    userId: v.id("users"),
    weekStarting: v.string(),
    weekEnding: v.string(),
    entryCount: v.number(),
    summary: v.object({
      emotionalArc: v.string(),
      alignmentTrendSummary: v.string(),
      crossEntryPatterns: v.string(),
      coachingMessage: v.string(),
      suggestedFocus: v.string(),
      averageAlignmentScore: v.number(),
      dominantTone: v.string(),
      neglectedDimensions: v.array(v.string()),
    }),
  }).index("by_user", ["userId"]),

  promptNotifications: defineTable({
    userId: v.id("users"),
    sentAt: v.number(),
    prompt: v.string(),
    emailStatus: v.string(),
    dateKey: v.string(),
  }).index("by_user", ["userId"]),

  paths: defineTable({
    name: v.string(),
    description: v.string(),
    duration: v.number(),
    category: v.string(),
    prompts: v.array(v.object({
      day: v.number(),
      prompt: v.string(),
    })),
  }),

  pathProgress: defineTable({
    userId: v.id("users"),
    pathId: v.id("paths"),
    currentDay: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("abandoned")),
    dayCompletions: v.array(v.object({
      day: v.number(),
      entryId: v.id("entries"),
      completedAt: v.number(),
    })),
  }).index("by_user", ["userId"]),
});
