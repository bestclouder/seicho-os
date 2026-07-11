import { AppHeader } from "@/components/app-header";
import { NewProjectForm } from "./new-project-form";

export default function NewProjectPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <h1 className="font-display text-2xl font-semibold">New project</h1>
        <p className="mt-1 text-sm text-faint">
          Capture the understanding now — your future self resumes from it.
        </p>
        <NewProjectForm />
      </main>
    </>
  );
}
