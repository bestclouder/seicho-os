import type { SupabaseClient } from "@supabase/supabase-js";

export type Access = {
  /** false until 0002_lockdown.sql has been applied (legacy open mode) */
  lockdownApplied: boolean;
  userId: string | null;
  email: string | null;
  plan: "lifetime" | "trial" | null;
  /** whole days of trial remaining; null for lifetime/anonymous */
  daysLeft: number | null;
  canWrite: boolean;
  /** expired-trial user already has a pending extension request */
  extensionPending: boolean;
  /** profiles.is_admin (0009); pre-migration falls back to the lifetime plan */
  isAdmin: boolean;
};

const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Server-side view of the caller's plan. Mirrors the DB's can_write() gate —
 * RLS is the real enforcement; this only drives the UI.
 */
export async function getAccess(supabase: SupabaseClient): Promise<Access> {
  let userId: string | null = null;
  let email: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    email = data.user?.email ?? null;
  } catch {
    // treated as signed out
  }

  const probe = await supabase.from("profiles").select("id").limit(1);
  const lockdownApplied = !probe.error;

  if (!lockdownApplied) {
    // Pre-lockdown demo era: everything is open
    return { lockdownApplied, userId, email, plan: null, daysLeft: null, canWrite: true, extensionPending: false, isAdmin: false };
  }

  if (!userId) {
    return { lockdownApplied, userId: null, email: null, plan: null, daysLeft: null, canWrite: false, extensionPending: false, isAdmin: false };
  }

  // select * so this works whether or not 0009 (is_admin) has been applied
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    // Signed in but no profile row (shouldn't happen) — treat as expired
    return { lockdownApplied, userId, email, plan: "trial", daysLeft: 0, canWrite: false, extensionPending: false, isAdmin: false };
  }

  // 0009's is_admin flag governs once present; before that, the lifetime
  // plan (historically the owner) carries admin so nothing breaks mid-rollout
  const isAdmin =
    typeof profile.is_admin === "boolean"
      ? profile.is_admin
      : profile.plan === "lifetime";

  if (profile.plan === "lifetime") {
    return { lockdownApplied, userId, email, plan: "lifetime", daysLeft: null, canWrite: true, extensionPending: false, isAdmin };
  }

  const expiresAt = profile.trial_expires_at
    ? new Date(profile.trial_expires_at).getTime()
    : new Date(profile.created_at).getTime() + TRIAL_MS;
  const remaining = expiresAt - Date.now();
  const daysLeft = Math.max(0, Math.ceil(remaining / 86_400_000));
  const canWrite = remaining > 0;

  let extensionPending = false;
  if (!canWrite) {
    const { data: pending } = await supabase
      .from("extension_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    extensionPending = Boolean(pending);
  }

  return {
    lockdownApplied,
    userId,
    email,
    plan: "trial",
    daysLeft,
    canWrite,
    extensionPending,
    isAdmin,
  };
}
