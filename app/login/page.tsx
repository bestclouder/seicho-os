import { AppHeader } from "@/components/app-header";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 pb-24 pt-10">
        <h1 className="font-display text-2xl font-semibold">
          Sign in or sign up
        </h1>
        <p className="mt-1 text-sm text-faint">
          One magic link does both. New accounts get full access for 30 days —
          after that your workspace stays readable (view-only) and you can
          request an extension. No account needed to browse the demo.
        </p>
        <LoginForm />
      </main>
    </>
  );
}
