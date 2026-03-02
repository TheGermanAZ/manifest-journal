// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

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
  v.literal("conversational")
);

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
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
  }).index("by_email", ["email"]),

  entries: defineTable({
    userId: v.id("users"),
    content: v.string(),
    mode: journalModeValidator,
    embedding: v.optional(v.array(v.float64())),
    analysis: v.optional(
      v.object({
        patternInsight: v.string(),
        nudge: v.string(),
        emotionalTone: emotionalToneValidator,
        alignmentScore: v.number(),
        alignmentRationale: v.string(),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_time", ["userId"])
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
});
