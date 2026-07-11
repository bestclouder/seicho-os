import type { ProjectStatus } from "@/lib/types";

const STYLES: Record<ProjectStatus, string> = {
  Seed: "bg-paper text-faint border-line",
  Exploring: "bg-indigo-soft text-indigo-ai border-indigo-ai/20",
  Active: "bg-moss-soft text-moss border-moss/20",
  Paused: "bg-clay-soft text-clay border-clay/20",
  Completed: "bg-ink text-paper border-ink",
  Archived: "bg-paper text-faint/60 border-line",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider ${STYLES[status] ?? STYLES.Seed}`}
    >
      {status}
    </span>
  );
}
