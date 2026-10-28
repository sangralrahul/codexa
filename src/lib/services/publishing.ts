import "server-only";
import { and, asc, eq, gte, ne, sql } from "drizzle-orm";
import { db, runBatch } from "@/db";
import { customDomains, deployments, projects, siteVisits, type Project, type User, type Workspace } from "@/db/schema";
import { ApiError, badRequest, conflict, notFound } from "@/lib/api";
import { env } from "@/lib/env";
import { hostBase, hostFor } from "@/lib/hosts";
import { randomToken } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { DeployError, getDeployProvider } from "@/lib/deploy";
import { logActivity } from "@/lib/services/projects";
import { getCurrentDeployment, siteSlug } from "@/lib/services/deployments";

/**
 * Publishing settings beyond "publish a version": the site's name (its address under DEPLOY_HOST),
 * taking a site offline, custom domains with DNS ownership checks, and page-view counts that the
 * Worker records for every page it serves (worker/sites.ts).
 */

const LABEL = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;
/** Names that would read as Codexa's own addresses or collide with the preview/site suffixes. */
const RESERVED = new Set(["www", "app", "api", "admin", "codexa", "mail", "status", "docs", "help", "support", "preview", "sites", "assets", "static", "cdn"]);

/** Validates a site name; returns an error message, or null when it can be used. */
export function siteNameError(name: string): string | null {
  if (name.length < 3) return "Use at least 3 characters.";
  if (name.length > 63) return "Use at most 63 characters.";
  if (!LABEL.test(name)) return "Use lowercase letters, numbers and hyphens, starting and ending with a letter or number.";
  if (name.includes("--")) return "Two hyphens in a row are not allowed.";
  if (RESERVED.has(name) || /-(preview|sites)$/.test(name)) return "That name is reserved. Try another.";
  return null;
}

/** The address a site is (or will be) served at. */
export function siteHost(slug: string) {
  return env.DEPLOY_HOST ? hostFor(slug, env.DEPLOY_HOST) : null;
}

export async function getPublishing(project: Project, workspace: Pick<Workspace, "slug">) {
  const slug = siteSlug(workspace, project);
  const live = await getCurrentDeployment(project.id, "codexa");
  const lastOffline = live
    ? null
    : await db
        .select({ id: deployments.id, config: deployments.config })
        .from(deployments)
        .where(and(eq(deployments.projectId, project.id), eq(deployments.provider, "codexa"), eq(deployments.status, "rolled_back")))
        .orderBy(sql`${deployments.createdAt} desc`)
        .limit(1)
        .then((r) => r[0] ?? null);
  return {
    siteName: slug,
    customName: Boolean(project.settings?.siteName),
    host: siteHost(slug),
    hostingConfigured: Boolean(env.DEPLOY_HOST),
    live: live ? { id: live.id, url: live.url, publishedAt: (live.finishedAt ?? live.createdAt).toISOString() } : null,
    offline: Boolean(lastOffline?.config && (lastOffline.config as Record<string, unknown>).unpublished),
  };
}

/** Is `name` free? It must not be another project's chosen name or another project's live site. */
async function assertNameFree(name: string, projectId: string) {
  const [taken] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(ne(projects.id, projectId), sql`json_extract(${projects.settings}, '$.siteName') = ${name}`))
    .limit(1);
  if (taken) throw conflict("That name is already taken. Try another.");
  const [liveElsewhere] = await db
    .select({ id: deployments.id })
    .from(deployments)
    .where(and(ne(deployments.projectId, projectId), eq(deployments.status, "live"), sql`json_extract(${deployments.config}, '$.slug') = ${name}`))
    .limit(1);
  if (liveElsewhere) throw conflict("That name is already taken. Try another.");
}

/**
 * Renames the site. The live version (if any) moves to the new address right away; the old
 * address stops serving it.
 */
export async function setSiteName(project: Project, workspace: Pick<Workspace, "slug">, user: Pick<User, "id">, rawName: string) {
  const name = rawName.trim().toLowerCase();
  const err = siteNameError(name);
  if (err) throw badRequest(err);
  const current = siteSlug(workspace, project);
  if (name === current) return getPublishing(project, workspace);
  await assertNameFree(name, project.id);

  const settings = { ...(project.settings ?? {}), siteName: name };
  const live = await getCurrentDeployment(project.id, "codexa");
  let url: string | null = null;
  if (live) {
    // Re-point the live version at the new name (a status-only change on Cloudflare; the local runner re-aliases).
    try {
      ({ url } = await getDeployProvider("codexa").rollback({ project, slug: name, providerDeploymentId: live.providerDeploymentId, deploymentId: live.id }));
    } catch (err) {
      if (err instanceof DeployError) throw new ApiError(503, `Hosting is unavailable right now, so the site could not be renamed: ${err.message}`, "hosting_unavailable");
      throw err;
    }
  }
  await runBatch([
    db.update(projects).set({ settings, updatedAt: new Date() }).where(eq(projects.id, project.id)),
    ...(live ? [db.update(deployments).set({ config: { ...live.config, slug: name }, url }).where(eq(deployments.id, live.id))] : []),
  ]);
  await logActivity(project.id, user.id, "deployment.renamed", `Site renamed from ${current} to ${name}`, { from: current, to: name });
  return getPublishing({ ...project, settings }, workspace);
}

/** Takes the site offline: the live version is kept in history (restore it with rollback). */
export async function unpublish(project: Project, user: Pick<User, "id">) {
  const live = await getCurrentDeployment(project.id, "codexa");
  if (!live) throw badRequest("This project has no live site.");
  await db
    .update(deployments)
    .set({ status: "rolled_back", config: { ...live.config, unpublished: true } })
    .where(eq(deployments.id, live.id));
  await logActivity(project.id, user.id, "deployment.unpublished", "Site taken offline", { deploymentId: live.id });
}

// ---------------------------------------------------------------------------
// Custom domains
// ---------------------------------------------------------------------------

const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export const CHALLENGE_PREFIX = "_codexa-challenge";

export function normalizeDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/** Validates a domain; returns an error message, or null. */
export function domainError(domain: string): string | null {
  if (!DOMAIN.test(domain)) return "Enter a domain like app.example.com.";
  const own = [hostBase(env.APP_URL), hostBase(env.DEPLOY_HOST)?.replace(/^-/, ""), hostBase(env.PREVIEW_HOST)?.replace(/^-/, "")].filter(Boolean) as string[];
  const ownZones = own.map((h) => h.split(".").slice(-2).join("."));
  if (ownZones.some((z) => domain === z || domain.endsWith(`.${z}`))) return "That domain belongs to Codexa. Use a domain you own.";
  return null;
}

export type DomainDto = {
  id: string;
  domain: string;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  records: { type: "CNAME" | "TXT"; name: string; value: string; purpose: string }[];
};

function toDomainDto(row: typeof customDomains.$inferSelect, target: string | null): DomainDto {
  const apex = row.domain.split(".").length === 2;
  return {
    id: row.id,
    domain: row.domain,
    verified: Boolean(row.verifiedAt),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    records: [
      { type: "TXT", name: `${CHALLENGE_PREFIX}.${row.domain}`, value: row.verificationToken, purpose: "Proves you own the domain" },
      ...(target
        ? [{ type: "CNAME" as const, name: row.domain, value: target, purpose: apex ? "Routes traffic to your site (use CNAME flattening or ALIAS at the root)" : "Routes traffic to your site" }]
        : []),
    ],
  };
}

export async function listDomains(project: Project, workspace: Pick<Workspace, "slug">) {
  const rows = await db.select().from(customDomains).where(eq(customDomains.projectId, project.id)).orderBy(asc(customDomains.createdAt));
  const target = siteHost(siteSlug(workspace, project));
  return rows.map((r) => toDomainDto(r, target?.replace(/:\d+$/, "") ?? null));
}

const MAX_DOMAINS = 5;

export async function addDomain(project: Project, workspace: Pick<Workspace, "slug">, user: Pick<User, "id">, raw: string) {
  const domain = normalizeDomain(raw);
  const err = domainError(domain);
  if (err) throw badRequest(err);
  const existing = await db.select({ id: customDomains.id, projectId: customDomains.projectId }).from(customDomains).where(eq(customDomains.domain, domain)).limit(1);
  if (existing[0]) throw conflict(existing[0].projectId === project.id ? "This domain is already added." : "This domain is connected to another project.");
  const count = await db.select({ n: sql<number>`count(*)` }).from(customDomains).where(eq(customDomains.projectId, project.id));
  if ((count[0]?.n ?? 0) >= MAX_DOMAINS) throw badRequest(`A project can have up to ${MAX_DOMAINS} domains.`);
  const [row] = await db.insert(customDomains).values({ projectId: project.id, domain, verificationToken: `codexa-verify=${randomToken(16)}` }).returning();
  await logActivity(project.id, user.id, "domain.added", `Added domain ${domain}`, { domain });
  return (await listDomains(project, workspace)).find((d) => d.id === row.id)!;
}

export async function removeDomain(project: Project, user: Pick<User, "id">, domainId: string) {
  const [row] = await db.select().from(customDomains).where(and(eq(customDomains.id, domainId), eq(customDomains.projectId, project.id))).limit(1);
  if (!row) throw notFound("Domain");
  await db.delete(customDomains).where(eq(customDomains.id, row.id));
  await logActivity(project.id, user.id, "domain.removed", `Removed domain ${row.domain}`, { domain: row.domain });
}

/** TXT values for `name`, through Cloudflare's DNS-over-HTTPS resolver (works from the Worker). */
export async function lookupTxt(name: string, fetcher: typeof fetch = fetch): Promise<string[]> {
  const res = await fetcher(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, { headers: { accept: "application/dns-json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
  const body = (await res.json()) as { Answer?: { type: number; data: string }[] };
  return (body.Answer ?? []).filter((a) => a.type === 16).map((a) => a.data.replace(/^"|"$/g, "").replace(/"\s*"/g, ""));
}

export async function verifyDomain(project: Project, workspace: Pick<Workspace, "slug">, user: Pick<User, "id">, domainId: string, fetcher: typeof fetch = fetch) {
  const [row] = await db.select().from(customDomains).where(and(eq(customDomains.id, domainId), eq(customDomains.projectId, project.id))).limit(1);
  if (!row) throw notFound("Domain");
  if (!row.verifiedAt) {
    let values: string[];
    try {
      values = await lookupTxt(`${CHALLENGE_PREFIX}.${row.domain}`, fetcher);
    } catch (err) {
      logger.warn("domain verification lookup failed", { domain: row.domain, error: err instanceof Error ? err.message : String(err) });
      throw badRequest("We could not reach DNS right now. Try again in a minute.");
    }
    if (!values.includes(row.verificationToken)) {
      throw badRequest(
        values.length
          ? `Found a TXT record at ${CHALLENGE_PREFIX}.${row.domain}, but not the expected value. DNS changes can take a few minutes.`
          : `No TXT record found at ${CHALLENGE_PREFIX}.${row.domain} yet. DNS changes can take a few minutes.`,
      );
    }
    await db.update(customDomains).set({ verifiedAt: new Date() }).where(eq(customDomains.id, row.id));
    await logActivity(project.id, user.id, "domain.verified", `Verified domain ${row.domain}`, { domain: row.domain });
  }
  return (await listDomains(project, workspace)).find((d) => d.id === row.id)!;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getAnalytics(projectId: string, days = 30) {
  const start = new Date(Date.now() - (days - 1) * 86_400_000);
  const from = start.toISOString().slice(0, 10);
  const rows = await db
    .select({ day: siteVisits.day, views: siteVisits.views })
    .from(siteVisits)
    .where(and(eq(siteVisits.projectId, projectId), gte(siteVisits.day, from)))
    .orderBy(asc(siteVisits.day));
  const byDay = new Map(rows.map((r) => [r.day, r.views]));
  const series = Array.from({ length: days }, (_, i) => {
    const day = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return { day, views: byDay.get(day) ?? 0 };
  });
  const total = series.reduce((a, b) => a + b.views, 0);
  const last7 = series.slice(-7).reduce((a, b) => a + b.views, 0);
  const prev7 = series.slice(-14, -7).reduce((a, b) => a + b.views, 0);
  return { days, series, total, last7, prev7 };
}
