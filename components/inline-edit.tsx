"use client";

import { useState, useTransition } from "react";
import { updateProjectField } from "@/app/actions/projects";
import { useToast } from "@/components/toast";

export function InlineEdit({
  projectId,
  field,
  label,
  value,
  multiline = true,
  placeholder = "Tap to add",
}: {
  projectId: string;
  field: string;
  label: string;
  value: string | null;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function save() {
    startTransition(async () => {
      const result = await updateProjectField(projectId, field, draft);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      setEditing(false);
    });
  }

  return (
    <div>
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-faint">
        {label}
      </span>
      {editing ? (
        <div>
          {multiline ? (
            <textarea
              autoFocus
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-lg border border-moss bg-card px-3 py-2 text-[15px] outline-none"
            />
          ) : (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-lg border border-moss bg-card px-3 py-2 text-[15px] outline-none"
            />
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={save}
              disabled={pending}
              className="min-h-9 rounded-md bg-moss px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setDraft(value ?? "");
                setEditing(false);
              }}
              className="min-h-9 rounded-md px-3 py-1.5 text-sm text-faint hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="block w-full rounded-lg px-1 py-0.5 text-left text-[15px] leading-relaxed transition-colors hover:bg-moss-soft/50"
        >
          {value ? (
            <span className="whitespace-pre-wrap">{value}</span>
          ) : (
            <span className="text-faint/70 italic">{placeholder}</span>
          )}
        </button>
      )}
    </div>
  );
}
