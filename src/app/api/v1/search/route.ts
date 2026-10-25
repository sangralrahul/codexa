import { z } from "zod";
import { badRequest, clientIp, handler, json } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSearchIndex, isSearchType, runSearch, runSuggestions, SEARCH_TYPES } from "@/lib/content/search";

const querySchema = z.object({
  q: z.string().max(200).default(""),
  type: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * GET /api/v1/search?q=&type=&limit=
 * Public content search over docs, guides, tutorials, blog, help, changelog,
 * glossary, templates and integrations. No user data is involved.
 */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) throw badRequest("Invalid query", parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  const { q, type, limit } = parsed.data;
  if (type && !isSearchType(type)) throw badRequest(`type must be one of ${SEARCH_TYPES.join(", ")}`);

  await enforceRateLimit(`search:ip:${clientIp(req)}`, 120, 60 * 1000);

  const index = await getSearchIndex();
  const query = q.trim();
  if (query.length < 2) {
    return json({ results: [], suggestions: runSuggestions(index, query), query }, { headers: { "Cache-Control": "public, max-age=60" } });
  }
  const results = runSearch(index, query, { type: type && isSearchType(type) ? type : undefined, limit }).map(({ score: _score, ...r }) => r);
  const suggestions = results.length === 0 ? runSuggestions(index, query.slice(0, 3)) : [];
  return json({ results, suggestions, query }, { headers: { "Cache-Control": "public, max-age=60" } });
});
