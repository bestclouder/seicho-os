import { callAiJson } from "./provider";
import { PROJECT_STATUSES, SECTION_TAGS, type ProjectStatus, type SectionTag } from "@/lib/types";

/** Draft shapes shared by the analyze route, review UI, and apply action. */
export type DraftThought = {
  body: string;
  tag: SectionTag;
  date: string | null; // ISO date if the source text carried one
};
export type DraftProject = {
  title: string;
  summary: string;
  vision: string;
  why_it_matters: string;
  success_criteria: string;
  status: ProjectStatus;
  confidence: number;
  thoughts: DraftThought[];
  tasks: string[];
};
export type DraftIdea = { title: string; body: string };
export type ImportDraft = {
  projects: DraftProject[];
  ideas: DraftIdea[];
  unsorted: string[];
};

export const MAX_IMPORT_CHARS = 60_000;
const CHUNK_TARGET = 8_000;

/** Split pasted text on natural boundaries into ~CHUNK_TARGET-char chunks. */
export function segmentText(raw: string): string[] {
  const blocks = raw.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  for (const block of blocks) {
    if (current && current.length + block.length > CHUNK_TARGET) {
      chunks.push(current);
      current = block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }
    // pathological single block longer than the target: hard-split
    while (current.length > CHUNK_TARGET * 1.5) {
      chunks.push(current.slice(0, CHUNK_TARGET));
      current = current.slice(CHUNK_TARGET);
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

const DRAFT_SHAPE = `{
  "projects": [{
    "title": string,
    "summary": string (one sentence),
    "vision": string,
    "why_it_matters": string,
    "success_criteria": string,
    "status": one of "Seed"|"Exploring"|"Active"|"Paused"|"Completed",
    "confidence": number 0..1,
    "thoughts": [{"body": string, "tag": "insight"|"decision"|"assumption"|"task_draft"|"other", "date": "YYYY-MM-DD" or null}],
    "tasks": [string]
  }],
  "ideas": [{"title": string, "body": string}],
  "unsorted": [string]
}`;

const EXTRACT_SYSTEM = `You organize a person's messy pasted notes into their personal project OS. From the given text extract candidate PROJECTS (ongoing endeavors with a goal), their THOUGHTS (insights, decisions, assumptions found in the text — keep the author's wording, include a date only if the text shows one), their TASKS (concrete single actions), plus standalone IDEAS (sparks not tied to an ongoing endeavor).
Return JSON exactly shaped as:
${DRAFT_SHAPE}
Rules: stay faithful to the text, never invent specifics. Leave charter fields as "" when the text doesn't support them. Anything meaningful you cannot place goes in "unsorted" verbatim. Status: guess from context (finished → Completed, clearly on hold → Paused, actively worked → Active, being researched → Exploring, barely started → Seed).`;

const MERGE_SYSTEM = `You consolidate project candidates extracted from chunks of one person's notes. Merge candidates that are the same real-world endeavor (combine their thoughts/tasks, keep the best charter wording, dedupe near-identical thoughts). Demote anything too thin to be a real project (no goal, single mention) to "ideas". Keep every thought/task/idea/unsorted item from the input somewhere — never drop content.
Return JSON exactly shaped as:
${DRAFT_SHAPE}`;

function cleanTag(tag: unknown): SectionTag {
  return SECTION_TAGS.includes(tag as SectionTag) ? (tag as SectionTag) : "other";
}
function cleanStatus(status: unknown): ProjectStatus {
  return PROJECT_STATUSES.includes(status as ProjectStatus) &&
    status !== "Archived"
    ? (status as ProjectStatus)
    : "Seed";
}
function cleanDate(date: unknown): string | null {
  if (typeof date !== "string") return null;
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return null;
  const d = new Date(parsed);
  if (d.getTime() > Date.now() || d.getFullYear() < 1990) return null;
  return d.toISOString();
}

export function sanitizeDraft(raw: unknown): ImportDraft {
  const source = (raw ?? {}) as Record<string, unknown>;
  const projects = (Array.isArray(source.projects) ? source.projects : [])
    .slice(0, 40)
    .map((p: Record<string, unknown>) => ({
      title: String(p.title ?? "Untitled project").slice(0, 200),
      summary: String(p.summary ?? "").slice(0, 300),
      vision: String(p.vision ?? "").slice(0, 2000),
      why_it_matters: String(p.why_it_matters ?? "").slice(0, 2000),
      success_criteria: String(p.success_criteria ?? "").slice(0, 2000),
      status: cleanStatus(p.status),
      confidence: Math.max(0, Math.min(1, Number(p.confidence ?? 0.5))),
      thoughts: (Array.isArray(p.thoughts) ? p.thoughts : [])
        .slice(0, 100)
        .map((t: Record<string, unknown>) => ({
          body: String(t.body ?? "").slice(0, 4000),
          tag: cleanTag(t.tag),
          date: cleanDate(t.date),
        }))
        .filter((t) => t.body.trim()),
      tasks: (Array.isArray(p.tasks) ? p.tasks : [])
        .slice(0, 50)
        .map((t: unknown) => String(t).slice(0, 300))
        .filter((t) => t.trim()),
    }))
    .filter((p) => p.title.trim());

  const ideas = (Array.isArray(source.ideas) ? source.ideas : [])
    .slice(0, 60)
    .map((i: Record<string, unknown>) => ({
      title: String(i.title ?? "").slice(0, 200),
      body: String(i.body ?? "").slice(0, 2000),
    }))
    .filter((i) => i.title.trim());

  const unsorted = (Array.isArray(source.unsorted) ? source.unsorted : [])
    .slice(0, 100)
    .map((u: unknown) => String(u).slice(0, 2000))
    .filter((u) => u.trim());

  return { projects, ideas, unsorted };
}

/**
 * Map-reduce over the pasted text. Throws if no AI provider is configured —
 * the route surfaces that as a clear error instead of a junk heuristic result.
 */
export async function analyzeBrainDump(
  raw: string,
): Promise<{ draft: ImportDraft; source: string }> {
  const chunks = segmentText(raw.slice(0, MAX_IMPORT_CHARS));

  const extractions = await Promise.all(
    chunks.map((chunk) => callAiJson(EXTRACT_SYSTEM, chunk)),
  );
  if (extractions.some((e) => e === null)) {
    throw new Error(
      "No AI provider configured — set OPENAI_API_KEY (or ANTHROPIC_API_KEY).",
    );
  }

  const parts = extractions.map((e) => sanitizeDraft(e!.json));
  const source = extractions[0]!.source;

  if (parts.length === 1) return { draft: parts[0], source };

  const merged = await callAiJson(
    MERGE_SYSTEM,
    JSON.stringify({ candidates: parts }),
  );
  if (!merged) throw new Error("AI provider unavailable during merge.");
  return { draft: sanitizeDraft(merged.json), source: merged.source };
}
