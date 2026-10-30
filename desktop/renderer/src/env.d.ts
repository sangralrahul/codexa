/// <reference types="vite/client" />

type ApiResult<T = unknown> = { ok: boolean; status: number; data: T };
type StreamMessage = { id: string; chunk?: string; done?: boolean; ok?: boolean; status?: number; aborted?: boolean; data?: unknown };

interface Window {
  codexa: {
    request: <T = unknown>(req: { method?: string; path: string; body?: unknown }) => Promise<ApiResult<T>>;
    stream: (req: { method?: string; path: string; body?: unknown }, onMessage: (msg: StreamMessage) => void) => () => void;
    login: (email: string, password: string) => Promise<ApiResult<{ user?: SessionUser; error?: { message: string } }>>;
    browserAuth: (page: "login" | "signup") => Promise<SessionUser | null>;
    me: () => Promise<SessionUser | null>;
    logout: () => Promise<boolean>;
    openExternal: (url: string) => Promise<void>;
    openWeb: (path: string) => Promise<void>;
    info: () => Promise<{ version: string; appUrl: string; platform: string; packaged: boolean }>;
    setTheme: (mode: "system" | "light" | "dark") => Promise<"light" | "dark">;
    checkUpdates: () => Promise<{ status: string; message: string }>;
    onUpdate: (fn: (info: { version: string }) => void) => () => void;
  };
}

type SessionUser = { id: string; email: string; name: string; avatarUrl?: string | null; emailVerifiedAt?: string | null; onboardedAt?: string | null; createdAt?: string };
