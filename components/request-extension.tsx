"use client";

import { useState, useTransition } from "react";
import { requestExtension } from "@/app/actions/extension";

export function RequestExtension({ pending }: { pending: boolean }) {
  const [requested, setRequested] = useState(pending);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  if (requested) {
    return (
      <span className="font-medium">
        Extension requested — you&apos;ll hear back by email.
      </span>
    );
  }

  return (
    <>
      <button
        disabled={busy}
        onClick={() =>
          startTransition(async () => {
            const result = await requestExtension();
            if (result.ok) setRequested(true);
            else setError(result.error);
          })
        }
        className="font-medium underline underline-offset-4 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Request an extension"}
      </button>
      {error && <span className="ml-2">{error}</span>}
    </>
  );
}
