"use client";

import { useTransition } from "react";
import { setProjectStatus } from "@/app/actions/projects";
import { useToast } from "@/components/toast";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/types";

export function StatusPicker({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <select
      value={status}
      disabled={pending}
      aria-label="Project status"
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
      {PROJECT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
