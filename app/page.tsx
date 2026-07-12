import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { momentumScore } from "@/lib/momentum";
import { timeAgo } from "@/lib/format";
import type { Phase, Project, Thought } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { AccessBanner } from "@/components/access-banner";
import { StatusBadge } from "@/components/status-badge";
import { GrowthRing } from "@/components/growth-ring";

export const dynamic = "force-dynamic";

const FILTERS = ["All", "Active", "Exploring", "Paused", "Seed", "Completed"];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tag?: string }>;
}) {
  const { status, tag } = await searchParams;
  const filter = FILTERS.includes(status ?? "") ? status! : "All";
  const tagFilter = (tag ?? "").trim().toLowerCase() || null;
  const supabase = await createClient();
  const access = await getAccess(supabase);

  let projectsQuery = supabase
    .from("projects")
    .select("*")
    .neq("status", "Archived")
    .order("last_updated", { ascending: false });
  if (filter !== "All") projectsQuery = projectsQuery.eq("status", filter);
  // Signed-in users see their own workspace; the shared demo rows are for
  // anonymous visitors (RLS already scopes what each caller can read at all)
  if (access.lockdownApplied && access.userId)
    projectsQuery = projectsQuery.eq("user_id", access.userId);

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

  // Tags exist only once 0003_add_tags.sql is applied; select("*") makes
  // detection free — the field is simply absent before then.
  const tagsEnabled = projects.some((p) => Array.isArray(p.tags));
  const allTags = tagsEnabled
    ? [...new Set(projects.flatMap((p) => p.tags ?? []))].sort()
    : [];
  const visible = tagFilter
    ? projects.filter((p) => (p.tags ?? []).includes(tagFilter))
    : projects;

  const scored = visible
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
          access.canWrite ? (
            <Link
              href="/projects/new"
              className="rounded-lg bg-moss px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              New project
            </Link>
          ) : !access.userId ? (
            <Link
              href="/login"
              className="rounded-lg bg-moss px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Sign up
            </Link>
          ) : undefined
        }
      />
      <AccessBanner access={access} />
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
          {access.canWrite && (
            <Link
              href="/import"
              className="min-h-11 shrink-0 rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-faint transition-colors hover:text-ink"
            >
              Import
            </Link>
          )}
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

        {allTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allTags.map((t) => (
              <Link
                key={t}
                href={
                  tagFilter === t
                    ? filter === "All"
                      ? "/"
                      : `/?status=${filter}`
                    : `/?${filter === "All" ? "" : `status=${filter}&`}tag=${encodeURIComponent(t)}`
                }
                className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                  tagFilter === t
                    ? "border-indigo-ai bg-indigo-ai text-white"
                    : "border-line bg-card text-faint hover:text-ink"
                }`}
              >
                #{t}
              </Link>
            ))}
          </div>
        )}

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
              href={access.canWrite ? "/projects/new" : "/login"}
              className="mt-5 inline-block rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white"
            >
              {access.canWrite ? "Create a project" : "Sign up to create projects"}
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
                        {(project.tags ?? []).length > 0 && (
                          <span className="normal-case text-moss">
                            {" "}
                            · {(project.tags ?? []).map((t) => `#${t}`).join(" ")}
                          </span>
                        )}
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
