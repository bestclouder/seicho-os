import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { timeAgo } from "@/lib/format";
import { AppHeader } from "@/components/app-header";
import { AI_PER_DAY, AI_PER_MINUTE } from "@/lib/ai/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "bestclouder@gmail.com";

const ACTION_LABELS: Record<string, string> = {
  generate_summary: "Understanding summary",
  classify_thought: "Thought classify",
  suggest_phases: "Phase suggestions",
  import_analyze: "Brain-dump import",
  draft_idea: "Idea → project draft",
};

type UsageRow = { user_id: string; action: string; model: string | null; created_at: string };
type ProfileRow = { id: string; email: string; plan: string };

export default async function AdminUsagePage() {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  // Owner-only. RLS also blocks the data, but hide the page entirely.
  if ((access.email ?? "").toLowerCase() !== ADMIN_EMAIL) notFound();

  const [usageRes, profilesRes] = await Promise.all([
    supabase
      .from("ai_usage")
      .select("user_id,action,model,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("profiles").select("id,email,plan"),
  ]);

  const usage = (usageRes.data ?? []) as UsageRow[];
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const now = Date.now();
  const dayAgo = now - 86_400_000;
  const weekAgo = now - 7 * 86_400_000;
  const at = (r: UsageRow) => new Date(r.created_at).getTime();

  const today = usage.filter((r) => at(r) >= dayAgo);
  const week = usage.filter((r) => at(r) >= weekAgo);

  // Per-action totals (all time in the fetched window)
  const byAction = new Map<string, number>();
  for (const r of usage) byAction.set(r.action, (byAction.get(r.action) ?? 0) + 1);
  const actionRows = [...byAction.entries()].sort((a, b) => b[1] - a[1]);

  // Per-user rollup
  type UserAgg = {
    id: string;
    email: string;
    plan: string;
    total: number;
    today: number;
    week: number;
    last: string;
    topAction: string;
  };
  const byUser = new Map<string, UsageRow[]>();
  for (const r of usage) {
    const arr = byUser.get(r.user_id) ?? [];
    arr.push(r);
    byUser.set(r.user_id, arr);
  }
  const userRows: UserAgg[] = [...byUser.entries()]
    .map(([id, rows]) => {
      const counts = new Map<string, number>();
      for (const r of rows) counts.set(r.action, (counts.get(r.action) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      const p = profileById.get(id);
      return {
        id,
        email: p?.email ?? id.slice(0, 8),
        plan: p?.plan ?? "—",
        total: rows.length,
        today: rows.filter((r) => at(r) >= dayAgo).length,
        week: rows.filter((r) => at(r) >= weekAgo).length,
        last: rows[0]?.created_at ?? "",
        topAction: top,
      };
    })
    .sort((a, b) => b.total - a.total);

  const uniqueToday = new Set(today.map((r) => r.user_id)).size;
  const recent = usage.slice(0, 50);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold">AI usage</h1>
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-wider text-faint underline-offset-4 hover:text-ink hover:underline"
          >
            ← Dashboard
          </Link>
        </div>
        <p className="mt-1 text-sm text-faint">
          Every real OpenAI-backed call, per user. Limit: {AI_PER_MINUTE}/min and{" "}
          {AI_PER_DAY}/day each (you&apos;re exempt). Heuristic fallbacks cost
          nothing and aren&apos;t listed.
        </p>

        {/* Headline numbers */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Calls today" value={today.length} />
          <Stat label="Active users today" value={uniqueToday} />
          <Stat label="Calls, 7 days" value={week.length} />
          <Stat label="Calls, all time" value={usage.length} />
        </div>

        {usage.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-line bg-card px-4 py-12 text-center text-sm text-faint">
            No AI calls logged yet. Once people use the summary, classify,
            phases, or import features, they&apos;ll show up here.
          </p>
        ) : (
          <>
            {/* What people use */}
            <section className="mt-8">
              <h2 className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-faint">
                By feature
              </h2>
              <ul className="space-y-1.5">
                {actionRows.map(([action, count]) => {
                  const pct = Math.round((count / usage.length) * 100);
                  return (
                    <li
                      key={action}
                      className="rounded-lg border border-line bg-card px-3.5 py-2.5"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {ACTION_LABELS[action] ?? action}
                        </span>
                        <span className="font-mono text-[12px] text-faint">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper">
                        <div
                          className="h-full rounded-full bg-moss"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Who uses it */}
            <section className="mt-8">
              <h2 className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-faint">
                By user
              </h2>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-card text-left font-mono text-[10px] uppercase tracking-wider text-faint">
                      <th className="px-3 py-2 font-normal">User</th>
                      <th className="px-3 py-2 font-normal">Plan</th>
                      <th className="px-3 py-2 text-right font-normal">Today</th>
                      <th className="px-3 py-2 text-right font-normal">7d</th>
                      <th className="px-3 py-2 text-right font-normal">Total</th>
                      <th className="px-3 py-2 font-normal">Mostly</th>
                      <th className="px-3 py-2 font-normal">Last</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRows.map((u) => (
                      <tr key={u.id} className="border-b border-line/60 last:border-0">
                        <td className="max-w-[180px] truncate px-3 py-2" title={u.email}>
                          {u.email}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`font-mono text-[10px] uppercase tracking-wider ${
                              u.plan === "lifetime" ? "text-gold" : "text-faint"
                            }`}
                          >
                            {u.plan}
                          </span>
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono ${
                            u.today >= AI_PER_DAY ? "text-clay" : ""
                          }`}
                        >
                          {u.today}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{u.week}</td>
                        <td className="px-3 py-2 text-right font-mono">{u.total}</td>
                        <td className="px-3 py-2 text-faint">
                          {ACTION_LABELS[u.topAction] ?? u.topAction}
                        </td>
                        <td className="px-3 py-2 text-faint">
                          {u.last ? timeAgo(u.last) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Raw feed */}
            <section className="mt-8">
              <h2 className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-faint">
                Recent calls
              </h2>
              <ul className="space-y-1">
                {recent.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-3.5 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">
                        {ACTION_LABELS[r.action] ?? r.action}
                      </span>
                      <span className="text-faint">
                        {" · "}
                        {profileById.get(r.user_id)?.email ?? r.user_id.slice(0, 8)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-faint">
                      {r.model ?? ""} · {timeAgo(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <p className="font-display text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
        {label}
      </p>
    </div>
  );
}
