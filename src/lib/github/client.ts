/**
 * Minimal GitHub REST client built on fetch. No "server-only" so the unit tests can
 * exercise it with a mocked fetch. Tokens never leave this module except as the
 * Authorization header.
 */
import { createHash } from "node:crypto";

export const GITHUB_API = "https://api.github.com";
export const MAX_IMPORT_FILE_BYTES = 1_000_000;
export const MAX_IMPORT_FILES = 2000;

export class GitHubError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "github_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type GitHubUser = { id: number; login: string; name: string | null; avatar_url: string | null; email: string | null };
export type RepoSummary = {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  htmlUrl: string;
  pushedAt: string | null;
  canPush: boolean;
  language: string | null;
};
export type BranchSummary = { name: string; sha: string; protected: boolean };
export type TreeEntry = { path: string; mode: string; type: "blob" | "tree" | "commit"; sha: string; size?: number };
export type ImportedRepo = {
  files: Record<string, string>;
  skipped: { path: string; reason: string }[];
  treeSha: string;
  commitSha: string;
  truncated: boolean;
};

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", ".turbo", ".cache", "vendor", "__pycache__", ".venv"]);
const BINARY_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "bmp", "tiff", "psd", "pdf", "zip", "gz", "tgz", "tar", "7z", "rar", "jar", "war", "class", "exe", "dll", "so", "dylib", "bin", "dat", "db", "sqlite", "wasm", "woff", "woff2", "ttf", "otf", "eot", "mp3", "mp4", "wav", "ogg", "webm", "mov", "avi", "flac", "lock", "pyc", "o", "a",
]);

export function shouldSkipPath(path: string): string | null {
  const parts = path.split("/");
  for (const p of parts.slice(0, -1)) if (SKIP_DIRS.has(p)) return `inside ${p}/`;
  const file = parts[parts.length - 1];
  const ext = file.includes(".") ? file.split(".").pop()!.toLowerCase() : "";
  if (ext === "lock" && file !== "package-lock.json" && file !== "yarn.lock" && file !== "pnpm-lock.yaml") return "lock file";
  if (BINARY_EXT.has(ext) && ext !== "lock") return `binary (.${ext})`;
  return null;
}

/** Heuristic binary detection for decoded blobs: NUL bytes or invalid UTF-8. */
export function looksBinary(buf: Buffer): boolean {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf.subarray(0, n));
    return false;
  } catch {
    return true;
  }
}

/** Git blob object id for content (sha1 of "blob <len>\0<content>"). */
export function gitBlobSha(content: string | Buffer): string {
  const buf = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}

export function parseRepoFullName(full: string): { owner: string; repo: string } {
  const m = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(full.trim());
  if (!m) throw new GitHubError(400, "Repository must be in the form owner/name", "bad_request");
  return { owner: m[1], repo: m[2] };
}

export type GitHubClientOptions = { token: string; fetch?: typeof fetch; baseUrl?: string; userAgent?: string };

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export function createGitHubClient(opts: GitHubClientOptions) {
  const fetchImpl = opts.fetch ?? fetch;
  const base = (opts.baseUrl ?? GITHUB_API).replace(/\/+$/, "");

  async function request<T>(path: string, init: RequestInit & { raw?: boolean } = {}): Promise<{ data: T; headers: Headers; status: number }> {
    const url = path.startsWith("http") ? path : `${base}${path}`;
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${opts.token}`);
    headers.set("Accept", "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", "2022-11-28");
    headers.set("User-Agent", opts.userAgent ?? "codexa");
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    let res: Response;
    try {
      res = await fetchImpl(url, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(30_000) });
    } catch (err) {
      throw new GitHubError(502, `Could not reach GitHub: ${err instanceof Error ? err.message : String(err)}`, "github_unreachable");
    }
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const msg = data && typeof data === "object" && "message" in data ? String((data as { message: unknown }).message) : `GitHub returned ${res.status}`;
      const code = res.status === 401 ? "github_unauthorized" : res.status === 404 ? "github_not_found" : res.status === 403 && /rate limit/i.test(msg) ? "github_rate_limited" : "github_error";
      throw new GitHubError(res.status === 401 ? 401 : res.status === 404 ? 404 : res.status === 422 ? 422 : res.status === 403 ? 403 : 502, msg, code);
    }
    return { data: data as T, headers: res.headers, status: res.status };
  }

  const client = {
    request,

    async getUser(): Promise<GitHubUser> {
      const { data } = await request<GitHubUser>("/user");
      return data;
    },

    /** Verified primary email from /user/emails (requires user:email scope). */
    async getPrimaryEmail(): Promise<string | null> {
      const { data } = await request<{ email: string; primary: boolean; verified: boolean }[]>("/user/emails");
      if (!Array.isArray(data)) return null;
      const primary = data.find((e) => e.primary && e.verified) ?? data.find((e) => e.verified);
      return primary?.email ?? null;
    },

    async listRepos(params: { q?: string; page?: number; perPage?: number } = {}): Promise<{ repos: RepoSummary[]; page: number; hasMore: boolean }> {
      const perPage = Math.min(Math.max(params.perPage ?? 30, 1), 100);
      const q = (params.q ?? "").trim().toLowerCase();
      const page = Math.max(params.page ?? 1, 1);
      type Raw = {
        id: number; full_name: string; name: string; owner: { login: string }; private: boolean; default_branch: string; description: string | null; html_url: string; pushed_at: string | null; permissions?: { push?: boolean }; language: string | null;
      };
      const toSummary = (r: Raw): RepoSummary => ({
        id: r.id, fullName: r.full_name, name: r.name, owner: r.owner.login, private: r.private, defaultBranch: r.default_branch, description: r.description, htmlUrl: r.html_url, pushedAt: r.pushed_at, canPush: Boolean(r.permissions?.push), language: r.language,
      });
      if (!q) {
        const { data, headers } = await request<Raw[]>(`/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&per_page=${perPage}&page=${page}`);
        return { repos: data.map(toSummary), page, hasMore: /rel="next"/.test(headers.get("link") ?? "") };
      }
      // Search: scan up to 5 pages of the user's repos and filter by name (covers private + org repos).
      const matches: RepoSummary[] = [];
      let hasMore = false;
      for (let p = 1; p <= 5; p++) {
        const { data, headers } = await request<Raw[]>(`/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&per_page=100&page=${p}`);
        for (const r of data) if (r.full_name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q)) matches.push(toSummary(r));
        hasMore = /rel="next"/.test(headers.get("link") ?? "");
        if (!hasMore) break;
      }
      return { repos: matches.slice(0, perPage), page: 1, hasMore: hasMore || matches.length > perPage };
    },

    async getRepo(owner: string, repo: string) {
      const { data } = await request<{ default_branch: string; private: boolean; html_url: string; permissions?: { push?: boolean }; full_name: string }>(`/repos/${owner}/${repo}`);
      return { defaultBranch: data.default_branch, private: data.private, htmlUrl: data.html_url, canPush: Boolean(data.permissions?.push), fullName: data.full_name };
    },

    async listBranches(owner: string, repo: string): Promise<BranchSummary[]> {
      const out: BranchSummary[] = [];
      for (let p = 1; p <= 5; p++) {
        const { data, headers } = await request<{ name: string; commit: { sha: string }; protected: boolean }[]>(`/repos/${owner}/${repo}/branches?per_page=100&page=${p}`);
        out.push(...data.map((b) => ({ name: b.name, sha: b.commit.sha, protected: b.protected })));
        if (!/rel="next"/.test(headers.get("link") ?? "")) break;
      }
      return out;
    },

    async getBranchHead(owner: string, repo: string, branch: string): Promise<{ commitSha: string; treeSha: string; htmlUrl: string }> {
      const { data } = await request<{ commit: { sha: string; html_url: string; commit: { tree: { sha: string } } } }>(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`);
      return { commitSha: data.commit.sha, treeSha: data.commit.commit.tree.sha, htmlUrl: data.commit.html_url };
    },

    async getTree(owner: string, repo: string, treeSha: string): Promise<{ entries: TreeEntry[]; truncated: boolean; sha: string }> {
      const { data } = await request<{ sha: string; tree: TreeEntry[]; truncated: boolean }>(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
      return { entries: data.tree, truncated: Boolean(data.truncated), sha: data.sha };
    },

    async getBlob(owner: string, repo: string, sha: string): Promise<Buffer> {
      const { data } = await request<{ content: string; encoding: string }>(`/repos/${owner}/${repo}/git/blobs/${sha}`);
      if (data.encoding !== "base64") throw new GitHubError(502, `Unexpected blob encoding ${data.encoding}`);
      return Buffer.from(data.content.replace(/\n/g, ""), "base64");
    },

    async createBlob(owner: string, repo: string, content: string): Promise<string> {
      const { data } = await request<{ sha: string }>(`/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: Buffer.from(content, "utf8").toString("base64"), encoding: "base64" }),
      });
      return data.sha;
    },

    async createTree(owner: string, repo: string, baseTree: string | null, entries: { path: string; mode: "100644"; type: "blob"; sha: string | null }[]): Promise<string> {
      const { data } = await request<{ sha: string }>(`/repos/${owner}/${repo}/git/trees`, {
        method: "POST",
        body: JSON.stringify({ ...(baseTree ? { base_tree: baseTree } : {}), tree: entries }),
      });
      return data.sha;
    },

    async createCommit(owner: string, repo: string, input: { message: string; tree: string; parents: string[] }): Promise<string> {
      const { data } = await request<{ sha: string }>(`/repos/${owner}/${repo}/git/commits`, { method: "POST", body: JSON.stringify(input) });
      return data.sha;
    },

    /** Fast-forward only: never passes force=true. Throws GitHubError 409 when the ref moved. */
    async updateRef(owner: string, repo: string, branch: string, sha: string): Promise<void> {
      try {
        await request(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "PATCH", body: JSON.stringify({ sha, force: false }) });
      } catch (err) {
        if (err instanceof GitHubError && (err.status === 422 || /fast.?forward/i.test(err.message))) {
          throw new GitHubError(409, "The branch has new commits on GitHub since your last sync. Pull latest, then push again (Codexa never force-pushes).", "non_fast_forward");
        }
        throw err;
      }
    },

    async compare(owner: string, repo: string, baseSha: string, headSha: string): Promise<{ aheadBy: number; behindBy: number }> {
      const { data } = await request<{ ahead_by: number; behind_by: number }>(`/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`);
      return { aheadBy: data.ahead_by, behindBy: data.behind_by };
    },

    /** Read a branch into memory: text files up to 1 MB each, max 2000 files, skipping build/binary paths. */
    async importRepository(owner: string, repo: string, branch: string): Promise<ImportedRepo> {
      const head = await client.getBranchHead(owner, repo, branch);
      const tree = await client.getTree(owner, repo, head.treeSha);
      const skipped: ImportedRepo["skipped"] = [];
      const candidates: TreeEntry[] = [];
      for (const e of tree.entries) {
        if (e.type !== "blob") continue;
        const why = shouldSkipPath(e.path);
        if (why) {
          skipped.push({ path: e.path, reason: why });
          continue;
        }
        if ((e.size ?? 0) > MAX_IMPORT_FILE_BYTES) {
          skipped.push({ path: e.path, reason: `larger than ${MAX_IMPORT_FILE_BYTES} bytes` });
          continue;
        }
        if (e.mode === "120000") {
          skipped.push({ path: e.path, reason: "symlink" });
          continue;
        }
        candidates.push(e);
      }
      let truncated = tree.truncated;
      if (candidates.length > MAX_IMPORT_FILES) {
        for (const e of candidates.slice(MAX_IMPORT_FILES)) skipped.push({ path: e.path, reason: `beyond the ${MAX_IMPORT_FILES} file limit` });
        candidates.length = MAX_IMPORT_FILES;
        truncated = true;
      }
      const files: Record<string, string> = {};
      const decoded = await mapLimit(candidates, 8, async (e) => ({ entry: e, buf: await client.getBlob(owner, repo, e.sha) }));
      for (const { entry, buf } of decoded) {
        if (looksBinary(buf)) {
          skipped.push({ path: entry.path, reason: "binary content" });
          continue;
        }
        files[entry.path] = buf.toString("utf8");
      }
      return { files, skipped, treeSha: head.treeSha, commitSha: head.commitSha, truncated };
    },

    /**
     * Commit the given files to the branch using the Git Data API. `baseTreeSha` is the tree of the
     * last sync: paths present there but missing locally are deleted; paths added upstream since
     * are left untouched. Never force-pushes.
     */
    async pushFiles(owner: string, repo: string, branch: string, input: { files: Record<string, string>; message: string; baseTreeSha?: string | null }) {
      const head = await client.getBranchHead(owner, repo, branch);
      const remote = await client.getTree(owner, repo, head.treeSha);
      const remoteBlobs = new Map<string, string>();
      for (const e of remote.entries) if (e.type === "blob") remoteBlobs.set(e.path, e.sha);
      const basePaths = new Set<string>();
      if (input.baseTreeSha) {
        const baseTree = input.baseTreeSha === head.treeSha ? remote : await client.getTree(owner, repo, input.baseTreeSha);
        for (const e of baseTree.entries) if (e.type === "blob") basePaths.add(e.path);
      }
      const entries: { path: string; mode: "100644"; type: "blob"; sha: string | null }[] = [];
      const changed: string[] = [];
      const added: string[] = [];
      const deleted: string[] = [];
      const toUpload: string[] = [];
      for (const [path, content] of Object.entries(input.files)) {
        const localSha = gitBlobSha(content);
        const remoteSha = remoteBlobs.get(path);
        if (remoteSha === localSha) continue;
        toUpload.push(path);
        (remoteSha ? changed : added).push(path);
      }
      const uploaded = await mapLimit(toUpload, 6, async (path) => ({ path, sha: await client.createBlob(owner, repo, input.files[path]) }));
      for (const u of uploaded) entries.push({ path: u.path, mode: "100644", type: "blob", sha: u.sha });
      for (const path of basePaths) {
        if (!(path in input.files) && remoteBlobs.has(path) && !shouldSkipPath(path)) {
          entries.push({ path, mode: "100644", type: "blob", sha: null });
          deleted.push(path);
        }
      }
      if (!entries.length) {
        return { committed: false as const, commitSha: head.commitSha, treeSha: head.treeSha, changed, added, deleted };
      }
      const treeSha = await client.createTree(owner, repo, head.treeSha, entries);
      const commitSha = await client.createCommit(owner, repo, { message: input.message, tree: treeSha, parents: [head.commitSha] });
      await client.updateRef(owner, repo, branch, commitSha);
      return { committed: true as const, commitSha, treeSha, changed, added, deleted };
    },

    /** Compare local files to the last synced tree (or the branch head when never synced). */
    async status(owner: string, repo: string, branch: string, input: { files: Record<string, string>; lastTreeSha?: string | null; lastCommitSha?: string | null }) {
      const head = await client.getBranchHead(owner, repo, branch);
      const baseSha = input.lastTreeSha ?? head.treeSha;
      const base = await client.getTree(owner, repo, baseSha);
      const baseBlobs = new Map<string, string>();
      for (const e of base.entries) if (e.type === "blob" && !shouldSkipPath(e.path)) baseBlobs.set(e.path, e.sha);
      const added: string[] = [];
      const changed: string[] = [];
      const deleted: string[] = [];
      for (const [path, content] of Object.entries(input.files)) {
        const remoteSha = baseBlobs.get(path);
        if (remoteSha === undefined) added.push(path);
        else if (remoteSha !== gitBlobSha(content)) changed.push(path);
      }
      for (const path of baseBlobs.keys()) if (!(path in input.files)) deleted.push(path);
      let behindBy = 0;
      if (input.lastCommitSha && input.lastCommitSha !== head.commitSha) {
        try {
          behindBy = (await client.compare(owner, repo, input.lastCommitSha, head.commitSha)).aheadBy;
        } catch {
          behindBy = -1; // unknown (e.g. commit no longer reachable)
        }
      }
      return {
        added: added.sort(),
        changed: changed.sort(),
        deleted: deleted.sort(),
        head: { commitSha: head.commitSha, treeSha: head.treeSha },
        lastSync: { commitSha: input.lastCommitSha ?? null, treeSha: input.lastTreeSha ?? null },
        aheadBy: added.length + changed.length + deleted.length,
        behindBy,
        synced: Boolean(input.lastTreeSha),
      };
    },
  };
  return client;
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;
