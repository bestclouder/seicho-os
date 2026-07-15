"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { seedStarterWorkspace } from "@/app/actions/starter";

/**
 * First thing a signed-in user with an empty workspace sees. Three ways in,
 * in the order most likely to land: paste what you already have, drop in
 * starter placeholders to react to, or build one by hand.
 */
export function EmptyWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [seeded, setSeeded] = useState(false);

  function addStarters() {
    startTransition(async () => {
      const result = await seedStarterWorkspace();
      if (result.ok) {
        setSeeded(true);
        toast("Added a starter area, journey, and project — make them yours.", "info");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-line bg-card px-6 py-8 text-center">
        <p className="font-display text-xl font-semibold">Make Seichō yours</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-faint">
          This is your private workspace for the projects, journeys, and ideas
          you carry over the years. Start it whichever way fits.
        </p>
      </div>

      {/* Primary: bring what you already have */}
      <Link
        href="/import"
        className="group block rounded-2xl border border-moss/40 bg-moss-soft/60 p-5 transition-shadow hover:shadow-md"
      >
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss text-lg text-white">
            ✦
          </span>
          <div className="min-w-0">
            <p className="font-display text-[17px] font-semibold">
              Paste your notes → instant projects
            </p>
            <p className="mt-1 text-sm text-faint">
              Dump a goal list, a journal, or an export from any notes app. The
              AI sorts it into projects, journeys, and ideas — you review before
              anything is saved. Fastest way to fill your workspace.
            </p>
            <span className="mt-2.5 inline-block font-mono text-[11px] uppercase tracking-wider text-moss">
              Import your notes →
            </span>
          </div>
        </div>
      </Link>

      {/* Secondary: react to placeholders */}
      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-lg text-gold">
            ◔
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[17px] font-semibold">
              Start from placeholders
            </p>
            <p className="mt-1 text-sm text-faint">
              Drop in one example of each type — an area, a journey, and a
              project — then rename, edit, or delete them. Learn the model by
              making it yours.
            </p>
            <button
              onClick={addStarters}
              disabled={pending || seeded}
              className="mt-3 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {seeded
                ? "Added — scroll down"
                : pending
                  ? "Adding…"
                  : "Add starter projects"}
            </button>
          </div>
        </div>
      </div>

      {/* Tertiary: from scratch */}
      <div className="text-center">
        <Link
          href="/projects/new"
          className="font-mono text-[11px] uppercase tracking-wider text-faint underline-offset-4 hover:text-ink hover:underline"
        >
          or create one from scratch →
        </Link>
      </div>
    </div>
  );
}
