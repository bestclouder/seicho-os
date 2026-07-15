"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Client-side so static headers and loading states never block on auth. */
export function AuthStatus() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  if (email === undefined) return <span className="w-14" aria-hidden />;

  if (email === null) {
    return (
      <Link
        href="/login"
        className="font-mono text-[11px] uppercase tracking-wider text-faint underline-offset-4 hover:underline"
      >
        Sign in
      </Link>
    );
  }

  // One compact avatar; email + sign-out live in the menu so the header
  // never wraps on small screens.
  return (
    <span className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        title={email}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-moss/30 bg-moss-soft font-mono text-[12px] font-semibold uppercase text-moss"
      >
        {email[0]}
      </button>
      {open && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="animate-rise absolute right-0 top-10 z-50 w-56 rounded-xl border border-line bg-card p-1.5 shadow-lg">
            <p className="break-all px-2.5 py-2 font-mono text-[11px] text-faint">
              {email}
            </p>
            {email.toLowerCase() === "bestclouder@gmail.com" && (
              <Link
                href="/admin/usage"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-paper"
              >
                AI usage
              </Link>
            )}
            <button
              onClick={async () => {
                setOpen(false);
                await createClient().auth.signOut();
                router.refresh();
                setEmail(null);
              }}
              className="w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-paper"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </span>
  );
}
