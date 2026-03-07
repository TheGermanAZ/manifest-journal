// Health check endpoints for the Convex backend.
// Shallow check: is the deployment alive?
// Deep check: can it reach its dependencies (DB, env vars for AI + auth)?

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createLogger } from "./lib/logger";
import { formatError } from "./lib/errors";

interface CheckResult {
  status: "ok" | "fail";
  message?: string;
}

/** GET /health — shallow. Returns 200 if the process is alive. */
export const shallow = httpAction(async () => {
  return new Response(
    JSON.stringify({ status: "ok", ts: new Date().toISOString() }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

/** GET /health/ready — deep. Checks DB access and required config. */
export const ready = httpAction(async (ctx) => {
  const log = createLogger("health.ready");
  const checks: Record<string, CheckResult> = {};

  // 1. Database — can we query?
  try {
    const users = await ctx.runQuery(internal.weeklySummary.getAllUsers);
    checks.database = { status: "ok", message: `${users.length} users` };
  } catch (err) {
    checks.database = { status: "fail", message: formatError(err) };
  }

  // 2. Required environment variables
  const requiredEnvVars = [
    "OPENROUTER_API_KEY",
    "BETTER_AUTH_SECRET",
    "CONVEX_SITE_URL",
  ];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.env = missingVars.length === 0
    ? { status: "ok" }
    : { status: "fail", message: `missing: ${missingVars.join(", ")}` };

  // 3. Optional but important: auth email provider
  checks.email = process.env.AUTH_RESEND_KEY
    ? { status: "ok" }
    : { status: "fail", message: "AUTH_RESEND_KEY not set — magic links won't send" };

  // 4. Optional: Discord OAuth
  checks.discord = process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ? { status: "ok" }
    : { status: "fail", message: "Discord OAuth not configured" };

  const criticalOk = checks.database.status === "ok" && checks.env.status === "ok";

  const result = {
    status: criticalOk ? "ready" : "not_ready",
    ts: new Date().toISOString(),
    checks,
  };

  if (!criticalOk) {
    log.error("readiness check failed", { checks });
  }

  return new Response(JSON.stringify(result), {
    status: criticalOk ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  });
});
