# Knocked — Door-to-Door Sales Tracker

**Date:** 2026-04-22
**Status:** Approved

## Overview

An iPad-optimized web app for tracking door-to-door sales activity in the field. Primary device is iPad (tablet-sized viewport, large tap targets). Two users (the owner + one friend), each with their own login. Always online (cellular data). Single-tab app.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth)
- **Charts:** Recharts
- **Deployment:** Vercel

---

## Pages

### 1. Login
- Email/password auth via Supabase Auth
- Redirects to Tracker on success

### 2. Tracker (field view)
- Primary daily-use screen
- Vertical stack of three rows: **Doors Knocked**, **Conversations**, **Sales**
- Each row shows:
  - Metric label (top)
  - Today's count (large, left)
  - Big `+` button (right) — tapping inserts one event row with current timestamp
  - Undo button — removes the last event of that type from today (accidental tap recovery)
- Header: user's name + today's date
- Footer nav: link to Stats page
- **Daily reset is automatic** — counts are always computed as `count(*) where date = today`. No data is deleted; the full history accumulates.

### 3. Stats
- Read-only analytics page

**Summary cards (top):**
- Knock→Sale conversion rate (lifetime %)
- Convo→Sale conversion rate (lifetime %)

**Charts (all scoped to current user):**
1. **Sales over the summer** — bar chart, one bar per day, x-axis = date
2. **Sales by hour of day** — bar chart, x-axis = hour (9am, 10am...), y-axis = total sales at that hour across all time
3. **Sales by day of week** — bar chart, Mon–Sun, total sales per day across all time
4. **Conversion rates over time** — line chart, weekly buckets, two lines: Knock→Sale % and Convo→Sale %

---

## Data Model

Single table in Supabase (PostgreSQL):

```sql
create table events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  type        text check (type in ('knock', 'conversation', 'sale')) not null,
  created_at  timestamptz default now() not null
);

-- Row-level security: users can only read/write their own events
alter table events enable row level security;

create policy "Users own their events"
  on events for all
  using (auth.uid() = user_id);
```

Every button tap = one row. No pre-computed totals stored. All counts and rates are derived from queries at read time.

**Example analytics queries:**

```sql
-- Daily totals
select date_trunc('day', created_at) as day, type, count(*) as total
from events where user_id = $1
group by 1, 2 order by 1 desc;

-- Sales by hour of day
select extract(hour from created_at) as hour, count(*) as sales
from events where user_id = $1 and type = 'sale'
group by 1 order by 1;

-- Sales by day of week
select extract(dow from created_at) as dow, count(*) as sales
from events where user_id = $1 and type = 'sale'
group by 1 order by 1;

-- Weekly conversion rates
select
  date_trunc('week', created_at) as week,
  count(*) filter (where type = 'sale')::float /
    nullif(count(*) filter (where type = 'knock'), 0) as knock_to_sale,
  count(*) filter (where type = 'sale')::float /
    nullif(count(*) filter (where type = 'conversation'), 0) as convo_to_sale
from events where user_id = $1
group by 1 order by 1;
```

---

## Key Decisions

- **Event-per-tap model** (not daily summaries) — enables all time-based analytics without schema changes
- **No sessions concept** — daily auto-reset is purely a UI filter (`where date = today`), not a DB operation
- **Row-level security** — each user's data is isolated at the database level; no application-layer filtering needed beyond passing `user_id`
- **Undo via delete** — removes the most recent event of that type for today; simple and safe

---

## Out of Scope (v1)

- Team leaderboards / comparing users
- Exporting data to CSV
- Push notifications or reminders
- Offline support
