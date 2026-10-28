/**
 * Plan mode, approved plans, prompt images, the prompt enhancer and direct visual edits, against
 * the real test database and R2 with the scripted mock AI provider (AI_MOCK=1).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaces, type Project, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createProject, readFile, writeFile } from "@/lib/services/projects";
import { executeRun, prepareRun, type AgentEvent } from "@/lib/ai/agent";
import { listMessages } from "@/lib/ai/runs";
import { enhancePrompt } from "@/lib/ai/enhance";
import { applyVisualEdits } from "@/lib/services/visual-edit";
import { attachmentKey, getObject } from "@/lib/storage";

let user: User;
let workspace: Workspace;
let project: Project;
const suffix = Date.now().toString(36);
// 1×1 transparent PNG.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function run(input: Parameters<typeof prepareRun>[0]) {
  const prepared = await prepareRun(input);
  const events: AgentEvent[] = [];
  const done = await executeRun(prepared, { onEvent: (e) => void events.push(e) });
  return { prepared, events, done };
}

beforeAll(async () => {
  process.env.AI_MOCK = "1";
  const created = await createUserWithWorkspace({ email: `features-${suffix}@example.com`, name: "Feature Tester", password: "password123" });
  user = created.user;
  workspace = created.workspace;
  project = await createProject({ workspaceId: workspace.id, name: "Features", templateId: "vite-react-starter", createdBy: user.id });
});

afterAll(async () => {
  if (workspace) await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  if (user) await db.delete(users).where(eq(users.id, user.id));
});

describe("plan mode", () => {
  it("proposes a plan without changing files, then builds the approved plan", async () => {
    const planned = await run({ project, workspaceId: workspace.id, userId: user.id, prompt: "Add a pricing section", mode: "plan" });
    expect(planned.done.status).toBe("succeeded");
    expect(planned.done.changedFiles).toEqual([]);
    const planEvent = planned.events.find((e): e is Extract<AgentEvent, { type: "plan" }> => e.type === "plan");
    expect(planEvent?.approval).toBe("pending");
    expect(planEvent?.steps.length).toBeGreaterThan(0);

    const steps = planEvent!.steps;
    const built = await run({ project, workspaceId: workspace.id, userId: user.id, prompt: "Add a pricing section", mode: "build", conversationId: planned.prepared.conversationId, approvedPlan: steps });
    expect(built.done.status).toBe("succeeded");
    const plan = built.events.find((e): e is Extract<AgentEvent, { type: "plan" }> => e.type === "plan");
    expect(plan?.steps).toEqual(steps);
    expect(plan?.approval).toBeUndefined();
    // The approved plan is used as is: no second planning stage.
    expect(built.events.some((e) => e.type === "stage" && e.stage === "planning")).toBe(false);
  });
});

describe("prompt images", () => {
  it("stores attached images in R2 and records them on the user message", async () => {
    const { prepared, done } = await run({
      project,
      workspaceId: workspace.id,
      userId: user.id,
      prompt: "Build this page",
      mode: "ask",
      images: [{ name: "shot.png", mediaType: "image/png", data: PNG, width: 1, height: 1 }],
    });
    expect(done.status).toBe("succeeded");
    expect(prepared.images).toHaveLength(1);
    const msgs = await listMessages(prepared.conversationId, 10);
    const image = msgs.find((m) => m.role === "user")?.parts.find((p) => p.type === "image");
    expect(image).toMatchObject({ type: "image", mediaType: "image/png", name: "shot.png" });
    const obj = await getObject(attachmentKey(project.id, (image as { file: string }).file));
    expect(obj).not.toBeNull();
    expect((await obj!.arrayBuffer()).byteLength).toBeGreaterThan(60);
  });
});

describe("prompt enhancer", () => {
  it("expands a one-line idea (mock provider)", async () => {
    const out = await enhancePrompt({ workspaceId: workspace.id, userId: user.id, prompt: "A booking site for a dog groomer" });
    expect(out).toContain("a booking site for a dog groomer");
    expect(out.split("\n").filter((l) => l.startsWith("- ")).length).toBeGreaterThanOrEqual(4);
  });
});

describe("visual edits", () => {
  it("applies an exact single match, refuses ambiguous or unsafe edits, and reports undo content", async () => {
    await writeFile(project.id, "src/Hero.tsx", `export function Hero() {\n  return (\n    <section className="py-20 text-center">\n      <h1 className="text-4xl font-bold text-slate-900">Fresh bread,\n        every morning</h1>\n      <p>Order ahead</p>\n      <p>Order ahead</p>\n    </section>\n  );\n}\n`);
    const res = await applyVisualEdits(project.id, user.id, [
      { kind: "text", from: "Fresh bread, every morning", to: "Bread baked at dawn" },
      { kind: "class", from: "text-4xl font-bold text-slate-900", to: "text-5xl font-bold text-[#0f766e]" },
      { kind: "text", from: "Order ahead", to: "Order now" },
      { kind: "text", from: "Bread baked at dawn", to: "Say {hello}" },
    ]);
    expect(res.results.map((r) => r.applied)).toEqual([true, true, false, false]);
    expect(res.results[2].reason).toBe("ambiguous");
    expect(res.results[3].reason).toBe("unsafe");
    expect(res.changed).toEqual(["src/Hero.tsx"]);
    expect(res.before["src/Hero.tsx"]).toContain("Fresh bread,");
    const file = await readFile(project.id, "src/Hero.tsx");
    expect(file?.content).toContain(`<h1 className="text-5xl font-bold text-[#0f766e]">Bread baked at dawn</h1>`);
  });
});
