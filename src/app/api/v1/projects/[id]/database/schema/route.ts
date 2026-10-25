import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { inspectSchema } from "@/lib/integrations/database";
import { connectionForProject, mapDatabaseError } from "../_lib";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/projects/:id/database/schema?connectionId= → { connection, schemas, tables } (viewer) */
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "viewer");
  const connectionId = new URL(req.url).searchParams.get("connectionId");
  const conn = await connectionForProject(project.workspaceId, connectionId);
  await enforceRateLimit(`database:schema:${id}`, 120, 10 * 60 * 1000);
  try {
    const result = await inspectSchema(conn);
    return json({ connection: { id: conn.id, name: conn.name, provider: conn.provider }, ...result });
  } catch (err) {
    return mapDatabaseError(err);
  }
});
