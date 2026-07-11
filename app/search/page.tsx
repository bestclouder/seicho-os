import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Project, Thought } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { StatusBadge } from "@/components/status-badge";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

function escapeLike(q: string) {
  return q.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[(),."']/g, " ");
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);

  let projects: Project[] = [];
  let thoughts: (Thought & { projects: { title: string } | null })[] = [];
  let error: string | null = null;

  if (query) {
    const supabase = await createClient();
    const like = `%${escapeLike(query)}%`;
    const [projectsRes, thoughtsRes] = await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .or(`title.ilike.${like},summary.ilike.${like},vision.ilike.${like}`)
        .limit(25),
      supabase
        .from("thoughts")
        .select("*, projects(title)")
        .ilike("body", like)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    error = projectsRes.error?.message ?? thoughtsRes.error?.message ?? null;
    projects = (projectsRes.data ?? []) as Project[];
    thoughts = (thoughtsRes.data ?? []) as typeof thoughts;
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <form action="/search" className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Search projects and thoughts…"
            className="min-h-11 flex-1 rounded-xl border border-line bg-card px-3.5 text-[15px] outline-none focus:border-moss"
          />
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-moss px-4 text-sm font-medium text-white"
          >
            Search
          </button>
        </form>

        {error && (
          <p className="mt-6 text-sm text-clay">Search failed: {error}</p>
        )}

        {query && !error && (
          <>
            <section className="mt-8">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-faint">
                Projects · {projects.length}
              </h2>
              {projects.length === 0 ? (
                <p className="text-sm text-faint">No projects match.</p>
              ) : (
                <ul className="space-y-2">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 hover:shadow-md"
                      >
                        <span className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">
                          {p.title}
                        </span>
                        <StatusBadge status={p.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-8">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-faint">
                Thoughts · {thoughts.length}
              </h2>
              {thoughts.length === 0 ? (
                <p className="text-sm text-faint">No thoughts match.</p>
              ) : (
                <ul className="space-y-2">
                  {thoughts.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/projects/${t.project_id}`}
                        className="block rounded-xl border border-line bg-card px-4 py-3 hover:shadow-md"
                      >
                        <p className="line-clamp-2 text-sm">{t.body}</p>
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-faint/80">
                          {t.projects?.title ?? "Unknown project"} ·{" "}
                          {timeAgo(t.created_at)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
