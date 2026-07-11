# Agentic Layer

## Risk classification

### Low risk — auto-execute, log only
- `generate_project_summary` — reads project + thoughts, writes to project_summaries
- `classify_thought` — tags thought with section_tag
- `score_projects` — computes momentum scores for dashboard ranking

### Medium risk — show draft, require one confirmation tap
- `suggest_phases_and_tasks` — proposes phase/task structure from vision; user sees diff before any row is written
- `regenerate_summary` — user explicitly requests refresh; shows new summary before replacing old
- `promote_idea_to_project` — drafts new project fields from idea body; user reviews and saves

### High risk — explicit approval required, reason logged
- `update_project_status` — agent proposes a status change (e.g. Paused → Active) based on recent activity; user must tap Confirm

### Critical — human only, no agent path
- `delete_project` — permanent; requires typed confirmation
- `bulk_archive` — affects multiple records

## Named tools (approved list)
| Tool | Action | Risk |
|---|---|---|
| `generate_project_summary` | OpenAI call → write project_summaries | Low |
| `classify_thought` | OpenAI call → update thoughts.section_tag | Low |
| `suggest_phases_and_tasks` | OpenAI call → return draft JSON | Medium |
| `regenerate_summary` | Same as generate, explicit trigger | Medium |
| `promote_idea_to_project` | Create project row from idea | Medium |

## Audit log fields
`entity_type, entity_id, action (tool name), payload (input snapshot), user_id, created_at`

Every named tool call writes one audit_log row before acting.

## v1 vs later
- **v1:** all five tools above
- **Later:** assumption-conflict alert, weekly digest email agent, merge-projects workflow
