import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, runBatch } from "@/db";
import { deployments, projects, type Deployment, type Project, type User, type Workspace } from "@/db/schema";
import { ApiError, badRequest, conflict, forbidden, notFound } from "@/lib/api";
import { logger } from "@/lib/logger";
import { createSnapshot, logActivity, getSnapshot } from "@/lib/services/projects";
import { getEnvVarsDecrypted } from "@/lib/services/env-vars";
import { assertQuota, recordUsage } from "@/lib/services/usage";
import { DeployError, getDeployProvider, listDeployProviders, type DeployProviderId } from "@/lib/deploy";
import { env } from "@/lib/env";
import type { DeploymentDto } from "@/lib/runtime/types";

/**
 * Deployments: snapshot → queued → building → live | failed, with rollback.
 * Builds run in the runner (Codexa hosting) or at the provider (Vercel); the
 * Next.js process never executes project code.
 */

export function toDeploymentDto(row: Deployment, opts: { withLog?: boolean } = {}): DeploymentDto {
  return {
    id: row.id,
    projectId: row.projectId,
    provider: row.provider as DeploymentDto["provider"],
    status: row.status,
    url: row.url,
    providerDeploymentId: row.providerDeploymentId,
    snapshotId: row.snapshotId,
    error: row.error,
    config: row.config,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    ...(opts.withLog ? { buildLog: row.buildLog } : {}),
  };
}

/** Globally unique, DNS-safe label: <workspace slug>-<project slug>, max 63 chars. */
export function siteSlug(workspace: Pick<Workspace, "slug">, project: Pick<Project, "slug" | "id">): string {
  const raw = `${workspace.slug}-${project.slug}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (raw.length <= 63) return raw || `p-${project.id.slice(0, 8)}`;
  return `${raw.slice(0, 54).replace(/-$/, "")}-${project.id.slice(0, 8)}`;
}

export async function listDeployments(projectId: string, limit = 50) {
  return db.select().from(deployments).where(eq(deployments.projectId, projectId)).orderBy(desc(deployments.createdAt)).limit(limit);
}

export async function getDeployment(projectId: string, deploymentId: string): Promise<Deployment | null> {
  const rows = await db
    .select()
    .from(deployments)
    .where(and(eq(deployments.projectId, projectId), eq(deployments.id, deploymentId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCurrentDeployment(projectId: string, provider: DeployProviderId): Promise<Deployment | null> {
  const rows = await db
    .select()
    .from(deployments)
    .where(and(eq(deployments.projectId, projectId), eq(deployments.provider, provider), eq(deployments.status, "live")))
    .orderBy(desc(deployments.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function deploymentProviders() {
  const list = await listDeployProviders();
  return { providers: list, deployHost: env.DEPLOY_HOST, previewProtocol: env.PREVIEW_PROTOCOL };
}

export type CreateDeploymentInput = { project: Project; workspace: Workspace; user: User; provider: DeployProviderId };

/**
 * Validate, snapshot and queue a deployment. The build itself runs in
 * `runDeployment` (called by the route after the response is sent, or
 * directly by tests).
 */
export async function createDeployment({ project, workspace, user, provider }: CreateDeploymentInput): Promise<Deployment> {
  if (!user.emailVerifiedAt) throw forbidden("Verify your email address before publishing a project");
  const p = getDeployProvider(provider);
  const availability = await p.availability();
  if (!availability.available) throw new ApiError(provider === "vercel" ? 400 : 503, availability.reason ?? `${p.name} is not available`, provider === "vercel" ? "not_configured" : "runner_unavailable");
  if (provider === "codexa" && (project.framework === "node-express" || project.framework === "nextjs")) {
    throw badRequest(`Codexa hosting serves static output only; ${project.framework} projects need a server. Use Vercel or export a static build.`);
  }
  const inFlight = await db
    .select({ id: deployments.id })
    .from(deployments)
    .where(and(eq(deployments.projectId, project.id), eq(deployments.status, "building")))
    .limit(1);
  if (inFlight.length) throw conflict("A deployment is already building for this project");
  await assertQuota(workspace.id, "deployment", 1);

  const slug = siteSlug(workspace, project);
  const snapshot = await createSnapshot(project.id, { name: `Deploy ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, kind: "deploy", createdBy: user.id });
  const [row] = await db
    .insert(deployments)
    .values({ projectId: project.id, provider, status: "queued", snapshotId: snapshot.id, createdBy: user.id, config: { slug, framework: project.framework, settings: project.settings ?? {} } })
    .returning();
  await recordUsage({ workspaceId: workspace.id, projectId: project.id, userId: user.id, kind: "deployment", quantity: 1, metadata: { deploymentId: row.id, provider } });
  await logActivity(project.id, user.id, "deployment.queued", `Queued a ${p.name} deployment`, { deploymentId: row.id, provider });
  return row;
}

/** Execute a queued deployment to completion. Safe to call once per deployment. */
export async function runDeployment(deploymentId: string): Promise<Deployment> {
  const rows = await db.select().from(deployments).where(eq(deployments.id, deploymentId)).limit(1);
  const row = rows[0];
  if (!row) throw notFound("Deployment");
  if (row.status !== "queued") return row;
  const projectRows = await db.select().from(projects).where(eq(projects.id, row.projectId)).limit(1);
  const project = projectRows[0];
  if (!project) throw notFound("Project");
  const provider = getDeployProvider(row.provider as DeployProviderId);
  const slug = String(row.config.slug ?? "");
  await db.update(deployments).set({ status: "building", buildLog: "Build started\n" }).where(eq(deployments.id, row.id));
  try {
    const snapshot = row.snapshotId ? await getSnapshot(project.id, row.snapshotId) : null;
    const files = snapshot?.files;
    if (!files) throw new DeployError("The deployment snapshot is missing", "", "bad_request");
    const envVars = await getEnvVarsDecrypted(project.id);
    const outcome = await provider.deploy({ deploymentId: row.id, project, slug, files, env: envVars });
    const previous = await getCurrentDeployment(project.id, row.provider as DeployProviderId);
    const [updated] = await db
      .update(deployments)
      .set({ status: "live", url: outcome.url, providerDeploymentId: outcome.providerDeploymentId, buildLog: outcome.log, error: null, finishedAt: new Date() })
      .where(eq(deployments.id, row.id))
      .returning();
    if (previous && previous.id !== row.id) await db.update(deployments).set({ status: "rolled_back" }).where(eq(deployments.id, previous.id));
    await logActivity(project.id, row.createdBy, "deployment.live", `Deployment is live at ${outcome.url}`, { deploymentId: row.id, url: outcome.url, provider: row.provider });
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const log = err instanceof DeployError ? err.log : "";
    logger.warn("deployment failed", { deploymentId: row.id, error: message });
    const [updated] = await db
      .update(deployments)
      .set({ status: "failed", error: message, buildLog: log || `Build failed: ${message}`, finishedAt: new Date() })
      .where(eq(deployments.id, row.id))
      .returning();
    await logActivity(project.id, row.createdBy, "deployment.failed", `Deployment failed: ${message.slice(0, 200)}`, { deploymentId: row.id, provider: row.provider });
    return updated;
  }
}

export async function rollbackDeployment(project: Project, deploymentId: string, user: Pick<User, "id">): Promise<Deployment> {
  const target = await getDeployment(project.id, deploymentId);
  if (!target) throw notFound("Deployment");
  if (target.status !== "rolled_back" && target.status !== "live") throw badRequest(`Only deployments that were live can be restored (this one is ${target.status})`);
  if (!target.url) throw badRequest("This deployment has no URL to restore");
  const current = await getCurrentDeployment(project.id, target.provider as DeployProviderId);
  if (current?.id === target.id) return target;
  const provider = getDeployProvider(target.provider as DeployProviderId);
  const slug = String(target.config.slug ?? "");
  const { url } = await provider.rollback({ project, slug, providerDeploymentId: target.providerDeploymentId, deploymentId: target.id });
  await runBatch([
    ...(current ? [db.update(deployments).set({ status: "rolled_back" }).where(eq(deployments.id, current.id))] : []),
    db.update(deployments).set({ status: "live", url, error: null }).where(eq(deployments.id, target.id)),
  ]);
  await logActivity(project.id, user.id, "deployment.rolled_back", `Rolled back to deployment ${target.id.slice(0, 8)}`, { deploymentId: target.id, from: current?.id ?? null });
  return (await getDeployment(project.id, target.id)) ?? target;
}

export function domainInstructions(project: Pick<Project, "slug" | "id">, workspace: Pick<Workspace, "slug">) {
  const slug = siteSlug(workspace, project);
  return {
    host: `${slug}.${env.DEPLOY_HOST}`,
    cname: env.DEPLOY_HOST.replace(/:\d+$/, ""),
    verificationSupported: false as const,
    note: "Custom domain verification is not implemented yet. Point a CNAME at the host above and contact support to attach it; automatic verification is on the roadmap.",
  };
}
