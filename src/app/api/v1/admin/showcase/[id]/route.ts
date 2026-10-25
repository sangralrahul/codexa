import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiAdmin } from "../../_lib";
import { reviewShowcase } from "@/lib/billing/admin-service";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ action: z.enum(["approve", "reject"]) });

/** PATCH /api/v1/admin/showcase/:id { action: 'approve' | 'reject' } */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const actor = await requireApiAdmin();
  const { id } = await ctx.params;
  const body = await parseBody(req, schema);
  return json({ entry: await reviewShowcase(actor, id, body.action) });
});
