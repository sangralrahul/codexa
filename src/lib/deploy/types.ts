import type { Project } from "@/db/schema";

export type DeployProviderId = "codexa" | "vercel";

export type DeployRequest = {
  deploymentId: string;
  project: Project;
  /** Globally unique DNS label for Codexa hosting / project name for Vercel. */
  slug: string;
  files: Record<string, string>;
  /** Decrypted env vars for build-time use. Never logged or returned. */
  env: Record<string, string>;
  onLog?: (line: string) => void;
};

export type DeployOutcome = { url: string; log: string; providerDeploymentId: string | null };

export class DeployError extends Error {
  constructor(
    message: string,
    public log: string = "",
    public code: string = "build_failed",
  ) {
    super(message);
  }
}

export interface DeployProvider {
  id: DeployProviderId;
  name: string;
  /** Whether the provider can be used on this instance (env configured, runner reachable). */
  availability(): Promise<{ available: boolean; reason: string | null }>;
  deploy(req: DeployRequest): Promise<DeployOutcome>;
  /** Point the project's URL at an older deployment. */
  rollback(req: { project: Project; slug: string; providerDeploymentId: string | null; deploymentId: string }): Promise<{ url: string }>;
}
