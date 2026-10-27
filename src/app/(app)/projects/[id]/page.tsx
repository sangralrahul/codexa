import "@/components/workspace/workspace.css";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { ApiError } from "@/lib/api";
import { assertProjectAccess, type ProjectAccess } from "@/lib/services/access";
import { listFiles, listRecentProjectsForUser, touchProject } from "@/lib/services/projects";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { getTemplate } from "@/templates";
import { Workspace } from "@/components/workspace/workspace";
import type { FileEntry, ProjectDto } from "@/lib/client/workspace/types";
import type { User } from "@/db/schema";

type Props = { params: Promise<{ id: string }> };

async function loadAccess(id: string): Promise<{ access: ProjectAccess; user: User } | { denied: true } | { missing: true }> {
  const user = await requireUser(`/projects/${id}`);
  try {
    return { access: await assertProjectAccess(user, id, "viewer"), user };
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
  const { project, role, workspace } = res.access;
  const { user } = res;
  const [files, recentRows] = await Promise.all([listFiles(project.id), listRecentProjectsForUser([workspace.id], 7), touchProject(project.id)]);
  const s = serializeProject(project);
  const dto: ProjectDto = {
    ...s,
    lastOpenedAt: s.lastOpenedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
  const entries: FileEntry[] = files.map((f) => ({ path: f.path, size: f.size, isBinary: f.isBinary, updatedAt: f.updatedAt.toISOString() }));
  // Template metadata only (no file contents): the switcher thumbnail, the welcome suggestions and
  // the labelled "template starting point" picture in offline preview states.
  const t = project.templateId ? getTemplate(project.templateId) : undefined;
  const template = t ? { id: t.id, name: t.name, category: t.category } : null;
  const recent = recentRows
    .filter((p) => p.id !== project.id)
    .slice(0, 6)
    .map((p) => {
      const rt = p.templateId ? getTemplate(p.templateId) : undefined;
      return { id: p.id, name: p.name, templateId: rt ? rt.id : null, category: rt ? rt.category : null };
    });
  // The workspace is full-screen (AppShell focus mode), so it carries its own header and account menu.
  return (
    <Workspace
      project={dto}
      role={role}
      files={entries}
      workspaceName={workspace.name}
      user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
      template={template}
      recent={recent}
    />
  );
}
