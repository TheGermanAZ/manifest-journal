# Manifest Journal — Design Document
*2026-03-02*

## Overview

A daily journaling web app that helps users manifest their ideal life by analyzing their writing and nudging their thoughts toward their dream. The app acts as a **coaching ritual**, not a diary — it knows your dream and actively pulls you toward it.

**North star feeling:** After 30 days, the user feels momentum — like they are actively *becoming* the person they want to be, not just writing about them.

---

## Core Concept & User Journey

### Dream Life Setup (one-time onboarding)

Users begin by defining their dream life via a two-step profile:

1. **Manifesto** — free-form narrative (200–1000 words): "My ideal life looks like..."
2. **Five category fields** — short structured answers for:
   - Career
   - Relationships
   - Health
   - Wealth
   - Creative Expression

The AI processes this into a persistent **Dream Profile** used as system context for all future interactions.

### Daily Journal Session

Each session the user selects a mode:

| Mode | Description |
|------|-------------|
| **Open Canvas** | Write freely → submit → receive AI analysis |
| **Guided Prompt** | AI generates a personalized prompt from dream profile + recent entries; user responds |
| **Conversational** | Back-and-forth chat with the AI coach; history maintained in context window |

### Post-Entry AI Response

After every session, the AI returns:
1. **Pattern Insight** — 1–2 sentences on a recurring theme or mental block
2. **Nudge** — 1 reframe or provocative question (max 40 words)
3. **Emotional Tone** — one word from a fixed enum (see below)
4. **Alignment Pulse** — score 1–10 + one-line rationale

### Momentum View

Over time, the app surfaces:
- Streak + day number
- 7-day alignment score trend chart
- Emotional arc across entries
- Recurring theme word cloud
- AI-suggested Dream Profile updates

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | TanStack Start (TanStack Router) | SSR + type-safe server functions |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Database | Convex | Real-time reactive queries, TypeScript-native, built-in vector search |
| Auth | Convex Auth | Email/password + OAuth (Google), built into Convex |
| AI | Claude (claude-sonnet-4-6) via Anthropic SDK | Best-in-class reasoning for nuanced coaching responses |
| Embeddings | OpenAI `text-embedding-3-small` (or Voyage AI) | Stored in Convex vector index for cross-entry pattern detection |
| Deployment | Vercel (TanStack Start) + Convex cloud | Convex manages its own infra |

---

## Screen Map

| Screen | Purpose |
|--------|---------|
| **Onboarding / Dream Setup** | One-time manifesto + category setup |
| **Home / Daily Session** | Mode selector, journal editor, daily prompt |
| **AI Response View** | Pattern, nudge, tone, alignment score after submission |
| **Entry History** | Calendar + list view, color-coded by alignment score |
| **Momentum Dashboard** | Streak, alignment trend, emotional arc, theme cloud |
| **Dream Profile Editor** | View/edit manifesto + categories; AI-suggested revisions |

---

## AI Prompt Design

### `analyzeEntry`

```
System: You are a manifestation coach. The user's dream life profile is:
{dreamProfile}

Their recent entries (last 7):
{recentEntries[]}

Analyze today's entry. Return JSON:
{
  "patternInsight": "...",        // 1-2 sentences, recurring theme or block
  "nudge": "...",                 // 1 reframe or question, max 40 words
  "emotionalTone": "hopeful",    // one of the enum values below
  "alignmentScore": 7,           // 1-10
  "alignmentRationale": "..."    // 1 sentence
}

Entry: {entry}
```

**Emotional tone enum:** `hopeful` | `anxious` | `stuck` | `clear` | `resistant` | `expansive` | `grief` | `excited`

### `generateDailyPrompt`

```
System: Dream profile: {dreamProfile}. Recent entries (last 3): {recentEntries[]}
Generate one journaling prompt (max 50 words) that:
- Draws from a theme the user hasn't fully explored yet
- Pulls them toward their dream life vision
- Feels personal, not generic
Return only the prompt text.
```

### `conversationalTurn`

```
System: You are a manifestation coach. Dream profile: {dreamProfile}.
Prior conversation: {history[]}
Respond to the user's message. Be warm, probing, never preachy.
Max 100 words. End with a question.
```

---

## Data Model (Convex)

```typescript
// users
{
  _id: Id<"users">,
  email: string,
  name: string,
  dreamProfile: {
    manifesto: string,
    categories: {
      career: string,
      relationships: string,
      health: string,
      wealth: string,
      creative: string
    }
  },
  createdAt: number
}

// entries
{
  _id: Id<"entries">,
  userId: Id<"users">,
  content: string,
  mode: "open" | "guided" | "conversational",
  createdAt: number,
  embedding: number[],             // vector for similarity search
  analysis: {
    patternInsight: string,
    nudge: string,
    emotionalTone: EmotionalTone,
    alignmentScore: number,        // 1-10
    alignmentRationale: string
  }
}

// conversationTurns (conversational mode only)
{
  _id: Id<"conversationTurns">,
  entryId: Id<"entries">,
  userId: Id<"users">,
  role: "user" | "assistant",
  content: string,
  createdAt: number
}

type EmotionalTone = "hopeful" | "anxious" | "stuck" | "clear" | "resistant" | "expansive" | "grief" | "excited"
```

---

## Key Design Decisions

- **Structured JSON from AI** — `analyzeEntry` returns typed JSON (not prose) so each field can be rendered independently and queried in the dashboard. Pattern, nudge, tone, and score are stored as separate Convex fields.
- **Fixed emotional tone enum** — enables aggregate queries and charting (e.g., "you were mostly anxious last week"). Free text would break this.
- **Dream Profile as living document** — the AI can suggest profile updates over time as writing evolves. User reviews and accepts/rejects.
- **Three modes, not forced into one** — users have different journaling styles on different days. Mode selection is per session, not a permanent setting.
- **Real-time via Convex** — AI analysis results stream into the UI reactively without polling, using Convex's built-in subscription model.
- **Embeddings for pattern detection** — rather than scanning the last N entries in raw text, cosine similarity over embeddings lets the AI surface non-obvious recurring themes across longer history windows.

---

## v1 Scope (MVP)

Must-have:
- Dream Life Setup (onboarding)
- Home / Daily Session with all three modes
- AI response view (pattern + nudge + tone + score)
- Entry history
- Momentum Dashboard (streak + alignment trend)

Nice-to-have (v2):
- Dream Profile suggested updates
- Emotional arc chart
- Push/email reminders
- Export entries as PDF
