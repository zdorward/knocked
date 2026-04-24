# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**Knocked** — a door-to-door sales tracker. Salespeople log knocks, conversations, and sales in real time and review conversion stats by day, hour, and day-of-week.

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Jest (single run)
npm run test:watch # Jest (watch mode)

# Run a single test file
npx jest __tests__/specific.test.ts

# Run tests matching a name pattern
npm test -- --testNamePattern="test name"
```

## Architecture

**Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase (Postgres + Auth), Recharts

**Route groups:**

- `app/(app)/` — protected routes (`/tracker`, `/stats`)
- `app/(auth)/` — unauthenticated routes (`/login`)
- `app/api/events/` — single REST endpoint (POST to log events, DELETE to undo)

**Data model:** One `events` table with `user_id`, `type` (`knock | conversation | sale`), and `created_at`. No ORM — raw Supabase client calls throughout.

**Data flow:**

1. Server Components fetch events from Supabase directly
2. Initial data passed as props to `'use client'` components for interactivity
3. User actions call `POST /api/events` or `DELETE /api/events`
4. Stats are computed in `lib/queries.ts` from raw event arrays

**Auth:** Supabase Auth via `@supabase/ssr`. Middleware (`middleware.ts`) enforces auth on all routes — unauthenticated requests redirect to `/login`, authenticated requests to `/login` redirect to `/tracker`.

**Key files:**

- `lib/types.ts` — `EventType`, `Counts`, `EventRow` types and `VALID_TYPES` constant
- `lib/queries.ts` — all stats aggregation functions (`salesByDay`, `salesByHour`, `salesByDow`, `conversionRatesByWeek`, `lifetimeConversionRates`)
- `lib/supabase/server.ts` — server-side Supabase client (cookie-based)
- `lib/supabase/client.ts` — browser-side Supabase client

**Required environment variables:**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Design Philosophy

Follow standard patterns — don't invent custom flows or novel UI conventions when a well-established pattern exists. Match what users already expect from well-known apps.

## Conventions

**Target device:** Optimized for iPad on a web browser (Safari). Design decisions (layout, touch targets, spacing) should prioritize the iPad form factor.

**Styling:** Dark theme throughout (slate-900 bg, slate-800 cards). Color coding: blue = knock, violet = conversation, emerald = sale.

**Testing:** Jest + React Testing Library. Supabase is mocked in API tests. Query function tests assert on data transformation logic.

**Path alias:** `@/*` maps to the project root (configured in `tsconfig.json` and `jest.config.js`).
