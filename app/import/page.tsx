import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { AppHeader } from "@/components/app-header";
import { AccessBanner } from "@/components/access-banner";
import { ImportWizard } from "./import-wizard";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = await createClient();
  const access = await getAccess(supabase);

  if (!access.canWrite) {
    return (
      <>
        <AppHeader />
        <AccessBanner access={access} />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-display text-lg">
            {access.userId
              ? "Your trial has ended — imports are paused."
              : "Sign up to import your existing notes."}
          </p>
          <Link
            href={access.userId ? "/" : "/login"}
            className="mt-5 inline-block rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white"
          >
            {access.userId ? "Back to dashboard" : "Sign up"}
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <AccessBanner access={access} />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <h1 className="font-display text-2xl font-semibold">
          Import your existing notes
        </h1>
        <p className="mt-1 text-sm text-faint">
          Paste old goals, plans, and scattered notes — AI proposes projects,
          thoughts, and ideas. Nothing is saved until you review and confirm.
          Pasted text is processed by the AI provider.
        </p>
        <ImportWizard />
      </main>
    </>
  );
}
