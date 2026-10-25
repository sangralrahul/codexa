import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiAdmin } from "../../_lib";
import { overridePlan } from "@/lib/billing/admin-service";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  plan: z.enum(["free", "pro", "team", "enterprise"]),
  periodEnd: z.union([z.string().datetime(), z.null()]).optional(),
  note: z.string().max(500).optional(),
});

/** PATCH /api/v1/admin/workspaces/:id { plan, periodEnd?, note? } — manual plan override (provider "manual"). */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const actor = await requireApiAdmin();
  const { id } = await ctx.params;
  const body = await parseBody(req, schema);
  return json(await overridePlan(actor, id, { plan: body.plan, periodEnd: body.periodEnd ? new Date(body.periodEnd) : null, note: body.note }));
});
