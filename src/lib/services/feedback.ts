import "server-only";
import { and, count, desc, asc, eq, isNull } from "drizzle-orm";
import { db, runBatch } from "@/db";
import { feedbackComments, feedbackLinks, projects, type Project } from "@/db/schema";
import { conflict } from "@/lib/api";
import { hashToken, randomToken } from "@/lib/crypto";
import { absoluteUrl } from "@/lib/utils";
import { getCurrentDeployment } from "@/lib/services/deployments";
import { getActiveSession } from "@/lib/services/runtime";
import { REVIEW_PARAM } from "@/lib/hosts";

/**
 * Client feedback: one review link per project (the raw token is shown once, only its hash is
 * stored) and comments that people without a Codexa account pin to elements of the app.
 * Owner-side calls assume the caller already checked project access; the public calls resolve
 * the token first and only ever see that link's project.
 */

/** Open comments a project may hold before new ones are refused (keeps a leaked link from flooding it). */
export const MAX_OPEN_COMMENTS = 500;

export type FeedbackStatus = "open" | "resolved";

export type FeedbackElement = { path: string; tag: string; text: string; html?: string };

export type FeedbackCommentDto = {
  id: string;
  authorName: string;
  body: string;
  pagePath: string;
  element: FeedbackElement | null;
  status: FeedbackStatus;
  createdAt: string;
  resolvedAt: string | null;
};

/** What the public review page gets: no outline HTML, no ids of links or users. */
export type PublicCommentDto = Omit<FeedbackCommentDto, "resolvedAt" | "status" | "element"> & { element: Omit<FeedbackElement, "html"> | null };

export type FeedbackLinkStatus = { active: { id: string; createdAt: string } | null };

export type ReviewTarget =
  | { kind: "live"; url: string }
  | { kind: "preview"; url: string }
  | { kind: "none" };

export function reviewUrlFor(token: string) {
  return absoluteUrl(`/review/${token}`);
}

// ---------------------------------------------------------------------------
// Links (owner)
// ---------------------------------------------------------------------------

/** Creates the project's review link, revoking the previous one. The URL is returned only here. */
export async function createFeedbackLink(projectId: string, userId: string) {
  const token = randomToken(24);
  const id = crypto.randomUUID();
  const now = new Date();
  await runBatch([
    db.update(feedbackLinks).set({ revokedAt: now }).where(and(eq(feedbackLinks.projectId, projectId), isNull(feedbackLinks.revokedAt))),
    db.insert(feedbackLinks).values({ id, projectId, tokenHash: hashToken(token), createdBy: userId, createdAt: now }),
  ]);
  return { link: { id, createdAt: now.toISOString() }, url: reviewUrlFor(token) };
}

export async function getFeedbackLinkStatus(projectId: string): Promise<FeedbackLinkStatus> {
  const [row] = await db
    .select({ id: feedbackLinks.id, createdAt: feedbackLinks.createdAt })
    .from(feedbackLinks)
    .where(and(eq(feedbackLinks.projectId, projectId), isNull(feedbackLinks.revokedAt)))
    .orderBy(desc(feedbackLinks.createdAt))
    .limit(1);
  return { active: row ? { id: row.id, createdAt: row.createdAt.toISOString() } : null };
}

/** Revokes the active review link. Returns false when there was none. */
export async function revokeFeedbackLink(projectId: string): Promise<boolean> {
  const rows = await db
    .update(feedbackLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(feedbackLinks.projectId, projectId), isNull(feedbackLinks.revokedAt)))
    .returning({ id: feedbackLinks.id });
  return rows.length > 0;
}

/** The project behind a raw review token, when the link is active and the project exists. */
export async function resolveFeedbackToken(token: string): Promise<{ project: Project; linkId: string } | null> {
  if (!token || token.length > 128) return null;
  const [row] = await db
    .select({ linkId: feedbackLinks.id, project: projects })
    .from(feedbackLinks)
    .innerJoin(projects, eq(projects.id, feedbackLinks.projectId))
    .where(and(eq(feedbackLinks.tokenHash, hashToken(token)), isNull(feedbackLinks.revokedAt), isNull(projects.deletedAt)))
    .limit(1);
  return row ?? null;
}

/** What a reviewer sees: the live site (with the inspector turned on), else a running preview. */
export async function reviewTarget(projectId: string): Promise<ReviewTarget> {
  const live = await getCurrentDeployment(projectId, "codexa");
  if (live?.url) {
    try {
      const u = new URL(live.url);
      u.searchParams.set(REVIEW_PARAM, "1");
      return { kind: "live", url: u.toString() };
    } catch {
      /* fall through to the preview */
    }
  }
  const session = await getActiveSession(projectId);
  if (session?.status === "running" && session.previewUrl) return { kind: "preview", url: session.previewUrl };
  return { kind: "none" };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

function toDto(row: typeof feedbackComments.$inferSelect): FeedbackCommentDto {
  const el = row.element as Partial<FeedbackElement> | null;
  return {
    id: row.id,
    authorName: row.authorName,
    body: row.body,
    pagePath: row.pagePath,
    element: el && typeof el.path === "string" ? { path: el.path, tag: String(el.tag ?? ""), text: String(el.text ?? ""), ...(typeof el.html === "string" ? { html: el.html } : {}) } : null,
    status: row.status === "resolved" ? "resolved" : "open",
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

export function toPublicComment(c: FeedbackCommentDto): PublicCommentDto {
  return {
    id: c.id,
    authorName: c.authorName,
    body: c.body,
    pagePath: c.pagePath,
    element: c.element ? { path: c.element.path, tag: c.element.tag, text: c.element.text } : null,
    createdAt: c.createdAt,
  };
}

/** Owner list, newest first. */
export async function listFeedbackComments(projectId: string, opts: { status?: FeedbackStatus; limit?: number } = {}) {
  const where = opts.status ? and(eq(feedbackComments.projectId, projectId), eq(feedbackComments.status, opts.status)) : eq(feedbackComments.projectId, projectId);
  const rows = await db.select().from(feedbackComments).where(where).orderBy(desc(feedbackComments.createdAt)).limit(Math.min(opts.limit ?? 500, 1000));
  return rows.map(toDto);
}

export async function countOpenComments(projectId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(feedbackComments)
    .where(and(eq(feedbackComments.projectId, projectId), eq(feedbackComments.status, "open")));
  return Number(row?.n ?? 0);
}

/** Open comments for the review page, oldest first (so pin numbers stay stable as comments arrive). */
export async function listPublicComments(projectId: string): Promise<PublicCommentDto[]> {
  const rows = await db
    .select()
    .from(feedbackComments)
    .where(and(eq(feedbackComments.projectId, projectId), eq(feedbackComments.status, "open")))
    .orderBy(asc(feedbackComments.createdAt))
    .limit(MAX_OPEN_COMMENTS);
  return rows.map((r) => toPublicComment(toDto(r)));
}

export async function addFeedbackComment(
  projectId: string,
  linkId: string,
  input: { authorName: string; body: string; pagePath: string; element: FeedbackElement | null },
): Promise<FeedbackCommentDto> {
  if ((await countOpenComments(projectId)) >= MAX_OPEN_COMMENTS) {
    throw conflict("This project already has the maximum number of open comments. Ask the owner to resolve some first.");
  }
  const [row] = await db
    .insert(feedbackComments)
    .values({ projectId, linkId, authorName: input.authorName, body: input.body, pagePath: input.pagePath, element: input.element })
    .returning();
  return toDto(row);
}

/** Sets a comment's status. Returns null when the comment is not in this project. */
export async function setFeedbackStatus(projectId: string, commentId: string, status: FeedbackStatus): Promise<FeedbackCommentDto | null> {
  const [row] = await db
    .update(feedbackComments)
    .set({ status, resolvedAt: status === "resolved" ? new Date() : null })
    .where(and(eq(feedbackComments.projectId, projectId), eq(feedbackComments.id, commentId)))
    .returning();
  return row ? toDto(row) : null;
}

export async function deleteFeedbackComment(projectId: string, commentId: string): Promise<boolean> {
  const rows = await db
    .delete(feedbackComments)
    .where(and(eq(feedbackComments.projectId, projectId), eq(feedbackComments.id, commentId)))
    .returning({ id: feedbackComments.id });
  return rows.length > 0;
}
