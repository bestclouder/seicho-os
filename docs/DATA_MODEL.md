# Data Model

## projects
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid | nullable until lock-down |
| title | text NOT NULL | |
| summary | text | one-liner |
| vision | text | |
| why_it_matters | text | |
| success_criteria | text | |
| technical_notes | text | |
| status | text | Seed/Exploring/Active/Paused/Completed/Archived |
| start_date | date | |
| last_updated | timestamptz | updated on any write |
| created_at | timestamptz | |

## phases
`id, user_id, project_id → projects, title, description, sort_order int, status (planned/in_progress/done), created_at`

## tasks
`id, user_id, project_id → projects, phase_id → phases (nullable), title, notes, status (todo/doing/done), sort_order int, created_at`

## thoughts
`id, user_id, project_id → projects, body text NOT NULL, created_at`
**AI field — section_tag:** `section_tag text, section_tag_source text, section_tag_confidence numeric, section_tag_review_status text default 'unreviewed'`
Values: insight / decision / assumption / task_draft / other

## project_summaries
`id, user_id, project_id → projects, generated_at timestamptz, created_at`
Six AI fields, each with `value + _source + _confidence + _review_status`:
- `problem_being_solved`
- `why_worth_it`
- `what_learned`
- `assumptions_changed`
- `current_best_understanding`
- `highest_leverage_next_step`

## project_relationships
`id, user_id, source_project_id → projects, target_project_id → projects, relationship_type text, created_at`

## ideas
`id, user_id, title text NOT NULL, body text, promoted_to_project_id → projects (nullable), status (inbox/promoted/dismissed), created_at`

## audit_logs
`id, user_id, entity_type text, entity_id uuid, action text, payload jsonb, created_at`

## RLS
- v1: all tables have permissive SELECT + ALL policies (demo works without login)
- Sprint 4 lock-down: replace with `auth.uid() = user_id` owner policies
