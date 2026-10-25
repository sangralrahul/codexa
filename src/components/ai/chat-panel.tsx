"use client";

import * as React from "react";
import Link from "next/link";
import { Bot, ChevronDown, FlaskConical, KeyRound, MessageSquarePlus, RefreshCw, Sparkles, User } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { emit } from "@/lib/client/events";
import { INITIAL_PROMPT_KEY } from "@/lib/client/workspace/storage";
import { cn } from "@/lib/utils";
import { Alert, Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyState, Skeleton, Spinner } from "@/components/ui";
import { Composer, FIX_DEFAULT_PROMPT } from "./composer";
import { AssistantParts } from "./message-parts";
import { ReviewChanges } from "./review-changes";
import { streamGenerate } from "./stream-client";
import type { AgentMode, AiStatus, ConversationView, MessagePart, MessageView, RunView, SseEvent } from "./types";

type SendError = { kind: "not_configured" | "quota" | "rate_limited" | "generic"; message: string; prompt: string; mode: AgentMode };

const base = (projectId: string) => `/api/v1/projects/${encodeURIComponent(projectId)}/ai`;

/** Read (and clear) the prompt stashed by the dashboard prompt box. Accepts a plain string or `{ projectId, prompt }`. */
function takeInitialPrompt(projectId: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(INITIAL_PROMPT_KEY);
    if (!raw) return null;
    let prompt = raw;
    try {
      const parsed = JSON.parse(raw) as { projectId?: string; prompt?: string } | string;
      if (parsed && typeof parsed === "object") {
        if (parsed.projectId && parsed.projectId !== projectId) return null;
        prompt = parsed.prompt ?? "";
      }
    } catch {
      /* plain string */
    }
    window.sessionStorage.removeItem(INITIAL_PROMPT_KEY);
    return prompt.trim() || null;
  } catch {
    return null;
  }
}

export function ChatPanel({ projectId, conversationId: initialConversationId }: { projectId: string; conversationId?: string }) {
  const [status, setStatus] = React.useState<AiStatus | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [conversations, setConversations] = React.useState<ConversationView[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(initialConversationId ?? null);
  const [messages, setMessages] = React.useState<MessageView[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [messagesError, setMessagesError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [mode, setMode] = React.useState<AgentMode>("build");
  const [running, setRunning] = React.useState<{ runId: string | null; abort: AbortController } | null>(null);
  const [sendError, setSendError] = React.useState<SendError | null>(null);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const initialPromptRef = React.useRef<string | null>(null);
  const autoSentRef = React.useRef(false);

  // ---- loading -----------------------------------------------------------
  const loadStatus = React.useCallback(async () => {
    setStatusError(null);
    try {
      const s = await api<AiStatus>(`${base(projectId)}/status`);
      setStatus(s);
      setLastError(s.lastError);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Could not load AI status.");
    }
  }, [projectId]);

  const loadConversations = React.useCallback(async () => {
    try {
      const r = await api<{ conversations: ConversationView[] }>(`${base(projectId)}/conversations`);
      setConversations(r.conversations);
      return r.conversations;
    } catch {
      return [];
    }
  }, [projectId]);

  const loadMessages = React.useCallback(
    async (cid: string) => {
      setMessagesLoading(true);
      setMessagesError(null);
      try {
        const r = await api<{ messages: MessageView[]; runs: RunView[] }>(`${base(projectId)}/conversations/${encodeURIComponent(cid)}/messages`);
        const runsByMessage = new Map(r.runs.filter((x) => x.messageId).map((x) => [x.messageId as string, x]));
        setMessages(r.messages.map((m) => ({ ...m, run: runsByMessage.get(m.id) })));
      } catch (err) {
        setMessagesError(err instanceof Error ? err.message : "Could not load messages.");
      } finally {
        setMessagesLoading(false);
      }
    },
    [projectId],
  );

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      initialPromptRef.current = takeInitialPrompt(projectId);
      if (initialPromptRef.current) setDraft(initialPromptRef.current);
      void loadStatus();
      void loadConversations().then((list) => {
        if (!cancelled && !initialConversationId && !initialPromptRef.current && list[0]) setActiveId(list[0].id);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, initialConversationId, loadStatus, loadConversations]);

  React.useEffect(() => {
    let cancelled = false;
    const cid = activeId;
    queueMicrotask(() => {
      if (cancelled) return;
      if (cid) void loadMessages(cid);
      else setMessages([]);
    });
    return () => {
      cancelled = true;
    };
  }, [activeId, loadMessages]);

  // Auto-scroll while streaming / after loading.
  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ---- streaming ---------------------------------------------------------
  const updateStreaming = React.useCallback((tempId: string, fn: (m: MessageView) => MessageView) => {
    setMessages((prev) => prev.map((m) => (m.id === tempId ? fn(m) : m)));
  }, []);

  const send = React.useCallback(
    async (promptIn: string, sendMode: AgentMode) => {
      const prompt = promptIn.trim() || (sendMode === "fix" ? FIX_DEFAULT_PROMPT : "");
      if (!prompt || running) return;
      setSendError(null);
      setDraft("");
      const abort = new AbortController();
      setRunning({ runId: null, abort });
      const userTemp = `tmp-user-${Date.now()}`;
      const asstTemp = `tmp-asst-${Date.now()}`;
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { id: userTemp, role: "user", content: prompt, parts: [{ type: "text", text: prompt }], createdAt: now },
        { id: asstTemp, role: "assistant", content: "", parts: [], createdAt: now, streaming: true, run: { id: "", messageId: null, status: "queued", stage: "queued", changedFiles: [], snapshotBeforeId: null, error: null, tokensIn: 0, tokensOut: 0, repairAttempts: 0 } },
      ]);

      let textOpen = false;
      let newConversationId: string | null = null;
      let finalStatus: "succeeded" | "failed" | "cancelled" | null = null;
      const pushPart = (part: MessagePart) => updateStreaming(asstTemp, (m) => ({ ...m, parts: [...m.parts, part] }));

      const onEvent = (ev: SseEvent) => {
        switch (ev.event) {
          case "run":
            newConversationId = ev.data.conversationId;
            setRunning({ runId: ev.data.runId, abort });
            updateStreaming(asstTemp, (m) => ({ ...m, run: { ...(m.run as RunView), id: ev.data.runId, messageId: ev.data.messageId, status: "running" } }));
            emit("codexa:ai-run", { runId: ev.data.runId, status: "running" });
            break;
          case "stage":
            textOpen = false;
            updateStreaming(asstTemp, (m) => ({ ...m, parts: [...m.parts, { type: "stage", stage: ev.data.stage, detail: ev.data.detail }], run: m.run ? { ...m.run, stage: ev.data.stage } : m.run }));
            break;
          case "text":
            if (textOpen) {
              updateStreaming(asstTemp, (m) => {
                const parts = m.parts.slice();
                const last = parts[parts.length - 1];
                if (last && last.type === "text") parts[parts.length - 1] = { type: "text", text: last.text + ev.data.delta };
                else parts.push({ type: "text", text: ev.data.delta });
                return { ...m, parts };
              });
            } else {
              textOpen = true;
              pushPart({ type: "text", text: ev.data.delta });
            }
            break;
          case "tool_call":
            textOpen = false;
            pushPart({ type: "tool_call", id: ev.data.id, name: ev.data.name, input: ev.data.input });
            break;
          case "tool_result":
            pushPart({ type: "tool_result", id: ev.data.id, name: ev.data.name, output: ev.data.output, isError: ev.data.isError });
            break;
          case "file_change":
            pushPart({ type: "file_change", path: ev.data.path, action: ev.data.action, summary: ev.data.summary });
            break;
          case "plan":
            textOpen = false;
            pushPart({ type: "plan", steps: ev.data.steps });
            break;
          case "usage":
            updateStreaming(asstTemp, (m) => ({ ...m, run: m.run ? { ...m.run, tokensIn: ev.data.inputTokens, tokensOut: ev.data.outputTokens } : m.run }));
            break;
          case "error":
            textOpen = false;
            pushPart({ type: "error", message: ev.data.message });
            break;
          case "done": {
            finalStatus = ev.data.status;
            const { status: s, runId, changedFiles, summary, nextSteps, error } = ev.data;
            updateStreaming(asstTemp, (m) => ({
              ...m,
              streaming: false,
              content: summary ?? m.content,
              nextSteps,
              run: { ...(m.run as RunView), id: runId, status: s, changedFiles, error: error ?? null, stage: s === "succeeded" ? "done" : s },
            }));
            if (changedFiles.length) emit("codexa:files-changed", { paths: changedFiles.map((f) => f.path), source: "ai" });
            emit("codexa:ai-run", { runId, status: s });
            if (error) setLastError(error);
            break;
          }
        }
      };

      try {
        await streamGenerate(projectId, { prompt, mode: sendMode, conversationId: activeId }, { signal: abort.signal, onEvent });
        if (!finalStatus) {
          updateStreaming(asstTemp, (m) => ({ ...m, streaming: false, parts: [...m.parts, { type: "error", message: "The connection closed before the run finished. Reload the conversation to see its final state." }], run: m.run ? { ...m.run, status: "failed" } : m.run }));
        }
      } catch (err) {
        // Pre-stream JSON errors: remove the optimistic messages and show a state the user can act on.
        setMessages((prev) => prev.filter((m) => m.id !== userTemp && m.id !== asstTemp));
        setDraft(promptIn);
        if (err instanceof ClientApiError) {
          const kind: SendError["kind"] = err.code === "ai_not_configured" ? "not_configured" : err.code === "quota_exceeded" ? "quota" : err.code === "rate_limited" ? "rate_limited" : "generic";
          setSendError({ kind, message: err.message, prompt: promptIn, mode: sendMode });
          if (kind === "not_configured") void loadStatus();
        } else if (abort.signal.aborted) {
          setSendError({ kind: "generic", message: "The request was cancelled.", prompt: promptIn, mode: sendMode });
        } else {
          setSendError({ kind: "generic", message: err instanceof Error ? err.message : "The AI request failed.", prompt: promptIn, mode: sendMode });
        }
      } finally {
        setRunning(null);
        if (newConversationId) {
          const cid = newConversationId;
          void loadConversations();
          if (cid !== activeId) setActiveId(cid); // triggers a reload with persisted ids
          else void loadMessages(cid);
        }
      }
    },
    [projectId, activeId, running, updateStreaming, loadConversations, loadMessages, loadStatus],
  );

  // Auto-send the dashboard prompt once the status says AI is available.
  React.useEffect(() => {
    if (autoSentRef.current || !status || !initialPromptRef.current) return;
    autoSentRef.current = true;
    if (status.configured) void send(initialPromptRef.current, "build");
  }, [status, send]);

  const cancel = React.useCallback(async () => {
    if (!running) return;
    if (running.runId) {
      try {
        await api(`${base(projectId)}/runs/${encodeURIComponent(running.runId)}/cancel`, { method: "POST" });
      } catch {
        /* the stream will still end; the loop checks the flag between steps */
      }
    } else {
      running.abort.abort();
    }
  }, [projectId, running]);

  const newChat = () => {
    if (running) return;
    setActiveId(null);
    setMessages([]);
    setSendError(null);
    textareaRef.current?.focus();
  };

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const notConfigured = status ? !status.configured : false;

  return (
    <section className="flex h-full min-h-0 flex-col bg-background" aria-label="AI assistant">
      <header className="flex items-center gap-2 border-b border-border px-2 py-1.5 sm:px-3">
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 py-1 text-left text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" aria-label="Choose conversation">
              <span className="truncate">{active?.title ?? "New chat"}</span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-72 overflow-y-auto">
            <DropdownMenuItem onSelect={newChat} disabled={Boolean(running)}>
              <MessageSquarePlus className="size-4" aria-hidden="true" /> New chat
            </DropdownMenuItem>
            {conversations.length ? <DropdownMenuSeparator /> : null}
            {conversations.map((c) => (
              <DropdownMenuItem key={c.id} onSelect={() => !running && setActiveId(c.id)} disabled={Boolean(running)} className={cn(c.id === activeId && "bg-muted")}>
                <span className="truncate">{c.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {status?.mock ? (
          <Badge variant="warning" title="AI_MOCK=1 is set; responses are scripted and only available outside production.">
            <FlaskConical className="size-3" aria-hidden="true" /> Mock AI (development only)
          </Badge>
        ) : status?.configured ? (
          <Badge variant="outline" title={`Provider: ${status.provider}`}>
            {status.model}
          </Badge>
        ) : null}
        <Button size="icon" variant="ghost" onClick={newChat} disabled={Boolean(running)} aria-label="New chat" title="New chat" className="h-8 w-8">
          <MessageSquarePlus className="size-4" aria-hidden="true" />
        </Button>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-3" aria-live="polite" aria-busy={Boolean(running)}>
        {statusError ? (
          <Alert variant="danger" title="Could not load AI status">
            {statusError}{" "}
            <button type="button" className="underline" onClick={() => void loadStatus()}>
              Retry
            </button>
          </Alert>
        ) : null}
        {notConfigured ? <NotConfigured missingEnv={status?.missingEnv ?? []} /> : null}
        {messagesLoading ? (
          <div className="space-y-3" aria-label="Loading messages">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : messagesError ? (
          <Alert variant="danger" title="Could not load this conversation">
            {messagesError}{" "}
            <button type="button" className="underline" onClick={() => activeId && void loadMessages(activeId)}>
              Retry
            </button>
          </Alert>
        ) : !messages.length && !notConfigured && status ? (
          <EmptyState
            icon={<Bot className="size-8" aria-hidden="true" />}
            title="Start building with AI"
            description="Describe a feature, ask a question about the code, or fix the latest error. The agent plans first, edits files through reviewable tools, and snapshots the project before every change."
            className="mt-4 p-6"
          />
        ) : null}
        {!status && !statusError ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner /> Checking AI configuration…
          </p>
        ) : null}
        <ol className="space-y-4">
          {messages.map((m) => (
            <li key={m.id}>
              {m.role === "user" ? <UserMessage content={m.content} /> : <AssistantMessage projectId={projectId} message={m} onReverted={() => activeId && void loadMessages(activeId)} />}
            </li>
          ))}
        </ol>
        {sendError ? <SendErrorState error={sendError} onRetry={() => void send(sendError.prompt, sendError.mode)} /> : null}
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        mode={mode}
        onModeChange={setMode}
        onSend={() => void send(draft, mode)}
        onCancel={() => void cancel()}
        running={Boolean(running)}
        disabled={notConfigured || !status}
        disabledReason={notConfigured ? "AI is not configured on this server." : undefined}
        lastError={lastError}
        textareaRef={textareaRef}
      />
    </section>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted" aria-hidden="true">
        <User className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 whitespace-pre-wrap break-words rounded-lg bg-muted px-3 py-2 text-sm">{content}</div>
    </div>
  );
}

function AssistantMessage({ projectId, message, onReverted }: { projectId: string; message: MessageView; onReverted: () => void }) {
  const run = message.run;
  const status = run?.status;
  const changed = run?.changedFiles ?? [];
  const showReview = run && run.id && !message.streaming && (status === "succeeded" || status === "failed" || status === "cancelled") && (changed.length > 0 || run.snapshotBeforeId);
  const hasParts = message.parts.length > 0;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
        <Bot className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {hasParts ? <AssistantParts parts={message.parts} status={status} streaming={message.streaming} /> : message.streaming ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner /> Starting…
          </p>
        ) : message.content ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : null}
        {message.nextSteps?.length ? (
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next steps</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {message.nextSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {run && !message.streaming && (run.tokensIn || run.tokensOut) ? (
          <p className="text-[11px] text-muted-foreground">
            {status === "succeeded" ? "Completed" : status === "cancelled" ? "Cancelled" : status === "failed" ? "Failed" : status} · {(run.tokensIn + run.tokensOut).toLocaleString()} tokens
            {run.repairAttempts ? ` · ${run.repairAttempts} repair attempt${run.repairAttempts === 1 ? "" : "s"}` : ""}
          </p>
        ) : null}
        {showReview ? <ReviewChanges projectId={projectId} runId={run.id} changedCount={changed.length} onReverted={onReverted} /> : null}
      </div>
    </div>
  );
}

function NotConfigured({ missingEnv }: { missingEnv: string[] }) {
  return (
    <EmptyState
      icon={<KeyRound className="size-8" aria-hidden="true" />}
      title="AI is not configured"
      description={`No AI provider key is set on this server. Add ${missingEnv.length ? missingEnv.join(" or ") : "ANTHROPIC_API_KEY or OPENAI_API_KEY"} to the server environment and restart the app to enable the agent.`}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/docs/ai-agent">Read the AI agent setup guide</Link>
        </Button>
      }
      className="mb-4 p-6"
    />
  );
}

function SendErrorState({ error, onRetry }: { error: SendError; onRetry: () => void }) {
  if (error.kind === "quota") {
    return (
      <Alert variant="warning" title="AI usage limit reached" className="mt-3">
        {error.message}{" "}
        <Link href="/settings/billing" className="font-medium underline">
          Upgrade your plan
        </Link>
      </Alert>
    );
  }
  if (error.kind === "not_configured") return null; // the NotConfigured empty state is shown instead
  return (
    <Alert variant={error.kind === "rate_limited" ? "warning" : "danger"} title={error.kind === "rate_limited" ? "Too many requests" : "The AI request failed"} className="mt-3">
      <span>{error.message}</span>{" "}
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-medium underline">
        <RefreshCw className="size-3" aria-hidden="true" /> Retry
      </button>
    </Alert>
  );
}
