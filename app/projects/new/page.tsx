import { createClient } from "@/lib/supabase/server";
import { draftProjectFromIdea } from "@/lib/ai/draft";
import type { Idea } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { NewProjectForm, type ProjectFormDefaults } from "./new-project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ from_idea?: string }>;
}) {
  const { from_idea } = await searchParams;
  const supabase = await createClient();

  // Tags input appears only once 0003_add_tags.sql has been applied
  const { error: tagsProbe } = await supabase
    .from("projects")
    .select("tags")
    .limit(1);
  const tagsEnabled = !tagsProbe;

  let defaults: ProjectFormDefaults | undefined;
  let draftNote: string | null = null;

  if (from_idea) {
    const { data: idea } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", from_idea)
      .maybeSingle();
    if (idea) {
      const draft = await draftProjectFromIdea(idea as Idea);
      defaults = {
        idea_id: from_idea,
        title: draft.title,
        summary: draft.summary,
        vision: draft.vision,
        why_it_matters: draft.why_it_matters,
        success_criteria: draft.success_criteria,
        status: "Exploring",
      };
      draftNote = `Drafted from your idea by ${draft.source} — review and edit before saving.`;
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <h1 className="font-display text-2xl font-semibold">
          {defaults ? "Promote idea to project" : "New project"}
        </h1>
        <p className="mt-1 text-sm text-faint">
          {draftNote ??
            "Capture the understanding now — your future self resumes from it."}
        </p>
        <NewProjectForm defaults={defaults} tagsEnabled={tagsEnabled} />
      </main>
    </>
  );
}
