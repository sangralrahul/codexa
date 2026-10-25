import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { githubFor } from "../_lib";

/** GET /api/v1/integrations/github/repos?q=&page=&perPage= → { repos, page, hasMore, username } */
export const GET = handler(async (req) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  const { client, username } = await githubFor(user, "repos");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? "30") || 30));
  const q = (url.searchParams.get("q") ?? "").slice(0, 100);
  const result = await client.listRepos({ q, page, perPage });
  return json({ ...result, username });
});
