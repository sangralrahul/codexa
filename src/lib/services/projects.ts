import "server-only";
import { and, desc, eq, isNull, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  projectActivity,
  projectFiles,
  projectSnapshots,
  projects,
  type Project,
  type ProjectSettings,
} from "@/db/schema";
import { slugify } from "@/lib/utils";
import { badRequest, conflict } from "@/lib/api";
import { getTemplate } from "@/templates";

export const MAX_FILE_SIZE = 1_000_000; // 1 MB per text file
export const MAX_FILES_PER_PROJECT = 2000;

export function normalizePath(p: string): string {
  const cleaned = p.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  if (!cleaned || cleaned.length > 512) throw badRequest("Invalid file path");
  const parts = cleaned.split("/");
  if (parts.some((s) => s === "." || s === ".." || s === "")) throw badRequest("Invalid file path");
  if (/[\0<>:"|?*]/.test(cleaned)) throw badRequest("Invalid characters in file path");
  return cleaned;
}

export async function listProjects(workspaceId: string) {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt));
}

export async function listRecentProjectsForUser(workspaceIds: string[], limit = 8) {
  if (!workspaceIds.length) return [];
  return db
    .select()
    .from(projects)
    .where(and(inArray(projects.workspaceId, workspaceIds), isNull(projects.deletedAt)))
    .orderBy(desc(sql`coalesce(${projects.lastOpenedAt}, ${projects.updatedAt})`))
    .limit(limit);
}

export async function countProjects(workspaceId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)));
  return row?.count ?? 0;
}

async function uniqueSlug(workspaceId: string, base: string) {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const exists = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.slug, candidate)))
      .limit(1);
    if (!exists.length) return candidate;
  }
  throw conflict("Could not allocate a unique project slug");
}

export async function createProject(input: {
  workspaceId: string;
  name: string;
  description?: string;
  templateId: string;
  createdBy: string;
  visibility?: "private" | "unlisted" | "public";
  files?: Record<string, string>;
}): Promise<Project> {
  const template = getTemplate(input.templateId);
  if (!template) throw badRequest(`Unknown template: ${input.templateId}`);
  const slug = await uniqueSlug(input.workspaceId, input.name);
  const files = input.files ?? template.files;
  const settings: ProjectSettings = { ...template.settings };

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        workspaceId: input.workspaceId,
        name: input.name.trim().slice(0, 100),
        slug,
        description: (input.description ?? "").slice(0, 500),
        templateId: template.id,
        framework: template.framework,
        visibility: input.visibility ?? "private",
        createdBy: input.createdBy,
        settings,
        lastOpenedAt: new Date(),
      })
      .returning();
    const entries = Object.entries(files);
    if (entries.length) {
      await tx.insert(projectFiles).values(
        entries.map(([path, content]) => ({
          projectId: project.id,
          path: normalizePath(path),
          content,
          size: Buffer.byteLength(content, "utf8"),
        })),
      );
    }
    await tx.insert(projectSnapshots).values({
      projectId: project.id,
      name: "Initial",
      kind: "auto",
      message: `Created from template ${template.name}`,
      files,
      createdBy: input.createdBy,
    });
    await tx.insert(projectActivity).values({
      projectId: project.id,
      actorId: input.createdBy,
      kind: "project.created",
      message: `Project created from template "${template.name}"`,
    });
    return project;
  });
}

export async function updateProject(
  projectId: string,
  patch: Partial<Pick<Project, "name" | "description" | "visibility" | "settings" | "githubRepo" | "githubBranch">>,
) {
  const [row] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();
  return row;
}

export async function touchProject(projectId: string) {
  await db.update(projects).set({ lastOpenedAt: new Date() }).where(eq(projects.id, projectId));
}

export async function softDeleteProject(projectId: string) {
  await db.update(projects).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(projects.id, projectId));
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------
export async function listFiles(projectId: string) {
  return db
    .select({ path: projectFiles.path, size: projectFiles.size, isBinary: projectFiles.isBinary, updatedAt: projectFiles.updatedAt })
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId))
    .orderBy(projectFiles.path);
}

export async function getAllFiles(projectId: string): Promise<Record<string, string>> {
  const rows = await db
    .select({ path: projectFiles.path, content: projectFiles.content })
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.path] = r.content;
  return out;
}

export async function readFile(projectId: string, path: string) {
  const rows = await db
    .select()
    .from(projectFiles)
    .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, normalizePath(path))))
    .limit(1);
  return rows[0] ?? null;
}

export async function writeFile(projectId: string, path: string, content: string) {
  const p = normalizePath(path);
  const size = Buffer.byteLength(content, "utf8");
  if (size > MAX_FILE_SIZE) throw badRequest(`File exceeds ${MAX_FILE_SIZE} bytes`);
  const [row] = await db
    .insert(projectFiles)
    .values({ projectId, path: p, content, size })
    .onConflictDoUpdate({
      target: [projectFiles.projectId, projectFiles.path],
      set: { content, size, updatedAt: new Date() },
    })
    .returning();
  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
  return row;
}

export async function writeFiles(projectId: string, files: Record<string, string>) {
  const entries = Object.entries(files);
  if (!entries.length) return;
  const count = await db.select({ c: sql<number>`count(*)::int` }).from(projectFiles).where(eq(projectFiles.projectId, projectId));
  if ((count[0]?.c ?? 0) + entries.length > MAX_FILES_PER_PROJECT) throw badRequest("Project file limit reached");
  await db.transaction(async (tx) => {
    for (const [path, content] of entries) {
      const p = normalizePath(path);
      const size = Buffer.byteLength(content, "utf8");
      if (size > MAX_FILE_SIZE) throw badRequest(`File ${p} exceeds ${MAX_FILE_SIZE} bytes`);
      await tx
        .insert(projectFiles)
        .values({ projectId, path: p, content, size })
        .onConflictDoUpdate({ target: [projectFiles.projectId, projectFiles.path], set: { content, size, updatedAt: new Date() } });
    }
    await tx.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
  });
}

export async function deleteFile(projectId: string, path: string) {
  const p = normalizePath(path);
  const rows = await db
    .delete(projectFiles)
    .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, p)))
    .returning({ path: projectFiles.path });
  return rows.length > 0;
}

export async function deleteFolder(projectId: string, folder: string) {
  const p = normalizePath(folder);
  const rows = await db
    .delete(projectFiles)
    .where(and(eq(projectFiles.projectId, projectId), sql`${projectFiles.path} LIKE ${p + "/%"}`))
    .returning({ path: projectFiles.path });
  return rows.length;
}

export async function renameFile(projectId: string, from: string, to: string) {
  const f = normalizePath(from);
  const t = normalizePath(to);
  const existing = await readFile(projectId, t);
  if (existing) throw conflict(`A file already exists at ${t}`);
  const rows = await db
    .update(projectFiles)
    .set({ path: t, updatedAt: new Date() })
    .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, f)))
    .returning();
  return rows[0] ?? null;
}

export async function renameFolder(projectId: string, from: string, to: string) {
  const f = normalizePath(from);
  const t = normalizePath(to);
  const rows = await db
    .select({ id: projectFiles.id, path: projectFiles.path })
    .from(projectFiles)
    .where(and(eq(projectFiles.projectId, projectId), sql`${projectFiles.path} LIKE ${f + "/%"}`));
  await db.transaction(async (tx) => {
    for (const r of rows) {
      await tx.update(projectFiles).set({ path: t + r.path.slice(f.length), updatedAt: new Date() }).where(eq(projectFiles.id, r.id));
    }
  });
  return rows.length;
}

export async function searchFiles(projectId: string, query: string, limit = 50) {
  const q = query.trim();
  if (!q) return [];
  const rows = await db
    .select({ path: projectFiles.path, content: projectFiles.content })
    .from(projectFiles)
    .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.isBinary, false), sql`${projectFiles.content} ILIKE ${"%" + q + "%"}`))
    .limit(200);
  const results: { path: string; line: number; text: string }[] = [];
  const needle = q.toLowerCase();
  for (const r of rows) {
    const lines = r.content.split("\n");
    for (let i = 0; i < lines.length && results.length < limit; i++) {
      if (lines[i].toLowerCase().includes(needle)) results.push({ path: r.path, line: i + 1, text: lines[i].slice(0, 200) });
    }
    if (results.length >= limit) break;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Snapshots (version history)
// ---------------------------------------------------------------------------
export async function createSnapshot(projectId: string, input: { name: string; kind?: string; message?: string; createdBy?: string | null }) {
  const files = await getAllFiles(projectId);
  const [snap] = await db
    .insert(projectSnapshots)
    .values({ projectId, name: input.name.slice(0, 100), kind: input.kind ?? "manual", message: input.message ?? null, files, createdBy: input.createdBy ?? null })
    .returning({ id: projectSnapshots.id, name: projectSnapshots.name, kind: projectSnapshots.kind, createdAt: projectSnapshots.createdAt });
  return snap;
}

export async function listSnapshots(projectId: string, limit = 50) {
  return db
    .select({
      id: projectSnapshots.id,
      name: projectSnapshots.name,
      kind: projectSnapshots.kind,
      message: projectSnapshots.message,
      createdBy: projectSnapshots.createdBy,
      createdAt: projectSnapshots.createdAt,
      fileCount: sql<number>`(select count(*) from jsonb_object_keys(${projectSnapshots.files}))::int`,
    })
    .from(projectSnapshots)
    .where(eq(projectSnapshots.projectId, projectId))
    .orderBy(desc(projectSnapshots.createdAt))
    .limit(limit);
}

export async function getSnapshot(projectId: string, snapshotId: string) {
  const rows = await db
    .select()
    .from(projectSnapshots)
    .where(and(eq(projectSnapshots.projectId, projectId), eq(projectSnapshots.id, snapshotId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Restore a snapshot: creates a safety snapshot first, then replaces all files. */
export async function restoreSnapshot(projectId: string, snapshotId: string, actorId: string | null) {
  const snap = await getSnapshot(projectId, snapshotId);
  if (!snap) throw badRequest("Snapshot not found");
  await createSnapshot(projectId, { name: `Before restoring "${snap.name}"`, kind: "restore", createdBy: actorId });
  await db.transaction(async (tx) => {
    await tx.delete(projectFiles).where(eq(projectFiles.projectId, projectId));
    const entries = Object.entries(snap.files);
    if (entries.length) {
      await tx.insert(projectFiles).values(
        entries.map(([path, content]) => ({ projectId, path, content, size: Buffer.byteLength(content, "utf8") })),
      );
    }
    await tx.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
    await tx.insert(projectActivity).values({ projectId, actorId, kind: "snapshot.restored", message: `Restored snapshot "${snap.name}"`, metadata: { snapshotId } });
  });
  return snap;
}

export type FileDiff = { path: string; action: "create" | "update" | "delete"; before: string | null; after: string | null };

export function diffFileSets(before: Record<string, string>, after: Record<string, string>): FileDiff[] {
  const out: FileDiff[] = [];
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const p of [...paths].sort()) {
    const b = before[p];
    const a = after[p];
    if (b === undefined && a !== undefined) out.push({ path: p, action: "create", before: null, after: a });
    else if (b !== undefined && a === undefined) out.push({ path: p, action: "delete", before: b, after: null });
    else if (b !== a) out.push({ path: p, action: "update", before: b ?? null, after: a ?? null });
  }
  return out;
}

export async function logActivity(projectId: string, actorId: string | null, kind: string, message: string, metadata: Record<string, unknown> = {}) {
  await db.insert(projectActivity).values({ projectId, actorId, kind, message, metadata });
}

export async function listActivity(projectId: string, limit = 50) {
  return db.select().from(projectActivity).where(eq(projectActivity.projectId, projectId)).orderBy(desc(projectActivity.createdAt)).limit(limit);
}
