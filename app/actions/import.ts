"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUserId } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { sanitizeDraft, type ImportDraft } from "@/lib/ai/import";

export type ApplyImportResult =
  | { ok: true; projects: number; thoughts: number; tasks: number; ideas: number }
  | { ok: false; error: string };

/**
 * Writes the user-REVIEWED draft (docs/AGENTIC_LAYER.md: rows are only
 * written after the confirmation tap). The client sends back the draft with
 * the user's exclusions already applied; we still sanitize server-side.
 */
export async function applyImport(
  importId: string,
  reviewedDraft: unknown,
): Promise<ApplyImportResult> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { ok: false, error: "Sign in to import." };

  // ownership check (RLS would also block, but fail early and clearly)
  const { data: importRow } = await supabase
    .from("imports")
    .select("id,status")
    .eq("id", importId)
    .maybeSingle();
  if (!importRow) return { ok: false, error: "Import not found." };
  if (importRow.status === "applied")
    return { ok: false, error: "This import was already applied." };

  const draft: ImportDraft = sanitizeDraft(reviewedDraft);
  if (
    draft.projects.length === 0 &&
    draft.ideas.length === 0 &&
    draft.unsorted.length === 0
  )
    return { ok: false, error: "Nothing selected to import." };

  let thoughtCount = 0;
  let taskCount = 0;

  for (const p of draft.projects) {
    const dates = p.thoughts
      .map((t) => (t.date ? new Date(t.date).getTime() : null))
      .filter((d): d is number => d !== null);
    const lastUpdated =
      dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
    const startDate =
      dates.length > 0 ? new Date(Math.min(...dates)) : new Date();

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        title: p.title,
        summary: p.summary || null,
        vision: p.vision || null,
        why_it_matters: p.why_it_matters || null,
        success_criteria: p.success_criteria || null,
        status: p.status,
        start_date: startDate.toISOString().slice(0, 10),
        last_updated: lastUpdated.toISOString(),
        user_id: userId,
      })
      .select("id")
      .single();
    if (error || !project) return { ok: false, error: error?.message ?? "Project write failed." };

    if (p.thoughts.length > 0) {
      const { error: thoughtError } = await supabase.from("thoughts").insert(
        p.thoughts.map((t) => ({
          project_id: project.id,
          body: t.body,
          section_tag: t.tag,
          section_tag_source: "openai:import",
          section_tag_confidence: 0.8,
          created_at: t.date ?? new Date().toISOString(),
          user_id: userId,
        })),
      );
      if (thoughtError) return { ok: false, error: thoughtError.message };
      thoughtCount += p.thoughts.length;
    }

    if (p.tasks.length > 0) {
      const { error: taskError } = await supabase.from("tasks").insert(
        p.tasks.map((title, i) => ({
          project_id: project.id,
          phase_id: null,
          title,
          sort_order: i + 1,
          user_id: userId,
        })),
      );
      if (taskError) return { ok: false, error: taskError.message };
      taskCount += p.tasks.length;
    }
  }

  // unsorted leftovers the user kept become ideas too, so nothing is lost
  const ideaRows = [
    ...draft.ideas.map((i) => ({
      title: i.title,
      body: i.body || null,
      user_id: userId,
    })),
    ...draft.unsorted.map((u) => ({
      title: u.slice(0, 120),
      body: u,
      user_id: userId,
    })),
  ];
  if (ideaRows.length > 0) {
    const { error: ideaError } = await supabase.from("ideas").insert(ideaRows);
    if (ideaError) return { ok: false, error: ideaError.message };
  }

  await supabase
    .from("imports")
    .update({ status: "applied" })
    .eq("id", importId);

  await writeAudit(supabase, {
    entity_type: "import",
    entity_id: importId,
    action: "apply_import",
    payload: {
      projects: draft.projects.length,
      thoughts: thoughtCount,
      tasks: taskCount,
      ideas: ideaRows.length,
    },
    user_id: userId,
  });

  revalidatePath("/");
  revalidatePath("/ideas");
  return {
    ok: true,
    projects: draft.projects.length,
    thoughts: thoughtCount,
    tasks: taskCount,
    ideas: ideaRows.length,
  };
}
