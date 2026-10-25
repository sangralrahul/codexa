import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { createSnapshot, listSnapshots, logActivity } from "@/lib/services/projects";
import { enforceRateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const snapshots = await listSnapshots(id);
  return json({ snapshots });
});

const schema = z.object({
  name: z.string().trim().min(1, "Give this checkpoint a name").max(100),
  message: z.string().trim().max(500).optional(),
});

export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  await enforceRateLimit(`snapshots:create:${id}`, 120, 60 * 60 * 1000);
  const snapshot = await createSnapshot(id, { name: body.name, message: body.message, kind: "manual", createdBy: user.id });
  await logActivity(id, user.id, "snapshot.created", `Created checkpoint "${snapshot.name}"`, { snapshotId: snapshot.id });
  return json({ snapshot }, { status: 201 });
});
