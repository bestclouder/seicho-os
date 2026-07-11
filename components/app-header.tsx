import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";

export function AppHeader({ action }: { action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight">
            Seichō OS
          </span>
          <span
            aria-hidden
            className="font-display text-xs text-faint"
            title="seichō — growth"
          >
            成長
          </span>
        </Link>
        <span className="flex items-center gap-3">
          <AuthStatus />
          {action}
        </span>
      </div>
    </header>
  );
}
