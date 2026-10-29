/** The Codexa API, called through the main process (which holds the session). */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type ErrorBody = { error?: { code?: string; message?: string } } | null;

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await window.codexa.request<T & ErrorBody>({ path, method: init.method, body: init.body });
  if (!res.ok) {
    const err = (res.data as ErrorBody)?.error;
    if (res.status === 401) window.dispatchEvent(new Event("codexa:signed-out"));
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? (res.status ? `Request failed (${res.status})` : "Can't reach Codexa. Check your connection."));
  }
  return res.data as T;
}

const enc = encodeURIComponent;
const qs = (params: Record<string, string | number | undefined | null>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

// ---------------------------------------------------------------------------------------------
// Types (mirroring the API responses)
// ---------------------------------------------------------------------------------------------

export type Role = "owner" | "admin" | "editor" | "viewer";
export type Workspace = { id: string; slug: string; name: string; plan: string };
export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  templateId: string | null;
  framework: string;
  visibility: "private" | "unlisted" | "public";
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  framework: string;
  frameworkName: string;
  tags: string[];
  featured?: boolean;
  fileCount: number;
  difficulty?: string;
};
export type FileEntry = { path: string; size: number; isBinary: boolean; updatedAt: string };
export type RuntimeSession = { id: string; status: "starting" | "running" | "stopped" | "error"; previewUrl: string | null; error: string | null; startedAt: string };
export type RuntimeState = { session: RuntimeSession | null; runnerAvailable: boolean; runnerError?: string | null; runnerConfigured?: boolean; runnerSetupHint?: string | null };
export type Deployment = { id: string; status: "queued" | "building" | "deploying" | "live" | "failed" | "rolled_back"; url: string | null; createdAt: string; error?: string | null; provider: string };
export type Provider = { id: "codexa" | "vercel"; name: string; available: boolean; reason: string | null };
export type Conversation = { id: string; title: string; updatedAt: string };
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "plan"; steps: string[]; approval?: "pending" }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; name: string; output: string; isError?: boolean }
  | { type: "file_change"; path: string; action: "create" | "update" | "delete"; summary?: string }
  | { type: "stage"; stage: string; detail?: string }
  | { type: "error"; message: string }
  | { type: "image"; file: string; mediaType: string; name: string };
export type Message = { id: string; role: "user" | "assistant" | "system"; content: string; parts: MessagePart[]; createdAt: string };
export type AiStatus = { configured: boolean; provider?: string; model?: string; mock?: boolean };
export type Usage = { plan: string; limits: Record<string, number>; used: Record<string, number>; counts: { projects: number; members: number } };

// ---------------------------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------------------------

export const workspacesApi = {
  list: () => api<{ workspaces: { workspace: Workspace; role: Role }[] }>("/api/v1/workspaces"),
};

export const projectsApi = {
  list: (workspaceId: string) => api<{ projects: Project[] }>(`/api/v1/projects${qs({ workspaceId })}`),
  create: (input: { workspaceId: string; name: string; description?: string; templateId: string }) => api<{ project: Project }>("/api/v1/projects", { method: "POST", body: input }),
  get: (id: string) => api<{ project: Project; role: Role; workspace: Workspace }>(`/api/v1/projects/${enc(id)}`),
  rename: (id: string, name: string) => api<{ project: Project }>(`/api/v1/projects/${enc(id)}`, { method: "PATCH", body: { name } }),
  remove: (id: string) => api<void>(`/api/v1/projects/${enc(id)}`, { method: "DELETE" }),
  duplicate: (id: string) => api<{ project: Project }>(`/api/v1/projects/${enc(id)}/duplicate`, { method: "POST", body: {} }),
};

export const templatesApi = {
  list: () => api<{ templates: Template[]; categories: { id: string; label: string }[] | string[] }>("/api/v1/templates"),
};

export const filesApi = {
  list: (id: string) => api<{ files: FileEntry[] }>(`/api/v1/projects/${enc(id)}/files`),
  read: (id: string, path: string) => api<{ path: string; content: string; isBinary: boolean }>(`/api/v1/projects/${enc(id)}/files/content${qs({ path })}`),
  write: (id: string, path: string, content: string) => api<{ file: { path: string } }>(`/api/v1/projects/${enc(id)}/files/content`, { method: "PUT", body: { path, content } }),
};

export const runtimeApi = {
  state: (id: string) => api<RuntimeState>(`/api/v1/projects/${enc(id)}/runtime`),
  start: (id: string) => api<{ session: RuntimeSession }>(`/api/v1/projects/${enc(id)}/runtime/start`, { method: "POST", body: {} }),
  stop: (id: string) => api<unknown>(`/api/v1/projects/${enc(id)}/runtime/stop`, { method: "POST", body: {} }),
  sync: (id: string, paths: string[]) => api<unknown>(`/api/v1/projects/${enc(id)}/runtime/sync`, { method: "POST", body: { paths } }),
};

export const deployApi = {
  list: (id: string) => api<{ deployments: Deployment[]; providers: Provider[] }>(`/api/v1/projects/${enc(id)}/deployments`),
  create: (id: string) => api<{ deployment: Deployment }>(`/api/v1/projects/${enc(id)}/deployments`, { method: "POST", body: { provider: "codexa" } }),
  get: (id: string, did: string) => api<{ deployment: Deployment }>(`/api/v1/projects/${enc(id)}/deployments/${enc(did)}`),
};

export type LogLine = { ts: string; stream: "stdout" | "stderr" | "system"; line: string };
export type Snapshot = { id: string; name: string; kind: string; message: string | null; createdAt: string; fileCount: number };

export const historyApi = {
  list: (id: string) => api<{ snapshots: Snapshot[] }>(`/api/v1/projects/${enc(id)}/snapshots`),
  create: (id: string, name: string) => api<unknown>(`/api/v1/projects/${enc(id)}/snapshots`, { method: "POST", body: { name } }),
  restore: (id: string, sid: string) => api<{ restored: { id: string; name: string }; paths: string[] }>(`/api/v1/projects/${enc(id)}/snapshots/${enc(sid)}/restore`, { method: "POST", body: {} }),
};

export const logsApi = {
  tail: (id: string, n = 300) => api<{ lines: LogLine[]; status: string }>(`/api/v1/projects/${enc(id)}/runtime/logs?tail=${n}`),
};

export const settingsApi = {
  get: (id: string) => api<{ project: Project & { settings: { knowledge?: string } } }>(`/api/v1/projects/${enc(id)}`),
  save: (id: string, patch: { name?: string; description?: string; visibility?: Project["visibility"]; settings?: { knowledge?: string } }) =>
    api<{ project: Project }>(`/api/v1/projects/${enc(id)}`, { method: "PATCH", body: patch }),
};

export const aiApi = {
  status: (id: string) => api<AiStatus>(`/api/v1/projects/${enc(id)}/ai/status`),
  conversations: (id: string) => api<{ conversations: Conversation[] }>(`/api/v1/projects/${enc(id)}/ai/conversations`),
  messages: (id: string, cid: string) => api<{ messages: Message[] }>(`/api/v1/projects/${enc(id)}/ai/conversations/${enc(cid)}/messages`),
  cancel: (id: string, runId: string) => api<unknown>(`/api/v1/projects/${enc(id)}/ai/runs/${enc(runId)}/cancel`, { method: "POST", body: {} }),
};

export const accountApi = {
  profile: (name: string) => api<unknown>("/api/v1/account/profile", { method: "PATCH", body: { name } }),
  onboarding: (input: { timezone?: string; completed?: boolean }) => api<unknown>("/api/v1/account/onboarding", { method: "PATCH", body: input }),
  usage: (workspaceId: string) => api<Usage>(`/api/v1/workspaces/${enc(workspaceId)}/usage`),
};

// ---------------------------------------------------------------------------------------------
// AI runs (server-sent events)
// ---------------------------------------------------------------------------------------------

export type AgentMode = "build" | "plan" | "ask" | "fix";
export type AgentEvent =
  | { event: "run"; data: { runId: string; conversationId: string; messageId: string; mock?: boolean } }
  | { event: "stage"; data: { stage: string; detail?: string } }
  | { event: "text"; data: { delta: string } }
  | { event: "tool_call"; data: { id: string; name: string; summary: string } }
  | { event: "tool_result"; data: { id: string; name: string; output: string; isError?: boolean } }
  | { event: "file_change"; data: { path: string; action: "create" | "update" | "delete"; summary?: string } }
  | { event: "plan"; data: { steps: string[]; approval?: "pending" } }
  | { event: "error"; data: { message: string; code?: string } }
  | { event: "done"; data: { status: "succeeded" | "failed" | "cancelled"; runId: string; changedFiles: { path: string; action: string }[]; summary?: string; nextSteps?: string[]; error?: string } };

/** Parses "event: x\ndata: {...}\n\n" blocks across chunk boundaries. */
function sseParser(onEvent: (e: AgentEvent) => void) {
  let buffer = "";
  return (text: string, flush = false) => {
    buffer += text.replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    buffer = flush ? "" : (blocks.pop() ?? "");
    for (const block of blocks) {
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (!data.length) continue;
      try {
        onEvent({ event, data: JSON.parse(data.join("\n")) } as AgentEvent);
      } catch {
        // ignore malformed events
      }
    }
  };
}

export function streamGenerate(
  projectId: string,
  body: { prompt: string; mode: AgentMode; conversationId?: string | null; approvedPlan?: string[] },
  handlers: { onEvent: (e: AgentEvent) => void; onError: (err: ApiError) => void; onEnd: () => void },
): () => void {
  const push = sseParser(handlers.onEvent);
  return window.codexa.stream({ method: "POST", path: `/api/v1/projects/${enc(projectId)}/ai/generate`, body }, (msg) => {
    if (msg.chunk) push(msg.chunk);
    if (!msg.done) return;
    push("", true);
    if (!msg.ok && !msg.aborted) {
      const err = (msg.data as ErrorBody)?.error;
      handlers.onError(new ApiError(msg.status ?? 0, err?.code ?? "error", err?.message ?? `The AI request failed (${msg.status ?? "network"}).`));
    }
    handlers.onEnd();
  });
}
