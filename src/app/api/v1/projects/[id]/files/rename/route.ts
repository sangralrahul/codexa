import { z } from "zod";
import { badRequest, conflict, handler, json, notFound, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { listFiles, logActivity, normalizePath, renameFile, renameFolder } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  from: z.string().min(1).max(512),
  to: z.string().min(1).max(512),
  isFolder: z.boolean().optional(),
});

export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  const from = normalizePath(body.from);
  const to = normalizePath(body.to);
  if (from === to) throw badRequest("Source and destination are the same");

  if (body.isFolder) {
    if (to.startsWith(from + "/")) throw badRequest("Cannot move a folder inside itself");
    const files = await listFiles(id);
    const prefix = from + "/";
    const moving = files.filter((f) => f.path.startsWith(prefix));
    if (!moving.length) throw notFound("Folder");
    const targets = new Set(moving.map((f) => to + f.path.slice(from.length)));
    const clash = files.find((f) => !f.path.startsWith(prefix) && (targets.has(f.path) || f.path === to));
    if (clash) throw conflict(`A file already exists at ${clash.path}`);
    const count = await renameFolder(id, from, to);
    await logActivity(id, user.id, "file.renamed", `Renamed folder ${from} → ${to}`, { from, to, folder: true, count });
    return json({ from, to, folder: true, count });
  }

  const row = await renameFile(id, from, to);
  if (!row) throw notFound("File");
  await logActivity(id, user.id, "file.renamed", `Renamed ${from} → ${to}`, { from, to });
  return json({ from, to, folder: false, file: { path: row.path, size: row.size, updatedAt: row.updatedAt } });
});
