import { z } from "zod";
import { badRequest, handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createConnection, listConnections } from "@/lib/integrations/connections";
import { audit } from "@/lib/audit";
import { getIntegration, secretFieldKeys } from "@/config/integrations";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/workspaces/:id/integrations → { connections } (secret values never returned) */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertWorkspaceRole(user, id, "viewer");
  return json({ connections: await listConnections(id) });
});

const stringMap = z.record(z.string().max(100), z.string().max(4000));

const createSchema = z.object({
  provider: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1, "Give the connection a name").max(100),
  config: stringMap.default({}),
  /** Either { fieldKey: value } or, for providers with a single secret field, the bare value. */
  secret: z.union([stringMap, z.string().max(4000)]).optional(),
});

function normalizeSecret(provider: string, secret: Record<string, string> | string | undefined): Record<string, string> | undefined {
  if (typeof secret !== "string") return secret;
  const def = getIntegration(provider);
  const keys = def ? secretFieldKeys(def) : [];
  if (keys.length !== 1) throw badRequest(`Provider ${provider} expects secret as an object keyed by field (${keys.join(", ") || "none"})`);
  return { [keys[0]]: secret };
}

/** POST /api/v1/workspaces/:id/integrations { provider, name, config, secret? } → { connection } (admin) */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertWorkspaceRole(user, id, "admin");
  const body = await parseBody(req, createSchema);
  await enforceRateLimit(`integrations:create:${id}`, 60, 60 * 60 * 1000);
  const connection = await createConnection({ workspaceId: id, provider: body.provider, name: body.name, config: body.config, secret: normalizeSecret(body.provider, body.secret), createdBy: user.id });
  await audit({ actorId: user.id, workspaceId: id, action: "integration.created", targetType: "integration_connection", targetId: connection.id, metadata: { provider: body.provider } });
  return json({ connection }, { status: 201 });
});
