# Test Plan

## V1 Success Scenario (manual, end-to-end)

### Setup
- App running on Vercel preview URL
- Seed data applied (Algo Trading Framework project visible, status Paused, last_updated 45 days ago)
- No login required

### Steps
1. Open dashboard URL — **expect:** 4 seed projects visible with correct status badges and summaries; no login wall
2. Tap "Algo Trading Framework" card — **expect:** project detail loads; resume card appears within 3 s; all six AI fields populated (problem, why, learned, assumptions, understanding, next step)
3. Check resume card source label — **expect:** shows "openai:gpt-4o" and confidence ≥ 0.8
4. Type a thought: "Realized I need to handle slippage differently in the live execution layer" — tap Send — **expect:** thought appears in list within 1 s; section_tag badge appears within 2 s (should be "decision" or "insight")
5. Tap "Suggest phases" — **expect:** draft overlay appears with ≥2 phases and tasks; no rows written yet
6. Confirm draft — **expect:** phases and tasks visible in project detail; survive page refresh
7. Create new project — fill title, vision, why_it_matters, set status to Exploring — **expect:** saved project appears on dashboard with correct status badge
8. Open new project — **expect:** resume card shows loading state then renders (may be low confidence on sparse data); no white screen

## Empty State Tests
- New project with no thoughts: resume card shows "Not enough context yet — add some thoughts to generate a summary"
- Project with no phases: phases section shows "Add your first phase" CTA
- Dashboard with no projects: shows "No projects yet" with Create button

## Error State Tests
- Disconnect Supabase (invalid URL) — dashboard shows error toast, not blank screen
- OpenAI key invalid — summary generation fails gracefully; last stored summary shown with "Could not refresh" label; no crash
- Submit empty project title — form shows inline validation error; no DB call made

## Mobile Tests
- Open dashboard on 390px wide viewport — cards stack single-column; no horizontal scroll
- Open project detail — thought input sticks to bottom; does not overlap keyboard on iOS Safari
- Tap task checkbox — marks done without full page reload

## Security Checks (Sprint 4, before real users)
- `grep -r OPENAI_API_KEY .next/` → 0 results
- Fetch `/api/generate-summary?project_id=<other-user-project>` as wrong user → 0 rows returned / 403
- Anon Supabase client query on projects table → 0 rows returned after lock-down policies applied
