import "server-only";
import type { MessagePart, Project } from "@/db/schema";
import { ApiError, badRequest } from "@/lib/api";
import { logger } from "@/lib/logger";
import { createSnapshot, logActivity } from "@/lib/services/projects";
import { assertQuota, recordUsage } from "@/lib/services/usage";
import { execInProject, getRuntimeStatus, type ExecCommand } from "@/lib/runtime/exec";
import { loadProjectContext, type ProjectContext } from "./context";
import { resolveAiCredentials, type AiCredentials } from "./keys";
import { buildSystemPrompt, buildUserMessage, fixModeDefaultPrompt, repairMessage } from "./prompts";
import type { AiProvider, ChatMessage, StopReason, ToolCall, ToolDefinition, ToolResult } from "./provider";
import { createProvider } from "./providers";
import {
  cancelRun,
  createConversation,
  createRun,
  finishRun,
  getConversation,
  getRunStatus,
  insertMessage,
  listMessages,
  registerActiveRun,
  titleFromPrompt,
  touchConversation,
  unregisterActiveRun,
  updateMessage,
  updateRun,
} from "./runs";
import { executeTool, toolDefinitionsFor, toolNamesForMode, type AgentMode, type FileChange } from "./tools";
import { summarizeToolInput } from "./tools/schemas";
import { truncateMiddle, truncateTail } from "./tools/truncate";

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------
export const LIMITS = {
  promptMaxChars: 8_000,
  maxToolCalls: 40,
  maxTurns: 60,
  maxDurationMs: 25 * 60 * 1000,
  maxOutputTokensPerCall: 16_000,
  maxRepairAttempts: 2,
  providerRetries: 2,
  uiToolOutputChars: 6_000,
  uiToolInputChars: 2_000,
  historyMessages: 10,
} as const;

/**
 * Wall-clock budget for one run. Serverless hosts stop functions after a fixed
 * duration (see maxDuration on the generate route), so the agent must finish
 * and persist its result before that. Override with AI_RUN_TIMEOUT_MS.
 */
export function runTimeLimitMs(): number {
  const configured = Number(process.env.AI_RUN_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return process.env.VERCEL ? 270_000 : LIMITS.maxDurationMs;
}

function formatLimit(ms: number) {
  const min = Math.round(ms / 60_000);
  return min >= 1 ? `${min} minute` : `${Math.round(ms / 1000)} second`;
}

export type RunStatus = "succeeded" | "failed" | "cancelled";

export type AgentEvent =
  | { type: "run"; runId: string; conversationId: string; messageId: string; userMessageId: string; mode: AgentMode; provider: string; model: string; mock: boolean }
  | { type: "stage"; stage: string; detail?: string }
  | { type: "text"; delta: string }
  | { type: "tool_call"; id: string; name: string; input: unknown; summary: string }
  | { type: "tool_result"; id: string; name: string; output: string; isError?: boolean }
  | { type: "file_change"; path: string; action: FileChange["action"]; summary?: string }
  | { type: "plan"; steps: string[] }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "error"; message: string; code?: string; retryable?: boolean }
  | {
      type: "done";
      status: RunStatus;
      runId: string;
      changedFiles: FileChange[];
      summary?: string;
      nextSteps?: string[];
      validation?: { ok: boolean; command?: string; output?: string; skipped?: string };
      error?: string;
    };

export type PreparedRun = {
  project: Project;
  workspaceId: string;
  userId: string;
  mode: AgentMode;
  prompt: string;
  creds: AiCredentials;
  provider: AiProvider;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  runId: string;
  history: { role: string; content: string }[];
};

export class AgentCancelled extends Error {}
export class AgentFailure extends Error {
  code: string;
  constructor(message: string, code = "agent_error") {
    super(message);
    this.code = code;
  }
}

export function validatePrompt(raw: unknown): string {
  if (typeof raw !== "string") throw badRequest("prompt must be a string");
  const prompt = raw.replace(/\r\n/g, "\n").trim();
  if (!prompt) throw badRequest("Prompt must not be empty");
  if (prompt.length > LIMITS.promptMaxChars) throw badRequest(`Prompt is too long (max ${LIMITS.promptMaxChars} characters)`);
  if (/[\0]/.test(prompt)) throw badRequest("Prompt contains invalid characters");
  return prompt;
}

/**
 * Everything that must succeed before we start streaming: validation, quota,
 * provider availability and the DB rows for the conversation/messages/run.
 * Throws ApiErrors (400/402/503) so the route can return JSON before the SSE
 * stream opens.
 */
export async function prepareRun(input: {
  project: Project;
  workspaceId: string;
  userId: string;
  prompt: string;
  mode?: AgentMode;
  conversationId?: string | null;
}): Promise<PreparedRun> {
  const mode: AgentMode = input.mode ?? "build";
  const prompt = validatePrompt(input.prompt);
  const creds = await resolveAiCredentials(input.workspaceId);
  const provider = createProvider(creds);
  if (!creds.configured || !provider) {
    throw new ApiError(503, "AI is not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY on the server.", "ai_not_configured", { missingEnv: ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"] });
  }
  await assertQuota(input.workspaceId, "ai_request");

  let conversation = input.conversationId ? await getConversation(input.project.id, input.conversationId) : null;
  if (input.conversationId && !conversation) throw new ApiError(404, "Conversation not found", "not_found");
  let history: { role: string; content: string }[] = [];
  if (!conversation) {
    conversation = await createConversation(input.project.id, input.userId, titleFromPrompt(prompt));
  } else {
    const prior = await listMessages(conversation.id, 200);
    history = prior
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
      .slice(-LIMITS.historyMessages)
      .map((m) => ({ role: m.role, content: m.content }));
    if (conversation.title === "New chat") await touchConversation(conversation.id, titleFromPrompt(prompt));
  }
  const userMessage = await insertMessage({ conversationId: conversation.id, role: "user", content: prompt, parts: [{ type: "text", text: prompt }] });
  const assistantMessage = await insertMessage({ conversationId: conversation.id, role: "assistant", content: "", parts: [{ type: "stage", stage: "queued" }], model: creds.model });
  const run = await createRun({ projectId: input.project.id, conversationId: conversation.id, messageId: assistantMessage.id, userId: input.userId, provider: creds.provider, model: creds.model });
  return {
    project: input.project,
    workspaceId: input.workspaceId,
    userId: input.userId,
    mode,
    prompt,
    creds,
    provider,
    conversationId: conversation.id,
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
    runId: run.id,
    history,
  };
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
type ProviderTurn = { text: string; toolCalls: ToolCall[]; stop: StopReason; error: { message: string; code?: string; retryable?: boolean } | null; inputTokens: number; outputTokens: number };

/**
 * Run the agent loop. `onEvent` may return a promise; the loop awaits it so
 * consumers (SSE writer, tests) can apply backpressure or act before the next step.
 */
export async function executeRun(prepared: PreparedRun, handlers: { onEvent: (event: AgentEvent) => void | Promise<void> }): Promise<Extract<AgentEvent, { type: "done" }>> {
  const { project, runId, mode, provider } = prepared;
  const startedAt = Date.now();
  const controller = new AbortController();
  registerActiveRun(runId, controller);

  const parts: MessagePart[] = [];
  const changed = new Map<string, FileChange>();
  let tokensIn = 0;
  let tokensOut = 0;
  let plan: string[] = [];
  let repairAttempts = 0;
  let snapshotBeforeId: string | null = null;
  let toolCalls = 0;
  let turns = 0;
  let finishSummary: string | undefined;
  let finishNextSteps: string[] | undefined;
  let lastText = "";
  let currentText: Extract<MessagePart, { type: "text" }> | null = null;
  let stage = "queued";
  let persistTimer: NodeJS.Timeout | null = null;

  const emit = async (event: AgentEvent) => {
    try {
      await handlers.onEvent(event);
    } catch (err) {
      logger.warn("ai event handler threw", { error: err instanceof Error ? err : String(err) });
    }
  };

  const persist = async () => {
    const content = finishSummary ?? parts.filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text").map((p) => p.text).join("\n").trim();
    await updateMessage(prepared.assistantMessageId, { parts: [...parts], content, tokensIn, tokensOut });
    await updateRun(runId, { stage, changedFiles: [...changed.values()].map((c) => ({ path: c.path, action: c.action })), tokensIn, tokensOut, plan, repairAttempts });
  };
  const schedulePersist = () => {
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persist().catch((err) => logger.warn("ai persist failed", { error: err instanceof Error ? err : String(err) }));
    }, 500);
  };

  const setStage = async (next: string, detail?: string) => {
    stage = next;
    currentText = null;
    parts.push({ type: "stage", stage: next, detail });
    await emit({ type: "stage", stage: next, detail });
    await updateRun(runId, { stage: next, status: "running" });
    schedulePersist();
  };

  const isCancelled = async () => {
    if (controller.signal.aborted) return true;
    const status = await getRunStatus(runId);
    if (status === "cancelled") {
      controller.abort();
      return true;
    }
    return false;
  };
  const checkLimits = async () => {
    if (await isCancelled()) throw new AgentCancelled();
    if (Date.now() - startedAt > runTimeLimitMs()) throw new AgentFailure(`The run exceeded the ${formatLimit(runTimeLimitMs())} time limit.`, "time_limit");
  };

  const ctxTools = {
    projectId: project.id,
    mode,
    beforeWrite: async () => {
      if (snapshotBeforeId) return;
      const snap = await createSnapshot(project.id, { name: `Before AI run ${runId.slice(0, 8)}`, kind: "ai", createdBy: prepared.userId });
      snapshotBeforeId = snap.id;
      await updateRun(runId, { snapshotBeforeId });
    },
  };

  const callProvider = async (system: string, messages: ChatMessage[], tools: ToolDefinition[]): Promise<ProviderTurn> => {
    for (let attempt = 0; ; attempt++) {
      const turn: ProviderTurn = { text: "", toolCalls: [], stop: "other", error: null, inputTokens: 0, outputTokens: 0 };
      for await (const ev of provider.stream({ system, messages, tools, model: prepared.creds.model, maxTokens: LIMITS.maxOutputTokensPerCall, abortSignal: controller.signal })) {
        if (ev.type === "text_delta") {
          turn.text += ev.text;
          lastText = turn.text;
          if (!currentText) {
            currentText = { type: "text", text: "" };
            parts.push(currentText);
          }
          currentText.text += ev.text;
          await emit({ type: "text", delta: ev.text });
        } else if (ev.type === "tool_call") {
          turn.toolCalls.push({ id: ev.id, name: ev.name, input: ev.input });
        } else if (ev.type === "usage") {
          turn.inputTokens = ev.inputTokens;
          turn.outputTokens = ev.outputTokens;
        } else if (ev.type === "error") {
          turn.error = { message: ev.message, code: ev.code, retryable: ev.retryable };
        } else if (ev.type === "stop") {
          turn.stop = ev.reason;
        }
      }
      tokensIn += turn.inputTokens;
      tokensOut += turn.outputTokens;
      if (controller.signal.aborted || turn.stop === "cancelled") throw new AgentCancelled();
      if (turn.error && !turn.toolCalls.length) {
        if (turn.error.retryable && attempt < LIMITS.providerRetries && !turn.text) {
          await emit({ type: "stage", stage: stage, detail: `Provider error, retrying (${attempt + 1}/${LIMITS.providerRetries}): ${turn.error.message}` });
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new AgentFailure(turn.error.message, turn.error.code ?? "provider_error");
      }
      return turn;
    }
  };

  const toolNames = toolNamesForMode(mode, "work");
  const runTools = async (calls: ToolCall[]): Promise<{ results: ToolResult[]; finished: boolean }> => {
    const results: ToolResult[] = [];
    let finished = false;
    for (const call of calls) {
      await checkLimits();
      toolCalls++;
      currentText = null;
      const uiInput = compactInput(call.input);
      parts.push({ type: "tool_call", id: call.id, name: call.name, input: uiInput });
      await emit({ type: "tool_call", id: call.id, name: call.name, input: uiInput, summary: summarizeToolInput(call.name, call.input) });
      const exec = await executeTool(ctxTools, call.name, call.input, toolNames);
      const uiOutput = truncateMiddle(exec.output, LIMITS.uiToolOutputChars);
      parts.push({ type: "tool_result", id: call.id, name: call.name, output: uiOutput, isError: exec.isError });
      await emit({ type: "tool_result", id: call.id, name: call.name, output: uiOutput, isError: exec.isError });
      if (exec.fileChange) {
        const prev = changed.get(exec.fileChange.path);
        const action = prev?.action === "create" && exec.fileChange.action === "update" ? "create" : exec.fileChange.action;
        const fc: FileChange = { ...exec.fileChange, action };
        changed.set(fc.path, fc);
        parts.push({ type: "file_change", path: fc.path, action: fc.action, summary: fc.summary });
        await emit({ type: "file_change", path: fc.path, action: fc.action, summary: fc.summary });
      }
      if (exec.control?.type === "finish") {
        finished = true;
        finishSummary = exec.control.input.summary;
        finishNextSteps = exec.control.input.nextSteps;
      }
      results.push({ toolCallId: call.id, name: call.name, output: exec.output, isError: exec.isError });
      schedulePersist();
      if (toolCalls >= LIMITS.maxToolCalls && !finished) break;
    }
    return { results, finished };
  };

  /** The iterative tool loop. Returns when the model finishes or a limit is hit. */
  const workLoop = async (system: string, messages: ChatMessage[], tools: ToolDefinition[]): Promise<void> => {
    let truncatedRetries = 0;
    while (turns < LIMITS.maxTurns) {
      await checkLimits();
      turns++;
      const turn = await callProvider(system, messages, tools);
      messages.push({ role: "assistant", text: turn.text, toolCalls: turn.toolCalls });
      if (!turn.toolCalls.length) {
        if (turn.stop === "refusal") throw new AgentFailure("The model declined this request.", "refusal");
        if (turn.stop === "max_tokens" && truncatedRetries < 2) {
          truncatedRetries++;
          messages.push({ role: "user", content: "Your previous response was cut off by the output token limit. Continue in smaller steps." });
          continue;
        }
        return; // end_turn: the model is done talking.
      }
      if (turn.stop === "max_tokens") {
        // Tool input may be truncated; do not execute it blindly.
        messages.push({ role: "tool", results: turn.toolCalls.map((c) => ({ toolCallId: c.id, name: c.name, output: "Tool input was truncated by the output token limit; retry with smaller content (split the file or edit in pieces).", isError: true })) });
        continue;
      }
      const { results, finished } = await runTools(turn.toolCalls);
      // Answer every tool call (unanswered calls are an API error on the next request).
      const answered = new Set(results.map((r) => r.toolCallId));
      for (const c of turn.toolCalls) if (!answered.has(c.id)) results.push({ toolCallId: c.id, name: c.name, output: "Skipped: tool call limit reached.", isError: true });
      messages.push({ role: "tool", results });
      if (finished) return;
      if (toolCalls >= LIMITS.maxToolCalls) {
        messages.push({ role: "user", content: `You have reached the limit of ${LIMITS.maxToolCalls} tool calls. Do not call any more tools except finish. Summarize what was done and what remains.` });
        const last = await callProvider(system, messages, tools.filter((t) => t.name === "finish"));
        messages.push({ role: "assistant", text: last.text, toolCalls: last.toolCalls });
        const fin = last.toolCalls.find((c) => c.name === "finish");
        if (fin) {
          const exec = await executeTool(ctxTools, "finish", fin.input, toolNames);
          if (exec.control?.type === "finish") {
            finishSummary = exec.control.input.summary;
            finishNextSteps = exec.control.input.nextSteps;
          }
        }
        return;
      }
    }
  };

  const validate = async (): Promise<Extract<AgentEvent, { type: "done" }>["validation"]> => {
    if (mode === "ask" || !changed.size) return undefined;
    const runtime = await getRuntimeStatus(project.id);
    if (!runtime.available) return { ok: true, skipped: "Runtime sandbox not available; typecheck/build was not run." };
    const command: ExecCommand | null = project.framework === "static" ? null : "typecheck";
    if (!command) return { ok: true, skipped: "Static projects have no build step." };
    const result = await execInProject(project.id, command, { timeoutMs: 5 * 60 * 1000 });
    if (!result.available) return { ok: true, skipped: "Runtime sandbox not available; typecheck/build was not run." };
    const output = truncateTail(result.output, 12_000);
    return { ok: result.exitCode === 0 && !result.timedOut, command, output };
  };

  let done: Extract<AgentEvent, { type: "done" }>;
  try {
    await emit({ type: "run", runId, conversationId: prepared.conversationId, messageId: prepared.assistantMessageId, userMessageId: prepared.userMessageId, mode, provider: prepared.creds.provider, model: prepared.creds.model, mock: prepared.creds.mock });
    await updateRun(runId, { status: "running", stage: "loading_context", startedAt: new Date() });
    await setStage("loading_context", "Reading the project");
    const context: ProjectContext = await loadProjectContext(project);
    const prompt = mode === "fix" && /^fix (this|the latest) error/i.test(prepared.prompt) && !context.lastError ? fixModeDefaultPrompt(null) : prepared.prompt;
    const system = buildSystemPrompt(mode, context);
    const messages: ChatMessage[] = [{ role: "user", content: buildUserMessage(mode, prompt, context, prepared.history) }];

    if (mode !== "ask") {
      await setStage("planning", "Asking the model for a short plan");
      const turn = await callProvider(system, messages, toolDefinitionsFor(mode, "plan"));
      messages.push({ role: "assistant", text: turn.text, toolCalls: turn.toolCalls });
      const planCall = turn.toolCalls.find((c) => c.name === "propose_plan");
      if (planCall) {
        const exec = await executeTool(ctxTools, "propose_plan", planCall.input, ["propose_plan"]);
        if (exec.control?.type === "plan") plan = exec.control.steps;
        currentText = null;
        const results: ToolResult[] = turn.toolCalls.map((c) => ({ toolCallId: c.id, name: c.name, output: c.id === planCall.id ? exec.output : "Only propose_plan is available during planning.", isError: c.id !== planCall.id || exec.isError }));
        messages.push({ role: "tool", results });
      } else if (turn.toolCalls.length) {
        messages.push({ role: "tool", results: turn.toolCalls.map((c) => ({ toolCallId: c.id, name: c.name, output: "Only propose_plan is available during planning. Proceed with the implementation now.", isError: true })) });
      } else if (turn.stop === "refusal") {
        throw new AgentFailure("The model declined this request.", "refusal");
      }
      if (plan.length) {
        parts.push({ type: "plan", steps: plan });
        await emit({ type: "plan", steps: plan });
        messages.push({ role: "user", content: "Plan accepted. Implement it now using the tools. Call finish when you are done." });
      } else {
        messages.push({ role: "user", content: "No plan was recorded; proceed carefully with the implementation and call finish when done." });
      }
      await updateRun(runId, { plan });
    }

    await setStage(mode === "ask" ? "answering" : "working", mode === "ask" ? "Looking at the code" : "Editing the project");
    const tools = toolDefinitionsFor(mode, "work");
    await workLoop(system, messages, tools);

    let validation = await validate();
    if (validation && !validation.ok) {
      while (!validation.ok && repairAttempts < LIMITS.maxRepairAttempts) {
        repairAttempts++;
        await setStage("repairing", `Validation failed (${validation.command}); repair attempt ${repairAttempts} of ${LIMITS.maxRepairAttempts}`);
        await updateRun(runId, { repairAttempts });
        messages.push({ role: "user", content: repairMessage(repairAttempts, LIMITS.maxRepairAttempts, validation.output ?? "") });
        await workLoop(system, messages, tools);
        await setStage("validating", `Re-running ${validation.command}`);
        validation = (await validate()) ?? validation;
      }
    } else if (validation?.skipped) {
      await setStage("validating", validation.skipped);
    } else if (validation) {
      await setStage("validating", `${validation.command} passed`);
    }

    const summary = finishSummary ?? (lastText.trim() || undefined);
    stage = "done";
    parts.push({ type: "stage", stage: "done", detail: validation && !validation.ok ? "Finished with validation errors" : undefined });
    await emit({ type: "stage", stage: "done", detail: validation && !validation.ok ? "Finished with validation errors" : undefined });
    done = {
      type: "done",
      status: "succeeded",
      runId,
      changedFiles: [...changed.values()],
      summary,
      nextSteps: finishNextSteps,
      validation,
    };
    const finished = await finishRun(runId, {
      status: "succeeded",
      stage: "done",
      finishedAt: new Date(),
      error: validation && !validation.ok ? `Validation (${validation.command}) failed after ${repairAttempts} repair attempt(s):\n${validation.output ?? ""}`.slice(0, 20_000) : null,
    });
    if (!finished) throw new AgentCancelled(); // cancelled concurrently after the last check
  } catch (err) {
    if (err instanceof AgentCancelled) {
      stage = "cancelled";
      parts.push({ type: "stage", stage: "cancelled" });
      await emit({ type: "stage", stage: "cancelled" });
      await cancelRun(project.id, runId);
      done = { type: "done", status: "cancelled", runId, changedFiles: [...changed.values()], summary: finishSummary };
    } else {
      const message = err instanceof AgentFailure ? err.message : err instanceof ApiError ? err.message : "The AI run failed unexpectedly.";
      const code = err instanceof AgentFailure ? err.code : err instanceof ApiError ? err.code : "internal";
      if (!(err instanceof AgentFailure) && !(err instanceof ApiError)) logger.error("ai run crashed", { runId, error: err instanceof Error ? err : String(err) });
      stage = "failed";
      parts.push({ type: "error", message });
      parts.push({ type: "stage", stage: "failed" });
      await emit({ type: "error", message, code });
      await emit({ type: "stage", stage: "failed" });
      await finishRun(runId, { status: "failed", stage: "failed", error: message.slice(0, 20_000), finishedAt: new Date() });
      done = { type: "done", status: "failed", runId, changedFiles: [...changed.values()], error: message };
    }
  } finally {
    unregisterActiveRun(runId);
    if (persistTimer) clearTimeout(persistTimer);
    try {
      await persist();
      await touchConversation(prepared.conversationId);
    } catch (err) {
      logger.warn("ai final persist failed", { error: err instanceof Error ? err : String(err) });
    }
    try {
      await recordUsage({ workspaceId: prepared.workspaceId, projectId: project.id, userId: prepared.userId, kind: "ai_request", quantity: 1, metadata: { runId, mode } });
      await recordUsage({ workspaceId: prepared.workspaceId, projectId: project.id, userId: prepared.userId, kind: "ai_tokens", quantity: tokensIn + tokensOut, metadata: { runId, tokensIn, tokensOut } });
    } catch (err) {
      logger.warn("ai usage record failed", { error: err instanceof Error ? err : String(err) });
    }
    if (changed.size) {
      logActivity(project.id, prepared.userId, "ai.run", `AI ${mode} run changed ${changed.size} file(s)`, { runId, files: [...changed.keys()].slice(0, 50) }).catch(() => {});
    }
  }
  await emit({ type: "usage", inputTokens: tokensIn, outputTokens: tokensOut });
  await emit(done);
  return done;
}

/** Keep large tool inputs (file contents) out of persisted message parts and SSE payloads. */
function compactInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    out[k] = typeof v === "string" && v.length > LIMITS.uiToolInputChars ? truncateMiddle(v, LIMITS.uiToolInputChars) : v;
  }
  return out;
}
