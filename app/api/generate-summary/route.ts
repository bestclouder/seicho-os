import { NextResponse } from "next/server";
import { createClient, getUserId } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { callAiJson } from "@/lib/ai/provider";
import { HEURISTIC_SOURCE, summaryHeuristic } from "@/lib/ai/heuristic";
import { SUMMARY_FIELDS, type Project, type Thought } from "@/lib/types";

export const dynamic = "force-dynamic";

const STALE_MS = 24 * 60 * 60 * 1000;

const SYSTEM_PROMPT = `You are the understanding layer of a personal project OS. Given a project's fields and its recent thoughts (newest first), produce the project's current understanding as JSON with exactly these keys:
problem_being_solved, why_worth_it, what_learned, assumptions_changed, current_best_understanding, highest_leverage_next_step.
Each key maps to {"value": string, "confidence": number between 0 and 1}.
Write value as 1–3 tight sentences in the project owner's voice, grounded ONLY in the provided material. If material is too thin for a field, say so plainly and use confidence <= 0.3. highest_leverage_next_step must be ONE concrete action.`;

export async function POST(request: Request) {
  let projectId: string | undefined;
  let force = false;
  try {
    const body = await request.json();
    projectId = body.project_id;
    force = Boolean(body.force);
  } catch {
    // fall through to validation below
  }
  if (!projectId)
    return NextResponse.json({ error: "project_id required" }, { status: 400 });

  const supabase = await createClient();

  const [projectRes, summaryRes, thoughtsRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    supabase
      .from("project_summaries")
      .select("*")
      .eq("project_id", projectId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("thoughts")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const project = projectRes.data as Project | null;
  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const existing = summaryRes.data;
  const isFresh =
    existing &&
    Date.now() - new Date(existing.generated_at).getTime() < STALE_MS;
  if (existing && isFresh && !force) {
    return NextResponse.json({ summary: existing, regenerated: false });
  }

  const thoughts = (thoughtsRes.data ?? []) as Thought[];

  const userPrompt = JSON.stringify({
    project: {
      title: project.title,
      summary: project.summary,
      vision: project.vision,
      why_it_matters: project.why_it_matters,
      success_criteria: project.success_criteria,
      technical_notes: project.technical_notes,
      status: project.status,
    },
    thoughts_newest_first: thoughts.map((t) => ({
      body: t.body,
      tag: t.section_tag,
      at: t.created_at,
    })),
  });

  let fields: Record<string, { value: string; confidence: number }>;
  let source: string;
  try {
    const ai = await callAiJson(SYSTEM_PROMPT, userPrompt);
    if (ai) {
      fields = Object.fromEntries(
        SUMMARY_FIELDS.map((f) => {
          const raw = ai.json[f] as
            | { value?: unknown; confidence?: unknown }
            | undefined;
          return [
            f,
            {
              value: String(raw?.value ?? "").slice(0, 2000) || "Not enough context yet.",
              confidence: Math.max(0, Math.min(1, Number(raw?.confidence ?? 0.3))),
            },
          ];
        }),
      );
      source = ai.source;
    } else {
      fields = summaryHeuristic(project, thoughts);
      source = HEURISTIC_SOURCE;
    }
  } catch (err) {
    console.error("generate-summary AI call failed:", err);
    if (existing) {
      // Graceful fallback: keep serving the last stored summary
      return NextResponse.json({
        summary: existing,
        regenerated: false,
        error: "Could not refresh understanding",
      });
    }
    fields = summaryHeuristic(project, thoughts);
    source = HEURISTIC_SOURCE;
  }

  const row: Record<string, unknown> = {
    project_id: projectId,
    generated_at: new Date().toISOString(),
    user_id: await getUserId(supabase),
  };
  for (const f of SUMMARY_FIELDS) {
    row[f] = fields[f].value;
    row[`${f}_source`] = source;
    row[`${f}_confidence`] = fields[f].confidence;
    row[`${f}_review_status`] = "unreviewed";
  }

  const { data: inserted, error: insertError } = await supabase
    .from("project_summaries")
    .insert(row)
    .select("*")
    .single();

  if (insertError) {
    // Post-lockdown, read-only callers (demo viewers, expired trials) can't
    // store a regenerated summary — serve the last stored one instead.
    console.error("project_summaries insert failed:", insertError.message);
    if (existing) {
      return NextResponse.json({
        summary: existing,
        regenerated: false,
        error: "Read-only — showing stored summary",
      });
    }
    return NextResponse.json(
      { error: "Sign in to generate summaries" },
      { status: 403 },
    );
  }

  await writeAudit(supabase, {
    entity_type: "project_summary",
    entity_id: inserted.id,
    action: force ? "regenerate_summary" : "generate_project_summary",
    payload: { project_id: projectId, source, thought_count: thoughts.length },
  });

  return NextResponse.json({ summary: inserted, regenerated: true });
}
