import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-ai-chat",
    title: "AI chat",
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

export default function App() {
  const [endpoint, setEndpoint] = useLocalStorage<string>("chat-endpoint", envEndpoint);
  const [messages, setMessages] = useLocalStorage<Message[]>("chat-messages", []);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
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
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <h1 className="font-semibold">Assistant</h1>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Backend URL
            <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-api.example/chat" className="w-56 rounded-md border border-slate-300 px-2 py-1 text-xs" />
          </label>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {!configured ? (
            <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">No backend configured</p>
              <p className="mt-1">
                Set <code>VITE_CHAT_API_URL</code> or paste your endpoint above. This template does not call any AI provider directly and ships no API keys — see README.md for the request/response contract.
              </p>
            </div>
          ) : null}
          {messages.length === 0 && configured ? <p className="text-center text-sm text-slate-500">Send a message to start the conversation.</p> : null}
          {messages.map((m, i) => (
            <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={"max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm " + (m.role === "user" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white")}>
                <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
                {m.content}
              </div>
            </div>
          ))}
          {pending ? (
            <p className="text-sm text-slate-500" aria-live="polite">
              Waiting for the backend…
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div ref={bottom} />
        </div>
      </main>

      <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <label className="sr-only" htmlFor="chat-input">
            Message
          </label>
          <textarea
            id="chat-input"
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
            disabled={!configured || pending}
            className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          />
          {pending ? (
            <button type="button" onClick={() => abort.current?.abort()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!configured || !input.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              Send
            </button>
          )}
          <button type="button" onClick={() => setMessages([])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={messages.length === 0}>
            Clear
          </button>
        </div>
      </form>
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
