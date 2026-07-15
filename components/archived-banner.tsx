"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProjectStatus } from "@/app/actions/projects";
import { useToast } from "@/components/toast";

/** Shown on an archived project so the way back is one tap, not a hunt. */
export function ArchivedBanner({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <div className="border-b border-line bg-clay-soft/70">
      <p className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2 text-sm text-clay">
        <span>Archived — hidden from your dashboard.</span>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setProjectStatus(projectId, "Paused");
              if (result.ok) toast("Unarchived — status set to Paused");
              else toast(result.error, "error");
              router.refresh();
            })
          }
          className="shrink-0 font-medium underline underline-offset-4 disabled:opacity-50"
        >
          {pending ? "Restoring…" : "Unarchive"}
        </button>
      </p>
    </div>
  );
}
