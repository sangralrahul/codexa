import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiAdmin } from "../../_lib";
import { setAbuseStatus } from "@/lib/billing/admin-service";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(["open", "in_progress", "closed"]) });

/** PATCH /api/v1/admin/abuse/:id { status } */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const actor = await requireApiAdmin();
  const { id } = await ctx.params;
  const body = await parseBody(req, schema);
  return json({ report: await setAbuseStatus(actor, id, body.status) });
});
