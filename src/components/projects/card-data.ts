import "server-only";
import type { Project } from "@/db/schema";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { getProjectStatuses } from "@/lib/services/dashboard";
import { getProjectExtras } from "@/lib/services/dashboard-insights";
import { listMembers } from "@/lib/services/workspaces";
import { templateCategory } from "./template-summaries";
import { toStatusDto } from "./status";
import type { Collaborator, ProjectCardItem } from "./project-card";

/**
 * Project rows → card items for the dashboard and the projects page: the serialized project, its
 * live state (preview / live / last deploy), file and checkpoint counts, and the workspace members
 * as collaborators. Three parallel reads, all scoped to the caller's workspace.
 */
export async function buildProjectCards(rows: Project[], workspace: { id: string; name: string; role: ProjectCardItem["role"] }): Promise<{ items: ProjectCardItem[]; statuses: Awaited<ReturnType<typeof getProjectStatuses>>; members: Collaborator[] }> {
  const ids = rows.map((p) => p.id);
  const [statuses, extras, memberRows] = await Promise.all([getProjectStatuses(ids), getProjectExtras(ids), listMembers(workspace.id)]);
  const members: Collaborator[] = memberRows.map((m) => ({ id: m.userId, name: m.name?.trim() || m.email, avatarUrl: m.avatarUrl ?? null }));
  const items = rows.map((p) => {
    const s = serializeProject(p);
    const x = extras.get(p.id);
    return {
      ...s,
      lastOpenedAt: s.lastOpenedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      workspaceName: workspace.name,
      role: workspace.role,
      category: templateCategory(s.templateId),
      status: toStatusDto(statuses.get(p.id)),
      fileCount: x?.fileCount ?? 0,
      lastCheckpointAt: x?.lastCheckpointAt?.toISOString() ?? null,
      checkpointCount: x?.checkpointCount ?? 0,
      collaborators: members,
    };
  });
  return { items, statuses, members };
}
