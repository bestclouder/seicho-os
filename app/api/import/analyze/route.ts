import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { analyzeBrainDump, MAX_IMPORT_CHARS } from "@/lib/ai/import";
import { checkAiLimit, logAiUsage, isModelSource } from "@/lib/ai/rate-limit";

export const dynamic = "force-dynamic";
// Map-reduce over up to ~8 chunks of pasted text needs more than the default
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  if (!access.userId)
    return NextResponse.json({ error: "Sign in to import." }, { status: 401 });
  if (!access.canWrite)
    return NextResponse.json(
      { error: "Your trial has ended — imports are paused." },
      { status: 403 },
    );

  let rawText = "";
  try {
    const body = await request.json();
    rawText = String(body.raw_text ?? "");
  } catch {
    // validated below
  }
  if (rawText.trim().length < 50)
    return NextResponse.json(
      { error: "Paste at least a paragraph to analyze." },
      { status: 400 },
    );
  if (rawText.length > MAX_IMPORT_CHARS)
    return NextResponse.json(
      {
        error: `That's over the ${Math.round(MAX_IMPORT_CHARS / 1000)}k character limit — split it into two imports.`,
      },
      { status: 400 },
    );

  // Import is the most expensive AI action (map-reduce over many chunks), so
  // it goes through the shared per-user limiter like every other AI call.
  const limit = await checkAiLimit(supabase, access);
  if (!limit.ok)
    return NextResponse.json(
      { error: limit.message },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );

  let draft;
  let source;
  try {
    ({ draft, source } = await analyzeBrainDump(rawText));
  } catch (err) {
    console.error("import analyze failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed." },
      { status: 502 },
    );
  }

  const { data: row, error } = await supabase
    .from("imports")
    .insert({ user_id: access.userId, raw_text: rawText, draft })
    .select("id")
    .single();
  if (error || !row)
    return NextResponse.json(
      { error: error?.message ?? "Could not store the draft." },
      { status: 500 },
    );

  if (isModelSource(source))
    await logAiUsage(supabase, access.userId, "import_analyze", source);

  await writeAudit(supabase, {
    entity_type: "import",
    entity_id: row.id,
    action: "analyze_brain_dump",
    payload: {
      source,
      chars: rawText.length,
      projects: draft.projects.length,
      ideas: draft.ideas.length,
      unsorted: draft.unsorted.length,
    },
    user_id: access.userId,
  });

  return NextResponse.json({ import_id: row.id, draft, source });
}
