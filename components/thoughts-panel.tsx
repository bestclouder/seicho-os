"use client";

import { useRef, useState, useTransition } from "react";
import { addThought, getOlderThoughts } from "@/app/actions/thoughts";
import { useToast } from "@/components/toast";
import { TagBadge } from "@/components/tag-badge";
import { timeAgo } from "@/lib/format";
import type { SectionTag, Thought } from "@/lib/types";

export function ThoughtsPanel({
  projectId,
  initialThoughts,
  initialHasMore = false,
  readOnly = false,
}: {
  projectId: string;
  initialThoughts: Thought[];
  initialHasMore?: boolean;
  readOnly?: boolean;
}) {
  const [thoughts, setThoughts] = useState<Thought[]>(initialThoughts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  async function loadMore() {
    const oldest = thoughts[thoughts.length - 1];
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    const result = await getOlderThoughts(projectId, oldest.created_at);
    setLoadingMore(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setThoughts((list) => [...list, ...result.thoughts]);
    setHasMore(result.hasMore);
  }

  function classify(thoughtId: string) {
    // Fire-and-forget AI tagging; the UI patches in the badge when it lands.
    fetch("/api/classify-thought", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thought_id: thoughtId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { section_tag?: SectionTag } | null) => {
        if (!data?.section_tag) return;
        setThoughts((list) =>
          list.map((t) =>
            t.id === thoughtId ? { ...t, section_tag: data.section_tag! } : t,
          ),
        );
      })
      .catch(() => {
        // Tagging is an enhancement — a failure never blocks capture.
      });
  }

  function send() {
    const body = draft.trim();
    if (!body || pending) return;
    startTransition(async () => {
      const result = await addThought(projectId, body);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      setThoughts((list) => [result.thought, ...list]);
      setDraft("");
      inputRef.current?.focus();
      classify(result.thought.id);
    });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-faint">
        Thoughts
      </h2>

      {thoughts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-card px-4 py-8 text-center text-sm text-faint">
          No thoughts yet. What&apos;s on your mind about this project?
        </p>
      ) : (
        <ul className="space-y-2.5">
          {thoughts.map((t) => (
            <li
              key={t.id}
              className="animate-rise rounded-xl border border-line bg-card px-4 py-3"
            >
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {t.body}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {t.section_tag && <TagBadge tag={t.section_tag} />}
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint/80">
                  {timeAgo(t.created_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-3 w-full rounded-xl border border-line bg-card py-2.5 text-sm text-faint transition-colors hover:text-ink disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load older thoughts"}
        </button>
      )}

      {/* Sticky capture bar — the five-second promise */}
      {readOnly ? null : (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Capture a thought…"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] outline-none focus:border-moss"
          />
          <button
            onClick={send}
            disabled={pending || !draft.trim()}
            className="min-h-11 shrink-0 rounded-xl bg-moss px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {pending ? "…" : "Send"}
          </button>
        </div>
      </div>
      )}
    </section>
  );
}
