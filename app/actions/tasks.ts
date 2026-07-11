"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import type { Task } from "@/lib/types";

export type TaskResult =
  | { ok: true; task: Task }
  | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addTask(
  projectId: string,
  phaseId: string | null,
  title: string,
): Promise<TaskResult> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Task needs a title." };

  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      phase_id: phaseId,
      title: trimmed,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
    })
    .select("*")
    .single();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not add task." };

  await writeAudit(supabase, {
    entity_type: "task",
    entity_id: data.id,
    action: "add_task",
    payload: { project_id: projectId, phase_id: phaseId },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, task: data as Task };
}

/** todo → doing → done → todo */
export async function cycleTaskStatus(
  taskId: string,
  current: Task["status"],
): Promise<ActionResult & { status?: Task["status"] }> {
  const next: Record<Task["status"], Task["status"]> = {
    todo: "doing",
    doing: "done",
    done: "todo",
  };
  const status = next[current] ?? "todo";

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, status };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  await writeAudit(supabase, {
    entity_type: "task",
    entity_id: taskId,
    action: "delete_task",
  });
  return { ok: true };
}
