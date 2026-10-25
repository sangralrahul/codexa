import type { ConnectionTestResult } from "../types";

export const TEST_TIMEOUT_MS = 8_000;

/** Perform a small authenticated GET and summarise the outcome without leaking the secret. */
export async function httpProbe(
  url: string,
  init: RequestInit,
  describe: (status: number, body: unknown) => ConnectionTestResult,
  fetchImpl: typeof fetch = fetch,
): Promise<ConnectionTestResult> {
  try {
    const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TEST_TIMEOUT_MS) });
    let body: unknown = null;
    const text = await res.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text.slice(0, 200);
    }
    return describe(res.status, body);
  } catch (err) {
    return { ok: false, message: networkErrorMessage(err, new URL(url).host) };
  }
}

export function networkErrorMessage(err: unknown, host: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/abort|timeout/i.test(msg)) return `Timed out connecting to ${host}`;
  if (/403|proxy|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(msg)) {
    return `Could not reach ${host} from this server (${msg}). Check outbound network policy.`;
  }
  return `Network error contacting ${host}: ${msg}`;
}

export function statusMessage(status: number, what: string): string {
  if (status === 401 || status === 403) return `${what} rejected the credentials (HTTP ${status}).`;
  if (status === 404) return `${what} endpoint not found (HTTP 404). Check the configuration.`;
  if (status === 429) return `${what} rate limited the request (HTTP 429). Try again later.`;
  return `${what} returned HTTP ${status}.`;
}
