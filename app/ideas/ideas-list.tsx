"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addIdea, dismissIdea, restoreIdea } from "@/app/actions/ideas";
import { useToast } from "@/components/toast";
import { timeAgo } from "@/lib/format";
import type { Idea } from "@/lib/types";

export function IdeasList({ initialIdeas }: { initialIdeas: Idea[] }) {
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const inbox = ideas.filter((i) => i.status === "inbox");
  const rest = ideas.filter((i) => i.status !== "inbox");

  function capture() {
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await addIdea(title, body);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      setIdeas((list) => [result.idea, ...list]);
      setTitle("");
      setBody("");
    });
  }

  return (
    <>
      <div className="mt-6 rounded-xl border border-line bg-card p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Idea title…"
          className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-moss"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Rough notes — what sparked this? (optional)"
          className="mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-moss"
        />
        <button
          onClick={capture}
          disabled={!title.trim() || pending}
          className="mt-2 min-h-11 rounded-lg bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Capture idea"}
        </button>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-faint">
          Inbox · {inbox.length}
        </h2>
        {inbox.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-card px-4 py-8 text-center text-sm text-faint">
            Inbox zero. Capture the next spark above.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {inbox.map((idea) => (
              <li
                key={idea.id}
                className="animate-rise rounded-xl border border-line bg-card px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-semibold">
                      {idea.title}
                    </p>
                    {idea.body && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-faint">
                        {idea.body}
                      </p>
                    )}
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-faint/80">
                      {timeAgo(idea.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Link
                      href={`/projects/new?from_idea=${idea.id}`}
                      className="rounded-lg border border-moss/30 px-3 py-1.5 text-sm font-medium text-moss hover:bg-moss-soft"
                    >
                      Promote
                    </Link>
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          const result = await dismissIdea(idea.id);
                          if (!result.ok) {
                            toast(result.error, "error");
                            return;
                          }
                          setIdeas((list) =>
                            list.map((i) =>
                              i.id === idea.id
                                ? { ...i, status: "dismissed" as const }
                                : i,
                            ),
                          );
                        })
                      }
                      className="rounded-lg px-3 py-1.5 text-sm text-faint hover:text-clay"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {rest.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-faint">
            Handled
          </h2>
          <ul className="space-y-2">
            {rest.map((idea) => (
              <li
                key={idea.id}
                className="flex items-center gap-3 rounded-xl border border-line/70 bg-card/60 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-faint">
                  {idea.title}
                </span>
                {idea.status === "promoted" && idea.promoted_to_project_id ? (
                  <Link
                    href={`/projects/${idea.promoted_to_project_id}`}
                    className="font-mono text-[10px] uppercase tracking-wider text-moss underline-offset-4 hover:underline"
                  >
                    promoted →
                  </Link>
                ) : (
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        const result = await restoreIdea(idea.id);
                        if (!result.ok) {
                          toast(result.error, "error");
                          return;
                        }
                        setIdeas((list) =>
                          list.map((i) =>
                            i.id === idea.id
                              ? { ...i, status: "inbox" as const }
                              : i,
                          ),
                        );
                      })
                    }
                    className="font-mono text-[10px] uppercase tracking-wider text-faint underline-offset-4 hover:underline"
                  >
                    restore
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
