# Manifest Journal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a daily journaling web app that coaches users toward their dream life by analyzing entries and returning pattern insights, nudges, emotional tone, and alignment scores via Claude.

**Architecture:** TanStack Start (SSR + file-based routing) as the frontend framework, Convex as the real-time reactive database and backend action runner, Claude (claude-sonnet-4-6) via Anthropic SDK for all AI operations. Auth is handled by Convex Auth.

**Tech Stack:** TanStack Start, TanStack Router, Convex, Convex Auth, Tailwind CSS, Anthropic SDK, OpenAI SDK (embeddings), Vitest, React Testing Library

---

## Design Reference

Full design doc: `docs/plans/2026-03-02-manifest-journal-design.md`

Key decisions to carry forward:
- `analyzeEntry` returns structured JSON (not prose) — store each field separately in Convex
- Emotional tone is a fixed enum: `hopeful | anxious | stuck | clear | resistant | expansive | grief | excited`
- Three journal modes: `open | guided | conversational`
- Dream Profile = manifesto (text) + 5 categories (career, relationships, health, wealth, creative)

---

## Task 1: Scaffold TanStack Start + Convex Project

**Files:**
- Create: `package.json`
- Create: `app.config.ts`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `app/router.tsx`
- Create: `app/client.tsx`
- Create: `app/ssr.tsx`
- Create: `app/routes/__root.tsx`

**Step 1: Scaffold the TanStack Start project**

```bash
pnpm dlx create-tsrouter-app@latest . --template start --package-manager pnpm
```

When prompted, accept defaults. This creates the boilerplate for TanStack Start with SSR.

**Step 2: Install dependencies**

```bash
pnpm add convex @convex-dev/auth
pnpm add @anthropic-ai/sdk openai
pnpm add @tanstack/react-query
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 3: Install Tailwind**

```bash
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p
```

**Step 4: Configure Tailwind — `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

**Step 5: Add Tailwind to CSS — `app/styles/app.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 6: Initialize Convex**

```bash
pnpm dlx convex dev --once
```

This creates `convex/` directory and `convex/_generated/`. Note the deployment URL from output — you'll need it.

**Step 7: Add env vars — `.env.local`**

```
CONVEX_DEPLOYMENT=<your-deployment-url>
VITE_CONVEX_URL=<your-convex-url>
ANTHROPIC_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
```

**Step 8: Update `app/router.tsx` to include Convex provider**

```tsx
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexProvider } from "convex/react";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  const convexClient = new ConvexQueryClient(import.meta.env.VITE_CONVEX_URL);
  const queryClient = new QueryClient();

  const router = createTanStackRouter({
    routeTree,
    context: { convexClient, queryClient },
    defaultPreload: "intent",
  });

  return router;
}
```

**Step 9: Verify dev server starts**

```bash
pnpm dev
```

Expected: App runs at `http://localhost:3000` with default TanStack Start page.

**Step 10: Commit**

```bash
git add .
git commit -m "feat: scaffold TanStack Start + Convex project"
```

---

## Task 2: Convex Schema

**Files:**
- Create: `convex/schema.ts`

**Step 1: Write the schema**

```ts
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
```

**Step 2: Push schema to Convex**

```bash
pnpm dlx convex dev --once
```

Expected: `✓ Schema updated` in output.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add Convex schema for users, entries, conversationTurns"
```

---

## Task 3: Convex Auth Setup

**Files:**
- Create: `convex/auth.ts`
- Create: `convex/http.ts`
- Modify: `app/routes/__root.tsx`

**Step 1: Set up Convex Auth**

```ts
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password,
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
});
```

**Step 2: Add HTTP router**

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);
export default http;
```

**Step 3: Update root layout to wrap with auth provider**

```tsx
// app/routes/__root.tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "../styles/app.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <ConvexAuthProvider client={convex}>
      <Outlet />
    </ConvexAuthProvider>
  );
}
```

**Step 4: Push to Convex**

```bash
pnpm dlx convex dev --once
```

Expected: Auth routes configured.

**Step 5: Commit**

```bash
git add convex/auth.ts convex/http.ts app/routes/__root.tsx
git commit -m "feat: configure Convex Auth with email/password and Google"
```

---

## Task 4: Auth UI (Login / Register)

**Files:**
- Create: `app/routes/login.tsx`
- Create: `app/routes/register.tsx`
- Create: `app/components/AuthForm.tsx`

**Step 1: Write failing test for AuthForm**

```tsx
// app/components/AuthForm.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AuthForm } from "./AuthForm";

describe("AuthForm", () => {
  it("renders email and password fields", () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("calls onSubmit with email and password", async () => {
    const onSubmit = vi.fn();
    render(<AuthForm mode="login" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/email/i), "test@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "password123",
    });
  });
});
```

**Step 2: Run to verify it fails**

```bash
pnpm vitest run app/components/AuthForm.test.tsx
```

Expected: FAIL — `AuthForm` not found.

**Step 3: Implement AuthForm**

```tsx
// app/components/AuthForm.tsx
import { useState } from "react";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (data: { email: string; password: string }) => void;
  isLoading?: boolean;
}

export function AuthForm({ mode, onSubmit, isLoading }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
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
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-stone-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="bg-stone-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
      >
        {isLoading ? "Loading..." : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run app/components/AuthForm.test.tsx
```

Expected: PASS

**Step 5: Create login route**

```tsx
// app/routes/login.tsx
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthForm } from "../components/AuthForm";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async ({ email, password }: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      navigate({ to: "/" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-stone-900">Manifest Journal</h1>
        <p className="text-stone-500 text-sm mt-1">Welcome back</p>
      </div>
      <AuthForm mode="login" onSubmit={handleSubmit} isLoading={isLoading} />
      <p className="mt-4 text-sm text-stone-500">
        No account?{" "}
        <Link to="/register" className="text-stone-900 underline">
          Register
        </Link>
      </p>
    </div>
  );
}
```

**Step 6: Create register route (same pattern)**

```tsx
// app/routes/register.tsx
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthForm } from "../components/AuthForm";
import { useState } from "react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async ({ email, password }: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      await signIn("password", { email, password, flow: "signUp" });
      navigate({ to: "/onboarding" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-stone-900">Manifest Journal</h1>
        <p className="text-stone-500 text-sm mt-1">Start your journey</p>
      </div>
      <AuthForm mode="register" onSubmit={handleSubmit} isLoading={isLoading} />
      <p className="mt-4 text-sm text-stone-500">
        Have an account?{" "}
        <Link to="/login" className="text-stone-900 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add app/routes/login.tsx app/routes/register.tsx app/components/AuthForm.tsx app/components/AuthForm.test.tsx
git commit -m "feat: add auth UI (login + register)"
```

---

## Task 5: User Queries & Auth Guard

**Files:**
- Create: `convex/users.ts`
- Create: `app/hooks/useCurrentUser.ts`
- Create: `app/components/AuthGuard.tsx`

**Step 1: Write Convex user queries**

```ts
// convex/users.ts
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db.get(userId);
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, {
      dreamProfile: {
        manifesto: args.manifesto,
        categories: args.categories,
      },
    });
  },
});
```

**Step 2: Create auth guard component**

```tsx
// app/components/AuthGuard.tsx
import { useConvexAuth } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
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

**Step 3: Update root route to redirect authenticated users**

In `app/routes/__root.tsx`, after the ConvexAuthProvider, the router handles redirection at individual route level via `AuthGuard`.

**Step 4: Push Convex functions**

```bash
pnpm dlx convex dev --once
```

Expected: `users.ts` functions deployed.

**Step 5: Commit**

```bash
git add convex/users.ts app/hooks/useCurrentUser.ts app/components/AuthGuard.tsx
git commit -m "feat: add user queries and auth guard"
```

---

## Task 6: Dream Life Onboarding

**Files:**
- Create: `app/routes/onboarding.tsx`
- Create: `app/components/ManifestoEditor.tsx`
- Create: `app/components/CategoryCard.tsx`

**Step 1: Write failing test for ManifestoEditor**

```tsx
// app/components/ManifestoEditor.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ManifestoEditor } from "./ManifestoEditor";

describe("ManifestoEditor", () => {
  it("renders a textarea with placeholder", () => {
    render(<ManifestoEditor value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/my ideal life/i)).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const onChange = vi.fn();
    render(<ManifestoEditor value="" onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText(/my ideal life/i), "I want");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows word count", () => {
    render(<ManifestoEditor value="hello world" onChange={vi.fn()} />);
    expect(screen.getByText(/2 words/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify fails**

```bash
pnpm vitest run app/components/ManifestoEditor.test.tsx
```

Expected: FAIL

**Step 3: Implement ManifestoEditor**

```tsx
// app/components/ManifestoEditor.tsx
interface ManifestoEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ManifestoEditor({ value, onChange }: ManifestoEditorProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="My ideal life looks like... (write freely, 200–1000 words)"
        rows={12}
        className="w-full border border-stone-200 rounded-xl p-4 text-stone-800 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
      />
      <div className="text-xs text-stone-400 text-right">
        {wordCount} {wordCount === 1 ? "word" : "words"}
        {wordCount > 0 && wordCount < 200 && (
          <span className="ml-2 text-amber-500">({200 - wordCount} more to go)</span>
        )}
        {wordCount >= 200 && <span className="ml-2 text-emerald-500">✓</span>}
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify passes**

```bash
pnpm vitest run app/components/ManifestoEditor.test.tsx
```

Expected: PASS

**Step 5: Implement CategoryCard**

```tsx
// app/components/CategoryCard.tsx
const CATEGORY_ICONS: Record<string, string> = {
  career: "💼",
  relationships: "❤️",
  health: "🌿",
  wealth: "✨",
  creative: "🎨",
};

interface CategoryCardProps {
  category: keyof typeof CATEGORY_ICONS;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function CategoryCard({ category, label, value, onChange }: CategoryCardProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{CATEGORY_ICONS[category]}</span>
        <span className="text-sm font-medium text-stone-700">{label}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Your ideal ${label.toLowerCase()}...`}
        rows={3}
        className="w-full text-sm text-stone-700 resize-none focus:outline-none leading-relaxed"
      />
    </div>
  );
}
```

**Step 6: Implement Onboarding route**

```tsx
// app/routes/onboarding.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { AuthGuard } from "../components/AuthGuard";
import { ManifestoEditor } from "../components/ManifestoEditor";
import { CategoryCard } from "../components/CategoryCard";

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <AuthGuard>
      <OnboardingPage />
    </AuthGuard>
  ),
});

const CATEGORIES = [
  { key: "career", label: "Career" },
  { key: "relationships", label: "Relationships" },
  { key: "health", label: "Health" },
  { key: "wealth", label: "Wealth" },
  { key: "creative", label: "Creative Expression" },
] as const;

function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [manifesto, setManifesto] = useState("");
  const [categories, setCategories] = useState({
    career: "",
    relationships: "",
    health: "",
    wealth: "",
    creative: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateDreamProfile = useMutation(api.users.updateDreamProfile);
  const navigate = useNavigate();

  const wordCount = manifesto.trim() ? manifesto.trim().split(/\s+/).length : 0;

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      await updateDreamProfile({ manifesto, categories });
      navigate({ to: "/" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-12 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex gap-2 mb-6">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-stone-900" : "bg-stone-200"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-stone-900" : "bg-stone-200"}`} />
        </div>
        {step === 1 ? (
          <>
            <h1 className="text-xl font-semibold text-stone-900 mb-1">Your dream life</h1>
            <p className="text-stone-500 text-sm">Write freely. Describe the life you want to live.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-stone-900 mb-1">Five dimensions</h1>
            <p className="text-stone-500 text-sm">Fill in each area of your ideal life.</p>
          </>
        )}
      </div>

      {step === 1 ? (
        <div className="flex flex-col gap-6">
          <ManifestoEditor value={manifesto} onChange={setManifesto} />
          <button
            onClick={() => setStep(2)}
            disabled={wordCount < 50}
            className="self-end bg-stone-900 text-white text-sm font-medium px-6 py-2 rounded-lg disabled:opacity-40"
          >
            Continue →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {CATEGORIES.map(({ key, label }) => (
            <CategoryCard
              key={key}
              category={key}
              label={label}
              value={categories[key]}
              onChange={(val) => setCategories((c) => ({ ...c, [key]: val }))}
            />
          ))}
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep(1)}
              className="text-stone-500 text-sm px-4 py-2 rounded-lg border border-stone-200"
            >
              ← Back
            </button>
            <button
              onClick={handleFinish}
              disabled={isLoading}
              className="flex-1 bg-stone-900 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-40"
            >
              {isLoading ? "Saving..." : "Start journaling →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add app/routes/onboarding.tsx app/components/ManifestoEditor.tsx app/components/CategoryCard.tsx app/components/ManifestoEditor.test.tsx
git commit -m "feat: add dream life onboarding (manifesto + categories)"
```

---

## Task 7: Entry Queries & Mutations

**Files:**
- Create: `convex/entries.ts`

**Step 1: Write entry mutations and queries**

```ts
// convex/entries.ts
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const createEntry = mutation({
  args: {
    content: v.string(),
    mode: v.union(v.literal("open"), v.literal("guided"), v.literal("conversational")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return ctx.db.insert("entries", {
      userId,
      content: args.content,
      mode: args.mode,
    });
  },
});

export const updateEntryAnalysis = mutation({
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.entryId, { analysis: args.analysis });
  },
});

export const listEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) return null;
    return entry;
  },
});

export const recentEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 7);
  },
});
```

**Step 2: Push to Convex**

```bash
pnpm dlx convex dev --once
```

Expected: `entries.ts` functions deployed.

**Step 3: Commit**

```bash
git add convex/entries.ts
git commit -m "feat: add entry CRUD mutations and queries"
```

---

## Task 8: AI Actions (Convex)

**Files:**
- Create: `convex/ai.ts`

The AI actions run server-side in Convex. They call the Anthropic SDK and store results.

**Step 1: Write the AI actions**

```ts
// convex/ai.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EMOTIONAL_TONES = ["hopeful", "anxious", "stuck", "clear", "resistant", "expansive", "grief", "excited"] as const;

type AnalysisResult = {
  patternInsight: string;
  nudge: string;
  emotionalTone: typeof EMOTIONAL_TONES[number];
  alignmentScore: number;
  alignmentRationale: string;
};

function formatDreamProfile(profile: { manifesto: string; categories: Record<string, string> }) {
  return `MANIFESTO:\n${profile.manifesto}\n\nCATEGORIES:\n${Object.entries(profile.categories)
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
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
    recentEntryContents: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<AnalysisResult> => {
    const recentContext = args.recentEntryContents.length
      ? `\nRECENT ENTRIES (last ${args.recentEntryContents.length}):\n${args.recentEntryContents.map((e, i) => `[${i + 1}] ${e.slice(0, 300)}`).join("\n\n")}`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are a manifestation coach. The user's dream life profile is:\n\n${formatDreamProfile(args.dreamProfile)}${recentContext}\n\nAnalyze journal entries and return JSON only. No explanation outside the JSON.`,
      messages: [
        {
          role: "user",
          content: `Analyze this journal entry. Return ONLY valid JSON matching this exact shape:
{
  "patternInsight": "1-2 sentences about a recurring theme or mental block",
  "nudge": "1 reframe or provocative question, max 40 words",
  "emotionalTone": "one of: hopeful|anxious|stuck|clear|resistant|expansive|grief|excited",
  "alignmentScore": 7,
  "alignmentRationale": "1 sentence explaining the score"
}

ENTRY:
${args.content}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const parsed = JSON.parse(text) as AnalysisResult;

    // Validate emotional tone falls in enum
    if (!EMOTIONAL_TONES.includes(parsed.emotionalTone)) {
      parsed.emotionalTone = "hopeful";
    }

    // Store analysis on the entry
    await ctx.runMutation(api.entries.updateEntryAnalysis, {
      entryId: args.entryId,
      analysis: parsed,
    });

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
    recentEntryContents: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const recentContext = args.recentEntryContents.length
      ? `\nRECENT ENTRIES:\n${args.recentEntryContents.map((e, i) => `[${i + 1}] ${e.slice(0, 200)}`).join("\n\n")}`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      system: `You are a manifestation coach. Dream profile:\n${formatDreamProfile(args.dreamProfile)}${recentContext}`,
      messages: [
        {
          role: "user",
          content: `Generate one journaling prompt (max 50 words) that:
- Draws from a theme the user hasn't fully explored yet
- Pulls them toward their dream life vision
- Feels personal, not generic
Return ONLY the prompt text. Nothing else.`,
        },
      ],
    });

    return message.content[0].type === "text" ? message.content[0].text.trim() : "What would the person you're becoming do differently today?";
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
    history: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    })),
    userMessage: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system: `You are a manifestation coach. Dream profile:\n${formatDreamProfile(args.dreamProfile)}\n\nBe warm, probing, never preachy. Max 100 words. End with a question.`,
      messages: [
        ...args.history.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: args.userMessage },
      ],
    });

    return message.content[0].type === "text" ? message.content[0].text.trim() : "Tell me more about that.";
  },
});
```

**Step 2: Push to Convex**

```bash
pnpm dlx convex dev --once
```

Expected: `ai.ts` actions deployed.

**Step 3: Commit**

```bash
git add convex/ai.ts
git commit -m "feat: add Convex AI actions (analyzeEntry, generateDailyPrompt, conversationalTurn)"
```

---

## Task 9: Home Screen + Mode Selector

**Files:**
- Create: `app/routes/index.tsx`
- Create: `app/components/ModeSelector.tsx`
- Create: `app/components/StreakBadge.tsx`

**Step 1: Write failing test for ModeSelector**

```tsx
// app/components/ModeSelector.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ModeSelector } from "./ModeSelector";

describe("ModeSelector", () => {
  it("renders all three modes", () => {
    render(<ModeSelector selected="open" onSelect={vi.fn()} />);
    expect(screen.getByText(/open canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/guided/i)).toBeInTheDocument();
    expect(screen.getByText(/conversational/i)).toBeInTheDocument();
  });

  it("calls onSelect with the mode when clicked", async () => {
    const onSelect = vi.fn();
    render(<ModeSelector selected="open" onSelect={onSelect} />);
    await userEvent.click(screen.getByText(/guided/i));
    expect(onSelect).toHaveBeenCalledWith("guided");
  });
});
```

**Step 2: Run to verify fails**

```bash
pnpm vitest run app/components/ModeSelector.test.tsx
```

Expected: FAIL

**Step 3: Implement ModeSelector**

```tsx
// app/components/ModeSelector.tsx
type JournalMode = "open" | "guided" | "conversational";

const MODES: { id: JournalMode; label: string; description: string }[] = [
  { id: "open", label: "Open Canvas", description: "Write freely" },
  { id: "guided", label: "Guided", description: "AI gives you a prompt" },
  { id: "conversational", label: "Conversational", description: "Back-and-forth with coach" },
];

interface ModeSelectorProps {
  selected: JournalMode;
  onSelect: (mode: JournalMode) => void;
}

export function ModeSelector({ selected, onSelect }: ModeSelectorProps) {
  return (
    <div className="flex gap-2">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onSelect(mode.id)}
          className={`flex-1 text-left px-3 py-2 rounded-xl border text-sm transition-all ${
            selected === mode.id
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
          }`}
        >
          <div className="font-medium">{mode.label}</div>
          <div className={`text-xs mt-0.5 ${selected === mode.id ? "text-stone-300" : "text-stone-400"}`}>
            {mode.description}
          </div>
        </button>
      ))}
    </div>
  );
}
```

**Step 4: Run test to verify passes**

```bash
pnpm vitest run app/components/ModeSelector.test.tsx
```

Expected: PASS

**Step 5: Implement home route (Open Canvas mode)**

This is the main daily session screen. Guided and conversational modes are added in subsequent tasks.

```tsx
// app/routes/index.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { AuthGuard } from "../components/AuthGuard";
import { ModeSelector } from "../components/ModeSelector";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  ),
});

type JournalMode = "open" | "guided" | "conversational";

function HomePage() {
  const [mode, setMode] = useState<JournalMode>("open");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useQuery(api.users.currentUser);
  const recent = useQuery(api.entries.recentEntries, { limit: 7 });
  const createEntry = useMutation(api.entries.createEntry);
  const analyzeEntry = useAction(api.ai.analyzeEntry);
  const navigate = useNavigate();

  // Redirect to onboarding if no dream profile set
  if (user && !user.dreamProfile) {
    navigate({ to: "/onboarding" });
    return null;
  }

  const handleSubmit = async () => {
    if (!content.trim() || !user?.dreamProfile) return;
    setIsSubmitting(true);
    try {
      const entryId = await createEntry({ content, mode });
      const recentContents = (recent ?? []).map((e) => e.content);
      await analyzeEntry({
        entryId,
        content,
        dreamProfile: user.dreamProfile,
        recentEntryContents: recentContents,
      });
      navigate({ to: "/response/$entryId", params: { entryId } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">{today}</p>
            <h1 className="text-lg font-semibold text-stone-900">Daily Journal</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ to: "/history" })}
              className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white"
            >
              History
            </button>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Mode selector */}
        <ModeSelector selected={mode} onSelect={setMode} />

        {/* Editor */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={mode === "open" ? "What's on your mind today?" : "Loading your prompt..."}
            rows={12}
            className="w-full resize-none text-stone-800 text-sm leading-relaxed focus:outline-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-300">
              {content.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className="bg-stone-900 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-40"
            >
              {isSubmitting ? "Analyzing..." : "Submit →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add app/routes/index.tsx app/components/ModeSelector.tsx app/components/ModeSelector.test.tsx
git commit -m "feat: add home screen with journal editor and mode selector"
```

---

## Task 10: AI Response View

**Files:**
- Create: `app/routes/response.$entryId.tsx`
- Create: `app/components/AlignmentDial.tsx`
- Create: `app/components/InsightCard.tsx`

**Step 1: Write failing test for AlignmentDial**

```tsx
// app/components/AlignmentDial.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AlignmentDial } from "./AlignmentDial";

describe("AlignmentDial", () => {
  it("renders the score", () => {
    render(<AlignmentDial score={7} rationale="Mostly aligned" />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders the rationale", () => {
    render(<AlignmentDial score={7} rationale="Mostly aligned" />);
    expect(screen.getByText("Mostly aligned")).toBeInTheDocument();
  });

  it("renders out of 10 label", () => {
    render(<AlignmentDial score={7} rationale="Mostly aligned" />);
    expect(screen.getByText(/out of 10/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify fails**

```bash
pnpm vitest run app/components/AlignmentDial.test.tsx
```

Expected: FAIL

**Step 3: Implement AlignmentDial**

```tsx
// app/components/AlignmentDial.tsx
interface AlignmentDialProps {
  score: number; // 1-10
  rationale: string;
}

const SCORE_COLORS: Record<number, string> = {
  1: "#ef4444", 2: "#f97316", 3: "#f97316",
  4: "#eab308", 5: "#eab308", 6: "#84cc16",
  7: "#22c55e", 8: "#22c55e", 9: "#10b981", 10: "#10b981",
};

export function AlignmentDial({ score, rationale }: AlignmentDialProps) {
  const color = SCORE_COLORS[Math.round(score)] ?? "#84cc16";
  const circumference = 2 * Math.PI * 36;
  const progress = (score / 10) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#e7e5e4" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-stone-900">{score}</span>
          <span className="text-xs text-stone-400">out of 10</span>
        </div>
      </div>
      <p className="text-center text-sm text-stone-600 max-w-xs">{rationale}</p>
    </div>
  );
}
```

**Step 4: Run test to verify passes**

```bash
pnpm vitest run app/components/AlignmentDial.test.tsx
```

Expected: PASS

**Step 5: Implement InsightCard**

```tsx
// app/components/InsightCard.tsx
interface InsightCardProps {
  type: "pattern" | "nudge" | "tone";
  title: string;
  content: string;
  badge?: string;
}

const TYPE_STYLES = {
  pattern: "bg-blue-50 border-blue-100",
  nudge: "bg-amber-50 border-amber-100",
  tone: "bg-emerald-50 border-emerald-100",
};

export function InsightCard({ type, title, content, badge }: InsightCardProps) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${TYPE_STYLES[type]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{title}</span>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600 capitalize">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-stone-700 leading-relaxed">{content}</p>
    </div>
  );
}
```

**Step 6: Implement AI Response route**

```tsx
// app/routes/response.$entryId.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { AlignmentDial } from "../components/AlignmentDial";
import { InsightCard } from "../components/InsightCard";

export const Route = createFileRoute("/response/$entryId")({
  component: () => (
    <AuthGuard>
      <ResponsePage />
    </AuthGuard>
  ),
});

function ResponsePage() {
  const { entryId } = Route.useParams();
  const entry = useQuery(api.entries.getEntry, { entryId: entryId as any });
  const navigate = useNavigate();

  if (!entry) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400 text-sm">Loading your analysis...</div>
      </div>
    );
  }

  const { analysis } = entry;

  if (!analysis) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400 text-sm">Analyzing your entry...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Your coach says</p>
          <h1 className="text-lg font-semibold text-stone-900">Today's reflection</h1>
        </div>

        <InsightCard
          type="pattern"
          title="Pattern Insight"
          content={analysis.patternInsight}
        />

        <InsightCard
          type="nudge"
          title="Nudge"
          content={analysis.nudge}
        />

        <InsightCard
          type="tone"
          title="Emotional Tone"
          content={`Your entry reads as ${analysis.emotionalTone}.`}
          badge={analysis.emotionalTone}
        />

        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4 text-center">
            Alignment Pulse
          </p>
          <AlignmentDial
            score={analysis.alignmentScore}
            rationale={analysis.alignmentRationale}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex-1 border border-stone-200 bg-white text-stone-700 text-sm font-medium py-3 rounded-xl"
          >
            Done for today
          </button>
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex-1 bg-stone-900 text-white text-sm font-medium py-3 rounded-xl"
          >
            Keep writing →
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add app/routes/response.\$entryId.tsx app/components/AlignmentDial.tsx app/components/AlignmentDial.test.tsx app/components/InsightCard.tsx
git commit -m "feat: add AI response view with alignment dial and insight cards"
```

---

## Task 11: Guided Prompt Mode

**Files:**
- Modify: `app/routes/index.tsx`

**Step 1: Add guided prompt loading to home screen**

Add a `useEffect` that calls `generateDailyPrompt` when mode switches to `"guided"`. Update the home component:

```tsx
// Add to imports
import { useAction } from "convex/react";
// api.ai.generateDailyPrompt is already imported

// Add inside HomePage:
const [guidedPrompt, setGuidedPrompt] = useState<string | null>(null);
const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
const generatePrompt = useAction(api.ai.generateDailyPrompt);

useEffect(() => {
  if (mode !== "guided" || !user?.dreamProfile) return;
  setIsLoadingPrompt(true);
  const recentContents = (recent ?? []).slice(0, 3).map((e) => e.content);
  generatePrompt({ dreamProfile: user.dreamProfile, recentEntryContents: recentContents })
    .then(setGuidedPrompt)
    .finally(() => setIsLoadingPrompt(false));
}, [mode, user?.dreamProfile]);
```

**Step 2: Update the editor section to show the prompt when in guided mode**

In the editor JSX, add above the textarea:

```tsx
{mode === "guided" && (
  <div className="bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-600 italic leading-relaxed border border-stone-100">
    {isLoadingPrompt ? (
      <span className="animate-pulse text-stone-300">Generating your prompt...</span>
    ) : (
      guidedPrompt ?? "What would the person you're becoming do differently today?"
    )}
  </div>
)}
```

**Step 3: Verify manually in browser**

```bash
pnpm dev
```

Switch to Guided mode and verify the prompt appears after ~2 seconds.

**Step 4: Commit**

```bash
git add app/routes/index.tsx
git commit -m "feat: add guided prompt mode with daily AI-generated prompt"
```

---

## Task 12: Conversational Mode

**Files:**
- Create: `convex/conversations.ts`
- Create: `app/components/ConversationView.tsx`
- Modify: `app/routes/index.tsx`

**Step 1: Add conversation turn mutations**

```ts
// convex/conversations.ts
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const addTurn = mutation({
  args: {
    entryId: v.id("entries"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("conversationTurns")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .order("asc")
      .collect();
  },
});
```

**Step 2: Implement ConversationView component**

```tsx
// app/components/ConversationView.tsx
import { useState } from "react";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface ConversationViewProps {
  turns: Turn[];
  onSend: (message: string) => void;
  isLoading: boolean;
  onFinish: () => void;
}

export function ConversationView({ turns, onSend, isLoading, onFinish }: ConversationViewProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3 min-h-[300px] max-h-[500px] overflow-y-auto">
        {turns.length === 0 && (
          <p className="text-stone-300 text-sm italic text-center mt-8">
            Start writing — your coach will respond.
          </p>
        )}
        {turns.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                turn.role === "user"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              {turn.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 rounded-2xl px-4 py-2.5 text-sm text-stone-400 animate-pulse">
              ...
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Write here..."
          className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-40"
        >
          Send
        </button>
      </div>
      {turns.length >= 4 && (
        <button
          onClick={onFinish}
          className="text-xs text-stone-400 underline text-center"
        >
          Finish session & get analysis →
        </button>
      )}
    </div>
  );
}
```

**Step 3: Wire conversational mode into home screen**

In `app/routes/index.tsx`, add a state for conversational session:

```tsx
const [conversationEntryId, setConversationEntryId] = useState<string | null>(null);
const [turns, setTurns] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
const [isTurnLoading, setIsTurnLoading] = useState(false);
const addTurn = useMutation(api.conversations.addTurn);
const convoTurn = useAction(api.ai.conversationalTurn);

const handleConvoSend = async (message: string) => {
  if (!user?.dreamProfile) return;
  setIsTurnLoading(true);
  const newTurns = [...turns, { role: "user" as const, content: message }];
  setTurns(newTurns);

  // Create entry on first message
  let entryId = conversationEntryId;
  if (!entryId) {
    entryId = await createEntry({ content: message, mode: "conversational" });
    setConversationEntryId(entryId);
  }

  await addTurn({ entryId: entryId as any, role: "user", content: message });

  const reply = await convoTurn({
    dreamProfile: user.dreamProfile,
    history: newTurns,
    userMessage: message,
  });

  await addTurn({ entryId: entryId as any, role: "assistant", content: reply });
  setTurns([...newTurns, { role: "assistant", content: reply }]);
  setIsTurnLoading(false);
};

const handleConvoFinish = async () => {
  if (!conversationEntryId || !user?.dreamProfile) return;
  const fullContent = turns.filter(t => t.role === "user").map(t => t.content).join("\n\n");
  const recentContents = (recent ?? []).map((e) => e.content);
  await analyzeEntry({
    entryId: conversationEntryId as any,
    content: fullContent,
    dreamProfile: user.dreamProfile,
    recentEntryContents: recentContents,
  });
  navigate({ to: "/response/$entryId", params: { entryId: conversationEntryId } });
};
```

Replace the editor section with a conditional:

```tsx
{mode === "conversational" ? (
  <ConversationView
    turns={turns}
    onSend={handleConvoSend}
    isLoading={isTurnLoading}
    onFinish={handleConvoFinish}
  />
) : (
  // existing textarea + submit button JSX
)}
```

**Step 4: Push Convex functions**

```bash
pnpm dlx convex dev --once
```

**Step 5: Commit**

```bash
git add convex/conversations.ts app/components/ConversationView.tsx app/routes/index.tsx
git commit -m "feat: add conversational journaling mode with back-and-forth coach"
```

---

## Task 13: Entry History

**Files:**
- Create: `app/routes/history.tsx`
- Create: `app/components/EntryCard.tsx`

**Step 1: Write failing test for EntryCard**

```tsx
// app/components/EntryCard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EntryCard } from "./EntryCard";

const mockEntry = {
  _id: "entry1" as any,
  content: "Today I felt hopeful about my career.",
  mode: "open" as const,
  _creationTime: Date.now(),
  analysis: {
    alignmentScore: 8,
    emotionalTone: "hopeful" as const,
    patternInsight: "You focus on growth.",
    nudge: "What would you do with no fear?",
    alignmentRationale: "Very aligned.",
  },
};

describe("EntryCard", () => {
  it("shows the entry content preview", () => {
    render(<EntryCard entry={mockEntry} onClick={() => {}} />);
    expect(screen.getByText(/today i felt hopeful/i)).toBeInTheDocument();
  });

  it("shows the alignment score", () => {
    render(<EntryCard entry={mockEntry} onClick={() => {}} />);
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows the emotional tone", () => {
    render(<EntryCard entry={mockEntry} onClick={() => {}} />);
    expect(screen.getByText(/hopeful/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify fails**

```bash
pnpm vitest run app/components/EntryCard.test.tsx
```

Expected: FAIL

**Step 3: Implement EntryCard**

```tsx
// app/components/EntryCard.tsx
const TONE_COLORS: Record<string, string> = {
  hopeful: "text-emerald-600 bg-emerald-50",
  anxious: "text-orange-600 bg-orange-50",
  stuck: "text-slate-600 bg-slate-100",
  clear: "text-blue-600 bg-blue-50",
  resistant: "text-red-600 bg-red-50",
  expansive: "text-violet-600 bg-violet-50",
  grief: "text-stone-600 bg-stone-100",
  excited: "text-yellow-600 bg-yellow-50",
};

const SCORE_BG: Record<number, string> = {
  1: "bg-red-100 text-red-700", 2: "bg-orange-100 text-orange-700",
  3: "bg-orange-100 text-orange-700", 4: "bg-yellow-100 text-yellow-700",
  5: "bg-yellow-100 text-yellow-700", 6: "bg-lime-100 text-lime-700",
  7: "bg-green-100 text-green-700", 8: "bg-green-100 text-green-700",
  9: "bg-emerald-100 text-emerald-700", 10: "bg-emerald-100 text-emerald-700",
};

interface Entry {
  _id: any;
  content: string;
  mode: string;
  _creationTime: number;
  analysis?: {
    alignmentScore: number;
    emotionalTone: string;
    patternInsight: string;
    nudge: string;
    alignmentRationale: string;
  };
}

interface EntryCardProps {
  entry: Entry;
  onClick: () => void;
}

export function EntryCard({ entry, onClick }: EntryCardProps) {
  const date = new Date(entry._creationTime).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
  const preview = entry.content.slice(0, 120) + (entry.content.length > 120 ? "..." : "");
  const score = entry.analysis?.alignmentScore;
  const tone = entry.analysis?.emotionalTone;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-2 hover:border-stone-400 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-400">{date}</span>
        <div className="flex items-center gap-2">
          {tone && (
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TONE_COLORS[tone] ?? "bg-stone-100 text-stone-600"}`}>
              {tone}
            </span>
          )}
          {score !== undefined && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SCORE_BG[Math.round(score)] ?? "bg-stone-100 text-stone-700"}`}>
              {score}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-stone-700 leading-relaxed">{preview}</p>
    </button>
  );
}
```

**Step 4: Run test to verify passes**

```bash
pnpm vitest run app/components/EntryCard.test.tsx
```

Expected: PASS

**Step 5: Implement history route**

```tsx
// app/routes/history.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { EntryCard } from "../components/EntryCard";

export const Route = createFileRoute("/history")({
  component: () => (
    <AuthGuard>
      <HistoryPage />
    </AuthGuard>
  ),
});

function HistoryPage() {
  const entries = useQuery(api.entries.listEntries, { limit: 50 });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-stone-900">Entry History</h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white"
          >
            ← Journal
          </button>
        </div>

        {!entries ? (
          <div className="animate-pulse text-stone-300 text-sm">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">
            No entries yet. Write your first one.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <EntryCard
                key={entry._id}
                entry={entry}
                onClick={() => navigate({ to: "/response/$entryId", params: { entryId: entry._id } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add app/routes/history.tsx app/components/EntryCard.tsx app/components/EntryCard.test.tsx
git commit -m "feat: add entry history with alignment scores and emotional tone"
```

---

## Task 14: Momentum Dashboard

**Files:**
- Create: `convex/dashboard.ts`
- Create: `app/routes/dashboard.tsx`
- Create: `app/components/AlignmentChart.tsx`

**Step 1: Add dashboard query to Convex**

```ts
// convex/dashboard.ts
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
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

function calculateStreak(entries: any[]): number {
  if (entries.length === 0) return 0;
  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);

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

**Step 2: Implement AlignmentChart (simple bar chart using CSS)**

```tsx
// app/components/AlignmentChart.tsx
interface DataPoint {
  date: string;
  score: number;
}

interface AlignmentChartProps {
  data: DataPoint[];
}

export function AlignmentChart({ data }: AlignmentChartProps) {
  if (data.length === 0) {
    return <div className="text-center text-stone-300 text-sm py-8">No data yet</div>;
  }

  const max = 10;

  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((point, i) => {
        const height = Math.max(4, (point.score / max) * 96);
        const color = point.score >= 7 ? "bg-emerald-400" : point.score >= 5 ? "bg-yellow-400" : "bg-red-300";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-full ${color} rounded-t`} style={{ height }} />
            <span className="text-xs text-stone-400">{point.date}</span>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 3: Implement dashboard route**

```tsx
// app/routes/dashboard.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { AlignmentChart } from "../components/AlignmentChart";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  ),
});

function DashboardPage() {
  const stats = useQuery(api.dashboard.dashboardStats);
  const navigate = useNavigate();

  if (!stats) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-300 text-sm">Loading...</div>
      </div>
    );
  }

  const topTone = Object.entries(stats.toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-stone-900">Momentum</h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white"
          >
            ← Journal
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-stone-900">{stats.streak}</div>
            <div className="text-xs text-stone-400 mt-1">Day streak</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-stone-900">{stats.totalEntries}</div>
            <div className="text-xs text-stone-400 mt-1">Total entries</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
            <div className="text-lg font-bold text-stone-900 capitalize">{topTone}</div>
            <div className="text-xs text-stone-400 mt-1">Top tone</div>
          </div>
        </div>

        {/* Alignment trend */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
            Alignment trend — last 7 days
          </p>
          <AlignmentChart data={stats.alignmentTrend} />
        </div>

        {/* Tone breakdown */}
        {Object.keys(stats.toneCounts).length > 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
              Emotional arc
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.toneCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([tone, count]) => (
                  <span
                    key={tone}
                    className="text-sm px-3 py-1 rounded-full bg-stone-100 text-stone-600 capitalize"
                  >
                    {tone} × {count}
                  </span>
                ))}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate({ to: "/profile" })}
          className="text-sm text-stone-500 text-center underline"
        >
          View & edit dream profile →
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Push Convex functions**

```bash
pnpm dlx convex dev --once
```

**Step 5: Commit**

```bash
git add convex/dashboard.ts app/routes/dashboard.tsx app/components/AlignmentChart.tsx
git commit -m "feat: add momentum dashboard with streak, alignment trend, emotional arc"
```

---

## Task 15: Dream Profile Editor

**Files:**
- Create: `app/routes/profile.tsx`

**Step 1: Implement profile route**

```tsx
// app/routes/profile.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { AuthGuard } from "../components/AuthGuard";
import { ManifestoEditor } from "../components/ManifestoEditor";
import { CategoryCard } from "../components/CategoryCard";

export const Route = createFileRoute("/profile")({
  component: () => (
    <AuthGuard>
      <ProfilePage />
    </AuthGuard>
  ),
});

const CATEGORIES = [
  { key: "career", label: "Career" },
  { key: "relationships", label: "Relationships" },
  { key: "health", label: "Health" },
  { key: "wealth", label: "Wealth" },
  { key: "creative", label: "Creative Expression" },
] as const;

function ProfilePage() {
  const user = useQuery(api.users.currentUser);
  const updateProfile = useMutation(api.users.updateDreamProfile);
  const navigate = useNavigate();

  const [manifesto, setManifesto] = useState("");
  const [categories, setCategories] = useState({
    career: "", relationships: "", health: "", wealth: "", creative: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.dreamProfile) {
      setManifesto(user.dreamProfile.manifesto);
      setCategories(user.dreamProfile.categories);
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ manifesto, categories });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-stone-900">Dream Profile</h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white"
          >
            ← Journal
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-stone-700">Your manifesto</label>
          <ManifestoEditor value={manifesto} onChange={setManifesto} />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-stone-700">Five dimensions</label>
          {CATEGORIES.map(({ key, label }) => (
            <CategoryCard
              key={key}
              category={key}
              label={label}
              value={categories[key]}
              onChange={(val) => setCategories((c) => ({ ...c, [key]: val }))}
            />
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-stone-900 text-white text-sm font-medium py-3 rounded-xl disabled:opacity-40"
        >
          {saved ? "✓ Saved" : isSaving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/routes/profile.tsx
git commit -m "feat: add dream profile editor"
```

---

## Task 16: Vitest Config + Final Test Run

**Files:**
- Create: `vitest.config.ts`

**Step 1: Configure Vitest**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./app/test-setup.ts"],
  },
});
```

**Step 2: Create test setup**

```ts
// app/test-setup.ts
import "@testing-library/jest-dom";
```

**Step 3: Run all tests**

```bash
pnpm vitest run
```

Expected: All tests pass.
- `AuthForm` — 2 tests
- `ManifestoEditor` — 3 tests
- `ModeSelector` — 2 tests
- `AlignmentDial` — 3 tests
- `EntryCard` — 3 tests

**Step 4: Final commit**

```bash
git add vitest.config.ts app/test-setup.ts
git commit -m "chore: configure Vitest with jsdom and testing-library"
```

---

## MVP Checklist

- [ ] Dream Life Setup (manifesto + categories)
- [ ] Auth (email/password + Google)
- [ ] Home screen with mode selector
- [ ] Open Canvas mode → AI analysis → Response view
- [ ] Guided Prompt mode
- [ ] Conversational mode
- [ ] Entry history
- [ ] Momentum dashboard (streak + alignment trend + emotional arc)
- [ ] Dream Profile editor
- [ ] All component unit tests passing

## V2 Ideas (out of scope)

- Embeddings + pgvector pattern detection across full history
- AI-suggested Dream Profile updates
- Email/push reminders
- Export entries as PDF
- Theme word cloud visualization
