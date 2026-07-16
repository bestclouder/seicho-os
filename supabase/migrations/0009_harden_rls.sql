-- Hardening pass (security audit 2026-07-16). Idempotent; safe to re-run.
--
-- 1. Child rows must belong to a project the writer owns — stops attaching
--    thoughts/tasks/phases/summaries/links to another user's (or a demo)
--    project via a known UUID.
-- 2. Admin access moves from a hardcoded email in policies to
--    profiles.is_admin, checked through a security-definer function.
-- 3. audit_logs inserts no longer require can_write(): expired-trial users
--    still perform auditable actions (e.g. extension requests), and the app
--    now stamps user_id on every audit row.

-- ── 1. admin flag ────────────────────────────────────────────────────────────
alter table profiles add column if not exists is_admin boolean not null default false;
update profiles set is_admin = true where lower(email) = 'bestclouder@gmail.com';

-- security definer: reads profiles without re-entering profiles' own RLS
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.is_admin
  );
$$;

-- keep the flag on re-signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, plan, trial_expires_at, is_admin)
  values (
    new.id,
    coalesce(new.email, ''),
    case when lower(coalesce(new.email, '')) = 'bestclouder@gmail.com'
         then 'lifetime' else 'trial' end,
    now() + interval '30 days',
    lower(coalesce(new.email, '')) = 'bestclouder@gmail.com'
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- replace the email-based policies from 0008
drop policy if exists "ai_usage_select_own_or_admin" on ai_usage;
create policy "ai_usage_select_own_or_admin" on ai_usage for select using (
  auth.uid() = user_id or public.is_admin()
);

drop policy if exists "profiles_admin_read" on profiles;
create policy "profiles_admin_read" on profiles for select using (public.is_admin());

-- ── 2. parent-ownership checks on child tables ───────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['phases','tasks','thoughts','project_summaries']
  loop
    execute format('drop policy if exists "%s_owner_insert" on %I', t, t);
    execute format(
      'create policy "%s_owner_insert" on %I for insert
         with check (auth.uid() = user_id and public.can_write()
           and exists (select 1 from projects p
                       where p.id = project_id and p.user_id = auth.uid()))',
      t, t);

    execute format('drop policy if exists "%s_owner_update" on %I', t, t);
    execute format(
      'create policy "%s_owner_update" on %I for update
         using (auth.uid() = user_id and public.can_write())
         with check (auth.uid() = user_id
           and exists (select 1 from projects p
                       where p.id = project_id and p.user_id = auth.uid()))',
      t, t);
  end loop;
end $$;

-- relationships have two parents: the writer must own both ends
drop policy if exists "project_relationships_owner_insert" on project_relationships;
create policy "project_relationships_owner_insert" on project_relationships for insert
  with check (auth.uid() = user_id and public.can_write()
    and exists (select 1 from projects p
                where p.id = source_project_id and p.user_id = auth.uid())
    and exists (select 1 from projects p
                where p.id = target_project_id and p.user_id = auth.uid()));

-- ── 3. audit logs: any authenticated user records their own actions ─────────
drop policy if exists "audit_logs_owner_insert" on audit_logs;
create policy "audit_logs_owner_insert" on audit_logs for insert
  with check (auth.uid() = user_id);
