import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Every named tool / mutation writes one audit_log row before acting
 * (docs/SECURITY.md — append-only; failures never block the action itself).
 * RLS only accepts rows stamped with the caller's own user_id, so when the
 * caller doesn't pass one, resolve it here — otherwise the row is silently
 * rejected and the audit trail goes dark.
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
  let userId = entry.user_id ?? null;
  if (!userId) {
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      userId = null;
    }
  }
  const { error } = await supabase.from("audit_logs").insert({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    payload: entry.payload ?? null,
    user_id: userId,
  });
  if (error) console.error("audit_log write failed:", error.message);
}
