# Security

## Secret handling
- `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` exist only in Vercel server-side env vars
- Client bundle uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- All OpenAI calls go through `/api/*` Next.js routes — never called from the browser directly
- Run `grep -r OPENAI_API_KEY .next/` before every deploy; fail the deploy if it matches

## Permission model
- **v1 (demo):** permissive RLS — all rows readable and writable by anyone (intentional, no real user data yet)
- **Sprint 4 lock-down:** every table's policies replaced with `auth.uid() = user_id`; service-role key used only in server API routes for admin writes
- Agent tools inherit the calling user's session — they cannot read or write rows the user cannot

## Approved tools only
- No `run_any` / `eval` / `exec` patterns permitted
- Agent may only call the five named tools in AGENTIC_LAYER.md
- Any new tool must be reviewed, added to the approved list, and assigned a risk level before use

## Audit principle
- Every named tool call writes an audit_log row (entity, action, payload snapshot, user_id, timestamp) before acting
- Audit logs are append-only; no tool has permission to update or delete audit_log rows
- Before real users are onboarded (Sprint 4), review audit logs for unexpected write patterns

## Data loss protection
- Deletes are soft (status = 'archived') by default; hard delete is human-only, requires typed confirmation
- Supabase point-in-time recovery enabled before Sprint 4 goes live
