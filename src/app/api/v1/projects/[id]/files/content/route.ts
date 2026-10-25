import { z } from "zod";
import { badRequest, handler, json, notFound, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { MAX_FILE_SIZE, MAX_FILES_PER_PROJECT, listFiles, logActivity, readFile, writeFile } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const path = new URL(req.url).searchParams.get("path");
  if (!path) throw badRequest("path is required");
  const file = await readFile(id, path);
  if (!file) throw notFound("File");
  return json({ path: file.path, content: file.content, size: file.size, isBinary: file.isBinary, updatedAt: file.updatedAt });
});

const putSchema = z.object({
  path: z.string().min(1).max(512),
  content: z.string().max(MAX_FILE_SIZE, `File exceeds ${MAX_FILE_SIZE} bytes`),
});

export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, putSchema);
  const existing = await readFile(id, body.path);
  if (!existing) {
    const files = await listFiles(id);
    if (files.length >= MAX_FILES_PER_PROJECT) throw badRequest("Project file limit reached");
  }
  const file = await writeFile(id, body.path, body.content);
  await logActivity(id, user.id, existing ? "file.updated" : "file.created", `${existing ? "Edited" : "Created"} ${file.path}`, {
    path: file.path,
    size: file.size,
  });
  return json({ file: { path: file.path, size: file.size, updatedAt: file.updatedAt, created: !existing } });
});
