import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { listApproved, listSubmittedBy, serializeShowcaseItem, submit } from "@/lib/services/showcase";

/** Public: approved showcase entries. With ?mine=1 (signed in): the caller's own submissions including pending ones. */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("mine") === "1") {
    const user = await requireApiUser();
    const entries = await listSubmittedBy(user.id);
    return json({ entries: entries.map(serializeShowcaseItem) });
  }
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const tag = url.searchParams.get("tag") ?? undefined;
  const entries = await listApproved({ limit: Number.isFinite(limit) ? limit : 50, offset: Number.isFinite(offset) ? offset : 0, tag });
  return json({ entries: entries.map(serializeShowcaseItem) });
});

const submitSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().trim().min(20, "Describe the project in at least 20 characters").max(1000),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
  liveUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .refine((u) => u.startsWith("https://") || u.startsWith("http://"), "URL must start with http:// or https://")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/** Submit a project to the showcase. Requires editor role on the project. Creates a pending entry. */
export const POST = handler(async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, submitSchema);
  await assertProjectAccess(user, body.projectId, "editor");
  await enforceRateLimit(`showcase:submit:${user.id}`, 10, 60 * 60 * 1000);
  const entry = await submit({ ...body, liveUrl: body.liveUrl ?? null, submittedBy: user.id });
  return json({ entry: { id: entry.id, slug: entry.slug, title: entry.title, status: "pending" as const } }, { status: 201 });
});
