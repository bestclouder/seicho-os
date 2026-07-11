# Seicho OS — Product Requirements

## Problem
People with 30–100 concurrent long-running projects constantly lose context when switching. Existing PM tools store tasks; they never store *understanding*. When you reopen a paused project months later, you have to reconstruct everything from memory.

## Target User
Solo builder/trader/learner with many concurrent projects across software, finance, fitness, and learning. Primarily uses a phone. Values long-term thinking over deadline management.

## Core Objects
- **Project** — title, summary, vision, why_it_matters, success_criteria, technical_notes, status, phases, tasks, thoughts, AI summary
- **Phase** — ordered stage within a project
- **Task** — discrete action within a phase; status: todo / doing / done
- **Thought** — any raw note, insight, decision, or assumption captured against a project
- **Project Summary** — AI-generated: problem_being_solved, why_worth_it, what_learned, assumptions_changed, current_best_understanding, highest_leverage_next_step
- **Project Relationship** — typed link between two projects
- **Idea** — unattached raw idea; promotable to a project

## MVP Must-Haves
- [ ] Create / edit / delete a project with all core fields
- [ ] Set project status: Seed, Exploring, Active, Paused, Completed, Archived
- [ ] Add a thought to a project in under 5 seconds (mobile)
- [ ] Add/reorder phases and tasks; mark tasks done
- [ ] AI-suggested phase + task breakdown from vision (user confirms before saving)
- [ ] AI project understanding summary visible on project open (resume card)
- [ ] Dashboard listing all projects: status badge, last updated, one-line summary
- [ ] App fully usable without login (demo mode with seed data)

## Non-Goals (v1)
Team collaboration, comments, notifications, calendar, time tracking, Gantt, sprints, billing, external integrations, version history, document export, voice capture.

## Definition of Done
A paused demo project is opened; within 3 seconds the resume card appears showing what problem was being solved, what was learned, and one recommended next step — all pulled live from the database and AI layer, not hardcoded. A new thought can be typed and saved without reloading the page. All states (loading, empty, error) are handled visibly.
