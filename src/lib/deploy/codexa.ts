import "server-only";
import { env } from "@/lib/env";
import { runner, runnerHealth, RunnerRequestError, RunnerUnavailableError } from "@/lib/runtime/client";
import { DeployError, type DeployProvider } from "./types";

/**
 * Codexa static hosting: the runner builds the project in a sandbox and
 * serves the output at https://<slug>.<DEPLOY_HOST>. Only static output
 * (static sites and Vite builds) can be hosted; server frameworks must use
 * another provider.
 */
export const codexaProvider: DeployProvider = {
  id: "codexa",
  name: `Codexa hosting (${env.DEPLOY_HOST})`,
  async availability() {
    const h = await runnerHealth();
    return h.ok ? { available: true, reason: null } : { available: false, reason: `The runner service is not reachable at ${env.RUNNER_URL}: ${h.error ?? "unknown error"}` };
  },
  async deploy(req) {
    try {
      const res = await runner.deploy({
        projectId: req.project.id,
        deploymentId: req.deploymentId,
        framework: req.project.framework,
        settings: req.project.settings ?? {},
        files: req.files,
        slug: req.slug,
      });
      return { url: res.url, log: res.log, providerDeploymentId: req.deploymentId };
    } catch (err) {
      if (err instanceof RunnerRequestError) throw new DeployError(err.message, err.log ?? "", err.code);
      if (err instanceof RunnerUnavailableError) throw new DeployError(err.message, "", "runner_unavailable");
      throw err;
    }
  },
  async rollback(req) {
    try {
      const res = await runner.setAlias(req.slug, req.deploymentId);
      return { url: res.url };
    } catch (err) {
      if (err instanceof RunnerRequestError) throw new DeployError(err.message, "", err.code);
      throw err;
    }
  },
};
