import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { journeyVitality, momentumScore, type Vitality } from "@/lib/momentum";
import { timeAgo } from "@/lib/format";
import type { Phase, Project, Thought } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { AccessBanner } from "@/components/access-banner";
import { StatusBadge } from "@/components/status-badge";
import { KindBadge } from "@/components/kind-badge";
import { GrowthRing } from "@/components/growth-ring";

export const dynamic = "force-dynamic";

const FILTERS = [
  "All",
  "Active",
  "Exploring",
  "Paused",
  "Seed",
  "Completed",
  "Archived",
];

type Entry = { project: Project; score: number; vitality: Vitality | null };

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

  // The workspace is for signed-in users; visitors get the landing at /
  if (access.lockdownApplied && !access.userId) redirect("/");

  let projectsQuery = supabase
    .from("projects")
    .select("*")
    .order("last_updated", { ascending: false });
  // "All" means everything still alive; archived rows only show on their own filter
  projectsQuery =
    filter === "All"
      ? projectsQuery.neq("status", "Archived")
      : projectsQuery.eq("status", filter);
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

  const allRows = (projectsRes.data ?? []) as Project[];
  const phases = (phasesRes.data ?? []) as Pick<Phase, "project_id" | "status">[];
  const thoughts = (thoughtsRes.data ?? []) as Pick<
    Thought,
    "project_id" | "created_at"
  >[];

  const tagsEnabled = allRows.some((p) => Array.isArray(p.tags));
  const allTags = tagsEnabled
    ? [...new Set(allRows.flatMap((p) => p.tags ?? []))].sort()
    : [];

  const areas = allRows.filter((p) => p.kind === "area");
  // Areas normally render as group headers, but an archived area must still
  // be findable — the Archived filter lists everything as plain cards.
  const rawEntries =
    filter === "Archived"
      ? allRows
      : allRows.filter((p) => p.kind !== "area");
  const visible = tagFilter
    ? rawEntries.filter((p) => (p.tags ?? []).includes(tagFilter))
    : rawEntries;

  function score(project: Project): Entry {
    const projectPhases = phases.filter((p) => p.project_id === project.id);
    const lastThought =
      thoughts.find((t) => t.project_id === project.id) ?? null;
    return {
      project,
      score: momentumScore(project, projectPhases, lastThought),
      vitality:
        project.kind === "journey"
          ? journeyVitality(project, lastThought)
          : null,
    };
  }

  const entries = visible.map(score).sort((a, b) => b.score - a.score);

  // Group by area only in the default, unfiltered view; a filter flattens.
  const grouped = areas.length > 0 && filter === "All" && !tagFilter;
  const areaIds = new Set(areas.map((a) => a.id));
  const unfiled = entries.filter(
    (e) => !e.project.parent_id || !areaIds.has(e.project.parent_id),
  );

  return (
    <>
      <AppHeader
        action={
          access.canWrite ? (
            <Link
              href="/projects/new"
              className="rounded-lg bg-moss px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              New
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
              href={f === "All" ? "/dashboard" : `/dashboard?status=${f}`}
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
                    ? "/dashboard"
                    : `/dashboard?tag=${encodeURIComponent(t)}`
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

        {entries.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-line bg-card px-6 py-16 text-center">
            <p className="font-display text-lg">
              {filter === "All" && !tagFilter
                ? "Nothing here yet"
                : "Nothing matches"}
            </p>
            <p className="mt-1 text-sm text-faint">
              {filter === "All" && !tagFilter
                ? "Create your first project or journey — it takes under a minute."
                : "Try a different filter."}
            </p>
            <Link
              href={access.canWrite ? "/projects/new" : "/login"}
              className="mt-5 inline-block rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white"
            >
              {access.canWrite ? "Create one" : "Sign up to start"}
            </Link>
          </div>
        ) : grouped ? (
          <div className="mt-6 space-y-8">
            {areas
              .slice()
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((area) => {
                const kids = entries.filter(
                  (e) => e.project.parent_id === area.id,
                );
                if (kids.length === 0) return null;
                const drifting = kids.filter(
                  (e) => e.vitality?.label === "Drifting",
                ).length;
                return (
                  <section key={area.id}>
                    <div className="mb-2.5 flex items-baseline justify-between gap-3">
                      <Link
                        href={`/projects/${area.id}`}
                        className="font-display text-lg font-semibold underline-offset-4 hover:underline"
                      >
                        {area.title}
                      </Link>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
                        {kids.length} item{kids.length === 1 ? "" : "s"}
                        {drifting > 0 && (
                          <span className="text-clay"> · {drifting} drifting</span>
                        )}
                      </span>
                    </div>
                    <ul className="space-y-2.5">
                      {kids.map((e) => (
                        <EntryCard key={e.project.id} entry={e} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            {unfiled.length > 0 && (
              <section>
                <h2 className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-faint">
                  Unfiled
                </h2>
                <ul className="space-y-2.5">
                  {unfiled.map((e) => (
                    <EntryCard key={e.project.id} entry={e} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 mt-5 flex items-baseline justify-between">
              <h1 className="font-display text-sm font-medium text-faint">
                {entries.length} item{entries.length === 1 ? "" : "s"}, sorted by
                momentum
              </h1>
            </div>
            <ul className="space-y-3">
              {entries.map((e) => (
                <EntryCard key={e.project.id} entry={e} />
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const { project, score, vitality } = entry;
  return (
    <li className="animate-rise">
      <Link
        href={`/projects/${project.id}`}
        className="block rounded-xl border border-line bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <GrowthRing score={score} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display truncate text-[17px] font-semibold leading-snug">
                {project.title}
              </h3>
              <span className="flex shrink-0 items-center gap-1.5">
                <KindBadge kind={project.kind} />
                <StatusBadge status={project.status} />
              </span>
            </div>
            {project.summary && (
              <p className="mt-1 line-clamp-2 text-sm text-faint">
                {project.summary}
              </p>
            )}
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-faint/80">
              {vitality ? (
                <span
                  className={
                    vitality.label === "Drifting" ? "text-clay" : "text-gold"
                  }
                >
                  {vitality.label}
                </span>
              ) : (
                <>momentum {score}</>
              )}
              {" · "}
              {vitality ? "last touched " : "updated "}
              {timeAgo(project.last_updated)}
              {(project.tags ?? []).length > 0 && (
                <span className="normal-case text-moss">
                  {" · "}
                  {(project.tags ?? []).map((t) => `#${t}`).join(" ")}
                </span>
              )}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}
