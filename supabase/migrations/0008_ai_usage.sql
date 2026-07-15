-- AI usage log — one row per real OpenAI call. Powers two things:
--   1. rate limiting (per-user: N per minute, M per day)
--   2. the owner's usage report (understand how people use the AI features)
-- Only actual model calls are logged; heuristic fallbacks cost nothing and are
-- not recorded.

create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null, -- generate_summary | classify_thought | suggest_phases | import_analyze | draft_idea
  model text,
  created_at timestamptz not null default now()
);
alter table ai_usage enable row level security;
create index if not exists ai_usage_user_time on ai_usage (user_id, created_at desc);

drop policy if exists "ai_usage_insert_own" on ai_usage;
create policy "ai_usage_insert_own" on ai_usage
  for insert with check (auth.uid() = user_id);

-- own rows, plus the owner sees everyone's (for the report)
drop policy if exists "ai_usage_select_own_or_admin" on ai_usage;
create policy "ai_usage_select_own_or_admin" on ai_usage for select using (
  auth.uid() = user_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'bestclouder@gmail.com'
);

-- the owner can read all profiles so the report can attach emails/plans
drop policy if exists "profiles_admin_read" on profiles;
create policy "profiles_admin_read" on profiles for select using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'bestclouder@gmail.com'
);
