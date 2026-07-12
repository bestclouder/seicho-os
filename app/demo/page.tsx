import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { momentumScore } from "@/lib/momentum";
import { timeAgo } from "@/lib/format";
import type { Phase, Project, Thought } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { StatusBadge } from "@/components/status-badge";
import { GrowthRing } from "@/components/growth-ring";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const supabase = await createClient();

  const [projectsRes, phasesRes, thoughtsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .is("user_id", null)
      .neq("status", "Archived")
      .order("last_updated", { ascending: false }),
    supabase.from("phases").select("project_id,status").is("user_id", null),
    supabase
      .from("thoughts")
      .select("project_id,created_at")
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (projectsRes.error) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-display text-lg">Couldn&apos;t load the demo.</p>
          <p className="mt-2 text-sm text-faint">{projectsRes.error.message}</p>
        </main>
      </>
    );
  }

  const projects = (projectsRes.data ?? []) as Project[];
  const phases = (phasesRes.data ?? []) as Pick<Phase, "project_id" | "status">[];
  const thoughts = (thoughtsRes.data ?? []) as Pick<
    Thought,
    "project_id" | "created_at"
  >[];

  const scored = projects
    .map((project) => ({
      project,
      score: momentumScore(
        project,
        phases.filter((p) => p.project_id === project.id),
        thoughts.find((t) => t.project_id === project.id) ?? null,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <AppHeader
        action={
          <Link
            href="/login"
            className="rounded-lg bg-moss px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Start Building
          </Link>
        }
      />
      <div className="border-b border-line bg-indigo-soft/60">
        <p className="mx-auto max-w-2xl px-4 py-2 text-sm text-indigo-ai">
          A read-only example workspace — open any project to see the resume
          card in action.
        </p>
      </div>
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <h1 className="font-display text-sm font-medium text-faint">
          {scored.length} demo projects, sorted by momentum
        </h1>
        <ul className="mt-4 space-y-3">
          {scored.map(({ project, score }) => (
            <li key={project.id} className="animate-rise">
              <Link
                href={`/projects/${project.id}`}
                className="block rounded-xl border border-line bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <GrowthRing score={score} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display truncate text-[17px] font-semibold leading-snug">
                        {project.title}
                      </h2>
                      <StatusBadge status={project.status} />
                    </div>
                    {project.summary && (
                      <p className="mt-1 line-clamp-2 text-sm text-faint">
                        {project.summary}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-faint/80">
                      updated {timeAgo(project.last_updated)} · momentum {score}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
