"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/app/actions/projects";
import { useToast } from "@/components/toast";
import { statusesForKind, type ProjectKind } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-moss";

const KIND_HINT: Record<ProjectKind, string> = {
  project: "A finite build with a definition of done.",
  journey: "An ongoing pursuit with no finish line.",
  area: "A container that groups projects and journeys.",
};

export type ProjectFormDefaults = {
  idea_id?: string;
  title?: string;
  summary?: string;
  vision?: string;
  why_it_matters?: string;
  success_criteria?: string;
  status?: string;
};

export function NewProjectForm({
  defaults,
  tagsEnabled = false,
  areas = [],
}: {
  defaults?: ProjectFormDefaults;
  tagsEnabled?: boolean;
  areas?: { id: string; title: string }[];
}) {
  const [titleError, setTitleError] = useState<string | null>(null);
  const [kind, setKind] = useState<ProjectKind>("project");
  const [statusVal, setStatusVal] = useState(defaults?.status ?? "Seed");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function chooseKind(k: ProjectKind) {
    setKind(k);
    const valid = statusesForKind(k).filter((s) => s !== "Archived");
    if (!valid.includes(statusVal as (typeof valid)[number]))
      setStatusVal(k === "project" ? "Seed" : "Active");
  }

  function onSubmit(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      setTitleError("Give the project a title.");
      return;
    }
    setTitleError(null);
    startTransition(async () => {
      const result = await createProject(formData);
      // createProject redirects on success; a return value means failure
      if (result && !result.ok) toast(result.error, "error");
    });
  }

  return (
    <form action={onSubmit} className="mt-6 space-y-5">
      {defaults?.idea_id && (
        <input type="hidden" name="idea_id" value={defaults.idea_id} />
      )}

      <Field label="Type">
        <div className="flex gap-1.5">
          {(["project", "journey", "area"] as ProjectKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => chooseKind(k)}
              className={`min-h-9 flex-1 rounded-lg border px-2 py-2 font-mono text-[11px] uppercase tracking-wider capitalize transition-colors ${
                kind === k
                  ? "border-moss bg-moss text-white"
                  : "border-line bg-card text-faint hover:text-ink"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <input type="hidden" name="kind" value={kind} />
        <span className="mt-1 block text-xs text-faint">{KIND_HINT[kind]}</span>
      </Field>

      {kind !== "area" && areas.length > 0 && (
        <Field label="Area (optional)">
          <select name="parent_id" defaultValue="" className={inputCls}>
            <option value="">— none —</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Title" required error={titleError}>
        <input
          name="title"
          defaultValue={defaults?.title}
          className={inputCls}
          placeholder="Algo Trading Framework"
          aria-invalid={!!titleError}
          onChange={() => setTitleError(null)}
        />
      </Field>

      <Field label="One-line summary">
        <input
          name="summary"
          defaultValue={defaults?.summary}
          className={inputCls}
          placeholder="What is this, in one sentence?"
        />
      </Field>

      <Field label="Vision">
        <textarea
          name="vision"
          rows={3}
          defaultValue={defaults?.vision}
          className={inputCls}
          placeholder="What does done-and-working look like?"
        />
      </Field>

      <Field label="Why it matters">
        <textarea
          name="why_it_matters"
          rows={3}
          defaultValue={defaults?.why_it_matters}
          className={inputCls}
          placeholder="Why is this worth your attention over months?"
        />
      </Field>

      <Field label="Success criteria">
        <textarea
          name="success_criteria"
          rows={2}
          defaultValue={defaults?.success_criteria}
          className={inputCls}
          placeholder="How will you know it worked?"
        />
      </Field>

      {tagsEnabled && (
        <Field label="Tags (comma-separated)">
          <input
            name="tags"
            className={inputCls}
            placeholder="trading, learning, health"
          />
        </Field>
      )}

      <Field label="Status">
        <select
          name="status"
          value={statusVal}
          onChange={(e) => setStatusVal(e.target.value)}
          className={inputCls}
        >
          {statusesForKind(kind)
            .filter((s) => s !== "Archived")
            .map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
        </select>
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-moss px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create project"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-11 rounded-lg px-4 py-2.5 text-sm text-faint hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-faint">
        {label}
        {required && <span className="text-clay"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-clay">{error}</span>}
    </label>
  );
}
