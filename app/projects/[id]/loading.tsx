import { AppHeader } from "@/components/app-header";

export default function ProjectLoading() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="h-3 w-40 animate-pulse rounded bg-line" />
        <div className="mt-3 h-7 w-2/3 animate-pulse rounded bg-line" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-line" />
        <div className="mt-8 h-64 animate-pulse rounded-xl border border-line bg-card" />
      </main>
    </>
  );
}
