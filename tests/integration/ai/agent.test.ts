import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usageEvents, users, workspaces, type Project, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createProject, getAllFiles, listSnapshots, restoreSnapshot } from "@/lib/services/projects";
import { getUsageSummary, QuotaExceededError } from "@/lib/services/usage";
import { PLANS } from "@/config/plans";
import { ApiError } from "@/lib/api";
import { executeRun, prepareRun, validatePrompt, type AgentEvent } from "@/lib/ai/agent";
import { cancelRun, getRun, listConversations, listMessages } from "@/lib/ai/runs";
import { getAiStatus } from "@/lib/ai/keys";

let user: User;
let workspace: Workspace;
let project: Project;
let originalFiles: Record<string, string>;

const suffix = Date.now().toString(36);

async function newProject(name: string) {
  return createProject({ workspaceId: workspace.id, name, templateId: "vite-react-starter", createdBy: user.id });
}

async function runAgent(input: { prompt: string; mode?: "build" | "ask" | "fix"; conversationId?: string | null; onEvent?: (e: AgentEvent, runId: string) => void | Promise<void>; project?: Project }) {
  const prepared = await prepareRun({ project: input.project ?? project, workspaceId: workspace.id, userId: user.id, prompt: input.prompt, mode: input.mode, conversationId: input.conversationId ?? null });
  const events: AgentEvent[] = [];
  const done = await executeRun(prepared, {
    onEvent: async (e) => {
      events.push(e);
      await input.onEvent?.(e, prepared.runId);
    },
  });
  return { prepared, events, done };
}

beforeAll(async () => {
  process.env.AI_MOCK = "1";
  const created = await createUserWithWorkspace({ email: `ai-agent-${suffix}@example.com`, password: "password123", name: "AI Tester", emailVerified: true });
  user = created.user;
  workspace = created.workspace;
  project = await newProject(`AI agent test ${suffix}`);
  originalFiles = await getAllFiles(project.id);
});

afterAll(async () => {
  if (workspace) await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  if (user) await db.delete(users).where(eq(users.id, user.id));
});

beforeEach(() => {
  process.env.AI_MOCK = "1";
});

describe("AI engine (mock provider, real test DB)", () => {
  it("reports the mock provider as configured and never pretends when it is not", async () => {
    expect(await getAiStatus(workspace.id)).toMatchObject({ configured: true, provider: "mock", mock: true, missingEnv: [] });
    process.env.AI_MOCK = "0";
    const status = await getAiStatus(workspace.id);
    expect(status.mock).toBe(false);
    // No real keys exist in the test environment.
    expect(status.configured).toBe(false);
    expect(status.missingEnv).toEqual(["ANTHROPIC_API_KEY", "OPENAI_API_KEY"]);
  });

  it("refuses to start when no provider is configured (503 ai_not_configured)", async () => {
    process.env.AI_MOCK = "0";
    await expect(prepareRun({ project, workspaceId: workspace.id, userId: user.id, prompt: "hello" })).rejects.toMatchObject({ status: 503, code: "ai_not_configured" });
  });

  it("validates prompts", () => {
    expect(() => validatePrompt("")).toThrow(ApiError);
    expect(() => validatePrompt("   ")).toThrow(/empty/);
    expect(() => validatePrompt("x".repeat(9000))).toThrow(/too long/);
    expect(validatePrompt("  hi\r\nthere ")).toBe("hi\nthere");
  });

  it("runs a build end to end: plan → tools → file changes → snapshot → run row → usage", async () => {
    const before = await getUsageSummary(workspace.id);
    const { prepared, events, done } = await runAgent({ prompt: "Add a counter feature" });

    expect(done.status).toBe("succeeded");
    expect(done.changedFiles.map((f) => f.path).sort()).toEqual(["src/App.tsx", "src/components/Feature.tsx"]);
    expect(done.summary).toContain("Add a counter feature");
    expect(done.validation?.skipped).toMatch(/not available/);

    // Event stream shape.
    const types = events.map((e) => e.type);
    expect(types[0]).toBe("run");
    expect(types).toContain("plan");
    expect(types).toContain("text");
    expect(types).toContain("tool_call");
    expect(types).toContain("tool_result");
    expect(types).toContain("file_change");
    expect(types).toContain("usage");
    expect(types.at(-1)).toBe("done");
    const stages = events.filter((e): e is Extract<AgentEvent, { type: "stage" }> => e.type === "stage").map((e) => e.stage);
    expect(stages).toEqual(expect.arrayContaining(["loading_context", "planning", "working", "validating", "done"]));
    const plan = events.find((e) => e.type === "plan");
    expect(plan && plan.type === "plan" && plan.steps.length).toBeGreaterThanOrEqual(3);

    // Files really changed.
    const files = await getAllFiles(project.id);
    expect(files["src/components/Feature.tsx"]).toContain("Add a counter feature");
    expect(files["src/App.tsx"]).not.toBe(originalFiles["src/App.tsx"]);
    expect(files["src/App.tsx"]).toContain('from "./components/Feature"');

    // Snapshot before the first write, linked on the run row.
    const run = await getRun(project.id, prepared.runId);
    expect(run).toBeTruthy();
    expect(run!.status).toBe("succeeded");
    expect(run!.stage).toBe("done");
    expect(run!.snapshotBeforeId).toBeTruthy();
    expect(run!.plan.length).toBeGreaterThanOrEqual(3);
    expect(run!.changedFiles.map((f) => f.path).sort()).toEqual(["src/App.tsx", "src/components/Feature.tsx"]);
    expect(run!.tokensIn + run!.tokensOut).toBeGreaterThan(0);
    expect(run!.startedAt).toBeTruthy();
    expect(run!.finishedAt).toBeTruthy();
    expect(run!.error).toBeNull();
    const snaps = await listSnapshots(project.id);
    const snap = snaps.find((s) => s.id === run!.snapshotBeforeId);
    expect(snap).toMatchObject({ kind: "ai", name: `Before AI run ${prepared.runId.slice(0, 8)}` });

    // Conversation + messages persisted with parts.
    const convs = await listConversations(project.id);
    const conv = convs.find((c) => c.id === prepared.conversationId);
    expect(conv?.title).toBe("Add a counter feature");
    const msgs = await listMessages(prepared.conversationId);
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant"]);
    const assistant = msgs[1];
    expect(assistant.content).toContain("Add a counter feature");
    const partTypes = new Set(assistant.parts.map((p) => p.type));
    expect([...partTypes]).toEqual(expect.arrayContaining(["stage", "plan", "text", "tool_call", "tool_result", "file_change"]));
    expect(assistant.tokensIn + assistant.tokensOut).toBe(run!.tokensIn + run!.tokensOut);

    // Usage recorded: one request and the tokens.
    const after = await getUsageSummary(workspace.id);
    expect(after.used.ai_request - before.used.ai_request).toBe(1);
    expect(after.used.ai_tokens - before.used.ai_tokens).toBe(run!.tokensIn + run!.tokensOut);

    // Revert restores the pre-run files.
    await restoreSnapshot(project.id, run!.snapshotBeforeId!, user.id);
    const restored = await getAllFiles(project.id);
    expect(restored).toEqual(originalFiles);
  });

  it("continues an existing conversation and keeps history", async () => {
    const first = await runAgent({ prompt: "Add a header", mode: "ask" });
    const second = await runAgent({ prompt: "And a footer?", mode: "ask", conversationId: first.prepared.conversationId });
    expect(second.prepared.conversationId).toBe(first.prepared.conversationId);
    expect(second.prepared.history.map((h) => h.role)).toEqual(["user", "assistant"]);
    const msgs = await listMessages(first.prepared.conversationId);
    expect(msgs).toHaveLength(4);
    await expect(prepareRun({ project, workspaceId: workspace.id, userId: user.id, prompt: "x", conversationId: "missing" })).rejects.toMatchObject({ status: 404 });
  });

  it("ask mode never writes files or creates snapshots", async () => {
    const p = await newProject(`AI ask test ${suffix}`);
    const filesBefore = await getAllFiles(p.id);
    const { events, done } = await runAgent({ prompt: "What does App.tsx render?", mode: "ask", project: p });
    expect(done.status).toBe("succeeded");
    expect(done.changedFiles).toEqual([]);
    expect(events.some((e) => e.type === "plan")).toBe(false);
    expect(events.filter((e) => e.type === "tool_call").map((e) => (e as { name: string }).name)).toEqual(["list_files", "read_file"]);
    const answer = events.filter((e): e is Extract<AgentEvent, { type: "text" }> => e.type === "text").map((e) => e.delta).join("");
    expect(answer).toContain("What does App.tsx render?");
    expect(await getAllFiles(p.id)).toEqual(filesBefore);
    expect((await listSnapshots(p.id)).filter((s) => s.kind === "ai")).toEqual([]);
  });

  it("can be cancelled between steps and records the cancelled status", async () => {
    const p = await newProject(`AI cancel test ${suffix}`);
    const filesBefore = await getAllFiles(p.id);
    let cancelled = false;
    const { prepared, events, done } = await runAgent({
      prompt: "Add a sidebar",
      project: p,
      onEvent: async (e, runId) => {
        // Cancel (as the cancel route would) as soon as the model starts exploring; the loop checks the flag before the next step.
        if (!cancelled && e.type === "tool_call" && e.name === "list_files") {
          cancelled = true;
          await cancelRun(p.id, runId);
        }
      },
    });
    expect(done.status).toBe("cancelled");
    expect(events.at(-1)).toMatchObject({ type: "done", status: "cancelled" });
    expect(events.some((e) => e.type === "stage" && e.stage === "cancelled")).toBe(true);
    const run = await getRun(p.id, prepared.runId);
    expect(run?.status).toBe("cancelled");
    expect(run?.finishedAt).toBeTruthy();
    expect(await getAllFiles(p.id)).toEqual(filesBefore);
    // Usage is still recorded for the attempt.
    const { used } = await getUsageSummary(workspace.id);
    expect(used.ai_request).toBeGreaterThan(0);
    // A second cancel is a no-op that returns the final row.
    expect((await cancelRun(p.id, prepared.runId))?.status).toBe("cancelled");
  });

  it("rejects runs with 402 once the plan's AI request quota is used up", async () => {
    const limit = PLANS.free.limits.aiRequestsPerMonth;
    expect(limit).toBeGreaterThan(0);
    const { used } = await getUsageSummary(workspace.id);
    await db.insert(usageEvents).values({ workspaceId: workspace.id, projectId: project.id, userId: user.id, kind: "ai_request", quantity: Math.max(0, limit - used.ai_request), metadata: { test: true } });
    const err = await prepareRun({ project, workspaceId: workspace.id, userId: user.id, prompt: "one more" }).catch((e) => e);
    expect(err).toBeInstanceOf(QuotaExceededError);
    expect(err.status).toBe(402);
    expect(err.code).toBe("quota_exceeded");
    // No conversation or message rows were created for the refused run.
    const convs = await listConversations(project.id);
    expect(convs.some((c) => c.title === "one more")).toBe(false);
  });
});
