"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";

export type SeedResult = { ok: true; created: number } | { ok: false; error: string };

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Seeds a signed-in user's empty workspace with a few labelled placeholders —
 * one Area, one Journey, one Project — so a brand-new account has something to
 * react to instead of a blank page. Everything is theirs to edit or delete.
 * No-ops if they already have any projects, so it can't clobber real work.
 */
export async function seedStarterWorkspace(): Promise<SeedResult> {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  if (!access.userId) return { ok: false, error: "Sign in first." };
  if (!access.canWrite)
    return { ok: false, error: "Your trial has ended — creating is paused." };

  // Only seed a genuinely empty workspace.
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", access.userId);
  if ((count ?? 0) > 0)
    return { ok: false, error: "You already have projects — nothing to seed." };

  const uid = access.userId;
  const base = { user_id: uid, start_date: today() };

  // 1. An Area to group life under.
  const { data: area, error: areaErr } = await supabase
    .from("projects")
    .insert({
      ...base,
      title: "My Life",
      kind: "area",
      status: "Active",
      summary: "An area groups related work. Rename it, or delete it once you have your own.",
    })
    .select("id")
    .single();
  if (areaErr || !area)
    return { ok: false, error: areaErr?.message ?? "Could not create starter." };

  // 2 + 3. A Journey (ongoing practice) and a Project (has an end state), both
  // filed under the area, so the three object types are visible side by side.
  const { data: rows, error: rowsErr } = await supabase
    .from("projects")
    .insert([
      {
        ...base,
        title: "Stay healthy and energetic",
        kind: "journey",
        status: "Active",
        parent_id: area.id,
        summary:
          "A journey is ongoing — no finish line. Example placeholder: make it yours or delete it.",
        why_it_matters:
          "Energy is the input to everything else. Worth protecting on purpose.",
      },
      {
        ...base,
        title: "Ship one small thing I'm proud of",
        kind: "project",
        status: "Exploring",
        parent_id: area.id,
        summary:
          "A project has a finish line. Example placeholder — edit the details below or delete it.",
        vision: "A small, finished, shipped thing — however modest — out in the world.",
        why_it_matters:
          "Finishing builds momentum. One shipped thing beats ten half-started ones.",
        success_criteria: "It exists, it's shared, and I learned something making it.",
      },
    ])
    .select("id,kind");
  if (rowsErr)
    return { ok: false, error: rowsErr.message };

  const project = (rows ?? []).find((r) => r.kind === "project");

  // A first thought on the project models the capture habit the app is built around.
  if (project) {
    await supabase.from("thoughts").insert({
      user_id: uid,
      project_id: project.id,
      body: "This is a starter note. Jot what you learn, decide, or wonder here — the AI turns your notes into a living summary of the project.",
    });
  }

  // One idea in the inbox shows where loose sparks go before they're projects.
  await supabase.from("ideas").insert({
    user_id: uid,
    title: "Something I keep meaning to start",
    body: "Ideas live here until you're ready to promote one into a project. Replace this with a real one.",
    status: "inbox",
  });

  await writeAudit(supabase, {
    entity_type: "project",
    entity_id: area.id,
    action: "seed_starter_workspace",
    payload: { created: 3 },
    user_id: uid,
  });

  revalidatePath("/dashboard");
  revalidatePath("/ideas");
  return { ok: true, created: 3 };
}
