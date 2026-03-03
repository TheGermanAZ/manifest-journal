# Convex Auth → Better Auth Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `@convex-dev/auth` with `@convex-dev/better-auth` for stable auth with Discord OAuth and magic links.

**Architecture:** Better Auth runs as a Convex component — auth tables live in isolated namespace. App keeps its own `users` table linked via `betterAuthId`. A shared `getAppUserId()` helper replaces all `getAuthUserId()` calls. Client uses Better Auth's `createAuthClient` with `convexClient` + `magicLinkClient` plugins. TanStack Start proxies auth requests via an API catch-all route.

**Tech Stack:** `@convex-dev/better-auth`, `better-auth@1.4.9`, TanStack Start, Convex, Resend (magic links)

---

### Task 1: Swap Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Remove old auth packages**

Run: `bun remove @convex-dev/auth @auth/core`

**Step 2: Install Better Auth packages**

Run: `bun add @convex-dev/better-auth better-auth@1.4.9`

**Step 3: Verify lockfile**

Run: `bun install`
Expected: Clean install, no errors.

**Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: swap @convex-dev/auth for @convex-dev/better-auth"
```

---

### Task 2: Register Better Auth Component

**Files:**
- Create: `convex/convex.config.ts`

**Step 1: Create component config**

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

**Step 2: Verify TypeScript**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `convex.config.ts`. Other files will have errors (we're changing those next).

**Step 3: Commit**

```bash
git add convex/convex.config.ts
git commit -m "feat: register better-auth convex component"
```

---

### Task 3: Update Schema

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Replace schema**

Remove `authTables` import and spread. Remove all Convex Auth fields (`email`, `emailVerificationTime`, `image`, `isAnonymous`, `phone`, `phoneVerificationTime`). Add `betterAuthId` with index.

```ts
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
  v.literal("conversational")
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
  }).index("by_better_auth_id", ["betterAuthId"]),

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
```

**Step 2: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: clean users schema with betterAuthId, remove authTables"
```

---

### Task 4: Rewrite Auth Server + Shared Helper

**Files:**
- Rewrite: `convex/auth.ts`

**Step 1: Write new auth.ts**

This file does three things:
1. Creates the Better Auth component client (`authComponent`)
2. Defines `createAuth` factory (used by HTTP routes and server functions)
3. Exports `getAppUserId` helper that all backend files will use

```ts
// convex/auth.ts
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { magicLink } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { betterAuth } from "better-auth";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: { disabled: optionsOnly },
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    socialProviders: {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      },
    },
    plugins: [
      convex(),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          // Call Resend API directly
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Manifest Journal <noreply@manifestjournal.com>",
              to: email,
              subject: "Sign in to Manifest Journal",
              html: `<p>Click <a href="${url}">here</a> to sign in to Manifest Journal.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
            }),
          });
        },
      }),
    ],
  });
};
```

> **Note for implementer:** The `from` email address in `sendMagicLink` should match the domain configured in Resend. Adjust if the actual domain differs. If the user doesn't have a custom domain for email yet, use `onboarding@resend.dev` as a placeholder.

**Step 2: Commit**

```bash
git add convex/auth.ts
git commit -m "feat: better-auth server config with discord + magic links"
```

---

### Task 5: Create Shared Auth Helper

**Files:**
- Create: `convex/lib/authHelper.ts`

**Step 1: Create the helper**

This helper replaces `getAuthUserId` everywhere. It maps the Better Auth user → app user via `betterAuthId`.

```ts
// convex/lib/authHelper.ts
import { authComponent } from "../auth";
import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Get the app user's Convex ID from the current auth session.
 * Returns null if not authenticated or no app user exists.
 * Works with query, mutation, and action contexts.
 */
export async function getAppUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<Id<"users"> | null> {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) return null;

  // For action contexts, we need to run a query to access the DB
  if (!("db" in ctx)) {
    // ActionCtx — can't query DB directly. Caller must handle differently.
    // Return the betterAuthId as a signal that user IS authenticated.
    // The action should use ctx.runQuery to look up the app user.
    return null;
  }

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
```

> **Note for implementer:** Verify the return type of `authComponent.getAuthUser(ctx)`. It likely returns `{ userId: string }` or `null`. Check at runtime during Task 12 (deploy) and adjust if needed.

**Step 2: Commit**

```bash
git add convex/lib/authHelper.ts
git commit -m "feat: shared getAppUserId helper for better-auth"
```

---

### Task 6: Rewrite HTTP Routes

**Files:**
- Rewrite: `convex/http.ts`

**Step 1: Mount Better Auth routes**

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);
export default http;
```

**Step 2: Commit**

```bash
git add convex/http.ts
git commit -m "feat: mount better-auth http routes"
```

---

### Task 7: Update Backend — users.ts

**Files:**
- Modify: `convex/users.ts`

**Step 1: Replace auth imports and add ensureUser**

Replace `getAuthUserId` with the new helpers. Add `ensureUser` mutation for auto-provisioning app users after Better Auth sign-in.

```ts
// convex/users.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthId", authUser.userId)
      )
      .unique();

    if (existing) return existing._id;

    return ctx.db.insert("users", {
      betterAuthId: authUser.userId,
      name: authUser.user?.name ?? undefined,
    });
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;

    return ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthId", authUser.userId)
      )
      .unique();
  },
});

export const updateDreamProfile = mutation({
  args: {
    manifesto: v.string(),
    categories: v.object({
      career: v.string(),
      relationships: v.string(),
      health: v.string(),
      wealth: v.string(),
      creative: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthId", authUser.userId)
      )
      .unique();
    if (!user) throw new Error("User not found");

    if (args.manifesto.length > 5000) throw new Error("Manifesto too long");
    for (const [key, value] of Object.entries(args.categories)) {
      if (value.length > 2000) throw new Error(`Category ${key} too long`);
    }

    await ctx.db.patch(user._id, {
      dreamProfile: {
        manifesto: args.manifesto,
        categories: args.categories,
      },
    });
  },
});
```

> **Note for implementer:** Check the exact shape of `authUser.user` at runtime. It may be `authUser.user.name` or just `authUser.name`. Adjust the `ensureUser` mutation accordingly.

**Step 2: Commit**

```bash
git add convex/users.ts
git commit -m "feat: update users.ts with better-auth + ensureUser"
```

---

### Task 8: Update Backend — entries.ts

**Files:**
- Modify: `convex/entries.ts`

**Step 1: Replace auth imports**

Replace `getAuthUserId` with `authComponent.getAuthUser` + app user lookup. The `internalMutation` (updateEntryAnalysis) doesn't need auth — it's only called internally.

```ts
// convex/entries.ts
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

async function requireAppUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q: any) =>
      q.eq("betterAuthId", authUser.userId)
    )
    .unique();
  if (!user) throw new Error("User not provisioned");
  return user._id;
}

async function getAppUserId(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q: any) =>
      q.eq("betterAuthId", authUser.userId)
    )
    .unique();
  return user?._id ?? null;
}

export const createEntry = mutation({
  args: {
    content: v.string(),
    mode: v.union(v.literal("open"), v.literal("guided"), v.literal("conversational")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    if (args.content.length > 50000) throw new Error("Content too long");
    return ctx.db.insert("entries", {
      userId,
      content: args.content,
      mode: args.mode,
    });
  },
});

export const updateEntryAnalysis = internalMutation({
  args: {
    entryId: v.id("entries"),
    analysis: v.object({
      patternInsight: v.string(),
      nudge: v.string(),
      emotionalTone: v.union(
        v.literal("hopeful"), v.literal("anxious"), v.literal("stuck"),
        v.literal("clear"), v.literal("resistant"), v.literal("expansive"),
        v.literal("grief"), v.literal("excited")
      ),
      alignmentScore: v.number(),
      alignmentRationale: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { analysis: args.analysis });
  },
});

export const listEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(args.limit ?? 50, 100));
  },
});

export const getEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return null;
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) return null;
    return entry;
  },
});

export const recentEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 7);
  },
});
```

**Step 2: Commit**

```bash
git add convex/entries.ts
git commit -m "feat: update entries.ts with better-auth"
```

---

### Task 9: Update Backend — conversations.ts

**Files:**
- Modify: `convex/conversations.ts`

**Step 1: Replace auth**

```ts
// convex/conversations.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

async function requireAppUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q: any) =>
      q.eq("betterAuthId", authUser.userId)
    )
    .unique();
  if (!user) throw new Error("User not provisioned");
  return user._id;
}

async function getAppUserId(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q: any) =>
      q.eq("betterAuthId", authUser.userId)
    )
    .unique();
  return user?._id ?? null;
}

export const addTurn = mutation({
  args: {
    entryId: v.id("entries"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) throw new Error("Not found");
    return ctx.db.insert("conversationTurns", {
      entryId: args.entryId,
      userId,
      role: args.role,
      content: args.content,
    });
  },
});

export const getTurns = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) return [];
    return ctx.db
      .query("conversationTurns")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .order("asc")
      .collect();
  },
});
```

**Step 2: Commit**

```bash
git add convex/conversations.ts
git commit -m "feat: update conversations.ts with better-auth"
```

---

### Task 10: Update Backend — ai.ts

**Files:**
- Modify: `convex/ai.ts`

**Step 1: Replace auth import**

Actions don't have direct DB access, so we use `authComponent.getAuthUser(ctx)` for the auth check, and `ctx.runQuery` for the ownership check (which already exists).

Replace `import { getAuthUserId } from "@convex-dev/auth/server"` with `import { authComponent } from "./auth"`. Replace all `getAuthUserId(ctx)` calls with `authComponent.getAuthUser(ctx)` and check for null.

```ts
// At the top of convex/ai.ts, replace:
// import { getAuthUserId } from "@convex-dev/auth/server";
// with:
import { authComponent } from "./auth";

// In each action handler, replace:
//   const userId = await getAuthUserId(ctx);
//   if (!userId) throw new Error("Not authenticated");
// with:
//   const authUser = await authComponent.getAuthUser(ctx);
//   if (!authUser) throw new Error("Not authenticated");
```

The rest of `ai.ts` stays the same — the ownership check in `analyzeEntry` uses `ctx.runQuery(api.entries.getEntry, ...)` which handles auth internally.

**Full file — only the changed parts (auth lines):**

In `analyzeEntry` handler (line ~53):
```ts
const authUser = await authComponent.getAuthUser(ctx);
if (!authUser) throw new Error("Not authenticated");
```

In `generateDailyPrompt` handler (line ~145):
```ts
const authUser = await authComponent.getAuthUser(ctx);
if (!authUser) throw new Error("Not authenticated");
```

In `conversationalTurn` handler (line ~199):
```ts
const authUser = await authComponent.getAuthUser(ctx);
if (!authUser) throw new Error("Not authenticated");
```

**Step 2: Commit**

```bash
git add convex/ai.ts
git commit -m "feat: update ai.ts with better-auth"
```

---

### Task 11: Update Backend — dashboard.ts

**Files:**
- Modify: `convex/dashboard.ts`

**Step 1: Replace auth**

```ts
// convex/dashboard.ts
import { query } from "./_generated/server";
import { authComponent } from "./auth";

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthId", authUser.userId)
      )
      .unique();
    if (!user) return null;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(30);

    const streak = calculateStreak(entries);
    const last7 = entries.slice(0, 7).reverse();
    const alignmentTrend = last7
      .filter((e) => e.analysis)
      .map((e) => ({
        date: new Date(e._creationTime).toLocaleDateString("en-US", { weekday: "short" }),
        score: e.analysis!.alignmentScore,
      }));

    const toneCounts: Record<string, number> = {};
    entries.forEach((e) => {
      if (e.analysis?.emotionalTone) {
        toneCounts[e.analysis.emotionalTone] = (toneCounts[e.analysis.emotionalTone] ?? 0) + 1;
      }
    });

    return { streak, alignmentTrend, toneCounts, totalEntries: entries.length };
  },
});

function calculateStreak(entries: Array<{ _creationTime: number }>): number {
  if (entries.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let current = today;

  for (const entry of entries) {
    const entryDate = new Date(entry._creationTime);
    entryDate.setHours(0, 0, 0, 0);
    const diff = (current.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1) {
      streak++;
      current = entryDate;
    } else {
      break;
    }
  }
  return streak;
}
```

**Step 2: Commit**

```bash
git add convex/dashboard.ts
git commit -m "feat: update dashboard.ts with better-auth"
```

---

### Task 12: Create Auth Client

**Files:**
- Create: `src/lib/auth-client.ts`

**Step 1: Write client**

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { convexClient, magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    magicLinkClient(),
  ],
});
```

**Step 2: Commit**

```bash
git add src/lib/auth-client.ts
git commit -m "feat: better-auth client with convex + magic link plugins"
```

---

### Task 13: Create TanStack Start API Route

**Files:**
- Create: `src/routes/api/auth/$.ts`

**Step 1: Create API route**

This catch-all route proxies all `/api/auth/*` requests to Better Auth via Convex.

```ts
// src/routes/api/auth/$.ts
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { reactStartHandler } from "@convex-dev/better-auth/react-start";

export const Route = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => reactStartHandler(request),
  POST: ({ request }) => reactStartHandler(request),
});
```

**Step 2: Verify the file is picked up**

Run: `bun run dev` (briefly, then Ctrl+C)
Expected: No errors about the route file. TanStack Start should register `/api/auth/$`.

**Step 3: Commit**

```bash
git add src/routes/api/auth/$.ts
git commit -m "feat: tanstack start api route for better-auth"
```

---

### Task 14: Update Root Route

**Files:**
- Modify: `src/routes/__root.tsx`

**Step 1: Replace provider**

```ts
// src/routes/__root.tsx
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "../lib/auth-client";
import { useRef } from "react";
import '../styles.css'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  const convex = useRef(
    new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
  ).current;

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
          <Outlet />
        </ConvexBetterAuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

**Step 2: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat: ConvexBetterAuthProvider in root route"
```

---

### Task 15: Update Login Page

**Files:**
- Modify: `src/routes/login.tsx`

**Step 1: Rewrite with Better Auth client**

```ts
// src/routes/login.tsx
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (session && !isPending) {
    navigate({ to: "/" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authClient.signIn.magicLink({ email, callbackURL: "/" });
      setSent(true);
    } catch (err) {
      console.error("Magic link sign-in failed:", err);
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscord = async () => {
    setError(null);
    try {
      await authClient.signIn.social({ provider: "discord" });
    } catch (err) {
      console.error("Discord sign-in failed:", err);
      setError(err instanceof Error ? err.message : "Discord sign-in failed");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Manifest Journal
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Sign in to continue
          </p>
        </div>
        {error && (
          <div className="w-full max-w-sm rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {sent ? (
          <div className="text-center">
            <p className="text-sm text-stone-700">
              Check your email for a sign-in link.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Sent to {email}
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-stone-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-stone-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send magic link"}
              </button>
            </form>
            <div className="flex items-center gap-3 w-full max-w-sm">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs text-stone-400">or</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>
            <button
              type="button"
              onClick={handleDiscord}
              className="flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Continue with Discord
            </button>
          </>
        )}
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add src/routes/login.tsx
git commit -m "feat: login page with better-auth client"
```

---

### Task 16: Update Register Page

**Files:**
- Modify: `src/routes/register.tsx`

**Step 1: Rewrite with Better Auth client**

Same pattern as login, with "Create your account" text and link to login.

```ts
// src/routes/register.tsx
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session && !isPending) {
    navigate({ to: "/" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authClient.signIn.magicLink({ email, callbackURL: "/" });
      setSent(true);
    } catch (err) {
      console.error("Magic link sign-in failed:", err);
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscord = async () => {
    setError(null);
    try {
      await authClient.signIn.social({ provider: "discord" });
    } catch (err) {
      console.error("Discord sign-in failed:", err);
      setError(err instanceof Error ? err.message : "Discord sign-in failed");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Manifest Journal
          </h1>
          <p className="mt-1 text-sm text-stone-500">Create your account</p>
        </div>
        {error && (
          <div className="w-full max-w-sm rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {sent ? (
          <div className="text-center">
            <p className="text-sm text-stone-700">
              Check your email for a sign-in link.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Sent to {email}
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-stone-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-stone-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send magic link"}
              </button>
            </form>
            <div className="flex items-center gap-3 w-full max-w-sm">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs text-stone-400">or</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>
            <button
              type="button"
              onClick={handleDiscord}
              className="flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Continue with Discord
            </button>
            <p className="text-sm text-stone-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-stone-900 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add src/routes/register.tsx
git commit -m "feat: register page with better-auth client"
```

---

### Task 17: Update AuthGuard + User Provisioning

**Files:**
- Modify: `src/components/AuthGuard.tsx`

**Step 1: Update with Better Auth session + ensureUser call**

The AuthGuard now:
1. Uses `authClient.useSession()` for auth state
2. Calls `ensureUser` mutation when authenticated (provisions app user on first login)

```ts
// src/components/AuthGuard.tsx
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "../lib/auth-client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const ensureUser = useMutation(api.users.ensureUser);

  const isAuthenticated = !!session;

  // Provision app user on first authenticated load
  useEffect(() => {
    if (isAuthenticated) {
      ensureUser().catch((err) =>
        console.error("Failed to ensure user:", err)
      );
    }
  }, [isAuthenticated, ensureUser]);

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isPending, navigate]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
```

**Step 2: Commit**

```bash
git add src/components/AuthGuard.tsx
git commit -m "feat: authguard with better-auth session + user provisioning"
```

---

### Task 18: Environment Variables

**Step 1: Generate BETTER_AUTH_SECRET**

Run: `openssl rand -base64 32`
Copy the output.

**Step 2: Set env vars on Convex**

Run the following (replace values):
```bash
bunx convex env set BETTER_AUTH_SECRET "<generated-secret>"
bunx convex env set DISCORD_CLIENT_ID "<your-discord-client-id>"
bunx convex env set DISCORD_CLIENT_SECRET "<your-discord-client-secret>"
```

**Step 3: Remove old env vars**

```bash
bunx convex env unset JWT_PRIVATE_KEY
bunx convex env unset JWKS
bunx convex env unset AUTH_DISCORD_ID
bunx convex env unset AUTH_DISCORD_SECRET
```

**Step 4: Update .env.local**

Replace `AUTH_DISCORD_ID` → `DISCORD_CLIENT_ID`, `AUTH_DISCORD_SECRET` → `DISCORD_CLIENT_SECRET`. Add `BETTER_AUTH_SECRET`. Remove `JWT_PRIVATE_KEY` and `JWKS`.

**Step 5: Update Discord OAuth redirect URI**

In the Discord Developer Portal, update the OAuth2 redirect URI to:
```
http://localhost:3000/api/auth/callback/discord
```
(And the production URL equivalent once deployed.)

> **Important:** With Better Auth, the redirect goes through the **app URL** (not the Convex `.convex.site` URL). This is different from Convex Auth.

---

### Task 19: Deploy and Smoke Test

**Step 1: Deploy Convex**

Run: `bunx convex dev --once`
Expected: Successful push. The new schema and functions deploy.

> **Warning:** This will wipe any existing data since the schema changed (removed auth tables, changed users table shape). That's expected — no real users exist.

**Step 2: Start dev server**

Run: `bun run dev`
Expected: No build errors.

**Step 3: Test Discord OAuth**

1. Navigate to `http://localhost:3000/login`
2. Click "Continue with Discord"
3. Complete Discord OAuth
4. Should redirect to `/` (home page)
5. Should redirect to `/onboarding` (no dream profile yet)

**Step 4: Test magic link**

1. Navigate to `http://localhost:3000/login`
2. Enter email, click "Send magic link"
3. Check email for link
4. Click link, should authenticate and redirect

**Step 5: Verify backend auth**

1. After signing in, complete onboarding
2. Create a journal entry
3. Check dashboard — should show entry

**Step 6: Commit any final adjustments**

```bash
git add -A
git commit -m "fix: adjustments from smoke testing"
```

---

## Summary of All Files Changed

| File | Action | Task |
|------|--------|------|
| `package.json` | Modify (swap deps) | 1 |
| `convex/convex.config.ts` | Create | 2 |
| `convex/schema.ts` | Modify (clean schema) | 3 |
| `convex/auth.ts` | Rewrite | 4 |
| `convex/lib/authHelper.ts` | Create | 5 |
| `convex/http.ts` | Rewrite | 6 |
| `convex/users.ts` | Rewrite (+ ensureUser) | 7 |
| `convex/entries.ts` | Modify (auth swap) | 8 |
| `convex/conversations.ts` | Modify (auth swap) | 9 |
| `convex/ai.ts` | Modify (auth swap) | 10 |
| `convex/dashboard.ts` | Modify (auth swap) | 11 |
| `src/lib/auth-client.ts` | Create | 12 |
| `src/routes/api/auth/$.ts` | Create | 13 |
| `src/routes/__root.tsx` | Modify (provider swap) | 14 |
| `src/routes/login.tsx` | Rewrite | 15 |
| `src/routes/register.tsx` | Rewrite | 16 |
| `src/components/AuthGuard.tsx` | Rewrite | 17 |
| `.env.local` | Modify (env vars) | 18 |

## Environment Variables Summary

| Variable | Action |
|----------|--------|
| `BETTER_AUTH_SECRET` | Add — `openssl rand -base64 32` |
| `DISCORD_CLIENT_ID` | Add (rename from `AUTH_DISCORD_ID`) |
| `DISCORD_CLIENT_SECRET` | Add (rename from `AUTH_DISCORD_SECRET`) |
| `SITE_URL` | Keep |
| `AUTH_RESEND_KEY` | Keep |
| `JWT_PRIVATE_KEY` | Remove |
| `JWKS` | Remove |
| `AUTH_DISCORD_ID` | Remove (renamed) |
| `AUTH_DISCORD_SECRET` | Remove (renamed) |
