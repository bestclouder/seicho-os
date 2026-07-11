"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUserId } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import type { Phase } from "@/lib/types";

export type PhaseResult =
  | { ok: true; phase: Phase }
  | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addPhase(
  projectId: string,
  title: string,
): Promise<PhaseResult> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Phase needs a title." };

  const supabase = await createClient();
  const userId = await getUserId(supabase);
  const { data: maxRow } = await supabase
    .from("phases")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("phases")
    .insert({
      project_id: projectId,
      title: trimmed,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not add phase." };

  await writeAudit(supabase, {
    entity_type: "phase",
    entity_id: data.id,
    action: "add_phase",
    payload: { project_id: projectId, title: trimmed },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, phase: data as Phase };
}

export async function renamePhase(
  phaseId: string,
  title: string,
): Promise<ActionResult> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Phase needs a title." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("phases")
    .update({ title: trimmed })
    .eq("id", phaseId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setPhaseStatus(
  phaseId: string,
  status: Phase["status"],
): Promise<ActionResult> {
  if (!["planned", "in_progress", "done"].includes(status))
    return { ok: false, error: "Unknown phase status." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("phases")
    .update({ status })
    .eq("id", phaseId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deletePhase(phaseId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("phases").delete().eq("id", phaseId);
  if (error) return { ok: false, error: error.message };

  await writeAudit(supabase, {
    entity_type: "phase",
    entity_id: phaseId,
    action: "delete_phase",
  });
  return { ok: true };
}

export type ApplyDraftResult =
  | { ok: true; phases: Phase[]; tasks: import("@/lib/types").Task[] }
  | { ok: false; error: string };

/**
 * Writes a user-CONFIRMED AI phase/task draft (docs/AGENTIC_LAYER.md:
 * suggest_phases_and_tasks is medium risk — rows are only written here,
 * after the confirmation tap).
 */
export async function applyPhaseDraft(
  projectId: string,
  draft: { title: string; tasks: string[] }[],
): Promise<ApplyDraftResult> {
  if (!Array.isArray(draft) || draft.length === 0)
    return { ok: false, error: "Draft is empty." };

  const supabase = await createClient();
  const userId = await getUserId(supabase);
  const { data: maxRow } = await supabase
    .from("phases")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let order = maxRow?.sort_order ?? 0;
  const createdPhases: Phase[] = [];
  const createdTasks: import("@/lib/types").Task[] = [];

  for (const item of draft.slice(0, 6)) {
    const title = String(item.title ?? "").trim();
    if (!title) continue;
    order += 1;
    const { data: phase, error } = await supabase
      .from("phases")
      .insert({
        project_id: projectId,
        title,
        sort_order: order,
        user_id: userId,
      })
      .select("*")
      .single();
    if (error || !phase)
      return { ok: false, error: error?.message ?? "Could not write phases." };
    createdPhases.push(phase as Phase);

    const titles = (item.tasks ?? [])
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 8);
    if (titles.length > 0) {
      const { data: tasks, error: taskError } = await supabase
        .from("tasks")
        .insert(
          titles.map((t, i) => ({
            project_id: projectId,
            phase_id: phase.id,
            title: t,
            sort_order: i + 1,
            user_id: userId,
          })),
        )
        .select("*");
      if (taskError)
        return { ok: false, error: taskError.message };
      createdTasks.push(...((tasks ?? []) as import("@/lib/types").Task[]));
    }
  }

  await writeAudit(supabase, {
    entity_type: "project",
    entity_id: projectId,
    action: "apply_phase_draft",
    payload: {
      phases: createdPhases.length,
      tasks: createdTasks.length,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, phases: createdPhases, tasks: createdTasks };
}

/** Persist a full ordering after a reorder gesture. */
export async function reorderPhases(
  projectId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("phases")
      .update({ sort_order: i + 1 })
      .eq("id", orderedIds[i])
      .eq("project_id", projectId);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
