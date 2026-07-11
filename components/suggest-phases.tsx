"use client";

import { useState, useTransition } from "react";
import { applyPhaseDraft } from "@/app/actions/phases";
import { useToast } from "@/components/toast";
import type { Phase, Task } from "@/lib/types";

type Draft = { title: string; tasks: string[] }[];

export function SuggestPhases({
  projectId,
  onApplied,
}: {
  projectId: string;
  onApplied: (phases: Phase[], tasks: Task[]) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [source, setSource] = useState<string>("");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [fetching, setFetching] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  async function fetchDraft() {
    setFetching(true);
    try {
      const res = await fetch("/api/suggest-phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.phases))
        throw new Error(data.error ?? "No suggestion returned");
      setDraft(data.phases as Draft);
      setSource(String(data.source ?? ""));
      setExcluded(new Set());
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not suggest phases",
        "error",
      );
    } finally {
      setFetching(false);
    }
  }

  function confirm() {
    if (!draft) return;
    const chosen = draft.filter((_, i) => !excluded.has(i));
    if (chosen.length === 0) {
      toast("Nothing selected to add.", "error");
      return;
    }
    startTransition(async () => {
      const result = await applyPhaseDraft(projectId, chosen);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      onApplied(result.phases, result.tasks);
      setDraft(null);
      toast(
        `Added ${result.phases.length} phase${result.phases.length === 1 ? "" : "s"} and ${result.tasks.length} task${result.tasks.length === 1 ? "" : "s"}`,
      );
    });
  }

  return (
    <>
      <button
        onClick={fetchDraft}
        disabled={fetching}
        className="min-h-11 rounded-xl border border-indigo-ai/30 px-4 text-sm font-medium text-indigo-ai transition-colors hover:bg-indigo-soft disabled:opacity-50"
      >
        {fetching ? "Drafting…" : "✦ Suggest phases"}
      </button>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="animate-rise flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-line bg-card shadow-xl">
            <div className="border-b border-line p-5 pb-3">
              <h3 className="font-display text-lg font-semibold">
                Suggested plan — nothing saved yet
              </h3>
              <p className="mt-1 text-sm text-faint">
                Untick anything you don&apos;t want, then confirm to write it to
                the project.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-3">
              <ul className="space-y-4">
                {draft.map((phase, i) => (
                  <li key={i}>
                    <label className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={!excluded.has(i)}
                        onChange={(e) => {
                          const next = new Set(excluded);
                          if (e.target.checked) next.delete(i);
                          else next.add(i);
                          setExcluded(next);
                        }}
                        className="h-4.5 w-4.5 accent-moss"
                      />
                      <span className="font-display text-[15px] font-semibold">
                        {phase.title}
                      </span>
                    </label>
                    <ul
                      className={`mt-1.5 ml-7 space-y-1 ${excluded.has(i) ? "opacity-40" : ""}`}
                    >
                      {phase.tasks.map((task, j) => (
                        <li key={j} className="text-sm text-faint">
                          · {task}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line p-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {source}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setDraft(null)}
                  className="min-h-11 rounded-lg px-4 py-2 text-sm text-faint hover:text-ink"
                >
                  Discard
                </button>
                <button
                  onClick={confirm}
                  disabled={pending}
                  className="min-h-11 rounded-lg bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Adding…" : "Confirm & add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
