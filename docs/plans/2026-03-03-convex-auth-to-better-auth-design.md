# Convex Auth → Better Auth Migration Design

**Goal:** Replace `@convex-dev/auth` with `@convex-dev/better-auth` to get a stable, well-documented auth system with Discord OAuth and magic links.

**Motivation:** Convex Auth (v0.0.87) required manual JWT key generation, had undocumented schema requirements (`authTables` spread forcing fields like `emailVerificationTime`, `image`, `isAnonymous`), undocumented index naming conventions (must be `email` not `by_email`), and generally poor documentation. Better Auth is mature, well-documented, and has an official Convex integration.

**No real users exist** — clean swap, no data migration needed.

---

## Architecture

Better Auth runs as a **Convex component** — its auth tables (users, sessions, accounts, verifications) live in the component's isolated namespace, completely separate from the app's schema. This eliminates all `authTables` spread issues.

### Key changes by file

| File | Change |
|------|--------|
| `convex/convex.config.ts` | **New** — register Better Auth component |
| `convex/auth.config.ts` | **New** — Convex auth provider config |
| `convex/auth.ts` | **Rewrite** — `createAuth` with Better Auth, Discord, magic link plugin |
| `convex/http.ts` | **Rewrite** — mount Better Auth HTTP routes |
| `convex/schema.ts` | **Simplify** — remove `authTables`, remove auth fields, add `betterAuthId` |
| `src/lib/auth-client.ts` | **New** — Better Auth client with `convexClient` plugin |
| `src/lib/auth-server.ts` | **New** — TanStack Start server utilities |
| `src/routes/__root.tsx` | **Update** — `ConvexBetterAuthProvider` replaces `ConvexAuthProvider` |
| `src/routes/login.tsx` | **Update** — `authClient.signIn.magicLink()` + `authClient.signIn.social()` |
| `src/routes/register.tsx` | **Update** — same magic link flow |
| `src/components/AuthGuard.tsx` | **Update** — `authClient.useSession()` |
| `convex/entries.ts` | **Update** — `authComponent.getAuthUser(ctx)` replaces `getAuthUserId(ctx)` |
| `convex/users.ts` | **Update** — same auth check replacement |
| `convex/conversations.ts` | **Update** — same |
| `convex/ai.ts` | **Update** — same |
| `convex/dashboard.ts` | **Update** — same |

---

## Schema

Remove `authTables` spread and all Convex Auth fields. Clean `users` table:

```ts
users: defineTable({
  betterAuthId: v.string(),
  name: v.optional(v.string()),
  dreamProfile: v.optional(v.object({
    manifesto: v.string(),
    categories: v.object({
      career: v.string(),
      relationships: v.string(),
      health: v.string(),
      wealth: v.string(),
      creative: v.string(),
    }),
  })),
}).index("by_better_auth_id", ["betterAuthId"]),
```

The `betterAuthId` links app user → Better Auth internal user.

---

## Auth Flows

### Discord OAuth
1. `authClient.signIn.social({ provider: "discord" })` triggers redirect
2. Better Auth handles callback, creates session, redirects to `SITE_URL`
3. `ConvexBetterAuthProvider` picks up session token
4. `authClient.useSession()` returns authenticated user

### Magic Links
1. `authClient.signIn.magicLink({ email, callbackURL: "/" })` sends request
2. Better Auth calls `sendMagicLink` callback → Resend sends email
3. User clicks link → Better Auth verifies, creates session, redirects
4. Same session pickup as Discord

### Backend Auth
- `getAuthUserId(ctx)` → `authComponent.getAuthUser(ctx)` returning `{ userId }` or `null`

---

## Dependencies

**Remove:** `@convex-dev/auth`, `@auth/core`

**Add:** `@convex-dev/better-auth`, `better-auth@1.4.9` (pinned)

---

## Environment Variables

| Variable | Action |
|----------|--------|
| `BETTER_AUTH_SECRET` | Add — `openssl rand -base64 32` |
| `DISCORD_CLIENT_ID` | Rename from `AUTH_DISCORD_ID` |
| `DISCORD_CLIENT_SECRET` | Rename from `AUTH_DISCORD_SECRET` |
| `SITE_URL` | Keep |
| `AUTH_RESEND_KEY` | Keep — used in `sendMagicLink` |
| `JWT_PRIVATE_KEY` | Remove |
| `JWKS` | Remove |
| `AUTH_DISCORD_ID` | Remove (renamed) |
| `AUTH_DISCORD_SECRET` | Remove (renamed) |

Discord redirect URI may change path — verify after setup.
