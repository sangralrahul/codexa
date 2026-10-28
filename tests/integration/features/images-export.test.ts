/** generate_image tool wiring and the ZIP export, against the real test DB (image API mocked). */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/images", async (orig) => {
  const mod = await orig<typeof import("@/lib/ai/images")>();
  return { ...mod, generateProjectImage: vi.fn(async () => ({ url: "https://app.test/api/assets/p/x.webp", width: 1536, height: 1024 })) };
});
let currentUser: User | null = null;
vi.mock("@/lib/auth/guards", async (orig) => {
  const mod = await orig<typeof import("@/lib/auth/guards")>();
  return { ...mod, requireApiUser: async () => { if (!currentUser) throw new mod.AuthError(); return currentUser; } };
});

import { unzipSync, strFromU8 } from "fflate";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaces, type Project, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createProject, writeFile } from "@/lib/services/projects";
import { executeTool, toolNamesForMode } from "@/lib/ai/tools";
import { MAX_IMAGES_PER_RUN } from "@/lib/ai/images";
import { GET as exportZip } from "@/app/api/v1/projects/[id]/export/route";
import { POST as makePwa } from "@/app/api/v1/projects/[id]/pwa/route";

let user: User;
let workspace: Workspace;
let project: Project;

beforeAll(async () => {
  const created = await createUserWithWorkspace({ email: `img-${Date.now()}@example.com`, name: "Img", password: "password123" });
  user = created.user;
  workspace = created.workspace;
  currentUser = user;
  project = await createProject({ workspaceId: workspace.id, name: "Images", templateId: "vite-react-starter", createdBy: user.id });
});
afterAll(async () => {
  if (workspace) await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  if (user) await db.delete(users).where(eq(users.id, user.id));
});

describe("generate_image tool", () => {
  it("is offered only in build mode when images are available", () => {
    expect(toolNamesForMode("build", "work", { images: true })).toContain("generate_image");
    expect(toolNamesForMode("build", "work")).not.toContain("generate_image");
    expect(toolNamesForMode("ask", "work", { images: true })).not.toContain("generate_image");
  });

  it("returns an <img> snippet, counts usage and enforces the per-run limit", async () => {
    const onGenerated = vi.fn(async () => {});
    const ctx = { projectId: project.id, mode: "build" as const, beforeWrite: async () => {}, images: { used: 0, onGenerated } };
    const allowed = toolNamesForMode("build", "work", { images: true });
    const input = { prompt: "A sunlit bakery counter with fresh loaves", aspect: "landscape", alt: "Fresh loaves on the counter" };
    const first = await executeTool(ctx, "generate_image", input, allowed);
    expect(first.isError).toBeFalsy();
    expect(first.output).toContain('<img src="https://app.test/api/assets/p/x.webp"');
    expect(onGenerated).toHaveBeenCalledTimes(1);
    ctx.images.used = MAX_IMAGES_PER_RUN;
    expect((await executeTool(ctx, "generate_image", input, allowed)).isError).toBe(true);
    const noImages = await executeTool({ projectId: project.id, mode: "build", beforeWrite: async () => {} }, "generate_image", input, allowed);
    expect(noImages.isError).toBe(true);
  });
});

describe("export and installable", () => {
  it("downloads the project as a ZIP without secret files", async () => {
    await writeFile(project.id, ".env", "SECRET=1");
    const res = await exportZip(new Request("http://x"), { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    const entries = unzipSync(new Uint8Array(await res.arrayBuffer()));
    const names = Object.keys(entries);
    expect(names.some((n) => n.endsWith("/package.json"))).toBe(true);
    expect(names.some((n) => n.endsWith("/.env"))).toBe(false);
    expect(strFromU8(entries[names.find((n) => n.endsWith("/index.html"))!])).toContain("<html");
  });

  it("makes a Vite project installable", async () => {
    const res = await makePwa(new Request("http://x", { method: "POST" }), { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { paths: string[] };
    expect(body.paths).toEqual(expect.arrayContaining(["public/manifest.webmanifest", "public/sw.js", "index.html"]));
  });
});
