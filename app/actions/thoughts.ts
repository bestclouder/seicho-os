"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUserId } from "@/lib/supabase/server";
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
  const userId = await getUserId(supabase);
  const { data, error } = await supabase
    .from("thoughts")
    .insert({ project_id: projectId, body: trimmed, user_id: userId })
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
    user_id: userId,
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, thought: data as Thought };
}

export type OlderThoughtsResult =
  | { ok: true; thoughts: Thought[]; hasMore: boolean }
  | { ok: false; error: string };

const PAGE_SIZE = 50;

export async function getOlderThoughts(
  projectId: string,
  beforeCreatedAt: string,
): Promise<OlderThoughtsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thoughts")
    .select("*")
    .eq("project_id", projectId)
    .lt("created_at", beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as Thought[];
  return {
    ok: true,
    thoughts: rows.slice(0, PAGE_SIZE),
    hasMore: rows.length > PAGE_SIZE,
  };
}
