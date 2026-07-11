import Link from "next/link";
import type { Access } from "@/lib/access";

/** One-line plan banner under the header. Renders nothing for full access. */
export function AccessBanner({ access }: { access: Access }) {
  if (!access.lockdownApplied || access.plan === "lifetime") return null;

  if (!access.userId) {
    return (
      <div className="border-b border-line bg-indigo-soft/60">
        <p className="mx-auto max-w-2xl px-4 py-2 text-sm text-indigo-ai">
          You&apos;re exploring the shared demo — read-only.{" "}
          <Link href="/login" className="font-medium underline underline-offset-4">
            Sign up
          </Link>{" "}
          to build your own workspace (free for 7 days).
        </p>
      </div>
    );
  }

  if (access.plan === "trial" && !access.canWrite) {
    return (
      <div className="border-b border-line bg-clay-soft/70">
        <p className="mx-auto max-w-2xl px-4 py-2 text-sm text-clay">
          Your 7-day trial has ended — your workspace is now view-only. All
          your content stays readable.
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-line bg-gold-soft/60">
      <p className="mx-auto max-w-2xl px-4 py-2 text-sm text-gold">
        Trial · {access.daysLeft} day{access.daysLeft === 1 ? "" : "s"} of full
        access left.
      </p>
    </div>
  );
}
