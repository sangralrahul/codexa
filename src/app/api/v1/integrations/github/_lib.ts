import "server-only";
import { ApiError } from "@/lib/api";
import { capabilities } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireGithubClient } from "@/lib/github/accounts";
import type { User } from "@/db/schema";

export const GITHUB_NOT_CONFIGURED = "GitHub integration is not configured on this server (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET are missing).";

/** Rate limit + resolve the caller's GitHub client. Throws 503 when the OAuth app is not configured, 412 when not linked. */
export async function githubFor(user: Pick<User, "id">, scope: string) {
  await enforceRateLimit(`github:${scope}:${user.id}`, 60, 10 * 60 * 1000);
  if (!capabilities.github) throw new ApiError(503, GITHUB_NOT_CONFIGURED, "not_configured", { missing: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"] });
  return requireGithubClient(user.id);
}
