-- Lock-down + access plans. Run this ONCE in the Supabase dashboard SQL editor.
--
-- Access model:
--   * Rows with user_id IS NULL are the shared DEMO workspace: readable by
--     everyone (signed in or not), writable by no one.
--   * Signing up (magic link) creates a profile automatically:
--       - bestclouder@gmail.com  -> plan 'lifetime'  (full access, no expiry)
--       - everyone else          -> plan 'trial'     (full access for 7 days,
--         then view-only: they keep reading their own content but can no
--         longer create, edit, or delete)
--   * Owned rows are private: only their owner can see them.
--   * Audit logs are append-only.
--
-- The app detects the profiles table and switches its UI to enforce the same
-- rules the moment this has run. Safe to re-run (idempotent).

-- ── profiles: one row per auth user, provisioned by trigger ────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'trial' check (plan in ('lifetime', 'trial')),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

drop policy if exists "profiles_self_read" on profiles;
create policy "profiles_self_read" on profiles
  for select using (auth.uid() = id);
-- no insert/update/delete policies: clients never write profiles directly

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, plan)
  values (
    new.id,
    coalesce(new.email, ''),
    case when lower(coalesce(new.email, '')) = 'bestclouder@gmail.com'
         then 'lifetime' else 'trial' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this ran
insert into profiles (id, email, plan)
select u.id, coalesce(u.email, ''),
       case when lower(coalesce(u.email, '')) = 'bestclouder@gmail.com'
            then 'lifetime' else 'trial' end
from auth.users u
on conflict (id) do nothing;

-- ── write gate: lifetime, or trial within its first 7 days ─────────────────
create or replace function public.can_write()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and (p.plan = 'lifetime' or p.created_at > now() - interval '7 days')
  );
$$;

-- ── replace permissive v1 policies with owner + plan policies ───────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'projects','phases','tasks','thoughts','project_summaries',
    'project_relationships','ideas','audit_logs'
  ]
  loop
    -- v1 permissive policies
    execute format('drop policy if exists "%s_v1_read" on %I', t, t);
    execute format('drop policy if exists "%s_v1_write" on %I', t, t);
    -- earlier drafts of this migration
    execute format('drop policy if exists "%s_owner_read" on %I', t, t);
    execute format('drop policy if exists "%s_owner_insert" on %I', t, t);
    execute format('drop policy if exists "%s_owner_update" on %I', t, t);
    execute format('drop policy if exists "%s_owner_delete" on %I', t, t);

    -- demo rows readable by all; owned rows owner-only
    execute format(
      'create policy "%s_owner_read" on %I for select
         using (user_id is null or auth.uid() = user_id)', t, t);

    -- create/edit/delete require ownership AND an active plan
    execute format(
      'create policy "%s_owner_insert" on %I for insert
         with check (auth.uid() = user_id and public.can_write())', t, t);

    execute format(
      'create policy "%s_owner_update" on %I for update
         using (auth.uid() = user_id and public.can_write())
         with check (auth.uid() = user_id)', t, t);

    -- audit logs are append-only: no update/delete for anyone
    if t = 'audit_logs' then
      execute format('drop policy if exists "%s_owner_update" on %I', t, t);
    else
      execute format(
        'create policy "%s_owner_delete" on %I for delete
           using (auth.uid() = user_id and public.can_write())', t, t);
    end if;
  end loop;
end $$;
