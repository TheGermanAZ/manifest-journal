// convex/lib/authHelper.ts
import { authComponent } from "../auth";
import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Get the app user's Convex ID from the current auth session.
 * Returns null if not authenticated or no app user exists.
 * Works with query and mutation contexts (not ActionCtx - no db access).
 */
export async function getAppUserId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users"> | null> {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q) =>
      q.eq("betterAuthId", authUser.userId)
    )
    .unique();

  return user?._id ?? null;
}

/**
 * Check if the current request is authenticated via Better Auth.
 * Works with any context type including ActionCtx.
 * Returns the Better Auth user ID (string) or null.
 */
export async function getBetterAuthUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<string | null> {
  const authUser = await authComponent.getAuthUser(ctx);
  return authUser?.userId ?? null;
}
