import Link from "next/link";
import { AppHeader } from "@/components/app-header";

export default function ProjectNotFound() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="font-display text-lg">This project doesn&apos;t exist.</p>
        <p className="mt-1 text-sm text-faint">
          It may have been archived or the link is wrong.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-moss underline">
          Back to dashboard
        </Link>
      </main>
    </>
  );
}
