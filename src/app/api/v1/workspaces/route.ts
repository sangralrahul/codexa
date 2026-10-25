import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { createWorkspace, listUserWorkspaces } from "@/lib/services/workspaces";
import { serializeWorkspace } from "@/app/api/v1/projects/_lib/serialize";
import { enforceRateLimit } from "@/lib/rate-limit";

export const GET = handler(async () => {
  const user = await requireApiUser();
  const rows = await listUserWorkspaces(user.id);
  return json({ workspaces: rows.map((r) => ({ workspace: serializeWorkspace(r.workspace), role: r.role })) });
});

const createSchema = z.object({ name: z.string().trim().min(2, "Name must be at least 2 characters").max(60) });

export const POST = handler(async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, createSchema);
  await enforceRateLimit(`workspaces:create:${user.id}`, 10, 60 * 60 * 1000);
  const workspace = await createWorkspace(user.id, body.name);
  return json({ workspace: serializeWorkspace(workspace, "owner") }, { status: 201 });
});
