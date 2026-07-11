import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Phase,
  Project,
  ProjectSummary,
  Task,
  Thought,
} from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { AppHeader } from "@/components/app-header";
import { InlineEdit } from "@/components/inline-edit";
import { StatusPicker } from "@/components/status-picker";
import { ArchiveButton } from "@/components/archive-button";
import { PhasesPanel } from "@/components/phases-panel";
import { ThoughtsPanel } from "@/components/thoughts-panel";
import { ResumeCard } from "@/components/resume-card";
import {
  RelationshipsPanel,
  type LinkedProject,
} from "@/components/relationships-panel";
import type { ProjectRelationship } from "@/lib/types";

export const dynamic = "force-dynamic";

const FIELDS: { field: string; label: string; placeholder: string }[] = [
  {
    field: "vision",
    label: "Vision",
    placeholder: "What does done-and-working look like?",
  },
  {
    field: "why_it_matters",
    label: "Why it matters",
    placeholder: "Why is this worth months of your attention?",
  },
  {
    field: "success_criteria",
    label: "Success criteria",
    placeholder: "How will you know it worked?",
  },
  {
    field: "technical_notes",
    label: "Technical notes",
    placeholder: "Stack, constraints, gotchas.",
  },
];

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data, error },
    phasesRes,
    tasksRes,
    thoughtsRes,
    summaryRes,
    relationshipsRes,
    otherProjectsRes,
  ] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("phases")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("tasks")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("thoughts")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(51),
      supabase
        .from("project_summaries")
        .select("*")
        .eq("project_id", id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("project_relationships")
        .select("*")
        .or(`source_project_id.eq.${id},target_project_id.eq.${id}`),
      supabase
        .from("projects")
        .select("id,title")
        .neq("status", "Archived")
        .neq("id", id)
        .order("title"),
    ]);

  if (error) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-display text-lg">Couldn&apos;t load this project.</p>
          <p className="mt-2 text-sm text-faint">{error.message}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-moss underline">
            Back to dashboard
          </Link>
        </main>
      </>
    );
  }
  if (!data) notFound();

  const project = data as Project;
  const allThoughts = (thoughtsRes.data ?? []) as Thought[];
  const thoughts = allThoughts.slice(0, 50);
  const hasMoreThoughts = allThoughts.length > 50;

  const otherProjects = (otherProjectsRes.data ?? []) as {
    id: string;
    title: string;
  }[];
  const titleById = new Map(otherProjects.map((p) => [p.id, p.title]));
  const links: LinkedProject[] = (
    (relationshipsRes.data ?? []) as ProjectRelationship[]
  ).map((r) => {
    const direction = r.source_project_id === project.id ? "out" : "in";
    const otherId =
      direction === "out" ? r.target_project_id : r.source_project_id;
    return {
      relationship: r,
      otherId,
      otherTitle: titleById.get(otherId) ?? "Archived project",
      direction,
    };
  });

  return (
    <>
      <AppHeader
        action={<StatusPicker projectId={project.id} status={project.status} />}
      />
      <main className="mx-auto max-w-2xl px-4 pb-40 pt-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
          updated {timeAgo(project.last_updated)}
          {project.start_date && ` · started ${project.start_date}`}
        </p>
        <div className="mt-1">
          <InlineEdit
            projectId={project.id}
            field="title"
            label=""
            value={project.title}
            multiline={false}
          />
        </div>
        <div className="mt-2">
          <InlineEdit
            projectId={project.id}
            field="summary"
            label="Summary"
            value={project.summary}
            multiline={false}
            placeholder="One sentence: what is this?"
          />
        </div>

        <ResumeCard
          projectId={project.id}
          initialSummary={(summaryRes.data ?? null) as ProjectSummary | null}
          hasThoughts={thoughts.length > 0}
        />

        <section className="mt-8 space-y-6 rounded-xl border border-line bg-card p-5">
          {FIELDS.map((f) => (
            <InlineEdit
              key={f.field}
              projectId={project.id}
              field={f.field}
              label={f.label}
              value={project[f.field as keyof Project] as string | null}
              placeholder={f.placeholder}
            />
          ))}
        </section>

        <PhasesPanel
          projectId={project.id}
          initialPhases={(phasesRes.data ?? []) as Phase[]}
          initialTasks={(tasksRes.data ?? []) as Task[]}
        />

        <RelationshipsPanel
          projectId={project.id}
          initialLinks={links}
          otherProjects={otherProjects}
        />

        <ThoughtsPanel
          projectId={project.id}
          initialThoughts={thoughts}
          initialHasMore={hasMoreThoughts}
        />

        <div className="mt-10 border-t border-line pt-6">
          <ArchiveButton projectId={project.id} projectTitle={project.title} />
        </div>
      </main>
    </>
  );
}
