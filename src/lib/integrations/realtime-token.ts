/**
 * Signed presence tokens for the realtime service. The Next.js API route issues them with
 * sign() from src/lib/crypto (HMAC-SHA256 over sha256(SESSION_SECRET)); services/realtime
 * verifies them with the same algorithm. Pure functions, no server-only import.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type RealtimeTokenPayload = {
  projectId: string;
  userId: string;
  name: string;
  color: string;
  /** Unix epoch milliseconds. */
  exp: number;
};

export const REALTIME_TOKEN_TTL_MS = 10 * 60 * 1000;

const PALETTE = ["#2563eb", "#db2777", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#4f46e5", "#059669", "#ea580c"];

/** Deterministic colour for a user id (same colour on every client). */
export function colorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function keyFor(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function signPayload(encoded: string, secret: string): string {
  return createHmac("sha256", keyFor(secret)).update(encoded).digest("base64url");
}

export function issueRealtimeToken(payload: Omit<RealtimeTokenPayload, "exp"> & { exp?: number }, secret: string, now = Date.now()): string {
  const full: RealtimeTokenPayload = { ...payload, exp: payload.exp ?? now + REALTIME_TOKEN_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  return `${encoded}.${signPayload(encoded, secret)}`;
}

export function verifyRealtimeToken(token: string, secret: string, now = Date.now()): RealtimeTokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signPayload(encoded, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<RealtimeTokenPayload>;
    if (
      typeof parsed.projectId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.color !== "string" ||
      typeof parsed.exp !== "number"
    )
      return null;
    if (parsed.exp <= now) return null;
    return parsed as RealtimeTokenPayload;
  } catch {
    return null;
  }
}
