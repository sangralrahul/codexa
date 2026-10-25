import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { startRuntime, toSessionDto } from "@/lib/services/runtime";

type Ctx = { params: Promise<{ id: string }> };

/** POST /projects/:id/runtime/start → { session: { id, status, previewUrl } } */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace } = await assertProjectAccess(user, id, "editor");
  await enforceRateLimit(`runtime:start:${user.id}`, 30, 60_000);
  const row = await startRuntime({ project, workspace, user });
  return json({ session: toSessionDto(row) }, { status: row.status === "running" ? 200 : 201 });
});
