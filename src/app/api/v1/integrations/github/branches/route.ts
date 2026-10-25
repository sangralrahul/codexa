import { badRequest, handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { parseRepoFullName, GitHubError } from "@/lib/github/client";
import { githubFor } from "../_lib";

/** GET /api/v1/integrations/github/branches?repo=owner/name → { branches, defaultBranch } */
export const GET = handler(async (req) => {
  const user = await requireApiUser();
  const repoParam = new URL(req.url).searchParams.get("repo") ?? "";
  let parsed: { owner: string; repo: string };
  try {
    parsed = parseRepoFullName(repoParam);
  } catch (err) {
    throw badRequest(err instanceof GitHubError ? err.message : "Invalid repository");
  }
  const { client } = await githubFor(user, "branches");
  const [info, branches] = await Promise.all([client.getRepo(parsed.owner, parsed.repo), client.listBranches(parsed.owner, parsed.repo)]);
  return json({ branches, defaultBranch: info.defaultBranch, canPush: info.canPush, htmlUrl: info.htmlUrl });
});
