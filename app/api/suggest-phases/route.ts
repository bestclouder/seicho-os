import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { callAiJson } from "@/lib/ai/provider";
import { HEURISTIC_SOURCE, suggestPhasesHeuristic } from "@/lib/ai/heuristic";
import { checkAiLimit, logAiUsage, isModelSource } from "@/lib/ai/rate-limit";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You break a personal project's vision into an ordered phase/task plan.
Return JSON: {"phases": [{"title": string, "tasks": [string, ...]}, ...]}.
2–5 phases, each with 2–5 concrete tasks. Phases are stages, tasks are single actions. Ground everything in the provided vision and success criteria; do not invent scope.`;

/**
 * Medium-risk tool (docs/AGENTIC_LAYER.md): returns a DRAFT only.
 * No rows are written here — the user confirms in the UI first.
 */
export async function POST(request: Request) {
  let projectId: string | undefined;
  try {
    const body = await request.json();
    projectId = body.project_id;
  } catch {
    // validated below
  }
  if (!projectId)
    return NextResponse.json({ error: "project_id required" }, { status: 400 });

  const supabase = await createClient();
  const access = await getAccess(supabase);
  const limit = await checkAiLimit(supabase, access);
  if (!limit.ok)
    return NextResponse.json(
      { error: limit.message },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const p = project as Project;
  const userPrompt = JSON.stringify({
    title: p.title,
    vision: p.vision,
    success_criteria: p.success_criteria,
    summary: p.summary,
    technical_notes: p.technical_notes,
  });

  let phases: { title: string; tasks: string[] }[];
  let source: string;
  try {
    const ai = await callAiJson(SYSTEM_PROMPT, userPrompt);
    const raw = ai?.json.phases;
    if (ai && Array.isArray(raw) && raw.length > 0) {
      phases = raw
        .slice(0, 6)
        .map((ph: { title?: unknown; tasks?: unknown }) => ({
          title: String(ph.title ?? "Untitled phase").slice(0, 200),
          tasks: Array.isArray(ph.tasks)
            ? ph.tasks.slice(0, 8).map((t) => String(t).slice(0, 300))
            : [],
        }));
      source = ai.source;
    } else {
      phases = suggestPhasesHeuristic(p).phases;
      source = HEURISTIC_SOURCE;
    }
  } catch (err) {
    console.error("suggest-phases AI call failed:", err);
    phases = suggestPhasesHeuristic(p).phases;
    source = HEURISTIC_SOURCE;
  }

  if (isModelSource(source))
    await logAiUsage(supabase, access.userId, "suggest_phases", source);

  await writeAudit(supabase, {
    entity_type: "project",
    entity_id: projectId,
    action: "suggest_phases_and_tasks",
    payload: { source, phase_count: phases.length },
  });

  return NextResponse.json({ phases, source });
}
