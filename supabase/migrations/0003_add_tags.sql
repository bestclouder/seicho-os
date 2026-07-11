-- Tag/category filtering on the dashboard.
--
-- ⚠️ Apply via the Supabase dashboard SQL editor (DB admin access is not
-- available in this project's env). The tag UI detects this column and stays
-- hidden until the migration is applied — nothing breaks either way.

alter table projects add column if not exists tags text[] not null default '{}';
create index if not exists projects_tags_gin on projects using gin (tags);
