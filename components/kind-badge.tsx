import type { ProjectKind } from "@/lib/types";

// Projects are the default and get no badge; journeys and areas are marked so
// the eye can tell an ongoing pursuit from a finite build at a glance.
const STYLES: Record<Exclude<ProjectKind, "project">, string> = {
  journey: "bg-gold-soft text-gold border-gold/20",
  area: "bg-indigo-soft text-indigo-ai border-indigo-ai/20",
};
const GLYPH: Record<Exclude<ProjectKind, "project">, string> = {
  journey: "↻",
  area: "▤",
};

export function KindBadge({ kind }: { kind?: ProjectKind }) {
  if (!kind || kind === "project") return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STYLES[kind]}`}
    >
      <span aria-hidden>{GLYPH[kind]}</span>
      {kind}
    </span>
  );
}
