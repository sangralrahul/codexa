import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { syncRuntime } from "@/lib/services/runtime";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ paths: z.array(z.string().min(1).max(512)).max(2000).optional() });

/** POST /projects/:id/runtime/sync { paths? } → pushes changed files (or everything) into the sandbox. */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  const res = await syncRuntime(project, body.paths);
  if (!res) return json({ synced: false, written: 0, deleted: 0, reason: "No runtime is running for this project" });
  return json({ synced: true, written: res.written, deleted: res.deleted });
});
