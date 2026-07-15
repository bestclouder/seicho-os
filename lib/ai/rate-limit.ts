import type { SupabaseClient } from "@supabase/supabase-js";
import type { Access } from "@/lib/access";

// Two layers, per user. Tune here. The owner (lifetime plan) is exempt.
export const AI_PER_MINUTE = 1;
export const AI_PER_DAY = 20;

export type AiAction =
  | "generate_summary"
  | "classify_thought"
  | "suggest_phases"
  | "import_analyze"
  | "draft_idea";

export type LimitResult =
  | { ok: true }
  | { ok: false; message: string; retryAfterSec: number };

/**
 * Checks whether this user may make another OpenAI-backed call right now.
 * Only real model calls are counted (logged via logAiUsage), so heuristic
 * fallbacks never eat the budget. Lifetime users (the owner) are exempt but
 * still logged for the report.
 */
export async function checkAiLimit(
  supabase: SupabaseClient,
  access: Access,
): Promise<LimitResult> {
  if (!access.userId)
    return { ok: false, message: "Sign in to use AI features.", retryAfterSec: 0 };
  if (access.plan === "lifetime") return { ok: true };

  const now = Date.now();
  const since = new Date(now - 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("ai_usage")
    .select("created_at")
    .eq("user_id", access.userId)
    .gte("created_at", since);

  // If the usage table isn't there yet (pre-0008), fail open — don't block.
  if (error) return { ok: true };
  const rows = data ?? [];

  const perMinute = rows.filter(
    (r) => now - new Date(r.created_at as string).getTime() < 60_000,
  ).length;
  if (perMinute >= AI_PER_MINUTE)
    return {
      ok: false,
      message: `AI limit reached — ${AI_PER_MINUTE} request per minute. Try again in a moment.`,
      retryAfterSec: 60,
    };

  if (rows.length >= AI_PER_DAY) {
    const oldest = Math.min(
      ...rows.map((r) => new Date(r.created_at as string).getTime()),
    );
    const retry = Math.max(60, Math.ceil((oldest + 86_400_000 - now) / 1000));
    return {
      ok: false,
      message: `Daily AI limit reached (${AI_PER_DAY}/day on the free plan). Resets in about ${Math.ceil(retry / 3600)}h.`,
      retryAfterSec: retry,
    };
  }
  return { ok: true };
}

/** Record one real model call. Never throws — logging must not break a feature. */
export async function logAiUsage(
  supabase: SupabaseClient,
  userId: string | null,
  action: AiAction,
  model: string | null,
): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from("ai_usage").insert({ user_id: userId, action, model });
  } catch {
    // swallow — a logging failure should never surface to the user
  }
}

/** True when the source string came from a real model (not a heuristic fallback). */
export function isModelSource(source: string | null | undefined): boolean {
  return (
    !!source && (source.startsWith("openai") || source.startsWith("anthropic"))
  );
}
