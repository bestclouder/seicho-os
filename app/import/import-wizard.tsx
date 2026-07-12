"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyImport } from "@/app/actions/import";
import { useToast } from "@/components/toast";
import { TagBadge } from "@/components/tag-badge";
import { StatusBadge } from "@/components/status-badge";
import type { ImportDraft } from "@/lib/ai/import";

const MAX_CHARS = 60_000;

type Excluded = {
  projects: Set<number>;
  thoughts: Set<string>; // `${projectIdx}:${thoughtIdx}`
  tasks: Set<string>;
  ideas: Set<number>;
  unsorted: Set<number>;
};

const emptyExcluded = (): Excluded => ({
  projects: new Set(),
  thoughts: new Set(),
  tasks: new Set(),
  ideas: new Set(),
  unsorted: new Set(),
});

export function ImportWizard() {
  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [excluded, setExcluded] = useState<Excluded>(emptyExcluded());
  const [demoted, setDemoted] = useState<Set<number>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
      setDraft(data.draft as ImportDraft);
      setImportId(data.import_id);
      setSource(String(data.source ?? ""));
      setExcluded(emptyExcluded());
      setDemoted(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  function toggle(set: Set<number> | Set<string>, key: never) {
    const next = new Set(set as Set<unknown>);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  function buildReviewedDraft(): ImportDraft {
    if (!draft) return { projects: [], ideas: [], unsorted: [] };
    const keptProjects = draft.projects
      .map((p, pi) => ({ p, pi }))
      .filter(({ pi }) => !excluded.projects.has(pi) && !demoted.has(pi))
      .map(({ p, pi }) => ({
        ...p,
        thoughts: p.thoughts.filter(
          (_, ti) => !excluded.thoughts.has(`${pi}:${ti}`),
        ),
        tasks: p.tasks.filter((_, ti) => !excluded.tasks.has(`${pi}:${ti}`)),
      }));
    const demotedIdeas = draft.projects
      .map((p, pi) => ({ p, pi }))
      .filter(({ pi }) => demoted.has(pi) && !excluded.projects.has(pi))
      .map(({ p }) => ({
        title: p.title,
        body: [p.summary, p.vision].filter(Boolean).join("\n"),
      }));
    return {
      projects: keptProjects,
      ideas: [
        ...draft.ideas.filter((_, i) => !excluded.ideas.has(i)),
        ...demotedIdeas,
      ],
      unsorted: draft.unsorted.filter((_, i) => !excluded.unsorted.has(i)),
    };
  }

  function confirm() {
    if (!importId) return;
    const reviewed = buildReviewedDraft();
    startTransition(async () => {
      const result = await applyImport(importId, reviewed);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast(
        `Imported ${result.projects} project${result.projects === 1 ? "" : "s"}, ${result.thoughts} thought${result.thoughts === 1 ? "" : "s"}, ${result.tasks} task${result.tasks === 1 ? "" : "s"}, ${result.ideas} idea${result.ideas === 1 ? "" : "s"}`,
      );
      router.push("/");
    });
  }

  // ── paste step ─────────────────────────────────────────────────────────
  if (!draft) {
    return (
      <div className="mt-6">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value.slice(0, MAX_CHARS))}
          rows={16}
          placeholder={
            "Paste anything: old goal lists, plans, journal fragments, notes-app exports…\n\nThe more context, the better the organization."
          }
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-moss"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
            {rawText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
          <button
            onClick={analyze}
            disabled={analyzing || rawText.trim().length < 50}
            className="min-h-11 rounded-lg bg-moss px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {analyzing ? "Organizing your notes…" : "✦ Analyze"}
          </button>
        </div>
        {analyzing && (
          <p className="mt-3 text-sm text-faint">
            Reading everything, finding the projects, attaching the thoughts —
            usually 15–30 seconds.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-clay">{error}</p>}
      </div>
    );
  }

  // ── review step ────────────────────────────────────────────────────────
  const reviewed = buildReviewedDraft();

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-moss/25 bg-moss-soft/40 px-4 py-3">
        <p className="text-sm">
          <span className="font-display font-semibold">
            Proposed organization — nothing saved yet.
          </span>{" "}
          Untick anything you don&apos;t want, demote weak projects to ideas,
          then confirm.
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
          {source}
        </p>
      </div>

      <section className="mt-6 space-y-4">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-faint">
          Projects · {reviewed.projects.length} selected
        </h2>
        {draft.projects.map((p, pi) => {
          const off = excluded.projects.has(pi);
          const isDemoted = demoted.has(pi);
          return (
            <div
              key={pi}
              className={`rounded-xl border border-line bg-card p-4 ${off ? "opacity-40" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!off}
                  aria-label={`Include project ${p.title}`}
                  onChange={() =>
                    setExcluded((e) => ({
                      ...e,
                      projects: toggle(e.projects, pi as never) as Set<number>,
                    }))
                  }
                  className="h-4.5 w-4.5 accent-moss"
                />
                <span className="min-w-0 flex-1 truncate font-display text-[16px] font-semibold">
                  {p.title}
                </span>
                <StatusBadge status={p.status} />
                <button
                  onClick={() =>
                    setDemoted((d) => toggle(d, pi as never) as Set<number>)
                  }
                  disabled={off}
                  className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                    isDemoted
                      ? "border-gold bg-gold-soft text-gold"
                      : "border-line text-faint hover:text-ink"
                  }`}
                >
                  {isDemoted ? "→ idea ✓" : "demote to idea"}
                </button>
              </div>

              {!isDemoted && (
                <>
                  {(p.summary || p.vision) && (
                    <p className="mt-2 text-sm text-faint">
                      {p.summary || p.vision}
                    </p>
                  )}

                  {p.thoughts.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                      {p.thoughts.map((t, ti) => {
                        const key = `${pi}:${ti}`;
                        const tOff = excluded.thoughts.has(key);
                        return (
                          <li key={ti} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={!tOff}
                              aria-label="Include thought"
                              onChange={() =>
                                setExcluded((e) => ({
                                  ...e,
                                  thoughts: toggle(
                                    e.thoughts,
                                    key as never,
                                  ) as Set<string>,
                                }))
                              }
                              className="mt-1 h-3.5 w-3.5 accent-moss"
                            />
                            <span
                              className={`min-w-0 flex-1 text-sm ${tOff ? "line-through opacity-50" : ""}`}
                            >
                              {t.body}{" "}
                              <TagBadge tag={t.tag} />
                              {t.date && (
                                <span className="ml-1 font-mono text-[10px] text-faint">
                                  {t.date.slice(0, 10)}
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {p.tasks.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {p.tasks.map((task, ti) => {
                        const key = `${pi}:${ti}`;
                        const tOff = excluded.tasks.has(key);
                        return (
                          <li key={ti} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={!tOff}
                              aria-label="Include task"
                              onChange={() =>
                                setExcluded((e) => ({
                                  ...e,
                                  tasks: toggle(e.tasks, key as never) as Set<string>,
                                }))
                              }
                              className="mt-1 h-3.5 w-3.5 accent-moss"
                            />
                            <span
                              className={`text-sm text-faint ${tOff ? "line-through opacity-50" : ""}`}
                            >
                              ☐ {task}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          );
        })}
        {draft.projects.length === 0 && (
          <p className="text-sm text-faint">No projects detected.</p>
        )}
      </section>

      {(draft.ideas.length > 0 || demoted.size > 0) && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">
            Ideas → inbox
          </h2>
          <ul className="space-y-1.5">
            {draft.ideas.map((idea, i) => {
              const off = excluded.ideas.has(i);
              return (
                <li key={i} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={!off}
                    aria-label={`Include idea ${idea.title}`}
                    onChange={() =>
                      setExcluded((e) => ({
                        ...e,
                        ideas: toggle(e.ideas, i as never) as Set<number>,
                      }))
                    }
                    className="mt-1 h-3.5 w-3.5 accent-moss"
                  />
                  <span className={`text-sm ${off ? "line-through opacity-50" : ""}`}>
                    <span className="font-medium">{idea.title}</span>
                    {idea.body && (
                      <span className="text-faint"> — {idea.body.slice(0, 120)}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {draft.unsorted.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">
            Couldn&apos;t place these — kept as ideas unless unticked
          </h2>
          <ul className="space-y-1.5">
            {draft.unsorted.map((u, i) => {
              const off = excluded.unsorted.has(i);
              return (
                <li key={i} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={!off}
                    aria-label="Keep unsorted item"
                    onChange={() =>
                      setExcluded((e) => ({
                        ...e,
                        unsorted: toggle(e.unsorted, i as never) as Set<number>,
                      }))
                    }
                    className="mt-1 h-3.5 w-3.5 accent-moss"
                  />
                  <span className={`text-sm text-faint ${off ? "line-through opacity-50" : ""}`}>
                    {u.slice(0, 200)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="sticky bottom-0 mt-8 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setDraft(null);
              setImportId(null);
            }}
            className="min-h-11 rounded-lg px-3 py-2 text-sm text-faint hover:text-ink"
          >
            ← Start over
          </button>
          <button
            onClick={confirm}
            disabled={applying}
            className="min-h-11 rounded-lg bg-moss px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {applying
              ? "Importing…"
              : `Import ${reviewed.projects.length} projects, ${reviewed.projects.reduce((n, p) => n + p.thoughts.length, 0)} thoughts, ${reviewed.ideas.length + reviewed.unsorted.length} ideas`}
          </button>
        </div>
      </div>
    </div>
  );
}
