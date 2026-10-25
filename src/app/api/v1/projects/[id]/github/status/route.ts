import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { capabilities } from "@/lib/env";
import { getGithubAccountDto } from "@/lib/github/accounts";
import { projectGithubStatus } from "@/lib/github/sync";
import { githubFor } from "@/app/api/v1/integrations/github/_lib";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/projects/:id/github/status
 * → { configured, account, project: { repo, branch }, status: { linked, added, changed, deleted, aheadBy, behindBy, head, ... } | null }
 * Never throws for "not configured" / "not linked": the panel renders those states.
 */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "viewer");
  const account = await getGithubAccountDto(user.id);
  const base = {
    configured: capabilities.github,
    missing: capabilities.github ? [] : ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    account,
    project: { repo: project.githubRepo, branch: project.githubBranch },
  };
  if (!capabilities.github || !account.linked || !project.githubRepo) return json({ ...base, status: null, error: null });
  try {
    const { client } = await githubFor(user, "status");
    const status = await projectGithubStatus({ client, project });
    return json({ ...base, status, error: null });
  } catch (err) {
    // Surface GitHub-side failures (expired token, deleted repo) as data so the panel can explain them.
    const message = err instanceof Error ? err.message : "Could not read the repository status";
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "github_error";
    if (code === "rate_limited") throw err;
    return json({ ...base, status: null, error: { code, message } });
  }
});
