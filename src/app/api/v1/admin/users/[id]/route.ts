import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiAdmin } from "../../_lib";
import { updateUser } from "@/lib/billing/admin-service";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ role: z.enum(["user", "staff", "admin"]).optional(), suspended: z.boolean().optional() });

/** PATCH /api/v1/admin/users/:id { role?, suspended? } (role changes: admin only) */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const actor = await requireApiAdmin();
  const { id } = await ctx.params;
  const body = await parseBody(req, schema);
  return json({ user: await updateUser(actor, id, body) });
});
