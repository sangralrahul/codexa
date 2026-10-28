import "server-only";
import { requireBinding } from "@/lib/cloudflare/bindings";
import { getJson, putJson } from "@/lib/storage";
import { getDeployment } from "./deployments";
import { siteReport, type SiteFile, type SiteReport } from "./site-checks";

const MAX_FILES = 400;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** Built files of a Codexa deployment from R2 (sites/<id>/…); empty when the runner hosts them itself. */
async function filesFromR2(deploymentId: string): Promise<SiteFile[]> {
  const bucket = requireBinding("STORAGE");
  const prefix = `sites/${deploymentId}/`;
  const out: SiteFile[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor });
    for (const o of page.objects) {
      if (out.length >= MAX_FILES || o.size > MAX_FILE_BYTES) continue;
      const obj = await bucket.get(o.key);
      if (obj) out.push({ path: o.key.slice(prefix.length), bytes: new Uint8Array(await obj.arrayBuffer()) });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor && out.length < MAX_FILES);
  return out;
}

/** Self-hosted runner: read index.html and the files it links from the live URL. */
async function filesFromUrl(url: string): Promise<SiteFile[]> {
  const get = async (u: string) => {
    const res = await fetch(u, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  };
  const index = await get(url);
  const out: SiteFile[] = [{ path: "index.html", bytes: index }];
  const html = new TextDecoder().decode(index);
  for (const m of [...html.matchAll(/<(?:script[^>]+src|link[^>]+href)=["']\/?([^"'?#:]+)["']/g)].slice(0, 20)) {
    try {
      out.push({ path: m[1].replace(/^\.\//, ""), bytes: await get(new URL(m[1], url).toString()) });
    } catch {
      /* a missing asset is reported by the size totals */
    }
  }
  return out;
}

export type DeploymentReport = { deploymentId: string; url: string | null; createdAt: string; report: SiteReport };

/** Speed & SEO report for a published Codexa deployment (computed once, then cached in R2). */
export async function getDeploymentReport(projectId: string, deploymentId: string): Promise<DeploymentReport | null> {
  const dep = await getDeployment(projectId, deploymentId);
  if (!dep || dep.provider !== "codexa" || !["live", "rolled_back"].includes(dep.status)) return null;
  const key = `reports/${projectId}/${deploymentId}.json`;
  const cached = await getJson<DeploymentReport>(key).catch(() => null);
  if (cached) return cached;
  let files = await filesFromR2(deploymentId);
  if (!files.length && dep.url) files = await filesFromUrl(dep.url).catch(() => []);
  if (!files.length) return null;
  const result: DeploymentReport = { deploymentId, url: dep.url, createdAt: new Date().toISOString(), report: await siteReport(files) };
  await putJson(key, result).catch(() => {});
  return result;
}
