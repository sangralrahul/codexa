import "server-only";
import { env, runtimeSetupHint } from "@/lib/env";
import { hostFor } from "@/lib/hosts";
import { requireBinding } from "@/lib/cloudflare/bindings";
import { runnerFor, runnerHealth, runtimeMode, RunnerRequestError, RunnerUnavailableError, type BuiltFile } from "@/lib/runtime/client";
import { DeployError, type DeployProvider } from "./types";

/**
 * Codexa static hosting: the project is built in its sandbox and served at
 * <protocol>://<slug>.<DEPLOY_HOST> (see src/lib/hosts.ts). Only static output (static sites and Vite
 * builds) can be hosted; server frameworks must use another provider.
 *
 * On Cloudflare the build runs in the project's container and the output is
 * uploaded to R2 (sites/<deploymentId>/...); the Worker serves whichever
 * deployment is live, so rollback is a status change. With a self-hosted
 * runner, the runner stores and serves the files itself.
 */
const siteUrl = (slug: string) => `${env.PREVIEW_PROTOCOL}://${hostFor(slug, env.DEPLOY_HOST)}/`;

async function uploadToR2(deploymentId: string, files: BuiltFile[]) {
  const bucket = requireBinding("STORAGE");
  for (let i = 0; i < files.length; i += 8) {
    await Promise.all(
      files.slice(i, i + 8).map((f) => bucket.put(`sites/${deploymentId}/${f.path}`, Uint8Array.from(Buffer.from(f.contentBase64, "base64")))),
    );
  }
}

export const codexaProvider: DeployProvider = {
  id: "codexa",
  name: `Codexa hosting (${env.DEPLOY_HOST})`,
  async availability() {
    const h = await runnerHealth();
    if (h.ok) return { available: true, reason: null };
    return { available: false, reason: runtimeMode() ? `The runtime is not reachable: ${h.error ?? "unknown error"}` : (runtimeSetupHint() ?? "No runtime is configured for this deployment.") };
  },
  async deploy(req) {
    const r = runnerFor(req.project.id);
    try {
      const res = await r.deploy({
        deploymentId: req.deploymentId,
        framework: req.project.framework,
        settings: req.project.settings ?? {},
        files: req.files,
        slug: req.slug,
      });
      if (runtimeMode() !== "containers") return { url: res.url, log: res.log, providerDeploymentId: req.deploymentId };
      const { files, totalBytes } = await r.deploymentFiles(req.deploymentId);
      await uploadToR2(req.deploymentId, files);
      return {
        url: siteUrl(req.slug),
        log: `${res.log}\nUploaded ${files.length} files (${Math.round(totalBytes / 1024)} KB) to Cloudflare R2.\n`,
        providerDeploymentId: req.deploymentId,
      };
    } catch (err) {
      if (err instanceof RunnerRequestError) throw new DeployError(err.message, err.log ?? "", err.code);
      if (err instanceof RunnerUnavailableError) throw new DeployError(err.message, "", "runner_unavailable");
      throw err;
    }
  },
  async rollback(req) {
    // On Cloudflare the Worker serves the deployment marked live in D1.
    if (runtimeMode() === "containers") return { url: siteUrl(req.slug) };
    try {
      const res = await runnerFor(req.project.id).setAlias(req.slug, req.deploymentId);
      return { url: res.url };
    } catch (err) {
      if (err instanceof RunnerRequestError) throw new DeployError(err.message, "", err.code);
      throw err;
    }
  },
};
