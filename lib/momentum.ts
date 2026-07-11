import type { Phase, Project, Thought } from "./types";

const STATUS_WEIGHT: Record<string, number> = {
  Active: 1,
  Exploring: 0.7,
  Seed: 0.5,
  Paused: 0.3,
  Completed: 0.2,
  Archived: 0,
};

/**
 * Rule-based momentum score per docs/INTELLIGENCE_LAYER.md — no AI call.
 * score = (1 / days_since_last_thought) * 40 + phase_completion_pct * 40 + status_weight * 20
 */
export function momentumScore(
  project: Project,
  phases: Pick<Phase, "status">[],
  lastThought: Pick<Thought, "created_at"> | null,
): number {
  const lastActivity = lastThought?.created_at ?? project.last_updated;
  const days = Math.max(
    1,
    (Date.now() - new Date(lastActivity).getTime()) / 86_400_000,
  );
  const recency = (1 / days) * 40;

  const completion =
    phases.length === 0
      ? 0
      : phases.filter((p) => p.status === "done").length / phases.length;

  const weight = STATUS_WEIGHT[project.status] ?? 0.5;

  return Math.round(recency + completion * 40 + weight * 20);
}
