import { AppHeader } from "@/components/app-header";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 pb-24 pt-10">
        <h1 className="font-display text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-faint">
          Optional — the demo works without an account. Signing in stamps your
          new projects and thoughts as yours, ready for per-user isolation.
        </p>
        <LoginForm />
      </main>
    </>
  );
}
