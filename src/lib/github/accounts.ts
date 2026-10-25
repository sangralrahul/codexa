import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { oauthAccounts } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { ApiError } from "@/lib/api";
import { createGitHubClient, type GitHubClient } from "./client";

export const PROVIDER = "github";

export type GithubAccountDto = { linked: boolean; username: string | null; providerAccountId: string | null; scope: string | null; linkedAt: string | null };

export async function getGithubAccount(userId: string) {
  const rows = await db
    .select()
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, PROVIDER)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getGithubAccountDto(userId: string): Promise<GithubAccountDto> {
  const row = await getGithubAccount(userId);
  if (!row) return { linked: false, username: null, providerAccountId: null, scope: null, linkedAt: null };
  return { linked: true, username: row.username, providerAccountId: row.providerAccountId, scope: row.scope, linkedAt: row.updatedAt.toISOString() };
}

export async function findByProviderAccountId(providerAccountId: string) {
  const rows = await db
    .select()
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, PROVIDER), eq(oauthAccounts.providerAccountId, providerAccountId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Insert or update the GitHub link for a user. Throws 409 if that GitHub account is linked to someone else. */
export async function upsertGithubAccount(input: { userId: string; providerAccountId: string; username: string; accessToken: string; scope: string }) {
  const existing = await findByProviderAccountId(input.providerAccountId);
  if (existing && existing.userId !== input.userId) {
    throw new ApiError(409, "This GitHub account is already linked to a different Codexa user.", "github_already_linked");
  }
  const enc = encryptSecret(input.accessToken);
  if (existing) {
    const [row] = await db
      .update(oauthAccounts)
      .set({ username: input.username, accessTokenEnc: enc, scope: input.scope, updatedAt: new Date() })
      .where(eq(oauthAccounts.id, existing.id))
      .returning();
    return row;
  }
  // A user can hold only one GitHub link: replace any previous one.
  await db.delete(oauthAccounts).where(and(eq(oauthAccounts.userId, input.userId), eq(oauthAccounts.provider, PROVIDER)));
  const [row] = await db
    .insert(oauthAccounts)
    .values({ userId: input.userId, provider: PROVIDER, providerAccountId: input.providerAccountId, username: input.username, accessTokenEnc: enc, scope: input.scope })
    .returning();
  return row;
}

export async function unlinkGithub(userId: string): Promise<boolean> {
  const rows = await db
    .delete(oauthAccounts)
    .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, PROVIDER)))
    .returning({ id: oauthAccounts.id });
  return rows.length > 0;
}

/** Decrypted token for API calls; throws 412 when the user has not linked GitHub. */
export async function requireGithubClient(userId: string): Promise<{ client: GitHubClient; username: string | null }> {
  const row = await getGithubAccount(userId);
  if (!row?.accessTokenEnc) throw new ApiError(412, "Connect your GitHub account first.", "github_not_linked");
  return { client: createGitHubClient({ token: decryptSecret(row.accessTokenEnc) }), username: row.username };
}
