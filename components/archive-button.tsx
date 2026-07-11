"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveProject } from "@/app/actions/projects";
import { useToast } from "@/components/toast";

export function ArchiveButton({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-lg border border-clay/30 px-4 py-2 text-sm text-clay transition-colors hover:bg-clay-soft"
      >
        Archive project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="animate-rise w-full max-w-md rounded-xl border border-line bg-card p-5 shadow-xl">
            <h3 className="font-display text-lg font-semibold">
              Archive &ldquo;{projectTitle}&rdquo;?
            </h3>
            <p className="mt-2 text-sm text-faint">
              Archiving hides the project from your dashboard. Nothing is
              deleted — thoughts, phases, and summaries are kept. Type the
              project title to confirm.
            </p>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={projectTitle}
              className="mt-4 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-clay"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setTyped("");
                }}
                className="min-h-11 rounded-lg px-4 py-2 text-sm text-faint hover:text-ink"
              >
                Cancel
              </button>
              <button
                disabled={typed.trim() !== projectTitle || pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await archiveProject(projectId);
                    if (!result.ok) {
                      toast(result.error, "error");
                      return;
                    }
                    toast("Project archived");
                    router.push("/");
                  })
                }
                className="min-h-11 rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {pending ? "Archiving…" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
