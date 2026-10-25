import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { listConnections } from "@/lib/integrations/connections";
import { listProviderDtos } from "./_lib";

/**
 * GET /api/v1/integrations?workspaceId=
 * Directory of providers (with platform-level configured flags) plus, when a workspace is
 * given and the caller is a member, that workspace's connections (secrets masked).
 */
export const GET = handler(async (req) => {
  const user = await requireApiUser();
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  const providers = listProviderDtos();
  let connections: Awaited<ReturnType<typeof listConnections>> = [];
  if (workspaceId) {
    await assertWorkspaceRole(user, workspaceId, "viewer");
    connections = await listConnections(workspaceId);
  }
  return json({ providers, connections });
});
