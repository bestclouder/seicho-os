import type { Phase, Project, Thought } from "./types";

const STATUS_WEIGHT: Record<string, number> = {
  Active: 1,
  Exploring: 0.7,
  Seed: 0.5,
  Paused: 0.3,
  Completed: 0.2,
  Archived: 0,
};

function daysSince(project: Project, lastThought: Pick<Thought, "created_at"> | null) {
  const lastActivity = lastThought?.created_at ?? project.last_updated;
  return Math.max(
    0,
    (Date.now() - new Date(lastActivity).getTime()) / 86_400_000,
  );
}

/**
 * Journeys never "complete", so progress-to-done is meaningless. Their health
 * is measured by how recently you showed up — consistency, not completion. A
 * quiet journey is drifting, not failing.
 */
export type Vitality = {
  score: number;
  label: "Thriving" | "Steady" | "Resting" | "Drifting";
};

export function journeyVitality(
  project: Project,
  lastThought: Pick<Thought, "created_at"> | null,
): Vitality {
  const days = daysSince(project, lastThought);
  if (project.status === "Paused") return { score: 30, label: "Resting" };
  if (days <= 7) return { score: 92, label: "Thriving" };
  if (days <= 30) return { score: 66, label: "Steady" };
  if (days <= 90) return { score: 40, label: "Resting" };
  return { score: 16, label: "Drifting" };
}

/**
 * Rule-based momentum score per docs/INTELLIGENCE_LAYER.md — no AI call.
 * Projects: (1 / days_since_last_thought) * 40 + phase_completion_pct * 40 + status_weight * 20.
 * Journeys: consistency-based vitality (they have no finish line).
 */
export function momentumScore(
  project: Project,
  phases: Pick<Phase, "status">[],
  lastThought: Pick<Thought, "created_at"> | null,
): number {
  if (project.kind === "journey") {
    return journeyVitality(project, lastThought).score;
  }

  const days = Math.max(1, daysSince(project, lastThought));
  const recency = (1 / days) * 40;

  const completion =
    phases.length === 0
      ? 0
      : phases.filter((p) => p.status === "done").length / phases.length;

  const weight = STATUS_WEIGHT[project.status] ?? 0.5;

  return Math.round(recency + completion * 40 + weight * 20);
}
