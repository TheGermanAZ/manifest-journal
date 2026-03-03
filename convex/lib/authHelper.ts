// convex/lib/authHelper.ts
import { authComponent } from "../auth";
import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Get the app user's Convex ID from the current auth session.
 * Returns null if not authenticated or no app user exists.
 * Uses safeGetAuthUser (does NOT throw) — suitable for queries.
 */
export async function getAppUserId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users"> | null> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q) =>
      q.eq("betterAuthId", authUser._id)
    )
    .unique();

  return user?._id ?? null;
}

/**
 * Require an authenticated app user. Throws if not authenticated or not provisioned.
 * Uses getAuthUser (throws on unauth) — suitable for mutations.
 */
export async function requireAppUser(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users">> {
  const authUser = await authComponent.getAuthUser(ctx);
  // getAuthUser throws if not authenticated, so authUser is always defined
  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q) =>
      q.eq("betterAuthId", authUser._id)
    )
    .unique();
  if (!user) throw new Error("User not provisioned");
  return user._id;
}

/**
 * Check if the current request is authenticated via Better Auth.
 * Works with any context type including ActionCtx.
 * Returns the Better Auth user ID (string) or null.
 * Uses safeGetAuthUser (does NOT throw).
 */
export async function getBetterAuthUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<string | null> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  return authUser?._id ?? null;
}
