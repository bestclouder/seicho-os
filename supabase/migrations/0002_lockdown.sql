-- Sprint 4 lock-down: replace v1 permissive policies with owner-scoped RLS.
--
-- ⚠️ NOT YET APPLIED. Applying requires DB admin access (service-role key or
-- the Supabase dashboard SQL editor), which is not present in this project's
-- Vercel env. To apply: paste this file into the Supabase SQL editor and run.
--
-- Policy model:
--   * Rows with user_id IS NULL are shared demo/seed rows: readable by
--     everyone (keeps the public demo working), writable by any signed-in
--     user is NOT allowed — they become read-only once this runs.
--   * Rows with a user_id are private: only their owner can read or write.
--   * After running, back-fill seed rows to a demo account if you want them
--     editable:  update projects set user_id = '<demo-user-uuid>' where user_id is null;
--     (repeat for phases, tasks, thoughts, project_summaries, project_relationships, ideas)

do $$
declare
  t text;
begin
  foreach t in array array[
    'projects','phases','tasks','thoughts','project_summaries',
    'project_relationships','ideas','audit_logs'
  ]
  loop
    execute format('drop policy if exists "%s_v1_read" on %I', t, t);
    execute format('drop policy if exists "%s_v1_write" on %I', t, t);

    -- demo rows stay publicly readable; owned rows are owner-only
    execute format(
      'create policy "%s_owner_read" on %I for select
         using (user_id is null or auth.uid() = user_id)', t, t);

    execute format(
      'create policy "%s_owner_insert" on %I for insert
         with check (auth.uid() = user_id)', t, t);

    execute format(
      'create policy "%s_owner_update" on %I for update
         using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);

    -- audit logs are append-only for everyone (docs/SECURITY.md)
    if t <> 'audit_logs' then
      execute format(
        'create policy "%s_owner_delete" on %I for delete
           using (auth.uid() = user_id)', t, t);
    end if;
  end loop;
end $$;
