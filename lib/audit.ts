import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Every named tool / mutation writes one audit_log row before acting
 * (docs/SECURITY.md — append-only; failures never block the action itself).
 */
export async function writeAudit(
  supabase: SupabaseClient,
  entry: {
    entity_type: string;
    entity_id: string;
    action: string;
    payload?: unknown;
    user_id?: string | null;
  },
) {
  const { error } = await supabase.from("audit_logs").insert({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    payload: entry.payload ?? null,
    user_id: entry.user_id ?? null,
  });
  if (error) console.error("audit_log write failed:", error.message);
}
