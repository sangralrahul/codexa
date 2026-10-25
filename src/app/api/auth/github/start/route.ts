import { NextResponse } from "next/server";
import { handler, clientIp } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { capabilities, env } from "@/lib/env";
import { authorizeUrl, newOAuthState, safeNext } from "@/lib/github/oauth";
import { redirectUri, writeStateCookie } from "../_lib";

const NOT_CONFIGURED =
  "GitHub sign-in is not configured on this server. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET (create an OAuth app at https://github.com/settings/developers with callback URL <APP_URL>/api/auth/github/callback) and restart.";

/**
 * GET /api/auth/github/start?next=/path
 * Signed in → links GitHub to the current account. Signed out → sign in / sign up with GitHub.
 */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  await enforceRateLimit(`github:oauth:start:${clientIp(req)}`, 30, 10 * 60 * 1000);
  if (!capabilities.github) {
    const wantsHtml = (req.headers.get("accept") ?? "").includes("text/html");
    if (wantsHtml) {
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>GitHub not configured</title></head><body style="font-family:system-ui;max-width:40rem;margin:4rem auto;line-height:1.5"><h1>GitHub is not configured</h1><p>${NOT_CONFIGURED.replace("<APP_URL>", env.APP_URL)}</p><p><a href="/connect-github">Back</a></p></body></html>`;
      return new NextResponse(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    return NextResponse.json({ error: { code: "not_configured", message: NOT_CONFIGURED.replace("<APP_URL>", env.APP_URL), missing: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"] } }, { status: 503 });
  }
  const user = await getCurrentUser();
  const next = safeNext(url.searchParams.get("next"), user ? "/connect-github" : "/dashboard");
  const state = newOAuthState({ next, mode: user ? "link" : "signin", userId: user?.id ?? null });
  await writeStateCookie(state);
  return NextResponse.redirect(authorizeUrl({ clientId: env.GITHUB_CLIENT_ID!, redirectUri: redirectUri(), state: state.state }), 302);
});
