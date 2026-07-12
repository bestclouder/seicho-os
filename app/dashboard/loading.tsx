import { AppHeader } from "@/components/app-header";

export default function DashboardLoading() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-4 h-4 w-48 animate-pulse rounded bg-line" />
        <ul className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-[104px] animate-pulse rounded-xl border border-line bg-card"
            />
          ))}
        </ul>
      </main>
    </>
  );
}
