"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

export type ExtensionResult =
  | { ok: true; alreadyPending: boolean }
  | { ok: false; error: string };

/** Expired-trial users ask for more time; reviewed manually (see 0004 migration). */
export async function requestExtension(): Promise<ExtensionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user)
    return { ok: false, error: "Sign in to request an extension." };

  const { error } = await supabase.from("extension_requests").insert({
    user_id: user.id,
    email: user.email ?? "",
  });

  if (error) {
    // unique partial index: one pending request per user
    if (error.code === "23505") return { ok: true, alreadyPending: true };
    return { ok: false, error: error.message };
  }

  await writeAudit(supabase, {
    entity_type: "extension_request",
    entity_id: user.id,
    action: "request_extension",
    user_id: user.id,
  });

  revalidatePath("/dashboard");
  return { ok: true, alreadyPending: false };
}
