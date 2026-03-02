# Manifest Journal

A daily journaling web app that coaches you toward your dream life by analyzing your writing with AI.

## Getting Started

```bash
bun install
bun dev
```

## Building For Production

```bash
bun run build
```

## Testing

```bash
bun test
```

## Stack

- **Frontend:** TanStack Start + TanStack Router
- **Database:** Convex
- **Auth:** Convex Auth (email/password + Google OAuth)
- **AI:** Claude (claude-sonnet-4-6) via Anthropic SDK
- **Styling:** Tailwind CSS v4

## Setup

1. Create a [Convex](https://convex.dev) account and project
2. Run `bunx convex dev` to initialize the backend
3. Copy `.env.local` and fill in your API keys:
   - `CONVEX_DEPLOYMENT` / `VITE_CONVEX_URL` — from Convex dashboard
   - `ANTHROPIC_API_KEY` — from [Anthropic](https://console.anthropic.com)
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from Google Cloud Console (optional, for OAuth)
