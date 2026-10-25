import { badRequest, handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { deleteFile, deleteFolder, listFiles, logActivity, normalizePath } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const files = await listFiles(id);
  return json({ files });
});

/** DELETE /files?path=src/App.tsx  or  /files?path=src/components&folder=1 */
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const url = new URL(req.url);
  const rawPath = url.searchParams.get("path");
  if (!rawPath) throw badRequest("path is required");
  const path = normalizePath(rawPath);
  const isFolder = url.searchParams.get("folder") === "1";
  if (isFolder) {
    const count = await deleteFolder(id, path);
    if (count === 0) throw notFound("Folder");
    await logActivity(id, user.id, "file.deleted", `Deleted folder ${path} (${count} file${count === 1 ? "" : "s"})`, { path, folder: true, count });
    return json({ deleted: count, folder: true, path });
  }
  const ok = await deleteFile(id, path);
  if (!ok) throw notFound("File");
  await logActivity(id, user.id, "file.deleted", `Deleted ${path}`, { path });
  return json({ deleted: 1, folder: false, path });
});
