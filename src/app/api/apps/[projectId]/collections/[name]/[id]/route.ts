import { deleteRecord, getRecord, updateRecord } from "@/lib/services/cloud";
import { appRoute, ok, parseRecordBody, preflight } from "../../../_lib";

type P = { projectId: string; name: string; id: string };

/** GET /api/apps/:projectId/collections/:name/:id → { data: record } */
export const GET = appRoute<P>(async (_req, { projectId, params, actor }) => ok(await getRecord(projectId, params.name, params.id, await actor())));

/** PATCH /api/apps/:projectId/collections/:name/:id  { ...fields } → shallow merge; owner only. */
export const PATCH = appRoute<P>(async (req, { projectId, params, actor }) => {
  const body = await parseRecordBody(req);
  return ok(await updateRecord(projectId, params.name, params.id, await actor(), body));
});

/** DELETE /api/apps/:projectId/collections/:name/:id → owner only. */
export const DELETE = appRoute<P>(async (_req, { projectId, params, actor }) => {
  await deleteRecord(projectId, params.name, params.id, await actor());
  return ok({ id: params.id, deleted: true });
});

export const OPTIONS = preflight;
