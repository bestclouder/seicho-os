-- Object types: distinguish the different kinds of long-running thing.
--   project — finite, has a definition of done (Launch Uppily, Tackle Security Risk)
--   journey — ongoing, no finish line (Become a better trader, Healthspan, Parenting)
--   area    — a standing container that holds projects/journeys (Health, Career, Family)
-- Areas nest their children via parent_id. Everything defaults to 'project' so
-- existing rows (and the demo seed) are unchanged until deliberately reclassified.

alter table projects add column if not exists kind text not null default 'project'
  check (kind in ('project', 'journey', 'area'));

alter table projects add column if not exists parent_id uuid
  references projects(id) on delete set null;

create index if not exists projects_parent_id on projects(parent_id);
