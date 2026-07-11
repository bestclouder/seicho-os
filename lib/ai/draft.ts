import { callAiJson } from "./provider";
import { HEURISTIC_SOURCE } from "./heuristic";
import type { Idea } from "@/lib/types";

export type ProjectDraft = {
  title: string;
  summary: string;
  vision: string;
  why_it_matters: string;
  success_criteria: string;
  source: string;
};

const SYSTEM_PROMPT = `Turn a raw idea into a project charter draft. Return JSON:
{"title": string, "summary": string (one sentence), "vision": string, "why_it_matters": string, "success_criteria": string}.
Stay faithful to the idea; don't invent specifics that aren't implied. Keep each field tight.`;

/**
 * Medium-risk tool (promote_idea_to_project): produces a DRAFT the user
 * reviews in the New Project form before anything is saved.
 */
export async function draftProjectFromIdea(idea: Idea): Promise<ProjectDraft> {
  const fallback: ProjectDraft = {
    title: idea.title,
    summary: idea.body?.split("\n")[0]?.slice(0, 140) ?? "",
    vision: idea.body ?? "",
    why_it_matters: "",
    success_criteria: "",
    source: HEURISTIC_SOURCE,
  };

  try {
    const ai = await callAiJson(
      SYSTEM_PROMPT,
      JSON.stringify({ title: idea.title, body: idea.body }),
    );
    if (!ai) return fallback;
    return {
      title: String(ai.json.title ?? idea.title).slice(0, 200),
      summary: String(ai.json.summary ?? "").slice(0, 300),
      vision: String(ai.json.vision ?? "").slice(0, 2000),
      why_it_matters: String(ai.json.why_it_matters ?? "").slice(0, 2000),
      success_criteria: String(ai.json.success_criteria ?? "").slice(0, 2000),
      source: ai.source,
    };
  } catch (err) {
    console.error("draftProjectFromIdea failed:", err);
    return fallback;
  }
}
