"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import type { Idea } from "@/lib/types";

export type IdeaResult =
  | { ok: true; idea: Idea }
  | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addIdea(
  title: string,
  body: string,
): Promise<IdeaResult> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Idea needs a title." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ideas")
    .insert({ title: trimmed, body: body.trim() || null })
    .select("*")
    .single();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not save idea." };

  await writeAudit(supabase, {
    entity_type: "idea",
    entity_id: data.id,
    action: "add_idea",
  });

  revalidatePath("/ideas");
  return { ok: true, idea: data as Idea };
}

export async function dismissIdea(ideaId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ideas")
    .update({ status: "dismissed" })
    .eq("id", ideaId);
  if (error) return { ok: false, error: error.message };

  await writeAudit(supabase, {
    entity_type: "idea",
    entity_id: ideaId,
    action: "dismiss_idea",
  });
  revalidatePath("/ideas");
  return { ok: true };
}

export async function restoreIdea(ideaId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ideas")
    .update({ status: "inbox" })
    .eq("id", ideaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ideas");
  return { ok: true };
}

/** Called after the user reviewed the drafted fields and saved the project. */
export async function markIdeaPromoted(
  ideaId: string,
  projectId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ideas")
    .update({ status: "promoted", promoted_to_project_id: projectId })
    .eq("id", ideaId);
  if (error) return { ok: false, error: error.message };

  await writeAudit(supabase, {
    entity_type: "idea",
    entity_id: ideaId,
    action: "promote_idea_to_project",
    payload: { project_id: projectId },
  });
  revalidatePath("/ideas");
  return { ok: true };
}
