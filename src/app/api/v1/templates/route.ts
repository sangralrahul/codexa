import { handler, json } from "@/lib/api";
import { parseTemplateSearch, searchTemplates, summarizeTemplate, TEMPLATE_CATEGORIES } from "@/templates";

/** Public: list starter templates without file contents. */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const search = parseTemplateSearch({
    q: url.searchParams.get("q"),
    category: url.searchParams.get("category"),
    framework: url.searchParams.get("framework"),
    sort: url.searchParams.get("sort"),
  });
  const templates = searchTemplates(search).map(summarizeTemplate);
  return json(
    { templates, total: templates.length, query: search, categories: TEMPLATE_CATEGORIES },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
});
