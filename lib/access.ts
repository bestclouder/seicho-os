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
};

const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

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
    return { lockdownApplied, userId, email, plan: null, daysLeft: null, canWrite: true };
  }

  if (!userId) {
    return { lockdownApplied, userId: null, email: null, plan: null, daysLeft: null, canWrite: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    // Signed in but no profile row (shouldn't happen) — treat as expired
    return { lockdownApplied, userId, email, plan: "trial", daysLeft: 0, canWrite: false };
  }

  if (profile.plan === "lifetime") {
    return { lockdownApplied, userId, email, plan: "lifetime", daysLeft: null, canWrite: true };
  }

  const remaining = TRIAL_MS - (Date.now() - new Date(profile.created_at).getTime());
  const daysLeft = Math.max(0, Math.ceil(remaining / 86_400_000));
  return {
    lockdownApplied,
    userId,
    email,
    plan: "trial",
    daysLeft,
    canWrite: remaining > 0,
  };
}
