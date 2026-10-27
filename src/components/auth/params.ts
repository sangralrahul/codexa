/**
 * Query-string helpers shared by the account pages (server-safe, no React).
 *
 * - safeNext(): the same open-redirect rules as the server (`src/lib/github/oauth.ts`):
 *   a local path only (starts with "/", not "//" or "/\"), no CR/LF, never /api/, ≤512 chars.
 * - withAuthParams(): the login ⇄ signup switch links keep `next`, `email` and the carried
 *   idea (`prompt`, `template`), so an invite or a homepage idea survives the switch.
 */
import { clampIdea } from "@/lib/client/pending-idea";

export type AuthParams = { next?: string | null; email?: string | null; prompt?: string | null; template?: string | null };

/** Where the GitHub flow and the forms send people once an idea was carried over. */
export const IDEA_ROUTE = "/onboarding?start=idea";

export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\r\n]/.test(next)) return fallback;
  if (next.startsWith("/api/")) return fallback;
  return next.slice(0, 512);
}

/** A safe template id from the URL (letters, digits and dashes only), or undefined. */
export function cleanTemplateId(id: string | null | undefined): string | undefined {
  return id && /^[a-z0-9-]{1,64}$/.test(id) ? id : undefined;
}

/** First value of a search param that may arrive as an array. */
export function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** `href` plus the params worth keeping across the account pages (empty values are dropped). */
export function withAuthParams(href: string, params: AuthParams): string {
  const q = new URLSearchParams();
  const next = params.next ? safeNext(params.next, "") : "";
  if (next) q.set("next", next);
  if (params.email) q.set("email", params.email.slice(0, 254));
  const prompt = clampIdea(params.prompt);
  if (prompt) q.set("prompt", prompt);
  const template = cleanTemplateId(params.template);
  if (prompt && template) q.set("template", template);
  const qs = q.toString();
  return qs ? `${href}?${qs}` : href;
}

/** "rahul@example.com" → "r•••@example.com" (for "a link is on its way" copy). */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at);
  return `${local[0]}${"•".repeat(Math.min(3, Math.max(1, local.length - 1)))}${email.slice(at)}`;
}
