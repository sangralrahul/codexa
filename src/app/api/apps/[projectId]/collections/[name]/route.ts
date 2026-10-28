import { z } from "zod";
import { badRequest } from "@/lib/api";
import { createRecord, listRecords } from "@/lib/services/cloud";
import { appRoute, ok, parseRecordBody, preflight } from "../../_lib";

type P = { projectId: string; name: string };

const whereSchema = z.record(z.string().max(64), z.union([z.string().max(1000), z.number(), z.boolean(), z.null()]));

/** GET /api/apps/:projectId/collections/:name?where={"done":false}&limit=50&cursor=… → { data: { items, nextCursor } } (newest first) */
export const GET = appRoute<P>(async (req, { projectId, params, actor }) => {
  const q = new URL(req.url).searchParams;
  let where: z.infer<typeof whereSchema> | undefined;
  const rawWhere = q.get("where");
  if (rawWhere) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawWhere);
    } catch {
      throw badRequest("where must be a JSON object");
    }
    const r = whereSchema.safeParse(parsed);
    if (!r.success) throw badRequest("where must map field names to a string, number, boolean or null");
    where = r.data;
  }
  const rawLimit = q.get("limit");
  const limit = rawLimit ? Number(rawLimit) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) throw badRequest("limit must be between 1 and 100");
  return ok(await listRecords(projectId, params.name, await actor(), { where, limit, cursor: q.get("cursor") }));
});

/** POST /api/apps/:projectId/collections/:name  { ...fields } → 201 { data: record } */
export const POST = appRoute<P>(async (req, { projectId, params, actor }) => {
  const body = await parseRecordBody(req);
  return ok(await createRecord(projectId, params.name, await actor(), body), 201);
});

export const OPTIONS = preflight;
