import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authTokens } from "@/db/schema";
import { hashToken, randomToken } from "@/lib/crypto";

type TokenType = "verify_email" | "reset_password" | "invite";

const TTL: Record<TokenType, number> = {
  verify_email: 1000 * 60 * 60 * 24, // 24h
  reset_password: 1000 * 60 * 60, // 1h
  invite: 1000 * 60 * 60 * 24 * 7,
};

export async function issueToken(type: TokenType, userId: string | null, email?: string) {
  const token = randomToken(32);
  await db.insert(authTokens).values({
    userId,
    type,
    email: email ?? null,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TTL[type]),
  });
  return token;
}

/** Consume a token: returns the row if valid and marks it used atomically. */
export async function consumeToken(type: TokenType, token: string) {
  const hash = hashToken(token);
  const rows = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.tokenHash, hash),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  return rows[0] ?? null;
}
