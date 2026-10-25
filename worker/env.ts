import type { D1Database, R2Bucket, DurableObjectNamespace, Fetcher } from "@cloudflare/workers-types";

/** Bindings and settings the Codexa Worker receives (see wrangler.jsonc). */
export type Env = {
  DB: D1Database;
  STORAGE: R2Bucket;
  SANDBOX: DurableObjectNamespace;
  PRESENCE: DurableObjectNamespace;
  ASSETS: Fetcher;
  SESSION_SECRET: string;
  /** e.g. -preview.example.com or preview.example.com (see src/lib/hosts.ts); empty without a domain */
  PREVIEW_HOST?: string;
  /** e.g. -sites.example.com or sites.example.com; empty without a domain */
  DEPLOY_HOST?: string;
  PREVIEW_PROTOCOL?: string;
};

export const RUNNER_CONTROL_HEADER = "x-codexa-runner";

export { hostBase as hostOnly, labelFor as labelUnder } from "../src/lib/hosts";

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
