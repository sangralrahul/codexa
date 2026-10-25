import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { stopRuntime, toSessionDto } from "@/lib/services/runtime";

type Ctx = { params: Promise<{ id: string }> };

/** POST /projects/:id/runtime/stop → { session | null } */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const row = await stopRuntime(project, user.id);
  return json({ session: row ? toSessionDto(row) : null });
});
