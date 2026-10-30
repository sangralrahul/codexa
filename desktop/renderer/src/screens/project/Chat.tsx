import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, Check, ChevronDown, FileCode2, FilePlus2, FileX2, ListChecks, Mail, MessageSquare, Hammer, Moon, Smartphone, Sparkles, Square, TriangleAlert, Wrench } from "lucide-react";
import { aiApi, streamGenerate, type AgentMode, type AiStatus, type Message, type MessagePart } from "../../lib/api";
import { cn } from "../../lib/util";
import { Avatar, Button, Logo, Menu, Spinner, Textarea } from "../../ui";
import { useApp } from "../../app/state";
import { Markdown } from "../../components/Markdown";

const MODES: { id: AgentMode; label: string; hint: string; icon: typeof Hammer }[] = [
  { id: "build", label: "Build", hint: "Plans, edits files and checks the result", icon: Hammer },
  { id: "plan", label: "Plan", hint: "Proposes a plan to approve first", icon: ListChecks },
  { id: "ask", label: "Ask", hint: "Answers without changing files", icon: MessageSquare },
  { id: "fix", label: "Fix", hint: "Repairs the latest error", icon: Wrench },
];

type FileChange = { path: string; action: "create" | "update" | "delete" };
type Live = { prompt: string; text: string; stage: string | null; tools: number; files: FileChange[]; plan: string[] | null; error: string | null; done: boolean; summary?: string; nextSteps?: string[] };

export function Chat({ projectId, initialPrompt, onFilesChanged }: { projectId: string; initialPrompt?: string; onFilesChanged: (paths: string[]) => void }) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [live, setLive] = useState<Live | null>(null);
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
      const changed: string[] = [];
      setLive({ prompt, text: "", stage: "Starting", tools: 0, files: [], plan: null, error: null, done: false });
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
                case "stage":
                  return { ...l, stage: e.data.detail ?? e.data.stage };
                case "text":
                  return { ...l, text: l.text + e.data.delta };
                case "tool_call":
                  return { ...l, tools: l.tools + 1, stage: e.data.summary || l.stage };
                case "file_change":
                  changed.push(e.data.path);
                  return { ...l, files: [...l.files.filter((f) => f.path !== e.data.path), { path: e.data.path, action: e.data.action }] };
                case "plan":
                  return { ...l, plan: e.data.steps };
                case "error":
                  return { ...l, error: e.data.message };
                case "done":
                  return { ...l, done: true, stage: null, summary: e.data.summary, nextSteps: e.data.nextSteps, error: e.data.status === "failed" ? (e.data.error ?? l.error ?? "The run failed.") : l.error };
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

  return (
    <div className="flex h-full flex-col bg-card">
      <div ref={scrollRef} className="scroll min-h-0 flex-1 px-4 py-5">
        {messages === null ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : messages.length === 0 && !live ? (
          <Welcome configured={!notConfigured} onPick={(t) => setInput(t)} />
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (m.role === "user" ? <UserBubble key={m.id} text={m.content} /> : m.role === "assistant" ? <SavedReply key={m.id} message={m} onApprove={(steps) => send("Build the approved plan.", { mode: "build", approvedPlan: steps })} /> : null))}
            {live ? (
              <>
                {messages.some((m) => m.role === "user" && m.content === live.prompt) ? null : <UserBubble text={live.prompt} />}
                <LiveReply live={live} />
              </>
            ) : null}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        {notConfigured ? (
          <p className="mb-2 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-[12.5px] text-warning">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> AI isn&apos;t set up on this Codexa server yet, so chat can&apos;t run. Files, preview and publishing still work.
          </p>
        ) : null}
        <div className="rounded-xl border border-border bg-bg transition-colors focus-within:border-border-strong">
          <Textarea
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
            placeholder={notConfigured ? "Chat turns on once AI is configured" : "Describe a change…"}
            aria-label="Message the AI"
            className="min-h-[64px] px-3.5 pt-3 text-[14px]"
          />
          <div className="flex items-center gap-2 px-2 pb-2">
            <Menu
              align="start"
              width={260}
              trigger={(open, toggle) => (
                <button type="button" onClick={toggle} aria-expanded={open} aria-label={`Mode: ${current.label}. Change mode`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[12.5px] font-medium hover:border-border-strong">
                  <current.icon className="size-3.5" /> {current.label} <ChevronDown className="size-3 text-dim" />
                </button>
              )}
            >
              {(close) =>
                MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => (setMode(m.id), close())}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface"
                  >
                    <m.icon className="mt-0.5 size-4 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">{m.label}</span>
                      <span className="block text-[12px] text-muted">{m.hint}</span>
                    </span>
                    {mode === m.id ? <Check className="mt-0.5 size-4 text-muted" /> : null}
                  </button>
                ))
              }
            </Menu>
            <span className="ml-auto" />
            {running ? (
              <Button size="sm" onClick={() => void stop()} aria-label="Stop">
                <Square className="size-3.5 fill-current" /> Stop
              </Button>
            ) : (
              <Button variant="primary" size="icon-sm" className="rounded-full" aria-label="Send" disabled={!input.trim() || Boolean(notConfigured)} onClick={() => send(input)}>
                <ArrowUp />
              </Button>
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
    <div className="fade-in flex h-full flex-col justify-center px-1">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-sm">
        <Logo size={22} />
      </div>
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-[19px] font-semibold tracking-[-0.02em]">What should we change?</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{configured ? "Describe a feature, ask about the code, or fix an error. Every change is saved as a checkpoint you can restore." : "AI isn't configured on this server yet."}</p>
      {configured ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {IDEAS.map((i) => (
            <button key={i.label} type="button" onClick={() => onPick(i.label)} className="card-edge group rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-border-strong">
              <i.icon className="size-4 text-muted transition-colors group-hover:text-accent" />
              <span className="mt-2 block text-[12.5px] font-medium leading-snug">{i.label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-dim">{i.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-5 flex items-center gap-1.5 text-[11.5px] text-dim">
        <Sparkles className="size-3" /> Tip: switch to Plan mode to approve the steps before anything changes.
      </p>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  const { user } = useApp();
  return (
    <div className="flex justify-end gap-2.5">
      <div className="selectable max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-surface px-3.5 py-2.5 text-[13.5px] leading-relaxed">{text}</div>
      <span className="mt-0.5 shrink-0">
        <Avatar name={user.name || user.email} size={24} />
      </span>
    </div>
  );
}

/** The Codexa mark beside an assistant reply (replies are indented to make room for it). */
function AssistantMark() {
  return (
    <span aria-hidden="true" className="absolute left-0 top-0.5 flex size-6 items-center justify-center rounded-md bg-primary text-primary-fg">
      <Logo size={13} />
    </span>
  );
}

const FILE_ICON = { create: FilePlus2, update: FileCode2, delete: FileX2 };

function Files({ files }: { files: FileChange[] }) {
  if (!files.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-border">
      <p className="border-b border-border px-3 py-1.5 text-[11.5px] font-medium text-dim">
        {files.length} file{files.length === 1 ? "" : "s"} changed
      </p>
      <ul className="max-h-40 overflow-auto py-1">
        {files.map((f) => {
          const Icon = FILE_ICON[f.action];
          return (
            <li key={f.path} className="flex items-center gap-2 px-3 py-1 font-mono text-[12px] text-muted">
              <Icon className={cn("size-3.5 shrink-0", f.action === "create" ? "text-success" : f.action === "delete" ? "text-danger" : "text-dim")} />
              <span className="truncate">{f.path}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Plan({ steps, onApprove }: { steps: string[]; onApprove?: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <p className="text-[12px] font-medium text-dim">Plan</p>
      <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[13px]">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {onApprove ? (
        <Button variant="primary" size="sm" className="mt-3" onClick={onApprove}>
          <Check /> Approve and build
        </Button>
      ) : null}
    </div>
  );
}

function SavedReply({ message, onApprove }: { message: Message; onApprove: (steps: string[]) => void }) {
  const parts: MessagePart[] = message.parts ?? [];
  const text = parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n\n") || message.content;
  const files = parts.filter((p): p is Extract<MessagePart, { type: "file_change" }> => p.type === "file_change").map((f) => ({ path: f.path, action: f.action }));
  const plan = parts.find((p): p is Extract<MessagePart, { type: "plan" }> => p.type === "plan");
  const errors = parts.filter((p): p is Extract<MessagePart, { type: "error" }> => p.type === "error");
  const tools = parts.filter((p) => p.type === "tool_call").length;
  return (
    <div className="relative pl-9 text-[13.5px] leading-relaxed">
      <AssistantMark />
      {text ? <Markdown text={text} /> : null}
      {plan ? <Plan steps={plan.steps} onApprove={plan.approval === "pending" ? () => onApprove(plan.steps) : undefined} /> : null}
      <Files files={[...new Map(files.map((f) => [f.path, f])).values()]} />
      {tools ? <p className="mt-2 text-[12px] text-dim">Ran {tools} action{tools === 1 ? "" : "s"}</p> : null}
      {errors.map((e, i) => (
        <p key={i} className="mt-2 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {e.message}
        </p>
      ))}
    </div>
  );
}

function LiveReply({ live }: { live: Live }) {
  return (
    <div className="relative pl-9 text-[13.5px] leading-relaxed">
      <AssistantMark />
      {live.stage ? (
        <p className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <span className="pulse size-1.5 rounded-full bg-accent" /> {live.stage}
          {live.tools ? <span className="text-dim">· {live.tools} action{live.tools === 1 ? "" : "s"}</span> : null}
        </p>
      ) : null}
      {live.text ? <Markdown text={live.text} /> : null}
      {live.plan ? <Plan steps={live.plan} /> : null}
      <Files files={live.files} />
      {live.error ? (
        <p className="mt-2 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {live.error}
        </p>
      ) : null}
    </div>
  );
}

