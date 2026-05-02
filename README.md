# Boardline Chess

Boardline is a frontend-first chess app built with React 19, Vite 8, `chess.js`, Supabase, Stockfish, and Gemini. It supports local play, browser AI, link-based live matches, saved reviews, ratings, leaderboard filters, and a mock Pro upgrade flow.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 7
- `chess.js` for rules and move validation
- Stockfish in a worker for browser AI
- Supabase for auth, profile data, saved games, live sync, leaderboard data, and Pro state
- Gemini via `@google/genai` for saved-game coaching

## Requirements

- Node `20.19+`
- npm `10+`
- Supabase project for auth, persistence, and realtime
- Optional Gemini API key for coach analysis

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template and fill in your keys:

```bash
cp .env.example .env
```

3. Start the dev server:

```bash
npm run dev
```

4. Run verification before shipping:

```bash
npm run typecheck
npm run lint
npm run build
```

## Environment Variables

- `VITE_SUPABASE_URL`: Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase browser publishable key.
- `VITE_GEMINI_API_KEY`: optional Gemini key for coach analysis. If missing, the coach UI stays visible but analysis is disabled with explicit messaging.

## Supabase Notes

The app expects browser-accessible tables for:

- `profiles`
- `games`
- `live_games`
- `coaching_results`

The frontend currently assumes profile rows include:

- `id`
- `email`
- `display_name`
- `city`
- `rating`
- `tier`
- `created_at`
- `updated_at`

The app also expects Supabase Auth email/password sign-in and Realtime channels to be enabled.

## Product Behavior

- Rated results only apply to authenticated human-vs-human live games.
- Free accounts are limited to the latest `8` reviewable saved games.
- Free accounts get `3` coach analyses.
- Pro unlocks deeper history, unlimited coach analysis, and a priority live-room lane.
- The checkout is mock-only. It changes product behavior inside the prototype but does not process payments.

## Deployment

The project is ready for static frontend deployment on Vercel or Netlify.

- Build command: `npm run build`
- Output directory: `dist`
- Required env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - optionally `VITE_GEMINI_API_KEY`

## Launch Checklist

- Confirm Supabase Auth email/password is enabled.
- Confirm Realtime is active for live room channels.
- Confirm the expected tables exist and browser policies allow the intended reads/writes.
- Verify local play, AI play, live play, review, leaderboard, profile, and upgrade flows.
- Test keyboard board control, touch move input, and mobile layouts.
- Verify missing-config states for Supabase and Gemini.
- Verify `npm run typecheck`, `npm run lint`, and `npm run build` pass on the deployment Node version.
- Review Gemini usage risk: the prototype exposes the API key to the shipped client bundle.

## Known Prototype Constraints

- Ratings are deterministic but frontend-applied, so they are not abuse-resistant.
- The Pro checkout is simulated only.
- Gemini analysis depends on a public client-side key.
- The production build currently emits a non-blocking Vite chunk-size warning for the main JS bundle.
