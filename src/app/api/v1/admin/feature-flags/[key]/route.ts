import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiAdmin } from "../../_lib";
import { deleteFlag, upsertFlag } from "@/lib/billing/admin-service";

type Ctx = { params: Promise<{ key: string }> };
const schema = z.object({ enabled: z.boolean().optional(), description: z.string().trim().max(300).optional(), rules: z.record(z.string(), z.unknown()).optional() });

/** PATCH /api/v1/admin/feature-flags/:key { enabled?, description?, rules? } */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const actor = await requireApiAdmin();
  const { key } = await ctx.params;
  const body = await parseBody(req, schema);
  return json({ flag: await upsertFlag(actor, { key, ...body }) });
});

/** DELETE /api/v1/admin/feature-flags/:key */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const actor = await requireApiAdmin();
  const { key } = await ctx.params;
  await deleteFlag(actor, key);
  return json({ ok: true });
});
