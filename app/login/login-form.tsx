"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    setState("sending");
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
      setState("idle");
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="mt-6 rounded-xl border border-moss/25 bg-moss-soft/40 p-5">
        <p className="font-display text-[15px] font-semibold">
          Check your email
        </p>
        <p className="mt-1 text-sm text-faint">
          A magic link is on its way to {email.trim()}. Open it on this device
          to finish signing in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={sendLink} className="mt-6">
      <label className="block">
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-faint">
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-[15px] outline-none focus:border-moss"
        />
      </label>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-4 min-h-11 w-full rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
