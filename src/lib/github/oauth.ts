/** GitHub OAuth helpers (pure; the routes handle cookies/redirects). */
import { randomToken } from "@/lib/crypto";

export const GITHUB_OAUTH_SCOPE = "repo read:user user:email";
export const GITHUB_STATE_COOKIE = "codexa_gh_oauth";
export const GITHUB_STATE_TTL_MS = 10 * 60 * 1000;

export type OAuthState = { state: string; next: string; mode: "link" | "signin"; userId: string | null };

export function newOAuthState(input: { next: string; mode: "link" | "signin"; userId: string | null }): OAuthState {
  return { state: randomToken(24), next: safeNext(input.next), mode: input.mode, userId: input.userId };
}

/** Only allow same-origin relative paths as redirect targets. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\r\n]/.test(next)) return fallback;
  if (next.startsWith("/api/")) return fallback;
  return next.slice(0, 512);
}

export function authorizeUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", input.clientId);
  u.searchParams.set("redirect_uri", input.redirectUri);
  u.searchParams.set("scope", GITHUB_OAUTH_SCOPE);
  u.searchParams.set("state", input.state);
  u.searchParams.set("allow_signup", "true");
  return u.toString();
}

export async function exchangeCode(
  input: { clientId: string; clientSecret: string; code: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ accessToken: string; scope: string; tokenType: string }> {
  const res = await fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "codexa" },
    body: JSON.stringify({ client_id: input.clientId, client_secret: input.clientSecret, code: input.code, redirect_uri: input.redirectUri }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; scope?: string; token_type?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `GitHub token exchange failed (${res.status})`);
  }
  return { accessToken: data.access_token, scope: data.scope ?? "", tokenType: data.token_type ?? "bearer" };
}
