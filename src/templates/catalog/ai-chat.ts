import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-ai-chat",
    title: "Assistant",
    readme: `# AI chat starter

A chat interface that POSTs the conversation to a configurable HTTP endpoint and renders the reply.
It contains **no AI provider code and no API keys** — browsers must never hold provider keys.

## Backend contract

Set \`VITE_CHAT_API_URL\` (or type the URL into the settings panel in the UI) to an endpoint that accepts:

\`\`\`json
POST { "messages": [{ "role": "user" | "assistant", "content": "..." }] }
\`\`\`

and returns:

\`\`\`json
{ "reply": "..." }
\`\`\`

Create that endpoint on a server (for example the Codexa "Express REST API" template) and call OpenAI or Anthropic from there with the key kept in an environment variable.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/useLocalStorage.ts": USE_LOCAL_STORAGE,
  "src/chat.ts": `export type Message = { role: "user" | "assistant"; content: string };

/**
 * Send the conversation to your backend. The backend is responsible for calling the AI provider;
 * never put a provider API key in browser code.
 */
export async function sendMessages(endpoint: string, messages: Message[], signal?: AbortSignal): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok) throw new Error("Backend responded with " + res.status);
  const data = (await res.json()) as { reply?: unknown };
  if (typeof data.reply !== "string") throw new Error("Backend response is missing a string 'reply' field");
  return data.reply;
}
`,
  "src/App.tsx": `import { useEffect, useRef, useState, type FormEvent } from "react";
import { sendMessages, type Message } from "./chat";
import { useLocalStorage } from "./useLocalStorage";

const envEndpoint = (import.meta.env.VITE_CHAT_API_URL as string | undefined) ?? "";

const suggestions = [
  { title: "Summarise a document", prompt: "Summarise the key decisions in this meeting transcript:" },
  { title: "Draft an email", prompt: "Draft a friendly follow-up email to a customer whose trial ends this week." },
  { title: "Explain some code", prompt: "Explain what this function does and suggest one improvement:" },
  { title: "Plan a launch", prompt: "Make a one-week launch checklist for a small SaaS feature." },
];

function Orb({ size = "h-10 w-10" }: { size?: string }) {
  return <span aria-hidden="true" className={"inline-block rounded-full bg-[radial-gradient(circle_at_30%_30%,#6ee7b7,#059669_55%,#312e81)] shadow-lg shadow-emerald-500/30 " + size} />;
}

export default function App() {
  const [endpoint, setEndpoint] = useLocalStorage<string>("chat-endpoint", envEndpoint);
  const [messages, setMessages] = useLocalStorage<Message[]>("chat-messages", []);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const configured = endpoint.trim().length > 0;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || pending || !configured) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setPending(true);
    abort.current = new AbortController();
    try {
      const reply = await sendMessages(endpoint.trim(), next, abort.current.signal);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-screen bg-white text-slate-900">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-4 md:flex">
        <div className="flex items-center gap-2.5 px-1">
          <Orb size="h-7 w-7" />
          <span className="font-semibold tracking-tight">Assistant</span>
        </div>
        <button type="button" onClick={() => setMessages([])} className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-100">
          <span aria-hidden="true">＋</span> New chat
        </button>
        <p className="mt-6 px-1 text-xs font-medium uppercase tracking-wider text-slate-400">Conversation</p>
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">{messages.length ? messages.length + " messages in this chat" : "No messages yet"}</p>
        <div className="mt-auto space-y-2">
          <label className="block text-xs font-medium text-slate-600" htmlFor="endpoint">
            Backend URL
          </label>
          <input id="endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-api.example/chat" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400" />
          <p className="text-[11px] leading-relaxed text-slate-500">Your server calls the AI provider. Never put provider keys in browser code.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h1 className="text-sm font-semibold">New conversation</h1>
          <label className="flex items-center gap-2 text-xs text-slate-600 md:hidden">
            Backend URL
            <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-api.example/chat" className="w-44 rounded-md border border-slate-300 px-2 py-1 text-xs" />
          </label>
        </header>

        {!configured ? (
          <div role="status" className="mx-auto mt-4 flex w-full max-w-3xl items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
            <p>
              <span className="font-medium">No backend configured.</span> Set <code className="rounded bg-amber-100 px-1">VITE_CHAT_API_URL</code> or add a URL in the sidebar. This template calls no AI provider and ships no keys (see README.md).
            </p>
          </div>
        ) : null}

        <main className="flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.length === 0 ? (
              <div className="pt-[8vh] text-center">
                <Orb size="h-14 w-14" />
                <h2 className="mt-5 text-3xl font-semibold tracking-tight">How can I help today?</h2>
                <p className="mt-2 text-slate-500">Pick a starting point or write your own message.</p>
                <ul className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <li key={s.title}>
                      <button
                        type="button"
                        onClick={() => {
                          setInput(s.prompt);
                          inputRef.current?.focus();
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                      >
                        <span className="block text-sm font-medium">{s.title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">{s.prompt}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div key={i} className={"flex gap-3 " + (m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" ? <Orb size="mt-1 h-7 w-7 shrink-0" /> : null}
                <div className={"max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800")}>
                  <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
                  {m.content}
                </div>
              </div>
            ))}
            {pending ? (
              <p className="flex items-center gap-2 text-sm text-slate-500" aria-live="polite">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Waiting for the backend…
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div ref={bottom} />
          </div>
        </main>

        <form onSubmit={submit} className="px-5 pb-5">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5 focus-within:border-emerald-300">
            <label className="sr-only" htmlFor="chat-input">
              Message
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              placeholder={configured ? "Ask something… (Enter to send, Shift+Enter for a new line)" : "Configure a backend URL first"}
              disabled={pending}
              className="w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-2 px-1">
              <button type="button" onClick={() => setMessages([])} className="rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-40" disabled={messages.length === 0}>
                Clear
              </button>
              {pending ? (
                <button type="button" onClick={() => abort.current?.abort()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">
                  Stop
                </button>
              ) : (
                <button type="submit" disabled={!configured || !input.trim()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40">
                  Send
                </button>
              )}
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-slate-400">Replies come from the backend you configure. This template contains no AI provider code.</p>
        </form>
      </div>
    </div>
  );
}
`,
  "src/vite-env.d.ts": `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`,
};

export const aiChatTemplate: Template = {
  id: "vite-react-ai-chat",
  name: "AI chat interface",
  description: "A chat UI that posts the conversation to a backend endpoint you configure. No provider keys in the browser.",
  longDescription:
    "A complete chat front end: message list with user/assistant bubbles, Enter-to-send textarea, pending and error states, cancel with AbortController, and persisted history. It talks to a single configurable endpoint (VITE_CHAT_API_URL or a field in the header) using a documented JSON contract, and renders an explicit 'No backend configured' state until you point it at a server that holds the provider key. Pair it with the Express REST API template for the backend.",
  category: "ai-tools",
  tags: ["react", "ai", "chat", "assistant", "tailwind"],
  framework: "vite-react",
  dependencies: VITE_DEPS,
  settings: VITE_SETTINGS,
  prebuilt: true,
  featured: true,
  difficulty: "intermediate",
  previewPath: "/",
  files,
};
