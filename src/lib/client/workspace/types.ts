/** Client-side types mirroring the workspace API responses (see docs/API_CONTRACT.md). */

export type ProjectVisibility = "private" | "unlisted" | "public";
export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type ProjectSettings = {
  devCommand?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDir?: string;
  port?: number;
  nodeVersion?: string;
};

export type ProjectDto = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  templateId: string | null;
  framework: string;
  visibility: ProjectVisibility;
  createdBy: string | null;
  settings: ProjectSettings;
  githubRepo: string | null;
  githubBranch: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceDto = {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  plan: string;
  billingCurrency: string;
  createdAt: string;
};

export type FileEntry = { path: string; size: number; isBinary: boolean; updatedAt: string };

export type SearchResult = { path: string; line: number; text: string };

export type SnapshotDto = {
  id: string;
  name: string;
  kind: string;
  message: string | null;
  createdBy: string | null;
  createdAt: string;
  fileCount: number;
};

export type FileDiff = { path: string; action: "create" | "update" | "delete"; before: string | null; after: string | null };

export type ActivityDto = {
  id: string;
  kind: string;
  message: string;
  metadata: Record<string, unknown>;
  actorId: string | null;
  actorName: string;
  createdAt: string;
};

export type EnvVarDto = { id: string; key: string; value: string; isSecret: boolean; updatedAt: string };

export type ShareLinkDto = {
  id: string;
  access: "view" | "edit";
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  createdBy: string | null;
};

export type ChangeSummary = { path: string; action: "create" | "update" | "delete" };

/** Template metadata without file contents (safe to pass to client components). */
export type TemplateSummary = {
  id: string;
  name: string;
  description: string;
  category: string;
  framework: string;
  frameworkName: string;
  tags: string[];
  prebuilt: boolean;
  featured: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
};

/** Project row enriched with workspace context for list pages. */
export type ProjectListItem = ProjectDto & { workspaceName: string; role: WorkspaceRole };
