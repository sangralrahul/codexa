"use client";

import { api } from "@/lib/client/api";
import type {
  ActivityDto,
  ChangeSummary,
  EnvVarDto,
  FileDiff,
  FileEntry,
  ProjectDto,
  ProjectSettings,
  ProjectVisibility,
  SearchResult,
  ShareLinkDto,
  SnapshotDto,
  WorkspaceDto,
  WorkspaceRole,
} from "./types";

const base = (id: string) => `/api/v1/projects/${encodeURIComponent(id)}`;
const q = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const projectsApi = {
  list: (workspaceId: string) => api<{ projects: ProjectDto[] }>(`/api/v1/projects${q({ workspaceId })}`),
  create: (input: { workspaceId: string; name: string; description?: string; templateId: string; visibility?: ProjectVisibility }) =>
    api<{ project: ProjectDto }>("/api/v1/projects", { method: "POST", json: input }),
  get: (id: string) => api<{ project: ProjectDto; role: WorkspaceRole; workspace: WorkspaceDto }>(base(id)),
  patch: (id: string, patch: { name?: string; description?: string; visibility?: ProjectVisibility; settings?: ProjectSettings }) =>
    api<{ project: ProjectDto }>(base(id), { method: "PATCH", json: patch }),
  remove: (id: string) => api<void>(base(id), { method: "DELETE" }),
  duplicate: (id: string, name?: string) => api<{ project: ProjectDto }>(`${base(id)}/duplicate`, { method: "POST", json: name ? { name } : {} }),
};

export const filesApi = {
  list: (id: string) => api<{ files: FileEntry[] }>(`${base(id)}/files`),
  read: (id: string, path: string) => api<{ path: string; content: string; size: number; isBinary: boolean; updatedAt: string }>(`${base(id)}/files/content${q({ path })}`),
  write: (id: string, path: string, content: string) =>
    api<{ file: { path: string; size: number; updatedAt: string; created: boolean } }>(`${base(id)}/files/content`, { method: "PUT", json: { path, content } }),
  rename: (id: string, from: string, to: string, isFolder?: boolean) =>
    api<{ from: string; to: string; folder: boolean }>(`${base(id)}/files/rename`, { method: "POST", json: { from, to, isFolder: Boolean(isFolder) } }),
  remove: (id: string, path: string, isFolder?: boolean) =>
    api<{ deleted: number; folder: boolean; path: string }>(`${base(id)}/files${q({ path, folder: isFolder ? 1 : undefined })}`, { method: "DELETE" }),
  search: (id: string, query: string) => api<{ q: string; results: SearchResult[] }>(`${base(id)}/search${q({ q: query })}`),
  changes: (id: string) => api<{ snapshot: { id: string; name: string; createdAt: string } | null; changes: ChangeSummary[] }>(`${base(id)}/changes`),
};

export const snapshotsApi = {
  list: (id: string) => api<{ snapshots: SnapshotDto[] }>(`${base(id)}/snapshots`),
  create: (id: string, input: { name: string; message?: string }) =>
    api<{ snapshot: { id: string; name: string; kind: string; createdAt: string } }>(`${base(id)}/snapshots`, { method: "POST", json: input }),
  get: (id: string, sid: string) => api<{ snapshot: SnapshotDto; diff: FileDiff[] }>(`${base(id)}/snapshots/${encodeURIComponent(sid)}`),
  restore: (id: string, sid: string) =>
    api<{ restored: { id: string; name: string }; paths: string[] }>(`${base(id)}/snapshots/${encodeURIComponent(sid)}/restore`, { method: "POST" }),
};

export const activityApi = {
  list: (id: string, limit = 50) => api<{ activity: ActivityDto[] }>(`${base(id)}/activity${q({ limit })}`),
};

export const envApi = {
  list: (id: string, reveal?: boolean) => api<{ vars: EnvVarDto[]; revealed: boolean }>(`${base(id)}/env${q({ reveal: reveal ? 1 : undefined })}`),
  upsert: (id: string, input: { key: string; value: string; isSecret?: boolean }) =>
    api<{ saved: { key: string }[]; vars: EnvVarDto[] }>(`${base(id)}/env`, { method: "PUT", json: input }),
  remove: (id: string, key: string) => api<void>(`${base(id)}/env${q({ key })}`, { method: "DELETE" }),
};

export const shareApi = {
  list: (id: string) => api<{ links: ShareLinkDto[] }>(`${base(id)}/share`),
  create: (id: string, input: { access: "view" | "edit"; expiresInDays?: number | null }) =>
    api<{ url: string; link: ShareLinkDto }>(`${base(id)}/share`, { method: "POST", json: input }),
  revoke: (id: string, linkId: string) => api<void>(`${base(id)}/share/${encodeURIComponent(linkId)}`, { method: "DELETE" }),
};

export const workspacesApi = {
  list: () => api<{ workspaces: { workspace: WorkspaceDto; role: WorkspaceRole }[] }>("/api/v1/workspaces"),
  create: (name: string) => api<{ workspace: WorkspaceDto }>("/api/v1/workspaces", { method: "POST", json: { name } }),
};

export const accountApi = {
  onboarding: (input: { name?: string; timezone?: string; locale?: string; completed?: boolean }) =>
    api<{ user: { id: string; name: string; onboardedAt: string | null } }>("/api/v1/account/onboarding", { method: "PATCH", json: input }),
};
