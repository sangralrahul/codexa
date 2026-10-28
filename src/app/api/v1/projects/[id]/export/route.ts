import { strToU8, zipSync, type Zippable } from "fflate";
import { handler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { getAllFiles, logActivity } from "@/lib/services/projects";
import { isSecretPath } from "@/lib/ai/tools/paths";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/projects/:id/export → the project's source as a .zip (secret files such as .env left out). */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "viewer");
  await enforceRateLimit(`export:user:${user.id}`, 10, 60_000);
  const files = await getAllFiles(id);
  const folder = (project.slug || "project").replace(/[^a-z0-9-]/gi, "-");
  const tree: Zippable = {};
  for (const [path, content] of Object.entries(files)) {
    if (isSecretPath(path)) continue;
    tree[`${folder}/${path}`] = strToU8(content);
  }
  const zip = zipSync(tree, { level: 6 });
  await logActivity(id, user.id, "project.exported", "Downloaded the project as a ZIP", {});
  return new Response(zip as unknown as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${folder}.zip"`,
      "cache-control": "no-store",
    },
  });
});
