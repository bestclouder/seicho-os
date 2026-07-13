import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { aiActionsInLastHour, AI_HOURLY_LIMIT } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import { callAiJson } from "@/lib/ai/provider";
import { classifyHeuristic, HEURISTIC_SOURCE } from "@/lib/ai/heuristic";
import { SECTION_TAGS, type SectionTag } from "@/lib/types";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Classify a personal project note into exactly one of: insight, decision, assumption, task_draft, other.
Return JSON: {"section_tag": "<one of the five>", "confidence": <0..1>}.
insight = something learned/realized. decision = a choice made or direction set. assumption = a belief or hypothesis. task_draft = something that should be done. other = anything else.`;

export async function POST(request: Request) {
  let thoughtId: string | undefined;
  try {
    const body = await request.json();
    thoughtId = body.thought_id;
  } catch {
    // validated below
  }
  if (!thoughtId)
    return NextResponse.json({ error: "thought_id required" }, { status: 400 });

  const supabase = await createClient();

  const access = await getAccess(supabase);
  if (!access.userId)
    return NextResponse.json({ error: "Sign in to classify thoughts." }, { status: 401 });
  if (!access.canWrite)
    return NextResponse.json(
      { error: "Your trial has ended — AI actions are paused." },
      { status: 403 },
    );
  if ((await aiActionsInLastHour(supabase, access.userId)) >= AI_HOURLY_LIMIT)
    return NextResponse.json(
      { error: "AI limit reached — try again in an hour." },
      { status: 429 },
    );

  const { data: thought } = await supabase
    .from("thoughts")
    .select("id,body")
    .eq("id", thoughtId)
    .maybeSingle();

  if (!thought)
    return NextResponse.json({ error: "Thought not found" }, { status: 404 });

  let tag: SectionTag;
  let confidence: number;
  let source: string;

  try {
    const ai = await callAiJson(SYSTEM_PROMPT, thought.body);
    if (ai && SECTION_TAGS.includes(ai.json.section_tag as SectionTag)) {
      tag = ai.json.section_tag as SectionTag;
      confidence = Math.max(0, Math.min(1, Number(ai.json.confidence ?? 0.5)));
      source = ai.source;
    } else {
      const h = classifyHeuristic(thought.body);
      tag = h.section_tag;
      confidence = h.confidence;
      source = HEURISTIC_SOURCE;
    }
  } catch (err) {
    console.error("classify-thought AI call failed:", err);
    const h = classifyHeuristic(thought.body);
    tag = h.section_tag;
    confidence = h.confidence;
    source = HEURISTIC_SOURCE;
  }

  const { error } = await supabase
    .from("thoughts")
    .update({
      section_tag: tag,
      section_tag_source: source,
      section_tag_confidence: confidence,
      section_tag_review_status: "unreviewed",
    })
    .eq("id", thoughtId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    entity_type: "thought",
    entity_id: thoughtId,
    action: "classify_thought",
    payload: { section_tag: tag, confidence, source },
    user_id: access.userId,
  });

  return NextResponse.json({ section_tag: tag, confidence, source });
}
