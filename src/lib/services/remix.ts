import "server-only";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, showcaseEntries, type Project } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { createProject, getAllFiles, logActivity } from "@/lib/services/projects";
import { getTemplate } from "@/templates";

/**
 * Remixing: copy the files of a public community-showcase project into a workspace the caller can
 * edit. Only the project's files are copied. Settings come from the template (as with any new
 * project), so the source project's environment variables, secrets, domains and deployments are
 * never carried over.
 *
 * The caller (route) is responsible for authentication, the target-workspace role check, the
 * rate limit and the project quota.
 */

export const REMIX_FALLBACK_TEMPLATE = "vite-react-starter";

export type RemixSource = {
  entryId: string;
  slug: string;
  title: string;
  project: Pick<Project, "id" | "name" | "templateId">;
};

const notRemixable = () => new ApiError(404, "This showcase project is not available to remix. Only published entries whose project is public can be remixed.", "not_found");

/** An approved showcase entry whose (non-deleted) project is public, or a 404 ApiError. */
export async function getRemixSource(slug: string): Promise<RemixSource> {
  const rows = await db
    .select({
      entryId: showcaseEntries.id,
      slug: showcaseEntries.slug,
      title: showcaseEntries.title,
      projectId: projects.id,
      projectName: projects.name,
      templateId: projects.templateId,
      visibility: projects.visibility,
    })
    .from(showcaseEntries)
    .innerJoin(projects, and(eq(projects.id, showcaseEntries.projectId), isNull(projects.deletedAt)))
    .where(and(eq(showcaseEntries.slug, slug), isNotNull(showcaseEntries.approvedAt)))
    .limit(1);
  const row = rows[0];
  // Unapproved, unlisted and private entries all look the same from outside: not found.
  if (!row || row.visibility !== "public") throw notRemixable();
  return { entryId: row.entryId, slug: row.slug, title: row.title, project: { id: row.projectId, name: row.projectName, templateId: row.templateId } };
}

/** Copy the source project's files into `workspaceId` as a new private project and count the remix. */
export async function remixShowcaseProject(input: { source: RemixSource; workspaceId: string; userId: string }): Promise<Project> {
  const { source, workspaceId, userId } = input;
  const templateId = source.project.templateId && getTemplate(source.project.templateId) ? source.project.templateId : REMIX_FALLBACK_TEMPLATE;
  const files = await getAllFiles(source.project.id);
  const copy = await createProject({
    workspaceId,
    name: `${source.title.slice(0, 92)} (remix)`,
    description: `Remixed from "${source.title}" in the Codexa community showcase (/showcase/${source.slug}).`,
    templateId,
    visibility: "private",
    createdBy: userId,
    files,
  });
  await logActivity(copy.id, userId, "project.remixed", `Remixed from showcase entry "${source.title}"`, {
    showcaseEntryId: source.entryId,
    showcaseSlug: source.slug,
    sourceProjectId: source.project.id,
  });
  await db
    .update(showcaseEntries)
    .set({ remixCount: sql`${showcaseEntries.remixCount} + 1` })
    .where(eq(showcaseEntries.id, source.entryId));
  return copy;
}
