import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { ApiError } from "@/lib/api";
import { assertProjectAccess, type ProjectAccess } from "@/lib/services/access";
import { listFiles, touchProject } from "@/lib/services/projects";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { Workspace } from "@/components/workspace/workspace";
import type { FileEntry, ProjectDto } from "@/lib/client/workspace/types";

type Props = { params: Promise<{ id: string }> };

async function loadAccess(id: string): Promise<{ access: ProjectAccess } | { denied: true } | { missing: true }> {
  const user = await requireUser(`/projects/${id}`);
  try {
    return { access: await assertProjectAccess(user, id, "viewer") };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { denied: true };
    if (err instanceof ApiError && err.status === 404) return { missing: true };
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const res = await loadAccess(id);
  return { title: "access" in res ? `${res.access.project.name} · Workspace` : "Project", robots: { index: false, follow: false } };
}

export default async function ProjectWorkspacePage({ params }: Props) {
  const { id } = await params;
  const res = await loadAccess(id);
  if ("denied" in res) redirect("/access-denied");
  if ("missing" in res) notFound();
  const { project, role } = res.access;
  const [files] = await Promise.all([listFiles(project.id), touchProject(project.id)]);
  const s = serializeProject(project);
  const dto: ProjectDto = {
    ...s,
    lastOpenedAt: s.lastOpenedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
  const entries: FileEntry[] = files.map((f) => ({ path: f.path, size: f.size, isBinary: f.isBinary, updatedAt: f.updatedAt.toISOString() }));
  return <Workspace project={dto} role={role} files={entries} />;
}
