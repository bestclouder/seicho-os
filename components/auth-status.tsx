"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Client-side so static headers and loading states never block on auth. */
export function AuthStatus() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
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

  return (
    <span className="flex items-center gap-2">
      <span
        className="max-w-32 truncate font-mono text-[11px] text-faint"
        title={email}
      >
        {email}
      </span>
      <button
        onClick={async () => {
          await createClient().auth.signOut();
          router.refresh();
          setEmail(null);
        }}
        className="font-mono text-[11px] uppercase tracking-wider text-faint underline-offset-4 hover:underline"
      >
        Sign out
      </button>
    </span>
  );
}
