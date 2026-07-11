import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Idea } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { IdeasList } from "./ideas-list";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-display text-lg">Couldn&apos;t load ideas.</p>
          <p className="mt-2 text-sm text-faint">{error.message}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-moss underline">
            Back to dashboard
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <h1 className="font-display text-2xl font-semibold">Idea inbox</h1>
        <p className="mt-1 text-sm text-faint">
          Capture raw ideas now; promote the ones that earn a project.
        </p>
        <IdeasList initialIdeas={(data ?? []) as Idea[]} />
      </main>
    </>
  );
}
