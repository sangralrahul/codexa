import "server-only";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { projects, showcaseEntries, users } from "@/db/schema";

export type ShowcaseEntry = typeof showcaseEntries.$inferSelect;
import { conflict, notFound } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { FRAMEWORKS, type Framework } from "@/templates";

/**
 * Community showcase.
 *
 * Only entries with `approvedAt` set are public. Submissions create a pending
 * entry (approvedAt = null). Approval is performed by staff through
 * `approveShowcaseEntry` / `rejectShowcaseEntry` below (the admin area owner
 * wires these to its UI).
 */

export type ShowcaseItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  liveUrl: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  project: { id: string; name: string; framework: string; frameworkName: string; visibility: "private" | "unlisted" | "public"; templateId: string | null };
  submittedBy: { id: string; name: string } | null;
};

const selection = {
  entry: showcaseEntries,
  project: { id: projects.id, name: projects.name, framework: projects.framework, visibility: projects.visibility, templateId: projects.templateId },
  submitter: { id: users.id, name: users.name },
};

type Row = { entry: ShowcaseEntry; project: { id: string; name: string; framework: string; visibility: "private" | "unlisted" | "public"; templateId: string | null }; submitter: { id: string; name: string } | null };

function frameworkName(fw: string) {
  return (FRAMEWORKS as Record<string, { name: string }>)[fw as Framework]?.name ?? fw;
}

function toItem(r: Row): ShowcaseItem {
  return {
    id: r.entry.id,
    slug: r.entry.slug,
    title: r.entry.title,
    description: r.entry.description,
    tags: r.entry.tags,
    liveUrl: r.entry.liveUrl,
    approvedAt: r.entry.approvedAt,
    createdAt: r.entry.createdAt,
    project: { ...r.project, frameworkName: frameworkName(r.project.framework) },
    submittedBy: r.submitter,
  };
}

function baseQuery() {
  return db
    .select(selection)
    .from(showcaseEntries)
    .innerJoin(projects, and(eq(projects.id, showcaseEntries.projectId), isNull(projects.deletedAt)))
    .leftJoin(users, eq(users.id, showcaseEntries.submittedBy));
}

/** Public: approved entries, newest approval first. */
export async function listApproved(opts: { limit?: number; offset?: number; tag?: string } = {}): Promise<ShowcaseItem[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const rows = await baseQuery()
    .where(isNotNull(showcaseEntries.approvedAt))
    .orderBy(desc(showcaseEntries.approvedAt), desc(showcaseEntries.createdAt))
    .limit(limit)
    .offset(Math.max(opts.offset ?? 0, 0));
  const items = rows.map(toItem);
  return opts.tag ? items.filter((i) => i.tags.includes(opts.tag!)) : items;
}

/** Public: a single approved entry by slug, or null. */
export async function getBySlug(slug: string): Promise<ShowcaseItem | null> {
  const rows = await baseQuery()
    .where(and(eq(showcaseEntries.slug, slug), isNotNull(showcaseEntries.approvedAt)))
    .limit(1);
  return rows[0] ? toItem(rows[0]) : null;
}

/** Entries (pending or approved) submitted by a user — for the "your submissions" status list. */
export async function listSubmittedBy(userId: string): Promise<ShowcaseItem[]> {
  const rows = await baseQuery().where(eq(showcaseEntries.submittedBy, userId)).orderBy(desc(showcaseEntries.createdAt)).limit(50);
  return rows.map(toItem);
}

/** Staff: pending entries awaiting review. */
export async function listPending(limit = 100): Promise<ShowcaseItem[]> {
  const rows = await baseQuery().where(isNull(showcaseEntries.approvedAt)).orderBy(desc(showcaseEntries.createdAt)).limit(limit);
  return rows.map(toItem);
}

export async function getEntryForProject(projectId: string): Promise<ShowcaseEntry | null> {
  const rows = await db.select().from(showcaseEntries).where(eq(showcaseEntries.projectId, projectId)).limit(1);
  return rows[0] ?? null;
}

async function uniqueSlug(title: string) {
  const root = slugify(title).slice(0, 60) || "project";
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const exists = await db.select({ id: showcaseEntries.id }).from(showcaseEntries).where(eq(showcaseEntries.slug, candidate)).limit(1);
    if (!exists.length) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export type SubmitInput = { projectId: string; title: string; description: string; tags: string[]; liveUrl?: string | null; submittedBy: string };

/**
 * Create a pending entry. The caller must already have verified the user has at
 * least the editor role on the project (assertProjectAccess). One entry per project.
 */
export async function submit(input: SubmitInput): Promise<ShowcaseEntry> {
  const existing = await getEntryForProject(input.projectId);
  if (existing) throw conflict(existing.approvedAt ? "This project is already published in the showcase" : "This project already has a pending showcase submission");
  const slug = await uniqueSlug(input.title);
  const tags = Array.from(new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 8);
  const [row] = await db
    .insert(showcaseEntries)
    .values({
      projectId: input.projectId,
      slug,
      title: input.title.trim().slice(0, 100),
      description: input.description.trim().slice(0, 1000),
      tags,
      liveUrl: input.liveUrl?.trim() || null,
      submittedBy: input.submittedBy,
      approvedAt: null,
    })
    .returning();
  return row;
}

/** Staff: approve a pending entry (idempotent). */
export async function approveShowcaseEntry(entryId: string): Promise<ShowcaseEntry> {
  const [row] = await db.update(showcaseEntries).set({ approvedAt: new Date() }).where(eq(showcaseEntries.id, entryId)).returning();
  if (!row) throw notFound("Showcase entry");
  return row;
}

/** Staff: reject (or unpublish) an entry. The row is deleted so the project can be resubmitted. */
export async function rejectShowcaseEntry(entryId: string): Promise<void> {
  const deleted = await db.delete(showcaseEntries).where(eq(showcaseEntries.id, entryId)).returning({ id: showcaseEntries.id });
  if (!deleted.length) throw notFound("Showcase entry");
}

/** Owner/editor: withdraw a pending submission (approved entries must be removed by staff). */
export async function withdrawPending(entryId: string, projectId: string): Promise<boolean> {
  const deleted = await db
    .delete(showcaseEntries)
    .where(and(eq(showcaseEntries.id, entryId), eq(showcaseEntries.projectId, projectId), isNull(showcaseEntries.approvedAt)))
    .returning({ id: showcaseEntries.id });
  return deleted.length > 0;
}

export function serializeShowcaseItem(i: ShowcaseItem) {
  return {
    id: i.id,
    slug: i.slug,
    title: i.title,
    description: i.description,
    tags: i.tags,
    liveUrl: i.liveUrl,
    status: i.approvedAt ? ("approved" as const) : ("pending" as const),
    approvedAt: i.approvedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    project: { id: i.project.id, name: i.project.name, framework: i.project.framework, frameworkName: i.project.frameworkName, visibility: i.project.visibility, templateId: i.project.templateId },
    submittedBy: i.submittedBy ? { name: i.submittedBy.name } : null,
  };
}
export type ShowcaseItemDto = ReturnType<typeof serializeShowcaseItem>;
