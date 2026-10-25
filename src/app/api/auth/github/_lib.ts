import "server-only";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { GITHUB_STATE_COOKIE, GITHUB_STATE_TTL_MS, type OAuthState } from "@/lib/github/oauth";

export const redirectUri = () => new URL("/api/auth/github/callback", env.APP_URL).toString();

export async function writeStateCookie(state: OAuthState) {
  const store = await cookies();
  store.set(GITHUB_STATE_COOKIE, Buffer.from(JSON.stringify(state)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/github",
    maxAge: Math.floor(GITHUB_STATE_TTL_MS / 1000),
  });
}

export async function readStateCookie(): Promise<OAuthState | null> {
  const store = await cookies();
  const raw = store.get(GITHUB_STATE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OAuthState>;
    if (typeof parsed.state !== "string" || typeof parsed.next !== "string" || (parsed.mode !== "link" && parsed.mode !== "signin")) return null;
    return { state: parsed.state, next: parsed.next, mode: parsed.mode, userId: typeof parsed.userId === "string" ? parsed.userId : null };
  } catch {
    return null;
  }
}

export async function clearStateCookie() {
  const store = await cookies();
  store.set(GITHUB_STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/api/auth/github", maxAge: 0 });
}
