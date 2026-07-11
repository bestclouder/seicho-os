"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import type { Thought } from "@/lib/types";

export type ThoughtResult =
  | { ok: true; thought: Thought }
  | { ok: false; error: string };

export async function addThought(
  projectId: string,
  body: string,
): Promise<ThoughtResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Thought is empty." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thoughts")
    .insert({ project_id: projectId, body: trimmed })
    .select("*")
    .single();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not save thought." };

  // Keep the project's recency signal fresh
  await supabase
    .from("projects")
    .update({ last_updated: new Date().toISOString() })
    .eq("id", projectId);

  await writeAudit(supabase, {
    entity_type: "thought",
    entity_id: data.id,
    action: "add_thought",
    payload: { project_id: projectId },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, thought: data as Thought };
}
