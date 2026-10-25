import type { MessagePart } from "@/db/schema";

export type { MessagePart };

export type AgentMode = "build" | "ask" | "fix";

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type AiStatus = {
  configured: boolean;
  provider: "anthropic" | "openai" | "mock";
  model: string;
  mock: boolean;
  missingEnv: string[];
  lastError: string | null;
};

export type ConversationView = { id: string; title: string; createdAt: string; updatedAt: string };

export type RunView = {
  id: string;
  messageId: string | null;
  status: RunStatus;
  stage: string;
  changedFiles: { path: string; action: string }[];
  snapshotBeforeId: string | null;
  error: string | null;
  tokensIn: number;
  tokensOut: number;
  repairAttempts: number;
};

export type MessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts: MessagePart[];
  createdAt: string;
  /** Present for assistant messages that were produced by a generation run. */
  run?: RunView;
  /** True while this assistant message is still being streamed. */
  streaming?: boolean;
  /** Summary / next steps delivered by the final `done` event (not persisted separately). */
  nextSteps?: string[];
};

export type FileChangeStat = { path: string; action: "create" | "update" | "delete"; added: number; removed: number };

/** Shape of each SSE event's `data` payload, keyed by event name (mirrors AgentEvent on the server). */
export type SseEventData = {
  run: { runId: string; conversationId: string; messageId: string; userMessageId: string; mode: AgentMode; provider: string; model: string; mock: boolean };
  stage: { stage: string; detail?: string };
  text: { delta: string };
  tool_call: { id: string; name: string; input: unknown; summary: string };
  tool_result: { id: string; name: string; output: string; isError?: boolean };
  file_change: { path: string; action: "create" | "update" | "delete"; summary?: string };
  plan: { steps: string[] };
  usage: { inputTokens: number; outputTokens: number };
  error: { message: string; code?: string; retryable?: boolean };
  done: {
    status: "succeeded" | "failed" | "cancelled";
    runId: string;
    changedFiles: { path: string; action: "create" | "update" | "delete"; summary?: string }[];
    summary?: string;
    nextSteps?: string[];
    validation?: { ok: boolean; command?: string; output?: string; skipped?: string };
    error?: string;
  };
};

export type SseEvent = { [K in keyof SseEventData]: { event: K; data: SseEventData[K] } }[keyof SseEventData];
