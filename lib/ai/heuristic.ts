import type { Project, SectionTag, Thought } from "@/lib/types";
import { timeAgo } from "@/lib/format";

/**
 * Deterministic fallbacks used when no AI key is configured or the AI call
 * fails. Clearly labeled `heuristic:v1` with low confidence so the UI (and
 * the review_status workflow) can tell them apart from model output.
 */
export const HEURISTIC_SOURCE = "heuristic:v1";

const TAG_RULES: [SectionTag, RegExp][] = [
  ["decision", /\b(decided?|decision|going with|pausing|will use|chose|choosing|switch(ing)? to)\b/i],
  ["assumption", /\b(assum\w+|probably|i think|likely|hypothes\w+|bet is)\b/i],
  ["task_draft", /\b(need to|todo|to-do|should (build|write|add|fix|do)|next step|must)\b/i],
  ["insight", /\b(realiz\w+|learned|insight|turns out|discovered|the real problem|key is)\b/i],
];

export function classifyHeuristic(body: string): {
  section_tag: SectionTag;
  confidence: number;
} {
  for (const [tag, rx] of TAG_RULES) {
    if (rx.test(body)) return { section_tag: tag, confidence: 0.4 };
  }
  return { section_tag: "other", confidence: 0.2 };
}

export function summaryHeuristic(
  project: Project,
  thoughts: Thought[],
): Record<string, { value: string; confidence: number }> {
  const insights = thoughts.filter((t) => t.section_tag === "insight");
  const decisions = thoughts.filter((t) => t.section_tag === "decision");
  const assumptions = thoughts.filter((t) => t.section_tag === "assumption");
  const drafts = thoughts.filter((t) => t.section_tag === "task_draft");
  const latest = thoughts[0];

  const pick = (list: Thought[], fallback: string) =>
    list.length > 0 ? list.map((t) => t.body).slice(0, 2).join(" — ") : fallback;

  return {
    problem_being_solved: {
      value:
        project.why_it_matters ??
        project.summary ??
        "No problem statement captured yet — fill in “Why it matters”.",
      confidence: project.why_it_matters ? 0.5 : 0.2,
    },
    why_worth_it: {
      value:
        project.vision ??
        project.why_it_matters ??
        "No vision captured yet — add one to anchor this project.",
      confidence: project.vision ? 0.5 : 0.2,
    },
    what_learned: {
      value: pick(insights, "No insights recorded yet. Capture thoughts as you learn."),
      confidence: insights.length ? 0.45 : 0.2,
    },
    assumptions_changed: {
      value: pick(assumptions, "No assumption changes recorded."),
      confidence: assumptions.length ? 0.45 : 0.2,
    },
    current_best_understanding: {
      value: latest
        ? `Most recent thinking (${timeAgo(latest.created_at)}): ${latest.body}`
        : (project.summary ?? "No thoughts captured yet."),
      confidence: latest ? 0.4 : 0.2,
    },
    highest_leverage_next_step: {
      value: pick(
        drafts.length ? drafts : decisions,
        project.success_criteria
          ? `Work toward: ${project.success_criteria}`
          : "Add a thought about what to do next.",
      ),
      confidence: drafts.length || decisions.length ? 0.4 : 0.25,
    },
  };
}

export function suggestPhasesHeuristic(project: Project): {
  phases: { title: string; tasks: string[] }[];
} {
  const goal = project.success_criteria ?? project.vision ?? project.title;
  return {
    phases: [
      {
        title: "Clarify scope",
        tasks: [
          "Write down the single core outcome",
          "List what is explicitly out of scope",
        ],
      },
      {
        title: "Build the core",
        tasks: [
          `Build the smallest version that delivers: ${goal.slice(0, 80)}`,
          "Test it end-to-end once",
        ],
      },
      {
        title: "Harden & finish",
        tasks: ["Fix the rough edges found in testing", "Document how to resume this project"],
      },
    ],
  };
}
