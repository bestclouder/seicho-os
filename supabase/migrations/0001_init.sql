create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  summary text,
  vision text,
  why_it_matters text,
  success_criteria text,
  technical_notes text,
  status text not null default 'Seed',
  start_date date,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table projects enable row level security;
drop policy if exists "projects_v1_read" on projects;
create policy "projects_v1_read" on projects for select using (true);
drop policy if exists "projects_v1_write" on projects;
create policy "projects_v1_write" on projects for all using (true) with check (true);

create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);
alter table phases enable row level security;
drop policy if exists "phases_v1_read" on phases;
create policy "phases_v1_read" on phases for select using (true);
drop policy if exists "phases_v1_write" on phases;
create policy "phases_v1_write" on phases for all using (true) with check (true);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid not null references projects(id) on delete cascade,
  phase_id uuid references phases(id) on delete set null,
  title text not null,
  notes text,
  status text not null default 'todo',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table tasks enable row level security;
drop policy if exists "tasks_v1_read" on tasks;
create policy "tasks_v1_read" on tasks for select using (true);
drop policy if exists "tasks_v1_write" on tasks;
create policy "tasks_v1_write" on tasks for all using (true) with check (true);

create table if not exists thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid not null references projects(id) on delete cascade,
  body text not null,
  section_tag text,
  section_tag_source text,
  section_tag_confidence numeric,
  section_tag_review_status text default 'unreviewed',
  created_at timestamptz not null default now()
);
alter table thoughts enable row level security;
drop policy if exists "thoughts_v1_read" on thoughts;
create policy "thoughts_v1_read" on thoughts for select using (true);
drop policy if exists "thoughts_v1_write" on thoughts;
create policy "thoughts_v1_write" on thoughts for all using (true) with check (true);

create table if not exists project_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid not null references projects(id) on delete cascade,
  problem_being_solved text,
  problem_being_solved_source text,
  problem_being_solved_confidence numeric,
  problem_being_solved_review_status text default 'unreviewed',
  why_worth_it text,
  why_worth_it_source text,
  why_worth_it_confidence numeric,
  why_worth_it_review_status text default 'unreviewed',
  what_learned text,
  what_learned_source text,
  what_learned_confidence numeric,
  what_learned_review_status text default 'unreviewed',
  assumptions_changed text,
  assumptions_changed_source text,
  assumptions_changed_confidence numeric,
  assumptions_changed_review_status text default 'unreviewed',
  current_best_understanding text,
  current_best_understanding_source text,
  current_best_understanding_confidence numeric,
  current_best_understanding_review_status text default 'unreviewed',
  highest_leverage_next_step text,
  highest_leverage_next_step_source text,
  highest_leverage_next_step_confidence numeric,
  highest_leverage_next_step_review_status text default 'unreviewed',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table project_summaries enable row level security;
drop policy if exists "project_summaries_v1_read" on project_summaries;
create policy "project_summaries_v1_read" on project_summaries for select using (true);
drop policy if exists "project_summaries_v1_write" on project_summaries;
create policy "project_summaries_v1_write" on project_summaries for all using (true) with check (true);

create table if not exists project_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  source_project_id uuid not null references projects(id) on delete cascade,
  target_project_id uuid not null references projects(id) on delete cascade,
  relationship_type text not null default 'related',
  created_at timestamptz not null default now()
);
alter table project_relationships enable row level security;
drop policy if exists "project_relationships_v1_read" on project_relationships;
create policy "project_relationships_v1_read" on project_relationships for select using (true);
drop policy if exists "project_relationships_v1_write" on project_relationships;
create policy "project_relationships_v1_write" on project_relationships for all using (true) with check (true);

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  body text,
  promoted_to_project_id uuid references projects(id) on delete set null,
  status text not null default 'inbox',
  created_at timestamptz not null default now()
);
alter table ideas enable row level security;
drop policy if exists "ideas_v1_read" on ideas;
create policy "ideas_v1_read" on ideas for select using (true);
drop policy if exists "ideas_v1_write" on ideas;
create policy "ideas_v1_write" on ideas for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

insert into projects (id, title, summary, vision, why_it_matters, success_criteria, status, start_date, last_updated) values
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Seicho OS',
  'Personal AI project operating system for long-term thinkers.',
  'A tool that stores the understanding behind my projects, not just tasks, so I can resume any project months later in under 60 seconds.',
  'I have 30+ concurrent projects and constantly lose context when switching. Rebuilding that context wastes hours and kills momentum.',
  'I open a paused project and immediately know what I was trying to solve, what I learned, and exactly what to do next.',
  'Active',
  '2024-01-15',
  now()
),
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  'Algo Trading Framework',
  'Systematic momentum + mean-reversion strategy runner for personal accounts.',
  'A fully automated backtesting and live execution layer I control entirely, without paying SaaS fees.',
  'My edge comes from iteration speed. Manual execution kills alpha.',
  'Running 3 live strategies with automated position sizing and daily PnL reporting.',
  'Paused',
  '2023-09-01',
  now() - interval '45 days'
),
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  'Deep Work Protocol',
  'Personal system for protecting and measuring high-quality focused work hours.',
  'A daily rhythm that guarantees 4+ hours of deep work regardless of external demands.',
  'Distraction is the primary tax on everything I care about building.',
  'Averaged 4h of logged deep work per day for 30 consecutive days.',
  'Exploring',
  '2024-03-01',
  now() - interval '3 days'
),
(
  'a1b2c3d4-0004-0004-0004-000000000004',
  'Fitness Longevity Stack',
  'Evidence-based training and recovery protocol optimized for cognitive + physical longevity.',
  'Still feeling strong and sharp at 70 by building the right habits now.',
  'Most fitness advice is optimized for aesthetics. I want to optimize for function over decades.',
  'Completed 90-day base protocol; bloodwork markers improved; protocol documented.',
  'Active',
  '2024-02-01',
  now() - interval '1 day'
);

insert into phases (id, project_id, title, sort_order, status) values
('b1000001-0001-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'Foundation — DB + Core CRUD', 1, 'done'),
('b1000001-0001-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'Thought Capture + AI Summaries', 2, 'in_progress'),
('b1000001-0001-0001-0001-000000000003', 'a1b2c3d4-0001-0001-0001-000000000001', 'Auth + Lock-down', 3, 'planned'),
('b2000002-0002-0002-0002-000000000001', 'a1b2c3d4-0002-0002-0002-000000000002', 'Backtesting engine', 1, 'done'),
('b2000002-0002-0002-0002-000000000002', 'a1b2c3d4-0002-0002-0002-000000000002', 'Live execution layer', 2, 'planned');

insert into tasks (id, project_id, phase_id, title, status) values
('c1000001-0001-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'b1000001-0001-0001-0001-000000000001', 'Design data model and write migration SQL', 'done'),
('c1000001-0001-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'b1000001-0001-0001-0001-000000000001', 'Scaffold Next.js app with Supabase client', 'done'),
('c1000001-0001-0001-0001-000000000003', 'a1b2c3d4-0001-0001-0001-000000000001', 'b1000001-0001-0001-0001-000000000002', 'Build thought capture input on project detail', 'todo'),
('c1000001-0001-0001-0001-000000000004', 'a1b2c3d4-0001-0001-0001-000000000001', 'b1000001-0001-0001-0001-000000000002', 'Integrate OpenAI for project understanding summary', 'todo');

insert into thoughts (id, project_id, body, section_tag, created_at) values
('d1000001-0001-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'The killer differentiator is storing understanding, not tasks. When I reopen a project I want to know what problem I was solving and why it mattered — not just a task count.', 'insight', now() - interval '2 days'),
('d1000001-0001-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'Mobile-first is non-negotiable. Most captures will happen on the phone between meetings or during a walk.', 'decision', now() - interval '1 day'),
('d2000002-0002-0002-0002-000000000001', 'a1b2c3d4-0002-0002-0002-000000000002', 'Pausing this until Seicho OS is stable. The backtesting engine is done but I lost context on the live execution design. Need to document the architecture before picking it back up.', 'decision', now() - interval '45 days'),
('d3000003-0003-0003-0003-000000000001', 'a1b2c3d4-0003-0003-0003-000000000003', 'Cal Newport''s time-block approach is closest to what I want but too rigid. Need a version that adapts to variable energy levels throughout the day.', 'insight', now() - interval '3 days');

insert into project_summaries (project_id, problem_being_solved, problem_being_solved_source, problem_being_solved_confidence, problem_being_solved_review_status, why_worth_it, why_worth_it_source, why_worth_it_confidence, why_worth_it_review_status, what_learned, what_learned_source, what_learned_confidence, what_learned_review_status, highest_leverage_next_step, highest_leverage_next_step_source, highest_leverage_next_step_confidence, highest_leverage_next_step_review_status) values
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Losing context when switching between 30+ concurrent projects; rebuilding mental state wastes hours and kills momentum.',
  'openai:gpt-4o', 0.92, 'reviewed',
  'Context loss is the #1 productivity tax for multi-project builders. Solving it compounds across every other project.',
  'openai:gpt-4o', 0.88, 'reviewed',
  'The differentiator is storing understanding (problem, learnings, assumptions) not tasks. Mobile-first capture is essential for real adoption.',
  'openai:gpt-4o', 0.90, 'reviewed',
  'Complete the thought capture input and wire up the first real AI summary generation end-to-end.',
  'openai:gpt-4o', 0.85, 'unreviewed'
);