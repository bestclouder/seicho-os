"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/format";
import { SUMMARY_FIELDS, type ProjectSummary } from "@/lib/types";

const LABELS: Record<(typeof SUMMARY_FIELDS)[number], string> = {
  problem_being_solved: "Problem being solved",
  why_worth_it: "Why it's worth it",
  what_learned: "What you've learned",
  assumptions_changed: "Assumptions that changed",
  current_best_understanding: "Current best understanding",
  highest_leverage_next_step: "Highest-leverage next step",
};

const STALE_MS = 24 * 60 * 60 * 1000;

export function ResumeCard({
  projectId,
  initialSummary,
  hasThoughts,
  readOnly = false,
}: {
  projectId: string;
  initialSummary: ProjectSummary | null;
  hasThoughts: boolean;
  readOnly?: boolean;
}) {
  const [summary, setSummary] = useState<ProjectSummary | null>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const requested = useRef(false);

  const generate = useCallback(
    async (force: boolean) => {
      setLoading(true);
      setNotice(null);
      try {
        const res = await fetch("/api/generate-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId, force }),
        });
        const data = await res.json();
        if (data.summary) setSummary(data.summary as ProjectSummary);
        if (data.error) setNotice(data.error);
        else if (!res.ok) setNotice("Could not refresh understanding");
      } catch {
        setNotice("Could not refresh understanding");
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  // On open: regenerate when missing or stale (>24h) — docs/ARCHITECTURE.md.
  // Read-only viewers (demo, expired trial) just see the stored summary.
  useEffect(() => {
    if (requested.current || readOnly) return;
    requested.current = true;
    const stale =
      !initialSummary ||
      Date.now() - new Date(initialSummary.generated_at).getTime() > STALE_MS;
    if (stale) generate(false);
  }, [initialSummary, generate, readOnly]);

  const empty = !summary && !hasThoughts;

  return (
    <section className="mt-6 rounded-xl border border-moss/25 bg-moss-soft/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-moss">
          {/* hanko-style seal dot — the mark of restored context */}
          <span className="inline-block h-2 w-2 rounded-full bg-clay" />
          Resume here
        </h2>
        {!readOnly && (
          <button
            onClick={() => generate(true)}
            disabled={loading}
            className="rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-moss underline-offset-4 hover:underline disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Refresh understanding"}
          </button>
        )}
      </div>

      {loading && !summary ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="h-2.5 w-40 animate-pulse rounded bg-moss/15" />
              <div className="mt-1.5 h-4 w-full animate-pulse rounded bg-moss/10" />
            </div>
          ))}
          <p className="pt-1 text-xs text-faint">Restoring context…</p>
        </div>
      ) : empty ? (
        <p className="mt-3 text-sm text-faint">
          Not enough context yet — add some thoughts to generate a summary.
        </p>
      ) : summary ? (
        <>
          <dl className="mt-4 space-y-4">
            {SUMMARY_FIELDS.map((f) => {
              const value = summary[f];
              if (!value) return null;
              return (
                <div key={f} className="animate-rise">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">
                    {LABELS[f]}
                  </dt>
                  <dd
                    className={`mt-0.5 text-[15px] leading-relaxed ${
                      f === "highest_leverage_next_step"
                        ? "font-display font-semibold"
                        : ""
                    }`}
                  >
                    {value}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-4 border-t border-moss/15 pt-2.5 font-mono text-[10px] uppercase tracking-wider text-faint/80">
            {summary.problem_being_solved_source ?? "unknown"} · confidence{" "}
            {Math.round(
              (summary.problem_being_solved_confidence ?? 0) * 100,
            )}
            % · generated {timeAgo(summary.generated_at)}
            {notice && <span className="text-clay"> · {notice}, showing last version</span>}
          </p>
        </>
      ) : readOnly ? (
        <p className="mt-3 text-sm text-faint">
          No stored summary for this project yet.
        </p>
      ) : (
        <p className="mt-3 text-sm text-clay">
          {notice ?? "Could not generate a summary."}{" "}
          <button onClick={() => generate(true)} className="underline">
            Try again
          </button>
        </p>
      )}
    </section>
  );
}
