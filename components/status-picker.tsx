"use client";

import { useTransition } from "react";
import { setProjectStatus } from "@/app/actions/projects";
import { useToast } from "@/components/toast";
import { statusesForKind, type ProjectKind, type ProjectStatus } from "@/lib/types";

export function StatusPicker({
  projectId,
  status,
  kind = "project",
}: {
  projectId: string;
  status: ProjectStatus;
  kind?: ProjectKind;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <select
      value={status}
      disabled={pending}
      aria-label="Status"
      onChange={(e) => {
        const next = e.target.value as ProjectStatus;
        startTransition(async () => {
          const result = await setProjectStatus(projectId, next);
          if (!result.ok) toast(result.error, "error");
          else toast(`Status set to ${next}`);
        });
      }}
      className="min-h-9 rounded-full border border-line bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink outline-none focus:border-moss disabled:opacity-50"
    >
      {statusesForKind(kind).map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
