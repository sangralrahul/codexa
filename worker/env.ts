import type { D1Database, R2Bucket, DurableObjectNamespace, Fetcher } from "@cloudflare/workers-types";

/** Bindings and settings the Codexa Worker receives (see wrangler.jsonc). */
export type Env = {
  DB: D1Database;
  STORAGE: R2Bucket;
  SANDBOX: DurableObjectNamespace;
  PRESENCE: DurableObjectNamespace;
  ASSETS: Fetcher;
  SESSION_SECRET: string;
  /** e.g. preview.codexa.example.com (wildcard DNS *.preview... routed to this Worker) */
  PREVIEW_HOST?: string;
  /** e.g. sites.codexa.example.com (wildcard DNS *.sites... routed to this Worker) */
  DEPLOY_HOST?: string;
  PREVIEW_PROTOCOL?: string;
};

export const RUNNER_CONTROL_HEADER = "x-codexa-runner";

export function hostOnly(value: string | undefined): string | null {
  if (!value) return null;
  const h = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").toLowerCase();
  return h || null;
}

/** First DNS label of `host` when it is exactly one label under `base`. */
export function labelUnder(host: string, base: string | null): string | null {
  if (!base || !host.endsWith("." + base)) return null;
  const label = host.slice(0, host.length - base.length - 1);
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label) ? label : null;
}

/** HMAC-SHA256 with key sha256(secret), base64url: matches sign() in src/lib/crypto. */
export async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  let bin = "";
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
