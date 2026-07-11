"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  addRelationship,
  deleteRelationship,
} from "@/app/actions/relationships";
import { useToast } from "@/components/toast";
import {
  RELATIONSHIP_TYPES,
  type ProjectRelationship,
  type RelationshipType,
} from "@/lib/types";

const TYPE_LABEL: Record<RelationshipType, string> = {
  related: "related to",
  depends_on: "depends on",
  blocks: "blocks",
  inspires: "inspires",
};

export type LinkedProject = {
  relationship: ProjectRelationship;
  otherId: string;
  otherTitle: string;
  direction: "out" | "in";
};

export function RelationshipsPanel({
  projectId,
  initialLinks,
  otherProjects,
  readOnly = false,
}: {
  projectId: string;
  initialLinks: LinkedProject[];
  otherProjects: { id: string; title: string }[];
  readOnly?: boolean;
}) {
  const [links, setLinks] = useState<LinkedProject[]>(initialLinks);
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState<RelationshipType>("related");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const candidates = otherProjects.filter(
    (p) => !links.some((l) => l.otherId === p.id),
  );

  function link() {
    if (!targetId) return;
    const target = otherProjects.find((p) => p.id === targetId);
    startTransition(async () => {
      const result = await addRelationship(projectId, targetId, type);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      setLinks((list) => [
        ...list,
        {
          relationship: result.relationship,
          otherId: targetId,
          otherTitle: target?.title ?? "Unknown project",
          direction: "out",
        },
      ]);
      setTargetId("");
    });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-faint">
        Linked projects
      </h2>

      {links.length === 0 ? (
        <p className="mb-3 text-sm text-faint">
          {readOnly
            ? "No linked projects."
            : "No links yet — connect this to the projects it feeds or depends on."}
        </p>
      ) : (
        <ul className="mb-3 space-y-2">
          {links.map((l) => (
            <li
              key={l.relationship.id}
              className="group flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {l.direction === "out"
                  ? TYPE_LABEL[
                      l.relationship.relationship_type as RelationshipType
                    ] ?? l.relationship.relationship_type
                  : `is ${
                      TYPE_LABEL[
                        l.relationship.relationship_type as RelationshipType
                      ] ?? l.relationship.relationship_type
                    } by`}
              </span>
              <Link
                href={`/projects/${l.otherId}`}
                className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold underline-offset-4 hover:underline"
              >
                {l.otherTitle}
              </Link>
              {!readOnly && (
              <button
                aria-label="Remove link"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteRelationship(l.relationship.id);
                    if (!result.ok) {
                      toast(result.error, "error");
                      return;
                    }
                    setLinks((list) =>
                      list.filter((x) => x.relationship.id !== l.relationship.id),
                    );
                  })
                }
                className="px-1.5 py-1 text-faint/50 opacity-0 transition-opacity hover:text-clay group-hover:opacity-100"
              >
                ✕
              </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && candidates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            value={type}
            aria-label="Relationship type"
            onChange={(e) => setType(e.target.value as RelationshipType)}
            className="min-h-11 rounded-xl border border-line bg-card px-2.5 text-sm outline-none focus:border-moss"
          >
            {RELATIONSHIP_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <select
            value={targetId}
            aria-label="Project to link"
            onChange={(e) => setTargetId(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-2.5 text-sm outline-none focus:border-moss"
          >
            <option value="">Choose a project…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            onClick={link}
            disabled={!targetId || pending}
            className="min-h-11 rounded-xl border border-moss/30 px-4 text-sm font-medium text-moss transition-colors hover:bg-moss-soft disabled:opacity-40"
          >
            Link
          </button>
        </div>
      )}
    </section>
  );
}
