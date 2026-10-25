import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiAdmin } from "../_lib";
import { listFlags, upsertFlag } from "@/lib/billing/admin-service";

const schema = z.object({
  key: z.string().trim().min(2).max(64),
  enabled: z.boolean().optional(),
  description: z.string().trim().max(300).optional(),
  rules: z.record(z.string(), z.unknown()).optional(),
});

/** GET /api/v1/admin/feature-flags */
export const GET = handler(async () => {
  await requireApiAdmin();
  return json({ flags: await listFlags() });
});

/** POST /api/v1/admin/feature-flags { key, enabled?, description?, rules? } (create or update) */
export const POST = handler(async (req) => {
  const actor = await requireApiAdmin();
  const body = await parseBody(req, schema);
  return json({ flag: await upsertFlag(actor, body) }, { status: 201 });
});
