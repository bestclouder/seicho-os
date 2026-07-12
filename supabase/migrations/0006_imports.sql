-- Brain-dump imports: raw pasted text + the AI-drafted organization, kept so
-- a refresh mid-review loses nothing. Rows are private to their owner; only
-- active-plan users can create or update them.

create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  draft jsonb,
  status text not null default 'draft' check (status in ('draft', 'applied', 'discarded')),
  created_at timestamptz not null default now()
);
alter table imports enable row level security;

drop policy if exists "imports_own_read" on imports;
create policy "imports_own_read" on imports
  for select using (auth.uid() = user_id);

drop policy if exists "imports_own_insert" on imports;
create policy "imports_own_insert" on imports
  for insert with check (auth.uid() = user_id and public.can_write());

drop policy if exists "imports_own_update" on imports;
create policy "imports_own_update" on imports
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
