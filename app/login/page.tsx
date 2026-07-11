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
          One magic link does both. New accounts get full access for 7 days —
          after that your workspace stays readable but becomes view-only. No
          account needed to browse the demo.
        </p>
        <LoginForm />
      </main>
    </>
  );
}
