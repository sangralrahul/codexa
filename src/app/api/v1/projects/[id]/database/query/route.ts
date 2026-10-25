import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { runQuery } from "@/lib/integrations/database";
import { logActivity } from "@/lib/services/projects";
import { QUERY_ROW_LIMIT } from "@/lib/integrations/types";
import { connectionForProject, mapDatabaseError } from "../_lib";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  connectionId: z.string().min(1),
  sql: z.string().min(1, "SQL is required").max(50_000),
  confirmDestructive: z.boolean().optional(),
});

/**
 * POST /api/v1/projects/:id/database/query { connectionId, sql, confirmDestructive? }
 * → { rows, fields, rowCount, durationMs, command, truncated, readOnly } (editor)
 * 409 confirmation_required when the SQL is destructive and confirmDestructive is not true.
 */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  const conn = await connectionForProject(project.workspaceId, body.connectionId);
  await enforceRateLimit(`database:query:${id}`, 300, 10 * 60 * 1000);
  try {
    const result = await runQuery(conn, body.sql, { confirmDestructive: body.confirmDestructive === true, rowLimit: QUERY_ROW_LIMIT });
    if (!result.readOnly) {
      await logActivity(id, user.id, "database.query", `Ran ${result.command ?? "SQL"} on ${conn.name}`, { connectionId: conn.id, command: result.command, rowCount: result.rowCount });
    }
    return json(result);
  } catch (err) {
    return mapDatabaseError(err);
  }
});
