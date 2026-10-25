import { handler, json, notFound } from "@/lib/api";
import { getTemplate, summarizeTemplate } from "@/templates";

/** Public: a single template including its files (used by the preview page and the CLI/SDK in future). */
export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const template = getTemplate(id);
  if (!template) throw notFound("Template");
  return json(
    { template: { ...summarizeTemplate(template), settings: template.settings, files: template.files } },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
});
