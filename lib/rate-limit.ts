import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-user hourly budget for AI generation across the classify / summarize /
 * suggest routes. Counted from audit_logs (every AI route writes exactly one
 * audit row per call), so it needs no extra table. This is a cost guard, not a
 * security boundary — RLS is the real boundary; see docs/SECURITY_AUDIT.md.
 */
export const AI_ACTIONS = [
  "classify_thought",
  "generate_project_summary",
  "regenerate_summary",
  "suggest_phases_and_tasks",
] as const;

export const AI_HOURLY_LIMIT = 30;

/** Number of AI generations this user has run in the trailing hour. */
export async function aiActionsInLastHour(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("action", AI_ACTIONS as unknown as string[])
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  return count ?? 0;
}
