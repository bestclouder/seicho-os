"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import {
  PROJECT_KINDS,
  PROJECT_STATUSES,
  type ProjectKind,
  type ProjectStatus,
} from "@/lib/types";

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
  const kind = String(formData.get("kind") ?? "project");
  const parentId = String(formData.get("parent_id") ?? "").trim();
  const supabase = await createClient();
  const userId = await getUserId(supabase);

  const row: Record<string, unknown> = {
    title,
    summary: String(formData.get("summary") ?? "").trim() || null,
    vision: String(formData.get("vision") ?? "").trim() || null,
    why_it_matters: String(formData.get("why_it_matters") ?? "").trim() || null,
    success_criteria:
      String(formData.get("success_criteria") ?? "").trim() || null,
    status: PROJECT_STATUSES.includes(status as ProjectStatus)
      ? status
      : "Seed",
    start_date: new Date().toISOString().slice(0, 10),
    user_id: userId,
  };
  // kind/parent columns exist only after 0007; include when submitted so the
  // form still works on a pre-migration database
  if (PROJECT_KINDS.includes(kind as ProjectKind)) row.kind = kind;
  if (parentId) row.parent_id = parentId;
  // tags column exists only after 0003_add_tags.sql; the field is only
  // rendered when the probe says so, so only include it when submitted
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  if (tagsRaw) {
    row.tags = tagsRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);
  }

  const { data, error } = await supabase
    .from("projects")
    .insert(row)
    .select("id")
    .single();

  if (error || !data)
    return { ok: false as const, error: error?.message ?? "Could not save." };

  await writeAudit(supabase, {
    entity_type: "project",
    entity_id: data.id,
    action: "create_project",
    payload: { title, status },
    user_id: userId,
  });

  // Reviewed idea promotion — link the idea to its new project
  const ideaId = String(formData.get("idea_id") ?? "").trim();
  if (ideaId) {
    const { error: ideaError } = await supabase
      .from("ideas")
      .update({ status: "promoted", promoted_to_project_id: data.id })
      .eq("id", ideaId);
    if (ideaError)
      console.error("idea promotion update failed:", ideaError.message);
    else
      await writeAudit(supabase, {
        entity_type: "idea",
        entity_id: ideaId,
        action: "promote_idea_to_project",
        payload: { project_id: data.id },
      });
    revalidatePath("/ideas");
  }

  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Soft delete per docs/SECURITY.md — archive, never hard-delete. */
export async function archiveProject(projectId: string): Promise<ActionResult> {
  const result = await setProjectStatus(projectId, "Archived");
  if (result.ok) {
    revalidatePath("/dashboard");
  }
  return result;
}

/** Available once supabase/migrations/0003_add_tags.sql is applied. */
export async function updateProjectTags(
  projectId: string,
  tags: string[],
): Promise<ActionResult> {
  const clean = tags
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ tags: clean, last_updated: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };

  await writeAudit(supabase, {
    entity_type: "project",
    entity_id: projectId,
    action: "update_project_tags",
    payload: { tags: clean },
    user_id: await getUserId(supabase),
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
