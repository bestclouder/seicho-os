"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const EDITABLE_FIELDS = [
  "title",
  "summary",
  "vision",
  "why_it_matters",
  "success_criteria",
  "technical_notes",
] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function createProject(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false as const, error: "Title is required." };

  const status = String(formData.get("status") ?? "Seed");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      title,
      summary: String(formData.get("summary") ?? "").trim() || null,
      vision: String(formData.get("vision") ?? "").trim() || null,
      why_it_matters:
        String(formData.get("why_it_matters") ?? "").trim() || null,
      success_criteria:
        String(formData.get("success_criteria") ?? "").trim() || null,
      status: PROJECT_STATUSES.includes(status as ProjectStatus)
        ? status
        : "Seed",
      start_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (error || !data)
    return { ok: false as const, error: error?.message ?? "Could not save." };

  await writeAudit(supabase, {
    entity_type: "project",
    entity_id: data.id,
    action: "create_project",
    payload: { title, status },
  });

  revalidatePath("/");
  redirect(`/projects/${data.id}`);
}

export async function updateProjectField(
  projectId: string,
  field: string,
  value: string,
): Promise<ActionResult> {
  if (!EDITABLE_FIELDS.includes(field as EditableField))
    return { ok: false, error: "Unknown field." };
  const trimmed = value.trim();
  if (field === "title" && !trimmed)
    return { ok: false, error: "Title cannot be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      [field]: trimmed || null,
      last_updated: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };

  await writeAudit(supabase, {
    entity_type: "project",
    entity_id: projectId,
    action: "update_project_field",
    payload: { field },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function setProjectStatus(
  projectId: string,
  status: ProjectStatus,
): Promise<ActionResult> {
  if (!PROJECT_STATUSES.includes(status))
    return { ok: false, error: "Unknown status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status, last_updated: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };

  await writeAudit(supabase, {
    entity_type: "project",
    entity_id: projectId,
    action: "update_project_status",
    payload: { status },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return { ok: true };
}

/** Soft delete per docs/SECURITY.md — archive, never hard-delete. */
export async function archiveProject(projectId: string): Promise<ActionResult> {
  const result = await setProjectStatus(projectId, "Archived");
  if (result.ok) {
    revalidatePath("/");
  }
  return result;
}
