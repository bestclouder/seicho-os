"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { RELATIONSHIP_TYPES, type ProjectRelationship } from "@/lib/types";

export type RelationshipResult =
  | { ok: true; relationship: ProjectRelationship }
  | { ok: false; error: string };

export async function addRelationship(
  sourceProjectId: string,
  targetProjectId: string,
  type: string,
): Promise<RelationshipResult> {
  if (sourceProjectId === targetProjectId)
    return { ok: false, error: "A project can't link to itself." };
  if (!RELATIONSHIP_TYPES.includes(type as (typeof RELATIONSHIP_TYPES)[number]))
    return { ok: false, error: "Unknown relationship type." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_relationships")
    .insert({
      source_project_id: sourceProjectId,
      target_project_id: targetProjectId,
      relationship_type: type,
    })
    .select("*")
    .single();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not link projects." };

  await writeAudit(supabase, {
    entity_type: "project_relationship",
    entity_id: data.id,
    action: "add_relationship",
    payload: { sourceProjectId, targetProjectId, type },
  });

  revalidatePath(`/projects/${sourceProjectId}`);
  revalidatePath(`/projects/${targetProjectId}`);
  return { ok: true, relationship: data as ProjectRelationship };
}

export async function deleteRelationship(
  relationshipId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_relationships")
    .delete()
    .eq("id", relationshipId);
  if (error) return { ok: false, error: error.message };

  await writeAudit(supabase, {
    entity_type: "project_relationship",
    entity_id: relationshipId,
    action: "delete_relationship",
  });
  return { ok: true };
}
