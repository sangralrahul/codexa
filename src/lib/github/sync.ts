import "server-only";
import type { Project, ProjectSettings } from "@/db/schema";
import { ApiError, badRequest } from "@/lib/api";
import { createProject, createSnapshot, getAllFiles, listFiles, logActivity, replaceAllFiles, updateProject } from "@/lib/services/projects";
import { GitHubError, parseRepoFullName, type GitHubClient, type ImportedRepo } from "./client";

/** Extra keys we keep inside project.settings (requested as proper fields in the schema; see docs/INTEGRATIONS.md). */
export type GithubSyncSettings = ProjectSettings & {
  githubLastTreeSha?: string;
  githubLastCommitSha?: string;
  githubLastSyncAt?: string;
};

export function syncSettings(project: Pick<Project, "settings">): GithubSyncSettings {
  return project.settings as GithubSyncSettings;
}

/** Pick the closest template for an imported repository (createProject needs a registered template). */
export function detectTemplateId(files: Record<string, string>): "vite-react-starter" | "node-express-api" | "static-site" {
  const pkg = files["package.json"];
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const deps = { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) };
      if ("vite" in deps) return "vite-react-starter";
      if ("express" in deps) return "node-express-api";
    } catch {
      // fall through
    }
  }
  return "static-site";
}

function wrapGithub<T>(p: Promise<T>): Promise<T> {
  return p.catch((err) => {
    if (err instanceof GitHubError) throw new ApiError(err.status, err.message, err.code);
    throw err;
  });
}

export async function readRepository(client: GitHubClient, repoFullName: string, branch?: string | null): Promise<ImportedRepo & { branch: string; htmlUrl: string }> {
  const { owner, repo } = parseRepoFullName(repoFullName);
  const info = await wrapGithub(client.getRepo(owner, repo));
  const b = branch?.trim() || info.defaultBranch;
  const imported = await wrapGithub(client.importRepository(owner, repo, b));
  if (!Object.keys(imported.files).length) throw badRequest("The repository branch contains no importable text files.");
  return { ...imported, branch: b, htmlUrl: info.htmlUrl };
}

/** Create a brand-new project from a repository branch. */
export async function importRepositoryAsProject(input: { client: GitHubClient; workspaceId: string; userId: string; repo: string; branch?: string | null; name?: string | null }) {
  const data = await readRepository(input.client, input.repo, input.branch);
  const { repo } = parseRepoFullName(input.repo);
  const templateId = detectTemplateId(data.files);
  const project = await createProject({
    workspaceId: input.workspaceId,
    name: (input.name?.trim() || repo).slice(0, 100),
    description: `Imported from ${input.repo} (${data.branch})`,
    templateId,
    createdBy: input.userId,
    files: data.files,
  });
  const settings: GithubSyncSettings = { ...project.settings, githubLastTreeSha: data.treeSha, githubLastCommitSha: data.commitSha, githubLastSyncAt: new Date().toISOString() };
  const updated = await updateProject(project.id, { githubRepo: input.repo, githubBranch: data.branch, settings: settings as ProjectSettings });
  await logActivity(project.id, input.userId, "github.imported", `Imported ${Object.keys(data.files).length} files from ${input.repo}@${data.branch}`, {
    repo: input.repo,
    branch: data.branch,
    commitSha: data.commitSha,
    skipped: data.skipped.length,
  });
  return { project: updated ?? project, imported: Object.keys(data.files).length, skipped: data.skipped, truncated: data.truncated, templateId };
}

/** Replace a project's files with the branch content ("Pull latest"). Takes a 'Before pull' snapshot first. */
export async function pullIntoProject(input: { client: GitHubClient; project: Project; userId: string; repo?: string | null; branch?: string | null }) {
  const repoName = input.repo?.trim() || input.project.githubRepo;
  if (!repoName) throw badRequest("This project is not linked to a GitHub repository. Pass { repo } to link it.");
  const data = await readRepository(input.client, repoName, input.branch ?? input.project.githubBranch);
  await createSnapshot(input.project.id, { name: "Before pull", kind: "manual", message: `Before pulling ${repoName}@${data.branch}`, createdBy: input.userId });
  const current = await listFiles(input.project.id);
  await replaceAllFiles(input.project.id, data.files);
  const settings: GithubSyncSettings = { ...input.project.settings, githubLastTreeSha: data.treeSha, githubLastCommitSha: data.commitSha, githubLastSyncAt: new Date().toISOString() };
  const updated = await updateProject(input.project.id, { githubRepo: repoName, githubBranch: data.branch, settings: settings as ProjectSettings });
  await logActivity(input.project.id, input.userId, "github.pulled", `Pulled ${Object.keys(data.files).length} files from ${repoName}@${data.branch}`, {
    repo: repoName,
    branch: data.branch,
    commitSha: data.commitSha,
    removed: current.length,
  });
  const paths = [...new Set([...current.map((f) => f.path), ...Object.keys(data.files)])];
  return { project: updated, imported: Object.keys(data.files).length, skipped: data.skipped, truncated: data.truncated, paths };
}

export async function pushProject(input: { client: GitHubClient; project: Project; userId: string; message: string; branch?: string | null }) {
  const repoName = input.project.githubRepo;
  if (!repoName) throw badRequest("This project is not linked to a GitHub repository. Import or pull from a repository first.");
  const { owner, repo } = parseRepoFullName(repoName);
  const branch = input.branch?.trim() || input.project.githubBranch;
  if (!branch) throw badRequest("No branch configured for this project.");
  const files = await getAllFiles(input.project.id);
  const s = syncSettings(input.project);
  const result = await wrapGithub(input.client.pushFiles(owner, repo, branch, { files, message: input.message, baseTreeSha: s.githubLastTreeSha ?? null }));
  const settings: GithubSyncSettings = { ...input.project.settings, githubLastTreeSha: result.treeSha, githubLastCommitSha: result.commitSha, githubLastSyncAt: new Date().toISOString() };
  await updateProject(input.project.id, { githubBranch: branch, settings: settings as ProjectSettings });
  if (result.committed) {
    await logActivity(input.project.id, input.userId, "github.pushed", `Pushed commit to ${repoName}@${branch}: ${input.message.split("\n")[0].slice(0, 120)}`, {
      repo: repoName,
      branch,
      commitSha: result.commitSha,
      changed: result.changed.length,
      added: result.added.length,
      deleted: result.deleted.length,
    });
  }
  return { ...result, repo: repoName, branch, commitUrl: result.committed ? `https://github.com/${owner}/${repo}/commit/${result.commitSha}` : null };
}

export async function projectGithubStatus(input: { client: GitHubClient; project: Project }) {
  const repoName = input.project.githubRepo;
  if (!repoName || !input.project.githubBranch) return { linked: false as const };
  const { owner, repo } = parseRepoFullName(repoName);
  const files = await getAllFiles(input.project.id);
  const s = syncSettings(input.project);
  const status = await wrapGithub(input.client.status(owner, repo, input.project.githubBranch, { files, lastTreeSha: s.githubLastTreeSha ?? null, lastCommitSha: s.githubLastCommitSha ?? null }));
  return { linked: true as const, repo: repoName, branch: input.project.githubBranch, url: `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(input.project.githubBranch)}`, lastSyncAt: s.githubLastSyncAt ?? null, ...status };
}

/** Remove the GitHub link from a project (keeps files). */
export async function unlinkProject(project: Project) {
  const { githubLastTreeSha: _t, githubLastCommitSha: _c, githubLastSyncAt: _a, ...rest } = syncSettings(project);
  return updateProject(project.id, { githubRepo: null, githubBranch: null, settings: rest as ProjectSettings });
}

