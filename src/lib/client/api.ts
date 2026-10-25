"use client";

export type ApiErrorShape = { code: string; message: string; details?: { path?: string; message: string }[] | unknown; resetAt?: string };

export class ClientApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message);
    this.code = shape.code;
    this.status = status;
    this.details = shape.details;
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const d of this.details as { path?: string; message: string }[]) if (d?.path) out[d.path] = d.message;
    }
    return out;
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, { ...init, headers, body, credentials: "same-origin" });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as T & { error?: ApiErrorShape };
  if (!res.ok) throw new ClientApiError(res.status, data.error ?? { code: "error", message: `Request failed (${res.status})` });
  return data as T;
}
