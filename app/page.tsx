import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { GrowthRing } from "@/components/growth-ring";

export const dynamic = "force-dynamic";

const STAGES: { word: string; ring: number }[] = [
  { word: "Capture", ring: 8 },
  { word: "Clarify", ring: 30 },
  { word: "Grow", ring: 55 },
  { word: "Return", ring: 80 },
  { word: "Complete", ring: 100 },
];

const FADE_LINES = [
  "They disappear because life gets busy.",
  "Priorities change.",
  "Momentum fades.",
  "Context is lost.",
];

export default async function Landing() {
  const supabase = await createClient();
  const access = await getAccess(supabase);

  // Signed-in people don't need the pitch — straight to their workspace
  if (access.userId) redirect("/dashboard");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <span className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold tracking-tight">
              Seichō OS
            </span>
            <span aria-hidden className="font-display text-xs text-faint">
              成長
            </span>
          </span>
          <Link
            href="/login"
            className="font-mono text-[11px] uppercase tracking-wider text-faint underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        {/* ── hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-4 pb-20 pt-20 text-center sm:pt-28">
          <p className="animate-rise font-mono text-[11px] uppercase tracking-[0.25em] text-faint">
            Seichō OS · 成長 · growth
          </p>
          <h1
            className="animate-rise mx-auto mt-6 max-w-xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
            style={{ animationDelay: "0.1s" }}
          >
            Ideas deserve the chance to become reality.
          </h1>
          <p
            className="animate-rise mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-faint"
            style={{ animationDelay: "0.2s" }}
          >
            A personal operating system for growing meaningful ideas into
            meaningful work.
          </p>
          <div
            className="animate-rise mt-9 flex items-center justify-center gap-3"
            style={{ animationDelay: "0.3s" }}
          >
            <Link
              href="/login"
              className="min-h-12 rounded-xl bg-moss px-7 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Start Building
            </Link>
            <Link
              href="/demo"
              className="min-h-12 rounded-xl border border-line bg-card px-6 py-3 text-[15px] text-ink transition-colors hover:border-moss"
            >
              View the demo
            </Link>
          </div>
        </section>

        {/* ── why ideas die ────────────────────────────────────────────── */}
        <section className="border-t border-line bg-card/60">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <h2 className="font-display text-2xl font-semibold leading-snug sm:text-3xl">
              Great ideas rarely disappear
              <br />
              because they&apos;re bad.
            </h2>
            <div className="mt-8 space-y-2.5 font-display text-lg text-faint">
              {FADE_LINES.map((line, i) => (
                <p key={line} style={{ opacity: 1 - i * 0.18 }}>
                  {line}
                </p>
              ))}
            </div>
            <p className="mx-auto mt-10 max-w-md text-[17px] leading-relaxed">
              Seichō OS remembers where you left off
              <br className="hidden sm:block" /> so you can continue building
              what matters.
            </p>
          </div>
        </section>

        {/* ── the five stages ──────────────────────────────────────────── */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-3xl px-4 py-20">
            <ol className="flex flex-wrap items-start justify-center gap-x-2 gap-y-8 sm:flex-nowrap sm:justify-between">
              {STAGES.map(({ word, ring }, i) => (
                <li
                  key={word}
                  className="flex min-w-[72px] flex-1 flex-col items-center gap-3"
                >
                  <GrowthRing score={ring} size={44} />
                  <span className="font-display text-[15px] font-semibold">
                    {word}
                  </span>
                  {i < STAGES.length - 1 && <span className="sr-only">then</span>}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── closing ──────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-ink text-paper">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <p className="font-display text-2xl font-semibold leading-snug sm:text-3xl">
              Not another productivity tool.
            </p>
            <p className="mt-2 font-display text-2xl leading-snug text-paper/70 sm:text-3xl">
              A companion for your life&apos;s work.
            </p>
            <div className="mt-10 flex items-center justify-center gap-3">
              <Link
                href="/login"
                className="min-h-12 rounded-xl bg-paper px-7 py-3 text-[15px] font-medium text-ink transition-opacity hover:opacity-90"
              >
                Start Building
              </Link>
              <Link
                href="/demo"
                className="min-h-12 rounded-xl border border-paper/25 px-6 py-3 text-[15px] text-paper/90 transition-colors hover:border-paper/60"
              >
                View the demo
              </Link>
            </div>
            <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.25em] text-paper/40">
              free for 30 days · your work stays readable forever
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
