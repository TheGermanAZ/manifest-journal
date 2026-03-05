import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Weekly summary - Mondays at 6 AM UTC
crons.weekly(
  "weekly-summary",
  { dayOfWeek: "monday", hourUTC: 6, minuteUTC: 0 },
  internal.weeklySummary.processAllUsers,
);

// Morning prompt notifications - every 15 minutes
crons.interval(
  "morning-prompts",
  { minutes: 15 },
  internal.notifications.processScheduledPrompts,
);

export default crons;
