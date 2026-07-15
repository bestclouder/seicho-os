"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveProject, setProjectStatus } from "@/app/actions/projects";
import { useToast } from "@/components/toast";
import type { ProjectStatus } from "@/lib/types";

/**
 * "⋯" project actions menu. Archiving is reversible (nothing is deleted), so
 * it asks once and offers Undo in the toast instead of type-to-confirm.
 */
export function ProjectMenu({
  projectId,
  projectTitle,
  status,
}: {
  projectId: string;
  projectTitle: string;
  status: ProjectStatus;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function archive() {
    startTransition(async () => {
      const result = await archiveProject(projectId);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      setConfirming(false);
      toast("Project archived", "info", {
        label: "Undo",
        onClick: async () => {
          const undo = await setProjectStatus(projectId, status);
          if (undo.ok) toast(`Restored — status set to ${status}`);
          else toast(undo.error, "error");
          router.refresh();
        },
      });
      router.push("/dashboard");
    });
  }

  return (
    <span className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Project actions"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-faint transition-colors hover:bg-paper hover:text-ink"
      >
        ⋯
      </button>

      {open && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="animate-rise absolute right-0 top-9 z-50 w-48 rounded-xl border border-line bg-card p-1.5 shadow-lg">
            {status === "Archived" ? (
              <button
                onClick={() => {
                  setOpen(false);
                  startTransition(async () => {
                    const result = await setProjectStatus(projectId, "Paused");
                    if (result.ok) toast("Unarchived — status set to Paused");
                    else toast(result.error, "error");
                    router.refresh();
                  });
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-moss transition-colors hover:bg-moss-soft"
              >
                Unarchive project
              </button>
            ) : (
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirming(true);
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-clay transition-colors hover:bg-clay-soft"
              >
                Archive project
              </button>
            )}
          </div>
        </>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="animate-rise w-full max-w-md rounded-xl border border-line bg-card p-5 text-left shadow-xl">
            <h3 className="font-display text-lg font-semibold">
              Archive &ldquo;{projectTitle}&rdquo;?
            </h3>
            <p className="mt-2 text-sm font-normal text-faint">
              It moves out of your dashboard into the Archived filter. Nothing
              is deleted, and you can unarchive it any time.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="min-h-11 rounded-lg px-4 py-2 text-sm text-faint hover:text-ink"
              >
                Cancel
              </button>
              <button
                disabled={pending}
                onClick={archive}
                className="min-h-11 rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {pending ? "Archiving…" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
