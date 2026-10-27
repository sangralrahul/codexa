import "server-only";
import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { hashToken, randomToken } from "@/lib/crypto";
import { cache } from "react";

/**
 * In production the cookie carries the `__Host-` prefix: browsers then only accept it from this exact
 * host over HTTPS with path=/ and no Domain, so apps served on sibling subdomains (user previews and
 * hosted sites) cannot plant or overwrite a session cookie for Codexa.
 */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-codexa_session" : "codexa_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const SESSION_REFRESH_MS = 1000 * 60 * 60 * 24; // refresh lastSeen once a day

export type SafeUser = Pick<
  User,
  "id" | "email" | "name" | "avatarUrl" | "role" | "emailVerifiedAt" | "locale" | "timezone" | "onboardedAt" | "createdAt"
>;

export function toSafeUser(u: User): SafeUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    role: u.role,
    emailVerifiedAt: u.emailVerifiedAt,
    locale: u.locale,
    timezone: u.timezone,
    onboardedAt: u.onboardedAt,
    createdAt: u.createdAt,
  };
}

export async function createSession(userId: string, meta?: { ip?: string | null; userAgent?: string | null }) {
  const token = randomToken(32);
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt, ip: meta?.ip ?? null, userAgent: meta?.userAgent ?? null });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

export async function validateSessionToken(token: string): Promise<{ user: User; sessionId: string } | null> {
  const id = hashToken(token);
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || row.user.deletedAt) return null;
  if (Date.now() - row.session.lastSeenAt.getTime() > SESSION_REFRESH_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
  }
  return { user: row.user, sessionId: id };
}

/** Read the current user from the session cookie. Memoized per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
});

export async function getCurrentSessionId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

export async function invalidateSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateAllUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  return { ip, userAgent: h.get("user-agent") };
}
