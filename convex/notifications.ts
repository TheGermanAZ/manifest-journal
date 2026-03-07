import { query, mutation, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAppUserId, requireAppUser } from "./lib/authHelper";
import { getOpenAI } from "./lib/openai";
import { createLogger } from "./lib/logger";
import { formatError } from "./lib/errors";

export const updateNotificationPreferences = mutation({
  args: {
    morningPromptEnabled: v.boolean(),
    deliveryHourUTC: v.number(),
    deliveryMinuteUTC: v.number(),
    email: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    await ctx.db.patch(userId, {
      notificationPreferences: args,
    });
  },
});

export const getNotificationPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user?.notificationPreferences ?? null;
  },
});

export const processScheduledPrompts = internalAction({
  args: {},
  handler: async (ctx) => {
    const log = createLogger("notifications.processScheduledPrompts");
    const users = await ctx.runQuery(internal.notifications.getUsersWithNotifications);
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const dateKey = now.toISOString().split("T")[0];
    log.info("processing scheduled prompts", { eligibleUsers: users.length, dateKey });

    for (const user of users) {
      if (!user.prefs.morningPromptEnabled) continue;

      // Check if it's within the delivery window (15-min cron interval)
      const hourMatch = user.prefs.deliveryHourUTC === currentHour;
      const minuteInRange =
        currentMinute >= user.prefs.deliveryMinuteUTC &&
        currentMinute < user.prefs.deliveryMinuteUTC + 15;

      if (!hourMatch || !minuteInRange) continue;

      // Check if already sent today
      const alreadySent = await ctx.runQuery(internal.notifications.checkAlreadySent, {
        userId: user.id,
        dateKey,
      });
      if (alreadySent) continue;

      // Schedule prompt generation + send
      await ctx.scheduler.runAfter(0, internal.notifications.sendMorningPrompt, {
        userId: user.id,
        email: user.prefs.email,
        dateKey,
      });
    }
  },
});

export const getUsersWithNotifications = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.notificationPreferences?.morningPromptEnabled)
      .map((u) => ({ id: u._id, prefs: u.notificationPreferences! }));
  },
});

export const checkAlreadySent = internalQuery({
  args: { userId: v.id("users"), dateKey: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("promptNotifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return notifications.some((n) => n.dateKey === args.dateKey);
  },
});

export const sendMorningPrompt = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    dateKey: v.string(),
  },
  handler: async (ctx, args) => {
    const log = createLogger("notifications.sendMorningPrompt", { userId: args.userId });
    // Get user's recent entries for context
    const entries = await ctx.runQuery(internal.entries.entriesInDateRange, {
      userId: args.userId,
      startMs: Date.now() - 7 * 86400000,
      endMs: Date.now(),
    });

    const recentContext = entries
      .slice(0, 5)
      .map(
        (e: any) =>
          `Tone: ${e.analysis?.emotionalTone ?? "unknown"}, Content: ${e.content.slice(0, 100)}`,
      )
      .join("\n");

    let prompt: string;
    try {
      const response = await log.time("openrouter call", () => getOpenAI().chat.completions.create({
        model: "google/gemini-3.1-flash-lite-preview",
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content:
              "You are a manifestation coach. Generate a personalized morning journaling prompt based on recent patterns. Max 50 words. Be warm and specific.",
          },
          {
            role: "user",
            content: recentContext
              ? `Based on recent entries:\n${recentContext}\n\nGenerate a morning prompt.`
              : "Generate a motivating morning journaling prompt.",
          },
        ],
      }));
      prompt =
        response.choices[0]?.message?.content?.trim() ??
        "What intention will you set for today?";
    } catch (err) {
      log.error("morning prompt generation failed, using fallback", {
        error: formatError(err),
      });
      prompt = "What intention will you set for today?";
    }

    // Store the notification (email sending would use Resend in production)
    await ctx.runMutation(internal.notifications.storeNotification, {
      userId: args.userId,
      prompt,
      dateKey: args.dateKey,
      emailStatus: "pending", // Would be "sent" after Resend integration
    });
    log.done();
  },
});

export const storeNotification = internalMutation({
  args: {
    userId: v.id("users"),
    prompt: v.string(),
    dateKey: v.string(),
    emailStatus: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("promptNotifications", {
      userId: args.userId,
      sentAt: Date.now(),
      prompt: args.prompt,
      emailStatus: args.emailStatus,
      dateKey: args.dateKey,
    });
  },
});
