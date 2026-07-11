# Seichō OS 成長

A personal AI-powered project operating system that preserves the thinking,
decisions, and evolving understanding behind long-running projects — so you can
resume any of them months later in under a minute.

Built from the plan in [`/docs`](docs/PRD.md). Demo-first: the homepage is the
working app, no login required.

## What works (v1)

- **Dashboard** — all projects sorted by a rule-based momentum score (growth-ring
  indicator), status filter pills, full-text search across projects and thoughts
- **Projects** — create, inline-edit every charter field, status lifecycle
  (Seed → Exploring → Active → Paused → Completed), archive with typed confirmation
  (soft delete)
- **Resume card** — on project open, an AI summary of the six understanding
  fields (problem, why, learned, assumptions changed, best understanding,
  highest-leverage next step) is generated from the project fields + last 20
  thoughts; stale after 24 h; manual refresh; every value carries
  source/confidence/review_status
- **Thought capture** — sticky bottom composer, saves in <1 s, auto-classified
  into insight / decision / assumption / task_draft / other
- **Phases & tasks** — CRUD, reorder (persisted sort_order), task status cycles
  todo → doing → done; **✦ Suggest phases** returns an AI draft you confirm
  before anything is written
- **Idea inbox** — capture raw ideas, promote to a project via an AI-drafted
  charter you review first, dismiss/restore
- **Project relationships** — typed links (related / depends on / blocks / inspires)
- **Audit log** — every mutation and AI tool call writes an append-only row

## AI configuration

The app is fully functional with AI switched off (deterministic `heuristic:v1`
fallbacks, honestly labeled with low confidence). To enable real model output,
add **one** of these to Vercel env (server-side only):

- `OPENAI_API_KEY` (+ optional `OPENAI_MODEL`, default `gpt-4o`)
- `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`, default `claude-sonnet-5`)

## Security status

- v1 ships with the planned permissive demo RLS (`0001_init.sql`) — no real user
  data yet.
- The Sprint 4 owner-scoped lockdown is written at
  [`supabase/migrations/0002_lockdown.sql`](supabase/migrations/0002_lockdown.sql)
  but **not yet applied** — applying needs DB admin access (Supabase dashboard
  SQL editor or service-role key), which isn't in this project's env. Run it
  before onboarding real users.
- Client bundle verified clean: `grep -r OPENAI_API_KEY .next/static` → 0 hits.
- Security headers (frame denial, nosniff, referrer policy) set in
  [`next.config.ts`](next.config.ts).

## Stack

Next.js 15 (App Router) · Supabase (Postgres + RLS) · Tailwind v4 ·
self-hosted fonts (Shippori Mincho / Inter / IBM Plex Mono) · Vercel

## Development

```bash
npm install
npx vercel link && npx vercel env pull .env.local
npm run dev
```

Deploy by git push to `main` — Vercel auto-deploys. Never `vercel deploy`.
