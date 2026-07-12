-- Trial goes 7 -> 30 days, with an extension-request path.
--
-- * profiles.trial_expires_at is now the single source of truth for trial
--   life; granting an extension = bumping that timestamp.
-- * Expired users can file ONE pending extension request (they stay
--   view-only meanwhile). Requests are reviewed manually:
--     grant:   update profiles set trial_expires_at = now() + interval '30 days'
--              where email = '<their email>';
--              update extension_requests set status = 'granted'
--              where email = '<their email>' and status = 'pending';
--     decline: update extension_requests set status = 'declined' where ...;

alter table profiles add column if not exists trial_expires_at timestamptz;
update profiles
  set trial_expires_at = created_at + interval '30 days'
  where trial_expires_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, plan, trial_expires_at)
  values (
    new.id,
    coalesce(new.email, ''),
    case when lower(coalesce(new.email, '')) = 'bestclouder@gmail.com'
         then 'lifetime' else 'trial' end,
    now() + interval '30 days'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.can_write()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and (p.plan = 'lifetime'
           or coalesce(p.trial_expires_at, p.created_at + interval '30 days') > now())
  );
$$;

create table if not exists extension_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'granted', 'declined')),
  created_at timestamptz not null default now()
);
alter table extension_requests enable row level security;

drop policy if exists "extension_requests_own_read" on extension_requests;
create policy "extension_requests_own_read" on extension_requests
  for select using (auth.uid() = user_id);

-- Deliberately NOT gated by can_write(): expired users are exactly who files these
drop policy if exists "extension_requests_own_insert" on extension_requests;
create policy "extension_requests_own_insert" on extension_requests
  for insert with check (auth.uid() = user_id);

-- one pending request per user
create unique index if not exists extension_requests_one_pending
  on extension_requests (user_id) where status = 'pending';
