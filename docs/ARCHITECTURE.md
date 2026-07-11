# Architecture

## Stack
- **Frontend:** Next.js 14 (App Router) — mobile-first, server components where possible
- **Database:** Supabase (Postgres + RLS)
- **AI:** OpenAI API called from Next.js API routes (key never in client bundle)
- **Hosting:** Vercel

## What runs without AI
All project CRUD, phase/task management, thought capture, and the dashboard work entirely without OpenAI. AI adds the understanding summary and thought routing on top — it is an enhancement, not a dependency.

## Key User Action: "Resume a paused project"
1. User taps project card on dashboard
2. Server fetches project row + latest project_summary row
3. If summary is stale (>24 h) or missing → server calls OpenAI with project fields + last 20 thoughts as context
4. OpenAI returns structured JSON; server writes to project_summaries with source, confidence, review_status
5. Resume card renders at top of project detail with all six understanding fields
6. User reads, optionally edits a field, clicks "Start working" — updates last_updated on project

## Layer order (build in this sequence)
1. **Database** — tables, RLS, seed data (Sprint 1)
2. **Core CRUD** — project create/edit/delete, phase, task, thought (Sprint 1–2)
3. **AI layer** — summaries, thought routing (Sprint 3)
4. **Auth + isolation** — owner-scoped RLS (Sprint 4)
5. **Breadth** — relationships, search, idea inbox (Sprint 5)

## Mobile-first rules
- Single-column layout; min tap target 44px
- Thought capture is a sticky bottom input on project detail
- Dashboard is a swipeable card list, not a table
