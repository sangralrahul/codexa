import { badRequest, handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { getAllFiles, logActivity, writeFiles } from "@/lib/services/projects";
import { guessColors, pwaFiles } from "@/lib/services/pwa";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/v1/projects/:id/pwa → make the app installable (manifest, icon, service worker, offline page). */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  if (project.framework !== "vite-react" && project.framework !== "static") throw badRequest("Only website and web app projects (Vite or static HTML) can be made installable.");
  const files = await getAllFiles(id);
  const out = pwaFiles(project.framework, files, { name: project.name, ...guessColors(files) });
  if (!out) throw badRequest("This project has no index.html to attach the app manifest to.");
  const changed = Object.fromEntries(Object.entries(out).filter(([p, c]) => files[p] !== c));
  await writeFiles(id, changed);
  await logActivity(id, user.id, "file.updated", "Made the app installable (PWA)", { paths: Object.keys(changed) });
  return json({ paths: Object.keys(changed) });
});
