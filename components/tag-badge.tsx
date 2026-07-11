import type { SectionTag } from "@/lib/types";

const STYLES: Record<SectionTag, string> = {
  insight: "bg-moss-soft text-moss",
  decision: "bg-indigo-soft text-indigo-ai",
  assumption: "bg-gold-soft text-gold",
  task_draft: "bg-clay-soft text-clay",
  other: "bg-paper text-faint",
};

export function TagBadge({ tag }: { tag: SectionTag }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STYLES[tag] ?? STYLES.other}`}
    >
      {tag.replace("_", " ")}
    </span>
  );
}
