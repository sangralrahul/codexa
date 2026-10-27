"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bolt,
  Check,
  ChevronDown,
  FormInput,
  Image as ImageIcon,
  KeyRound,
  LayoutTemplate,
  Lightbulb,
  Mail,
  MessageSquarePlus,
  Palette,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { emit, on as subscribeEvent } from "@/lib/client/events";
import { INITIAL_PROMPT_KEY } from "@/lib/client/workspace/storage";
import { RAIL, railIndex, useAgent } from "@/lib/client/workspace/agent";
import { relativeTime } from "@/components/projects/format";
import { cn } from "@/lib/utils";
import { Alert, Button, Popover, PopoverContent, PopoverTrigger, Skeleton, Spinner, Tooltip, TooltipProvider } from "@/components/ui";
import { Composer, FIX_DEFAULT_PROMPT, splitContext, withContext, type ComposerContext } from "./composer";
import { AssistantParts, stageLabel } from "./message-parts";
import { RunFooter, useRunDetails } from "./review-changes";
import { streamGenerate } from "./stream-client";
import { suggestionsFor, type SuggestionIcon } from "./suggestions";
import type { AgentMode, AiStatus, ConversationView, MessagePart, MessageView, RunValidation, RunView, SseEvent } from "./types";

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

const fixPrompt = (error: string, logs?: string[]) => {
  const tail = logs?.length ? `\n\nRecent logs:\n${logs.slice(-40).join("\n")}` : "";
  return `Fix this error:\n${error}${tail}`;
};

const ms = (iso?: string | null) => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

export function ChatPanel({
  projectId,
  conversationId: initialConversationId,
  projectName,
  templateCategory,
  framework,
  canEdit = true,
  showOperatorDetails = false,
}: {
  projectId: string;
  conversationId?: string;
  projectName?: string;
  templateCategory?: string | null;
  framework?: string | null;
  canEdit?: boolean;
  /** Owners and admins see the server setup details in not-configured states. */
  showOperatorDetails?: boolean;
}) {
  const agent = useAgent();
  const { report, setAi, activeFile } = agent;
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
  const [context, setContext] = React.useState<ComposerContext>({ activeFile: true, error: false });
  const [queued, setQueued] = React.useState<{ prompt: string; mode: AgentMode } | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const lastAnnounced = React.useRef("");
  const listRef = React.useRef<HTMLDivElement>(null);
  const stick = React.useRef(true);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const initialPromptRef = React.useRef<string | null>(null);
  const autoSentRef = React.useRef(false);

  const announce = React.useCallback((text: string) => {
    if (!text || text === lastAnnounced.current) return;
    lastAnnounced.current = text;
    setAnnouncement(text);
  }, []);

  // ---- loading -----------------------------------------------------------
  const loadStatus = React.useCallback(async () => {
    setStatusError(null);
    try {
      const s = await api<AiStatus>(`${base(projectId)}/status`);
      setStatus(s);
      setAi(s);
      setLastError(s.lastError);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Could not load AI status.");
    }
  }, [projectId, setAi]);

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
        setMessages((prev) => {
          // Keep what only the live stream knew (validation, next steps, client start time).
          const liveById = new Map(prev.filter((m) => m.run?.id).map((m) => [m.run!.id, m]));
          return r.messages.map((m) => {
            const run = runsByMessage.get(m.id);
            const live = run ? liveById.get(run.id) : undefined;
            return { ...m, run, validation: live?.validation, nextSteps: live?.nextSteps, startedAt: live?.startedAt };
          });
        });
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

  // Follow the stream only while the reader is at the bottom (never yank them while reading).
  React.useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);
  // Keep the bottom in view when the column itself resizes (revealed, dragged, rotated).
  React.useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (stick.current && el.clientWidth > 0) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- streaming ---------------------------------------------------------
  const updateStreaming = React.useCallback((tempId: string, fn: (m: MessageView) => MessageView) => {
    setMessages((prev) => prev.map((m) => (m.id === tempId ? fn(m) : m)));
  }, []);

  const send = React.useCallback(
    async (promptIn: string, sendMode: AgentMode, restoreDraft?: string) => {
      const prompt = promptIn.trim() || (sendMode === "fix" ? FIX_DEFAULT_PROMPT : "");
      if (!prompt) return;
      if (running) {
        setQueued({ prompt, mode: sendMode });
        return;
      }
      setSendError(null);
      setDraft("");
      stick.current = true;
      const abort = new AbortController();
      setRunning({ runId: null, abort });
      const now = Date.now();
      const userTemp = `tmp-user-${now}`;
      const asstTemp = `tmp-asst-${now}`;
      const iso = new Date(now).toISOString();
      setMessages((prev) => [
        ...prev,
        { id: userTemp, role: "user", content: prompt, parts: [{ type: "text", text: prompt }], createdAt: iso },
        {
          id: asstTemp,
          role: "assistant",
          content: "",
          parts: [],
          createdAt: iso,
          streaming: true,
          startedAt: now,
          run: { id: "", messageId: null, status: "queued", stage: "queued", changedFiles: [], snapshotBeforeId: null, error: null, tokensIn: 0, tokensOut: 0, repairAttempts: 0, createdAt: iso, finishedAt: null },
        },
      ]);
      report.start(sendMode);
      lastAnnounced.current = "";
      announce("Agent started");

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
            report.identify(ev.data.runId);
            emit("codexa:ai-run", { runId: ev.data.runId, status: "running" });
            break;
          case "stage":
            textOpen = false;
            updateStreaming(asstTemp, (m) => ({ ...m, parts: [...m.parts, { type: "stage", stage: ev.data.stage, detail: ev.data.detail }], run: m.run ? { ...m.run, stage: ev.data.stage } : m.run }));
            report.stage(ev.data.stage, ev.data.detail);
            if (ev.data.stage !== "done" && ev.data.stage !== "failed" && ev.data.stage !== "cancelled") announce(stageLabel(ev.data.stage));
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
            report.file(ev.data.path, ev.data.action);
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
            const { status: s, runId, changedFiles, summary, nextSteps, error, validation } = ev.data;
            const finishedIso = new Date().toISOString();
            updateStreaming(asstTemp, (m) => ({
              ...m,
              streaming: false,
              content: summary ?? m.content,
              nextSteps,
              validation,
              run: { ...(m.run as RunView), id: runId, status: s, changedFiles, error: error ?? null, stage: s === "succeeded" ? "done" : s, finishedAt: finishedIso },
            }));
            if (changedFiles.length) emit("codexa:files-changed", { paths: changedFiles.map((f) => f.path), source: "ai" });
            emit("codexa:ai-run", { runId, status: s });
            report.done(s, runId, changedFiles, validation);
            if (error) setLastError(error);
            announce(
              s === "succeeded"
                ? `Run finished. ${changedFiles.length ? `${changedFiles.length} file${changedFiles.length === 1 ? "" : "s"} changed.` : "No files changed."}${validation && !validation.ok ? " Checks failed." : ""}`
                : s === "cancelled"
                  ? "Run cancelled."
                  : `Run failed. ${error ?? ""}`,
            );
            break;
          }
        }
      };

      try {
        await streamGenerate(projectId, { prompt, mode: sendMode, conversationId: activeId }, { signal: abort.signal, onEvent });
        if (!finalStatus) {
          updateStreaming(asstTemp, (m) => ({ ...m, streaming: false, parts: [...m.parts, { type: "error", message: "The connection closed before the run finished. Reload the conversation to see its final state." }], run: m.run ? { ...m.run, status: "failed" } : m.run }));
          report.done("failed", null, []);
          announce("The connection closed before the run finished.");
        }
      } catch (err) {
        // Pre-stream JSON errors: remove the optimistic messages and show a state the user can act on.
        setMessages((prev) => prev.filter((m) => m.id !== userTemp && m.id !== asstTemp));
        setDraft(restoreDraft ?? promptIn);
        report.done(abort.signal.aborted ? "cancelled" : "failed", null, []);
        if (err instanceof ClientApiError) {
          const kind: SendError["kind"] = err.code === "ai_not_configured" ? "not_configured" : err.code === "quota_exceeded" ? "quota" : err.code === "rate_limited" ? "rate_limited" : "generic";
          setSendError({ kind, message: err.message, prompt: promptIn, mode: sendMode });
          if (kind === "not_configured") void loadStatus();
        } else if (abort.signal.aborted) {
          setSendError({ kind: "generic", message: "The request was cancelled.", prompt: promptIn, mode: sendMode });
        } else {
          setSendError({ kind: "generic", message: err instanceof Error ? err.message : "The AI request failed.", prompt: promptIn, mode: sendMode });
        }
        announce("The AI request failed.");
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
    [projectId, activeId, running, updateStreaming, loadConversations, loadMessages, loadStatus, report, announce],
  );

  // A request that arrived mid-run goes out as soon as the run ends.
  React.useEffect(() => {
    if (running || !queued || !status?.configured) return;
    const q = queued;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dequeue exactly once when the previous run has ended
    setQueued(null);
    setMode(q.mode);
    void send(q.prompt, q.mode);
  }, [running, queued, status, send]);

  const requestFix = React.useCallback(
    (error: string, logs?: string[]) => {
      const prompt = fixPrompt(error, logs);
      setMode("fix");
      if (status?.configured) void send(prompt, "fix");
      else setDraft(prompt);
    },
    [status, send],
  );

  // Other panels reach the agent: Fix requests, questions and plain prompts (always, even mid-run: they queue).
  React.useEffect(() => {
    const offFix = subscribeEvent("codexa:ai-fix-request", ({ error, logs }) => requestFix(error, logs));
    const offAsk = subscribeEvent("codexa:ai-ask", ({ text }) => {
      setMode("ask");
      if (status?.configured) void send(text, "ask");
      else setDraft(text);
    });
    const offSend = subscribeEvent("codexa:ai-send", ({ text, mode: m }) => {
      const sendMode = m ?? "build";
      if (status?.configured) void send(text, sendMode);
      else {
        setMode(sendMode);
        setDraft(text);
      }
    });
    return () => {
      offFix();
      offAsk();
      offSend();
    };
  }, [status, send, requestFix]);

  // Auto-send the dashboard prompt once the status says AI is available (pre-filled otherwise).
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

  const newChat = React.useCallback(() => {
    if (running) return;
    setActiveId(null);
    setMessages([]);
    setSendError(null);
    textareaRef.current?.focus();
  }, [running]);

  React.useEffect(
    () =>
      subscribeEvent("codexa:agent-command", ({ command }) => {
        if (command === "new-chat") newChat();
        else requestAnimationFrame(() => textareaRef.current?.focus());
      }),
    [newChat],
  );

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const notConfigured = status ? !status.configured : false;
  const streamingMsg = messages.find((m) => m.streaming);
  const progress = React.useMemo(() => {
    if (!streamingMsg) return 0;
    const reached = new Set(streamingMsg.parts.filter((p) => p.type === "stage").map((p) => railIndex((p as { stage: string }).stage)).filter((i) => i >= 0));
    return reached.size / RAIL.length;
  }, [streamingMsg]);
  const latestAssistantId = [...messages].reverse().find((m) => m.role === "assistant" && m.run?.id)?.id;
  const onFix = React.useCallback((v: RunValidation) => requestFix(`${v.command ?? "Validation"} failed after the last AI run`, v.output?.split("\n").slice(-60)), [requestFix]);

  return (
    <TooltipProvider>
    <section className="@container flex h-full min-h-0 flex-col" aria-label="AI assistant">
      <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-border px-2.5">
        <ConversationMenu conversations={conversations} activeId={activeId} disabled={Boolean(running)} onPick={(id) => setActiveId(id)} onNew={newChat} title={active?.title ?? "New chat"} />
        <div className="ml-auto flex items-center gap-1">
          {notConfigured ? <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Not configured</span> : null}
          <Tooltip content="New chat">
            <button
              type="button"
              onClick={newChat}
              disabled={Boolean(running)}
              aria-label="New chat"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
            >
              <MessageSquarePlus className="size-4" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </header>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth === 0) return; // collapsed column: not a reading position
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
        }}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3.5 py-4"
        aria-busy={Boolean(running)}
      >
        {statusError ? (
          <Alert variant="danger" title="Could not load AI status">
            {statusError}{" "}
            <button type="button" className="underline" onClick={() => void loadStatus()}>
              Retry
            </button>
          </Alert>
        ) : null}
        {notConfigured ? <NotConfigured missingEnv={status?.missingEnv ?? []} showOperatorDetails={showOperatorDetails} /> : null}
        {messagesLoading ? (
          <div className="space-y-3" aria-label="Loading messages">
            <Skeleton className="ml-auto h-10 w-2/3 rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : messagesError ? (
          <Alert variant="danger" title="Could not load this conversation">
            {messagesError}{" "}
            <button type="button" className="underline" onClick={() => activeId && void loadMessages(activeId)}>
              Retry
            </button>
          </Alert>
        ) : !messages.length && !notConfigured && status ? (
          <ChatWelcome
            projectName={projectName}
            category={templateCategory}
            framework={framework}
            onPick={(text, m) => {
              setMode(m);
              setDraft(text);
              textareaRef.current?.focus();
            }}
          />
        ) : null}
        {!status && !statusError ? (
          <p className="flex items-center gap-2 py-2 text-[13px] text-muted-foreground">
            <Spinner /> Checking AI configuration…
          </p>
        ) : null}
        <ol className="space-y-6">
          {messages.map((m) => (
            <li key={m.id}>
              {m.role === "user" ? (
                <UserMessage content={m.content} fresh={m.id.startsWith("tmp-")} />
              ) : (
                <AssistantMessage
                  projectId={projectId}
                  message={m}
                  canEdit={canEdit}
                  latest={m.id === latestAssistantId}
                  onReverted={() => activeId && void loadMessages(activeId)}
                  onFix={onFix}
                  onNextStep={(text) => {
                    setMode("build");
                    setDraft(text);
                    textareaRef.current?.focus();
                  }}
                />
              )}
            </li>
          ))}
        </ol>
        {sendError ? <SendErrorState error={sendError} onRetry={() => void send(sendError.prompt, sendError.mode)} /> : null}
      </div>

      {/* One announcement per stage change and at completion (the list itself is not live). */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        mode={mode}
        onModeChange={setMode}
        onSend={() => void send(withContext(draft, context, activeFile, lastError, mode), mode, draft)}
        onCancel={() => void cancel()}
        running={Boolean(running)}
        disabled={notConfigured || !status}
        disabledReason={notConfigured ? "AI is not configured on this server." : undefined}
        lastError={lastError}
        textareaRef={textareaRef}
        model={status?.configured ? { name: status.model, provider: status.provider, mock: status.mock } : null}
        activeFile={activeFile}
        context={context}
        onContextChange={setContext}
        progress={progress}
        queued={queued?.prompt ?? null}
        onClearQueued={() => setQueued(null)}
      />
    </section>
    </TooltipProvider>
  );
}

/* ---------------------------------------------------------------------------
   Pieces
   --------------------------------------------------------------------------- */

function ConversationMenu({ conversations, activeId, disabled, onPick, onNew, title }: { conversations: ConversationView[]; activeId: string | null; disabled: boolean; onPick: (id: string) => void; onNew: () => void; title: string }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const list = conversations.filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13.5px] font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`Conversation: ${title}. Choose conversation`}
        >
          <Sparkles className="size-4 shrink-0 text-signal" aria-hidden="true" />
          <span className="truncate">{title}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-1.5">
        <div className="relative mb-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="conv-search" className="sr-only">
            Search conversations
          </label>
          <input
            id="conv-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations"
            className="h-8 w-full rounded-lg bg-muted pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onNew();
            setOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <MessageSquarePlus className="size-4 text-muted-foreground" aria-hidden="true" /> New chat
          <span className="ml-auto text-[11px] text-muted-foreground">Starts fresh; files stay</span>
        </button>
        {conversations.length ? <div className="my-1 h-px bg-border" /> : null}
        <ul className="scrollbar-thin max-h-72 overflow-y-auto" aria-label="Conversations">
          {list.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={disabled}
                aria-current={c.id === activeId ? "true" : undefined}
                onClick={() => {
                  onPick(c.id);
                  setOpen(false);
                }}
                className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted disabled:opacity-50", c.id === activeId && "bg-muted")}
              >
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{relativeTime(c.updatedAt)}</span>
                {c.id === activeId ? <Check className="size-3.5 shrink-0 text-foreground" aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
          {conversations.length && !list.length ? <li className="px-2 py-3 text-center text-[12.5px] text-muted-foreground">No conversation matches “{q}”.</li> : null}
          {!conversations.length ? <li className="px-2 py-3 text-center text-[12.5px] text-muted-foreground">No earlier conversations.</li> : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function UserMessage({ content, fresh }: { content: string; fresh: boolean }) {
  const { text, file, error } = splitContext(content);
  return (
    <div className={cn("flex flex-col items-end gap-1.5", fresh && "ws-msg-user")}>
      <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-muted px-3.5 py-2.5 text-[15px] leading-[1.6] shadow-[inset_0_0_0_1px_var(--border)]">
        <span className="sr-only">You: </span>
        {text}
      </div>
      {file || error ? (
        <div className="flex max-w-[88%] flex-wrap justify-end gap-1.5" aria-label="Context sent with this message">
          {file ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
              <span aria-hidden="true">@</span>
              <span className="truncate">{file}</span>
            </span>
          ) : null}
          {error ? (
            <details className="group max-w-full rounded-md bg-danger/[0.06] text-[11px] text-danger shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--danger)_25%,transparent)]">
              <summary className="cursor-pointer list-none px-1.5 py-0.5 font-medium [&::-webkit-details-marker]:hidden">Latest error attached</summary>
              <pre className="max-h-32 overflow-auto border-t border-danger/20 px-2 py-1 font-mono text-[10.5px] text-muted-foreground">{error}</pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AssistantMessage({
  projectId,
  message,
  canEdit,
  latest,
  onReverted,
  onFix,
  onNextStep,
}: {
  projectId: string;
  message: MessageView;
  canEdit: boolean;
  latest: boolean;
  onReverted: () => void;
  onFix: (v: RunValidation) => void;
  onNextStep: (text: string) => void;
}) {
  const run = message.run;
  const status = run?.status;
  const changed = run?.changedFiles ?? [];
  const finished = status === "succeeded" || status === "failed" || status === "cancelled";
  const live = message.startedAt !== undefined;
  const { details } = useRunDetails(projectId, run?.id || null, Boolean(run?.id) && finished && changed.length > 0 && (latest || live));
  const showFooter = run && run.id && !message.streaming && finished && (changed.length > 0 || run.snapshotBeforeId || run.tokensIn || run.tokensOut);
  const startedAt = message.startedAt ?? ms(run?.createdAt);
  const finishedAt = ms(run?.finishedAt) ?? null;
  return (
    <div className={cn("min-w-0 space-y-3", message.id.startsWith("tmp-") && "ws-msg-agent")}>
      <span className="sr-only">Codexa: </span>
      {message.parts.length || message.streaming ? (
        <AssistantParts
          parts={message.parts}
          status={status}
          streaming={message.streaming}
          meta={{ startedAt, finishedAt, live, validation: message.validation, runError: run?.error, stats: details?.stats, onFix }}
        />
      ) : message.content ? (
        <p className="whitespace-pre-wrap text-[15px] leading-[1.65]">{message.content}</p>
      ) : null}
      {message.nextSteps?.length ? (
        <section className="space-y-1.5" aria-label="Next steps">
          <h4 className="text-[13px] font-semibold">Next steps</h4>
          <ul className="space-y-1">
            {message.nextSteps.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onNextStep(s)}
                  className="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13.5px] transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  title="Put this in the composer"
                >
                  <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  <span>{s}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {showFooter ? (
        <RunFooter
          projectId={projectId}
          runId={run.id}
          snapshotBeforeId={run.snapshotBeforeId}
          changedCount={changed.length}
          tokens={run.tokensIn + run.tokensOut}
          startedAt={startedAt}
          finishedAt={finishedAt}
          canEdit={canEdit}
          autoLoad={false}
          onReverted={onReverted}
        />
      ) : null}
    </div>
  );
}

function NotConfigured({ missingEnv, showOperatorDetails }: { missingEnv: string[]; showOperatorDetails: boolean }) {
  return (
    <div className="pop-in mx-auto mb-4 flex max-w-sm flex-col items-center px-2 pt-8 text-center">
      <span className="rim flex size-12 items-center justify-center rounded-2xl border border-border-strong bg-card text-muted-foreground shadow-lg">
        <KeyRound className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-5 font-display text-[22px] font-[650] tracking-tight">AI is not configured</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">The AI assistant isn&apos;t set up on this server yet. Your files, the editor, previews and version history still work.</p>
      <Button asChild variant="outline" size="sm" className="mt-5">
        <Link href="/docs/ai-agent">Read the AI agent setup guide</Link>
      </Button>
      {showOperatorDetails ? (
        <details className="group mt-6 w-full rounded-xl border border-border text-left text-xs">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            Details for the server operator
            <span className="transition-transform group-open:rotate-90" aria-hidden="true">
              ›
            </span>
          </summary>
          <p className="border-t border-border px-3 py-2.5 leading-relaxed text-muted-foreground">
            No AI provider key is set. Add {missingEnv.length ? missingEnv.join(" or ") : "ANTHROPIC_API_KEY or OPENAI_API_KEY"} to the server environment and restart the app to enable the agent.
          </p>
        </details>
      ) : null}
    </div>
  );
}

const SUGGESTION_ICONS: Record<SuggestionIcon, LucideIcon> = {
  layout: LayoutTemplate,
  palette: Palette,
  chart: BarChart3,
  cart: ShoppingBag,
  form: FormInput,
  search: Search,
  sparkles: Sparkles,
  shield: ShieldCheck,
  users: Users,
  phone: Smartphone,
  route: Route,
  explain: Lightbulb,
  fix: Wrench,
  bolt: Bolt,
  image: ImageIcon,
  mail: Mail,
};

/** First-run state: the project, one display line, and four starting points that fit this template. */
function ChatWelcome({ projectName, category, framework, onPick }: { projectName?: string; category?: string | null; framework?: string | null; onPick: (text: string, mode: AgentMode) => void }) {
  const suggestions = suggestionsFor(category, framework);
  return (
    <div className="mx-auto flex max-w-xl flex-col px-0.5 pt-6">
      {projectName ? <p className="truncate font-mono text-[12px] text-muted-foreground">{projectName}</p> : null}
      <h2 className="mt-1.5 font-display text-[24px] font-[680] leading-[1.15] tracking-[-0.025em] text-balance">
        What should we <span className="text-dim">build</span> next?
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
        Describe a feature, ask about the code, or fix the latest error. The agent plans first, edits files through reviewable tools and saves a checkpoint before every change.
      </p>
      <ul className="ws-suggest mt-5 grid grid-cols-1 gap-2 @[440px]:grid-cols-2" aria-label="Suggestions">
        {suggestions.map((s) => {
          const Icon = SUGGESTION_ICONS[s.icon];
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => onPick(s.prompt, s.mode)}
                className="group flex h-full w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-border-strong hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring calm:hover:translate-y-0"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors group-hover:text-signal">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                    {s.title}
                    {s.mode !== "build" ? <span className="rounded-md bg-muted px-1.5 py-px text-[10.5px] font-medium capitalize text-muted-foreground">{s.mode}</span> : null}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">{s.prompt}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11.5px] text-muted-foreground">Picking one only fills the composer. Nothing is sent until you press Enter.</p>
    </div>
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
