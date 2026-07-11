"use client";

import { useState, useTransition } from "react";
import { updateProjectTags } from "@/app/actions/projects";
import { useToast } from "@/components/toast";

/** Rendered only when the tags column exists (0003_add_tags.sql applied). */
export function TagEditor({
  projectId,
  initialTags,
  readOnly = false,
}: {
  projectId: string;
  initialTags: string[];
  readOnly?: boolean;
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function save(next: string[]) {
    const prev = tags;
    setTags(next);
    startTransition(async () => {
      const result = await updateProjectTags(projectId, next);
      if (!result.ok) {
        setTags(prev);
        toast(result.error, "error");
      }
    });
  }

  function add() {
    const t = draft.trim().toLowerCase();
    setDraft("");
    if (!t || tags.includes(t)) return;
    save([...tags, t]);
  }

  if (readOnly) {
    if (tags.length === 0) return null;
    return (
      <div>
        <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-faint">
          Tags
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex rounded-full bg-moss-soft px-2.5 py-1 font-mono text-[11px] text-moss"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-faint">
        Tags
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-moss-soft px-2.5 py-1 font-mono text-[11px] text-moss"
          >
            {t}
            <button
              aria-label={`Remove tag ${t}`}
              disabled={pending}
              onClick={() => save(tags.filter((x) => x !== t))}
              className="text-moss/60 hover:text-clay"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={tags.length === 0 ? "Add a tag…" : "+"}
          className="min-h-8 w-24 rounded-full border border-line bg-card px-2.5 py-1 font-mono text-[11px] outline-none focus:border-moss"
        />
      </div>
    </div>
  );
}
