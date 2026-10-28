import { handler, notFound } from "@/lib/api";
import { getObject } from "@/lib/storage";
import { assetKey } from "@/lib/ai/images";

type Ctx = { params: Promise<{ projectId: string; file: string }> };

/**
 * GET /api/assets/:projectId/:file → an AI-generated image used by a project's app. Public by
 * design (the published site embeds it); names are random UUIDs, so they cannot be guessed.
 */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const { projectId, file } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(projectId) || !/^[0-9a-f-]{36}\.webp$/.test(file)) throw notFound("Asset");
  const obj = await getObject(assetKey(projectId, file));
  if (!obj) throw notFound("Asset");
  return new Response(await obj.arrayBuffer(), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
      "cross-origin-resource-policy": "cross-origin",
      "x-content-type-options": "nosniff",
    },
  });
});
