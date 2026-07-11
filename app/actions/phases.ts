"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
