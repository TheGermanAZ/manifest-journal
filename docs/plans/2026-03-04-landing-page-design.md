# Landing Page Design

**Date:** 2026-03-04
**Goal:** Convert visitors to sign up
**Tone:** Warm & aspirational
**Format:** Single-scroll "Ritual" page

## Sections

### Hero (full viewport)
- **Background:** Radial gradient (sand → foam) with subtle grid overlay
- **Headline (Fraunces):** "Your dream life starts with today's entry."
- **Subheadline (Manrope):** "AI-powered journaling that turns daily reflection into real momentum. Define your vision, write honestly, and let your coach connect the dots."
- **CTA:** "Start Journaling — Free" → /register
- **Secondary:** "Already have an account? Sign in" → /login

### Feature Cards (3 columns, stack on mobile)
Uses `island-shell` frosted glass pattern.

1. **Define Your Dream** — Manifesto + 5 life dimensions as north star for AI coach
2. **Journal Your Way** — Three modes (open, guided, conversational) that meet you where you are
3. **Watch Your Momentum** — Streak, alignment trend, emotional pattern discovery

### Closing CTA
- Sand-colored background
- Copy: "Five minutes a day. That's all it takes."
- Same CTA button

## Technical

- **Route:** `src/routes/landing.tsx` (public, no auth required)
- **Routing:** Unauthenticated users on `/` see landing; authenticated users see journal
- **Styling:** Custom CSS variables (sea-ink, lagoon, palm, sand, foam) + Fraunces/Manrope
- **Dependencies:** None new
