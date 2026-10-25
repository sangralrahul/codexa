import { NextResponse } from "next/server";
import { ApiError, handler, clientIp } from "@/lib/api";
import { getCurrentUser, createSession, setSessionCookie } from "@/lib/auth/session";
import { createUserWithWorkspace, findUserByEmail } from "@/lib/auth/users";
import { enforceRateLimit } from "@/lib/rate-limit";
import { capabilities, env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { exchangeCode } from "@/lib/github/oauth";
import { createGitHubClient } from "@/lib/github/client";
import { findByProviderAccountId, upsertGithubAccount } from "@/lib/github/accounts";
import { clearStateCookie, readStateCookie, redirectUri } from "../_lib";

function fail(mode: "link" | "signin", code: string) {
  const target = mode === "link" ? `/connect-github?error=${encodeURIComponent(code)}` : `/login?error=${encodeURIComponent(`github_${code}`)}`;
  return NextResponse.redirect(new URL(target, env.APP_URL), 302);
}

/** GET /api/auth/github/callback?code=&state= */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  await enforceRateLimit(`github:oauth:cb:${clientIp(req)}`, 30, 10 * 60 * 1000);
  const saved = await readStateCookie();
  await clearStateCookie();
  const mode = saved?.mode ?? "link";
  if (!capabilities.github) return fail(mode, "not_configured");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const ghError = url.searchParams.get("error");
  if (ghError) return fail(mode, ghError === "access_denied" ? "denied" : "provider_error");
  if (!saved || !state || !code || state !== saved.state) return fail(mode, "invalid_state");

  let token: { accessToken: string; scope: string };
  try {
    token = await exchangeCode({ clientId: env.GITHUB_CLIENT_ID!, clientSecret: env.GITHUB_CLIENT_SECRET!, code, redirectUri: redirectUri() });
  } catch (err) {
    logger.warn("github token exchange failed", { error: err instanceof Error ? err.message : String(err) });
    return fail(mode, "exchange_failed");
  }
  const gh = createGitHubClient({ token: token.accessToken });
  let ghUser: Awaited<ReturnType<typeof gh.getUser>>;
  try {
    ghUser = await gh.getUser();
  } catch (err) {
    logger.warn("github /user failed", { error: err instanceof Error ? err.message : String(err) });
    return fail(mode, "profile_failed");
  }
  const providerAccountId = String(ghUser.id);
  const meta = { ip: clientIp(req), userAgent: req.headers.get("user-agent") };

  const current = await getCurrentUser();
  if (saved.mode === "link") {
    if (!current || current.id !== saved.userId) return fail("link", "session_changed");
    try {
      await upsertGithubAccount({ userId: current.id, providerAccountId, username: ghUser.login, accessToken: token.accessToken, scope: token.scope });
    } catch (err) {
      if (err instanceof ApiError && err.code === "github_already_linked") return fail("link", "already_linked");
      throw err;
    }
    await audit({ actorId: current.id, action: "github.linked", targetType: "user", targetId: current.id, metadata: { username: ghUser.login }, ip: meta.ip });
    return NextResponse.redirect(new URL(saved.next, env.APP_URL), 302);
  }

  // Sign in / sign up with GitHub.
  let userId: string | null = null;
  const existingLink = await findByProviderAccountId(providerAccountId);
  if (existingLink) userId = existingLink.userId;
  else {
    let email: string | null = null;
    try {
      email = await gh.getPrimaryEmail();
    } catch {
      email = null;
    }
    if (!email) return fail("signin", "no_verified_email");
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      if (existingUser.deletedAt) return fail("signin", "account_disabled");
      userId = existingUser.id;
    } else {
      const created = await createUserWithWorkspace({ email, name: ghUser.name ?? ghUser.login, avatarUrl: ghUser.avatar_url, emailVerified: true });
      userId = created.user.id;
      await audit({ actorId: userId, action: "user.signup.github", targetType: "user", targetId: userId, ip: meta.ip });
    }
  }
  await upsertGithubAccount({ userId, providerAccountId, username: ghUser.login, accessToken: token.accessToken, scope: token.scope });
  const session = await createSession(userId, meta);
  await setSessionCookie(session.token, session.expiresAt);
  await audit({ actorId: userId, action: "user.login.github", targetType: "user", targetId: userId, ip: meta.ip });
  return NextResponse.redirect(new URL(saved.next, env.APP_URL), 302);
});
