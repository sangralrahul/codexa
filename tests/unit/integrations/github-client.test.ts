import { describe, expect, it } from "vitest";
import { createGitHubClient, gitBlobSha, GitHubError, parseRepoFullName, shouldSkipPath, looksBinary, MAX_IMPORT_FILES } from "@/lib/github/client";
import { detectTemplateId } from "@/lib/github/sync";

type Call = { method: string; url: string; body: unknown };

/** Build a fake GitHub API: a map of "METHOD path" → handler; records every call. */
function fakeGithub(routes: Record<string, (body: unknown, url: URL) => { status?: number; json?: unknown; headers?: Record<string, string> }>) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ method, url: url.pathname + url.search, body });
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer tok_test");
    const key = Object.keys(routes).find((k) => {
      const [m, p] = k.split(" ");
      return m === method && (p.includes("?") ? url.pathname + url.search === p : url.pathname === p);
    });
    if (!key) return new Response(JSON.stringify({ message: `no route ${method} ${url.pathname}` }), { status: 404 });
    const r = routes[key](body, url);
    return new Response(r.json === undefined ? "" : JSON.stringify(r.json), { status: r.status ?? 200, headers: { "content-type": "application/json", ...(r.headers ?? {}) } });
  };
  return { fetchImpl, calls };
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

describe("github client helpers", () => {
  it("parses owner/name and rejects anything else", () => {
    expect(parseRepoFullName("octo-org/my.repo")).toEqual({ owner: "octo-org", repo: "my.repo" });
    expect(() => parseRepoFullName("https://github.com/a/b")).toThrow(GitHubError);
    expect(() => parseRepoFullName("a")).toThrow();
  });
  it("computes git blob shas like git hash-object", () => {
    expect(gitBlobSha("hello\n")).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
    expect(gitBlobSha("")).toBe("e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
  });
  it("skips build dirs, binaries and foreign lock files", () => {
    expect(shouldSkipPath("node_modules/x/index.js")).toMatch(/node_modules/);
    expect(shouldSkipPath("src/.git/config")).toMatch(/\.git/);
    expect(shouldSkipPath("public/logo.png")).toMatch(/binary/);
    expect(shouldSkipPath("Cargo.lock")).toBe("lock file");
    expect(shouldSkipPath("package-lock.json")).toBeNull();
    expect(shouldSkipPath("src/App.tsx")).toBeNull();
  });
  it("detects binary buffers", () => {
    expect(looksBinary(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1]))).toBe(true);
    expect(looksBinary(Buffer.from("plain text ✓", "utf8"))).toBe(false);
  });
  it("maps package.json to a template", () => {
    expect(detectTemplateId({ "package.json": JSON.stringify({ devDependencies: { vite: "^5" } }) })).toBe("vite-react-starter");
    expect(detectTemplateId({ "package.json": JSON.stringify({ dependencies: { express: "^4" } }) })).toBe("node-express-api");
    expect(detectTemplateId({ "index.html": "<h1>hi</h1>" })).toBe("static-site");
    expect(detectTemplateId({ "package.json": "{not json" })).toBe("static-site");
  });
});

describe("github client: repos and user", () => {
  it("lists repos with pagination info and maps fields", async () => {
    const gh = fakeGithub({
      "GET /user/repos": () => ({
        json: [{ id: 1, full_name: "me/app", name: "app", owner: { login: "me" }, private: true, default_branch: "main", description: null, html_url: "https://github.com/me/app", pushed_at: null, permissions: { push: true }, language: "TypeScript" }],
        headers: { link: '<https://api.github.com/user/repos?page=2>; rel="next"' },
      }),
    });
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    const r = await client.listRepos({ perPage: 1 });
    expect(r.hasMore).toBe(true);
    expect(r.repos[0]).toMatchObject({ fullName: "me/app", owner: "me", private: true, canPush: true, defaultBranch: "main" });
    expect(gh.calls[0].url).toContain("per_page=1");
  });
  it("searches by scanning the user's repos", async () => {
    const gh = fakeGithub({
      "GET /user/repos": () => ({
        json: [
          { id: 1, full_name: "me/alpha", name: "alpha", owner: { login: "me" }, private: false, default_branch: "main", description: "first", html_url: "", pushed_at: null, language: null },
          { id: 2, full_name: "me/beta", name: "beta", owner: { login: "me" }, private: false, default_branch: "main", description: "second", html_url: "", pushed_at: null, language: null },
        ],
      }),
    });
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    const r = await client.listRepos({ q: "BETA" });
    expect(r.repos.map((x) => x.fullName)).toEqual(["me/beta"]);
  });
  it("returns the verified primary email", async () => {
    const gh = fakeGithub({
      "GET /user/emails": () => ({ json: [{ email: "x@ex.com", primary: false, verified: true }, { email: "me@ex.com", primary: true, verified: true }] }),
    });
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    expect(await client.getPrimaryEmail()).toBe("me@ex.com");
  });
  it("maps 401 to github_unauthorized and network failures to 502", async () => {
    const gh = fakeGithub({ "GET /user": () => ({ status: 401, json: { message: "Bad credentials" } }) });
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    await expect(client.getUser()).rejects.toMatchObject({ status: 401, code: "github_unauthorized" });
    const down = createGitHubClient({
      token: "tok_test",
      fetch: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    await expect(down.getUser()).rejects.toMatchObject({ status: 502, code: "github_unreachable" });
  });
});

describe("github client: import", () => {
  it("reads the tree and blobs, skipping binaries, big files and build dirs", async () => {
    const blobs: Record<string, string> = { b1: b64("console.log(1)\n"), b2: b64("# readme"), b3: Buffer.from([0, 1, 2]).toString("base64") };
    const gh = fakeGithub({
      "GET /repos/me/app/branches/main": () => ({ json: { commit: { sha: "c1", html_url: "", commit: { tree: { sha: "t1" } } } } }),
      "GET /repos/me/app/git/trees/t1": () => ({
        json: {
          sha: "t1",
          truncated: false,
          tree: [
            { path: "src", mode: "040000", type: "tree", sha: "d" },
            { path: "src/index.ts", mode: "100644", type: "blob", sha: "b1", size: 15 },
            { path: "README.md", mode: "100644", type: "blob", sha: "b2", size: 8 },
            { path: "data.bin", mode: "100644", type: "blob", sha: "b3", size: 3 },
            { path: "node_modules/x.js", mode: "100644", type: "blob", sha: "b9", size: 1 },
            { path: "logo.png", mode: "100644", type: "blob", sha: "b8", size: 1 },
            { path: "huge.txt", mode: "100644", type: "blob", sha: "b7", size: 5_000_000 },
            { path: "link", mode: "120000", type: "blob", sha: "b6", size: 3 },
          ],
        },
      }),
      "GET /repos/me/app/git/blobs/b1": () => ({ json: { content: blobs.b1, encoding: "base64" } }),
      "GET /repos/me/app/git/blobs/b2": () => ({ json: { content: blobs.b2, encoding: "base64" } }),
      "GET /repos/me/app/git/blobs/b3": () => ({ json: { content: blobs.b3, encoding: "base64" } }),
    });
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    const r = await client.importRepository("me", "app", "main");
    expect(r.files).toEqual({ "src/index.ts": "console.log(1)\n", "README.md": "# readme" });
    expect(r.treeSha).toBe("t1");
    expect(r.commitSha).toBe("c1");
    const reasons = Object.fromEntries(r.skipped.map((s) => [s.path, s.reason]));
    expect(reasons["node_modules/x.js"]).toMatch(/node_modules/);
    expect(reasons["logo.png"]).toMatch(/binary/);
    expect(reasons["huge.txt"]).toMatch(/larger/);
    expect(reasons["link"]).toBe("symlink");
    expect(reasons["data.bin"]).toBe("binary (.bin)");
    // blobs for skipped entries are never fetched
    expect(gh.calls.some((c) => c.url.includes("/git/blobs/b9") || c.url.includes("/git/blobs/b8") || c.url.includes("/git/blobs/b7"))).toBe(false);
  });
  it("caps the import at MAX_IMPORT_FILES and flags truncation", async () => {
    const tree = Array.from({ length: MAX_IMPORT_FILES + 5 }, (_, i) => ({ path: `f${i}.txt`, mode: "100644", type: "blob", sha: `s${i}`, size: 1 }));
    const gh = fakeGithub({
      "GET /repos/me/app/branches/main": () => ({ json: { commit: { sha: "c1", html_url: "", commit: { tree: { sha: "t1" } } } } }),
      "GET /repos/me/app/git/trees/t1": () => ({ json: { sha: "t1", truncated: false, tree } }),
    });
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/git/blobs/")) return new Response(JSON.stringify({ content: b64("x"), encoding: "base64" }), { status: 200 });
      return gh.fetchImpl(input, init);
    };
    const client = createGitHubClient({ token: "tok_test", fetch: fetchImpl });
    const r = await client.importRepository("me", "app", "main");
    expect(Object.keys(r.files)).toHaveLength(MAX_IMPORT_FILES);
    expect(r.truncated).toBe(true);
    expect(r.skipped.filter((s) => /file limit/.test(s.reason))).toHaveLength(5);
  });
});

describe("github client: push and status", () => {
  const headTree = [
    { path: "a.txt", mode: "100644", type: "blob", sha: gitBlobSha("A\n"), size: 2 },
    { path: "b.txt", mode: "100644", type: "blob", sha: gitBlobSha("B\n"), size: 2 },
    { path: "c.txt", mode: "100644", type: "blob", sha: gitBlobSha("C\n"), size: 2 },
  ];
  function pushFixture(opts: { refStatus?: number } = {}) {
    return fakeGithub({
      "GET /repos/me/app/branches/main": () => ({ json: { commit: { sha: "head1", html_url: "", commit: { tree: { sha: "tree1" } } } } }),
      "GET /repos/me/app/git/trees/tree1": () => ({ json: { sha: "tree1", truncated: false, tree: headTree } }),
      "POST /repos/me/app/git/blobs": (body) => ({ status: 201, json: { sha: "blob_" + gitBlobSha(Buffer.from((body as { content: string }).content, "base64")) } }),
      "POST /repos/me/app/git/trees": () => ({ status: 201, json: { sha: "tree2" } }),
      "POST /repos/me/app/git/commits": () => ({ status: 201, json: { sha: "commit2" } }),
      "PATCH /repos/me/app/git/refs/heads/main": () => (opts.refStatus ? { status: opts.refStatus, json: { message: "Update is not a fast forward" } } : { json: { object: { sha: "commit2" } } }),
    });
  }
  it("creates blobs only for changed files, deletes removed ones, commits and fast-forwards the ref", async () => {
    const gh = pushFixture();
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    const r = await client.pushFiles("me", "app", "main", { files: { "a.txt": "A\n", "b.txt": "B2\n", "d.txt": "D\n" }, message: "update", baseTreeSha: "tree1" });
    expect(r.committed).toBe(true);
    expect(r.commitSha).toBe("commit2");
    expect(r.changed).toEqual(["b.txt"]);
    expect(r.added).toEqual(["d.txt"]);
    expect(r.deleted).toEqual(["c.txt"]);
    const blobCalls = gh.calls.filter((c) => c.method === "POST" && c.url === "/repos/me/app/git/blobs");
    expect(blobCalls).toHaveLength(2);
    const treeCall = gh.calls.find((c) => c.method === "POST" && c.url === "/repos/me/app/git/trees")!;
    const treeBody = treeCall.body as { base_tree: string; tree: { path: string; sha: string | null }[] };
    expect(treeBody.base_tree).toBe("tree1");
    expect(treeBody.tree.find((e) => e.path === "c.txt")?.sha).toBeNull();
    const commitCall = gh.calls.find((c) => c.method === "POST" && c.url === "/repos/me/app/git/commits")!;
    expect(commitCall.body).toEqual({ message: "update", tree: "tree2", parents: ["head1"] });
    const refCall = gh.calls.find((c) => c.method === "PATCH")!;
    expect(refCall.body).toEqual({ sha: "commit2", force: false });
  });
  it("is a no-op when nothing changed", async () => {
    const gh = pushFixture();
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    const r = await client.pushFiles("me", "app", "main", { files: { "a.txt": "A\n", "b.txt": "B\n", "c.txt": "C\n" }, message: "noop", baseTreeSha: "tree1" });
    expect(r.committed).toBe(false);
    expect(gh.calls.some((c) => c.method === "POST" || c.method === "PATCH")).toBe(false);
  });
  it("does not delete upstream files when there is no base tree (first push)", async () => {
    const gh = pushFixture();
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    const r = await client.pushFiles("me", "app", "main", { files: { "a.txt": "A\n" }, message: "first", baseTreeSha: null });
    expect(r.committed).toBe(false);
    expect(r.deleted).toEqual([]);
  });
  it("surfaces a 409 non_fast_forward when the ref update is rejected, never forcing", async () => {
    const gh = pushFixture({ refStatus: 422 });
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    await expect(client.pushFiles("me", "app", "main", { files: { "a.txt": "changed\n" }, message: "x", baseTreeSha: "tree1" })).rejects.toMatchObject({ status: 409, code: "non_fast_forward" });
    for (const c of gh.calls.filter((c) => c.method === "PATCH")) expect((c.body as { force: boolean }).force).toBe(false);
  });
  it("reports added/changed/deleted against the last synced tree and behind count from compare", async () => {
    const gh = fakeGithub({
      "GET /repos/me/app/branches/main": () => ({ json: { commit: { sha: "head9", html_url: "", commit: { tree: { sha: "tree9" } } } } }),
      "GET /repos/me/app/git/trees/tree1": () => ({ json: { sha: "tree1", truncated: false, tree: headTree } }),
      "GET /repos/me/app/compare/head1...head9": () => ({ json: { ahead_by: 3, behind_by: 0 } }),
    });
    const client = createGitHubClient({ token: "tok_test", fetch: gh.fetchImpl });
    const s = await client.status("me", "app", "main", { files: { "a.txt": "A\n", "b.txt": "B2\n", "new.txt": "n" }, lastTreeSha: "tree1", lastCommitSha: "head1" });
    expect(s.added).toEqual(["new.txt"]);
    expect(s.changed).toEqual(["b.txt"]);
    expect(s.deleted).toEqual(["c.txt"]);
    expect(s.aheadBy).toBe(3);
    expect(s.behindBy).toBe(3);
    expect(s.synced).toBe(true);
    expect(s.head.commitSha).toBe("head9");
  });
});
