import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, BookOpen, Check, ChevronDown, ChevronRight, ChevronsUpDown, CornerDownRight, FileDiff, FilePen, FileSearch, FileX2, FolderTree, Hammer, History as HistoryIcon, Image as ImageIcon, ListChecks, Mail, MessageSquare, MessageSquarePlus, Moon, ScrollText, Search, Smartphone, Square, TerminalSquare, TriangleAlert, Wrench, X } from "lucide-react";
import { aiApi, streamGenerate, type AgentMode, type AiStatus, type Conversation, type Message, type MessagePart } from "../../lib/api";
import { cn, relativeTime } from "../../lib/util";
import { Badge, Button, Logo, Menu, MenuItem, MenuSeparator, Spinner, Textarea, Tip } from "../../ui";
import { Markdown } from "../../components/Markdown";
import { FileIcon } from "./fileKinds";

/** The run's stages, in order, as the progress rail shows them. */
const RAIL = [
  { id: "loading_context", label: "Read", match: ["queued", "loading_context"] },
  { id: "planning", label: "Plan", match: ["planning"] },
  { id: "working", label: "Edit", match: ["working", "answering"] },
  { id: "validating", label: "Check", match: ["validating", "repairing"] },
  { id: "done", label: "Done", match: ["done"] },
];
const railIndex = (stage: string) => RAIL.findIndex((r) => r.match.includes(stage));
const fmtElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const MODES: { id: AgentMode; label: string; hint: string; icon: typeof Hammer }[] = [
  { id: "build", label: "Build", hint: "Plans, edits files and checks the result", icon: Hammer },
  { id: "plan", label: "Plan", hint: "Proposes a plan to approve first", icon: ListChecks },
  { id: "ask", label: "Ask", hint: "Answers without changing files", icon: MessageSquare },
  { id: "fix", label: "Fix", hint: "Repairs the latest error", icon: Wrench },
];

type FileChange = { path: string; action: "create" | "update" | "delete" };
/** One tool call and (once it arrives) its result. */
type ToolStep = { id: string; name: string; summary: string; status: "running" | "ok" | "error"; output?: string };
/** What the agent did, in order: prose and tool calls, interleaved as they happened. */
type Item = { kind: "text"; text: string } | { kind: "tool"; step: ToolStep } | { kind: "plan"; steps: string[]; pending: boolean };
type Live = { prompt: string; text: string; items: Item[]; stage: string | null; reached: number; startedAt: number; tools: number; files: FileChange[]; plan: string[] | null; error: string | null; done: boolean; status?: "succeeded" | "failed" | "cancelled"; summary?: string; nextSteps?: string[] };

export function Chat({ projectId, initialPrompt, onFilesChanged, onOpenHistory }: { projectId: string; initialPrompt?: string; onFilesChanged: (paths: string[]) => void; onOpenHistory?: () => void }) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AgentMode>("build");
  const cancelRef = useRef<(() => void) | null>(null);
  const runIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  const running = Boolean(live && !live.done);

  const loadMessages = useCallback(
    async (cid: string) => {
      try {
        setMessages((await aiApi.messages(projectId, cid)).messages);
      } catch {
        setMessages([]);
      }
    },
    [projectId],
  );

  useEffect(() => {
    void (async () => {
      const [st, conv] = await Promise.all([aiApi.status(projectId).catch(() => ({ configured: false }) as AiStatus), aiApi.conversations(projectId).catch(() => ({ conversations: [] }))]);
      setStatus(st);
      setConversations(conv.conversations);
      const latest = conv.conversations[0];
      if (latest) {
        setConversationId(latest.id);
        await loadMessages(latest.id);
      } else setMessages([]);
    })();
    return () => cancelRef.current?.();
  }, [projectId, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, live]);

  const send = useCallback(
    (text: string, opts: { mode?: AgentMode; approvedPlan?: string[] } = {}) => {
      const prompt = text.trim();
      if (!prompt || running) return;
      setInput("");
      setSuggestions([]);
      const changed: string[] = [];
      setLive({ prompt, text: "", items: [], stage: "Starting", reached: 0, startedAt: Date.now(), tools: 0, files: [], plan: null, error: null, done: false });
      cancelRef.current = streamGenerate(
        projectId,
        { prompt, mode: opts.mode ?? mode, conversationId, approvedPlan: opts.approvedPlan },
        {
          onEvent: (e) => {
            setLive((l) => {
              if (!l) return l;
              switch (e.event) {
                case "run":
                  runIdRef.current = e.data.runId;
                  setConversationId(e.data.conversationId);
                  return l;
                case "stage": {
                  const idx = railIndex(e.data.stage);
                  return { ...l, stage: e.data.detail ?? e.data.stage, reached: idx >= 0 ? Math.max(l.reached, idx) : l.reached };
                }
                case "text": {
                  const last = l.items.at(-1);
                  const items: Item[] = last?.kind === "text" ? [...l.items.slice(0, -1), { kind: "text", text: last.text + e.data.delta }] : [...l.items, { kind: "text", text: e.data.delta }];
                  return { ...l, text: l.text + e.data.delta, items };
                }
                case "tool_call":
                  return { ...l, tools: l.tools + 1, stage: e.data.summary || l.stage, items: [...l.items, { kind: "tool", step: { id: e.data.id, name: e.data.name, summary: e.data.summary, status: "running" } }] };
                case "tool_result":
                  return { ...l, items: l.items.map((it) => (it.kind === "tool" && it.step.id === e.data.id ? { kind: "tool", step: { ...it.step, status: e.data.isError ? "error" : "ok", output: e.data.output } } : it)) };
                case "file_change":
                  changed.push(e.data.path);
                  return { ...l, files: [...l.files.filter((f) => f.path !== e.data.path), { path: e.data.path, action: e.data.action }] };
                case "plan":
                  return { ...l, plan: e.data.steps, items: [...l.items.filter((it) => it.kind !== "plan"), { kind: "plan", steps: e.data.steps, pending: e.data.approval === "pending" }] };
                case "error":
                  return { ...l, error: e.data.message };
                case "done":
                  if (e.data.status === "succeeded" && e.data.nextSteps?.length) setSuggestions(e.data.nextSteps.slice(0, 3));
                  return { ...l, done: true, status: e.data.status, stage: null, reached: e.data.status === "succeeded" ? RAIL.length - 1 : l.reached, summary: e.data.summary, nextSteps: e.data.nextSteps, error: e.data.status === "failed" ? (e.data.error ?? l.error ?? "The run failed.") : l.error };
                default:
                  return l;
              }
            });
          },
          onError: (err) => setLive((l) => (l ? { ...l, error: err.message, done: true, stage: null } : l)),
          onEnd: () => {
            cancelRef.current = null;
            runIdRef.current = null;
            setLive((l) => (l ? { ...l, done: true, stage: null } : l));
            if (changed.length) onFilesChanged([...new Set(changed)]);
            setConversationId((cid) => {
              if (cid)
                void loadMessages(cid).then(() =>
                  setLive((l) => {
                    // Keep an error visible (it may not be saved as a message); otherwise the saved history replaces the live card.
                    return l?.error ? l : null;
                  }),
                );
              aiApi
                .conversations(projectId)
                .then((r) => setConversations(r.conversations))
                .catch(() => {});
              return cid;
            });
          },
        },
      );
    },
    [projectId, mode, conversationId, running, loadMessages, onFilesChanged],
  );

  // A project created from Home with a prompt: send it once the AI is known to be set up.
  useEffect(() => {
    if (!initialPrompt || sentInitial.current || !status || messages === null) return;
    sentInitial.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sends the prompt the project was created with, once
    if (status.configured) send(initialPrompt, { mode: "build" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the idea in the box when AI is off
    else setInput(initialPrompt);
  }, [initialPrompt, status, messages, send]);

  const stop = async () => {
    const id = runIdRef.current;
    if (id) await aiApi.cancel(projectId, id).catch(() => {});
    cancelRef.current?.();
  };

  const current = MODES.find((m) => m.id === mode)!;
  const notConfigured = status && !status.configured;
  const activeConversation = conversations.find((c) => c.id === conversationId) ?? null;
  const newChat = () => {
    if (running) return;
    setConversationId(null);
    setMessages([]);
    setLive(null);
    setSuggestions([]);
  };
  const switchChat = async (c: Conversation) => {
    if (running || c.id === conversationId) return;
    setConversationId(c.id);
    setMessages(null);
    setLive(null);
    setSuggestions([]);
    await loadMessages(c.id);
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="ws-bar gap-1 pl-2 pr-2">
        <Menu
          align="start"
          width={300}
          className="flex min-w-0 flex-1"
          trigger={(open, toggle) => (
            <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label="Switch conversation" className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-surface">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-tight">{activeConversation?.title || (conversationId ? "Chat" : "New chat")}</span>
                <span className="block truncate text-[11px] leading-tight text-dim">{activeConversation ? `Updated ${relativeTime(activeConversation.updatedAt)}` : `${conversations.length} conversation${conversations.length === 1 ? "" : "s"} in this project`}</span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-dim" />
            </button>
          )}
        >
          {(close) => (
            <>
              <p className="ws-label px-2.5 pb-1.5 pt-2">Conversations</p>
              {conversations.length === 0 ? <p className="px-2.5 pb-2 text-[12.5px] text-muted">Nothing yet. Your chats show up here.</p> : null}
              {conversations.slice(0, 12).map((c) => (
                <MenuItem key={c.id} checked={c.id === conversationId} onSelect={() => (void switchChat(c), close())}>
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate">{c.title || "Untitled chat"}</span>
                    <span className="mono shrink-0 text-[10.5px] text-dim">{relativeTime(c.updatedAt)}</span>
                  </span>
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem icon={<MessageSquarePlus />} onSelect={() => (newChat(), close())}>
                New chat
              </MenuItem>
            </>
          )}
        </Menu>
        <Tip label="New chat" align="end">
          <button type="button" className="ws-icon" aria-label="New chat" onClick={newChat} disabled={running || (!conversationId && messages?.length === 0)}>
            <MessageSquarePlus />
          </button>
        </Tip>
      </div>
      <div ref={scrollRef} className="scroll min-h-0 flex-1">
        {messages === null ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : messages.length === 0 && !live ? (
          <Welcome configured={!notConfigured} onPick={(t) => setInput(t)} />
        ) : (
          <div className="space-y-6 px-4 pb-6 pt-5">
            {messages.map((m) => (m.role === "user" ? <UserMessage key={m.id} text={m.content} /> : m.role === "assistant" ? <SavedReply key={m.id} message={m} onOpenHistory={onOpenHistory} onApprove={(steps) => send("Build the approved plan.", { mode: "build", approvedPlan: steps })} /> : null))}
            {live ? (
              <>
                {messages.some((m) => m.role === "user" && m.content === live.prompt) ? null : <UserMessage text={live.prompt} />}
                <LiveReply live={live} onOpenHistory={onOpenHistory} />
              </>
            ) : null}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card px-3 pb-3 pt-2.5">
        {suggestions.length && !running ? (
          <div className="mb-2.5 flex flex-wrap gap-1.5" aria-label="Suggested next steps">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12px] text-muted transition-colors hover:border-border-strong hover:bg-surface hover:text-fg">
                <CornerDownRight className="size-3 shrink-0 text-dim" /> <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        ) : null}
        {notConfigured ? (
          <p className="mb-2 flex items-center gap-2 rounded-md border border-border bg-panel px-2.5 py-1.5 text-[12px] text-muted">
            <span className="ws-dot" /> AI isn&apos;t set up on this server yet. Files, preview and publishing still work.
          </p>
        ) : null}
        <div className="ws-composer">
          <Textarea
            id="ws-composer"
            value={input}
            rows={2}
            maxLength={8000}
            disabled={Boolean(notConfigured)}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={notConfigured ? "Chat turns on once AI is configured" : running ? "Codexa is working… you can queue your next idea here" : "Describe a change or ask about the code"}
            aria-label="Message the AI"
            className="max-h-[220px] min-h-[60px] px-3 pt-2.5 text-[13.5px]"
          />
          <div className="flex items-center gap-1.5 px-1.5 pb-1.5">
            <Menu
              align="start"
              width={272}
              trigger={(open, toggle) => (
                <Tip label="Agent mode" side="top">
                  <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={`Mode: ${current.label}. Change mode`} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-fg transition-colors hover:bg-surface aria-expanded:bg-surface">
                    <current.icon className="size-3.5 text-muted" /> {current.label} <ChevronDown className="size-3 text-dim" />
                  </button>
                </Tip>
              )}
            >
              {(close) => (
                <>
                  <p className="ws-label px-2.5 pb-1.5 pt-2">Mode</p>
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={mode === m.id}
                      onClick={() => (setMode(m.id), close())}
                      className={cn("flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface", mode === m.id && "bg-surface")}
                    >
                      <m.icon className="mt-0.5 size-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium leading-tight">{m.label}</span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{m.hint}</span>
                      </span>
                      {mode === m.id ? <Check className="mt-0.5 size-4 shrink-0 text-fg" /> : null}
                    </button>
                  ))}
                </>
              )}
            </Menu>
            <span className="ml-auto hidden truncate text-[11px] text-dim min-[380px]:inline">{running ? "Working…" : "Enter to send · Shift Enter for a new line"}</span>
            {running ? (
              <Button size="xs" onClick={() => void stop()} aria-label="Stop">
                <Square className="!size-3 fill-current" /> Stop
              </Button>
            ) : (
              <Tip label="Send" keys="Enter" side="top" align="end">
                <Button variant="primary" size="icon-sm" aria-label="Send" disabled={!input.trim() || Boolean(notConfigured)} onClick={() => send(input)}>
                  <ArrowUp />
                </Button>
              </Tip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const IDEAS = [
  { icon: Moon, label: "Add a dark mode toggle", hint: "Theme switch that remembers the choice" },
  { icon: Smartphone, label: "Make it work on phones", hint: "Responsive layout and touch targets" },
  { icon: Mail, label: "Add a contact form", hint: "With validation and a success state" },
  { icon: BookOpen, label: "Explain this project", hint: "How the files fit together" },
];

function Welcome({ configured, onPick }: { configured: boolean; onPick: (t: string) => void }) {
  return (
    <div className="fade-in flex min-h-full flex-col justify-center px-5 py-8">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-fg">
        <Logo size={20} />
      </div>
      <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.025em]">What should we change?</h2>
      <p className="mt-1.5 max-w-[340px] text-[13px] leading-relaxed text-muted">{configured ? "Describe a feature, ask about the code, or fix an error. Every change is saved as a checkpoint you can restore." : "AI isn't configured on this server yet."}</p>
      {configured ? (
        <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-border">
          {IDEAS.map((i, n) => (
            <button
              key={i.label}
              type="button"
              onClick={() => onPick(i.label)}
              className={cn("group bg-card p-3 text-left transition-colors hover:bg-panel dark:hover:bg-surface", n % 2 === 0 && "border-r border-border", n < 2 && "border-b border-border")}
            >
              <i.icon className="size-4 text-dim transition-colors group-hover:text-fg" />
              <span className="mt-2.5 block text-[12.5px] font-medium leading-snug">{i.label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-dim">{i.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-5 flex items-center gap-2 text-[11.5px] text-dim">
        <ListChecks className="size-3.5" /> Switch to Plan mode to approve the steps before anything changes.
      </p>
    </div>
  );
}

/** "…\n\nContext: I'm looking at `src/x.ts`." is how the web app attaches the open file; show it as a chip. */
const CONTEXT_RE = /\n+Context: I'm looking at `([^`]+)`\.?\s*$/;

function UserMessage({ text }: { text: string }) {
  const ctx = text.match(CONTEXT_RE);
  const body = ctx ? text.slice(0, ctx.index) : text;
  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-[10px] border border-border bg-panel px-3 py-2 dark:bg-surface">
        <p className="selectable whitespace-pre-wrap text-[13.5px] leading-relaxed text-fg">{body}</p>
        {ctx ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
            <FileIcon path={ctx[1]} className="size-3" />
            <span className="mono truncate">{ctx[1]}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** An assistant turn: who, what it did (counts), when; then its body. */
function AgentTurn({ meta, time, children }: { meta?: string; time?: string; children: ReactNode }) {
  return (
    <article className="min-w-0">
      <header className="mb-2 flex items-center gap-2 text-[12px]">
        <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-primary text-primary-fg">
          <Logo size={11} />
        </span>
        <span className="font-semibold text-fg">Codexa</span>
        {meta ? <span className="truncate text-dim">{meta}</span> : null}
        {time ? <span className="mono ml-auto shrink-0 text-[10.5px] text-dim">{time}</span> : null}
      </header>
      <div className="space-y-3 text-[13.5px] leading-relaxed">{children}</div>
    </article>
  );
}

const TOOL: Record<string, { verb: string; icon: typeof Wrench; path?: boolean }> = {
  list_files: { verb: "Listed files", icon: FolderTree },
  read_file: { verb: "Read", icon: FileSearch, path: true },
  write_file: { verb: "Wrote", icon: FilePen, path: true },
  edit_file: { verb: "Edited", icon: FilePen, path: true },
  delete_file: { verb: "Deleted", icon: FileX2, path: true },
  search_files: { verb: "Searched", icon: Search },
  run_command: { verb: "Ran", icon: TerminalSquare },
  get_logs: { verb: "Read logs", icon: ScrollText },
  generate_image: { verb: "Generated an image", icon: ImageIcon },
};
/** Planning and finishing are shown as the plan card and the reply itself, not as rows. */
const HIDDEN_TOOLS = new Set(["propose_plan", "finish"]);

/** The same short description the server streams with a live tool call, rebuilt for saved messages. */
function summarize(name: string, input: unknown): string {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  switch (name) {
    case "list_files":
      return i.prefix ? `under ${s(i.prefix)}` : "";
    case "read_file":
    case "write_file":
    case "edit_file":
    case "delete_file":
      return s(i.path);
    case "search_files":
      return `"${s(i.query).slice(0, 60)}"`;
    case "run_command":
      return s(i.command);
    case "get_logs":
      return i.lines ? `${String(i.lines)} lines` : "";
    case "generate_image":
      return s(i.alt).slice(0, 70);
    default:
      return "";
  }
}

function ToolRow({ step }: { step: ToolStep }) {
  const [open, setOpen] = useState(false);
  const t = TOOL[step.name] ?? { verb: step.name.replace(/_/g, " "), icon: Wrench };
  const target = t.path ? step.summary.replace(/\s\([^)]*\)$/, "") : step.name === "list_files" && step.summary === "all files" ? "" : step.summary;
  const expandable = Boolean(step.output);
  const content = (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
        {step.status === "running" ? <Spinner className="size-3.5" /> : step.status === "error" ? <X className="size-3.5 text-danger" /> : <t.icon className="size-3.5 text-dim" />}
      </span>
      <span className={cn("shrink-0 font-medium", step.status === "error" ? "text-danger" : "text-fg")}>{t.verb}</span>
      {target ? (
        <span className="mono min-w-0 truncate text-[11.5px] text-muted" title={target}>
          {target}
        </span>
      ) : null}
      <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
        {step.status === "ok" ? <Check className="size-3.5 text-success" aria-label="Succeeded" /> : step.status === "error" ? <span className="text-[11px] text-danger">Failed</span> : <span className="text-[11px] text-dim">Running</span>}
        {expandable ? <ChevronRight className={cn("size-3.5 text-dim transition-transform", open && "rotate-90")} aria-hidden="true" /> : null}
      </span>
    </>
  );
  return (
    <li>
      {expandable ? (
        <button type="button" className="ws-step" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {content}
        </button>
      ) : (
        <div className="ws-step">{content}</div>
      )}
      {open && step.output ? <pre className="ws-step__out selectable">{step.output.length > 4000 ? `${step.output.slice(0, 4000)}\n…` : step.output}</pre> : null}
    </li>
  );
}

/** Prose and tool calls in the order they happened; consecutive tool calls share one box. */
function Timeline({ items, renderPlan }: { items: Item[]; renderPlan: (steps: string[], pending: boolean) => ReactNode }) {
  const out: ReactNode[] = [];
  let group: ToolStep[] = [];
  const flush = () => {
    if (!group.length) return;
    const steps = group;
    group = [];
    out.push(
      <ol key={`g${out.length}`} className="ws-steps" aria-label="Agent actions">
        {steps.map((s) => (
          <ToolRow key={s.id} step={s} />
        ))}
      </ol>,
    );
  };
  for (const it of items) {
    if (it.kind === "tool") {
      if (!HIDDEN_TOOLS.has(it.step.name)) group.push(it.step);
      continue;
    }
    flush();
    if (it.kind === "text") {
      if (it.text.trim()) out.push(<Markdown key={`t${out.length}`} text={it.text} />);
    } else out.push(<Fragment key={`p${out.length}`}>{renderPlan(it.steps, it.pending)}</Fragment>);
  }
  flush();
  return <>{out}</>;
}

function Plan({ steps, status, onApprove }: { steps: string[]; status?: "pending" | "running" | "done" | "failed"; onApprove?: () => void }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Plan">
      <header className="flex h-9 items-center gap-2 border-b border-border px-3">
        <ListChecks className="size-3.5 text-muted" aria-hidden="true" />
        <span className="text-[12.5px] font-semibold">Plan</span>
        <span className="mono text-[10.5px] text-dim">
          {steps.length} step{steps.length === 1 ? "" : "s"}
        </span>
        <span className="ml-auto">
          {status === "pending" ? (
            <Badge tone="warning">Awaiting approval</Badge>
          ) : status === "running" ? (
            <Badge>
              <span className="ws-dot pulse bg-warning" /> In progress
            </Badge>
          ) : status === "done" ? (
            <Badge tone="success">
              <Check className="size-3" /> Completed
            </Badge>
          ) : status === "failed" ? (
            <Badge tone="danger">Stopped</Badge>
          ) : null}
        </span>
      </header>
      <ol className="space-y-2 px-3 py-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-snug">
            <span className={cn("mono mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[10px]", status === "done" ? "border-success/40 bg-success/10 text-success" : "border-border-strong text-muted")}>
              {status === "done" ? <Check className="size-2.5" aria-label="Done" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1 text-fg">{s.trim().split("\n")[0]}</span>
          </li>
        ))}
      </ol>
      {onApprove ? (
        <footer className="flex items-center gap-2 border-t border-border bg-panel px-3 py-2 dark:bg-surface">
          <span className="text-[12px] text-muted">Nothing changes until you approve.</span>
          <Button variant="primary" size="xs" className="ml-auto" onClick={onApprove}>
            <Check className="!size-3.5" /> Approve and build
          </Button>
        </footer>
      ) : null}
    </section>
  );
}

const ACTION_LETTER = { create: "A", update: "M", delete: "D" } as const;
const ACTION_LABEL = { create: "Added", update: "Modified", delete: "Deleted" } as const;

function Files({ files, checkpoint, onOpenHistory }: { files: FileChange[]; checkpoint?: boolean; onOpenHistory?: () => void }) {
  if (!files.length) return null;
  const counts = { create: 0, update: 0, delete: 0 };
  for (const f of files) counts[f.action]++;
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Files changed">
      <header className="flex h-9 items-center gap-2 border-b border-border px-3">
        <FileDiff className="size-3.5 text-muted" aria-hidden="true" />
        <span className="text-[12.5px] font-semibold">
          {files.length} file{files.length === 1 ? "" : "s"} changed
        </span>
        <span className="ml-auto flex items-center gap-2">
          {(["create", "update", "delete"] as const).map((a) =>
            counts[a] ? (
              <span key={a} className="flex items-center gap-1 text-[11px] text-dim" title={`${counts[a]} ${ACTION_LABEL[a].toLowerCase()}`}>
                <span className="ws-change" data-action={a}>
                  {ACTION_LETTER[a]}
                </span>
                <span className="mono">{counts[a]}</span>
              </span>
            ) : null,
          )}
        </span>
      </header>
      <ul className="max-h-48 overflow-auto py-1">
        {files.map((f) => {
          const slash = f.path.lastIndexOf("/");
          return (
            <li key={f.path} className="flex h-7 items-center gap-2 px-3 text-[12px]" title={`${ACTION_LABEL[f.action]}: ${f.path}`}>
              <span className="ws-change" data-action={f.action} aria-label={ACTION_LABEL[f.action]}>
                {ACTION_LETTER[f.action]}
              </span>
              <FileIcon path={f.path} className="size-3" />
              <span className={cn("shrink-0 font-medium", f.action === "delete" ? "text-muted line-through" : "text-fg")}>{f.path.slice(slash + 1)}</span>
              {slash > 0 ? <span className="mono min-w-0 truncate text-[11px] text-dim">{f.path.slice(0, slash)}</span> : null}
            </li>
          );
        })}
      </ul>
      {checkpoint ? (
        <footer className="flex h-9 items-center gap-2 border-t border-dashed border-border px-3 text-[12px] text-muted">
          <HistoryIcon className="size-3.5 shrink-0 text-dim" aria-hidden="true" />
          <span className="truncate">Checkpoint saved before this run</span>
          {onOpenHistory ? (
            <button type="button" onClick={onOpenHistory} className="ml-auto shrink-0 rounded-sm font-medium text-fg underline-offset-2 hover:underline">
              View in History
            </button>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-[12.5px] leading-relaxed text-danger">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> <span className="selectable min-w-0">{message}</span>
    </p>
  );
}

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

function SavedReply({ message, onApprove, onOpenHistory }: { message: Message; onApprove: (steps: string[]) => void; onOpenHistory?: () => void }) {
  const parts: MessagePart[] = message.parts ?? [];
  const results = new Map(parts.filter((p): p is Extract<MessagePart, { type: "tool_result" }> => p.type === "tool_result").map((r) => [r.id, r]));
  const items: Item[] = [];
  for (const p of parts) {
    if (p.type === "text") {
      const last = items.at(-1);
      if (last?.kind === "text") last.text += `\n\n${p.text}`;
      else items.push({ kind: "text", text: p.text });
    } else if (p.type === "tool_call") {
      const r = results.get(p.id);
      items.push({ kind: "tool", step: { id: p.id, name: p.name, summary: summarize(p.name, p.input), status: r ? (r.isError ? "error" : "ok") : "ok", output: r?.output } });
    } else if (p.type === "plan") items.push({ kind: "plan", steps: p.steps, pending: p.approval === "pending" });
  }
  const texts = parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text);
  // The saved content is the run's closing summary; show it when the streamed prose doesn't already say it.
  const closing = message.content?.trim() && !texts.join("\n\n").includes(message.content.trim()) ? message.content : null;
  const files = [...new Map(parts.filter((p): p is Extract<MessagePart, { type: "file_change" }> => p.type === "file_change").map((f) => [f.path, { path: f.path, action: f.action }])).values()];
  const errors = parts.filter((p): p is Extract<MessagePart, { type: "error" }> => p.type === "error");
  const tools = parts.filter((p) => p.type === "tool_call" && !HIDDEN_TOOLS.has(p.name)).length;
  const meta = [tools ? count(tools, "action") : null, files.length ? count(files.length, "file") : null].filter(Boolean).join(" · ");
  return (
    <AgentTurn meta={meta || undefined} time={relativeTime(message.createdAt)}>
      <Timeline items={items} renderPlan={(steps, pending) => <Plan steps={steps} status={pending ? "pending" : undefined} onApprove={pending ? () => onApprove(steps) : undefined} />} />
      {closing ? <Markdown text={closing} /> : null}
      <Files files={files} checkpoint onOpenHistory={onOpenHistory} />
      {errors.map((e, i) => (
        <ErrorNote key={i} message={e.message} />
      ))}
    </AgentTurn>
  );
}

function LiveReply({ live, onOpenHistory }: { live: Live; onOpenHistory?: () => void }) {
  const [now, setNow] = useState(() => live.startedAt);
  useEffect(() => {
    if (live.done) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live.done]);
  const succeeded = live.done && live.reached === RAIL.length - 1;
  const planStatus = !live.done ? "running" : succeeded ? "done" : live.error || live.status === "failed" || live.status === "cancelled" ? "failed" : undefined;
  return (
    <AgentTurn meta={live.done ? (live.tools ? count(live.tools, "action") : undefined) : "is working"}>
      {!live.done || succeeded ? (
        <div className="rounded-lg border border-border bg-card px-3 pb-2.5 pt-2" aria-live="polite">
          <div className="flex items-center gap-2 text-[12.5px]">
            {live.done ? <Check className="size-3.5 shrink-0 text-success" /> : <Spinner className="size-3.5 shrink-0 text-fg" />}
            <span className="min-w-0 truncate font-medium text-fg">{live.done ? "Done" : live.stage}</span>
            <span className="mono ml-auto shrink-0 text-[10.5px] tabular-nums text-dim">
              {live.tools ? `${count(live.tools, "action")} · ` : ""}
              {fmtElapsed(now - live.startedAt)}
            </span>
          </div>
          <ol className="mt-2 grid grid-cols-5 gap-1" aria-label="Progress">
            {RAIL.map((r, i) => {
              const state = succeeded ? "done" : i < live.reached ? "done" : i === live.reached ? "active" : "next";
              return (
                <li key={r.id} className="min-w-0" aria-current={state === "active" ? "step" : undefined}>
                  <span className={cn("block h-[3px] rounded-full", state === "done" ? "bg-fg" : state === "active" ? "pulse bg-fg" : "bg-track")} />
                  <span className={cn("mono mt-1.5 block truncate text-[10px] uppercase tracking-[0.06em]", state === "next" ? "text-dim" : "text-muted")}>{r.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
      <Timeline items={live.items} renderPlan={(steps) => <Plan steps={steps} status={planStatus} />} />
      <Files files={live.files} checkpoint={live.done} onOpenHistory={onOpenHistory} />
      {live.done && live.status === "cancelled" && !live.error ? <p className="text-[12.5px] text-muted">Run stopped.</p> : null}
      {live.error ? <ErrorNote message={live.error} /> : null}
    </AgentTurn>
  );
}
