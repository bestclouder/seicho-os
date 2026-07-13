# Security Audit — Seichō OS

**Date:** 2026-07-13
**Scope:** Full source review (RLS migrations, Supabase clients, all API routes,
server actions, auth callback, config) + live probing of https://seicho-os.vercel.app
**Result:** Strong security foundation. One active High finding fixed, two hardening
items addressed. No data-exposure, injection, or auth-bypass vulnerabilities found.

---

## Findings

### 🟠 F1 — Unauthenticated, unthrottled access to AI generation routes (High) — FIXED

**Routes:** `POST /api/classify-thought`, `POST /api/generate-summary`,
`POST /api/suggest-phases`.

Unlike `/api/import/analyze` (which correctly required auth, an active plan, and
rate-limited to 5/hour), these three routes performed **no auth check, no plan
check, and no rate limiting**. They accepted a `thought_id` / `project_id` and
ran an AI generation against it.

The seeded demo project/thought UUIDs are published in this repo (`0001_init.sql`,
e.g. `a1b2c3d4-0001-0001-0001-000000000001`), so the endpoints were trivially
targetable without authentication. Confirmed live:

```
curl -X POST https://seicho-os.vercel.app/api/suggest-phases \
     -H 'Content-Type: application/json' \
     -d '{"project_id":"a1b2c3d4-0001-0001-0001-000000000001"}'
→ 200 OK  {"phases":[ ...full generated plan... ]}
```

**Impact.** With `OPENAI_API_KEY` configured in production (see the
`Redeploy to pick up OPENAI_API_KEY` commit), each call is a real paid LLM
request. `generate-summary` accepts `{"force":true}`, which bypasses the 24h
freshness cache, so every forced call is a guaranteed fresh model call. An
anonymous loop against the public demo IDs could run the OpenAI bill up with no
ceiling. No user *data* was exposed — Supabase RLS still blocked reads/writes of
non-demo rows — so this is a cost/abuse (economic denial-of-wallet) issue, not a
data breach.

**Fix.** Each route now, before doing any AI work:
1. requires a signed-in user (`getAccess().userId`) → `401` otherwise;
2. requires an active plan (`canWrite`) → `403` otherwise;
3. enforces a shared per-user budget of `AI_HOURLY_LIMIT` (30) generations/hour
   across the three routes (`lib/rate-limit.ts`, counted from `audit_logs`) →
   `429` when exceeded.

`generate-summary` keeps serving an existing stored summary to read-only callers
(demo viewers, expired trials) — only the paid *generation* path is gated, so the
public demo still shows summaries without triggering model calls.

As a side effect this also fixed a latent bug: these routes previously called
`writeAudit` without a `user_id`, so under lockdown RLS their audit rows silently
failed to insert. They now stamp `user_id`, so the audit trail (and the rate
counter that reads it) works.

### 🟡 F2 — No Content-Security-Policy header (Low) — FIXED

The app shipped a good header baseline (HSTS w/ preload, `X-Frame-Options: DENY`,
`nosniff`, Referrer-Policy, Permissions-Policy) but no CSP. No active XSS exists
(React auto-escaping; zero `dangerouslySetInnerHTML`), so this was defense-in-depth
for an app that renders user-written thoughts and AI output.

**Fix.** Added a CSP in `next.config.ts` (`default-src 'self'`, `object-src 'none'`,
`frame-ancestors 'none'`, `base-uri 'self'`, `connect-src` scoped to Supabase
HTTPS+WSS). Verified locally that it does not break Next.js hydration or styles.
`script-src` still allows `'unsafe-inline'`/`'unsafe-eval'` because Next's inline
bootstrap requires it without a nonce setup — tightening to per-request nonces is
a worthwhile future step.

### 🟡 F3 — Build ignores type & lint errors (Low) — NOT CHANGED (by design)

`next.config.ts` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`
to `true`. This is a deliberate template choice so a type/lint slip never blocks a
deploy, but it also means such a slip won't be caught at build time. Left as-is to
preserve deployability; recommend running `tsc --noEmit` and `next lint` in CI as
a non-blocking gate.

---

## Verified secure (no action needed)

- **No service-role bypass.** Every Supabase client (`lib/supabase/{server,client,middleware}.ts`)
  uses the anon key, so RLS is enforced everywhere. `lib/access.ts` documents that
  its plan checks are UI-only and RLS is the real gate — correct posture.
- **RLS lockdown (`0002`, `0004`) is sound:** owner-scoped reads
  (`user_id is null or auth.uid() = user_id`), writes gated by ownership **and**
  `public.can_write()`, `security definer` functions with `search_path` pinned,
  append-only `audit_logs`, demo rows read-only to all.
- **No SQL injection** — all DB access goes through the Supabase query builder
  (parameterized); no string-built SQL.
- **No XSS sinks** — no `dangerouslySetInnerHTML` / `innerHTML` / `eval`.
- **Auth callback is safe** — PKCE code exchange, redirects to a fixed internal
  `/dashboard` (no open redirect).
- **No secrets committed** — only `.env.example`; real secrets live in Vercel env.
- **Trial length is consistent** — DB `can_write()` and UI (`lib/access.ts`) both
  use the 30-day `trial_expires_at` (reconciled in `0004`).

## Recommendations (not blocking)

- Consider making the GitHub repo **private**; it publishes the demo UUIDs that
  made F1 targetable (though F1's fix is the real remedy).
- Add CI running `tsc --noEmit` + `next lint` (see F3).
- Future: CSP script nonces to drop `'unsafe-inline'`/`'unsafe-eval'`.
