import { handler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { adminDeleteRecord } from "@/lib/services/cloud";

type Ctx = { params: Promise<{ id: string; name: string; recordId: string }> };

/** DELETE /cloud/collections/:name/records/:recordId */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, name, recordId } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  await adminDeleteRecord(id, name, recordId);
  return new Response(null, { status: 204 });
});
