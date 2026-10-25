import { after } from "next/server";
import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { createDeployment, deploymentProviders, domainInstructions, listDeployments, runDeployment, toDeploymentDto } from "@/lib/services/deployments";
import { logger } from "@/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

/** GET /projects/:id/deployments → { deployments, providers, domain } */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace } = await assertProjectAccess(user, id, "viewer");
  const [rows, providers] = await Promise.all([listDeployments(project.id), deploymentProviders()]);
  return json({ deployments: rows.map((r) => toDeploymentDto(r)), ...providers, domain: domainInstructions(project, workspace) });
});

const schema = z.object({ provider: z.enum(["codexa", "vercel"]).default("codexa"), wait: z.boolean().optional() });

/** POST /projects/:id/deployments { provider } → { deployment } (build continues after the response; poll GET /:did). */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace } = await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  await enforceRateLimit(`deploy:${user.id}`, 20, 60_000);
  const row = await createDeployment({ project, workspace, user, provider: body.provider });
  if (body.wait) {
    const done = await runDeployment(row.id);
    return json({ deployment: toDeploymentDto(done, { withLog: true }) }, { status: 201 });
  }
  after(async () => {
    try {
      await runDeployment(row.id);
    } catch (err) {
      logger.error("deployment runner crashed", { deploymentId: row.id, error: err instanceof Error ? err : String(err) });
    }
  });
  return json({ deployment: toDeploymentDto(row) }, { status: 202 });
});
