import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { projects, shareLinks, type Project } from "@/db/schema";
import { hashToken, randomToken } from "@/lib/crypto";
import { absoluteUrl } from "@/lib/utils";

export type ShareAccess = "view" | "edit";

export type ShareLinkView = {
  id: string;
  access: ShareAccess;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
  createdBy: string | null;
};

export function shareUrlFor(token: string) {
  return absoluteUrl(`/share/${token}`);
}

/** Create a share link. The raw token is only returned once (it is hashed at rest). */
export async function createShareLink(input: { projectId: string; access: ShareAccess; expiresInDays?: number | null; createdBy: string }) {
  const token = randomToken(24);
  const expiresAt =
    input.expiresInDays && input.expiresInDays > 0 ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000) : null;
  const [link] = await db
    .insert(shareLinks)
    .values({ projectId: input.projectId, tokenHash: hashToken(token), access: input.access, expiresAt, createdBy: input.createdBy })
    .returning();
  return { link: toView(link), token, url: shareUrlFor(token) };
}

export async function listShareLinks(projectId: string, opts: { includeRevoked?: boolean } = {}): Promise<ShareLinkView[]> {
  const where = opts.includeRevoked
    ? eq(shareLinks.projectId, projectId)
    : and(eq(shareLinks.projectId, projectId), isNull(shareLinks.revokedAt));
  const rows = await db.select().from(shareLinks).where(where).orderBy(desc(shareLinks.createdAt));
  return rows.map(toView);
}

/** Revoke a link belonging to the given project. Returns false when it does not exist. */
export async function revokeShareLink(projectId: string, linkId: string): Promise<boolean> {
  const rows = await db
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(shareLinks.projectId, projectId), eq(shareLinks.id, linkId), isNull(shareLinks.revokedAt)))
    .returning({ id: shareLinks.id });
  return rows.length > 0;
}

/** Resolve a raw share token to its project when the link is valid, unrevoked and unexpired. */
export async function resolveShareToken(token: string): Promise<{ project: Project; link: ShareLinkView } | null> {
  if (!token || token.length > 128) return null;
  const rows = await db
    .select({ link: shareLinks, project: projects })
    .from(shareLinks)
    .innerJoin(projects, eq(projects.id, shareLinks.projectId))
    .where(and(eq(shareLinks.tokenHash, hashToken(token)), isNull(shareLinks.revokedAt), isNull(projects.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.link.expiresAt && row.link.expiresAt.getTime() < Date.now()) return null;
  return { project: row.project, link: toView(row.link) };
}

function toView(row: typeof shareLinks.$inferSelect): ShareLinkView {
  return {
    id: row.id,
    access: row.access === "edit" ? "edit" : "view",
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
    createdBy: row.createdBy,
  };
}
