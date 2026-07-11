import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { momentumScore } from "@/lib/momentum";
import { timeAgo } from "@/lib/format";
import type { Phase, Project, Thought } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { StatusBadge } from "@/components/status-badge";
import { GrowthRing } from "@/components/growth-ring";

export const dynamic = "force-dynamic";

const FILTERS = ["All", "Active", "Exploring", "Paused", "Seed", "Completed"];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = FILTERS.includes(status ?? "") ? status! : "All";
  const supabase = await createClient();

  let projectsQuery = supabase
    .from("projects")
    .select("*")
    .neq("status", "Archived")
    .order("last_updated", { ascending: false });
  if (filter !== "All") projectsQuery = projectsQuery.eq("status", filter);

  const [projectsRes, phasesRes, thoughtsRes] = await Promise.all([
    projectsQuery,
    supabase.from("phases").select("project_id,status"),
    supabase
      .from("thoughts")
      .select("project_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (projectsRes.error) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-display text-lg">Couldn&apos;t reach the database.</p>
          <p className="mt-2 text-sm text-faint">
            {projectsRes.error.message} — check your connection and reload.
          </p>
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
    .map((project) => {
      const projectPhases = phases.filter((p) => p.project_id === project.id);
      const lastThought =
        thoughts.find((t) => t.project_id === project.id) ?? null;
      return {
        project,
        score: momentumScore(
          project,
          projectPhases as Pick<Phase, "status">[],
          lastThought,
        ),
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <AppHeader
        action={
          <Link
            href="/projects/new"
            className="rounded-lg bg-moss px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            New project
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="flex items-center gap-2">
          <form action="/search" className="min-w-0 flex-1">
            <input
              name="q"
              placeholder="Search projects and thoughts…"
              className="min-h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[15px] outline-none focus:border-moss"
            />
          </form>
          <Link
            href="/ideas"
            className="min-h-11 shrink-0 rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-faint transition-colors hover:text-ink"
          >
            Ideas
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "All" ? "/" : `/?status=${f}`}
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                filter === f
                  ? "border-moss bg-moss text-white"
                  : "border-line bg-card text-faint hover:text-ink"
              }`}
            >
              {f}
            </Link>
          ))}
        </div>

        <div className="mb-4 mt-5 flex items-baseline justify-between">
          <h1 className="font-display text-sm font-medium text-faint">
            {scored.length} project{scored.length === 1 ? "" : "s"}, sorted by
            momentum
          </h1>
        </div>

        {scored.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-card px-6 py-16 text-center">
            <p className="font-display text-lg">
              {filter === "All" ? "No projects yet" : `No ${filter} projects`}
            </p>
            <p className="mt-1 text-sm text-faint">
              {filter === "All"
                ? "Create your first one — it takes under a minute."
                : "Try a different filter, or create a project."}
            </p>
            <Link
              href="/projects/new"
              className="mt-5 inline-block rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white"
            >
              Create a project
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
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
                        updated {timeAgo(project.last_updated)} · momentum{" "}
                        {score}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
