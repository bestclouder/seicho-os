# Tasks & Sprints

## Sprint 1 — Database + Project Core (Days 1–2)
**Goal:** Project CRUD works end-to-end against live DB; app is demoable without login.

- [ ] Run migration SQL on Supabase; verify all tables + seed data visible in Table Editor
- [ ] Scaffold Next.js 14 app; configure Supabase client (env vars server-side only)
- [ ] Dashboard page `/` — fetches projects from DB, renders card list with title, status badge, summary, last_updated
- [ ] Loading skeleton on dashboard; empty state copy: "No projects yet — create your first one"
- [ ] New project form — fields: title, summary, vision, why_it_matters, success_criteria, status; POST to DB
- [ ] Project detail page `/projects/[id]` — all fields displayed, inline edit, save persists to DB
- [ ] Delete project (archive, not hard delete) with typed confirmation
- [ ] Error toast on any DB failure
- [ ] Mobile layout: single-column, 44px tap targets, sticky header

**Definition of Done:** Seed projects visible on dashboard without login; new project created via form appears immediately; edit saves and survives page refresh.

---

## Sprint 2 — Thought Capture + Phases + Tasks (Days 3–4)
**Goal:** The full knowledge-capture loop works; projects feel alive.

- [ ] Sticky bottom input on project detail — type thought, tap Send, row saved to `thoughts` table, appears instantly above input
- [ ] Thoughts list: chronological, newest at top, shows section_tag badge when present
- [ ] Phase CRUD — add/rename/delete phases; drag-to-reorder (sort_order persists)
- [ ] Task CRUD within phase — add, mark done (checkbox), delete
- [ ] Task status cycles: todo → doing → done
- [ ] Empty state for phases ("Add your first phase") and tasks ("No tasks yet")
- [ ] Loading and error states for all new surfaces
- [ ] Mobile pass: phase/task rows are thumb-friendly; thought input stays above keyboard

**Definition of Done:** User opens a project, types a thought, sees it appear in <1 s, adds a phase, adds a task to that phase, marks it done — all persisted and visible on refresh.

---

## Sprint 3 — AI Understanding Layer ✦ v1 functional milestone (Days 5–7)
**Goal:** The resume card works; opening a paused project instantly shows AI understanding.

- [ ] `/api/generate-summary` route — accepts project_id; fetches project + last 20 thoughts; calls OpenAI; writes to `project_summaries` with all six fields + source/confidence/review_status
- [ ] Resume card component — shown at top of project detail; displays all six AI fields with labels matching PRD
- [ ] Stale-check: regenerate if newest summary >24 h old OR user taps "Refresh understanding"
- [ ] Graceful fallback: if OpenAI call fails, show last stored summary with "Last updated X ago" label
- [ ] `/api/classify-thought` route — called after thought save; updates section_tag fields; low-risk, auto-applies
- [ ] `/api/suggest-phases` route — generates phase/task draft from vision + success_criteria; returns JSON; UI shows diff overlay; user taps Confirm before rows are written
- [ ] Momentum score computed server-side; dashboard sorts by score; score shown as subtle indicator
- [ ] Audit log row written for every API route action
- [ ] All AI errors handled: toast + fallback UI, no white screens

**Definition of Done (v1 success scenario):** Open the seeded "Algo Trading Framework" project (status: Paused, last touched 45 days ago). Resume card appears within 3 s showing problem, learnings, and highest-leverage next step. Type a new thought — section_tag appears within 2 s. Tap "Suggest phases" — draft overlay appears; confirm — phases and tasks written to DB and visible.

---

## Sprint 4 — Lock It Down (Days 8–9)
**Goal:** Real user data is safe; each user sees only their own projects.

- [ ] Enable Supabase Auth (email magic link)
- [ ] Sign-in page `/login`; redirect unauthenticated users from all non-demo routes
- [ ] Replace all v1 permissive RLS policies with `auth.uid() = user_id` owner policies on every table
- [ ] Backfill `user_id` on seed rows to a named demo account
- [ ] Server API routes use service-role key; all client queries use user session
- [ ] Verify `grep -r OPENAI_API_KEY .next/` returns nothing
- [ ] Enable Supabase point-in-time recovery
- [ ] Manual security check: attempt to fetch another user's project via direct URL — confirm 0 rows returned

**Definition of Done:** Two test accounts each see only their own projects; direct DB queries with anon key return 0 rows for any table; no secrets in client bundle.

---

## Sprint 5 — Breadth + Polish (Days 10–12)
**Goal:** App is the central home for 20–50 personal projects.

- [ ] Project relationships — link two projects, show linked list on detail page
- [ ] Tag/category field on projects; filter pills on dashboard
- [ ] Full-text search across title, summary, vision, thoughts body
- [ ] Idea inbox page — capture raw ideas, promote to project (drafts project fields from idea body via AI)
- [ ] AI auto-tagging of new thoughts (section_tag shown in thoughts list)
- [ ] Pagination / virtual scroll for thought list (>50 thoughts)
- [ ] Performance: measure and fix any dashboard load >1 s on mobile

**Definition of Done:** 50 seeded projects load on dashboard in <1 s on mobile; search returns results in <500 ms; idea promoted to project has all fields pre-filled for review.

---

## Gantt (sprint → days)
```
Sprint 1  |██████░░░░░░░░░░░░░░░░░░| Days 1–2
Sprint 2  |░░░░░░██████░░░░░░░░░░░░| Days 3–4
Sprint 3  |░░░░░░░░░░░░████████░░░░| Days 5–7  ← v1 functional
Sprint 4  |░░░░░░░░░░░░░░░░░░░░████| Days 8–9
Sprint 5  |░░░░░░░░░░░░░░░░░░░░░░░░████| Days 10–12
```
