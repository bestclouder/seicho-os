export const PROJECT_STATUSES = [
  "Seed",
  "Exploring",
  "Active",
  "Paused",
  "Completed",
  "Archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Object types (0007). A project has a finish line; a journey is ongoing with
 * no "done"; an area is a container that holds projects and journeys.
 */
export const PROJECT_KINDS = ["project", "journey", "area"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

/** Journeys never "complete" — their statuses are about intent, not progress. */
export const JOURNEY_STATUSES = [
  "Active",
  "Paused",
  "Archived",
] as const satisfies readonly ProjectStatus[];

export function statusesForKind(kind: ProjectKind): readonly ProjectStatus[] {
  return kind === "project" ? PROJECT_STATUSES : JOURNEY_STATUSES;
}

export type Project = {
  id: string;
  user_id: string | null;
  title: string;
  summary: string | null;
  vision: string | null;
  why_it_matters: string | null;
  success_criteria: string | null;
  technical_notes: string | null;
  status: ProjectStatus;
  start_date: string | null;
  last_updated: string;
  created_at: string;
  /** Present only after supabase/migrations/0003_add_tags.sql is applied. */
  tags?: string[];
  /** Present only after supabase/migrations/0007_object_types.sql is applied. */
  kind?: ProjectKind;
  parent_id?: string | null;
};

export type Phase = {
  id: string;
  user_id: string | null;
  project_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: "planned" | "in_progress" | "done";
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string | null;
  project_id: string;
  phase_id: string | null;
  title: string;
  notes: string | null;
  status: "todo" | "doing" | "done";
  sort_order: number;
  created_at: string;
};

export const SECTION_TAGS = [
  "insight",
  "decision",
  "assumption",
  "task_draft",
  "other",
] as const;
export type SectionTag = (typeof SECTION_TAGS)[number];

export type Thought = {
  id: string;
  user_id: string | null;
  project_id: string;
  body: string;
  section_tag: SectionTag | null;
  section_tag_source: string | null;
  section_tag_confidence: number | null;
  section_tag_review_status: string | null;
  created_at: string;
};

export const SUMMARY_FIELDS = [
  "problem_being_solved",
  "why_worth_it",
  "what_learned",
  "assumptions_changed",
  "current_best_understanding",
  "highest_leverage_next_step",
] as const;
export type SummaryField = (typeof SUMMARY_FIELDS)[number];

export type ProjectSummary = {
  id: string;
  user_id: string | null;
  project_id: string;
  generated_at: string;
  created_at: string;
} & {
  [K in SummaryField]: string | null;
} & {
  [K in SummaryField as `${K}_source`]: string | null;
} & {
  [K in SummaryField as `${K}_confidence`]: number | null;
} & {
  [K in SummaryField as `${K}_review_status`]: string | null;
};

export const RELATIONSHIP_TYPES = [
  "related",
  "depends_on",
  "blocks",
  "inspires",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export type ProjectRelationship = {
  id: string;
  user_id: string | null;
  source_project_id: string;
  target_project_id: string;
  relationship_type: string;
  created_at: string;
};

export type Idea = {
  id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  promoted_to_project_id: string | null;
  status: "inbox" | "promoted" | "dismissed";
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  payload: unknown;
  created_at: string;
};
