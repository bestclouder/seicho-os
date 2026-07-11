# Intelligence Layer

## Messy inputs
- Free-text thoughts: "I think the real problem is X" / "Changed direction because Y" / "Assumption wrong"
- Project fields filled partially or vaguely
- Thoughts spread over months with no structure

## Auto-structure: thought routing
On each new thought save, call OpenAI to classify into section_tag:
```json
{
  "section_tag": "assumption",
  "section_tag_source": "openai:gpt-4o",
  "section_tag_confidence": 0.87,
  "section_tag_review_status": "unreviewed"
}
```
**Risk:** low — auto-applied, user can correct.

## Project understanding summary
Triggered on project open (if stale) or manual regeneration.
Context sent to model: all project fields + last 20 thoughts (chronological).
Returns JSON for all six fields (each stored with source + confidence + review_status).
**Risk:** low for read; medium for any write-back (user reviews before task draft is created).

## AI-assisted phase + task breakdown
Input: vision + success_criteria → model returns `{phases: [{title, tasks: [title]}]}`
Returned as a draft; user confirms or edits before any row is written.
**Risk:** medium — draft shown, approval required.

## Momentum score (rule-based, no AI)
```
score = (1 / days_since_last_thought) * 40
       + phase_completion_pct * 40
       + status_weight * 20
```
`status_weight`: Active=1, Exploring=0.7, Paused=0.3, Seed=0.5
Dashboard sorts by score descending. No model call needed.

## v1 vs later
- **v1:** summary generation, thought routing, phase/task draft, momentum score
- **Later:** assumption-change detection across time, contradiction alerts, weekly AI digest email
